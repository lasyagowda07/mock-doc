import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { DocDetail, DocListItem, DocRole } from "@/lib/types";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .eq("id", data.user.id)
    .single();
  return profile as { id: string; email: string; display_name: string } | null;
});

type OwnerJoin = { display_name: string; email: string } | null;
type ShareRow = { user_id: string; role: "editor" | "viewer" };

/** All documents the current user can see (RLS: owned + shared with them). */
export async function listDocuments(userId: string): Promise<DocListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, title, source, updated_at, owner_id, preview, owner:profiles!documents_owner_id_fkey(display_name, email), document_shares(user_id, role)",
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((d) => {
    const owner = d.owner as unknown as OwnerJoin;
    const shares = (d.document_shares ?? []) as ShareRow[];
    const mine = shares.find((s) => s.user_id === userId);
    const role: DocRole = d.owner_id === userId ? "owner" : (mine?.role ?? "viewer");
    return {
      id: d.id,
      title: d.title,
      source: d.source,
      updatedAt: d.updated_at,
      role,
      ownerName: owner?.display_name ?? "Unknown",
      ownerEmail: owner?.email ?? "",
      shareCount: d.owner_id === userId ? shares.length : 0,
      preview: d.preview,
    };
  });
}

export async function getDocument(id: string, userId: string): Promise<DocDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, title, content, source, updated_at, owner_id, owner:profiles!documents_owner_id_fkey(display_name), document_shares(user_id, role)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const owner = data.owner as unknown as { display_name: string } | null;
  const mine = ((data.document_shares ?? []) as ShareRow[]).find((s) => s.user_id === userId);
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    source: data.source,
    updatedAt: data.updated_at,
    role: data.owner_id === userId ? "owner" : (mine?.role ?? "viewer"),
    ownerName: owner?.display_name ?? "Unknown",
  };
}
