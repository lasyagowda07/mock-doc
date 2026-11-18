"use server";

import { createClient } from "@/lib/supabase/server";
import { ImportError, importFile } from "@/lib/import";

export type UploadResult = { ok: true; id: string } | { ok: false; error: string };

export async function uploadDocument(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Choose a file to upload." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Please log in again." };

  try {
    const { title, content } = await importFile(file.name, Buffer.from(await file.arrayBuffer()));
    const { data, error } = await supabase
      .from("documents")
      .insert({ owner_id: auth.user.id, title, content, source: "uploaded", original_filename: file.name.slice(0, 255) })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Couldn't save the imported document. Try again." };
    return { ok: true, id: data.id };
  } catch (e) {
    if (e instanceof ImportError) return { ok: false, error: e.message };
    return { ok: false, error: "Something went wrong while importing that file." };
  }
}
