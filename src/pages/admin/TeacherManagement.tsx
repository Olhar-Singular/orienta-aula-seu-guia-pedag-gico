import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserSchool } from "@/hooks/useUserSchool";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserPlus, Upload, Search, KeyRound, Pencil, Trash2, Loader2, Download, Users, Eye, EyeOff } from "lucide-react";

interface Teacher {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  joined_at: string | null;
}

export default function TeacherManagement() {
  const { user } = useAuth();
  const { schoolId, schoolName } = useUserSchool();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [removeTeacher, setRemoveTeacher] = useState<Teacher | null>(null);

  // ─── FETCH TEACHERS ───
  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["school-teachers", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from("school_members")
        .select("id, user_id, role, joined_at, profiles!inner(full_name, email)")
        .eq("school_id", schoolId)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        email: m.profiles?.email,
        full_name: m.profiles?.full_name,
        role: m.role,
        joined_at: m.joined_at,
      })) as Teacher[];
    },
    enabled: !!schoolId,
  });

  const filtered = teachers.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.full_name?.toLowerCase().includes(s) ||
      t.email?.toLowerCase().includes(s)
    );
  });

  // ─── ADD TEACHER ───
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "teacher" });
  const [showPassword, setShowPassword] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const handleAdd = async () => {
    if (!addForm.name || !addForm.email || !addForm.password) {
      toast.error("Nome, e-mail e senha são obrigatórios.");
      return;
    }
    if (addForm.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setAddLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-teachers", {
        body: {
          action: "create",
          email: addForm.email.trim(),
          name: addForm.name.trim(),
          password: addForm.password,
          school_id: schoolId,
          role: addForm.role,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        data?.is_existing_user
          ? "Professor existente vinculado à escola!"
          : "Professor cadastrado! Um e-mail de acesso foi enviado."
      );
      setAddOpen(false);
      setAddForm({ name: "", email: "", role: "teacher" });
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao cadastrar professor.");
    } finally {
      setAddLoading(false);
    }
  };

  // ─── IMPORT TEACHERS ───
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const text = await importFile.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) throw new Error("Planilha vazia ou sem dados.");

      // Parse CSV
      const header = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
      const nameIdx = header.findIndex((h) => h.includes("nome"));
      const emailIdx = header.findIndex((h) => h.includes("mail") || h.includes("email"));
      const roleIdx = header.findIndex((h) => h.includes("cargo") || h.includes("role"));

      if (nameIdx === -1 || emailIdx === -1) {
        throw new Error("Planilha deve conter colunas 'Nome' e 'E-mail'.");
      }

      const teachersList = lines.slice(1).map((line) => {
        const cols = line.split(/[,;]/).map((c) => c.trim());
        return {
          name: cols[nameIdx] || "",
          email: cols[emailIdx] || "",
          role: roleIdx !== -1 && cols[roleIdx]?.toLowerCase() === "admin" ? "admin" : "teacher",
        };
      }).filter((t) => t.name && t.email);

      if (teachersList.length === 0) throw new Error("Nenhum professor válido encontrado na planilha.");

      const { data, error } = await supabase.functions.invoke("admin-manage-teachers", {
        body: {
          action: "import",
          school_id: schoolId,
          teachers: teachersList,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Importação concluída: ${data.succeeded} cadastrados, ${data.failed} com erro.`);
      setImportOpen(false);
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao importar.");
    } finally {
      setImportLoading(false);
    }
  };

  // ─── EDIT TEACHER ───
  const [editForm, setEditForm] = useState({ name: "", role: "teacher" });
  const [editLoading, setEditLoading] = useState(false);

  const openEdit = (teacher: Teacher) => {
    setEditTeacher(teacher);
    setEditForm({ name: teacher.full_name || "", role: teacher.role || "teacher" });
  };

  const handleEdit = async () => {
    if (!editTeacher) return;
    setEditLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-teachers", {
        body: {
          action: "update",
          member_id: editTeacher.id,
          school_id: schoolId,
          name: editForm.name.trim(),
          role: editForm.role,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Professor atualizado!");
      setEditTeacher(null);
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar.");
    } finally {
      setEditLoading(false);
    }
  };

  // ─── RESET PASSWORD ───
  const handleResetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-teachers", {
        body: {
          action: "reset-password",
          email,
          school_id: schoolId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Link de redefinição de senha enviado!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao resetar senha.");
    }
  };

  // ─── REMOVE TEACHER ───
  const [removeLoading, setRemoveLoading] = useState(false);

  const handleRemove = async () => {
    if (!removeTeacher) return;
    setRemoveLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-teachers", {
        body: {
          action: "remove",
          member_id: removeTeacher.id,
          school_id: schoolId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Professor removido da escola.");
      setRemoveTeacher(null);
      queryClient.invalidateQueries({ queryKey: ["school-teachers"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover.");
    } finally {
      setRemoveLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "Nome,E-mail,Cargo\nMaria Silva,maria@escola.com,prof\nJoão Santos,joao@escola.com,admin\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-professores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!schoolId) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Você precisa estar vinculado a uma escola para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Gestão de Professores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {schoolName && `Escola: ${schoolName}`} · {teachers.length} professor(es)
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1" /> Importar
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar professor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {search ? "Nenhum professor encontrado." : "Nenhum professor cadastrado ainda."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      {teacher.full_name || "—"}
                      <div className="sm:hidden text-xs text-muted-foreground">{teacher.email}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {teacher.email || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={teacher.role === "admin" ? "default" : "secondary"}>
                        {teacher.role === "admin" ? "Admin" : "Professor"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Editar"
                          onClick={() => openEdit(teacher)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {teacher.user_id !== user?.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Remover"
                            onClick={() => setRemoveTeacher(teacher)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ─── ADD TEACHER DIALOG ─── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Professor</DialogTitle>
            <DialogDescription>
              O professor receberá um e-mail para definir sua senha de acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Nome completo *</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Maria Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">E-mail *</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="maria@escola.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <RadioGroup value={addForm.role} onValueChange={(v) => setAddForm({ ...addForm, role: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="teacher" id="role-teacher" />
                  <Label htmlFor="role-teacher">Professor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="role-admin" />
                  <Label htmlFor="role-admin">Administrador</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={addLoading}>
              {addLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── IMPORT DIALOG ─── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Professores</DialogTitle>
            <DialogDescription>
              Envie um arquivo CSV com as colunas: Nome, E-mail, Cargo (opcional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="max-w-xs mx-auto"
              />
            </div>
            <Button variant="link" size="sm" onClick={downloadTemplate} className="gap-1">
              <Download className="w-4 h-4" /> Baixar modelo de planilha
            </Button>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Formato esperado:</p>
              <p>Nome, E-mail, Cargo</p>
              <p>Maria Silva, maria@escola.com, prof</p>
              <p className="mt-1">* Cargo: "prof" ou "admin" (padrão: prof)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportFile(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importLoading || !importFile}>
              {importLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT DIALOG ─── */}
      <Dialog open={!!editTeacher} onOpenChange={(open) => !open && setEditTeacher(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Professor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome completo</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={editTeacher?.email || ""} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <RadioGroup value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="teacher" id="edit-role-teacher" />
                  <Label htmlFor="edit-role-teacher">Professor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="edit-role-admin" />
                  <Label htmlFor="edit-role-admin">Administrador</Label>
                </div>
              </RadioGroup>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => editTeacher?.email && handleResetPassword(editTeacher.email)}
            >
              <KeyRound className="w-4 h-4" /> Enviar link para redefinir senha
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTeacher(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editLoading}>
              {editLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── REMOVE CONFIRMATION ─── */}
      <AlertDialog open={!!removeTeacher} onOpenChange={(open) => !open && setRemoveTeacher(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Professor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removeTeacher?.full_name}</strong> da escola?
              <br /><br />
              Esta ação irá remover o professor desta escola. Os dados criados por ele permanecerão no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
