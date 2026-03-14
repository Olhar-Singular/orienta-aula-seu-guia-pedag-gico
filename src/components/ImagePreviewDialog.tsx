import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  title?: string;
};

export default function ImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  title = "Prévia da imagem",
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-transparent border-none shadow-none">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-auto rounded border"
            loading="lazy"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
