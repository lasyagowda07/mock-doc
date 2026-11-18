# Architecture note

## What I prioritized, and why

The brief asks for depth in a few areas over shallow coverage everywhere. I ranked work by "what would make a reviewer lose trust if it were wrong":

1. **Access control that is actually enforced.** Sharing is the riskiest feature to fake. Permissions live in Postgres Row Level Security, so a viewer can't write even by calling the API directly. This is tested against the real database.
2. **An editor that feels reliable.** Autosave, clear save state, no lost work on a flaky connection, structured storage so formatting survives.
3. **Upload and export that are product-relevant, not demos.** Upload creates a real editable document; export works for every role.
4. **A deployed, reproducible build.** All config comes from environment variables; schema is versioned SQL; one command seeds demo data.

Deliberately *not* built: real-time co-editing, comments, version history, folders (see "Cuts").

## System overview

```
Browser (React / Tiptap)
   │  Server Actions (typed, zod-validated)          ┌───────────────────────────┐
   ├───────────────────────────────────────────────▶ │ Next.js on Vercel         │
   │  page requests (RSC)                            │  proxy.ts: session refresh│
   │                                                 │  + route protection       │
   │                                                 └─────────────┬─────────────┘
   │                                                               │ supabase-js (user's JWT)
   │                                                 ┌─────────────▼─────────────┐
   └── Supabase Auth (email/password, JWT cookie) ──▶│ Supabase                  │
                                                     │  Auth · Postgres + RLS    │
                                                     └───────────────────────────┘
```

- **Next.js App Router + Server Actions.** Pages are server-rendered per user (they read the session cookie); mutations are Server Actions. There is no separate API layer to keep in sync.
- **The Supabase client always runs as the signed-in user** (publishable key + user JWT), so Postgres RLS decides what each request may see or change. The service-role key is used only by the seed script and tests; it is never imported by app code.
- **`src/proxy.ts`** (Next 16's replacement for middleware) refreshes the auth cookie and redirects logged-out users to `/login` and logged-in users away from the auth pages.

## Data model

```
auth.users ──1:1── profiles(id, email, display_name)
                      │
                      ├──< documents(id, owner_id, title, content jsonb, preview jsonb, source, original_filename, timestamps)
                      │         │
                      └──< document_shares(document_id, user_id, role: editor|viewer)  unique(document_id,user_id)
```

- `profiles` is created by a trigger on signup, so share-by-email can resolve users.
- `documents.source` (`created` | `uploaded`) drives the dashboard's "Uploaded documents" section; `original_filename` is kept for provenance.
- **Role model:** *owner* is implicit (`documents.owner_id`); `document_shares.role` is `editor` or `viewer`. A user has at most one share per document.

## Thumbnails and the design system

- **Dashboard thumbnails** are real miniatures of each document. A database trigger derives `documents.preview` (the first 6 blocks of `content`, with a plain-text-excerpt fallback if blocks are huge) on every insert/update, so the dashboard never downloads whole documents to draw cards, and clients can't forge it. `DocPreview` renders that slice at full size inside a scaled-down page. Tested in `tests/preview.test.ts`.
- **Design tokens** live in `globals.css` (oklch): a cream/espresso base, a terracotta primary (chosen to keep AA contrast with white text), and pastel fills with matching "ink" colors for chips. Three fonts do three jobs: Fraunces for headings, Plus Jakarta Sans for UI, Newsreader for reading/writing.
- **Motion** (Framer Motion) is deliberately small: staggered entrance and hover lift on cards, animated save status, animated dialogs and list changes, a page-entrance template, and a shake on failed auth. One `MotionConfig reducedMotion="user"` honors the OS setting, and E2E runs in reduced-motion mode so animation can't cause flakiness.

## Access control (the core of the sharing design)

Rules are in [`supabase/migrations`](supabase/migrations):

| Action | Owner | Editor | Viewer | Stranger |
|---|---|---|---|---|
| Read document | ✅ | ✅ | ✅ | ❌ |
| Edit content / rename | ✅ | ✅ | ❌ | ❌ |
| Share, change roles, revoke | ✅ | ❌ | ❌ | ❌ |
| Delete document | ✅ | ❌ | ❌ | ❌ |
| Change `owner_id` / `source` | ❌ (immutable, enforced by trigger) | ❌ | ❌ | ❌ |

Implementation notes:
- **Helper functions** (`can_view`, `can_edit`, `is_owner`) are `SECURITY DEFINER` so policies on `documents` and `document_shares` can consult each other without infinite RLS recursion.
- **A bug I hit and fixed:** `INSERT … RETURNING` evaluates the SELECT policy before the new row is visible to a helper function's own query, so creating a document failed. The SELECT policy now also checks `owner_id = auth.uid()` directly (migration 2). The RLS integration test caught this.
- **UI mirrors, never replaces, the rules.** `src/lib/permissions.ts` decides which buttons to show; RLS is the source of truth. Server actions check "0 rows affected" to turn a silent RLS denial into a friendly error (e.g. an editor whose access was revoked mid-edit sees "Not saved — you no longer have permission").
- **Known trade-off:** `profiles` is readable by any signed-in user (needed for share-by-email), so a signed-in user can look up whether an email has an account. Acceptable for an internal tool; for a public product I'd use an invitation flow instead.

## Editor and storage format

- **Tiptap** (ProseMirror) with StarterKit; headings limited to H1–H3.
- Content is stored as **Tiptap JSON in a `jsonb` column**. It's lossless for the editor, queryable, and avoids HTML sanitization problems on read.
- **One shared schema** (`src/lib/editor-extensions.ts`) is used by the editor *and* by file import. Anything imported goes through the same schema, so unsupported markup (scripts, images, tables) is dropped by construction rather than by a blocklist.
- **Autosave** (`use-autosave.ts`): debounced 800 ms; saves are serialized (a save never overlaps another, patches made during a save are merged into the next one); failures keep the pending patch and expose Retry; also flushes on tab hide / unmount and warns on `beforeunload`. Concurrency model is **last write wins**.

## Import and export

- **Import** (server-side, `src/lib/import`): `.txt` → paragraphs/line breaks; `.md` → `marked` → HTML → schema; `.docx` → `mammoth` → HTML → schema (underline needs an explicit style map). Validation: extension allow-list, size ≤ 4 MB (Vercel's request limit is 4.5 MB), non-empty, zip signature check for `.docx`, binary check for text files, friendly errors for corrupt files.
- **Markdown export** is a small hand-written, pure serializer (`src/lib/export/markdown.ts`) rather than an HTML→Markdown library: the schema is small, the output is deterministic and exactly testable, and it round-trips through the importer. Underline is emitted as `<u>` because Markdown has none.
- **PDF export** uses the browser's print engine with a print stylesheet. I rejected `html2pdf.js` because it rasterizes pages into images (no selectable text, blurry, large files). Print gives vector text and full Unicode at the cost of one extra click.

## Decisions I changed or rejected

| Decision | Outcome |
|---|---|
| `html2pdf.js` for PDF | Rejected (raster output) → print stylesheet |
| `turndown` for Markdown | Replaced with an own serializer (deterministic + testable) |
| Next 16 `cacheComponents` (scaffold default) | Turned off: the app is per-user dynamic and it caused prerender errors |
| Direct Supabase DB host for migrations | It's IPv6-only; use the session pooler connection string |
| Checking permissions only in the UI | Rejected → RLS + a database test that proves it |
| Realtime co-editing | Cut (see below) |

## Cuts (and why)

- **Real-time collaboration / presence** — highest-value missing feature, but it needs a CRDT layer (Yjs) and a websocket/Realtime design; doing it badly would have eaten time from correctness elsewhere.
- **Comments, suggestions, version history, folders, images/tables** — each is a feature on its own; none is needed to demonstrate the core slice.
- **Invitations for non-users** — requires an email provider; the brief says reviewers shouldn't need paid services.
- **Storing original uploaded files** — the original filename is kept, but the file itself isn't, because the editable document is the product.

## Testing strategy

| Layer | What | Where |
|---|---|---|
| Unit | validation, permissions, import/export converters | `tests/*.test.ts` |
| Database | RLS behaviour with real users against Supabase | `tests/rls.test.ts` |
| End to end | real browser journeys incl. two-user sharing, downloads, offline recovery | `tests/e2e/*` |
| Quality gates | axe WCAG 2.1 A/AA scan of every screen state, zero console errors/warnings | `tests/e2e/quality.spec.ts` |

E2E also runs against the production URL, so the deployed build is verified, not just local.

## Known limitations

- Last-write-wins on simultaneous edits (no merge, no presence).
- Free-tier Supabase projects pause after a week of inactivity; opening the app (or the Supabase dashboard) wakes it.
- Email lookups for sharing are visible to signed-in users (see above).
- Light theme only.
