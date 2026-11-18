# Submission

## Links

| What | Where |
|---|---|
| **Live product** | https://mock-doc.vercel.app |
| **Walkthrough video** | see `walkthrough-video-url.txt` — _TODO: add link_ |
| **Source code** | in this folder (`source/` zip) — _TODO: confirm repo access if sharing the GitHub link_ |

## Test accounts (no setup needed)

| Account | Password | Role in the seeded sharing scenario |
|---|---|---|
| `alice@example.com` | `Demo-pass-123` | Owner of *Q1 Product Roadmap*, *Meeting notes*, and an uploaded *welcome* doc |
| `bob@example.com` | `Demo-pass-123` | **Editor** on *Q1 Product Roadmap*, **viewer** on *Meeting notes*; owns *Bob's launch ideas* |
| `carol@example.com` | `Demo-pass-123` | **Viewer** on *Q1 Product Roadmap* |

New accounts can also be created at `/signup` (no email confirmation).

**Fastest way to see sharing work:** open two browsers (or a normal and a private window). Log in as Alice in one and Bob in the other. As Alice open *Q1 Product Roadmap* → **Share** → change Bob's role or remove him; refresh as Bob.

## What is included in this folder

| File / folder | Purpose |
|---|---|
| `source/` (or the repo) | Full source code (no `node_modules`, no secrets) |
| `README.md` | Setup and run instructions, env vars, tests, deployment, status (working / incomplete / next 2–4 hours) |
| `ARCHITECTURE.md` | Architecture note: what was prioritized and why, decisions, cuts, limitations |
| `AI_WORKFLOW.md` | AI workflow note: tools, speed-ups, what was changed/rejected, how it was verified |
| `SUBMISSION.md` | This file |
| `walkthrough-video-url.txt` | Link to the 3–5 minute walkthrough video |
| `docs/screenshots/` | Screenshots of the main flows (login, dashboard, upload, share, editor, export, shared-with-me, read-only viewer) |
| `.env.example` | Template of the environment variables needed to run locally (no real values) |
| `supabase/migrations/` | Database schema and Row Level Security policies |

## Requirement checklist

| Requirement | Where to see it |
|---|---|
| Create / rename / edit / save / reopen documents | Dashboard → **New document**; title field in the editor; refresh to confirm persistence |
| Bold, italic, underline, headings, bulleted and numbered lists | Editor toolbar (with keyboard shortcuts) |
| File upload | **Upload** button: `.txt`, `.md`, `.docx` (≤ 4 MB) → new editable document in *Uploaded documents* |
| Sharing with owner / granted access / visible distinction | **Share** dialog; *Shared with me* section with role badges and "Shared by …" |
| Persistence | Supabase Postgres; documents and shares survive refresh and sessions |
| Setup instructions, deployment, validation/error handling | `README.md`; live URL; zod validation and error states throughout |
| Automated tests | `npm test` (35) and `npm run test:e2e` (19) |
| Architecture note / AI note | `ARCHITECTURE.md`, `AI_WORKFLOW.md` |
| **Stretch: export to PDF or Markdown** | Editor → **Export**, or dashboard card menu |
| **Stretch: role-based sharing beyond basic access** | Editor / Viewer roles, changeable and revocable; enforced in the database (RLS) |

## Status summary

- **Working:** everything above, verified end to end on the live deployment.
- **Incomplete / limited:** concurrent edits are last-write-wins (no live co-editing); PDF export goes through the browser print dialog; upload drops images/tables; sharing needs the recipient to have an account.
- **Next, given 2–4 more hours:** real-time collaboration with presence, version history, email invitations, images/tables, live dashboard updates. Details in `README.md`.
