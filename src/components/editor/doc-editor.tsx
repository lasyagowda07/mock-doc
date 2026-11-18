"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";

import { Download, Eye, Printer, Share2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/user-menu";
import { Toolbar } from "@/components/editor/toolbar";
import { SaveStatusIndicator } from "@/components/editor/save-status";
import { useAutosave } from "@/components/editor/use-autosave";
import { HeaderShell } from "@/components/header-shell";
import { LogoMark } from "@/components/logo";
import { Pressable } from "@/components/motion";
import { editorExtensions } from "@/lib/editor-extensions";
import { downloadText, printAsPdf } from "@/lib/export/download";
import { docToMarkdown, exportFilename } from "@/lib/export/markdown";
import { ShareDialog } from "@/components/share-dialog";
import { canEdit, canRename, canShare, roleLabel } from "@/lib/permissions";
import type { DocDetail } from "@/lib/types";

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
    <div className="flex min-h-svh flex-col print:bg-white">
      <HeaderShell>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:h-16 sm:flex-nowrap sm:py-0">
          <Link href="/" aria-label="Back to documents" className="rounded-lg outline-none transition-transform hover:-rotate-6 hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50">
            <LogoMark className="size-8" />
          </Link>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => setTitle(lastValidTitle.current)}
            disabled={!canRename(doc.role)}
            maxLength={200}
            aria-label="Document title"
            className="order-last h-10 w-full rounded-xl border-transparent bg-transparent px-2 font-display text-xl font-semibold md:text-xl hover:border-input hover:bg-card/60 focus-visible:border-ring focus-visible:bg-card disabled:opacity-100 sm:order-none sm:w-auto sm:max-w-md sm:flex-1"
          />
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${{ owner: "bg-peach text-peach-ink", editor: "bg-sage text-sage-ink", viewer: "bg-lavender text-lavender-ink" }[doc.role]}`}>
            {!editable && <Eye className="size-3" />} {roleLabel[doc.role]}
            {doc.role !== "owner" && ` · shared by ${doc.ownerName}`}
          </span>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {editable ? (
              <SaveStatusIndicator status={status} error={error} onRetry={saveNow} />
            ) : (
              <span className="text-sm text-muted-foreground">View only</span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" className="h-9 rounded-full bg-card/80 px-4" />}>
                <Download /> <span className="max-sm:sr-only">Export</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl p-1.5">
                <DropdownMenuItem className="rounded-lg" onClick={exportMarkdown}><Download /> Markdown (.md)</DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg" onClick={() => printAsPdf(lastValidTitle.current)}><Printer /> PDF (print dialog)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canShare(doc.role) && (
              <>
                <Pressable>
                  <Button className="h-9 rounded-full px-4 shadow-soft" onClick={() => setShareOpen(true)}>
                    <Share2 /> <span className="max-sm:sr-only">Share</span>
                  </Button>
                </Pressable>
                <ShareDialog docId={doc.id} title={title} open={shareOpen} onOpenChange={setShareOpen} />
              </>
            )}
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
        {editor && editable && <div className="px-4 pb-3"><Toolbar editor={editor} /></div>}
      </HeaderShell>
      <main className="flex-1 px-4 pb-20 pt-8 print:p-0">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          className="mx-auto min-h-[65vh] max-w-3xl rounded-2xl border border-border/60 bg-card p-8 shadow-soft sm:p-14 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
        >
          <EditorContent editor={editor} />
        </motion.div>
      </main>
    </div>
  );
}
