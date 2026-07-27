# Creative Companion — Work Log & TODO

> Last updated: 2026-07-24 (session `6792b3d7`)
> Branch: `claude/debug-code-6u77sp` on `nicholmahania-spec/creative-companion`
> Build: **green** (`npm run build` ✓ ~500ms) at commit `217408b`

---

## Completed this session

### Multi-agent pass (UI / UX / Graphic Design professionals)

| Commit | What | Who |
|--------|------|-----|
| `e190642` | App-wide code review: Rules of Hooks, a11y, UX bugs | main session |
| `c33cd9a` | In-flight agent partial changes | automated |
| `19675d7` | Repaired 8 CSS syntax errors introduced by agent edits | main session |
| `44ac172` | Graphic design pass: hierarchy, tokens, consistency | graphic-design-professional agent |
| `217408b` | UX pass: fixed DeliverFocusView nested FocusShell + exit + console.log | ux-professional agent |

### Specific fixes in `e190642`
- **IdeateFocusView.jsx**: Moved `pick()` + `useEffect` before early return (React Rules of Hooks)
- **SketchFocusView.jsx**: Fixed `/* */` block comments leaking as JSX text
- **LoginPage.jsx**: `maxScore: 4→5` (strength bar overflow), live strength feedback on `onChange`, added `id="password-error"` for `aria-describedby`
- **App.jsx**: Replaced `alert()` with `flashToast?.()` in `startVoice()`
- **CalendarView.jsx**: Added `aria-label` to `←`/`→` month nav buttons
- **DesignView.jsx**: Added `aria-label` to palette role swatch buttons; added `reader.onerror` handler
- **SettingsView.jsx**: Added `id`/`aria-label` to new-password input; `disabled` on Sync button while syncing
- **ResearchView.jsx**: Added URL validation in `submitBoardUrl()`

### Specific fixes in `44ac172` (graphic-design-professional)
- `src/index.css`: Explicit `h1` font-size in modular scale (`clamp(2rem, 4vw, 2.75rem)`)
- `src/index.css`: Removed stale "Gamified Minimalist" `:root` block that re-introduced squircle radii and drop shadows (overriding the flat lock)
- `src/index.css`: Normalized `.btn-primary` vertical padding so all buttons resolve to 40px height
- `src/index.css`: `.text-link` and login lede moved from `--text-muted` → `--text-secondary` (WCAG AA); `.text-link:hover` uses `--dopamine`
- `src/components/PathStepIcon.jsx`: All 7 nav icons stroke normalized to `1.75px`
- `src/views/ResearchView.jsx`: Mood-pin gradient fallback retuned to `#1E3A8A→#2563EB`; image placeholder background → `var(--bg-muted)`

### Specific fixes in `217408b` (ux-professional)
- `src/views/DeliverFocusView.jsx`: Removed nested `FocusShell`, extracted `exitFocus`, removed `console.log`, flattened shipped-state markup, switched to `focus-chip-row` class

---

## Remaining TODO

### Resolved (2026-07-25 sweep — most of this backlog was stale)
Checked all 6 items below against current code before touching anything:
1. `ReviewFocusView.jsx` nested FocusShell — **already fixed**, no nesting exists (4 clean single-shell branches, `onExit` wired on all).
2. `console.log`/`alert()` in Preview components — **already clean**, none found.
3. `InsightsView.jsx` `'Start 2'` dead code — **already gone**.
4. `DefineView.jsx` DOM mutation (`e.target.value = ''`) — **already gone**.
5. `cloudSync.js` `withTimeout` timer leak — **already fixed** (`.finally(() => clearTimeout(timerId))` present).
6. Export buttons allow double-click — **fixed this session** (commit `0090289`): `exportBusy` guard in `runExport()`, panel buttons disabled while exporting.

Remaining a11y sub-items from #6 — re-verified 2026-07-25:
- **Modal focus-trap coverage** — found 2 real gaps: `demoTour` and
  `showCreativeReset` dialogs had `role="dialog"` but no `useModalFocus()`
  call, so Tab could escape them. Fixed: added `useModalFocus` for both
  (`App.jsx`).
- **Command palette ARIA structure** — no command palette exists anywhere
  in the codebase (only a leftover CSS comment). Item was stale/moot.
- **Skip-link DOM order** — already correct; `.skip-link` renders before
  `header`/sidebar/`main` in normal flow (the one exception, `ForcedBreakOverlay`
  rendering before it during a forced break, is a full-screen blocking
  overlay anyway, so order doesn't matter there).

### LOW — Graphic design agent known-remaining items
- `border-radius` inconsistency: many hardcoded `8/10/12/14/16px` values coexist with the `4px` token language. Broad normalization would touch ~16k-line `index.css` — deliberately left alone (2026-07-25): the risk of a blind pass breaking unrelated rules outweighs a cosmetic consistency win. Revisit with a scoped, reviewed diff if picked up again, not a sweep.
- `EmptyIllustration.jsx` has mixed stroke weights (4/2.25/2/1.75/1.5) — intentional for a decorative illustration, not a bug.

---

## Mood-board / Research enhancement roadmap (2026-07-24)

Evaluated a broad mood-board feature wishlist against this app's actual shape — a
guided 7-step workflow (Define→Research→Ideate→Sketch→Design→Review→Deliver)
with a masonry mood board inside Research, not a freeform canvas tool. Filtered
to what extends the existing architecture vs. what would fight it.

### Phase 1 — DONE (commit `9c12599`)
1. **Link Parser for Research URL pins** — done. `submitBoardUrl()` now calls
   a deployed Supabase Edge Function (`link-preview`, project `shzkqbtoepqqdkjgupry`)
   that fetches the target URL server-side and parses `<title>` / OpenGraph
   tags. Shows a real preview (title + image + source host); falls back to
   treating the URL as a direct image if parsing fails or Supabase isn't
   configured.
2. **Color swatches extracted from mood images** — done. `src/lib/extractColors.js`
   does client-side dominant-color sampling (canvas `getImageData`) on each
   uploaded image pin. Suggested swatches show under the pin; clicking one
   calls `addPaletteColor(hex)`. Verified end-to-end (extract → click →
   palette updates). Note: extraction silently no-ops for pasted external
   image URLs without permissive CORS headers (by design — see commit
   message for the crossOrigin tradeoff); works reliably for local uploads.

### Phase 2 — DONE (2026-07-25)
- **Eyedropper** — done. Click anywhere on a pin's lightbox image to sample
  that exact pixel and add it to the palette (`sampleColorAt()` in
  `src/lib/extractColors.js`, wired in `ResearchView.jsx`'s lightbox).
- **Crop-focus control** (replaces the originally-scoped "aspect-ratio
  cropper" — see rationale below) — done. "Adjust crop focus" button in the
  lightbox lets you tap where the image should be centered when it's
  cover-cropped into the small tile/pack thumbnail (`setMoodPinFocal` store
  action, `pin.focalX`/`focalY` consumed by `pinFaceStyle()` in
  `moodPins.js`). A full drag-to-crop-any-aspect-ratio UI was scoped down to
  this single-tap control — it gets the same real problem (an
  auto-center-crop cutting off the important part of an image) solved with
  zero extra decision screens (no aspect ratio picker, no confirm step),
  matching the app's decision-fatigue-first design rule.

### Someday / maybe (explicitly deferred — conflicts with the app's guided-workflow design)
- Infinite canvas, layer ordering (bring to front/back) — the app is
  intentionally a structured masonry grid inside one step, not a freeform
  board; this would fight the existing architecture rather than extend it.
- Texture/pattern library, integrated stock-asset search — large scope,
  third-party licensing/API dependency, not core to the workflow.

---

## Running to-do list ("fridge list") — DONE (commit `66c0b0b`)

Per-project todo list, deliberately kept separate from the existing desk-tasks/
quick-add system. `src/components/RunningTodo.jsx` (popup + drawer),
`src/lib/runningTodoStages.js` (keyword stage tagging), store fields/actions in
`useAppStore.js` (`runningTodo`, `addRunningTodoItem`, `toggleRunningTodoItem`,
`removeRunningTodoItem`, `sortRunningTodo`, `resetRunningTodoIfNewDay`).

Behavior: centered "anything to add?" popup on every project open (any view) →
items keyword-tagged to one of the 7 stages, falling back to the current
stage → stays flat until "Sort" is pressed once → then groups by stage with a
"Start here" badge on the first incomplete item per group → "Add to list"
button opens the same popup and new items auto-file into their stage group
without re-sorting → daily reset clears completed items only, keeps
unfinished items and the sorted state.

### Open follow-ups
1. **Research-page popup collision** — DONE (2026-07-25). `ResearchView.jsx`
   now reports `boardAddMode` open/closed up via a new `onAddPinModeChange`
   prop; `App.jsx` suppresses `RunningTodoAddModal` while it's true, so the
   running to-do prompt and Research's own inline URL/Note add-pin popover
   never compete for attention.
2. **Mobile drawer vs. bottom sheet** — shipped as a full-width drawer on
   ≤640px (not a distinct bottom-sheet redesign). Revisit once tried on an
   actual phone.

---

## Real-project fit gaps — Sparrow's Promise Brand Clean-Up (2026-07-24)

App is built for creating a brand from scratch (Define→Research→Ideate→
Sketch→Design). This real project is audit-and-document an *existing* brand
(explicitly "no new logo design, no rebranding, no strategy") — Ideate/Sketch
don't apply; work goes Define (scope) → Design (document what exists) →
Deliver. All 4 approved phases DONE (commits `c46036b`..`d45ff42`):

### A. CMYK on every palette swatch — done (`c46036b`, `eaf3ed8`)
Turned out clear-space/min-size/logo-don'ts/imagery-guidelines already existed
end-to-end (initial gap analysis was wrong there) — only real gap was CMYK,
which existed for the 4 role rows but not the full palette swatch grid, the
markdown export, or the in-app BrandArtboard preview. Fixed all three, reusing
the existing `colorSpec()`/`hexToCmyk()` in `brandSystem.js`.

### B. In-app asset-audit tracker — done (`0f8642b`)
New "Asset audit" collapsible section in Define (above Tools). Log each
existing file, tag usable/outdated/missing, optional note + thumbnail.
`src/components/AssetAudit.jsx`, `assetAudit[]` per project.

### C. Real fillable brand-recognition templates — done (`fbffb2e`)
New "Stationery" tab in Design: letterhead (8.5x11in), business card
(3.5x2in, per contact), envelope (#10), email signature (HTML+PNG) — all
filled with real palette/type/logo/org contact info and exported at correct
physical page sizes via `src/lib/stationery.js`. Verified: downloaded and
opened a valid letterhead PDF.

### D. Lightweight hours/invoice tracker — done (`d45ff42`)
New "Hours & invoice" Tools-menu entry, drawer UI matching the running
to-do panel. Log dated hours against a rate, see running totals, export a
simple itemized invoice PDF (`src/lib/invoice.js`). Verified: totals math
correct, valid PDF downloaded.

All 119 tests pass; each phase verified end-to-end in a headless browser
before commit.

---

## Feature ideas — not yet scoped, not yet built

### Client contract signing before work begins
User needs a contract the client signs before any work starts. Natural home
is the new client portal (`/c/:portalId`) — it already has the client's
attention, no-login access, and a step-gating model, so a "sign before the
project unlocks" gate fits the existing shape. Not designed yet — open
questions: does the studio upload their own contract PDF or does the app
template one; is a typed-name + timestamp signature enough or does this
need real e-signature/audit-trail rigor (legal question, not a UI one);
should an unsigned contract actually *block* pushing steps to the client
or just show a warning. Do not build until asked. Run through the
`adhd-executive-function-advisor` before design — a hard gate that blocks
work is exactly the kind of thing that can wreck task initiation if the
user is ready to start and the client hasn't signed yet.

---

## Seven-agent Project overview audit — all 5 fix batches shipped (2026-07-26)

Fan-out of 5 specialist agents (ADHD advisor, UX, UI, code review, graphic
design) + the user's 2 custom skills (layout-integrity, ux-workflow-audit —
both ran the live app in a browser). Findings verified against HEAD, deduped,
approved by the user in batches, and shipped:

- **A — 9 bugs** (v1.48.172): per-keystroke analytics exception, double-click
  focus mask, "Add a task" page ejection, zero-width milestone input, two
  360px overflows (live-verified), backwards title row, focus-stealing
  auto-jump, milestone id collisions + stale exports.
- **B — contrast/a11y floors** (v1.48.176): --field-line token for input
  boundaries, themed 2px focus + restored keyboard ring, opacity-stacking
  text failures onto solid tokens, 44px touch targets, reduced-motion
  gating, heading/ARIA structure.
- **C — 11 advisor-gated design changes** (v1.48.174): start-here emphasis
  (3 filled chips max), weight tiers, deadline-phrase promotion, capture
  input removed (snapshot moved to header band), field type onto ramps,
  date-field consolidation (startDeadline/launchDate/format deleted),
  plain-language labels, tips-as-placeholders, mobile single-accordion +
  no rail, per-project defineOpenChapter, milestones under deadline with
  8s undo, 5-col rail with short labels.
- **D — first-run copy** (v1.48.178): login explains the app + no-reset
  password warning + upfront rules, "Anything to add?" first-open
  suppression + context + Esc + 390px fix, client-first new-project card,
  jargon toast reworded.
- **E — dead code + test hardening** (v1.48.180): -763 lines of verified-dead
  JSX/CSS/schema; typography.test.js gained 3 guards (opacity-on-text,
  font-size off-ramp, deleted-selector resurrection) — each verified to
  fail when its bug is reintroduced.

Still open from the audits (not approved, low priority): breakpoint
unification (560/600/640/767 disagree between 561-767px), "0/6 notes" vs
rail-count noun mismatch, autosave pulse debounce, named-milestone concept.

## Feature ideas — built 2026-07-25

Both items below were previously logged as "not yet scoped, do not build
until asked." The user explicitly asked for them to be built. Consulted
`adhd-executive-function-advisor` first per CLAUDE.md and scoped each down
to the minimal shape it recommended (see below) rather than the original
open-ended version, specifically to avoid decision fatigue / blank-canvas
paralysis / shame-coded dead ends.

### Custom brand guide cover — DONE
Scoped down from "upload a whole layout/template" (blank-canvas paralysis,
format-choice decision fatigue) to: drop an image directly onto the export
panel's live cover preview to use it as the brand book cover art. Zero
required configuration — export works identically whether you customize it
or not; the live preview itself (`BrandArtboard` inside the export panel)
is the ambient "this is my brand" evidence the user asked for elsewhere.
Reuses the existing `setLogoImage` store action + `assetService.uploadImage`
upload path already used by Design → Logo, just reachable via drag-and-drop
right where the export preview already lives, with no navigation away.
`App.jsx` (`handleCoverImageDrop`, `.export-artboard-wrap` drop handlers),
`src/index.css` (`.export-cover-drop-hint`, `.is-cover-drop-active`).

### Project overview: export / client portal / paper-scan import — DONE (2026-07-25)
Three paths, all reachable from Tools → "Share project overview":
1. **Export a PDF of this page** — formatted, multi-page PDF of the actual
   Define/`DETECTIVE_CHAPTERS` fields (`downloadProjectOverviewPdf()` in
   `exportFiles.js`).
2. **Client dashboard link** (`/c/:portalId`, no login — mirrors the
   existing `/f/:shareId` pattern) — studio pushes individual journey steps
   to the client, client sees only those, and can approve / request changes
   with a note, chat with the studio, and fill in the Project overview form
   themselves. A submitted form merges into `project.detective` via
   `mergeDetectiveAnswers` (never blanks an already-filled field).
   New tables `public.client_portals` + `public.client_portal_messages`
   (owner-only RLS) with anon-callable SECURITY DEFINER RPCs; client code
   in `src/lib/clientPortal.js`, `src/components/PublicClientPortal.jsx`,
   studio side in `src/components/ProjectOverviewShare.jsx`.
3. **Print blank / scan back in** — download a blank ruled PDF for a client
   to fill by hand, then upload a photo/scan. `tesseract.js` OCR
   (`src/lib/overviewOcr.js`) *proposes* answers matched against known
   field labels; a mandatory review/edit screen shows every extracted line
   before anything saves. Deliberately never auto-fills silently —
   handwriting OCR is unreliable and a wrong silent overwrite is worse
   than no import.

### Highlight-to-explain — DONE
Scoped down from a live/LLM explain-anything feature (which would need a
backend LLM call this client-only app doesn't have, and would need a
"sorry, no explanation available" fallback that reads as a shame-coded dead
end) to: a fixed glossary of real design/brand jargon terms used across the
app. Selecting a *known* term shows a small, centered (per the modal-
centering rule) plain-language explanation immediately — no intermediate
"Explain simply" button, no confirmation step. Selecting anything
unmatched does nothing at all, so the feature can never fail visibly; it's
either a small win or invisible. `src/lib/glossary.js` (curated term list +
`lookupGlossaryTerm()`), `src/components/HighlightExplain.jsx` (selection
listener + popover), mounted globally in `App.jsx`.

---

## Next session starting point

1. Start with **ReviewFocusView.jsx** nested FocusShell fix (HIGH #1) — it's the natural continuation of the UX agent's work
2. Remove **console.log / alert** calls from Preview components (HIGH #2) — quick wins
3. Address MEDIUM items in order (DefineView controlled select, cloudSync timer, App.jsx a11y)
4. After all fixes: run `npm run bump` to increment the version


---

## PARKED — Helper bot doing side tasks (2026-07-27)

Scope agreed, deliberately deferred. Recorded so it does not need re-deriving.

**What was decided:** Helper should take on side tasks on demand — you ask,
it works, you get a result in a few seconds. Not background/queued. All three
task classes are wanted eventually:
- **Writing drafts** — client emails, brief summary, "why ★" notes for
  starred pins, a direction statement from the research board, palette names.
- **Tidying** — dedupe near-identical pins, sort/stage-tag the running to-do,
  propose which 6 pins to star and why.
- **Fetching/enriching** — proper link previews, palette extraction and
  naming from pinned images, tracing an image's source.

**Hard constraint:** Helper must never write to the brief, board or palette
directly. Every result is a draft the user accepts or bins. CLAUDE.md treats
silent state changes as a failure mode, and a bot quietly editing the project
is the purest form of one.

**Two blockers, in order:**

1. **Helper is not currently an AI.** No `VITE_XAI_API_KEY` is set, and
   `helperAi.js` falls back to the scripted replies in `buddy.js` whenever
   the key is missing. Every Helper response today comes from a lookup table.
2. **The key cannot simply be added.** Vite inlines `VITE_*` values into the
   bundle at build time, so a real key would ship to every visitor's browser
   and be trivially extractable. `helperAi.js` says as much in its own header.
   A `helper-chat` Supabase edge function holding the key server-side is the
   precondition — same shape as the existing `link-preview` function.

**Existing queue to build on:** the running to-do already stores items tagged
by stage (`runningTodoStages.js`), so Helper does not need a new task system —
only the ability to pick up an item and return something.

---

## Domain note — Ideate vs Sketch (for those pages)

Supplied by the owner, 2026-07-27. These are two different things and the
app should not treat them as one:

**Ideation is the process** — a broad cognitive phase for generating and
exploring many concepts. Divergent, not visual by necessity: mind-mapping,
word banking, "what if" questioning, listing. The goal is VOLUME and RANGE
over quality, keeping concepts cheap and malleable before committing to any.

**Sketching is a tool** — a rapid, informal visual rendering used to get a
thought out of the head and onto paper or screen. It is one vehicle used
WITHIN ideation, aimed at immediate visualisation, fast iteration on a single
theme, and communicating spatial or structural thinking.

Implication for the app: Ideate should support non-drawing methods (lists,
word banks, prompts, "what if"), and should reward quantity — a page that
asks for one good idea is modelling the wrong thing. Sketch is where a single
theme gets drawn and iterated. Check whether the current SparkView/Ideate
pushes toward one polished answer instead of many rough ones.

## Helper bot — time tracking and the daily report (2026-07-27)

Requested alongside the parked Helper work above; same blockers apply.

**Wanted:** Helper tracks time worked, builds a spreadsheet of what was worked
on and for how long each day, and sends a daily report.

**Foundation now in place:** the Research timer auto-starts on arrival and no
longer navigates away, so a stage visit is already a timed session with a
`timerFocusSource`. The other stages still start theirs manually — do the same
there before building any reporting on top, or the data will have a hole in it
shaped like every page except Research.

**Design constraints, from CLAUDE.md and this session:**
- The report must not be built out of raw clock numbers as its primary
  reading. The owner has stated plainly that they have no concept of time and
  numbers do not register. "2h 14m on Research" is the wrong shape; relative
  and comparative forms are the direction to explore.
- Consult `adhd-executive-function-advisor` before designing the stats view —
  CLAUDE.md names this specific feature and says to.
- A daily report is an outbound message on a schedule. Anything that sends on
  the user's behalf needs explicit confirmation per send, or an explicit
  standing opt-in the user set up knowingly.
- The spreadsheet is a real artefact: decide whether it is generated on demand
  (xlsx/csv download) or written to a connected service. On demand is simpler
  and needs no new credentials.
