"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { docIdSchema } from "@/lib/validation/documents";
import { type Collaborator, shareInputSchema, shareRoleSchema } from "@/lib/validation/sharing";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });
const uuid = (v: string) => docIdSchema.safeParse(v).success;

export async function getCollaborators(docId: string): Promise<Result<{ collaborators: Collaborator[] }>> {
  if (!uuid(docId)) return fail("Invalid document");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_shares")
    .select("user_id, role, profile:profiles!document_shares_user_id_fkey(email, display_name)")
    .eq("document_id", docId)
    .order("created_at");
  if (error) return fail("Couldn't load who has access.");
  const collaborators = (data ?? []).map((r) => {
    const p = r.profile as unknown as { email: string; display_name: string } | null;
    return { userId: r.user_id, role: r.role, email: p?.email ?? "", name: p?.display_name ?? "" } as Collaborator;
  });
  return { ok: true, collaborators };
}

export async function shareDocument(docId: string, email: string, role: string): Promise<Result> {
  if (!uuid(docId)) return fail("Invalid document");
  const parsed = shareInputSchema.safeParse({ email, role });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail("Please log in again.");

  const { data: target } = await supabase.from("profiles").select("id").eq("email", parsed.data.email).maybeSingle();
  if (!target) return fail("No account found for that email. They need to sign up first.");
  if (target.id === auth.user.id) return fail("You already own this document.");

  const { error } = await supabase
    .from("document_shares")
    .insert({ document_id: docId, user_id: target.id, role: parsed.data.role });
  if (error?.code === "23505") return fail("They already have access. Change their role in the list below.");
  if (error) return fail("Only the owner can share this document.");
  revalidatePath("/");
  return { ok: true };
}

export async function updateShareRole(docId: string, userId: string, role: string): Promise<Result> {
  const parsedRole = shareRoleSchema.safeParse(role);
  if (!uuid(docId) || !uuid(userId)) return fail("Invalid request");
  if (!parsedRole.success) return fail(parsedRole.error.issues[0].message);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_shares")
    .update({ role: parsedRole.data })
    .eq("document_id", docId)
    .eq("user_id", userId)
    .select("id");
  if (error || !data?.length) return fail("Couldn't change that role. Only the owner can.");
  revalidatePath("/");
  return { ok: true };
}

export async function removeShare(docId: string, userId: string): Promise<Result> {
  if (!uuid(docId) || !uuid(userId)) return fail("Invalid request");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_shares")
    .delete()
    .eq("document_id", docId)
    .eq("user_id", userId)
    .select("id");
  if (error || !data?.length) return fail("Couldn't remove access. Only the owner can.");
  revalidatePath("/");
  return { ok: true };
}
