"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";

import { AlertCircle, Check, Download, Eye, FileText, Loader2, Printer, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/user-menu";
import { Toolbar } from "@/components/editor/toolbar";
import { type SaveStatus, useAutosave } from "@/components/editor/use-autosave";
import { editorExtensions } from "@/lib/editor-extensions";
import { downloadText, printAsPdf } from "@/lib/export/download";
import { docToMarkdown, exportFilename } from "@/lib/export/markdown";
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

export function DocEditor({ doc, user, autoPrint = false }: { doc: DocDetail; user: { name: string; email: string }; autoPrint?: boolean }) {
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

  // Dashboard "Export as PDF" lands here with ?print=1: open the print dialog once, then clean the URL.
  useEffect(() => {
    if (!autoPrint || !editor) return;
    const timer = setTimeout(() => {
      history.replaceState(null, "", location.pathname);
      printAsPdf(title);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, editor]);

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

  function exportMarkdown() {
    if (!editor) return;
    downloadText(exportFilename(lastValidTitle.current, "md"), docToMarkdown(editor.getJSON()));
  }

  function onTitleChange(value: string) {
    setTitle(value);
    if (value.trim()) {
      lastValidTitle.current = value.trim();
      queue({ title: value.trim() });
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-muted/30 print:bg-white">
      <header className="sticky top-0 z-10 bg-background print:hidden">
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
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                <Download /> Export
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportMarkdown}><Download /> Markdown (.md)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => printAsPdf(lastValidTitle.current)}><Printer /> PDF (print dialog)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      <main className="flex-1 px-4 py-8 print:p-0">
        <div className="mx-auto min-h-[60vh] max-w-3xl rounded-lg border bg-background p-8 shadow-sm sm:p-12 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
}
