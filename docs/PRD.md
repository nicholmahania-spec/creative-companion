# Creative Companion — Product Requirements (living)

**Status:** Living · rewritten 2026-07-30 against the code at `v2.4.4` (`b0b1258`)
· §3–§5 and §11.1 reconciled 2026-08-14 against `main@3122fac`, which is
`4bfb2b1` plus PR #208 (see the basis note at the top of §3)
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

**Basis.** This section was reconciled against `main@3122fac` — `4bfb2b1` plus
**PR #208**, which landed the interaction architecture this file previously
contradicted. The PR flagged the contradiction and left it, because editing a
product definition is an owner call; that call was made, and #208 has since
merged, so everything described here is shipped rather than pending.

Two halves, both now on `main`:

- The seven stops, `projectTypes.js` deciding which of them a project walks,
  the `Workroom` stage, the stage ledge, and the stage exit.
- The Brief as the sole strategic intake — Call mode, the Brief-owned client
  link, Discovery as read-only notes, and the `detective` consolidation at
  persist v11. `updateDiscoveryField` is **retired**: `useAppStore.js:2226`
  carries only its tombstone comment, and `discoveryIntakeRetired.test.js`
  fails if anything calls it again.

### 3.1 The path — seven stops

Declared once in `src/lib/journey/journey.js` (`JOURNEY_STEPS`). Process language follows
classic brand-identity practice (Wheeler / *Logo Design Love*), ordered
**brief-first** for ADHD: know the project before gathering refs. Step **ids** are
frozen for history/progress; **labels** are user-facing and may change.

```
Brief → Research → Directions → Identity → Touchpoints → Brand book → Delivery
```

Each stop has exactly **one** job. The "one job" column is the stop's own
`plain` line, and what counts as done is its `enough` line — both live on the
step, so no screen has to decide for itself what it is for.

| # | Label | View id | Step id | The one job |
|---|-------|---------|---------|-----|
| 1 | **Brief** | `project` | `define` | Who is this for, and what should the brand do. Client record + brief. Form-only — no mood board here. |
| 2 | **Research** | `studio` | `research` | Gather refs and notes. ★ up to 6 for the export shortlist — a shortlist is not a direction. |
| 3 | **Directions** | `spark` | `ideate` | Name two or three routes. Rough list first, then the ones worth drawing. |
| 4 | **Identity** | `brand` | `design` | Mark, words, color, type — then preview. One screen at a time. |
| 5 | **Touchpoints** | `flow` | `sketch` | Where the brand shows up — schematic mocks and optional evidence, not finished artwork. |
| 6 | **Brand book** | `book` | `book` | Lay out the book from what the project already holds. |
| 7 | **Delivery** | `finish` | `deliver` | Preview the pack, write a handoff note, download. |

**Ids are data; labels are UI.** Four ids no longer read like their label —
`define`→Brief, `ideate`→Directions, `sketch`→Touchpoints, `deliver`→Delivery
(owner, 2026-08-09). Renaming an id orphans `pathDone`/`pathReached` on every
saved project, the `decisions.stage` values in `20260805140000`, and the SQL
allowlist in `20260728021200`. Fix the label; leave the key.

**Directions and Brand book are stops, not Tools** (owner, 2026-08-09). Neither
is a new view: both screens already existed and were reachable only from the
Tools overlay — the Brand Book Builder from exactly one call site in the app.
Their declaration in `JOURNEY_STEPS` is the whole of the promotion. **Review
stays a Tool**: it operates on the client relationship rather than producing a
stage artifact, so it has no place in the production sequence.

**Seven is the catalogue, not the itinerary.** Which stops a project walks is
`projectTypes.js`, never this table — a `logo` job walks four
(`define`, `research`, `design`, `deliver`), `expansion` walks three. Four types
still resolve to the full list because the finer stages do not exist yet, and
`startsFromExisting` on `refresh`/`rebrand` is set but consumed by nothing.

**Not every stop is client-pushable.** `PORTAL_PUSHABLE_STEP_IDS` is derived as
the complement of `APPROVAL_CAPABLE_STEP_IDS` (`lib/client/reviewArtifact.js`),
so the two cannot drift. A stop may be pushed only when the portal can *show*
its artifact — G10.5 forbids an approval attached to a bare stage name — and
`book` is additionally absent from the RPC allowlist in `20260728021200`, so
pushing it would tell the client their link is invalid.

**Derive, never restate.** `JOURNEY_STEPS`, `PATH_VIEWS`, `PATH_STEP_COUNT`,
`labelForView()`, `labelForStepId()` are the only legitimate sources for a stop's
label, id, view, order, or count — including in tests.
`journeySingleSource.test.js` greps source for restated labels. Per-step *logic*
keyed by id is fine; restating the *words* or the *count* is not. This is the
dominant defect in the codebase: at the v1.53.6 rename nine modules held their own
copy and exactly one was updated — three completion gates compared the rows they
were given against a hard-coded `7` while `JOURNEY_STEPS` held five, so "path
full" and "pack ready" were literally unreachable and a finished project read
5/7. The count is now seven again, which is exactly why it must never be typed:
the bug was never the number, it was the copy.

### 3.1.1 The stage — one primitive, every stop

`src/components/Workroom.jsx` + `src/styles/workroom.css`. Directions, Identity
and Touchpoints each grew their own copy of the same ~110 lines (portal into
body, `#root` inert + `aria-hidden` + hidden, hand-rolled focus trap,
Escape-to-close, recovery header) and had already produced three different
answers to the same question. The stage owns that behaviour so a stop does not:
the portal and shell isolation, the focus trap, Escape, returning focus to the
exact launcher, the path edge, and the ground/type/rhythm.

Three fixed rows — **edge · plane · ledge** — and the split between them is the
load-bearing part:

- **The ledge is the next-action slot, not navigation.** `masthead` and `ledge`
  are **slots, not behaviour**: the stage decides *where* a stop's next action
  sits and what it looks like; the view still decides what the action *is* and
  what pressing it does. Nothing about any stop's navigation moved into the
  ledge. Before it, six stops had six answers to "where does the next action
  go" — `path-continue-row` on three, `define-brief-footer` on Brief, nothing at
  all on Directions and Touchpoints, and Brief stacking a sticky chapter head on
  top of its footer so two layers competed for one edge. It is a grid row of the
  fixed stage rather than a sticky element, so it cannot be scrolled past and
  cannot stack with anything a view brings. A note the ledge should *say* rather
  than *do* ("2 still blank") sits quiet on the left.
- **The stage exit is the universal escape and the navigation mechanism.**
  Escape and the `← Back to …` control both call `close()`, which targets the
  stop *before* this one **on the project's own path** — read from
  `stepsForProject`, so a logo job with no Research stop exits Directions to
  Brief rather than to a stage it does not have. The first stop exits to the
  desk, the only thing upstream of it. Leaving restores focus to the exact
  element that opened the stage; the launcher stays mounted under the inert
  shell, so it is still there to hand focus back to.
  **It yields to anything open above it.** `hasOpenModalLayer()`
  (`lib/modalLayers.js`) short-circuits the whole key handler — Escape *and*
  Tab, not just Escape, because a nested dialog runs its own focus trap and two
  traps wrapping in opposite directions on one Tab is the same class of bug as
  two handlers acting on one Escape. The focus trap carries a matching, narrow
  exemption for `#cc-overlay-root` (`lib/overlayHost.js`): the transient layer
  sits deliberately *above* the stage, and an undo chip or Export dialog raised
  from inside a stop has to be usable from inside it. That node is empty unless
  something transient is mounted, so with nothing open the trap is exactly as
  tight as it was, and the shell stays `inert` either way.
- **The path edge is not optional.** The first three rebuilt rooms replaced the
  shell's nav with a single "Back to <previous stop>" link, which took
  navigation from dominant to *absent* — from Identity there was no route to
  Brief at all. Subordinate means small, quiet, at the edge; it does not mean
  gone. The stage carries every stop of the project's own path as one hairline
  row, no boxes, with `aria-current="step"` on the one you are on and a done
  mark from `pathStepHasContent`.
- **Stage signals** (`lib/stageSignals.js`) — the edge also carries what the
  shell would have told you, if the shell were visible: unread client activity
  and open to-dos. **Read-only by design**, because `#root` is inert while a
  stage is up. It says nothing at all when there is nothing to say — no
  provider, no unread and no open to-dos all render empty rather than `0`,
  since a zero here would be a scoreboard of nothing.

Keyboard `1`–`N` addresses **the path this project walks**, not the catalogue:
on a four-stage project key `5` does nothing, because a shortcut that reaches
somewhere the rail does not show is how you end up somewhere you cannot navigate
back from.

### 3.2 Tools — off-path, reached from the header `Tools` menu

Labels come from `toolsLabelForView()`. `spark` and `book` are **not** here any
more — they are path stops 3 and 6, and `labelForView` resolves them from
`JOURNEY_STEPS` before it ever reaches the Tools switch.

| Tool | View id | What it does |
|------|---------|--------------|
| **Review** | `review` | Capture surface for notes/gaps + revision rounds + sticky pack preview. |
| **Timer** | `insights` | Pomodoro focus timer with scaled forced breaks. Countdown only — never the work clock's count-up. |
| **Calendar** | `calendar` | Month grid of deadlines and project due dates, with urgency labels. |
| **Clients** | `clients` | Client directory. Polaroid cards by default (visual recall beats reading names), with list toggle, search, sort. |
| **Library** | `assets` | Asset library. Deliberately not a stop: every stop carries a completion tick and a library is never finished. Cross-project, so it sits in the sidebar's Studio band beside Home and Clients rather than in the Tools menu — but it is still off-path, which is what `TOOLS_MENU_VIEWS` answers. |
| **Settings** | `settings` | Theme, motion, sound, focus mask, toasts, helper prefs, invoice/studio identity, cloud + backup. |
| **Sketches (frozen)** | `concept` | Frozen concept package. |

**`Library`, not `Asset library`.** Stop 7 was labelled **Assets** until
2026-08-09 — one word from this Tool, with the view ids (`finish` vs `assets`)
running the opposite way to the labels, so the nav carried two entries a word
apart and no way to tell which held the file you wanted. The stop's label is
client-facing and settled, so the Tool moved. They now share no word at all.

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
| `/f/:shareId` | `PublicDiscoveryFill` | A client filling in **the Brief** once, in their own time. Single-use: `pending → submitted`. This is one of the Brief's two capture modes (§4.2), not a separate questionnaire — it renders `DETECTIVE_CHAPTERS` and its answers land in `detective{}`. |
| `/c/:portalId` | `PublicClientPortal` | A client's ongoing dashboard: sees the steps the studio pushed, approves or requests changes per step with notes, messages the studio, fills the project-overview form, answers a survey. |
| `/d/:portalId` | `PublicBrandReveal` | The delivery reveal. Gated on `delivery_status = 'delivered'`. |

All three are matched in `src/main.jsx` outside `App`, each wrapped by the
outermost error boundary: a render crash on a public route is a stranger
looking at a blank page with no idea whether their answers went anywhere.

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

### 4.2 Brief — the sole strategic intake (`DefineView` / `DetectiveSheet`)

**One schema, one store, two ways in.** The Brief is where the project's
strategic answers live and the only place they are captured. Its schema is
`DETECTIVE_CHAPTERS` (`detectiveBrief.js`) and its store is `detective{}` on the
project.

```
            BRIEF
          /       \
  Client mode   Call mode
      ↓             ↓
 /f/:shareId   DetectiveSheet
      \             /
        detective{}
```

Both are **capture modes of one brief**, not two briefs, and the difference is
who is holding the keyboard:

| Mode | Surface | When |
|---|---|---|
| **Client mode** | `/f/:shareId` → `PublicDiscoveryFill` | The client answers in their own time. Comes back through the explicit review step, never a silent overwrite. |
| **Call mode** (`9bb2c87`) | `DetectiveSheet` with `callMode`, on the Brief itself | The designer answers while the client talks. One question on screen at a time, in chapter order — the same order the client meets them in. |

Call mode is a **filter over the ordinary render**, deliberately: every field
type draws exactly as it does on the page — spectrum keeps its five-value
control, checklists and attachment rows are unchanged — writes through the same
`updateDetective`, and lands in `detective` with no second schema to keep in
step. State is an index only, so leaving the call and re-entering loses nothing.
Its ledge carries `Previous` / `Next question` and the question count; **path
Continue is deliberately absent there**, because mid-call the next thing is the
next question and a button that leaves the Brief while the client is still
talking is the one mistake this mode can make. Leaving is the masthead toggle.

**The Brief owns the client link** (`d6382cf`, `63e1c65`).
`BriefClientLink` — create, copy, check, revoke — sits in the Brief's masthead
beside the Call mode toggle, because the Brief owns the thing being shared.
Revoke arms before it fires: it kills a link a client may be part-way through
and the studio has no way to warn them, so the second click is the
confirmation. **Nothing about the share system changes** — same
`discoveryShare` functions, same ids, same persisted
`discoveryShareId`/`discoveryShareStatus`, same `/f/:shareId` route, same
`mergeDiscoveryAnswers` on submission. It is a new home for existing controls,
not a new mechanism, and moving it was forced: `revokeDiscoveryShare` had
exactly one call site — inside the modal being retired — so retiring that modal
without this would have left live client links with no way to kill them. The
new share seeds `answers: {}`, matching the other existing caller
(`NewProjectIntake`), so no designer-authored words are put in front of a client
as though they had answered them.

**Discovery is now read-only historical data** (`6ad1f0d`, `d80cd2f`).
`discoveryAnswers` was a second 30-question schema with its own store, fillable
in a studio modal and runnable as a call script — a competing source of
client/strategic truth that the Brief never read a word of. Both of its capture
modes now have canonical replacements (fill it myself → the Brief; run it as a
call script → Call mode), so the surface survives as **Discovery notes**:
visible, exportable, **not editable**, and `updateDiscoveryField` is retired.
It still exists because real projects hold real answers there and the
markdown/plain-text hand-off is written against that schema — deleting the
surface would take a client's own words off the screen and the hand-off with
them. Eighteen of the thirty fields were consolidated into `detective` at
persist v11 by **copying, never moving**: `discoveryAnswers` is returned
untouched and in full, precedence is `mergeDiscoveryAnswers`'s existing three
rules (refuse the wrong shape, ignore the empty, never overwrite what is set)
rather than a new answer to "who wins", and it is idempotent by construction —
it only ever fills a blank, so there is no `migrated` flag to fall out of step
with the data. The twelve fields that stayed are recorded in §11.

---

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

**Sharing the brief:** the Brief mints a `/f/:shareId` link; the
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

### 4.3.1 Directions — the bridge (`SparkView`)

Path stop 3, promoted from the Tools view formerly labelled *Ideate*
(owner, 2026-08-09); the step id stays `ideate` because saved projects key
`pathDone` off it.

**Research discovers, Directions interprets, Identity develops.** The screen's
whole job is grouping what the designer already responded to into two or three
visual routes and picking one. It **authors no creative content of its own** —
the test that removed a rough-idea dump nothing downstream could read, a prompt
card rotating one string shared across every client in the studio, and two
paragraphs auditing whether the designer had followed the method.

Three states, all carried by the layout: **open** (`activeDirectionId`, the
route being built — the evidence band acts on it), **chosen** (one at a time;
choosing also opens, opening never chooses), **cited** (`evidence[]`, refKeys
resolved when drawn, **never copied**). A·B·C are position, not identity: the
letter comes from where a route sits among the routes that exist, so deleting
one reflows the rest while every id, reference and decision-log entry stays put.
The card is a specimen, not a form — preview first, with composition, name,
why, remove and unchoose behind one Edit disclosure.

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

### 4.6 Brand book and Delivery — the leave-behind (`BrandBookBuilderView`, `DeliverView`)

Two stops, not one, since 2026-08-09. **Brand book** (stop 6, `book`) is where
the document is laid out from what the project already holds; **Delivery**
(stop 7, `deliver`) is where the pack is previewed, noted and downloaded. Page
setup is **edited in the Brand book and reported on Delivery** (`321f5ad`) —
one authoring home, one readout. The Brand Book Builder is wrapped onto the
canonical Workroom stage rather than rewritten (`3b25e82`).

Delivery has one primary **Download PDF**. Secondary and advanced:

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
  `1`–`N` over the project's own stops, never the seven-stop catalogue),
  **command palette**, **skeletons + path prefetch**, **pull to refresh**,
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
discoveryAnswers discoveryUpload            // read-only history, see §4.2
discoveryShareId discoveryShareStatus       // the /f/ link, owned by the Brief
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

### 11.1 Open, recorded, unresolved — the twelve Discovery fields

The intake consolidation (`d80cd2f`) moved eighteen of Discovery's
thirty questions into `detective` and left twelve. **These are open questions,
not decisions.** They are listed so the reasoning survives the conversation it
came from; nothing here is settled, and none of it should be resolved by
inference from this document. The authority is `DISCOVERY_DEFERRED` in
`src/lib/brief/discoveryConsolidation.js`.

| Field(s) | Why it stayed — the open question |
|---|---|
| **`usp` — differentiation** | Read this one twice. Discovery held **both** `offering` ("What you offer") and `usp` ("What makes you different?"), while canonical `usp` asks "What does your business do?" — which is `offering`'s question. So `offering` → `usp` is the mapping, and the same-named pair is the one pair that must **not** be joined: mapping by name would file a differentiator under "what you do" and read it back as though the client had said it. **Canonical has no home for differentiation at all.** Giving it one would also mean changing the live delivery whitelist, which is a Supabase migration — a separate decision, deliberately not taken here. |
| **`startDeadline`** | Packs a start date **and** a deadline into one free-text box. Canonical has one date and no start-date concept, so either half of it would be lost in the move. |
| **`launchDate`** | "Ideal launch" is not "date this needs to be done by", and it would collide with `startDeadline` for that one canonical slot. |
| **`fiveYearVision`, `admiredBrands`, `problem`, `coreValues`, `visualStyleKeywords`** | Preserved historical Discovery support fields. No canonical equivalent — and `admiredBrands` is **not** the same question as `competitors`. |
| **`spectrumModernTraditional`, `spectrumPlayfulProfessional`, `spectrumHighEndAffordable`, `spectrumBoldMinimalist`** | Free text. The canonical spectra accept five tokens and nothing else, so converting one means inventing a position on a scale the client never used. The four answers are **displayed exactly as they were typed and never coerced**. |

All twelve stay visible and exportable on the read-only Discovery notes surface
(§4.2), and the markdown hand-off still reads them.

**Deferred until asked — do not build:** the time-tracking stats view. The user has
said "I have no concept of time and numbers mean nothing," which rules out raw
numbers and clock time as the primary readout (no "1h 47m", no "3:15 PM", no
countdown). Visual/relative/comparative representations and session counts are
candidate directions, not decisions. Consult
`adhd-executive-function-advisor` on this specifically before designing it.

---

## 12. Success criteria

**Spine (must hold every release):**

- [ ] A new user completes the Brief → stars one Research pin → names one
      Direction → sets a tagline on Identity → completes one Touchpoints step →
      opens the Brand book → downloads the Delivery PDF, without ever opening
      the Tools menu.
- [ ] Touchpoints: the current step owns the first fold (Complete primary, Split
      secondary).
- [ ] Identity: the artboard is readable first — left on wide, first on mobile.
- [ ] Delivery: exactly one primary PDF download; a thin pack warns and links to
      the gap on Research/Identity.
- [ ] Every stop is a `Workroom`: one ledge holding its next action, one exit
      that Escape also fires, and the project's own path at the edge.
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
