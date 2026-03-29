import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Find a user by email without listing all users */
async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
) {
  // Use listUsers with a per-page of 1 — the Supabase admin API
  // doesn't support email filter natively, so we query profiles table first
  // as a fast path, then fall back to auth if needed.
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id, email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (profile?.user_id) {
    const { data } = await admin.auth.admin.getUserById(profile.user_id);
    if (data?.user) return data.user;
  }

  // Fallback: paginate auth users searching for email (handles edge cases
  // where profile email is out of sync)
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage });
    if (!data?.users?.length) break;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (found) return found;
    if (data.users.length < perPage) break;
    page++;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ─── CREATE SINGLE TEACHER ───
    if (action === "create") {
      const { email, name, school_id, role, password } = body;

      if (!email || !name || !school_id) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios: email, name, school_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!EMAIL_REGEX.test(email)) {
        return new Response(JSON.stringify({ error: "Formato de e-mail inválido." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify caller is admin
      const { data: isAdmin } = await admin.rpc("is_school_admin", {
        _user_id: caller.id,
        _school_id: school_id,
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Apenas administradores podem cadastrar professores." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already exists (efficient lookup)
      const existingUser = await findUserByEmail(admin, email);

      let userId: string;

      if (existingUser) {
        // Check if already a member of this school
        const { data: existingMember } = await admin
          .from("school_members")
          .select("id")
          .eq("school_id", school_id)
          .eq("user_id", existingUser.id)
          .maybeSingle();

        if (existingMember) {
          return new Response(JSON.stringify({ error: "Este professor já está vinculado a esta escola." }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        userId = existingUser.id;

        // Ensure profile exists/updated
        await admin
          .from("profiles")
          .upsert(
            { user_id: userId, full_name: name, name, email: existingUser.email ?? email },
            { onConflict: "user_id" }
          );
      } else {
        // Create new user with provided password or temp password
        const userPassword = password || crypto.randomUUID();
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email,
          password: userPassword,
          email_confirm: true,
          user_metadata: { name },
        });

        if (createErr) {
          console.error("Create user error:", createErr);
          return new Response(JSON.stringify({ error: createErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        userId = newUser.user.id;

        // Create profile directly (trigger may not fire for admin-created users)
        const { error: profileErr } = await admin
          .from("profiles")
          .insert({ user_id: userId, full_name: name, name, email });
        
        if (profileErr) {
          console.log("Profile insert failed, trying update:", profileErr.message);
          await admin
            .from("profiles")
            .update({ full_name: name, name, email })
            .eq("user_id", userId);
        }
      }

      // Add to school
      const { error: memberErr } = await admin.from("school_members").insert({
        school_id,
        user_id: userId,
        role: role === "gestor" ? "gestor" : "teacher",
      });

      if (memberErr) {
        console.error("Member insert error:", memberErr);
        return new Response(JSON.stringify({ error: "Erro ao adicionar professor à escola." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          user_id: userId,
          is_existing_user: !!existingUser,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── IMPORT TEACHERS (BATCH) ───
    if (action === "import") {
      const { school_id, teachers } = body;

      if (!school_id || !Array.isArray(teachers) || teachers.length === 0) {
        return new Response(JSON.stringify({ error: "school_id e teachers[] são obrigatórios." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (teachers.length > 100) {
        return new Response(JSON.stringify({ error: "Máximo de 100 professores por importação." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify caller is admin
      const { data: isAdmin } = await admin.rpc("is_school_admin", {
        _user_id: caller.id,
        _school_id: school_id,
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Apenas administradores podem importar professores." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── PRE-FETCH: batch lookup existing members & profiles ──
      const { data: existingMembers } = await admin
        .from("school_members")
        .select("user_id")
        .eq("school_id", school_id);
      const existingMemberIds = new Set(
        (existingMembers || []).map((m) => m.user_id)
      );

      // Batch lookup profiles by email to avoid per-teacher listUsers()
      const emails = teachers
        .map((t: any) => t.email?.toLowerCase())
        .filter(Boolean);
      const { data: existingProfiles } = await admin
        .from("profiles")
        .select("user_id, email")
        .in("email", emails);
      const profileByEmail = new Map(
        (existingProfiles || []).map((p) => [p.email?.toLowerCase(), p])
      );

      const results: { email: string; success: boolean; error?: string }[] = [];

      for (const teacher of teachers) {
        try {
          if (!teacher.email || !teacher.name) {
            results.push({ email: teacher.email || "?", success: false, error: "Nome e e-mail obrigatórios" });
            continue;
          }

          if (!EMAIL_REGEX.test(teacher.email)) {
            results.push({ email: teacher.email, success: false, error: "Formato de e-mail inválido" });
            continue;
          }

          const emailLower = teacher.email.toLowerCase();

          // Try fast path via profiles map
          let userId: string | null = null;
          const cachedProfile = profileByEmail.get(emailLower);
          if (cachedProfile) {
            userId = cachedProfile.user_id;
          } else {
            // Fallback: check auth (for users without profile email)
            const existing = await findUserByEmail(admin, teacher.email);
            if (existing) userId = existing.id;
          }

          if (userId) {
            // Already a member?
            if (existingMemberIds.has(userId)) {
              results.push({ email: teacher.email, success: false, error: "Já vinculado à escola" });
              continue;
            }

            // Ensure profile exists/updated
            await admin
              .from("profiles")
              .upsert(
                { user_id: userId, full_name: teacher.name, name: teacher.name, email: teacher.email },
                { onConflict: "user_id" }
              );
          } else {
            const tempPassword = crypto.randomUUID();
            const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
              email: teacher.email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: { name: teacher.name },
            });

            if (createErr) {
              results.push({ email: teacher.email, success: false, error: createErr.message });
              continue;
            }
            userId = newUser.user.id;

            await admin
              .from("profiles")
              .upsert(
                { user_id: userId, full_name: teacher.name, name: teacher.name, email: teacher.email },
                { onConflict: "user_id" }
              );
          }

          await admin.from("school_members").insert({
            school_id,
            user_id: userId,
            role: teacher.role === "gestor" ? "gestor" : "teacher",
          });

          // Track in local set to avoid duplicate within same batch
          existingMemberIds.add(userId);

          results.push({ email: teacher.email, success: true });
        } catch (e) {
          results.push({
            email: teacher.email || "?",
            success: false,
            error: e instanceof Error ? e.message : "Erro desconhecido",
          });
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return new Response(
        JSON.stringify({ success: true, total: teachers.length, succeeded, failed, results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── RESET PASSWORD ───
    if (action === "reset-password") {
      const { email: targetEmail, school_id } = body;

      if (!targetEmail || !school_id) {
        return new Response(JSON.stringify({ error: "email e school_id obrigatórios." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: isAdmin } = await admin.rpc("is_school_admin", {
        _user_id: caller.id,
        _school_id: school_id,
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Apenas administradores." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const siteUrl = req.headers.get("origin") || Deno.env.get("SITE_URL") || "https://aula-wise-guide.lovable.app";
      const { error: linkErr } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: targetEmail,
        options: { redirectTo: `${siteUrl}/reset-password` },
      });

      if (linkErr) {
        return new Response(JSON.stringify({ error: linkErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── REMOVE TEACHER ───
    if (action === "remove") {
      const { member_id, school_id } = body;

      if (!member_id || !school_id) {
        return new Response(JSON.stringify({ error: "member_id e school_id obrigatórios." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: isAdmin } = await admin.rpc("is_school_admin", {
        _user_id: caller.id,
        _school_id: school_id,
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Apenas administradores." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent removing self
      const { data: member } = await admin
        .from("school_members")
        .select("user_id")
        .eq("id", member_id)
        .single();

      if (member?.user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Você não pode se remover da escola." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: delErr } = await admin
        .from("school_members")
        .delete()
        .eq("id", member_id)
        .eq("school_id", school_id);

      if (delErr) {
        return new Response(JSON.stringify({ error: "Erro ao remover professor." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── UPDATE TEACHER ───
    if (action === "update") {
      const { member_id, school_id, name: newName, role: newRole } = body;

      if (!member_id || !school_id) {
        return new Response(JSON.stringify({ error: "member_id e school_id obrigatórios." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: isAdmin } = await admin.rpc("is_school_admin", {
        _user_id: caller.id,
        _school_id: school_id,
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Apenas administradores." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: member } = await admin
        .from("school_members")
        .select("user_id")
        .eq("id", member_id)
        .single();

      if (!member) {
        return new Response(JSON.stringify({ error: "Membro não encontrado." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update name in profiles
      if (newName) {
        await admin
          .from("profiles")
          .update({ full_name: newName })
          .eq("user_id", member.user_id);
      }

      // Update role in school_members
      if (newRole && (newRole === "gestor" || newRole === "teacher")) {
        // Prevent demoting self
        if (member.user_id === caller.id && newRole !== "gestor") {
          return new Response(JSON.stringify({ error: "Você não pode remover seu próprio cargo de gestor." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await admin
          .from("school_members")
          .update({ role: newRole })
          .eq("id", member_id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── TOGGLE ACTIVE (super-admin only) ───
    if (action === "toggle-active") {
      const { target_user_id, is_active } = body;

      if (!target_user_id || typeof is_active !== "boolean") {
        return new Response(JSON.stringify({ error: "target_user_id e is_active são obrigatórios." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only super-admin can toggle active status
      const { data: isSuperAdmin } = await admin.rpc("is_super_admin", { _user_id: caller.id });
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: "Apenas administradores globais podem ativar/desativar usuários." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent deactivating self
      if (target_user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Você não pode desativar sua própria conta." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateErr } = await admin
        .from("profiles")
        .update({ is_active })
        .eq("user_id", target_user_id);

      if (updateErr) {
        return new Response(JSON.stringify({ error: "Erro ao atualizar status do usuário." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Ação não reconhecida." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-manage-teachers error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
