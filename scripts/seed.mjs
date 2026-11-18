// Seeds demo users, documents and shares. Idempotent: safe to run repeatedly.
// Usage: npm run seed   (reads .env.local)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example)");

const PASSWORD = process.env.SEED_PASSWORD ?? "Demo-pass-123";
const USERS = [
  { email: "alice@example.com", name: "Alice Johnson" },
  { email: "bob@example.com", name: "Bob Smith" },
  { email: "carol@example.com", name: "Carol Lee" },
];

const p = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });
const h = (level, text) => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
const li = (text) => ({ type: "listItem", content: [p(text)] });
const doc = (...content) => ({ type: "doc", content });

const admin = createClient(url, key, { auth: { persistSession: false } });

async function ensureUser({ email, name }) {
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (error) throw error;
  return data.user.id;
}

async function ensureDoc(ownerId, title, content, source = "created", original_filename = null) {
  const { data: existing } = await admin
    .from("documents").select("id").eq("owner_id", ownerId).eq("title", title).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from("documents").insert({ owner_id: ownerId, title, content, source, original_filename })
    .select("id").single();
  if (error) throw error;
  return data.id;
}

async function share(documentId, userId, role) {
  const { error } = await admin
    .from("document_shares").upsert({ document_id: documentId, user_id: userId, role }, { onConflict: "document_id,user_id" });
  if (error) throw error;
}

const [alice, bob, carol] = await Promise.all(USERS.map(ensureUser));

const roadmap = await ensureDoc(alice, "Q1 Product Roadmap", doc(
  h(1, "Q1 Product Roadmap"),
  p("Our priorities for the quarter, in order."),
  h(2, "Goals"),
  { type: "bulletList", content: [li("Ship the collaborative editor"), li("Launch sharing with roles"), li("Reach 100 weekly active teams")] },
  h(2, "Milestones"),
  { type: "orderedList", content: [li("Design review"), li("Private beta"), li("Public launch")] },
));
const notes = await ensureDoc(alice, "Meeting notes", doc(
  h(2, "Weekly sync"),
  { type: "paragraph", content: [{ type: "text", text: "Decision: ", marks: [{ type: "bold" }] }, { type: "text", text: "go with Supabase for the backend." }] },
));
await ensureDoc(alice, "welcome", doc(h(1, "Welcome"), p("This document was imported from a file.")), "uploaded", "welcome.md");
const bobIdeas = await ensureDoc(bob, "Bob's launch ideas", doc(h(1, "Launch ideas"), p("Brainstorm: blog post, demo video, newsletter.")));

await share(roadmap, bob, "editor");   // Bob can edit Alice's roadmap
await share(notes, bob, "viewer");     // Bob can only read Alice's notes
await share(roadmap, carol, "viewer");
await share(bobIdeas, alice, "viewer"); // Alice can read Bob's ideas

console.log(`Seeded ${USERS.length} users (password: ${PASSWORD}) and sample documents/shares.`);
USERS.forEach((u) => console.log(`  ${u.email}`));
