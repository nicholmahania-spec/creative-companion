# Creative Companion — Product Requirements (living)

**Status:** Living · rewritten 2026-07-30 against the code at `v2.4.4` (`b0b1258`)
**Supersedes:** the previous PRD, which described the `v1.51/1.52` app and predated
the Brand Book Builder, invoicing, the client portal, the client directory, the
case study export, and the client-survey work.
**Not:** Commons (workplace/family rooms) — a separate product.

This document maps what the app *is* — every screen, tool, export, and backend
surface — plus what is deliberately absent and what is known-incomplete. It is
descriptive first and directive second: where a rule exists, it is stated with the
bug or decision that produced it, because in this codebase the reason is the part
that keeps getting lost.

---

## 1. One sentence

**Creative Companion is a customer and project management system for a solo brand
designer with ADHD** — the client is the first-class entity, projects hang off
clients, and every screen is built to cost the user as little executive function as
possible while carrying a brand project from first enquiry to a client-ready pack.

Not a chatbot. Not an AI logo generator. Local-first; optional Supabase for real
accounts, multi-device sync, and the no-login client surfaces.

---

## 2. Who it is for, and the constraint that outranks everything

One primary user: the owner, a freelance brand designer. Clients are secondary
users who never log in — they only ever touch the two public routes.

**The product exists to reduce executive-function friction.** Every design decision
is judged against task initiation, working memory, decision fatigue, time
blindness, rejection sensitivity/shame, object permanence, and interruption
recovery — in that spirit, and *before* aesthetics or convention. Within that,
**cognitive load and decision fatigue carry top weight**: when two options compete,
the one that makes the user think, decide, or remember less wins, even when it is
the dumber piece of software.

Standing consequences, all learned from real user feedback:

| Rule | Why |
|------|-----|
| Nothing important lives behind a collapsed `<details>` | "They are hidden and my first thought was 'I have no idea what this is.'" A closed panel with a bare label is a memory test, not a control. |
| Nothing important lives at the bottom of a page | "If it's at the bottom — I won't see it or use it." Below-the-fold and behind-a-toggle are the same failure. |
| No recurring prompt whose answer is always the same | "The notes popup is getting annoying… I will always dismiss." Predictable dismissal means the user pays a decision on every visit for something already decided. And the fix is never a "don't ask again" checkbox — that bills a second decision to stop the first. |
| Progress is shown as ambient evidence, not as a tool to re-open | "I want like a before-and-after thing going as I build the brand." Read-only glanceable signal ≠ surfacing the editor everywhere. |
| No raw numbers or clock time as the primary readout | "I have no concept of time and numbers mean nothing." Time must be represented some other way; that representation is still undecided (see §11). |
| Limits inform, never block | Reaching a revision limit changes what the app *says*, never what it lets you do. A hard gate in front of work you are ready to start is the exact friction this app removes. |

Aesthetics have their own agent (`editorial-layout-director`) and it is explicitly
ranked below the ADHD lens. If they disagree, the layout gets reworked.

---

## 3. Information architecture

### 3.1 The path — exactly five stops

Declared once in `src/lib/journey/journey.js` (`JOURNEY_STEPS`). Process language follows
classic brand-identity practice (Wheeler / *Logo Design Love*), ordered
**brief-first** for ADHD: know the project before gathering refs. Step **ids** are
frozen for history/progress; **labels** are user-facing and may change.

| # | Label | View id | Step id | Job |
|---|-------|---------|---------|-----|
| 1 | **Strategy** | `project` | `define` | Client record + brief. Positioning, goal, feel. Form-only — no mood board here. |
| 2 | **Research** | `studio` | `research` | One wall of mood pins; ★ up to 6 for the pack. |
| 3 | **Identity** | `brand` | `design` | Live artboard + editors: words, color, type, logo, pack pins. |
| 4 | **Touchpoints** | `flow` | `sketch` | Apply the system — current micro-step, drafts, real-world applications. |
| 5 | **Assets** | `finish` | `deliver` | Brand book, PDF, tokens, handoff, leave-behind. |

**Derive, never restate.** `JOURNEY_STEPS`, `PATH_VIEWS`, `PATH_STEP_COUNT`,
`labelForView()`, `labelForStepId()` are the only legitimate sources for a stop's
label, id, view, order, or count — including in tests.
`journeySingleSource.test.js` greps source for restated labels. Per-step *logic*
keyed by id is fine; restating the *words* or the *count* is not. This is the
dominant defect in the codebase: at the v1.53.6 rename nine modules held their own
copy and exactly one was updated — three completion gates compared five rows
against `7`, so "path full" and "pack ready" were literally unreachable and a
finished project read 5/7.

### 3.2 Tools — off-path, reached from the header `Tools` menu

| Tool | View id | What it does |
|------|---------|--------------|
| **Ideate** | `spark` | Divergent phase: volume and range over quality. Prompts, opposites, rough-idea capture, shortlist A/B/C only after many ideas. |
| **Review** | `review` | Capture surface for notes/gaps + revision rounds + sticky pack preview. |
| **Timer** | `insights` | Pomodoro focus timer with scaled forced breaks. Countdown only — never the work clock's count-up. |
| **Calendar** | `calendar` | Month grid of deadlines and project due dates, with urgency labels. |
| **Clients** | `clients` | Client directory. Polaroid cards by default (visual recall beats reading names), with list toggle, search, sort. |
| **Brand book** | `book` | Brand Book Builder — page-by-page book settings, named colour tokens, font pairing, page size/edge space, print-shop mode. |
| **Settings** | `settings` | Theme, motion, sound, focus mask, toasts, helper prefs, invoice/studio identity, cloud + backup. |
| **Sketches (frozen)** | `concept` | Frozen concept package. |

Panels that open over any screen (not views): Export, Hours & invoice, Discovery
brief, Share project overview, Running to-do, Work log, Before/After, Keyboard
shortcuts, Command palette, Case study export.

Project-destructive actions (Archive / Delete) live in that same `Tools` menu —
moved out of a hover-only `⋯` in the sidebar, which was invisible on touch.

### 3.3 Public, no-login routes

Both built with `publicUrl()` and matched with `routePath()` from
`src/lib/appPaths.js` — **never** `window.location.origin` or a raw
`location.pathname`, so links survive both root and subpath deploys.

| Route | Component | Who it is for |
|-------|-----------|---------------|
| `/f/:shareId` | `PublicDiscoveryFill` | A client filling in the discovery brief once. Single-use: `pending → submitted`. |
| `/c/:portalId` | `PublicClientPortal` | A client's ongoing dashboard: sees the steps the studio pushed, approves or requests changes per step with notes, messages the studio, fills the project-overview form, answers a survey. |

Client-facing questionnaire rendering is shared by both surfaces via
`ClientBriefFields.jsx` — one renderer, so the two routes cannot drift.
`clientBriefContract.test.js` caps client-facing field `tip` text at six words.

---

## 4. Feature map

### 4.1 Client and project management (the spine)

- **Clients are first-class.** `detective.clientName` is the project's identity —
  it wins in exports, export filenames, and the client portal. Do not invent a
  second competing project name. Repeat clients are the normal shape of the
  business; grouping and disambiguating work under a client is core
  (`clientDirectory.js`, `ClientsView`).
- **Chapter 01 of the brief is the client record**, not form-filling: email, phone,
  primary contact, decision-makers are CRM fields that happen to live in a brief.
- Projects: create, switch, archive, delete; per-project deadline, hourly rate,
  palette, brand fields, logs.
- **Client Inbox** (`clientInbox.js`) — one merged stream of everything clients did
  across every project. Unread is derived by **content diff against a
  last-seen snapshot**, not timestamps, because portal events are stored as bare
  `{status, note}` JSON with no per-event time — sorting by time would drag every
  old approval back above the line whenever one new message arrived. No counts and
  no timestamps leave the module: unread is a boolean, recency is sort order plus a
  new/seen split.

### 4.2 Strategy — the brief (`DefineView` / `DetectiveSheet`)

Five chapters, progress-tracked, with required-field awareness
(`detectiveBrief.js`):

1. **Your details** — business name, engagement type (new / rebrand / extend),
   deadline, primary contact, email, phone, budget range.
2. **Your business** — goal, story, USP, brand words.
3. **Your customers** — audience, how it should feel, audience pains, competitors.
4. **Look and feel** — messaging promise/proof/plan/CTA, tone of voice, brand as a
   person, four positioning spectrums (modern↔traditional,
   playful↔professional, high-end↔affordable, bold↔minimalist), inspiration links,
   what to avoid.
5. **What you need** — deliverables picked (from a catalog with common vs extra),
   technical needs, brand surfaces (where it will be used), existing style guide,
   existing assets, accessibility needs, decision-makers.

Also here: **Scope panel** — revisions included, billing mode (per round / hourly),
revision rate, approver, and explicitly *what is out of scope* (the half of a scope
that gets argued). Milestones live on the brief and feed the calendar.

The brief composes a readable text brief on every edit
(`composeBriefFromDetective`) so exports and the portal never read a half-built
object.

**Sharing the brief:** Discovery brief panel mints a `/f/:shareId` link; the
client's answers come back through an explicit **review step**
(`reviewClientAnswers` / `mergeDetectiveAnswers`) — never a silent overwrite.
Client-attached inspiration images auto-pin onto the Research wall on merge (noted
"From the client's brief"), so Research is not a blank page when the client already
sent references. Existing-asset uploads (old logo, etc.) stay in the brief — they
are the old identity, not new inspiration.

### 4.3 Research — one wall, and it stays one wall

Mood pins on a pannable/zoomable canvas (`moodPins.js`, `useCanvasViewport.js`):
image, link, colour, and note pins; per-pin note for the reasoning; ★ marks pack
pins (max 6). Link previews via a Supabase edge function; colour extraction from
images (`extractColors.js`); OCR for pasted overview images (`overviewOcr.js`,
tesseract.js).

**Decided and closed: no lanes, no direction folders, no second wall.** Real brand
practice explores 2–3 directions, so this is re-proposed every review and has been
rejected by the owner. Every splitting mechanism bills a decision *at capture
time* — "which direction is this?" — which is usually unanswerable until the wall
is full, and it destroys the one thing the wall must keep: peripheral vision across
everything at once. The lighter mechanism already exists: the ★ pack *is* a
committed direction and the per-pin note is where reasoning lives. A genuinely
wanted second direction belongs at project level (second project, or duplicated
pack), never as a new axis inside the wall.

### 4.4 Identity — the brand system (`DesignView`, 2.3k lines)

Live `BrandArtboard` preview (readable first: left on wide, first on mobile) beside
tabbed editors:

- **Words** — tagline, voice, do/don't, messaging promise/proof/personality.
- **Color** — palette with hex drafts, named roles (cover/text/accent/quiet) with a
  "why" per role, AA contrast checker with pair suggestions
  (`color.js`, `brandSystem.js`).
- **Type** — heading/body families from a font catalog with live loading
  (`fontCatalog.js`, `fontLoader.js`), type scale, "why this pair".
- **Logo** — image/wordmark, clearspace, min size, don'ts, lockup preview.
- **Pack** — which ★ pins ride along.
- Also: imagery guidelines, writing and print rules (case, caps, Pantone, stock,
  finish), design version (`v1`, `v2` …) with **version history and templates**,
  and an **Advanced** group for Stationery and (when configured) Figma token sync.
- **Stationery kit** (`stationery.js`) — real exportable letterhead, business card,
  envelope, and email signature at correct physical page sizes, filled with the
  project's actual brand and contact details.

### 4.5 Touchpoints — doing the work (`SketchView`)

- **Micro-steps** (`microsteps.js`) — project → ADHD-sized step templates at three
  depths (tiny 5 / standard 8 / deep). One current step owns the first fold;
  primary action is *Complete step*, secondary is *Split if too big*.
- **Decision log** (`decisionLog.js`) — external working memory: "we chose B
  because…". Feeds the case study's "how".
- **Touchpoint selection** (`touchpoints.js`) — maps the brief's "where will this be
  used?" onto the mocks the brand book knows how to draw, so a brand that only
  lives in an app does not get a carrier bag. Pure lookup; the drawing lives in
  `brandBookPdf`.
- Queue and done list collapsed by default; capture is secondary to the step.

### 4.6 Assets — the leave-behind (`DeliverView`, `BrandBookBuilderView`)

One primary **Download PDF**. Secondary and advanced:

| Output | Module |
|--------|--------|
| Brand book PDF (vector, paginated, print-shop mode, page size, edge space) | `brandBookPdf.js`, `bookBuilder.js`, `bookContent.js` |
| Brand pack HTML / Markdown / JSON | `exportFiles.js` |
| Brand kit ZIP | `exportFiles.js` (jszip) |
| Direction sheet PDF (raster + vector paths) | `exportFiles.js` |
| Form PDF / project overview PDF | `exportFiles.js`, `formPdfUtils.js` |
| Stationery PDFs/PNGs | `stationery.js` |
| Workspace backup JSON (round-trip tested) | `exportFiles.js`, `backupRoundtrip.test.js` |
| Print / Save as PDF (current page) | `printCurrentPage()` |
| **Case study** | `caseStudy.js` |

**Pack readiness** (`packReadiness`) warns on a thin pack and links straight to the
gap on Research/Identity rather than just naming it.

**Case study export** answers the portfolio five — purpose (`goal`), role
(`deliverablesPicked`), how (`decisionLog`), how long (`workLog`), outcome
(`learnings` / `handoffNote`). This is the argument for the whole app: those
answers already exist here, months before anyone would try to write the case study
from memory.

**Handoff:** handoff note, learnings, deliver word-checks, print-shop toggle.

### 4.7 Time, money, and the wall between them

Two records, **never wired together**:

- `project.workLog` — written by the work clock. Where the time went, kept for the
  user, for themselves. Never billed, never sent.
- `project.timeLog` — billable hours. **Hand-entered only.** Nothing writes here
  automatically; no measured row is ever added.

They used to be one array. "I like the invoice idea but it shouldn't be linked to
the working clock. the working clock is just for me." An invoice is a claim you
make to another person; a clock is a note you keep to yourself. Auto-filling the
first from the second turns every idle open tab into something a client is asked to
pay for, and turns writing a bill into reviewing your own.

The clock's stage list is derived from `JOURNEY_STEPS` (`STAGE_VIEWS` in App.jsx) —
it was once a hand-typed list of stage *names* where only 2 of 8 strings matched a
real view id, so an afternoon in Identity recorded nothing.

**Invoicing** (`invoice.js`, `HoursInvoice.jsx`): `lineAmount` / `invoiceTotals` /
`dueDateFrom` are the single answer to "what is owed", shared by the panel and the
PDF so they cannot disagree. Lines are hourly *or* flat (a flat line prints
`—`/`Fixed`, never a misleading "1 × total"). Invoice number + issued + due date,
FROM / BILL TO, optional tax row, HOW TO PAY and NOTES. Studio identity lives in
`prefs` (same on every invoice); `hourlyRate` stays on the project (negotiated per
client). `takeInvoiceNumber()` claims a number at export, not on panel open, so the
sequence has no gaps.

**Project terms** (`projectTerms.js`) — the facts, for pasting into your own
contract. Deliberately *not* a contract generator: the app holds four of a
contract's nine sections; the other five have the same answer on every project the
studio will ever run, so generating them means either five per-project prompts with
legal weight (a guaranteed stall on the screen everything depends on) or
placeholder legal text that needs a lawyer.

### 4.8 Revisions and approval

`revisions.js` + `RevisionRounds.jsx`: a revision is a countable thing against a
number agreed up front, not "as needed". Reaching the limit changes copy, never
capability.

**Approval attaches to deliverables, not to stages.** Research is private working
space; Define is client-facing. But gates attach to things you *show* — three logo
concepts, a design, a final pack — which land in Identity/Review/Assets.
`PublicClientPortal` already carries per-step approve / request-changes with notes;
the open question for those pages is whether they feed it, not whether approval
belongs there.

### 4.9 Client survey

`clientSurvey.js` — fixed question sets keyed to the *moment* (mid-project /
post-project / retainer quarterly), never a blank survey builder. Five to ten
questions, five minutes, enforced by test. No catch-alls: "how satisfied are you
overall?" points at no fix; "did the review process feel clear?" does.

### 4.10 Helper, coaching, and support chrome

- **Helper** (`buddy.js`, `helperPersona.js`, `helperAi.js`) — scripted design/UX
  coach with three default verbs: **Coach · Critique · Break**. Live mode via
  xAI/SpaceXAI (`grok-4.5`) through a server proxy (`netlify/functions/xai-proxy`,
  `api/xai`, `server/xaiProxyCore.mjs`); falls back to scripted replies on no key,
  offline, or API error. `HelperCharacterLottie` + `PathMarkMotion` for motion.
- **Process guide** (`processGuide.js`) — per-step coaching overlay (plain
  language, prompt, checks) layered on the journey, plus `REVIEW_QUESTIONS`.
- **Forced breaks** (`forcedBreak.js`) — 25-min Pomodoro, break length scales
  5–10 min with continuous work, consent-gated. Separate interval from the work
  clock (they were one, so the clock died at 25 minutes).
- **Running to-do** (`RunningTodo.jsx`, `runningTodoStages.js`) — a side panel for
  browsing the list; reachable on demand from permanent chrome, never an
  arrival-time modal.
- **Glossary** (`glossary.js`) — highlight-to-explain for design jargon. A curated
  fixed list on purpose: an unmatched selection does *nothing at all*, so the
  feature is either a small win or invisible, never a dead end.
- **Before/After** (`beforeAfter.js`) — read-only glanceable brand-progress signal
  derived from existing fields. Adds zero data entry.
- **Session resume** (`sessionResume.js`), **step dependency reminders**
  (`stepDependencies.js`), **journey gap strip**, **keyboard shortcuts** (path keys
  1–5), **command palette**, **skeletons + path prefetch**, **pull to refresh**,
  **error boundary**, **PWA/offline service worker**.
- **Optional game chrome** (`GameHUD`, `buddyGame.js`) — XP/progress bar
  **off by default** (`showProgress: false`).

---

## 5. Data model (client)

Zustand + `persist` (`src/store/useAppStore.js`, ~2.8k lines). Workspace shape:

```
projects[]           currentProjectId   tasks[]        moodItems[]
conceptItems[]       breakKit[]         templates[]    prefs{}
theme/themeSource    onboarded          portalSeen{}   spark state
```

Per project, the fields that matter:

```
name  active  brief  detective{}          // the brief + client record
palette[]  directions{}  logoDirection    // identity
tagline voice type* logo* messaging* imagery* writing* print*
bookBuilder  paletteTokens[] colorRoles   // brand book
tasks[]  runningTodo  decisionLog[]  roughIdeas[]
scopeRevisions* revisionRounds[] feedbackLog[]
workLog[]   // private clock       timeLog[] hourlyRate  // billable, manual
deadline  defineOpenChapter  lastView
discoveryAnswers discoveryUpload discoveryShareId discoveryShareStatus
clientPortalId
handoffNote learnings deliverWordsChecked conceptPackage{}
```

**Read through helpers, not raw fields.** `bookBuilderFor()` /
`readPaletteTokens()` fill defaults at read time, which is why projects saved
before those fields existed need no migration.

**Schema changes ripple.** A field id, or a field's *shape* (string vs array), is
referenced by `detectiveBrief.js`, the store, the client-facing renderer, the
review/merge path, exports, and tests. The `schema-change-ripple` skill and
`data-integrity-auditor` exist because a shape change that misses the merge path
silently corrupts a client's data — the live example: `ReviewAnswers` has no branch
for array-shaped `${fieldId}Files` attachment fields, renders them into a plain
textarea as `[object Object]`, and saving can overwrite the client's uploads with
no way back. **Still unfixed** (§10).

---

## 6. Backend (optional Supabase)

Without env vars the app runs entirely local: a browser password gate and
`localStorage`. With Supabase configured it gains real accounts, sync, and the
public client surfaces.

| Object | Purpose |
|--------|---------|
| `user_workspaces` | Whole-workspace sync blob, owner-only RLS |
| `forms` | Saved forms, owner-only RLS (all four verbs) |
| `discovery_shares` | `/f/:shareId` links, owner-only RLS |
| `client_portals` | `/c/:portalId` state incl. which steps are pushed, owner-only RLS |
| `client_portal_messages` | Studio ↔ client thread, owner-only RLS |
| Storage `client-uploads` | Public-read; anon INSERT gated by `is_client_upload_target()` |
| Storage workspace images | MIME-restricted |
| Edge function `link-preview` | Research link previews |

Anon never touches a table directly — every public read/write goes through a
`SECURITY DEFINER` RPC: `get_discovery_share`, `submit_discovery_share`,
`get_client_portal`, `get_client_portal_messages`, `post_client_portal_message`,
`respond_client_portal_step`, `submit_client_portal_form`,
`submit_client_portal_survey`.

**Portal submit must stay atomic** — `UPDATE … WHERE status = 'pending'` plus a
`row_count` check, never SELECT-then-UPDATE (that race was fixed twice; see the
`fix_submit_portal_form_race` migrations). Client uploads succeed only into a folder
named after a share/portal id that actually exists — no service key, no edge
function in the write path.

Run `supabase-rls-guardrails` before any migration, policy, bucket, or
`SECURITY DEFINER` change, and `backend-security-auditor` after.

---

## 7. Stack and platform

React 19 · Vite 8 · Zustand 5 (persist) · plain CSS · Node ≥ 24.
jspdf + pdf-lib + pdfjs-dist (PDF in and out) · jszip · tesseract.js (OCR) ·
lottie-web · lucide-react + radix icons · zod · Sentry · Vercel Speed Insights.
Vitest (87 unit test files) + Playwright (11 e2e specs, incl. axe/a11y, offline,
brand-book PDF, and a full process walk).

**Deploy:** Vercel is primary and serves from the root, so `base: '/'`. GitHub
Pages is secondary (`GITHUB_PAGES=true`, `/creative-companion/`). Vercel config
also present.

**`base` must never be `'./'`.** Relative asset URLs resolve against the *current
route*, so on `/c/<portalId>` the browser requests `/c/assets/index-*.js`, misses,
gets the SPA rewrite to `index.html`, and parses HTML as JavaScript — a blank page
on every client link, working at the root and broken everywhere else. CI guards it.
SPA fallback: `netlify.toml` + `public/_redirects`; `dist/404.html` for Pages.

---

## 8. Design system constraints (enforced by tests)

These are not preferences; each encodes a bug that shipped and was invisible in
review. `npm test` fails if one is broken.

**Typography** (`typography.test.js`) — sizes in `rem` never `px`; exactly three
numeric weights (500/600/700) unless the family request in `index.html` is extended
first; `--font-sans` must lead with a family that is actually loaded; muted text
clears 4.5:1 against the worst surface it lands on (`#F5F5F5` light, `#2F2F2F`
dark) with **solid hex in dark** — `rgba()` composites below the floor; never
re-hardcode a theme token further down the file; prose capped at 65ch.

**Containers** (`containers.test.js`) — one radius, `var(--radius)` = 4px, plus
`--radius-none`, `--radius-pill`, and `50%` for circles; the
`--radius-sm`/`-organic`/`-squircle`/`-node` aliases must never become distinct
sizes again. Spacing snaps to `--space-1..7`, type to `--fs-1..6`. Prefer
whitespace and type weight for hierarchy over a border — 135 rules once set a
radius on something with no border and no background.

**Modals always centre.** Dialogs and popups never slide from the bottom or drop
from the top, on any breakpoint: "I do not like popups that come from the bottom or
top. I need things front and center." Shared chrome is
`.export-overlay` / `.export-panel`. Persistent list drawers (the running to-do
panel) are a different pattern and out of scope for this rule.

**Known and not fixed:** five stacked CSS override layers (~4.5k lines,
~650 `!important`s) around lines 9961 / 10037 / 12015 / 12858 / 13388 / 14494. Do
not add a sixth — fix the base rule.

---

## 9. Workflow rules

- **Never assume; confirm before touching code.** Even an obvious fix implied by an
  earlier message gets confirmed first. An explicit instruction ("build all three",
  "next phase", "apply it") is a real go-ahead — but only for the work it names.
  When that piece is done, come back and ask. The failure mode this stops is
  momentum, where one-word approvals get treated as covering everything after them
  and decisions that were the owner's to make get quietly made instead.
- **Never build staged or fake features.** No placeholder data, no mock responses
  presented as working, no UI in front of nothing, no "done" without running it. If
  a feature needs a backend, key, or migration that does not exist, it is
  **BLOCKED** — say so and stop. Half a real feature beats a whole fake one. The
  canonical bug: the brand book rendered Promise/Proof tiles for months reading a
  field nothing ever wrote.
- **Version bumps are manual**, in the same shell sequence as the commit:
  `bump:major` for breaking, `bump:minor` for `feat:`, `bump` otherwise, then
  `git add package.json package-lock.json` in the *same* commit. The git hook is
  disabled and must not be re-enabled — in this environment any hook that stages
  during a commit lands its changes in the *next* commit's tree.
- **Agents, in rank order:** `adhd-executive-function-advisor` (wins every tie) →
  `five-w-one-h-auditor` (completeness: the orphaned feature, the control with no
  purpose, the undocumented decision) → domain auditors (`backend-security-auditor`,
  `data-integrity-auditor`, `deploy-config-auditor`, `performance-auditor`,
  `pwa-reliability-auditor`, `ux-professional`, `ui-professional`) → copy agents
  (`copy-editor`, `humanize-copy-auditor`) → `editorial-layout-director`.
- **Every ADHD finding states four things:** the problem, which ADHD mechanism it
  hits, the solution, and why that solution helps. Two out of four is incomplete.

---

## 10. Known gaps (real, unfixed, as of this rewrite)

Recorded so they are not rediscovered as new bugs.

1. **Portal answer review corrupts attachments.** `ReviewAnswers` has no branch for
   array-shaped `${fieldId}Files` fields; they render into a textarea as
   `[object Object]` and saving can silently overwrite the client's uploaded images
   with no way back.
2. **`/c/:portalId` merge does not auto-pin client images** onto the Research wall
   the way `/f/:shareId`'s merge does — same component, same data shape, different
   behavior, no documented reason.
3. **Client Inbox's "Open their answers" does not open the answers** — it opens the
   general Portal management screen, and the user still has to find a second buried
   button to reach what the first one promised.
4. **Focus Mode entry points** still linger on Ideate / Sketch / Design / Review /
   Deliver; only Research's was removed.
5. **Ideate framing unverified** — ideation is the broad divergent phase (volume and
   range); sketching is the rapid visual tool *within* it. Whether `SparkView`
   actually pushes toward many rough concepts rather than one good one has not been
   tested.
6. **Brief PDF in the brand book** — wanted as a handover record, not a form.
7. **Pomodoro → Helper link** — parked.
8. **~12 cosmetic Research findings** (`#e7e5e4` fallback, note-input box vs
   underline, dead hero ring).
9. **Remote deletion of stale branches** returned HTTP 403 from this session's
   credentials; needs doing from a surface with repo admin rights.
10. **Research phases 3–7** of the 7-phase plan in `docs/RESEARCH_PHASES.md` are
    not started (phases 1–2 shipped).

---

## 11. Non-goals and explicitly deferred

**Non-goals:** native mobile app · a fake AI logo generator · reintroducing Focus
Mode as a product or a mood board on Define · lanes/direction folders on the
Research wall · a contract document generator · billing/payments processing
(`PRICING_RECOMMENDATION.md` is research only) · Commons room types.

**Deferred until asked — do not build:** the time-tracking stats view. The user has
said "I have no concept of time and numbers mean nothing," which rules out raw
numbers and clock time as the primary readout (no "1h 47m", no "3:15 PM", no
countdown). Visual/relative/comparative representations and session counts are
candidate directions, not decisions. Consult
`adhd-executive-function-advisor` on this specifically before designing it.

---

## 12. Success criteria

**Spine (must hold every release):**

- [ ] A new user completes the Strategy brief → stars one Research pin → sets a
      tagline on Identity → completes one Touchpoints step → downloads the Assets
      PDF, without ever opening the Tools menu.
- [ ] Touchpoints: the current step owns the first fold (Complete primary, Split
      secondary).
- [ ] Identity: the artboard is readable first — left on wide, first on mobile.
- [ ] Assets: exactly one primary PDF download; a thin pack warns and links to the
      gap on Research/Identity.
- [ ] Path progress never counts an empty brief as done (`requiredReady`).
- [ ] Helper defaults to Coach · Critique · Break; everything else under More.
- [ ] A client on a phone can fill `/f/:shareId` and use `/c/:portalId` with no
      login, and a failed upload retries in place rather than vanishing into a
      toast.
- [ ] Path labels, ids, and count appear in exactly one place
      (`journeySingleSource.test.js` green).
- [ ] `npm run build` green; unit + e2e suites green; no `base: './'`.

---

## 13. Related docs

| Doc | Role |
|-----|------|
| `CLAUDE.md` | The durable owner rules — read first, every session |
| `AGENTS.md` | Per-session agent rules |
| `todo.md` | Session log + prioritized residual work |
| `docs/RESEARCH_PHASES.md` | The 7-phase research plan (1–2 done) |
| `DESIGN_GRAMMAR.md` (repo root) | Visual/UX grammar |
| `docs/REDESIGN_BRIEF.md` | Original IA wireframes |
| `docs/SUPABASE.md` | Backend setup |
| `docs/DEPLOY_AI.md` | Helper proxy env |
| `docs/DEVICE_CHECKLIST.md` | Device/perf checklist |
| `PRICING_RECOMMENDATION.md` | Pricing research (not a build plan) |
| `docs/MICRO_AUDIT_*` / `REDLINE_*` | Per-version audit history |

### Appendix — chrome extraction (reverted, do not retry blind)

The `AppHeader` / `AppMain` / `AppSidebar` extraction (`236582f`) white-screened
production (props bag / shadowing / undeclared identifiers). Chrome is back inlined
in `App.jsx` (~5.2k lines) while keeping the CSS split. Do not re-extract without a
browser smoke test of the signed-in shell.
