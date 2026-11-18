"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { tintFor } from "@/components/user-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCollaborators, removeShare, shareDocument, updateShareRole } from "@/app/docs/share-actions";
import type { Collaborator, ShareRole } from "@/lib/validation/sharing";

const ROLE_ITEMS = [
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

function RoleSelect({ value, onChange, label, disabled }: { value: ShareRole; onChange: (r: ShareRole) => void; label: string; disabled?: boolean }) {
  return (
    <Select items={ROLE_ITEMS} value={value} onValueChange={(v) => onChange(v as ShareRole)} disabled={disabled}>
      <SelectTrigger aria-label={label} className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_ITEMS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function ShareDialog({ docId, title, open, onOpenChange }: {
  docId: string; title: string; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const [people, setPeople] = useState<Collaborator[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await getCollaborators(docId);
    if (res.ok) setPeople(res.collaborators);
    else setError(res.error);
  }, [docId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getCollaborators(docId).then((res) => {
      if (cancelled) return;
      if (res.ok) setPeople(res.collaborators);
      else setError(res.error);
    });
    return () => { cancelled = true; };
  }, [open, docId]);

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, success?: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setError(null);
        if (success) toast.success(success);
        await load();
      } else setError(res.error);
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const res = await shareDocument(docId, email, role);
      if (res.ok) setEmail("");
      return res;
    }, "Access granted");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setError(null); setEmail(""); setPeople(null); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share “{title}”</DialogTitle>
          <DialogDescription>
            Editors can edit and rename. Viewers can read and export. Only you can share or delete.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={add} className="flex gap-2" noValidate>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Add people by email"
            aria-label="Email to share with"
            className="flex-1"
          />
          <RoleSelect value={role} onChange={setRole} label="Role for new person" />
          <Button type="submit" className="rounded-full" disabled={pending || !email.trim()}>
            <UserPlus /> Share
          </Button>
        </form>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <div className="space-y-1">
          <h3 className="text-sm font-medium">People with access</h3>
          {people === null ? (
            <p className="py-3 text-sm text-muted-foreground">Loading…</p>
          ) : people.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">Only you have access right now.</p>
          ) : (
            <ul>
              <AnimatePresence initial={false} mode="popLayout">
              {people.map((p) => (
                <motion.li
                  key={p.userId}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16, transition: { duration: 0.15 } }}
                  className="flex items-center gap-3 rounded-xl px-1 py-2 hover:bg-muted/60"
                >
                  <Avatar><AvatarFallback className={`font-semibold ${tintFor(p.name)}`}>{p.name.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                  </div>
                  <RoleSelect
                    value={p.role}
                    label={`Role for ${p.email}`}
                    disabled={pending}
                    onChange={(r) => run(() => updateShareRole(docId, p.userId, r), "Role updated")}
                  />
                  <Button
                    variant="ghost" size="icon-sm" aria-label={`Remove ${p.email}`} disabled={pending}
                    onClick={() => run(() => removeShare(docId, p.userId), "Access removed")}
                  >
                    <Trash2 />
                  </Button>
                </motion.li>
              ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
