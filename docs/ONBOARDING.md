# Onboarding — read this before touching anything

For a developer or agent arriving at this repo cold. It is deliberately a
**map, not a copy**: it says where each fact lives and which file wins, and
avoids restating anything that will drift. Duplicated status is this
codebase's most expensive recurring defect — see *How much to trust the docs*
below, which is the single most useful section here.

---

## 1. The core objective

A brand design workspace for freelance and small-studio brand designers,
built first for people with executive-function challenges (task initiation,
working memory, decision fatigue, time blindness, rejection sensitivity).

> **The creative tools are where the work is made. The brand lives here.**

It guides a project from client discovery to a delivered brand system and
brand book, keeping strategy, decisions, assets, approvals and client
communication connected. It explicitly does **not** replace Illustrator,
Photoshop, InDesign, Figma or After Effects, and it must never become an AI
that designs brands.

The differentiator is not any single feature — it is the connection between
them: a client answer shapes strategy, strategy shapes creative direction,
direction shapes logo/colour/type, those decisions are remembered, and the
brand book is generated from the accumulation.

**The product bar that overrides taste:** if a change adds friction — an extra
required decision, an ambiguous locked state, silent state loss, a shame-coded
error — it gets reworked or rejected even when it is otherwise good software.

| Source | Role |
|---|---|
| `CLAUDE.md` | The PRD v1.0 + Expansion Spec. **Requirements of record.** |
| `PRODUCT.md` | The wider product thinking the requirements sit inside. Where the two disagree, §26 lists it rather than resolving it silently. |
| `docs/PRD.md` | Five-stop path, Helper verbs, non-goals. |

---

## 2. Tech stack and its constraints

React 19 · Vite 8 · Zustand (persist) · plain CSS · Supabase optional ·
jsPDF / pdf-lib / pdfjs-dist · tesseract.js · Playwright + Vitest.
~290 source files, ~70k lines.

**The constraints that will bite you, each recorded against a real failure:**

- **Node is 26 in CI, 24 on the deploy targets, and that split is the fix, not
  a leftover.** Vercel rejects `engines.node` above 24 outright and fails the
  build before it starts. Do not "tidy" these into agreement.
- **Run `npm run build`, never `vite build`** — vite is not on `$PATH`.
- **`base` must never be `'./'`.** Relative asset URLs resolve against the
  current route, so a public deep link like `/c/<portalId>` fetches
  `/c/assets/index-*.js`, gets the SPA rewrite, and parses HTML as JavaScript.
  Blank page on every client link; works fine at the root. CI guards it.
- **Never `vercel deploy --prod` from the CLI.** It uploads the working
  directory and overrides the Git build. On 2026-08-01 that shipped a pre-merge
  bundle to production three times and made a fixed bug look unfixed.
  **Merging to `main` is the deploy.**
- **No `VITE_*` secrets, ever.** Vite inlines them into the shipped bundle.
  Server-side keys only (`XAI_API_KEY` in Vercel, behind `/api/xai`, which
  authenticates the caller's Supabase session).
- **CSS is not in `src/index.css`** — that file is a two-line `@import`. The
  system is `src/styles/shell.css` (always-on) plus `lazy-*.css` per view.
  Grepping `index.css` returns nothing and reads as "this style does not
  exist"; that misfire cost four wrong conclusions in one session.
- **The `lazy-*.css` files are all loaded eagerly.** Vite preloads them, so a
  rule in one view's sheet WILL apply to another view carrying that class.
- **Version bumps are manual and belong in the same commit** —
  `npm run bump` / `bump:minor` / `bump:major` by change type. The git hook
  that used to do this is disabled and must not be re-enabled: in this
  environment a hook that stages during a commit lands its changes in the
  *next* commit's tree.
- Deploy targets are declared once in `src/lib/deploy/deployTargets.js`, read
  by both the app and the proxy. Netlify is retired. Change a deploy there
  first.

---

## 3. Architectural rules

### Single source, always — this is the dominant defect here

`src/lib/journey/journey.js` owns the path: stops, order, ids, views, labels,
and how many. **Everything derives; nothing restates.** At one rename, nine
modules held private copies and exactly one was updated — completion gates
compared against a hard-coded count so a state became unreachable, and the
demo tour walked users through a path that no longer existed.
`journeySingleSource.test.js` greps source for restated labels. Per-step
*logic* keyed by id is expected; restating the *words* is not.

### Guardrails are tests, and each one has failed for real

`npm test` enforces typography (rem not px; three font weights; muted text
≥ 4.5:1 on the worst surface it lands on), containers (one radius token;
snapped spacing/type scales), and two **ratchets** — `!important` count and
distinct raw scale values. Ratchets are two-sided: over budget fails, and
*under* budget without lowering the budget also fails, because slack refills.
**Budgets only move down.**

A guardrail that cannot fail is worse than none — it records a rule as
enforced while checking nothing. Every one here has been verified to fail when
its bug is reintroduced.

### Two clocks, and they must never be one

`project.workLog` is the work clock — private, never billed, never sent to a
client. `project.timeLog` is billable hours — hand-entered only. They were one
array, which meant every idle tab quietly became something a client was asked
to pay for.

Related: in `clientInbox.js`, `at` is displayable and `sortAt` is for ordering
only. **Never render `sortAt`** — the desk did, and showed the same fabricated
age against several different approvals.

### UI rules

- **An icon leads, a word follows.** Icon-only is allowed for six closed
  patterns; destructive/outbound actions and any icon that is the only route
  to a thing always carry a word. `title` is never the carrier of meaning.
- **Modals always centre**, every breakpoint. Never bottom or top sheets.
- **Dark mode (`.app.deep`) is audited on every colour change** — mandatory,
  not best-effort. `AGENTS.md` carries the checklist.
- Path pages: fill the main grid cell, one job per page, one map, one primary
  action. `AGENTS.md` has the full rebuild checklist, learned the hard way on
  the Strategy brief.

### Advisors — three agents, non-optional

| Agent | When | Question |
|---|---|---|
| `adhd-executive-function-advisor` | before finalizing any UI/UX/workflow/gating decision | does this serve the user? |
| `devils-advocate` | after **every** significant decision, especially obvious ones | is this decision right? |
| `inventor` | before reporting anything blocked or impossible | is this actually a wall? |

Full rules in `DEVELOPMENT.md` → Design Principles. `devils-advocate` may
never invent a source; "no credible opposition found" is a valid verdict.

### Owner decisions are final

Advisors inform, they do not veto. Never reverse, quietly re-decide, or
"improve away" a choice the owner has made — even when an audit agent, a
design book or your own taste points the other way. State the tension once,
keep the decision. An explicit go-ahead scopes the work named; it does not
license reopening earlier decisions.

---

## 4. How much to trust the docs — read this one

**The prose is thoughtful and the status blocks lie.** Status assertions in
`PHASES.md` and `todo.md` have sent careful readers at the wrong work at least
five separate times, including one written *while explicitly fixing two
others*. Known live examples as of 2026-08-06:

- `PHASES.md` Phase 2 says "redeclare the ten stages, NOT DONE". That decision
  was superseded — `src/lib/journey/projectTypes.js` and `PRODUCT.md` §26.1
  both record the owner choosing modular project types on 2026-08-05, which
  subsumes the ten.
- `todo.md` says "Research phases 3–7 — not started". `docs/RESEARCH_PHASES.md`
  records 3, 4, 6 and 7 DONE and 5 partial.
- `PRODUCT.md` §26.4 describes PR #126's defects as live; the PR thread shows
  all three were fixed the same day.

**The ranking to trust, highest first:** the code → the tests → CI → prose
rationale in the docs → any DONE/NOT-DONE claim. When those conflict, the code
wins and the doc gets corrected in place, with the wrong version left visible
above its retraction rather than edited away. `PHASES.md` §6 is the worked
example of doing this properly.

**Where the real remaining-work map lives:** `docs/ADDITIONS.md` (~90 entries
marked BUILT / PART / OPEN) — currently on PR #126, not on `main`.

---

## 5. Verify before you believe

**`npm install` is step one of every new session, not a one-off setup step.**
A fresh container has no `node_modules`, so whatever you run first fails with
`sh: 1: vitest: not found` — which looks like a broken script rather than an
empty install directory, and costs a diagnosis before it costs 20 seconds.

```sh
npm install           # FIRST — every session, before anything else
npm test              # unit — 1220 passing / 125 files on main @ 2acc109
npm run lint:ratchet  # must land exactly at budget
npm run build:check   # build + perf budget
npm run test:e2e      # Playwright — see caveat
```

**Do not diagnose an e2e failure from a local run alone.** This container's
Chromium can differ from the pinned `@playwright/test`, which produces failures
that do not exist in CI. Confirm in CI first, or you will chase a browser
difference. As of 2026-08-06 CI's e2e job was *cancelled* at 15 minutes on
main's own HEAD, so there is currently no green e2e baseline to compare to.

And the standing rule behind all of it: **a phase ships only when the checks
are green and the thing was actually observed working.** Something that
"should" work is not done.
