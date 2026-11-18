import { createClient } from "@supabase/supabase-js";

/**
 * Runs after every E2E run (pass or fail): removes documents that tests created in the *demo*
 * accounts, so a failed test can't leave clutter behind. Real users' documents are never touched.
 */
export default async function globalTeardown() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: demo } = await admin.from("profiles").select("id").in("email", ["alice@example.com", "bob@example.com", "carol@example.com"]);
  const ids = (demo ?? []).map((p) => p.id);
  if (ids.length === 0) return;

  const { error } = await admin
    .from("documents")
    .delete()
    .in("owner_id", ids)
    .or("title.like.E2E %,title.like.e2e-%,title.eq.Untitled document");
  if (error) console.warn("E2E teardown could not clean up:", error.message);
}
