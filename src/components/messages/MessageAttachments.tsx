import { useState } from "react";
import { Image as ImageIcon, FileText, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSignedAttachmentUrl, type ChatAttachment } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentItem({ att, onPreview }: { att: ChatAttachment; onPreview: (url: string) => void }) {
  const { data: url, isLoading } = useSignedAttachmentUrl(att.storage_path);
  const isImage = att.mime_type.startsWith("image/");

  if (isImage) {
    return (
      <button
        type="button"
        onClick={() => url && onPreview(url)}
        className={cn(
          "block rounded-md overflow-hidden border border-border bg-muted/40 max-w-xs hover:border-primary/40 transition-colors",
          isLoading && "animate-pulse",
        )}
      >
        {url ? (
          <img
            src={url}
            alt={att.file_name}
            className="max-h-72 w-auto object-contain"
            loading="lazy"
          />
        ) : (
          <div className="h-32 w-48 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
      </button>
    );
  }

  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-muted/30 hover:bg-muted text-sm max-w-xs"
    >
      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{att.file_name}</div>
        <div className="text-[11px] text-muted-foreground">{formatBytes(att.byte_size)}</div>
      </div>
      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
    </a>
  );
}

export function MessageAttachments({ attachments }: { attachments: ChatAttachment[] }) {
  const [preview, setPreview] = useState<string | null>(null);
  if (!attachments.length) return null;
  return (
    <>
      <div className="mt-1 flex flex-wrap gap-2">
        {attachments.map((a) => (
          <AttachmentItem key={a.id} att={a} onPreview={setPreview} />
        ))}
      </div>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl p-2 bg-background">
          {preview && <img src={preview} alt="" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
