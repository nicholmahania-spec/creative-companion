# Implementation Phases

Built from six decisions taken 2026-08-05. Each phase names what it includes,
what it deliberately does **not**, and how we know it is done.

Rule for every phase: **it ships only when the checks are green and the thing
was actually observed working.** A phase that "should" work is not done.

> **This file is not the authority on what exists.** Its value is the
> reasoning — what was decided, what was rejected, what a measurement showed.
> Its DONE / NOT DONE claims have sent careful readers at the wrong work five
> separate times, once in a note added while fixing two others, because a
> status line is a second copy of something the code already says and the two
> drift.
>
> Check the code, then the tests, then CI. `journeySingleSource.test.js` and
> `projectTypes.js` are authoritative about the journey; this file is not.
> Where a status claim below is known wrong it is struck through in place
> rather than deleted, so a reader who half-remembers it is corrected instead
> of merely finding it gone.

## The decisions this plan is built on

| # | Decision | Consequence |
|---|---|---|
| 1 | Rebuild to the spec's **10 stages** | The journey is redeclared. Everything derived from it moves with it. |
| 2 | **Existing project data is disposable** | No migration phase. Old projects will not open correctly, and that is accepted. |
| 3 | **Per-dimension bars**, not one % score | Avoids a scalar that hides the dimension carrying the brief. Same build cost. |
| 4 | New data lives in **Supabase** | Migrations, RLS and a security audit become part of the work. |
| 5 | Create a **real projects table** | The largest and riskiest change in the plan. Projects stop being one blob. |
| 6 | **Offline-first, sync when online** | Two copies of the truth, so conflict handling is real work, not a footnote. |

Decisions 5 and 6 together are the hard part of this plan. Everything else is
ordinary feature work by comparison.

---

## Phase 0 — Get the safety net working

**Why first:** chosen deliberately. 17 of 30 e2e checks fail today, so the
suite currently cannot tell us whether a change broke something. Phases 1–2
are the riskiest work in the codebase's history. Doing them blind is how data
gets lost quietly.

**In scope**
- Fix `unlockAndOnboard` / `pathNav` in `e2e/helpers.js`. Diagnosed: after
  unlock the app lands on HomeView, where `.step-rail` does not exist, so
  `getByRole('navigation', { name: /Process position/i })` can never match.
  8 specs call it. One helper fix, not 17 spec fixes.
- Re-run the full suite, fix whatever remains, one cause at a time.
- Land PR #124 (heading selectors by role + name).

- ~~A "download my data" escape hatch~~ — **already exists, nothing to build.**
  Review recommended adding one before Phase 2 destroys anything. Checked
  before building: Settings and Deliver both carry a **Backup** button wired to
  `downloadDataBackup`, and `src/store/workspaceRoundTrip.test.js` proves an
  export → import cycle loses no state. The escape hatch decision 2 needs is
  therefore already met. Recorded rather than deleted, so the next person does
  not re-derive the same recommendation and build a second one.

**Not in scope**
- Any `src/` behaviour change. If a check fails because the app is genuinely
  wrong, that is **reported, not silently fixed here** — see the findings
  below, which are real app defects surfaced by getting this far.

**Done when:** `npm test` and the full e2e suite are green on `main`.

**Status 2026-08-05 (final): DONE. 18 failures → 11 → 0.**

*CI is green on `main` at `9019ebb` — CI, Pages and Cloud Node Checker all
pass. Every failure in the table below has since been fixed, including the
primary-button hover defect, whose fix is recorded in the docstring of
`e2e/button-states.spec.js` (it now reads `background-image` as well as
`background-color`, because primary and secondary are painted with a gradient
plate and their `background-color` is transparent in every state — reading
colour alone reported "never repaints" for the two most-used buttons in the
app while they were demonstrably changing).*

**The table below is kept as history, not as a to-do list.** It was read as
live during Phase 5 planning and produced a confident recommendation to go fix
a defect that no longer existed. If you are looking for work, do not start
here — run CI.

<details>
<summary>Historical: the 11 failures as they stood mid-phase</summary>

*Numbers are from CI, which is authoritative. A local run of the same commit
reported 14 failed / 10 passed across only 24 tests, against CI's 11 / 19
across 31 — this container's Chromium is build 1194 while the pinned
`@playwright/test` wants 1234. **Do not diagnose an e2e failure from a local
run alone**; confirm it in CI first, or you will chase a browser difference.*

Fixed and merged (#124): heading assertions moved to role + accessible name,
and `unlockAndOnboard` now lands inside a project instead of on Home, where
`.step-rail` does not exist. That one helper change cleared 7 specs —
`a11y-path` (both), `axe-path`, `brand-book-pdf`, `offline`, and two
`phase-surfaces`.

**The 11 that remain, and they are NOT all stale tests.** At least the first
group looks like genuine app defects:

| Spec | Reads like |
| --- | --- |
| `button-states` (light + dark) — "primary must repaint on hover" | **App defect.** The primary button measures identical on hover and at rest, so the most-used control in the app gives no feedback that it is interactive. Worse than cosmetic for this audience: a control that looks dead invites the second and third click. |
| `define-regressions` — primary buttons legible in dark | Likely the same defect seen from another angle. |
| `define-regressions` — brief chrome reading order matches focus order | Accessibility: focus order diverging from visual order. |
| `desk-reliability` ×2 — Deliver formats, Esc closes overlay | Unknown; needs diagnosis. |
| `path-smoke`, `process-walk` | Long walks — likely one blocker part-way through. |
| `phase-surfaces` — "Ideate carries the layout pattern reference" | Names a stage the app no longer has. Probably a genuinely stale test. |
| `reachable-controls` — every preference switch has a clickable body | Unknown; possibly real. |
| `soft-signal` — demo loads | Unknown. |

Each needs its own diagnosis before anyone decides whether the test or the app
is wrong. Do not assume "stale test" — that assumption is what produced the
wrong first hypothesis on this very suite.

</details>

**Risk:** low. Test-only so far.

---

## Phase 1a — The walking skeleton

**Status 2026-08-05: DONE — shipped in #130.**

Split out of Phase 1 after review. The original Phase 1 bundled a table, RLS,
an audit, bidirectional background sync, a conflict rule and a four-state
indicator — and delivered no product function. Cockburn's walking skeleton is
"a tiny implementation of the system that performs a small end-to-end
function… it need not use the final architecture, but it should link together
the main architectural components." None of "tiny" described the original.

**In scope — the thinnest thing that proves the whole path works**
- `clients` → `brands` → `projects` tables with RLS, audited by
  `backend-security-auditor` before anything writes to them. (Widened from a
  single `projects` table on 2026-08-05 — PRODUCT.md §26.2, owner's call: a
  brand outlives the project that created it. One brand per client is a
  sync-layer simplification in 1a, not the model.)
- Sync **one** project, **one** direction, **manually triggered**. No
  background loop, no conflict handling, no indicator states.
- Auth + RLS + the round trip, proven end to end.

**Done when:** one project written locally appears in Supabase, owned by the
right user, and a different user cannot read it.

**Why this split matters as a measurement:** if 1a is green in a day, the
ordering was right and this costs nothing. If 1a takes a week, that is the
signal that Phase 4 should have come first — because Phase 4 needs no Supabase
at all, and decisions 4/5/6 are currently being paid for by an app with two
workspace rows.

**Risk: medium.** Bounded, and the point is to find out early.

---

## Phase 1b — Real sync

**Status 2026-08-05: DONE — shipped in #130 alongside 1a.** The conflict rule
is still unstated; see *Open, not yet decided*.

Only after 1a is green. May be re-ordered after Phase 4 on the strength of
what 1a measures.

**In scope**
- Local storage stays the working copy. The app must still open, read and
  write projects with no network and no sign-in.
- Background sync local ↔ Supabase.
- **A stated conflict rule — AND the losing version retained.** This is the
  correction that came out of review, and it is the difference between a safe
  plan and a lossy one. CouchDB/PouchDB — the most-deployed offline document
  sync model — picks an arbitrary deterministic winner, and that is only safe
  *because losing revisions stay fetchable by rev*. Last-write-wins there is a
  **display** choice applied after both versions are durably stored, never a
  storage choice. Their guidance is blunt: *"In your code, you should always be
  handling conflicts. No matter how unlikely it may seem, 409s can and do
  occur."* A `projects` row is document-shaped, so a laptop editing the client
  fields and a phone editing the wall notes resolve to one row — and without
  retention, one side's work is gone with nothing to recover it from.
- **The client-portal merge path is IN scope**, reversing the original
  exclusion. `mergeDetectiveAnswers` / `mergeDiscoveryAnswers` already write
  client-submitted answers into a project. That is a live second writer, so it
  crosses the new sync boundary by definition and cannot be scoped out of a
  phase about concurrent writes.
- A visible, honest sync state: synced / syncing / offline / failed. Failure
  stays on screen with a retry rather than disappearing into a toast.

**Not in scope**
- `strategy_attributes`, `brand_tokens`, `decisions`. Those come in Phase 3.

**Done when:** a project created offline appears in Supabase after
reconnecting; a project edited in two places resolves by the stated rule **and
the losing version is still reachable**; a client portal submission during an
offline window is not lost; the offline e2e test passes; the audit is clean.

**Risk: high.** The failure mode is silent data loss, which does not announce
itself. Budget for this being slower than it looks.

**Worth noting:** Phase 3's `decisions` table is append-only in shape, and
append-only rows never conflict. The most valuable table in the plan may be
the one that least needs any of this machinery.

---

## Phase 2 — The 10-stage journey

**Status 2026-08-05: I MARKED THIS DONE AND IT WAS NOT.** Retracted 2026-08-06
— see the correction at the end of this section, which is right and this line
was wrong.

What I actually verified was that `#131` shipped modular project types: the
stops a project shows are derived from what is being built, so a logo-only job
walks a shorter path. That is real and useful, and it is NOT the ten-stage
redeclaration this phase asks for. I read the commit title, matched it to the
phase number, and wrote DONE against work that had not been done.

This is the third stale status block in this file to send a reader at the
wrong thing, and this one I added while explicitly fixing the other two.

**In scope**
- Redeclare the stops in `src/lib/journey/journey.js` as the spec's ten:
  Client Discovery, Brand Strategy, Creative Direction, Logo Development,
  Typography, Color, Supporting Visual System, Brand Applications,
  Brand Guidelines, Brand Book.
- Everything else derives. Nothing restates the list — that rule is the
  codebase's most-repeated defect and `journeySingleSource.test.js` enforces it.
- Rehome existing screens: Research → Creative Direction, Touchpoints → Brand
  Applications, and split Identity into Logo / Typography / Color.
- Update completion gates, the desk, the brand book and the client portal to
  the new stop set.

**Not in scope**
- Migrating old projects (decision 2).
- New per-stage features. This phase moves the walls, it does not furnish the
  rooms.

**Done when:** a new project walks all ten stops, the desk and client portal
name them correctly, and no module holds its own copy of the list.

**Risk: medium-high.** Wide blast radius — historically nine modules held
private copies of this list and exactly one got updated.

**~~Status 2026-08-06: NOT DONE.~~ SUPERSEDED — do not do this work.**

The five stops are still there and the ten-stage redeclaration still has not
happened, and that is now the correct state rather than a gap. PRODUCT.md
§26.1 records the conflict and the owner resolving it on 2026-08-05 in favour
of **modular project types**, which subsume the ten: the full stage set is
simply the Brand Identity default. `src/lib/journey/projectTypes.js` says so
in its own header and implements it.

What IS still open is finer-grained: four of the seven types resolve to the
same five stops today, and `startsFromExisting` is set on Refresh and Rebrand
with nothing consuming it. That is the work — not the redeclaration below.

The struck-through claim is kept because it is the fifth stale status block in
this file to send someone at the wrong work, and deleting it quietly would
lose the only evidence of why the header above now exists.

The commit titled *"Phase 2: project types"* (`e6c8995`) shipped a different
piece of work under this phase's number: project types, which switch stages on
and off per what is being built. Useful, and genuinely Phase-2-adjacent — but
it is not the redeclaration, and the two got conflated by the commit title.
`decisions.stage` in `20260805140000` still documents the five ids, which is
the honest tell.

So phases 3, 4, 5 and part of 6 were built **on the five-stop journey**, not on
the ten. That is not necessarily wrong — it is what "prove the loop" was
proven against — but anyone reading this file top to bottom will assume ten
stops exist and plan against a journey the app does not have. This is the
second time a stale status block in this file has sent a careful reader at the
wrong work (see the Phase 0 note). Fix the status, not just the code.

**One constraint carried in from review.** No evidence was found that more
stages is worse for this audience — the one peer-reviewed source retrieved,
Weick's *Small Wins* (American Psychologist, 1984), argues the opposite: large
framing "exceeds bounded rationality and induces dysfunctional levels of
arousal", and recasting work as smaller concrete outcomes is what restores
action. That supports ten over five.

But `DEVELOPMENT.md` records that a survey of unfinished stages is a backlog,
and a backlog turns "I'm working" into "I'm behind" — and ten stops make that
survey twice as long. That is a constraint on **how the ten are displayed**
(journey bar, desk, completion gates), not an argument against declaring ten.
Never show all ten as an unfinished list; show where you are and what is next.

---

## Phase 3 — Decision memory, with bars

**Status 2026-08-05: DONE — shipped in #132.** Five bars, never one score.

**In scope**
- `strategy_attributes`, `brand_tokens`, `decisions` in Supabase, with RLS,
  audited before use.
- The decision record itself: what was chosen, why, for which stage, approved
  by whom and when.
- **Five per-dimension bars** against the strategy target — Formality, Energy,
  Warmth, Weight, Era — never a combined percentage (decision 3).

**Not in scope**
- The single "82% aligned" score. Excluded on evidence, not taste — see
  *Contested claims* in `DEVELOPMENT.md`.
- Pre-tagging a font library. Tag what the designer actually uses first; a
  200-font library is worth building only once the bars prove useful.
- Applying the same five dimensions to imagery. No evidence was found that
  colour and typeface even share a dimensional space, let alone photography.

**Done when:** a strategy attribute set in Discovery visibly reappears as bars
when choosing a typeface, and the decision is recorded and survives a reload.

**Risk: medium.** The mechanism is contested; the bars are the hedge. If they
feel useless in practice, that is a real finding and cheap to learn here.

---

## Phase 4 — Prove the loop

**Status 2026-08-05: DONE — shipped in #133.**

The spec's own advice, and the point of everything above: *"prove that a
decision made in Strategy visibly and usefully shows up again in Typography
and Color."*

**In scope**
- Walk one real project end to end through Strategy → Typography → Color →
  Logo and judge honestly whether the memory loop earns its keep.
- Auto-populate one brand book template from those four stages.
- Client portal: view plus a single approve / request-changes action.

**Not in scope**
- The other six stages' depth. They exist from Phase 2; they get filled later.
- Granular per-element commenting.

**Done when:** you can answer yes or no to "did the system remembering that
actually help?" If the answer is no, stop and rethink Phase 3 rather than
building more stages on top.

**Risk: low to build, high in value.** This is the phase that tells us whether
the thesis holds.

---

## Phase 5 — Executive-function features

Cheap, no dependencies, disproportionate benefit. Each goes past
`adhd-executive-function-advisor` before it is built.

**Status 2026-08-05: done — and it was mostly repair, not construction.**

The advisor's finding, confirmed in the code: five of the six already existed
in some form. What shipped:

| Item | What it actually was |
| --- | --- |
| **Next card** | Existed with **three** near-equal buttons. `Open` keeps the button; `Already done` / `Skip this one` demoted to quiet links. NOT deleted — this card is the only route in the app to either action, and the gap card is never empty, so removing them would strand an unwanted stop with no way to clear it. |
| **Non-punitive language** | Already true everywhere except **one** rule: a red-tinted border on `.deadline-list-item.urgency-overdue`. Fixed; locked by `nonPunitiveState.test.js`, which judges the colour rather than the token name. |
| **Undo everywhere** | The chip existed, wired to exactly one action. Generalised to any honestly-reversible action; delete-project's "You cannot undo this" dialog is gone. Restores are whole-neighbourhood — deleting a project also drops its tasks and pins, removing a step also drops sub-steps. |
| **Frictionless capture** | Existed, but `N` **navigated to Flow**, paying the exact context switch capture exists to avoid, and the half-typed line was lost on reload. Both fixed. No new Inbox: the app already has four places a captured thing can live, and a fifth adds "which one did I use?". |
| **"Where you left off"** | Existed as a destination label. Now a sentence naming what you were doing, with tone rules enforced by test — no elapsed counts, no "ago"/"overdue", no alarm words. |
| **Focus Mode** | **Not built, deliberately.** A focus mask already ships that de-emphasises without hiding. A persisted collapse state is itself a thing to remember, and when the app is wrong about the current stage it hides your work. No credible expert opposition to this call was found. |

**Two things this phase found that were not on the list, and mattered more:**

1. **The Flow view was rendering nearly empty.** `SketchView` reads its whole
   contents from props and declares 56; `MainOutlet` passed 6. No crash, clean
   build, every test green — nothing in vitest renders these views. Auditing
   the rest found **five more views** in the same state, three of them still
   rendering a dead focus timer whose buttons threw a TypeError on click. Now
   guarded by `propContract.test.js`.
2. **A stale status table in this very file** sent a careful reader off to fix
   a defect that had been green for weeks. See the Phase 0 note.

**On the "one button" rationale:** deliberately NOT argued from Hick's Law.
Liu et al. (CHI 2020, *How Relevant is Hick's Law for HCI?*) argue it "speaks
against, not for, the popular principle that less is better", and that the
stimulus-response paradigm rarely applies to HCI tasks. The case here is task
initiation under executive dysfunction, which that paper does not address —
so it is made in those terms rather than borrowed from a law that does not
support it.

**Risk: low** — as predicted. The incidental findings were not.

---

## Phase 6 — Consistency checking

**In scope**
- Colour comparison using **CIEDE2000**, not RGB distance (see *Contested
  claims*). Bands: ΔE00 < 2 match, 2–5 close, > 5 different.
- Non-blocking banner on the asset card. Never a gate.
- **Say plainly when a file could not be read.** Type converted to outlines
  carries no font name, and that is the normal delivery format for brand work
  — so silence must not read as "clean".

**Not in scope**
- Font extraction promises beyond what is genuinely recoverable.
- Anything that blocks an upload.

**Done when:** twenty real assets — including one CMYK print PDF, one
photographic mockup and one outlined logo — run through it, and the
false-positive rate is judged acceptable against your own eye.

**Risk: medium.** A checker that cries wolf is worse than none for this user.

### Status 2026-08-06: the colour half is DONE and measured (#137 + this)

**The acceptance run.** Six real client files — five CMYK print PDFs and one
11-artboard Illustrator logo — rendered page by page and sampled through the
production path (160px longest edge, smoothing off), giving **22 real
renderings**. Three of those are honestly reported unreadable: they are blank
artboards, and the checker says so rather than calling them clean.

| test | what it checks | result |
|---|---|---|
| A | one brand's artwork vs the palette **typed from its own brand guide** (`#ED1C24` / `#32C1D6`) | **0 findings / 9** |
| B | the same artwork vs a palette **calibrated through the same renderer** | **0 findings / 9** |
| C | every page of a piece vs that document's own colours | **0 / 16 — and worthless, see below** |
| D | every piece vs a **different project's** palette — these *should* fire | **68 fired / 68 that can fire** |

**The honest headline: 0 false alarms on one brand's correct work, and every
check that could fire, did.**

### What an adversarial pass took off that headline

The first version of this section claimed *"0 false positives in 34 checks,
89% detection"*. Both halves were overstated and the correction is recorded
rather than edited away, because the inflated version is the one a reader
would otherwise trust.

- **Test C cannot fail.** It builds each palette out of the very colours it
  then checks — deduped at ΔE00 < 5, compared at > 15. Swept across
  thresholds it fires zero at anything above 3. So 16 of the 34 "checks"
  carried no information, and the real false-positive evidence is A and B:
  **nine renderings of ONE brand**, measured twice.
- **The sample is pseudoreplicated.** 22 renderings hold only **18 distinct
  colour payloads**; three pages of one document are byte-identical. Test A's
  "n=9" is one brand sheet plus eight artboards of one logo — n=1 brand, and
  the same two inks nine times. (Hurlbert 1984 is the canonical statement of
  this error: inference where "replicates are not statistically independent".)
- **The "8 misses" were 2 renderings, not 8 failures.** Each was checked
  against four foreign palettes. Both are *structurally mute* — their
  strongest colour covers 2.3% and 7.7%, under the 10% floor — so they cannot
  fire against any palette at any threshold. Blaming the checker for artwork
  with no dominant colour was wrong; restricted to what can fire it is 68/68.
- **The threshold is validated as a BAND, not as 15.** Every value from 12 to
  15 gives an identical result on this data. Below 12 false alarms appear; at
  16 detection starts to fall. Choosing 15 inside that band buys headroom
  against colour-management drift at the cost of a wider blind spot — a
  judgement, not a measurement.
- **This is a large-error detector, and should be described as one.** The
  median distance at which it fires is ~50 ΔE00; anything 5–15 from the
  nearest brand colour is reported by nothing at all. For scale, ISO 12647-7
  treats a spot colour as out of tolerance at roughly ΔE00 2.5. That gap is
  deliberate — the sampler's own noise floor on a JPEG is 4.17 — but it means
  the realistic professional error, a *slightly* wrong shade, is invisible
  here.

**The CMYK worry turned out not to matter here, and that is a measured
result, not an assumption.** Their brand guide prints `#ED1C24`; the same ink
renders as `#ff2e17`, a drift of ΔE00 6.14 (the cyan drifts 3.07). Test A
compares across that gap and still fires nothing, because the intruder
threshold is 15 and the divergence is 6. `calibratedPalette` remains correct
and remains unused — it solves a problem this pipeline does not have, and the
mark-upload path takes already-converted raster (PNG/JPEG/WebP/SVG) so it
never rasterises vector art at all.

**One protocol flaw worth recording**, because it produced the only findings
in the whole run and they were mine, not the checker's: test C first derived
each document's palette from its *first readable page*. Artboard 1 of the
logo is blank and artboard 2 carries only the red, so the cyan — a real brand
colour — was flagged on six later artboards. A designer's palette holds both.
Notably the app's response in that situation was still the right one: it
offered **Add to palette**.

**The frozen run protects less than "acceptance" suggests.** It replays
stored hex/coverage vectors through `markColourReading`, so it never
re-executes the sampling stage that produced them. An audit mutated six
sampling constants and the acceptance tests stayed green for all six. Two of
those holes are now closed by tests that fail when mutated — bucketing
(`STEP`, which had no coverage: defeating it entirely left all 175 tests
passing) and `imageSmoothingEnabled` (an e2e that uploads fine red/teal bands;
with smoothing on the panel reports `#8e3230` and `#395f59`, colours present
nowhere in the artwork). `SAMPLE_MAX_EDGE` and `isBackgroundTint` remain
uncovered.

**The font half is now DONE, on a surface that was there all along.** It read
as blocked because uploads accept `image/*` and no PDF reaches the app — but
that reasoning assumed the check needs a PDF. **SVG is an image format**, it
is in the accepted set, and it is exactly where the distinction lives: live
type carries `font-family`, outlined type is paths and carries nothing. So
the case the phase names is answerable today:

| the mark | what the panel says |
|---|---|
| SVG, outlined | *"Type here is outlined, so there are no font names to check."* |
| SVG, live type in a brand face | *"Live text in Brandon Grotesque — your brand typeface."* |
| SVG, live type outside the brand | *"…which your brand typefaces do not include — it will substitute on a machine without it."* |
| SVG, live text, no family named | *"…it will render in whatever the viewer has."* |
| PNG / JPEG / WebP | **nothing** |

Silence on a raster is deliberate and is not the failure the phase warns
about: a raster carries no type information of any kind, so there is no claim
being made either way, and repeating "cannot check" on every PNG is the noise
that teaches a designer to stop reading the panel. Families are compared
through `cssFamily`, the same extractor the renderer and the missing-font
warning use, so "Brandon Grotesque" and "Brandon Grotesque Bold" are one
typeface. Proven in a browser, because the SVG source only survives upload
while the mark is under the stored-image cap — over it, `downscaleDataUrl`
rasterises and the type information is gone before any of this sees it.

### The check now reaches real work, and it did not need an Asset Library

**The blocked note was wrong in the same shape as the font one.** It read:
*"the banner lives on one asset, not an asset library. There is no Asset
Library in this codebase; the mark is the only brand asset with an upload."*
That assumed the check needs somewhere to **file** assets. It does not — it
needs somewhere the deliverables are **already named**, and the Touchpoints
screen has been exactly that since 2026-08-05: a short list derived from the
brief (Business card, Social, Print, Signage), one card each, already
attached to the project. The slot an Asset Library would have made the
designer create was already on screen.

So the drop target is the row, and there is nothing to categorise, name, tag
or file. A designer exports a business card from Illustrator and drops the
PDF on the Business card row; the app reads it and says one sentence.

| what lands on the row | what the card says |
|---|---|
| PDF/PNG in the brand colour | *"Uses your Primary."* |
| PDF carrying an unapproved colour | *"Leans on #1E9E4A, which is not in your palette — your nearest is Primary (#B91C1C)."* |
| a mono piece | *"Black and white — nothing here to compare against your palette."* |
| a file that will not open | *"This file didn't open for a colour check."* |
| anything else | *"Colour check reads PNG, JPEG, WebP, SVG and PDF."* |

**PDF was a door, not a trap, and the reason is measured rather than hoped.**
`pdfjs-dist` was already dynamically imported twice in `src/`, so reading one
here adds a lazy chunk and **zero eager bytes** — the perf gate reads 341 KB
main / 749 KB eager against budgets of 440 / 900, unchanged. And the
colour-management fear was already answered above: the renderer moves a CMYK
ink ~6 ΔE00 while the intruder threshold is 15, so the drift is ~40% of the
distance needed to fire a false alarm. The same headroom that makes this safe
is why it will never catch a *slightly* wrong colour.

**Nothing of the deliverable is stored.** Only the reading is kept — five
hexes with their coverages plus the file name — **measured at 128 bytes** for
a four-page brochure carrying one colour, and bounded by the five-colour cap
at roughly 300. Asserted under 600 by an e2e that also asserts no `data:`
ever reaches localStorage. The artwork stays in the designer's own tools,
which is the product thesis rather than a storage trick; storing it would
have made this a filing system with two sources of truth. Because the SAMPLE
is stored rather than the sentence, the reading recomputes against the
CURRENT palette — change a role colour and every checked piece re-reads
without re-uploading.

**Both sides of a business card are read.** Up to six pages are sampled
individually at full sample resolution and merged in ΔE00, averaged over
readable pages only. Mutating `MAX_PDF_PAGES` to 1 makes a card whose back is
printed entirely off-brand report *"Uses your #b91c1c"* — a silent miss, and
the e2e catches it.

**Where the wording deliberately differs from the Mark screen.** On the Mark
screen a finding means the palette is behind the logo, so it says "isn't in
your palette **yet**" and offers **Add to palette**. On a finished deliverable
that runs backwards: the palette was approved weeks ago. Offering to add
every stray colour would let the brand drift a little wider each time someone
checked their own work, so the application line carries **no action at all**
and pins the nearest approved colour instead — the sentence PRODUCT.md §23
actually asks for.

**A checked file now completes the stop on its own.** `journeyProgress`
previously required a typed note or a ticked box. A designer who dropped the
finished card has produced stronger evidence than a sentence; making them
also write the sentence is the duplicate admin §33 exists to remove.

### The application check, run on real client work 2026-08-06

The generated-PDF tests were a weaker claim than the phase's own bar, so the
five real client PDFs went through the actual UI path — palette set through
the screen, file dropped on a Touchpoints row, sentence read off the panel.
Palette: the two colours printed in Sparrow's Promise's own brand guide,
`#ED1C24` and `#32C1D6`.

| file | what the panel said |
|---|---|
| their own brand sheet | `Uses your #32c1d6.` |
| table cards *(other client)* | `Leans on #292961 — nearest is #ed1c24` |
| birth plan *(other client)* | `Leans on #018081 — nearest is #32c1d6` |
| celebration *(other client)* | `None of your palette colours turn up in this one.` |
| infographic *(other client)* | `Leans on #24285c, #429592, #18255e and #4f3791` |

**No false alarm on the client's own work; every foreign piece caught.**

**And the run exposed the limit better than any argument had.** Look at row
one: it names the cyan and says NOTHING about the red — which is 59% of that
page. Their red renders ΔE00 6.14 from the specified `#ED1C24`: past the band
that confirms a match (5), far short of the band that reports a stranger
(15). Neither confirmed nor flagged. Silent.

That gap is not closable at this fidelity — below 15 the sampler's own JPEG
noise floor is 4.17, so a slightly-wrong colour and a correctly-printed one
are genuinely indistinguishable. What was not acceptable was a clean sentence
reading as approval while the check cannot see the most common professional
error. **The panel now says so, in every result state including the clean
one:**

> Only catches a colour well away from yours — a near-miss reads the same as
> a match here.

**What is NOT done, stated plainly rather than quietly rolled up:**
- **Only surfaces the brief names can be checked.** A deliverable that is not
  on the Touchpoints list has nowhere to land. That is the deliberate trade:
  the surface costs zero filing precisely because it does not accept
  arbitrary files. One tap adds a missing surface (`.touchpoints-quick`), and
  an Asset Library — if it is ever built — inherits the check unchanged.
- **The white paper fill under a rendered PDF page is uncovered by any test.**
  Coverage is measured against ink pixels rather than the whole image, so
  deleting the `fillRect` leaves every test green. It is kept because it makes
  `substrateShare` mean what its name says, and it is recorded here rather
  than described in the code as load-bearing.
- **`SAMPLE_MAX_EDGE` and `isBackgroundTint` are still uncovered** by the
  mutation-resistant tests, unchanged from the audit above.
- **No new real-client acceptance run.** The six client files were replayed
  through the frozen fixture, not through this new path. The evidence that a
  PDF renders and samples correctly is the generated-fixture e2e, which is a
  weaker claim than "twenty real assets" and should not be read as more.
- ~~No photographic mockup was in the sample.~~ **Wrong, and checkable:**
  reading the operator lists of the real files shows **11 of the 22
  renderings carry embedded raster images**. Photography was half the sample.
  The real gap was that A and B — the only false-positive tests — run on the
  two files with no embedded images. Now measured by leave-one-out across the
  photographic documents (palette from one page, a *different* page checked
  against it): **1 finding in 18 checks**, and the one is a darker navy
  flagged against a palette derived from a page that held only the brighter
  blue. Same brand, same document — the palette was incomplete, not the
  artwork.

---

## Phase 7 — Creative tool bridge

Push an asset straight from Adobe apps (via the existing Adobe connector) and
from Figma into the Asset Library, with `source_app` recorded.

**Done when:** an asset selected in Illustrator lands in the right project
without a manual upload.

**Risk: medium.** Biggest lift, biggest retention payoff.

**Status 2026-08-06: started. The destination did not exist.**

This phase is written as "push an asset into the Asset Library". Checked before
building: **there is no Asset Library.** `source_app` appeared nowhere in the
tree, there was no assets table, and Brand Applications — the stage meant to
hold finished work — stores `touchpointApps: { [id]: { note, done } }`. A note
and a checkbox. There was no column a business card could land in.

So the bridge is not the first work here; the destination is. Landed:

- `supabase/migrations/20260806120000_asset_library.sql` — `assets` table with
  `source_app`, a `replaces_id` version chain, the `assets_current` view
  (`security_invoker`), and a **private** `brand-assets` bucket with
  owner-scoped policies.
- `src/lib/assets/assetLibrary.js` + 32 tests — vocabulary, storage keys,
  ingest normalisation, version chaining.

**Reviewed by `devils-advocate`, twice — a broad pass over all three calls and
a deep pass on the storage split. All three schema calls survive. Two things
it found were real, and one of them was that my own stated reasoning was
wrong.**

1. **The version chain could fork.** Nothing stopped two rows pointing at the
   same predecessor, so a forked chain was reachable at the database level —
   the outcome `findVersionTarget`'s own comment names as the bad one. The
   client-side guard did not close it: under a fork, `heads[0]` resolves by
   array order rather than by anything anyone chose. Fixed by
   `assets_one_successor_idx`, which turns the race into a catchable 23505.
2. **The rationale for remote bytes was defeated, though the decision stands.**
   The original header argued against *localStorage* and concluded against
   *local*. IndexedDB was never evaluated — it appears nowhere in `src/` or
   these docs — and it holds Blobs natively against a quota that is a share of
   free disk (Chrome up to 60%) rather than Web Storage's 10 MiB ceiling. A
   50 MB PDF fits locally without difficulty, so "local can't hold it" was
   simply false. The real reason is **eviction**: best-effort browser storage
   is cleared LRU under pressure, all-or-nothing per origin, and Safari drops
   script-created data after seven days without a visit. Header corrected.
3. **Remote-only reads broke Phase 1b's own promise** — "the app must still
   open, read and write projects with no network and no sign-in". A private
   bucket needs a signed URL, which needs a session and a network, so offline
   the library would have rendered cards with names, categories and version
   numbers and no images. Every value resolving except the one the designer
   opened the panel for, and visually identical to a failed upload. Fixed by
   `src/lib/assets/assetBytes.js`: an IndexedDB cache keyed on the stable
   object path, cache-before-network reads, and four honest card states
   instead of a blank rectangle. Built now because it is free before the UI
   exists and expensive after.

**Still owed, both from the same review, both deferred deliberately:**

- **Orphaned bytes.** `on delete cascade` drops asset rows and leaves their
  objects in the bucket — still stored, still billed, still reachable by any
  signed URL already minted. Sears/van Ingen/Gray name this exact hazard.
  Needs a reaping path; there is none yet.
- **Signed-URL caching.** Supabase's Smart CDN docs: the first request with
  any given signed URL is always a cache miss, and only that exact URL hits
  afterwards. A grid minting fresh URLs per mount is permanently cold, and an
  `<img src>` on a signed URL blanks silently once it expires. Needs a
  memoised URL per object path with refresh-before-expiry — but it belongs
  with the read path in the UI, which does not exist yet.

**Three calls made here, cheap to reverse now and expensive later:**

1. **The bucket is private**, unlike both existing buckets. Those are
   `public: true`, which serves object URLs without consulting RLS at all
   (see `20260731120000`). This one holds unreleased client identity work, and
   an unannounced rebrand leaking via a guessable URL is career-grade harm for
   the designer. Cost is paid in app code: reads need signed URLs, so
   `getPublicUrl` does not work against this bucket.
2. **Metadata is a row; bytes are a Storage object.** Every image in the app
   today is a data URL inside the localStorage blob, against a 3.5 MB cap that
   already ships a "storage is full" error. A print-ready PDF exceeds that
   whole budget — this path would not degrade, it would detonate, as silent
   lost work.
3. **Re-pushes chain, they do not overwrite.** A bridge makes re-pushing free,
   so the same artboard arrives repeatedly. Upsert-on-`source_ref` keeps the
   library tidy by discarding every earlier version; PRD §17 asks for the
   opposite, because the argument a designer has with a client is about which
   version was approved.

**Still to build:** store slice, the library UI (it belongs on the existing
**Assets** stop — `deliver` — which already exists), and the bridge itself.

**One open question, owner's call, stated rather than guessed:** the phase's
done-when names Illustrator specifically. A true in-app panel is a UXP plugin
needing Adobe developer distribution — writable here, but not installable or
verifiable in CI, so it would ship unproven. An in-app "Import from Creative
Cloud" over the existing Adobe connector is verifiable end to end but is a
pull from the platform, not a push from the app, so it does not literally meet
the wording above. Recommendation: build the verifiable one first and let the
plugin become a thin client over an ingest surface already exercised with real
files.

---

## Phase 8 — The delivery moment

Preview state before publish; a designer's note; a dedicated client reveal
page; a reaction prompt; a notification when the client actually views it.

**Done when:** delivering a brand book feels like an event rather than a status
flip.

**Risk: low.** Mostly a route and a transition.

**Status 2026-08-06: built, and the migration IS applied.** This header used
to read "migration not yet applied" while the gate table lower down in this
same section already recorded it as applied — the section contradicted itself.
Re-verified against `shzkqbtoepqqdkjgupry` before correcting: `delivery_moment`
(`20260806015944`) is in the migration list, all seven `delivery_*` columns
exist on `client_portals` with `delivery_status` NOT NULL defaulting to
`not_delivered`, and all three RPCs — `get_brand_delivery`,
`mark_brand_delivery_viewed`, `submit_brand_delivery_reaction` — exist as
`SECURITY DEFINER`.

What has NOT been observed is still the path through the actual UI; see below.

What shipped:

| Piece | Where |
| --- | --- |
| **Preview before publish** | `DeliverToClient.jsx`. Three states: draft → preview → delivered. The preview is **local only** — nothing is written server-side until Send, so backing out costs nothing. There is deliberately no `'preview'` value in `delivery_status`: a preview you had to publish to look at is the thing this state exists to prevent. |
| **The designer's note** | Pre-filled with a warm default (`defaultDeliveryNote`) rather than a blank box. A blank field at the end of a project, when the tank is empty, produces no note at all. Editable, and deletable. |
| **The reveal page** | `/d/:portalId` → `PublicBrandReveal.jsx`. Third public no-login surface. Same portal id as `/c/`, on purpose — a fourth link is a fourth "which one was that". A short curtain (instant under `prefers-reduced-motion`), then the note, then the **real book**, rendered by the same component the studio previews with, so the two cannot drift. |
| **The reaction** | One question, single-use server-side, drafted to localStorage like the other two public surfaces. Arrives in the client inbox as a quoted row. |
| **"They opened it"** | `delivery_viewed_at`, written once by the WHERE clause rather than by read-then-write. Reaches the designer as an inbox row and as a live status line on Deliver, which polls only while there is something left to learn. |

Three things worth recording that were not on the phase's list:

1. **The delivered pack is not the designer's pack.** `buildDeliveryPack`
   strips twelve fields before anything reaches a client-readable row —
   the open to-do list, the feedback log, the revision rounds, the decision
   log, the scope that got argued about. `deliveryPackPrivacy.test.js` asserts
   the premise that makes that safe: nothing under `src/lib/book/` reads any
   stripped field, so the client's book is byte-for-byte the one previewed. If
   a future page starts printing one, that test stops the drift rather than
   letting the two copies quietly diverge.
2. **Size is handled honestly.** Over 3 MB, moodboard images are dropped, then
   logo artwork — and what was dropped is *said*, on screen, next to the link.
   Silence there means previewing a book with a moodboard and delivering one
   without.
3. **The grid ate the new section.** `.assets-studio` places every child
   explicitly at ≥1100px, so the unplaced `deliver-send` auto-flowed to the
   bottom of the left column — below Extras and Leave, a screen and a half from
   the ship ticket it belongs to. Caught by looking at it, not by a test.
   Placed explicitly now, with a comment saying why.

**Migration applied 2026-08-06** to `shzkqbtoepqqdkjgupry` on the owner's
instruction, and the server gates were then verified *against the live
database* rather than assumed:

| Gate | Result |
| --- | --- |
| Undelivered portal → reveal RPC | 0 rows. The URL cannot be used to watch a book being assembled. |
| Undelivered portal → view stamp / reaction | both refused, 0 rows mutated |
| Delivered portal → reveal RPC | returns the payload |
| View stamp, twice | first `true`, second `false`, **and the timestamp did not move** |
| Reaction, twice | first `true`, second `false`, stored text unchanged — no overwrite |
| Blank reaction | refused |
| Revoked link → reveal RPC | 0 rows |

All five existing portals defaulted cleanly to `not_delivered`; no live row was
altered. The delivered-path checks needed a delivered row, and `owner_id` has a
foreign key to `auth.users`, so rather than manufacture an account the whole
sequence ran inside a transaction ended with a deliberate `RAISE` — the results
come back in the error message and the row is *incapable* of surviving. Verified
afterwards: 5 portals, 0 strays.

**What still has not been observed:** the path through the actual UI. The
server behaves; nobody has yet pressed *Ready to send it* on a real project,
opened the resulting `/d/` link as the client, and watched the book render and
the row appear in the inbox. That is one real send away, and it is the last
thing between this phase and done.

The Supabase advisor flags the three new RPCs under
`anon_security_definer_function_executable`. That is the design, not a
regression: every pre-existing portal RPC carries the identical warning,
because a no-login client surface is what they are for. No new *category* of
advisory appeared. Two unrelated pre-existing items remain and are not this
phase's to fix — `public.records` has RLS enabled with no policy, and leaked
password protection is off in Auth.

---

## Decided

- **Business model / portal chrome** (spec §6), owner's call 2026-08-06:
  **the client-facing side carries the designer's own studio branding, which
  they will add themselves when ready. Not "Powered by".**

  Two consequences, neither built yet:

  1. There must be somewhere to put a studio name and mark, and every
     client-facing surface — portal, brand book, artboard, exports — has to
     read it from that one place.
  2. It has to look finished with nothing set. A designer who has not added
     their branding yet is the normal state, not an error state, so the
     absence must read as clean rather than as a gap waiting to be filled.

  **A default needs flipping and has deliberately not been flipped yet.**
  `prefs.hidePackWatermark` defaults to `false`, so client-facing output
  currently carries a "Creative Companion" credit unless the designer finds
  the toggle in Deliver. That contradicts the decision above. It changes what
  goes out to real clients, so it is left for the owner to confirm rather
  than changed quietly.

## Open, not yet decided

- **Whether the six drifted views should share a heading class** —
  `home-dash-title`, `login-h1`, `clients-view-title`, `client-record-name`,
  `create-title`, `bbb-panel__title`. A design-system call, deliberately not
  forced by a test selector.
- ~~**Conflict rule for sync** (Phase 1b). Needs stating explicitly before it
  is implemented.~~ **Resolved — it was already stated and this entry was
  stale.** `src/services/syncEngine.js:5` declares it: *"The desk wins. The
  version in front of the designer is never yanked away by a background
  process; when both sides changed, the local version becomes the truth and
  the cloud version is written to `project_conflicts` FIRST — durably — and
  only then overwritten."* The reasoning is there too: newest-wins would need
  trustworthy edit timestamps on both sides, and the local store does not
  timestamp edits.
