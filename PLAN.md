# Ajaia Collaborative Doc Editor — Build Plan

> **Status (2026-11-18):** Sprint 0 ✅ · Sprint 1 ✅ (header user menu lands with the Sprint 2 dashboard) · Sprint 2 ✅ · Sprint 3 ✅ · Sprint 4 next.
> Live: https://mock-h8rzy8iad-lasyagowda07-7344s-projects.vercel.app · Repo: github.com/lasyagowda07/mock-doc (private)
> Demo logins (run `npm run seed`): alice@ / bob@ / carol@example.com, password `Demo-pass-123`.

Stack: **Next.js (App Router, TS) + shadcn/ui + Tailwind**, **Supabase** (Auth, Postgres + RLS, Storage), **Tiptap** editor, deployed on **Vercel** (free tier). Everything must be free for reviewers.

Stretch included: **Export (PDF + Markdown)** and **Role-based sharing (owner / editor / viewer)**.

---

## 0. Key decisions (lock these first)

| Decision | Choice | Why |
|---|---|---|
| Auth | Supabase email+password, email confirmation **off** | Reviewers can sign up instantly; plus 2–3 seeded accounts |
| Editor | Tiptap (StarterKit + Underline + Heading + Lists) | Rich text w/ JSON output, easy markdown/HTML export |
| Storage format | Tiptap JSON in `jsonb` column | Preserves structure reliably |
| Upload behaviour | `.txt`, `.md`, `.docx` → new editable doc (marked as "uploaded") | Matches the "Uploaded documents" section; supported types stated in UI + README |
| Access control | Postgres RLS, not just UI checks | Real, demonstrable access logic |
| Roles | `owner`, `editor`, `viewer` | Meaningful stretch without enterprise scope |
| Save | Debounced autosave + "Saved / Saving…" indicator | Feels like a real editor |
| Export | Markdown (client-side) and PDF (client-side or print stylesheet) | No paid services |

Dashboard sections (the "canvas"):
1. **My documents** (created by me, not uploaded)
2. **Uploaded documents** (created via file import)
3. **Shared with me** (with role badge)

---

## 1. Requirements traceability (nothing missed)

| Requirement from brief | Sprint | Done |
|---|---|---|
| Create new doc | 2 | [x] |
| Rename doc | 2 | [x] |
| Edit in browser | 2 | [x] |
| Save and reopen | 2 | [x] |
| Bold, italic, underline | 2 | [x] |
| Headings / text size | 2 | [x] |
| Bulleted + numbered lists | 2 | [x] |
| File upload → product-relevant | 3 | [x] |
| Supported file types stated in UI **and** README | 3, 6 | UI [x] · README [ ] |
| Doc owner | 1, 4 | [ ] |
| Grant another user access | 4 | [ ] |
| Visible owned vs shared distinction | 1/4 | [x] _(badges, accent border, "Shared by", separate section)_ |
| Seeded/lightweight users | 1 | [x] |
| Persistence across refresh | 2 | [x] |
| Formatting preserved | 2 | [x] |
| Shared access demonstrable | 4 | [ ] |
| Setup/run instructions | 6 | [ ] |
| Working deployment | 6 | [ ] |
| Validation + error handling | 5 | [ ] |
| ≥1 meaningful automated test | 5 | [ ] |
| Architecture note | 6 | [ ] |
| AI workflow note | 6 | [ ] |
| Walkthrough video (3–5 min) | 7 | [ ] |
| Export PDF / Markdown (stretch) | 5 | [ ] |
| Role-based permissions (stretch) | 4 | [ ] |
| README: working / incomplete / next 2–4 hrs | 6 | [ ] |
| SUBMISSION.md, creds, video URL txt, screenshots | 7 | [ ] |
| Google Drive folder | 7 | [ ] |

---

## Sprint 0 — Setup (≈1 hr)

- [x] `npx create-next-app` (TypeScript, Tailwind, App Router, ESLint)
- [x] `npx shadcn@latest init`; add: button, input, dialog, dropdown-menu, card, badge, tabs, select, toast/sonner, skeleton, avatar, tooltip, separator, alert-dialog
- [x] Create Supabase project (free tier); copy URL + anon key
- [x] Install: `@supabase/supabase-js`, `@supabase/ssr`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `mammoth`, `zod`, `vitest`, `@playwright/test` (optional), `turndown` / `tiptap-markdown`, `html2pdf.js` (or `@react-pdf`/print CSS)
- [x] `.env.local` + `.env.example`
- [x] Supabase CLI + `supabase/migrations/` folder so schema is versioned and reproducible
- [x] Folder layout: `app/`, `components/`, `lib/supabase/`, `lib/validation/`, `lib/export/`, `lib/import/`, `supabase/migrations/`, `tests/`
- [x] Connect GitHub repo + Vercel project early (deploy a hello-world to de-risk)

**Exit:** blank app deployed on Vercel, connected to Supabase.

---

## Sprint 1 — Auth + Data model (≈2–3 hrs)

**Schema (migration 001)**
- [x] `profiles` (id → auth.users, email, display_name, created_at) + trigger to auto-create on signup
- [x] `documents` (id, owner_id, title, content jsonb, source text `'created' | 'uploaded'`, original_filename, created_at, updated_at)
- [x] `document_shares` (id, document_id, user_id, role `'editor' | 'viewer'`, created_at, unique(document_id, user_id))
- [ ] `attachments` (optional: only if also doing attachments) — otherwise skip and say so
- [x] Indexes on `owner_id`, `document_shares.user_id`, `document_shares.document_id`
- [x] `updated_at` trigger

**RLS policies**
- [x] `documents` SELECT: owner OR has share row
- [x] `documents` INSERT: owner_id = auth.uid()
- [x] `documents` UPDATE: owner OR share role = editor (title/content only; owner-only for deleting/sharing)
- [x] `documents` DELETE: owner only
- [x] `document_shares` SELECT: owner of doc or the shared user; INSERT/UPDATE/DELETE: doc owner only
- [x] `profiles` readable by authenticated users (needed for share-by-email lookup)
- [x] Avoid RLS recursion (use `security definer` helper functions like `can_view(doc_id)`, `can_edit(doc_id)`)

**Auth UI**
- [x] `/login` and `/signup` pages (server actions + zod) (shadcn forms, zod validation, inline errors)
- [x] Supabase SSR client setup + `proxy.ts` (Next 16 renamed middleware → proxy) to protect routes and refresh sessions
- [ ] Sign out; show current user in header
- [x] Redirect logic: unauthenticated → `/login`, authenticated at `/login` → `/`
- [x] Seed script: 3 users (e.g. `alice@`, `bob@`, `carol@` test accounts) + sample docs + one share, documented in README

**Exit:** can sign up / log in / log out; RLS verified via SQL tests with two users.

---

## Sprint 2 — Dashboard + Editor core (≈4–5 hrs)

**Dashboard (`/`)**
- [x] Header with app name, user menu, "New document" button, "Upload" button
- [x] Three sections: **My documents**, **Uploaded documents**, **Shared with me**
- [x] Doc card: title, last edited, owner (for shared), role badge, source icon
- [x] Empty states for each section; loading skeletons; error state
- [x] Sort by last updated; (nice) search box filter by title
- [x] Card actions menu: Open, Rename, Delete (owner only) — _Share (Sprint 4) and Export (Sprint 5) get added to this menu later_

**Create / rename / delete**
- [x] New doc → inserts "Untitled document" → navigates to `/docs/[id]`
- [x] Rename inline in editor header and from dashboard (dialog); validate non-empty, max length
- [x] Delete with confirm dialog (owner only)

**Editor (`/docs/[id]`)**
- [x] Tiptap with: Bold, Italic, Underline, H1/H2/H3 (or paragraph/heading dropdown), bullet list, ordered list
- [x] Toolbar with active states + keyboard shortcuts (Ctrl/Cmd+B/I/U)
- [x] Load content from DB; autosave (debounced ~1s) + manual save shortcut
- [x] Save status: "Saving…" / "Saved" / "Error — retry"
- [x] Title input in header, saved independently
- [x] Read-only mode for viewers (toolbar disabled, "View only" badge)
- [x] Unsaved-changes guard on navigation/close if save pending
- [x] Handle not-found / no-access doc (friendly 404/403 page)
- [x] Basic page-like styling (centered column, readable typography)

**Decisions made:** editors may rename and edit; only owners share/delete. Autosave is last-write-wins. Next 16's `cacheComponents` was turned off (everything is per-user dynamic). Playwright E2E lives in `tests/e2e` (`npm run test:e2e`).

**Exit:** create → edit with formatting → refresh → content + formatting intact.

---

## Sprint 3 — File upload (≈2–3 hrs)

- [x] Upload button + drag-and-drop zone on dashboard
- [x] Supported types: **.txt, .md, .docx** — stated in the dialog and README
- [x] Client + server validation: extension/MIME, max size (e.g. 5 MB), non-empty
- [x] `.txt` → paragraphs (split on blank lines, preserve line breaks)
- [x] `.md` → HTML → Tiptap JSON (headings, bold, italic, lists)
- [x] `.docx` → `mammoth` → HTML → Tiptap JSON (headings, bold/italic/underline, lists)
- [x] Creates new doc with `source = 'uploaded'`, title = filename sans extension, `original_filename` stored
- [x] Appears in **Uploaded documents** section; opens in editor
- [ ] ~~(Optional) keep original file in Supabase Storage~~ — skipped by design; the original filename is stored on the document
- [x] Error toasts: unsupported type, too large, corrupt file
- [x] Sanitize imported HTML (strip scripts/styles)

**Decisions made:** one file per upload; 4 MB cap (Vercel's request limit is 4.5 MB); conversion runs server-side through the editor's own schema (`src/lib/editor-extensions.ts`), so unsupported markup (scripts, images, tables) is dropped by construction; images/tables are not imported and the dialog says so. Underline in `.docx` needed a mammoth style-map. Tested in `tests/import.test.ts` + `tests/e2e/upload.spec.ts`.

**Exit:** upload each of the 3 types, edit the result, refresh, still there.

---

## Sprint 4 — Sharing + role-based permissions (≈3–4 hrs)

- [ ] Share dialog on doc (owner only), also from dashboard menu
- [ ] Add person by email → looks up in `profiles`; error if user doesn't exist ("They need to sign up first")
- [ ] Role select on add: **Editor** / **Viewer**
- [ ] List current collaborators with role dropdown (change role) and remove button
- [ ] Prevent: sharing with self, duplicate shares, non-owner managing shares
- [ ] **Shared with me** section shows owner name/email + role badge
- [ ] Owned vs shared visibly distinct (badge "Owner" / "Editor" / "Viewer", different section, different card accent)
- [ ] Editor page shows role + owner; viewers get read-only editor; editors can edit but not share/delete/rename (decide: editors may rename — pick one, document it)
- [ ] Server-side enforcement (RLS) confirmed: viewer cannot update via direct API call
- [ ] Revoked access → doc disappears from recipient's dashboard; open tab shows access-lost message on next load/save
- [ ] (Nice) Realtime refresh of dashboard when a share is added (Supabase Realtime) — only if time

**Exit:** Alice shares with Bob as viewer → Bob sees read-only; change to editor → Bob can edit; remove → gone.

---

## Sprint 5 — Export, validation, errors, tests (≈3–4 hrs)

**Export (stretch)**
- [ ] Export menu in editor (and dashboard card menu): **Markdown (.md)** and **PDF**
- [ ] Markdown: Tiptap JSON → HTML → Markdown (turndown) or `tiptap-markdown`; download via Blob; filename = title
- [ ] PDF: render doc HTML → `html2pdf.js` or print-optimized CSS + `window.print()`; preserve headings/lists/bold/italic/underline
- [ ] Viewers can export too

**Validation & errors**
- [ ] zod schemas: auth forms, title (1–200 chars), share email + role, upload file
- [ ] Consistent toast/inline error handling for all Supabase calls
- [ ] Global `error.tsx` and `not-found.tsx`; loading states (`loading.tsx`)
- [ ] Network-failure handling for autosave (retry + visible state)

**Tests**
- [ ] Unit (Vitest): import converters (txt/md → Tiptap JSON), markdown export, zod schemas
- [ ] Permission logic test: role → capability helper (`canEdit`, `canShare`, `canDelete`)
- [ ] RLS test (SQL or script with two real users): viewer can't update, non-shared user can't read — **this is the "meaningful" test**
- [ ] (Optional) Playwright E2E: login → create → format → share → other user sees it
- [ ] `npm test` documented in README

**Exit:** tests green; exports open correctly in Preview/Word/any md viewer.

---

## Sprint 6 — Polish, deployment, docs (≈3 hrs)

**Polish**
- [ ] Responsive layout check (desktop first, usable on tablet)
- [ ] Dark mode (shadcn default) works or is intentionally off
- [ ] Accessibility pass: labels, focus rings, toolbar `aria-pressed`, keyboard nav
- [ ] Favicon, page titles, consistent copy
- [ ] Remove console errors/warnings; remove dead code

**Deployment**
- [ ] Production Supabase: migrations applied, auth site URL + redirect URLs set to Vercel domain
- [ ] Vercel env vars set; production build passes (`next build`)
- [ ] Seed demo accounts in production; verify sharing flow live in two browsers
- [ ] Confirm no paid dependencies; Supabase free project won't be paused (visit it before submitting; note pause risk)

**Docs (all in repo root / `docs/`)**
- [ ] `README.md`: overview, features, supported upload types, prerequisites, env vars, local setup (Supabase local or hosted), run, test, seeded credentials, deployment notes, **what works / what's incomplete / what's next with 2–4 more hours**
- [ ] `ARCHITECTURE.md`: stack, data model diagram, RLS approach, editor/storage format, what was prioritized and why, deliberate cuts (real-time co-editing, comments, version history, etc.), known limitations (e.g., last-write-wins on concurrent edits)
- [ ] `AI_WORKFLOW.md`: tools used; where AI sped things up; what AI output was changed/rejected (keep concrete examples — keep a running log while building); how correctness/UX/reliability were verified
- [ ] Screenshots / GIF of main flows (login, dashboard, editor, upload, share, export)

---

## Sprint 7 — Submission package (≈1–2 hrs)

- [ ] Record 3–5 min walkthrough (Loom/YouTube unlisted). Cover: main flow, what works end to end, what was deprioritized, key decisions, how AI helped. Script suggested below.
- [ ] `walkthrough-url.txt` with the video link
- [ ] `SUBMISSION.md`: exact list of folder contents, live URL, test credentials (owner + collaborator accounts), local run pointer, partial-feature statement
- [ ] Google Drive folder with: source code (zip, no `node_modules`/`.env`), README, architecture note, AI note, SUBMISSION.md, video URL txt, screenshots/GIF
- [ ] Set Drive folder sharing to "anyone with link can view"; test link in incognito
- [ ] Final fresh-clone test: clone → follow README → app runs
- [ ] Final live test in incognito with the seeded accounts

### Walkthrough script (≈4 min)
1. (0:00) Problem + approach in 20s
2. Log in as Alice → dashboard three sections
3. Create doc, format text (bold/italic/underline/headings/lists), rename, refresh to show persistence
4. Upload .docx/.md → appears in Uploaded section → edit
5. Share with Bob as viewer → switch to Bob → read-only; upgrade to editor
6. Export to Markdown and PDF
7. Deprioritized + next steps; key decisions (RLS, Tiptap JSON, autosave)
8. AI usage: what helped, what I rejected, how I verified

---

## Deliberately cut (state in README/video)

- Real-time co-editing / presence cursors (last-write-wins instead)
- Comments / suggestion mode
- Version history
- Folders, search across content, rich media/images
- Email invitations for non-registered users

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| RLS recursion / policy bugs | Security-definer helper functions; test with two users early (Sprint 1) |
| `.docx` fidelity | Use mammoth; clearly state only basic formatting is preserved |
| PDF export quality | Fall back to print stylesheet if html2pdf output is poor |
| Supabase free project pauses | Wake before submission; note in SUBMISSION.md |
| Email confirmation blocks reviewers | Disable confirmation; provide seeded accounts |
| Scope creep from stretch | Stretch work only after Sprints 1–4 acceptance passes |

## Timeline summary

| Sprint | Focus | Est. |
|---|---|---|
| 0 | Setup + deploy skeleton | 1h |
| 1 | Auth, schema, RLS, seeds | 2–3h |
| 2 | Dashboard + editor | 4–5h |
| 3 | File upload | 2–3h |
| 4 | Sharing + roles | 3–4h |
| 5 | Export, validation, tests | 3–4h |
| 6 | Polish, deploy, docs | 3h |
| 7 | Video + submission | 1–2h |
| **Total** | | **~19–25h** |

If time-boxed tighter: finish 0–4 and 6–7 first, then 5 (export is the stretch; the validation and test items in Sprint 5 are core, so do those regardless).

## Final pre-submit checklist

- [ ] Every row in Section 1 ticked
- [ ] Live URL works in incognito; seeded logins work
- [ ] Sharing demonstrable with two accounts
- [ ] Supported upload types visible in UI + README
- [ ] At least one automated test passes
- [ ] README, architecture, AI note, SUBMISSION.md, video URL file all present
- [ ] No secrets committed; `.env.example` included
