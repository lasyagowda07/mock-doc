"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { docToMarkdown, exportFilename } from "@/lib/export/markdown";
import {
  docIdSchema,
  titleSchema,
  updateDocumentSchema,
  type ActionResult,
} from "@/lib/validation/documents";

const fail = (error: string): ActionResult => ({ ok: false, error });

export async function createDocument() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: auth.user.id })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not create document");
  redirect(`/docs/${data.id}`);
}

/** Saves title and/or content. Used by both the editor autosave and the dashboard rename. */
export async function updateDocument(id: string, patch: { title?: string; content?: unknown }): Promise<ActionResult> {
  const idResult = docIdSchema.safeParse(id);
  const patchResult = updateDocumentSchema.safeParse(patch);
  if (!idResult.success) return fail("Invalid document");
  if (!patchResult.success) return fail(patchResult.error.issues[0].message);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .update(patchResult.data)
    .eq("id", idResult.data)
    .select("id");
  if (error) return fail("Couldn't save. Check your connection and try again.");
  // RLS filters rows the user can't edit, so zero rows means no access (or deleted).
  if (!data?.length) return fail("You no longer have permission to edit this document.");
  if (patchResult.data.title !== undefined) revalidatePath("/");
  return { ok: true };
}

export async function renameDocument(id: string, title: string): Promise<ActionResult> {
  const parsed = titleSchema.safeParse(title);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  return updateDocument(id, { title: parsed.data });
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const parsed = docIdSchema.safeParse(id);
  if (!parsed.success) return fail("Invalid document");

  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").delete().eq("id", parsed.data).select("id");
  if (error) return fail("Couldn't delete the document. Try again.");
  if (!data?.length) return fail("Only the owner can delete a document.");
  revalidatePath("/");
  return { ok: true };
}

/** Used by the dashboard card menu; the editor exports its live content client-side instead. */
export async function exportMarkdown(id: string): Promise<{ ok: true; filename: string; markdown: string } | { ok: false; error: string }> {
  const parsed = docIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid document" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").select("title, content").eq("id", parsed.data).maybeSingle();
  if (error || !data) return { ok: false, error: "Couldn't export this document." };
  return { ok: true, filename: exportFilename(data.title, "md"), markdown: docToMarkdown(data.content) };
}
