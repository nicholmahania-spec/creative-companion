# Implementation Phases

Built from six decisions taken 2026-08-05. Each phase names what it includes,
what it deliberately does **not**, and how we know it is done.

Rule for every phase: **it ships only when the checks are green and the thing
was actually observed working.** A phase that "should" work is not done.

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

- **A "download my data" escape hatch, before Phase 2 destroys anything.**
  Added after review. Decision 2 says existing projects are disposable, and no
  source disputes that — but the whole store is already one JSON blob under
  `creative-companion-storage`, so dumping it to a file is minutes of work. It
  removes the entire class of "I said it didn't matter and I was wrong", which
  is worth more than the time it costs.

**Not in scope**
- Any `src/` behaviour change. If a check fails because the app is genuinely
  wrong, that is reported, not silently fixed here.

**Done when:** `npm test` and the full e2e suite are green on `main`, and the
current workspace can be exported to a file.

**Risk:** low. Test-only, plus one read-only export.

---

## Phase 1a — The walking skeleton

Split out of Phase 1 after review. The original Phase 1 bundled a table, RLS,
an audit, bidirectional background sync, a conflict rule and a four-state
indicator — and delivered no product function. Cockburn's walking skeleton is
"a tiny implementation of the system that performs a small end-to-end
function… it need not use the final architecture, but it should link together
the main architectural components." None of "tiny" described the original.

**In scope — the thinnest thing that proves the whole path works**
- A `projects` table with RLS, audited by `backend-security-auditor` before
  anything writes to it.
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

- **Frictionless capture** — global quick-add into a project Inbox, filed later.
- **"Where you left off"** — one sentence on project open, not a dashboard.
- **Non-punitive waiting language** — muted grey, never alert red.
- **Undo everywhere** — a 5-second undo instead of a confirmation dialog.
- **Focus Mode** — collapse to the current stage.
- **Next card** — one action, one button, never a list.

**Done when:** each is on screen and doing its real job.

**Risk: low.**

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

---

## Phase 7 — Creative tool bridge

Push an asset straight from Adobe apps (via the existing Adobe connector) and
from Figma into the Asset Library, with `source_app` recorded.

**Done when:** an asset selected in Illustrator lands in the right project
without a manual upload.

**Risk: medium.** Biggest lift, biggest retention payoff.

---

## Phase 8 — The delivery moment

Preview state before publish; a designer's note; a dedicated client reveal
page; a reaction prompt; a notification when the client actually views it.

**Done when:** delivering a brand book feels like an event rather than a status
flip.

**Risk: low.** Mostly a route and a transition.

---

## Open, not yet decided

- **Business model** (spec §6). Decide before the portal's visual chrome is
  built, since it determines whether the portal carries "Powered by".
- **Whether the six drifted views should share a heading class** —
  `home-dash-title`, `login-h1`, `clients-view-title`, `client-record-name`,
  `create-title`, `bbb-panel__title`. A design-system call, deliberately not
  forced by a test selector.
- **Conflict rule for sync** (Phase 1b). Needs stating explicitly before it is
  implemented.
