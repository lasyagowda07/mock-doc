import type { DocRole } from "@/lib/types";

// UI-level mirror of the RLS rules in supabase/migrations. RLS is the source of truth;
// these helpers only decide what to show.
export const canEdit = (role: DocRole) => role === "owner" || role === "editor";
export const canRename = canEdit;
export const canShare = (role: DocRole) => role === "owner";
export const canDelete = (role: DocRole) => role === "owner";

export const roleLabel: Record<DocRole, string> = { owner: "Owner", editor: "Editor", viewer: "Viewer" };
