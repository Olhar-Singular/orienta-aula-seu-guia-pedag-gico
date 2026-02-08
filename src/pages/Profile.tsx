import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut } from "lucide-react";
import Layout from "@/components/Layout";
import { toast } from "sonner";

export default function Profile() {
  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input defaultValue="Professor(a)" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input defaultValue="professor@email.com" disabled />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select defaultValue="professor">
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
                <Select defaultValue="matematica">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matematica">Matemática</SelectItem>
                    <SelectItem value="portugues">Português</SelectItem>
                    <SelectItem value="ciencias">Ciências</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível de ensino</Label>
                <Select defaultValue="fundamental2">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fundamental1">Fund. I (1º-5º)</SelectItem>
                    <SelectItem value="fundamental2">Fund. II (6º-9º)</SelectItem>
                    <SelectItem value="medio">Ensino Médio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Preferência de saída</Label>
                <Select defaultValue="ambos">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impressao">Impressão</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => toast.success("Perfil salvo!")}>Salvar alterações</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">Sair da conta</p>
              <p className="text-xs text-muted-foreground">Encerre sua sessão atual</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => toast.info("Logout requer backend Cloud.")}>
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
        </p>
      </div>
    </Layout>
  );
}
