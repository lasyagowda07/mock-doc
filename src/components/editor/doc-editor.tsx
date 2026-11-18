"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";

import { AlertCircle, Check, Eye, FileText, Loader2, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/user-menu";
import { Toolbar } from "@/components/editor/toolbar";
import { type SaveStatus, useAutosave } from "@/components/editor/use-autosave";
import { editorExtensions } from "@/lib/editor-extensions";
import { ShareDialog } from "@/components/share-dialog";
import { canEdit, canRename, canShare, roleLabel } from "@/lib/permissions";
import type { DocDetail } from "@/lib/types";

function StatusIndicator({ status, error, onRetry }: { status: SaveStatus; error: string | null; onRetry: () => void }) {
  if (status === "error")
    return (
      <span className="flex items-center gap-1.5 text-sm text-destructive" role="alert" title={error ?? undefined}>
        <AlertCircle className="size-4 shrink-0" /> <span className="max-w-64 truncate">Not saved{error ? ` — ${error}` : ""}</span>
        <Button size="xs" variant="outline" onClick={onRetry}>Retry</Button>
      </span>
    );
  if (status === "saving" || status === "unsaved")
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
        <Loader2 className="size-4 animate-spin" /> Saving…
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
      <Check className="size-4" /> Saved
    </span>
  );
}

export function DocEditor({ doc, user }: { doc: DocDetail; user: { name: string; email: string } }) {
  const editable = canEdit(doc.role);
  const { status, error, queue, saveNow } = useAutosave(doc.id);
  const [title, setTitle] = useState(doc.title);
  const [shareOpen, setShareOpen] = useState(false);
  const lastValidTitle = useRef(doc.title);

  const editor = useEditor({
    extensions: editorExtensions,
    content: doc.content as JSONContent,
    editable,
    immediatelyRender: false, // avoid SSR hydration mismatch
    editorProps: { attributes: { class: "tiptap", "aria-label": "Document body" } },
    onUpdate: ({ editor }) => queue({ content: editor.getJSON() }),
  });

  useEffect(() => {
    if (!editable) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable, saveNow]);

  function onTitleChange(value: string) {
    setTitle(value);
    if (value.trim()) {
      lastValidTitle.current = value.trim();
      queue({ title: value.trim() });
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="sticky top-0 z-10 bg-background">
        <div className="flex h-14 items-center gap-3 border-b px-4">
          <Link href="/" aria-label="Back to documents" className="text-muted-foreground hover:text-foreground">
            <FileText className="size-6" />
          </Link>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => setTitle(lastValidTitle.current)}
            disabled={!canRename(doc.role)}
            maxLength={200}
            aria-label="Document title"
            className="h-9 max-w-md border-transparent bg-transparent text-base font-medium hover:border-input focus-visible:border-ring"
          />
          <Badge variant={doc.role === "owner" ? "outline" : "secondary"}>
            {!editable && <Eye />} {roleLabel[doc.role]}
            {doc.role !== "owner" && ` · shared by ${doc.ownerName}`}
          </Badge>
          <div className="ml-auto flex items-center gap-3">
            {editable ? <StatusIndicator status={status} error={error} onRetry={saveNow} /> : (
              <span className="text-sm text-muted-foreground">View only</span>
            )}
            {canShare(doc.role) && (
              <>
                <Button variant="outline" onClick={() => setShareOpen(true)}>
                  <Share2 /> Share
                </Button>
                <ShareDialog docId={doc.id} title={title} open={shareOpen} onOpenChange={setShareOpen} />
              </>
            )}
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
        {editor && editable && <Toolbar editor={editor} />}
      </header>
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto min-h-[60vh] max-w-3xl rounded-lg border bg-background p-8 shadow-sm sm:p-12">
          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
}
