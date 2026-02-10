import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookToken = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");
    
    // Validate token from query param or header
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || req.headers.get("x-kiwify-token");
    
    if (!webhookToken || token !== webhookToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { order_status, Customer, Subscription, Product } = body;

    // Kiwify sends: approved, refunded, chargedback, waiting_payment, expired
    const customerEmail = Customer?.email;
    if (!customerEmail) {
      return new Response(JSON.stringify({ error: "No customer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = users.users.find((u) => u.email === customerEmail);
    if (!user) {
      console.log(`User not found for email: ${customerEmail}`);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine plan from product name or ID
    const productName = (Product?.product_name || "").toLowerCase();
    let planName = "free";
    if (productName.includes("profissional") || productName.includes("professional")) {
      planName = "profissional";
    } else if (productName.includes("essencial") || productName.includes("essential")) {
      planName = "essencial";
    }

    // Get plan ID
    const { data: plan } = await supabase
      .from("plans")
      .select("id")
      .eq("name", planName)
      .single();

    const { data: freePlan } = await supabase
      .from("plans")
      .select("id")
      .eq("name", "free")
      .single();

    if (order_status === "approved") {
      // Activate or upgrade subscription
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      await supabase
        .from("user_subscriptions")
        .upsert({
          user_id: user.id,
          plan_id: plan?.id || freePlan?.id,
          status: "active",
          kiwify_subscription_id: Subscription?.id || null,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        }, { onConflict: "user_id" });

      console.log(`Subscription activated for ${customerEmail} -> ${planName}`);
    } else if (["refunded", "chargedback", "expired"].includes(order_status)) {
      // Downgrade to free
      await supabase
        .from("user_subscriptions")
        .update({
          plan_id: freePlan?.id,
          status: order_status === "expired" ? "expired" : "cancelled",
          kiwify_subscription_id: null,
        })
        .eq("user_id", user.id);

      console.log(`Subscription cancelled for ${customerEmail} -> free`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
