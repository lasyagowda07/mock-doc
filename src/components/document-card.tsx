"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, FileText, FileUp, MoreVertical, Pencil, Printer, Share2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const Icon = doc.source === "uploaded" ? FileUp : FileText;
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

  return (
    <Card className={`group relative p-0 transition-shadow hover:shadow-md ${isShared ? "border-l-4 border-l-blue-500" : ""}`}>
      <Link href={`/docs/${doc.id}`} className="flex flex-col gap-3 rounded-xl p-4 pr-12 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <div className="flex h-24 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-8" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-medium" title={doc.title}>{doc.title}</h3>
          <p className="text-xs text-muted-foreground">
            Edited <TimeAgo iso={doc.updatedAt} />
          </p>
          {isShared && <p className="truncate text-xs text-muted-foreground">Shared by {doc.ownerName}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={isShared ? "secondary" : "outline"}>{roleLabel[doc.role]}</Badge>
          {doc.shareCount > 0 && (
            <Badge variant="outline">
              <Users /> {doc.shareCount}
            </Badge>
          )}
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${doc.title}`} className="absolute right-2 top-2" />}>
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
    </Card>
  );
}
