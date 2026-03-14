import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[60] translate-x-[-50%] translate-y-[-50%] max-w-4xl max-h-[90vh] overflow-y-auto bg-transparent border-none shadow-none outline-none">
          <DialogPrimitive.Close className="absolute -top-2 -right-2 z-10 rounded-full bg-background p-1.5 shadow-md opacity-80 hover:opacity-100 transition-opacity">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-auto rounded-lg"
              loading="lazy"
            />
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
