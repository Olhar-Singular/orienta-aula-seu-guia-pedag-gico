import { useState } from "react";
import { useSchoolManagement } from "@/hooks/useSchoolManagement";
import { generateSchoolCode } from "@/lib/schoolCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, School, Plus, Pencil, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SchoolManagement() {
  const { schools, isLoading, createSchool, updateSchool, deleteSchool } = useSchoolManagement();

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [editSchool, setEditSchool] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deleteSchoolTarget, setDeleteSchoolTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    createSchool(
      { name: createName.trim(), code: generateSchoolCode() },
      {
        onSuccess: () => {
          setCreateLoading(false);
          setCreateOpen(false);
          setCreateName("");
        },
        onError: () => {
          setCreateLoading(false);
        },
      }
    );
  };

  const openEdit = (school: { id: string; name: string }) => {
    setEditSchool(school);
    setEditName(school.name);
  };

  const handleEdit = () => {
    if (!editSchool || !editName.trim()) return;
    setEditLoading(true);
    updateSchool(
      { school_id: editSchool.id, name: editName.trim() },
      {
        onSuccess: () => {
          setEditLoading(false);
          setEditSchool(null);
        },
        onError: () => {
          setEditLoading(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteSchoolTarget) return;
    deleteSchool(
      { school_id: deleteSchoolTarget.id },
      { onSettled: () => setDeleteSchoolTarget(null) }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <School className="w-6 h-6 text-primary" />
            Gestão de Escolas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{schools.length} escola(s) cadastrada(s)</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nova Escola
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : schools.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Nenhuma escola cadastrada.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell className="font-mono text-sm">{school.code}</TableCell>
                    <TableCell>{school.member_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Editar"
                          onClick={() => openEdit({ id: school.id, name: school.name })}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Excluir"
                          onClick={() => setDeleteSchoolTarget({ id: school.id, name: school.name })}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ─── CREATE DIALOG ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Escola</DialogTitle>
            <DialogDescription>O código será gerado automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="create-name">Nome da escola *</Label>
            <Input
              id="create-name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Escola Municipal Exemplo"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createLoading || !createName.trim()}>
              {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT DIALOG ─── */}
      <Dialog open={!!editSchool} onOpenChange={(open) => !open && setEditSchool(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Escola</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-school-name">Nome da escola</Label>
            <Input
              id="edit-school-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSchool(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editLoading || !editName.trim()}>
              {editLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRMATION ─── */}
      <AlertDialog open={!!deleteSchoolTarget} onOpenChange={(open) => !open && setDeleteSchoolTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Escola</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteSchoolTarget?.name}</strong>?
              Esta ação removerá todos os membros vinculados e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
