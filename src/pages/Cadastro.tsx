import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import logoImg from "@/assets/logo-orienta-aula.png";

export default function Cadastro() {
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return toast.error("Preencha todos os campos.");
    if (password.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres.");

    setLoading(true);
    try {
      const { error } = await signUp(email, password, name);
      if (error) {
        if (error.message?.includes("already registered")) {
          toast.error("Este e-mail já está cadastrado. Tente entrar.");
        } else {
          toast.error(error.message || "Erro ao criar conta.");
        }
      } else {
        toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <img src={logoImg} alt="Orienta Aula" className="h-10 w-auto" />
        </Link>

        <Card className="shadow-card-hover">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Criar conta</CardTitle>
            <CardDescription>Crie sua conta e comece a adaptar atividades</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Aguarde..." : "Criar conta"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Entrar
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ferramenta pedagógica. Não realiza diagnóstico.
        </p>
      </div>
    </div>
  );
}
