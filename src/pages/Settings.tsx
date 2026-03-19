import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, School, Palette, Shield, Copy, Check, Plus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { generateSchoolCode } from "@/lib/schoolCode";

/* ───────── Profile Tab ───────── */
function ProfileTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", display_name: "", email: "", school_name: "",
    role: "professor", main_subject: "", education_level: "", output_preference: "ambos",
  });

  const { data: profile } = useQuery({
    queryKey: ["settings-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        display_name: profile.display_name || "",
        email: profile.email || user?.email || "",
        school_name: profile.school_name || "",
        role: profile.role || "professor",
        main_subject: profile.main_subject || "",
        education_level: profile.education_level || "",
        output_preference: profile.output_preference || "ambos",
      });
    }
  }, [profile, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      name: form.name,
      display_name: form.display_name,
      email: form.email,
      school_name: form.school_name,
      role: form.role,
      main_subject: form.main_subject,
      education_level: form.education_level,
      output_preference: form.output_preference,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar perfil."); return; }
    toast.success("Perfil salvo!");
    queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Dados do Perfil</CardTitle>
        <CardDescription>Informações exibidas na plataforma.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" data-testid="profile-form">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nome de exibição</Label>
            <Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} placeholder="Como deseja ser chamado" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>E-mail exibido</Label>
            <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Escola</Label>
            <Input value={form.school_name} onChange={e => setForm({ ...form, school_name: e.target.value })} placeholder="Nome da escola" />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="pedagogo">Pedagogo</SelectItem>
                <SelectItem value="terapeuta">Terapeuta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Disciplina principal</Label>
            <Select value={form.main_subject} onValueChange={v => setForm({ ...form, main_subject: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {["Matemática","Português","Ciências","História","Geografia","Física","Outra"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nível de ensino</Label>
            <Select value={form.education_level} onValueChange={v => setForm({ ...form, education_level: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fundamental1">Fund. I (1º-5º)</SelectItem>
                <SelectItem value="fundamental2">Fund. II (6º-9º)</SelectItem>
                <SelectItem value="medio">Ensino Médio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
      </CardContent>
    </Card>
  );
}

/* ───────── School Tab ───────── */
function SchoolTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newSchoolName, setNewSchoolName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: membership } = useQuery({
    queryKey: ["my-school-membership", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("school_members")
        .select("*, schools(*)")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const createSchool = useMutation({
    mutationFn: async () => {
      const code = generateSchoolCode();
      const schoolId = crypto.randomUUID();
      const { error: sErr } = await supabase.from("schools").insert({ id: schoolId, name: newSchoolName, code });
      if (sErr) throw sErr;
      const { error: mErr } = await supabase.from("school_members").insert({ school_id: schoolId, user_id: user!.id, role: "admin" });
      if (mErr) throw mErr;
      return { id: schoolId, name: newSchoolName, code };
    },
    onSuccess: () => {
      toast.success("Escola criada com sucesso!");
      setNewSchoolName("");
      queryClient.invalidateQueries({ queryKey: ["my-school-membership"] });
    },
    onError: () => toast.error("Erro ao criar escola."),
  });

  const joinSchool = useMutation({
    mutationFn: async () => {
      const { data: school, error: fErr } = await supabase.from("schools").select("id").eq("code", joinCode.toUpperCase().trim()).single();
      if (fErr || !school) throw new Error("Código não encontrado");
      const { error: mErr } = await supabase.from("school_members").insert({ school_id: school.id, user_id: user!.id });
      if (mErr) throw mErr;
      return school;
    },
    onSuccess: () => {
      toast.success("Você entrou na escola!");
      setJoinCode("");
      queryClient.invalidateQueries({ queryKey: ["my-school-membership"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao entrar na escola."),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const schoolData = membership?.schools as any;

  return (
    <div className="space-y-6">
      {schoolData ? (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><School className="w-4 h-4" /> Minha Escola</CardTitle>
            <CardDescription>Você está vinculado a uma escola.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <p className="font-semibold text-foreground">{schoolData.name}</p>
                <p className="text-xs text-muted-foreground">Função: {membership?.role === "admin" ? "Administrador" : "Professor"}</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-background px-3 py-1.5 rounded border border-border">{schoolData.code}</code>
                <Button size="icon" variant="ghost" onClick={() => copyCode(schoolData.code)}>
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Compartilhe o código acima para outros professores se vincularem.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> Criar Escola</CardTitle>
              <CardDescription>Crie uma escola e convide outros professores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Nome da escola</Label>
                <Input value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)} placeholder="Ex: E.E. Prof. João Silva" />
              </div>
              <Button onClick={() => createSchool.mutate()} disabled={!newSchoolName.trim() || createSchool.isPending} className="w-full">
                {createSchool.isPending ? "Criando..." : "Criar escola"}
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><LogIn className="w-4 h-4" /> Entrar com Código</CardTitle>
              <CardDescription>Recebeu um código? Vincule-se à escola.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Código da escola</Label>
                <Input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Ex: A3B7K9" maxLength={6} className="font-mono uppercase tracking-widest" />
              </div>
              <Button variant="secondary" onClick={() => joinSchool.mutate()} disabled={joinCode.trim().length !== 6 || joinSchool.isPending} className="w-full">
                {joinSchool.isPending ? "Entrando..." : "Entrar na escola"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ───────── Preferences Tab ───────── */
function PreferencesTab() {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = (enabled: boolean) => {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Preferências</CardTitle>
        <CardDescription>Personalize sua experiência.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm text-foreground">Modo escuro</p>
            <p className="text-xs text-muted-foreground">Alterna entre tema claro e escuro.</p>
          </div>
          <Switch checked={darkMode} onCheckedChange={toggleTheme} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm text-foreground">Idioma</p>
            <p className="text-xs text-muted-foreground">Idioma da interface.</p>
          </div>
          <Select defaultValue="pt-BR">
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">Português (BR)</SelectItem>
              <SelectItem value="en" disabled>English (em breve)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm text-foreground">Notificações por e-mail</p>
            <p className="text-xs text-muted-foreground">Receba dicas pedagógicas semanais.</p>
          </div>
          <Switch defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────── Security Tab ───────── */
function SecurityTab() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Senha deve ter pelo menos 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem."); return; }
    setChanging(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChanging(false);
    if (error) { toast.error("Erro ao alterar senha."); return; }
    toast.success("Senha alterada com sucesso!");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Alterar Senha</CardTitle>
          <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={changing}>{changing ? "Alterando..." : "Alterar senha"}</Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Sessão ativa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Última atividade: {new Date().toLocaleDateString("pt-BR")}</p>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Ativa</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── Settings Page ───────── */
export default function Settings() {
  return (
    <>
      <div className="space-y-6 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground text-sm">Gerencie seu perfil, escola e preferências.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tabs defaultValue="perfil">
            <TabsList className="mb-6 w-full sm:w-auto">
              <TabsTrigger value="perfil" className="gap-1.5"><User className="w-3.5 h-3.5" /> Perfil</TabsTrigger>
              <TabsTrigger value="escola" className="gap-1.5"><School className="w-3.5 h-3.5" /> Escola</TabsTrigger>
              <TabsTrigger value="preferencias" className="gap-1.5"><Palette className="w-3.5 h-3.5" /> Preferências</TabsTrigger>
              <TabsTrigger value="seguranca" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Segurança</TabsTrigger>
            </TabsList>

            <TabsContent value="perfil"><ProfileTab /></TabsContent>
            <TabsContent value="escola"><SchoolTab /></TabsContent>
            <TabsContent value="preferencias"><PreferencesTab /></TabsContent>
            <TabsContent value="seguranca"><SecurityTab /></TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </>
  );
}
