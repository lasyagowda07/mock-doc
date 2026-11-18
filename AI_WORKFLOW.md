<!-- REVIEW BEFORE SUBMITTING: this note is drafted from the actual build session. Edit it so it reflects your own involvement, and add any other AI tools you used. -->
# AI-native workflow note

## Tools used

- **Claude Code (Claude Sonnet 5.5)** as the main pair-programming agent, working in the terminal on the real repository: reading and writing files, running the dev server, tests, the Supabase and Vercel CLIs, and a headless browser.
- No other AI tools were used for the code. *(Add any others here.)*

## How the work was split

| Me (product + engineering judgment) | AI (execution) |
|---|---|
| Chose the stack (Next.js + shadcn + Supabase), the stretch goals (export, role-based sharing), and the rule that everything must be reproducible from environment variables | Turned the brief into a sprint plan with a requirements-traceability table, then built sprint by sprint |
| Created the Supabase/GitHub/Vercel accounts, supplied credentials, and approved database migrations | Wrote the SQL, ran migrations, set Vercel env vars, deployed |
| Reviewed each sprint's result and decided to continue | Wrote and ran tests after each sprint, and fixed what they found |

## Where AI materially sped me up

- **Scaffolding and wiring:** Next 16 + shadcn + Supabase SSR auth + route protection in minutes instead of hours.
- **Schema and RLS:** drafted tables, policies and `SECURITY DEFINER` helpers, then proved them with a database test using real users.
- **Editor and converters:** Tiptap toolbar, autosave state machine, `.txt/.md/.docx` import, Markdown serializer.
- **Tests:** 59 automated tests (40 unit/database + 19 Playwright), including two-user sharing scenarios that would have been tedious to hand-write.
- **Ops chores:** finding the right Supabase pooler region (the direct DB host is IPv6-only), Vercel env vars across environments, GitHub integration.

## What AI got wrong, and what I changed or rejected

Every item below was a real defect or a rejected suggestion in this build:

| # | AI output | What happened |
|---|---|---|
| 1 | **RLS SELECT policy** relied only on a helper function | Creating a document failed (`INSERT … RETURNING` can't see the new row through the helper). The RLS test caught it; fixed with a direct `owner_id` check (migration 2). |
| 2 | **Email validation** `z.email().trim()` | Zod 4 validates *before* trimming, so an email pasted with a trailing space was rejected on login/signup/share. A unit test caught it; fixed with trim → validate. |
| 3 | **shadcn init** generated `--font-sans: var(--font-sans)` (self-reference) | The whole app silently rendered in Times. Found only by *looking* at screenshots; the tests couldn't see it. Fixed. |
| 4 | **Initial plan** listed `html2pdf.js` and `turndown` | Rejected during Sprint 5: html2pdf rasterizes pages; turndown made output non-deterministic. Replaced with print CSS and an own serializer; removed both dependencies. |
| 5 | **Scaffold default `cacheComponents`** | Threw prerender errors on every per-user page. My first fix (moving `Date.now()` into a client component) was a symptom-level change; the real cause was the flag, which I turned off. |
| 6 | **Signup form** reset all fields after a validation error | React 19 resets uncontrolled forms after an action. An E2E test exposed it; the server now echoes back non-secret values. |
| 7 | **a11y fix attempt:** `aria-hidden` on the avatar initials | Axe still flagged the mismatch; replaced with a visible-text-compatible accessible name. |
| 8 | **Phone layout** of the editor header | Overflowed horizontally (title input vanished, Share cut off). Found in a phone-width screenshot; fixed with a wrapping header and icon-only buttons. |
| 9 | **My own E2E test** clicked Delete without waiting | Leaked "Untitled document" rows into the database. Fixed with unique titles and an assertion; cleaned the rows. |
| 10 | **Axe scans mid-animation** reported false contrast failures | Added a wait for animations to settle before scanning (stricter and non-flaky, not a relaxed rule). |
| 11 | **Visual redesign** (new theme, Framer Motion, thumbnails): the demo-login buttons used an `aria-label` that didn't contain their visible text | Axe flagged it; switched to a visible-text accessible name. The new "Log in as…" buttons also broke every E2E login (substring match), so tests now match exactly. |
| 12 | **Animated save indicator** cross-faded, leaving the old "Saved" label on screen for ~160 ms | A sharing test passed a save-wait too early and read stale data. I exposed the true state as `data-save-status` and wait on that instead of on the label. |
| 13 | **Failed test runs leaked data** into the demo accounts (again) | Added a Playwright global teardown that cleans test documents in the demo accounts after every run, scoped so real users' documents are never touched. |
| 14 | **`background-attachment: fixed`** for the pastel wash | Looked wrong in full-page screenshots and is unreliable on iOS; replaced with a fixed pseudo-element layer. |

## How I verified correctness, UX quality and reliability

- **Correctness:** unit tests for validation/permissions/converters; a **database test with real users** against the actual Supabase project for the permission matrix (read / edit / share / delete / revoke); a round-trip test import ↔ export.
- **End to end:** 19 Playwright tests for the real user journeys, including two simultaneous users (Alice and Bob in separate sessions), download verification, and a simulated network outage during autosave. The suite also runs **against the production URL** after each deploy.
- **UX quality:** I didn't trust tests alone. Screenshots of desktop, tablet and phone layouts and of the print view were reviewed visually, which is what found the font and mobile-header bugs. Axe (WCAG 2.1 A/AA) scans every screen state and dialog; the suite fails on any console error or warning.
- **Reliability:** autosave is serialized, keeps pending changes on failure, and exposes Retry; revoked access surfaces a clear message instead of silently losing edits.
- **Security hygiene:** secrets live only in env vars (git-ignored `.env.local`, Vercel env); the service-role key is never imported by app code; uploaded content passes through the editor's schema so scripts and raw HTML can't be stored.

## Takeaway

AI was fastest at breadth (scaffolding, tests, converters) and weakest at things that need *looking at* the product (visual bugs) or *exercising real infrastructure* (RLS edge cases, IPv6 database host). The practice that worked: have the AI write the tests first-class, run them against the real backend after every sprint, and review the result visually instead of accepting "tests pass" as done.
