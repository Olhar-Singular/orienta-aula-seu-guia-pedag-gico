import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo-orienta-aula-eye.png";

type SharedData = {
  expires_at: string;
  adaptation: {
    original_activity: string;
    activity_type: string | null;
    adaptation_result: any;
    barriers_used: any;
    created_at: string | null;
  };
};

export default function SharedAdaptation() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      // Fetch shared record via secure RPC (SECURITY DEFINER)
      const { data: rows, error: sErr } = await supabase
        .rpc("get_shared_adaptation", { p_token: token });

      const shared = Array.isArray(rows) ? rows[0] : rows;

      if (sErr || !shared) {
        setError("Link não encontrado ou expirado.");
        setLoading(false);
        return;
      }

      // Fetch the adaptation
      const { data: adaptation, error: aErr } = await supabase
        .from("adaptations_history")
        .select("original_activity, activity_type, adaptation_result, barriers_used, created_at")
        .eq("id", shared.adaptation_id)
        .single();

      if (aErr || !adaptation) {
        setError("Adaptação não encontrada.");
        setLoading(false);
        return;
      }

      setData({ expires_at: shared.expires_at, adaptation });
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <h1 className="text-xl font-bold text-foreground">{error}</h1>
        <p className="text-sm text-muted-foreground">O link pode ter expirado ou ser inválido.</p>
        <Link to="/">
          <Button variant="outline">Ir para o início</Button>
        </Link>
      </div>
    );
  }

  const result = data!.adaptation.adaptation_result as any;
  const barriers = (data!.adaptation.barriers_used as any[]) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Public header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/">
          <img src={logoImg} alt="Orienta Aula" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Expira em {new Date(data!.expires_at).toLocaleDateString("pt-BR")}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Adaptação Compartilhada
          </h1>
          {data!.adaptation.activity_type && (
            <Badge variant="secondary" className="mt-2">
              {data!.adaptation.activity_type}
            </Badge>
          )}
        </motion.div>

        {/* Original */}
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Atividade Original</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data!.adaptation.original_activity}</p>
          </CardContent>
        </Card>

        {/* Barriers used */}
        {barriers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {barriers.map((b: any, i: number) => (
              <Badge key={i} variant="outline" className="text-xs">
                {typeof b === "string" ? b : b.label || b.barrier_key || JSON.stringify(b)}
              </Badge>
            ))}
          </div>
        )}

        {/* Universal */}
        {result?.version_universal && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader><CardTitle className="text-base">Versão Universal (DUA)</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result.version_universal}</p>
            </CardContent>
          </Card>
        )}

        {/* Directed */}
        {result?.version_directed && (
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Versão Direcionada</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result.version_directed}</p>
            </CardContent>
          </Card>
        )}

        {/* Justification */}
        {result?.pedagogical_justification && (
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Justificativa Pedagógica</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{result.pedagogical_justification}</p>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        {result?.implementation_tips?.length > 0 && (
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Dicas de Implementação</CardTitle></CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                {result.implementation_tips.map((t: string, i: number) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground text-center pt-4">
          Gerado por Orienta Aula — Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
        </p>
      </main>
    </div>
  );
}
