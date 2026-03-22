import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QuestionRichEditor, { textToHtml, htmlToText } from "@/components/QuestionRichEditor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialText: string;
  onSave: (newText: string) => void;
};

export default function TextBlockEditModal({
  open,
  onOpenChange,
  initialText,
  onSave,
}: Props) {
  const [text, setText] = useState(() => textToHtml(initialText));

  useEffect(() => {
    if (open) setText(textToHtml(initialText));
  }, [open, initialText]);

  const handleSave = () => {
    onSave(text.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar texto</DialogTitle>
        </DialogHeader>
        <QuestionRichEditor
          value={text}
          onChange={setText}
          placeholder="Digite o texto..."
          minHeight={180}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!htmlToText(text).trim()}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
