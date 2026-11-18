import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Integration test against the real database: the thumbnail preview is derived by a trigger.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const enabled = Boolean(url && service && anon);

const para = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const doc = (...content: object[]) => ({ type: "doc", content });

describe.skipIf(!enabled)("document preview trigger", () => {
  let admin: SupabaseClient;
  let user: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    admin = createClient(url!, service!, { auth: { persistSession: false } });
    const email = `preview-${Date.now()}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: "Test-pass-123!", email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
    user = createClient(url!, anon!, { auth: { persistSession: false } });
    await user.auth.signInWithPassword({ email, password: "Test-pass-123!" });
  });
  afterAll(async () => {
    await admin.auth.admin.deleteUser(userId);
  });

  const create = async (content: object) => {
    const { data, error } = await user.from("documents").insert({ owner_id: userId, content }).select("id, preview").single();
    if (error) throw error;
    return data;
  };

  it("keeps only the first blocks of a long document", async () => {
    const d = await create(doc(...Array.from({ length: 20 }, (_, i) => para(`block ${i}`))));
    expect(d.preview.content).toHaveLength(6);
    expect(d.preview.content[0].content[0].text).toBe("block 0");
  });

  it("follows content updates", async () => {
    const d = await create(doc(para("before")));
    const { data } = await user.from("documents").update({ content: doc(para("after")) }).eq("id", d.id).select("preview").single();
    expect(data?.preview.content[0].content[0].text).toBe("after");
  });

  it("can't be set directly by a client", async () => {
    const d = await create(doc(para("real")));
    const { data } = await user
      .from("documents")
      .update({ title: "x", preview: doc(para("forged")) })
      .eq("id", d.id)
      .select("preview")
      .single();
    expect(data?.preview.content[0].content[0].text).toBe("real");
  });

  it("falls back to a short excerpt when blocks are huge", async () => {
    const d = await create(doc(para("a".repeat(30_000)), para("b")));
    expect(JSON.stringify(d.preview).length).toBeLessThan(2000);
    expect(d.preview.content[0].content[0].text.startsWith("aaaa")).toBe(true);
  });

  it("handles empty documents", async () => {
    const d = await create(doc({ type: "paragraph" }));
    expect(d.preview.content).toHaveLength(1);
  });
});
