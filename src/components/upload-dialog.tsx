"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ACCEPT_ATTR, UPLOAD_HELP, validateUpload } from "@/lib/import/constants";
import { uploadDocument } from "@/app/docs/upload-action";

export function UploadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(f: File | undefined) {
    if (!f) return;
    const problem = validateUpload(f);
    setError(problem);
    setFile(problem ? null : f);
  }

  function reset(next: boolean) {
    setOpen(next);
    if (!next) { setFile(null); setError(null); setDragging(false); }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const body = new FormData();
    body.set("file", file);
    startTransition(async () => {
      try {
        const res = await uploadDocument(body);
        if (res.ok) {
          toast.success(`Imported “${file.name}”`);
          reset(false);
          router.push(`/docs/${res.id}`);
        } else setError(res.error);
      } catch {
        setError("Upload failed. Check your connection and try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload /> Upload
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Upload a file</DialogTitle>
            <DialogDescription>Turn a file into a new editable document.</DialogDescription>
          </DialogHeader>

          <label
            htmlFor="upload-file"
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files[0]); }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors focus-within:ring-3 focus-within:ring-ring/50 ${dragging ? "border-primary bg-muted" : "hover:bg-muted/50"}`}
          >
            <FileUp className="size-8 text-muted-foreground" />
            {file ? (
              <span className="font-medium">{file.name} <span className="font-normal text-muted-foreground">({Math.ceil(file.size / 1024)} KB)</span></span>
            ) : (
              <span className="text-sm">Drag a file here, or <span className="font-medium underline underline-offset-4">browse</span></span>
            )}
            <input
              id="upload-file"
              type="file"
              accept={ACCEPT_ATTR}
              className="sr-only"
              onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }}
            />
          </label>

          <p className="text-xs text-muted-foreground">{UPLOAD_HELP}</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={!file || pending}>{pending ? "Importing…" : "Import"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
