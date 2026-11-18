import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Integration test: runs against the real Supabase project in .env.local using throwaway users.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && anon && service);

const run = Date.now();
const password = "Test-pass-123!";
const emails = {
  owner: `rls-owner-${run}@example.test`,
  editor: `rls-editor-${run}@example.test`,
  viewer: `rls-viewer-${run}@example.test`,
  stranger: `rls-stranger-${run}@example.test`,
};
type Who = keyof typeof emails;

describe.skipIf(!enabled)("document access (RLS)", () => {
  const admin = createClient(url!, service!, { auth: { persistSession: false } });
  const ids = {} as Record<Who, string>;
  const clients = {} as Record<Who, SupabaseClient>;
  let docId: string;

  beforeAll(async () => {
    for (const who of Object.keys(emails) as Who[]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: emails[who],
        password,
        email_confirm: true,
      });
      if (error) throw error;
      ids[who] = data.user.id;
      const c = createClient(url!, anon!, { auth: { persistSession: false } });
      const { error: signInError } = await c.auth.signInWithPassword({ email: emails[who], password });
      if (signInError) throw signInError;
      clients[who] = c;
    }
    const { data, error } = await clients.owner
      .from("documents")
      .insert({ owner_id: ids.owner, title: "Secret plan" })
      .select()
      .single();
    if (error) throw error;
    docId = data.id;
    const { error: shareError } = await clients.owner.from("document_shares").insert([
      { document_id: docId, user_id: ids.editor, role: "editor" },
      { document_id: docId, user_id: ids.viewer, role: "viewer" },
    ]);
    if (shareError) throw shareError;
  });

  afterAll(async () => {
    for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id);
  });

  it("auto-creates a profile on signup", async () => {
    const { data } = await clients.owner.from("profiles").select("email").eq("id", ids.owner).single();
    expect(data?.email).toBe(emails.owner);
  });

  it("hides a document from users it was not shared with", async () => {
    const { data } = await clients.stranger.from("documents").select("id").eq("id", docId);
    expect(data).toEqual([]);
  });

  it("lets owner, editor and viewer read it", async () => {
    for (const who of ["owner", "editor", "viewer"] as Who[]) {
      const { data } = await clients[who].from("documents").select("id").eq("id", docId);
      expect(data, who).toHaveLength(1);
    }
  });

  it("lets an editor update content but not a viewer or stranger", async () => {
    const edit = await clients.editor.from("documents").update({ title: "Edited" }).eq("id", docId).select();
    expect(edit.data).toHaveLength(1);
    for (const who of ["viewer", "stranger"] as Who[]) {
      const res = await clients[who].from("documents").update({ title: "Hacked" }).eq("id", docId).select();
      expect(res.data, who).toEqual([]);
    }
    const { data } = await clients.owner.from("documents").select("title").eq("id", docId).single();
    expect(data?.title).toBe("Edited");
  });

  it("stops editors from changing ownership", async () => {
    const res = await clients.editor.from("documents").update({ owner_id: ids.editor }).eq("id", docId);
    expect(res.error).not.toBeNull();
  });

  it("only lets the owner manage shares", async () => {
    const add = await clients.editor
      .from("document_shares")
      .insert({ document_id: docId, user_id: ids.stranger, role: "viewer" });
    expect(add.error).not.toBeNull();
    const del = await clients.viewer.from("document_shares").delete().eq("document_id", docId).select();
    expect(del.data).toEqual([]);
  });

  it("only lets the owner delete the document", async () => {
    const res = await clients.editor.from("documents").delete().eq("id", docId).select();
    expect(res.data).toEqual([]);
    const { data } = await clients.owner.from("documents").select("id").eq("id", docId);
    expect(data).toHaveLength(1);
  });

  it("removes access when a share is revoked", async () => {
    await clients.owner.from("document_shares").delete().eq("document_id", docId).eq("user_id", ids.viewer);
    const { data } = await clients.viewer.from("documents").select("id").eq("id", docId);
    expect(data).toEqual([]);
  });
});
