"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, FileUp, MoreVertical, Pencil, Printer, Share2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { deleteDocument, exportMarkdown, renameDocument } from "@/app/docs/actions";
import { downloadText } from "@/lib/export/download";
import { DocPreview } from "@/components/doc-preview";
import { itemVariants } from "@/components/motion";
import { TimeAgo } from "@/components/time-ago";
import { ShareDialog } from "@/components/share-dialog";
import { canDelete, canRename, canShare, roleLabel } from "@/lib/permissions";
import type { DocListItem } from "@/lib/types";

export function DocumentCard({ doc }: { doc: DocListItem }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
    const isShared = doc.role !== "owner";

  function submitRename(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await renameDocument(doc.id, title);
      if (res.ok) {
        setRenameOpen(false);
        toast.success("Document renamed");
      } else toast.error(res.error);
    });
  }

  async function onExportMarkdown() {
    const res = await exportMarkdown(doc.id);
    if (res.ok) downloadText(res.filename, res.markdown);
    else toast.error(res.error);
  }

  function confirmDelete() {
    startTransition(async () => {
      const res = await deleteDocument(doc.id);
      if (res.ok) toast.success("Document deleted");
      else toast.error(res.error);
      setDeleteOpen(false);
    });
  }

  const tint = isShared ? "bg-lavender" : doc.source === "uploaded" ? "bg-sage" : "bg-peach";
  const roleChip = { owner: "bg-peach text-peach-ink", editor: "bg-sage text-sage-ink", viewer: "bg-lavender text-lavender-ink" }[doc.role];

  return (
    <motion.div
      layout
      variants={itemVariants}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      whileHover={{ y: -5 }}
      className="group relative"
    >
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-shadow duration-300 group-hover:shadow-lift">
        <Link href={`/docs/${doc.id}`} className="block outline-none focus-visible:ring-3 focus-visible:ring-ring/60 rounded-2xl">
          <div className={`relative h-44 overflow-hidden p-4 pb-0 ${tint}`}>
            <div className="h-full origin-bottom transition-transform duration-300 ease-out group-hover:-rotate-[0.8deg] group-hover:scale-[1.035]">
              <DocPreview preview={doc.preview} />
            </div>
            {doc.source === "uploaded" && (
              <span className="absolute bottom-2.5 left-5 flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-medium text-sage-ink shadow-soft">
                <FileUp className="size-3" /> Imported
              </span>
            )}
          </div>
          <div className="space-y-2.5 p-4">
            <div className="min-w-0">
              <h3 className="truncate font-display text-[17px] font-semibold leading-snug" title={doc.title}>{doc.title}</h3>
              <p className="text-xs text-muted-foreground">
                Edited <TimeAgo iso={doc.updatedAt} />
                {isShared && <span> · Shared by {doc.ownerName}</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleChip}`}>{roleLabel[doc.role]}</span>
              {doc.shareCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-butter px-2.5 py-0.5 text-xs font-medium text-butter-ink">
                  <Users className="size-3" /> {doc.shareCount}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${doc.title}`} className="absolute right-3 top-3 rounded-full bg-card/90 shadow-soft transition-opacity hover:bg-card md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:focus-visible:opacity-100 data-[popup-open]:opacity-100" />}>
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/docs/${doc.id}`} />}>Open</DropdownMenuItem>
          {canShare(doc.role) && (
            <DropdownMenuItem onClick={() => setShareOpen(true)}>
              <Share2 /> Share
            </DropdownMenuItem>
          )}
          {canRename(doc.role) && (
            <DropdownMenuItem onClick={() => { setTitle(doc.title); setRenameOpen(true); }}>
              <Pencil /> Rename
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onExportMarkdown}>
            <Download /> Export as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/docs/${doc.id}?print=1`)}>
            <Printer /> Export as PDF
          </DropdownMenuItem>
          {canDelete(doc.role) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form onSubmit={submitRename} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Rename document</DialogTitle>
              <DialogDescription>Choose a new title (up to 200 characters).</DialogDescription>
            </DialogHeader>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus aria-label="Document title" />
            <DialogFooter>
              <Button type="submit" disabled={pending || !title.trim()}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {canShare(doc.role) && <ShareDialog docId={doc.id} title={doc.title} open={shareOpen} onOpenChange={setShareOpen} />}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{doc.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the document{doc.shareCount > 0 ? " for everyone it&apos;s shared with" : ""}. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={pending}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
