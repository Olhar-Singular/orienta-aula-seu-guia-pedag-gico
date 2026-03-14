import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { WizardData, AdaptationResult } from "./AdaptationWizard";
import {
  Loader2, RefreshCw, Pencil, Check, Lightbulb, BookOpen,
  Target, ClipboardList, ImageIcon, Upload, X, Sparkles,
} from "lucide-react";
import AdaptedContentRenderer from "./AdaptedContentRenderer";

type Props = {
  data: WizardData;
  updateData: (partial: Partial<WizardData>) => void;
  onNext: () => void;
  onPrev: () => void;
};

type SectionImages = Record<string, string[]>; // field -> array of image URLs

export default function StepResult({ data, updateData, onNext, onPrev }: Props) {
  const [loading, setLoading] = useState(!data.result);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sectionImages, setSectionImages] = useState<SectionImages>({});
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");

  const generate = async () => {
    setLoading(true);
    try {
      const activeBarriers = data.barriers
        .filter((b) => b.is_active)
        .map((b) => ({ dimension: b.dimension, barrier_key: b.label, notes: b.notes }));

      const session = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/adapt-activity`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            original_activity: data.activityText,
            activity_type: data.activityType,
            barriers: activeBarriers,
            student_id: data.studentId || undefined,
            class_id: data.classId || undefined,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Falha na adaptação");
      }

      const result = await resp.json();
      updateData({ result: result.adaptation });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on mount if no result
  useState(() => {
    if (!data.result) generate();
  });

  const startEdit = (field: string, value: string) => {
    setEditing(field);
    setEditValue(value);
    setImagePrompt("");
  };

  const saveEdit = (field: keyof AdaptationResult) => {
    if (data.result) {
      updateData({ result: { ...data.result, [field]: editValue } });
    }
    setEditing(null);
  };

  const handleImageUpload = (field: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Imagem muito grande", description: "Máximo 5 MB.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        // Upload to storage
        const session = await supabase.auth.getSession();
        const userId = session.data.session?.user?.id;
        if (!userId) return;

        try {
          const blob = await fetch(dataUrl).then(r => r.blob());
          const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
          const { error } = await supabase.storage.from("question-images").upload(fileName, blob, { contentType: "image/png" });
          if (error) throw error;
          const { data: urlData } = supabase.storage.from("question-images").getPublicUrl(fileName);
          
          setSectionImages(prev => ({
            ...prev,
            [field]: [...(prev[field] || []), urlData.publicUrl],
          }));
          toast({ title: "Imagem adicionada!" });
        } catch (e: any) {
          toast({ title: "Erro ao fazer upload", description: e.message, variant: "destructive" });
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const generateImage = async (field: string) => {
    if (!imagePrompt.trim()) {
      toast({ title: "Descreva a imagem que deseja gerar.", variant: "destructive" });
      return;
    }
    setGeneratingImage(field);
    try {
      const session = await supabase.auth.getSession();
      const context = `Matéria: ${data.activityType || "Geral"}. Atividade: ${data.activityText?.slice(0, 200) || ""}`;
      
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-question-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: imagePrompt, context }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Falha na geração da imagem");
      }

      const result = await resp.json();
      setSectionImages(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), result.image_url],
      }));
      setImagePrompt("");
      toast({ title: "Imagem gerada com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingImage(null);
    }
  };

  const removeImage = (field: string, index: number) => {
    setSectionImages(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">ISA está adaptando a atividade...</p>
        <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  if (!data.result) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">Não foi possível gerar a adaptação.</p>
        <Button onClick={generate}>Tentar Novamente</Button>
        <Button variant="outline" onClick={onPrev} className="ml-2">Voltar</Button>
      </div>
    );
  }

  const r = data.result;

  const renderEditableSection = (
    title: string,
    icon: React.ReactNode,
    field: keyof AdaptationResult,
    content: string
  ) => {
    const images = sectionImages[field] || [];
    const isEditing = editing === field;
    const isGenerating = generatingImage === field;

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {icon} {title}
            <div className="ml-auto flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleImageUpload(field)}
                aria-label="Upload imagem"
                title="Upload imagem"
              >
                <Upload className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => isEditing ? saveEdit(field) : startEdit(field, content)}
                aria-label={isEditing ? `Salvar ${title}` : `Editar ${title}`}
              >
                {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Images */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={`Imagem ${i + 1}`}
                    className="max-h-40 rounded-lg border border-border/50 object-contain"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(field, i)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* AI Image Generator */}
          {isEditing && (
            <div className="flex gap-2 items-end p-3 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gerar imagem com IA
                </Label>
                <Input
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Ex: Gráfico de uma onda senoidal com amplitude 10cm e período 2s"
                  className="text-sm"
                  maxLength={500}
                  onKeyDown={(e) => e.key === "Enter" && !isGenerating && generateImage(field)}
                />
              </div>
              <Button
                size="sm"
                onClick={() => generateImage(field)}
                disabled={isGenerating || !imagePrompt.trim()}
                className="shrink-0"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><ImageIcon className="w-4 h-4 mr-1" /> Gerar</>
                )}
              </Button>
            </div>
          )}

          {/* Content */}
          {isEditing ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={10}
              className="text-sm font-mono"
              placeholder="Edite o conteúdo da adaptação..."
            />
          ) : (
            <AdaptedContentRenderer content={content} />
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Resultado da Adaptação</h2>
        <Button size="sm" variant="outline" onClick={generate}>
          <RefreshCw className="w-4 h-4 mr-1" /> Regenerar
        </Button>
      </div>

      {data.studentName && (
        <p className="text-sm text-muted-foreground">
          Adaptação para: <span className="font-medium text-foreground">{data.studentName}</span>
        </p>
      )}

      {renderEditableSection(
        "Versão Universal (Design Universal)",
        <BookOpen className="w-4 h-4 text-primary" />,
        "version_universal",
        r.version_universal
      )}

      {renderEditableSection(
        "Versão Direcionada",
        <Target className="w-4 h-4 text-primary" />,
        "version_directed",
        r.version_directed
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> Estratégias Aplicadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {r.strategies_applied.map((s, i) => (
              <Badge key={i} variant="secondary">{s}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {renderEditableSection(
        "Justificativa Pedagógica",
        <Lightbulb className="w-4 h-4 text-primary" />,
        "pedagogical_justification",
        r.pedagogical_justification
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" /> Dicas de Implementação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {r.implementation_tips.map((tip, i) => (
              <li key={i} className="text-sm text-foreground flex gap-2">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic">
        Ferramenta pedagógica. Não realiza diagnóstico. A decisão final é sempre do profissional.
      </p>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>Voltar</Button>
        <Button onClick={onNext}>Exportar e Salvar</Button>
      </div>
    </div>
  );
}
