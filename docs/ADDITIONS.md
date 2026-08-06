# Additions — everything proposed, compiled

Every feature, rule and architectural change raised across the product
conversation of 2026-08-05, in one list. Nothing here is invented: each entry
traces to something stated. Where a proposal has been built, the entry says
where the code is; where it has not, the entry says what it would take.

**Status key**

| Mark | Meaning |
|---|---|
| **BUILT** | Shipped on this branch or already in the app, with tests |
| **PART** | Some of it exists; the entry says which part |
| **OPEN** | Proposed, not built |

Organised by the eight systems named in the conversation, because that
taxonomy is the clearest thing to build against.

---

## 01 · Brand Intelligence

Strategy, decisions, rationale, memory, consistency.

| # | Addition | Status | Notes |
|---|---|---|---|
| 1.1 | **Brand Brain** — persistent project memory, askable in plain language ("why did we choose this typeface", "what did the client rule out") | **BUILT** | `src/lib/brain/brandBrain.js`. Collects facts from the brief, decision log, colour-role reasons, type rationale, starred pins, feedback log, revision rounds. Keyword recall over real facts — not a model. Repeats only what someone wrote down. |
| 1.2 | **Rejected concepts are kept, with the reason** | **PART** | The brain keeps directions *not* chosen and their notes, so "what did we rule out" answers. No separate Concept Archive screen with its own moodboards/versions. |
| 1.3 | **"What Am I Missing?" check** — element-level, grouped | **BUILT** | `src/lib/brain/completeness.js`. Eight groups; every row carries somewhere to go. Scoped by the brief's `deliverablesPicked`, so a logo-only job is never told it lacks typography. |
| 1.4 | **Brand completeness / readiness score** | **BUILT (as a count)** | Deliberately *not* a percentage or grade — `completenessHeadline` states "3 things not documented yet · 14/17". A scalar hides which dimension is carrying the brief. |
| 1.5 | **Decision log with WHAT / WHY / BASED ON** | **PART** | `src/lib/decisionLog.js` records what and why; "based on" is implicit rather than a field. |
| 1.6 | **Design rationale generator** — turn a designer's notes into brand-book prose | **OPEN** | Needs a writing step. Note the standing rule: the app may organise the designer's words, not invent claims about the brand. |
| 1.7 | **Client feedback translator** — "it feels too serious" → the design variables that might be in play | **OPEN** | Must surface candidate variables for the designer to judge; must never assert what the client meant. |
| 1.8 | **Brand consistency linting** — check an uploaded asset against the approved palette, type and logo rules | **OPEN** | Needs pixel/vector inspection of uploads. Colour sampling exists (`lib/extractColors.js`) as a starting point. |
| 1.9 | **Visual differentiation check** against the competitor set | **OPEN** | Depends on 4.4 (competitive landscape) existing first. |
| 1.10 | **Brand system dependencies** — "changing the primary colour affects 7 approved assets" | **OPEN** | Requires an asset graph; today assets have no edges. |
| 1.11 | **Brand change log** — what changed, why, who approved, what it affected | **OPEN** | Distinct from the decision log: this is post-approval drift over years. |
| 1.12 | **Brand Overview** — one page that is the source of truth at a glance | **PART** | The desk shows artboard, brief, palette and status. Not the full "personality / logo / colours / type / accessibility / last updated" card. |

---

## 02 · Workflow Engine

Modular project types, steps, progress, focus.

| # | Addition | Status | Notes |
|---|---|---|---|
| 2.1 | **Modular workflow — the app adapts to what is being built** | **PART** | Scope already flows from the brief's `deliverablesPicked` (`progressItemInScope`, `isLogoOnlyScope`), and the new completeness check honours it. What does not exist is the explicit *project type* chooser. |
| 2.2 | **Project types**: Logo · Logo Package · Brand Identity · Brand Refresh · Rebrand · Brand Expansion · Custom | **OPEN** | Recommendation on record: make a type a *preset over the existing deliverables model*, not a second source of truth. Two scope systems would disagree within a release. |
| 2.3 | **Expand Project** — grow a logo job into a package, then an identity, without starting over | **OPEN** | Falls out of 2.2 as adding deliverables. |
| 2.4 | **Project scope shown as included / not included** | **PART** | The intake states scope ("Scope: logo only"); the not-included half is not displayed anywhere. |
| 2.5 | **Scope creep detector** — a client request outside the agreed deliverables is flagged with Add / New project / Ignore | **OPEN** | Matchable against `DELIVERABLE_OPTIONS` labels; small once 2.4 exists. |
| 2.6 | **Focus mode** — one stage, one next action, nothing else on screen | **PART** | Per-stop "next" and a focus timer exist; the stripped-back single-task screen does not. |
| 2.7 | **"I'm stuck" / Unstuck button** — pick what kind of stuck, get process guidance and a smaller next step | **OPEN** | Explicitly guidance, never an answer. |
| 2.8 | **Project recipes** — the designer's own standard process, applied to new projects | **OPEN** | Templates exist for style (`TEMPLATE_STYLE_KEYS`); a recipe is the *stage list*, which is currently fixed. |
| 2.9 | **Designer templates beyond brand books** — questionnaires, briefs, moodboards, approval forms, handoff packs | **OPEN** | |
| 2.10 | **Pause and resume without reconstructing where you were** | **BUILT** | `lastView` resume, desk pickup, and now the brand brain for the "what did we decide" half. |

---

## 03 · Design Support Tools

Colour, accessibility, comparison, exploration.

| # | Addition | Status | Notes |
|---|---|---|---|
| 3.1 | **Colour palette tool with roles and contrast testing** | **BUILT (pre-existing)** | `lib/color.js`, `lib/brandSystem.js`; AA pass pairs computed. |
| 3.2 | **Accessibility surfaced during design, not at the end** | **PART** | Contrast is checked and now appears as a completeness row and in the package colour sheet. Type size, small-text, motion and colour-only-information checks do not exist. |
| 3.3 | **Accessibility scored by area** (colour / typography / digital) | **OPEN** | Only meaningful once 3.2 covers more than contrast. |
| 3.4 | **Design exploration boards** — several colour/type/logo explorations held side by side | **OPEN** | Directions A/B/C exist; boards do not. |
| 3.5 | **Decision comparison matrix** — directions scored against the strategy already agreed | **OPEN** | The strategy attributes needed for the rows are already collected in the brief. |
| 3.6 | **Inspiration library where every reference records *why* it was saved** | **PART** | Pins take a note, and the completeness check requires a reason on every *starred* pin. No per-reference tagging (typography / colour / layout / tone). |
| 3.7 | **Competitive landscape** — competitor visual characteristics, positioning, what to avoid, where to differentiate | **OPEN** | The brief asks who the competitors are; nothing records what they look like. |
| 3.8 | **Client preference tracking** — what this client has responded well and badly to | **PART** | The brain recalls feedback and what was ruled out. It is not accumulated into a standing like/dislike profile. |

---

## 04 · Brand Asset System

Assets, versions, permissions, packaging, libraries.

| # | Addition | Status | Notes |
|---|---|---|---|
| 4.1 | **Bring in work made in other tools** | **BUILT** | `packageAssets` on the project; "Add files" in the package panel. The platform never requires an asset to have been made inside it. |
| 4.2 | **Usage rights per asset** — client-owned / licensed / designer-owned / third-party / do-not-distribute | **BUILT** | `USAGE_RIGHTS` in `src/lib/deliver/packagePlan.js`. Anything not the client's is held out of the package **and named**, in the panel and the README. Silence would be the actual failure. |
| 4.3 | **Version control — the client downloads the approved version, not the newest** | **OPEN** | Revision rounds exist; assets have no version chain. |
| 4.4 | **Design freeze / approval lock** — changing an approved element reopens approval | **OPEN** | |
| 4.5 | **Deleted-asset recovery, project recovery, previous brand book versions** | **PART** | Workspace backup/restore exists; per-asset history does not. |
| 4.6 | **Brand system persists across projects, attached to the client** | **OPEN** | The largest architectural change proposed. Today a brand lives inside one project. |

---

## 05 · Client Collaboration

Questionnaires, presentations, feedback, approvals, messaging.

| # | Addition | Status | Notes |
|---|---|---|---|
| 5.1 | **Client questionnaire that lands on the project** | **BUILT (pre-existing)** | Public brief route + portal. |
| 5.2 | **Client portal: messaging, review, approvals** | **BUILT (pre-existing)** | `src/features/client-portal/`. |
| 5.3 | **Client "what happens next" view** — where we are, what we've done, what you must do next | **OPEN** | The portal shows steps but not the reassurance framing. |
| 5.4 | **Revision round manager** — feedback attached to an element, then a version, then approval | **PART** | Rounds open and close (`lib/revisions.js`); they are not attached to a specific element and version. |
| 5.5 | **Approval creates a durable record** | **PART** | Approvals and closed rounds are recorded; the completeness check reads all three forms the app keeps one in. |
| 5.6 | **"Client said yes" — approval as a real milestone that moves the project on** | **OPEN** | See the motivation rules below: state it plainly, do not gamify it. |
| 5.7 | **Client presentation builder** — present concepts before approval, not just the final book | **PART** | A case-study export exists; a concept presentation flow does not. |
| 5.8 | **Client directory as a first-class entity** | **PART** | `ClientsView`, `ClientRecordView`, `lib/client/clientDirectory.js` exist. Client profile, contacts, tags, preferences, timeline and portal-access control do not. |
| 5.9 | **Client vs Brand vs Project separation** | **OPEN** | Stated principle: client = who you work with, brand = what you maintain, project = what you are doing now. Currently project is the only real entity. |
| 5.10 | **Repeat-client / "welcome back" flow** — reuse the current approved brand for a new job | **OPEN** | Depends on 4.6. |
| 5.11 | **Client files vs brand assets kept separate** (contracts and notes are not brand materials) | **OPEN** | |

---

## 06 · Brand Book Studio

Templates, auto-generation, custom layouts, living book.

| # | Addition | Status | Notes |
|---|---|---|---|
| 6.1 | **Auto-populated brand book from project data** | **BUILT (pre-existing)** | `lib/book/`. |
| 6.2 | **Custom page builder** | **BUILT (pre-existing)** | `BrandBookBuilderView`. |
| 6.3 | **Brand book coverage** — "the book documents 73% of the system", and what is missing | **PART** | The completeness check answers the same question per element; it is not expressed as book coverage. |
| 6.4 | **Reusable book structures / house templates** | **PART** | Style templates exist; structure templates do not. |
| 6.5 | **Brand system ≠ brand book** — the system keeps evolving after v1.0 ships | **OPEN** | Stated as a core principle; the app has no versioned "current system" separate from the book. |

---

## 07 · Delivery & Handoff

Packages, naming, folders, downloads, production.

| # | Addition | Status | Notes |
|---|---|---|---|
| 7.1 | **Asset package builder with an organised folder structure** | **BUILT** | `src/lib/deliver/packagePlan.js` — numbered folders `01_BRAND_GUIDE … 06_PROJECT`. Empty folders are dropped rather than shipped hollow. |
| 7.2 | **Automated file naming** | **BUILT** | `src/lib/deliver/naming.js` — `SparrowsPromise_Logo_Primary_FullColor.svg`. Collisions are suffixed, never silently overwritten inside the zip. |
| 7.3 | **Deliverable checklist before delivery** | **BUILT** | One row per deliverable the brief actually bought; nothing invented, nothing listed that was not sold. |
| 7.4 | **Fonts: information, not redistribution** | **BUILT** | Family, weights, where to buy, licence terms. Files ship **only** when the designer ticks that the licence permits it — otherwise the sheet says plainly they are not included. |
| 7.5 | **Nothing fabricated in a package** | **BUILT (rule)** | Mono and reverse lockups are real on screen as CSS and cannot be written honestly as files, so the README names them as normally-also-supplied instead of shipping fakes. |
| 7.6 | **Custom package types** (logo delivery, identity, social, print, "Nichol's standard delivery") | **OPEN** | The plan is data, so presets are a small addition. |
| 7.7 | **Client download centre** — browsable in the portal, not one zip | **OPEN** | |
| 7.8 | **Production: preflight, product templates, print providers, dropship, markup, reorders, vendor catalogue** | **OPEN** | Whole system. Standing guidance from the conversation: frame it as **Brand-to-Production**, never as dropshipping, and never lead the product with it. |
| 7.9 | **Print specs stored on the asset** (size, bleed, stock, finish, provider) | **PART** | Project-level `printPantone` / `printStock` / `printFinish` exist; per-asset specs do not. |

---

## 08 · Brand Lifecycle

Refreshes, rebrands, expansions, ongoing updates.

| # | Addition | Status | Notes |
|---|---|---|---|
| 8.1 | **Brand inventory for an existing brand** — upload what exists, audit it | **OPEN** | The brief asks whether a style guide and old assets exist; nothing inventories them. |
| 8.2 | **Keep / Change / Explore framework** | **OPEN** | The rebrand-specific reframe: decide what has equity before deciding what to redraw. |
| 8.3 | **Rebrand workflow** — current brand → audit → strategy → direction → new identity → transition plan | **OPEN** | |
| 8.4 | **Brand expansion mode** — add a new application to a finished brand without rebuilding it | **OPEN** | Depends on 4.6. |
| 8.5 | **Brand handoff mode** — one pack a new employee or future designer can be handed | **PART** | The client package is most of this; the "notes for whoever inherits this" layer is not. |
| 8.6 | **Before → After for refreshes and rebrands** | **OPEN** | |

---

## 09 · Executive-function and motivation

The founding rationale. These are rules as much as features.

| # | Addition | Status | Notes |
|---|---|---|---|
| 9.1 | **"You're clear. Nothing is waiting for you."** | **BUILT** | `src/lib/brain/looseEnds.js`. Checks the five places something can genuinely be *waiting*. Ordinary unfinished work is deliberately excluded — counting it would make "clear" unreachable and turn the readout into noise. It states what it checked, and never congratulates. |
| 9.2 | **Parking lot** for ideas that are not ready | **BUILT** | No due date, no completion, no counter. The absence of a counter is the feature: the moment it has one it stops being a place to put things down. |
| 9.3 | **Private designer notes**, never client-facing | **BUILT** | Private structurally, not by promise — the pack snapshot copies named fields only, so it cannot reach an export, the portal or the book. |
| 9.4 | **A gap is stated, never subtracted** | **BUILT (rule)** | Every completeness row is additive and carries a button to the fix. No red, no gate. |
| 9.5 | **Progress that cannot be taken away by working** | **BUILT (pre-existing)** | `pathReached` latches completion; see the note in `journeyProgress.js`. |
| 9.6 | **"Look what you built"** — a visual recap at milestones | **OPEN** | |
| 9.7 | **"Finished finished" / Ship it** — close the project deliberately | **OPEN** | |
| 9.8 | **The Shelf** — completed projects as a visual record of work done | **OPEN** | |
| 9.9 | **Brand garden** — a quiet visual metaphor that fills in as the system completes | **OPEN** | Explicitly not a childish game. |
| 9.10 | **Celebrate resolving something that was stuck** | **OPEN** | "Decision resolved." — plainly, without noticing-you-were-struggling framing. |

### The motivation rule, stated in full

**Do not build:** XP · levels · leaderboards · competitive scoring · daily
streaks · "you haven't worked today!" · constant badges · artificial urgency.

**Build instead:** progress → completion → visual evidence → relief.

> I'm overwhelmed → the app tells me what matters right now → I finish one
> small thing → I can see it moved the project forward → I feel competent →
> I know what to do next → eventually: I'm done.

**Conflict on record:** the app currently ships four of the eight banned
items. `src/features/helper/GameHUD.jsx` renders an XP ring, a numeric level,
a daily XP goal (`DAILY_XP_GOAL`, with a "goal met" state) and a day streak,
and `App.jsx` awards XP through `awardAndBroadcast` on actions including
exports. A day streak is the most damaging of these for this audience: it
turns a day away from the desk into a visible loss, which is the "you haven't
worked today" pattern arriving without the sentence. Three options, in order
of preference: replace the HUD's contents with completion evidence; remove it;
or make it a preference defaulting off. **Not yet actioned — this is a live
feature and the call is the owner's.**

---

## 10 · Attribution and ownership

Whose name is on the work.

| # | Addition | Status | Notes |
|---|---|---|---|
| 10.1 | **The platform must not brand the client's materials** | **OPEN — and currently violated** | `brandBookPdf.js` prints "Creative Companion" in the book footer; `exportFiles.js` prints it in the markdown export, the direction sheet HTML and the project-overview PDF. These are pages a client reads. Every one should carry the designer's line or nothing. |
| 10.2 | **"Brand identity designed by …" on the book** | **OPEN** | Designed, not built: a `designerProfile` in prefs (name, studio, website, social, email, roles) plus a per-surface toggle map. |
| 10.3 | **A designed credit page, not a software watermark** | **OPEN** | Closing page: designed for *client* by *studio*, with the roles worked and contact. |
| 10.4 | **Credit surfaces are an explicit list** | **OPEN** | Allowed: book, portal, presentation, package README. Never: the logo, the business card, packaging. A credit printed on the client's stationery is not attribution. Package and production default **off**; documentation defaults **on**. |
| 10.5 | **Credit styles** — minimal / standard / full | **OPEN** | |
| 10.6 | **White-label client portal** — the designer's name and marks, not the app's | **OPEN** | Needs the studio profile to travel with the share record, which is a Supabase schema change. |
| 10.7 | **Project credits / team** (strategy, identity, photography, copywriting) | **OPEN** | |
| 10.8 | **Brand lineage — attribution survives expansion** | **OPEN** | Append-only credits: original identity 2026 keeps its entry when another designer adds packaging in 2028. Whoever holds the file last must not become the author. |
| 10.9 | **"Contact designer" everywhere appropriate in the portal**, routed into the project | **OPEN** | Keeps the platform from cutting designers out of their own client relationships. |
| 10.10 | **Explicit ownership fields** — designer/studio owner, client, brand owner, asset ownership, usage rights, attribution | **PART** | Usage rights exist (4.2); the rest do not. |

**Principle:** the platform belongs to the designer, not the other way around.
The client should leave remembering who designed their brand, not which
software hosted the files.

---

## 11 · Business and admin

| # | Addition | Status | Notes |
|---|---|---|---|
| 11.1 | **Time and effort tracking, estimated vs actual** | **PART** | Work log and billable hours exist; estimate-vs-actual and "your average logo package takes 14.2 hours" do not. |
| 11.2 | **Pricing / proposal → accepted → workspace** | **OPEN** | Would put the tool in front of the project starting. |
| 11.3 | **Backup and safety net** | **PART** | Workspace backup/import and cloud sync exist; per-item recovery does not. |
| 11.4 | **Integrations (Adobe, Figma, Canva, Drive, Dropbox)** | **OPEN** | Standing guidance: upload first, integrate later. Not an MVP prerequisite. |
| 11.5 | **Global search across clients, projects, assets, decisions, messages, approvals** | **OPEN** | The brain makes decisions searchable within one project; nothing is searchable across projects. |

---

## Non-goals, restated

The platform does not replace Illustrator, Photoshop, InDesign, Figma or After
Effects, and is not a general photo editor, video editor or social design tool.
It manages the workflow around the work.

And the one explicitly rejected direction: **do not build an AI that designs
brands.** The valuable proposition is an assistant that remembers, organises,
questions and checks — because that preserves the designer's expertise instead
of competing with it.

---

## What is actually built on this branch

| Area | Files |
|---|---|
| Brand brain | `src/lib/brain/brandBrain.js` |
| Completeness check | `src/lib/brain/completeness.js` |
| Loose ends | `src/lib/brain/looseEnds.js` |
| Package plan, rights, fonts | `src/lib/deliver/packagePlan.js` |
| Package contents | `src/lib/deliver/packageFiles.js` |
| File naming | `src/lib/deliver/naming.js` |
| Package zip writer | `downloadClientPackage` in `src/lib/book/exportFiles.js` |
| Desk panels | `src/components/BrandCheckPanel.jsx`, `src/components/YoursOnlyPanel.jsx` |
| Delivery panel | `src/components/ClientPackagePanel.jsx` |
| Store | `packageAssets`, `parkingLot`, `privateNotes`, `typeSource`, `typeLicenceNote`, `fontFilesLicensed` |

All with unit tests. Names of stages and brand areas are derived from
`JOURNEY_STEPS`, `IDENTITY_SUBSTEPS` and the book's `SECTION_PAGES` rather than
restated, per the single-source rule this codebase enforces in tests.
