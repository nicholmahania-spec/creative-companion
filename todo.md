# Creative Companion — Work Log & TODO

> Last updated: 2026-08-01
> Branch: `main` on `nicholmahania-spec/creative-companion`
> Build: **green**, 578 tests / 76 files passing at `4198cd2`, v3.6.1

---

## OPEN WORK — read this section, the rest is a log

Everything below this section is a record of what was done, kept for the
reasoning. It is not a list of what is left. These are:

- **The Helper answers, but has nothing to say.** Its prompt gives it a
  voice, the journey, and a list of prohibitions — almost no substance about
  brand practice. Raising the word ceiling (2026-08-01) lets a thin answer be
  longer; it does not make it deeper. This is the real remainder of the
  owner's verdict, "it has no skills". The books already cited in CLAUDE.md
  (Slade-Brooking, Bokhua, Kholmatova, Rutter) are the obvious source.
- **Widening what the Helper may do.** It can propose `add_task` and
  `split_task`, and nothing else, on purpose — the brief and anything
  destructive are excluded because they overwrite a client record with no
  undo. `helperActions.test.js` fails if that list grows, so widening it is a
  deliberate act. Worth revisiting only with a permission model, not by
  adding an action.
- **Three live copies of this app, and only one works.**
  - Vercel `creative-companion-ten.vercel.app` — production. The Helper works
    here and nowhere else.
  - GitHub Pages `nicholmahania-spec.github.io/creative-companion/` — builds
    from main, looks identical, and structurally CANNOT run the Helper: it is
    static hosting with no serverless functions. Cost most of an evening on
    2026-08-01, twice, because nothing on screen says which copy you are on.
  - Netlify `creativecompanion.netlify.app` — last deploy errored 2026-07-19,
    404s. CLAUDE.md still calls it "the primary deploy target".
  Pick one, retire the others, or at minimum make each say which it is.
- **The Pages Helper blames your connection.** It says "I can't answer
  questions without a connection" when the truth is that copy has no backend.
  Misleading in the one place the app is supposed to be honest.
- **Never `vercel deploy --prod` from the CLI on this project.** It uploads
  the local working directory and overrides the Git build — its metadata even
  records `githubCommitMessage: "initial commit"`, `gitDirty: 1`. On
  2026-08-01 this silently shipped a pre-merge bundle to production three
  times, removing the Helper's input each time and making a fixed bug look
  unfixed. Let GitHub drive deploys; merging to main is the deploy.
- **Focus Mode entry points** — missing on Ideate / Sketch / Design / Review /
  Deliver. Only Research's was removed.
- **Ideate page** — untested whether SparkView actually pushes toward many
  rough concepts rather than one good one. Ideation is the divergent phase;
  sketching is a tool inside it.
- **Brief PDF in the brand book** — a handover record, not a form.
- **Pomodoro → Helper** link.
- **~12 cosmetic Research findings** — `#e7e5e4` fallback, note-input box vs
  underline, dead hero ring.
- **Research phases 3–7** — not started. Spec in `docs/RESEARCH_PHASES.md`;
  read it before picking any of them up.
- **Client contract signing** — scoped and ready to build (see below).
- **Font packs** — real typefaces beyond the built-in pairs (see below).
- **Gap 1, logo-only path** — specced 2026-08-01, not built.
- **Mobile drawer vs bottom sheet** — shipped as a full-width drawer; revisit
  once tried on an actual phone.
- **`conceptPackage`** — gone from `src/` (only lived in old audit docs).
  Do not reintroduce.
- **CSS override layers** — `shell.css` budget **412** `!important` (down from
  442, 2026-08 prune: removed duplicate mobile journey lock /
  `width:max-content` that clipped stages). Keep ratcheting down by fixing
  base rules; never raise the budget.
- **Netlify is dead** — last deploy errored 2026-07-19 and
  `creativecompanion.netlify.app` 404s. Production is Vercel. CLAUDE.md still
  calls Netlify the primary target, which sent a whole session chasing the
  wrong host.

---

## The research phases — see `docs/RESEARCH_PHASES.md`

44 links researched 2026-07-28 produced 28 implementable items and a 7-phase
plan. The plan lived only in a chat that was then cleared; it was recovered
from the session transcript and written to `docs/RESEARCH_PHASES.md`. **Phase 1
(`e39ba7e`) and Phase 2 (`bfc1c5c`) are done. Phases 3–7 are not started.**
Read that file before picking up any of them.

---

## Session 2026-07-28 — the invoice becomes payable (Phase 2)

The invoice printed five things: Invoice, Date, Note, Hours, Amount. No
invoice number, no due date, no payment method, no contact details for the
person being paid — a client who wanted to pay had to email and ask, and an
unnumbered invoice is unreconcilable at either end come tax time. It also
could only express hours, so a fixed-price project had to be invented into
hours that multiplied out to the agreed number.

**Now:** `src/lib/invoice.js` exports `lineAmount` / `invoiceTotals` /
`dueDateFrom` (one answer to "what is owed", shared by the panel and the PDF
so they can never disagree). Lines are hourly *or* flat `amount`; a flat line
prints `—` / `Fixed` rather than a misleading "1 x total". Header carries
invoice no. + issued + due; FROM / BILL TO blocks; optional tax row; HOW TO
PAY and NOTES tails. Studio identity lives in `prefs`
(`invoiceFrom`, `invoicePaymentMethods`, `invoiceTerms`, `invoiceNotes`,
`invoiceTaxLabel`, `invoiceTaxPercent`, `invoiceNextNumber`, `invoicePrefix`)
— the same on every invoice — while `hourlyRate` stays on the project because
it is negotiated per client. `takeInvoiceNumber()` claims a number at export,
not on panel open, so the sequence has no gaps.

**Finished this session** (the above was mid-flight in the working tree):
- Dropped an unused `lineAmount` import from `HoursInvoice.jsx`.
- Added the three missing styles — `.hours-invoice-due`,
  `.hours-invoice-settings`, and `.hours-entry-row-3` (the entry row is a
  2-col grid; a third input squashed the date field below its own text).
- `invoiceTerms` falls back to 14 in the panel: `migrate` only re-merges pref
  defaults for workspaces saved *before* v5, so a workspace already at v5 has
  no key and would silently lose its due date.
- Reworded "Due X on today's date" → "Due X if sent today".
- New `src/lib/invoice.test.js` — 14 tests. Arithmetic (mixed hourly/fixed,
  tax on subtotal not per line, no NaN on empty), terms (month rollover, no
  mutation of the issued date, empty on missing terms), and three that
  generate a **real PDF and read its text layer back with pdfjs** to assert
  the number/due/payment/contact all print, both line shapes render, totals
  come out at $1440 / $1728, and the tax row is absent entirely at 0%.

**Not verified live.** The Hours & invoice panel sits behind the Supabase
login, so the running app could not be driven to it. Everything above is
verified by build, full suite, and real generated PDFs.

## Session 2026-07-27 — wide monitors, and untangling the clock from the timer

### Shipped

| Commit | What |
|--------|------|
| `15e6020` | Separated the work clock from the Pomodoro (count-up got its own interval + running condition) |
| `7babba3` | Wide monitors: split the one max-width into `--shell-max` and `--read-max` |
| `b1da29b` | Unlinked the work clock from the invoice — `workLog` vs `timeLog` |
| `b0e649e` | Stopped the Timer view rendering the work clock; fixed `STAGE_VIEWS` |

### Wide monitors (`7babba3`)

Everything was capped at `min(1440px, 94vw)`. At 2000px that left 280px dead
either side and huddled the header controls in the middle. Two caps now:

- `--shell-max` = `min(2400px, 96vw)` — header, journey bar, **and the mood
  canvas**. A canvas is not prose; it was rendering ~720px wide.
- `--read-max` = `min(1440px, 94vw)` — prose and forms, unchanged.

Measured after: header spans 40→1960, canvas 1742px, Define still 1440, no
overflow at 375px.

### Clock vs timer vs invoice

Three separate confusions, all the same mistake — the two clocks shown
through each other. See CLAUDE.md for the durable rules.

1. **Clock ≠ Pomodoro.** The count-up ticked inside the Pomodoro's interval,
   so the record died at 25 min and forced a break.
2. **Clock ≠ invoice.** `logWorkedTime` wrote into `timeLog`, which the
   invoice bills from. Now writes `workLog`. Persist v5 migration lifts
   existing `auto: true` rows across; `liftMeasuredRows` (in
   `src/store/workLogSeparation.js`) re-checks on **every** load, applied via
   `setState` so the correction persists. 5 tests.
3. **Clock ≠ Timer view.** The Timer page's readout rendered `sessionLabel`
   (the clock's count-up), so it looked like a running timer nobody started.
   Now shows the countdown / "not started". The clock chip opens its own
   `WorkLogPanel` instead of navigating to the Timer.

### Bug found while fixing the above

`STAGE_VIEWS` in App.jsx was a hand-typed list of stage *names* — `'define'`,
`'research'`, `'ideate'`, `'sketch'`, `'design'`, `'deliver'`. The real view
ids are `'project'`, `'studio'`, `'spark'`, `'flow'`, `'brand'`, `'review'`,
`'finish'`. **Only 2 of 8 strings were real**, so the work clock was silent on
5 of the 7 stages — an afternoon in Design recorded nothing. Now derived from
`JOURNEY_STEPS`.

### Still open

- **Focus Mode entry points** on Ideate / Sketch / Design / Review / Deliver —
  only Research's was removed.
- **Ideate page** — Nichol's framing: ideation is the broad divergent phase
  (volume and range over quality), sketching is the rapid visual tool *within*
  it. Test whether SparkView pushes toward many rough concepts or one good one.
- **Helper bot** — no longer blocked (2026-08-01): the key and the proxy both
  exist. See "Helper bot doing side tasks" below.
- **Brief PDF** in the brand book — a handover record, not a form.
- **Pomodoro → Helper** link.
- ~12 cosmetic Research findings (`#e7e5e4` fallback, note-input box vs
  underline, dead hero ring).

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

### Reverse audit (2026-08-01) — the logo-only path. Gaps 2 & 3 DONE, Gap 1 SPEC

A reverse audit — starting from what the client actually receives and tracing
backward — found three holes on the path a *logo-only* job takes. Two are
built; the third is specced here, ready to build, not built.

**Gap 2 — DONE (`55919f9`).** Progress and readiness counters measured a
logo-only job against colours, tagline, voice and a 21-page book the client
never bought, so a finished job read "3 to go" / "Ready · 4/8". `progressItemInScope`
now reads the brief's `deliverablesPicked` and drops out-of-scope checks; the
Deliver chip names the state ("Ready to ship" / "Still to add: …") instead of
a fraction. *ADHD why:* "3 to go" on finished work is a blame signal with no
valid action behind it (rejection sensitivity), and a fraction is the one
representation this user has said does not register.

**Gap 3 — DONE (`baf606b`, v3.6.0).** The only finish button produced a brand
book — the wrong artifact for a mark-only job — so the project could not close
in-app. `isLogoOnlyScope` routes the Deliver primary CTA to "Download logo
files" (`runExport('mark')` → `downloadMarkPack`): the real uploaded mark in
its actual format + an honest README naming what is and isn't in the pack. The
book stays under More formats. *ADHD why:* an unfinishable last step is where a
time-blind, initiation-challenged user stalls hardest.

**Gap 1 — SPEC, ready to build, NOT built. Present 2–3 logo concepts, client picks one.**

The problem the reverse audit hit: the app has exactly one mark slot
(`logoImage`). Real identity practice (Bokhua, *Principles of Logo Design*,
Ch. 4) presents 2–3 distinct concepts and the client chooses. Today a designer
who makes three has nowhere to stage them and no way to route the chosen one —
the losing concepts live in a folder outside the app, and "which one did they
approve" is re-derived from memory or a scroll-back through email.

*Why it's a problem for ADHD — four parts, per CLAUDE.md:*
- **Problem:** multiple concepts have no home in the tool; only the single
  final mark fits.
- **Why for ADHD:** object permanence + working memory — a concept kept
  outside the app is invisible and therefore gone; the chosen-route question
  becomes a recurring working-memory tax, re-answered every time it comes up.
- **Solution:** a `logoConcepts: []` array per project, shown as an
  always-visible thumbnail strip on Identity; one concept is starred as the
  chosen route, and starring writes that image into the existing `logoImage`
  so everything downstream (Deliver, book, portal) is unchanged.
- **Why the solution helps ADHD:** the strip is ambient, not remembered
  (object permanence); starring is one gesture (no decision fatigue); the
  chosen route flows downstream automatically (no "remember to copy the final
  one into the deliverable" step — interruption recovery).

**ADHD-advisor shape, baked in — do not redesign from scratch when picked up:**
- **No concept-count prompt.** The app never asks "how many concepts?" — you
  add them one at a time as you make them. Zero, one, or three are all valid;
  the strip just shows what exists. Asking up front bills a decision at the
  blank-canvas moment, which is exactly the friction to avoid.
- **Star, don't sort.** One ★ marks the chosen route. No ranking, no
  ordering step, no "archive the rejects" chore — the unstarred concepts just
  stay on the strip as the record of what was explored.
- **Reuse, don't reinvent.** Concept thumbnails reuse the existing
  `assetService.uploadImage` path (same as Design → Logo). Starring reuses the
  `setLogoImage` write so no downstream code changes. This is additive.
- **Nothing else.** No separate Concepts page or nav item, no per-concept
  metadata form, no "present to client" wizard.

**Open decisions — left open on purpose, confirm before building (do not
pre-decide these):**
1. **Migrating an existing single mark.** A project already carrying a
   `logoImage` should become "one starred concept" on first load — but decide
   whether `logoImage` stays the canonical downstream value (starring writes
   it) or becomes derived from the starred concept. Recommend the former: keep
   `logoImage` as the single source everything reads, so the migration is
   purely additive and nothing downstream is touched.
2. **Client-facing selection.** The `/c/:portalId` portal already carries
   per-step approve / request-changes. Whether the client can star a concept
   themselves (feeding that existing approval) or only the studio stars is a
   real scope fork — the studio-side strip + star is the core; client-facing
   selection is a clean phase 2, not part of the first build.
3. **Where the losing concepts appear in the deliverable, if at all.** A
   "concepts explored" page in the book is defensible as a record, but it is
   also the kind of thing that turns a mark handoff into a bigger document —
   decide per the job's scope, not globally.

**Blocked on:** nothing technical — the upload path, the store, and the
downstream `logoImage` consumer all already exist. Blocked only on the three
open decisions above being confirmed, since each is a design call that is mine
to propose and the owner's to make.

### Client contract signing before work begins — SCOPED, ready to build (2026-07-28)

Decisions locked in by the owner:
- Studio uploads their own contract PDF — app does not template/generate one.
- Real e-signature via **Dropbox Sign** (chosen over DocuSign/SignWell — cheaper,
  simpler API, well-trodden for small tools). Needs an owner-created Dropbox
  Sign account + API key before any of this can be built — same precondition
  as the Helper-bot blocker below: the key must live in a Supabase edge
  function server-side, never in the app bundle.
- An unsigned contract shows a **warning only, never blocks** pushing steps
  to the client portal — matches the standing rule that a hard gate blocking
  ready-to-start work is exactly the friction this app exists to remove.

**ADHD-advisor review complete (2026-07-28), findings baked into the flow
below — do not redesign from scratch when this gets picked up:**

- **Not a third parallel link system.** This app already runs two —
  `discovery_shares` and `client_portals` — each its own "create link / copy
  / poll status" shape behind a modal-menu fork. A third instance for
  contracts would triple the "which link was that" working-memory tax.
  Instead: contract fields (`contract_file_path`,
  `contract_signature_request_id`, `contract_status`) live as **columns on
  `client_portals`** — same portal the client already has, one id, one
  status surface. If no portal exists yet, uploading a contract creates one
  (reuse `createClientPortal`).
- **One gesture, zero follow-up choices.** Uploading the PDF does everything
  downstream automatically: Storage upload → create portal if missing →
  create Dropbox Sign request against the client email already in
  `project.detective` → mark sent. No signer-details form, no "send now or
  later?" fork, no confirmation modal.
- **Warning lives in the permanent header chrome, not a modal or a footer**
  — per the user's own rule ("if its at the bottom - I won't see it or use
  it") and the "Anything to add?" lesson (a recurring nudge whose answer is
  always "push anyway" is a toll, not a prompt). One line, same fixed spot
  on every screen: **"Contract — not sent"** with the upload control inline.
  Name the artifact, never the omission ("you haven't...").
- **Status is never time-based** — "I have no concept of time and numbers
  mean nothing" already ruled this out for the work clock; same applies
  here. Three states only, each naming its own next action:
  - `Contract — not sent` (+ Upload contract PDF)
  - `Contract — with [Client] to sign` (+ Copy link, + Nudge)
  - `Contract — signed` (+ View signed PDF)
  No "sent 3 days ago," no countdown, no reminder schedule.
- **Return-trip state must update itself.** Signing happens off-app in
  Dropbox Sign's UI. Preferred: a webhook into the same edge function that
  holds the API key, writing `contract_status`; the existing `PortalMode`
  30s poll and `useClientInbox` give the refresh for free. Fallback if a
  webhook is more than budgeted: reuse the existing manual "Check for
  client's answers" pattern (`DiscoveryBrief.jsx:398`), but surface it in
  the header line, not inside a modal.
- **Nothing else.** No settings/toggle to suppress the warning (a second
  decision to stop the first), no separate Contracts page or nav item, no
  countdown/reminder-cadence UI.

**Blocked on:** owner creating a Dropbox Sign account and API key. Nothing
else stands between this plan and implementation.

### Font packs — real typefaces beyond the built-in pairs
Proposal from another session (pasted here 2026-07-28, not yet evaluated
against this codebase's actual `TYPE_PAIRS`/artboard code). Two tiers:

- **A) Catalog/pairing pack (light)** — a JSON list of heading/body pairs
  referencing Google Font family IDs + a Google Fonts CSS URL. "Download
  into the platform" = load the JSON (bundled, URL, or upload), write
  `typeHeading`/`typeBody`, inject the Google CSS link for the session.
  Preview-only — the artboard shows the real face, the brand-book PDF still
  falls back to Helvetica unless the font is embedded separately.
- **B) Self-hosted font pack (real files)** — a zip (`pack.json` metadata +
  `fonts/*.woff2` + `license.txt`). User uploads the zip, browser unpacks,
  files go to IndexedDB (or Supabase Storage when signed in), registered via
  the `FontFace` API, pack id bound to the project. Needed for offline use,
  licensing control, and eventually true PDF font embedding (base64 into
  jsPDF — heavier, separate step from preview).

Suggested order if built: (1) richer built-in `TYPE_PAIRS` + auto-load
Google CSS on selection when online, (2) zip upload → IndexedDB + FontFace,
(3) brand-kit export/import of `typography.json` (+ fonts if self-hosted).
Rules noted for the file-pack format: WOFF2 only, one file per weight
actually used (not the whole family), OFL/license-checked, pack under
~1-2MB so mobile Identity stays snappy. Do not build until asked — not yet
evaluated against this app's real data model, and needs an ADHD-lens pass
on the import UI (a zip-upload flow with a metadata file is a place decision
fatigue can hide if it's not just "pick a pack, done").

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

## Next session starting point — REMOVED 2026-08-01

This section listed four items and every one of them was already resolved,
several by the 2026-07-25 sweep recorded further up this same file. Following
it sent you to fix `ReviewFocusView.jsx` nesting that does not exist and to
strip `console.log` calls that are not there.

Deleted rather than rewritten. A "start here" pointer that outlives its work
is worse than none: it is confident, specific, and wrong, and it costs a real
investigation before anyone doubts it. The live list is **OPEN WORK** at the
top of this file.

---

## Helper bot doing side tasks — UNPARKED 2026-08-01

**The blocker is gone.** This was parked on "xAI key + server-side edge
function". Both now exist: `server/xaiProxyCore.mjs` is deployed on Vercel
behind real Supabase session auth (an anonymous POST to
`/api/xai/chat/completions` returns 401 "Sign in required"), and `XAI_API_KEY`
was set in Vercel production on 2026-08-01 with a deploy after it.

Not verified end to end from outside: the proxy checks auth *before* the API
key, so an unauthenticated probe returns 401 whether the key works or not.
Signing in and sending one message is the only real test.

Scope below was agreed and is recorded so it does not need re-deriving.

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

**Pomodoro is Helper's, not the timer's.** Requested 2026-07-27: the
Pomodoro should be linked to the Helper bot. The split that makes sense from
what now exists: the RUNNING timer measures and records work (done — it
auto-starts, excludes idle, and writes to project.timeLog), while the
POMODORO — the 25-minute limit and the forced break at zero — becomes
Helper's job. Helper is the thing with a voice, so it is the right place for
"you have been at this a while", and it already has a break-kit surface in
BuddyMate to hand people into. That also stops the same clock doing two
unrelated jobs: one silently keeping a record, the other interrupting you.

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

## Brief PDF in the brand book — DONE (2026-07-28)

Shipped as its own "Agreed brief" section in `downloadBrandPackVectorPdf`
(`src/lib/brandBookPdf.js`), placed right after Strategy and before Logo
system. Every filled field renders bold question, its `tip` as an "e.g."
example line beneath in the accent colour, then the real answer in its own
shaded box — the common pattern from both reference briefs below. The old
capped-at-8 inline echo in Handoff was replaced with a one-line page pointer
("Full agreed brief — page N") instead of duplicating content that would
drift from the real section. Verified via a real generated PDF (pdfjs-dist
text extraction, not byte-matching) in `exportFiles.test.js`, and caught a
real bug this way: a dozen schema tips already start with "e.g." and the
renderer was doubling it ("e.g. e.g. Sarah Whitton, Owner") — fixed before
shipping.

### Original brief (kept for reference)

Owner supplied two reference briefs for how the completed design brief should
look when downloaded as part of the brand guide book. Deferred; recorded so
the intent is not lost.

**Reference A — VENT Graphics "Your Creative Brief template"**
- Branded header: wordmark top-left, contact block top-right (name, role,
  site, email, phone), role line in the accent colour
- Accent-coloured section heading + one-line explainer beneath it
- Answers sit in ruled boxes with the label INSIDE the box, top-left
  ("Name:", "Project Overview:", "Objectives:")
- Boxes are sized to the expected answer — a name box is one line, an
  objectives box is a deep block
- Small accent-coloured hint UNDER each box, not inside it ("Provide a brief
  description of the project.", "List desired outcomes and deliverables…")

**Reference B — "The Concept Design Brief"**
- Logo + wordmark lockup, then a full-width accent rule
- Short intro paragraph explaining why detail helps
- Two-column body: bold section label in a narrow LEFT column (CLIENT INFO /
  PROJECT INFO / BUILDING DETAILS), all content in the right column
- Each question in bold, followed by "/ For example, …" guidance in regular
  weight — the example is part of the question, not a separate hint
- Explicit "Answer:" label with a bulleted placeholder line
- Footer: page number, dotted leader rule, brand name, document title

**Common pattern to take forward:** a question is never asked bare. Every
field carries a worked example or a format hint, and the answer area is
visually distinct from the prompt. That matches the `tip` rule already in
detectiveBrief — the PDF should render `tip` as the example line rather than
dropping it, which is what the placeholder-only treatment does on screen.

**What already exists to build on:**
- `jspdf` 4.2.1, `pdf-lib` 1.17.1, `pdfjs-dist` are all installed
- `downloadBrandPackVectorPdf()` in `src/lib/exportFiles.js` already composes
  a vector brand book with real font embedding (`setFont` by role) and
  `pdf.addPage()` pagination — the brief becomes a section in that, not a new
  pipeline
- `brand-book.pdf` is already written into the export zip (`exportFiles.js`
  ~line 912), so there is a defined home for it
- `e2e/brand-book-pdf.spec.js` exists, so there is somewhere to assert the new
  section renders

**Resolved — what this document IS.** It ships as part of the concept-to-
delivery package, alongside the logo, palette and guidelines. So it is not a
form and not a worksheet: it is the RECORD OF WHAT WAS AGREED, handed to the
client at the end.

Two consequences for the design:
- Unanswered fields are OMITTED, not rendered blank. An empty ruled box in a
  deliverable reads as "we never did this"; leaving it out reads as "this was
  not part of the scope". Same data, opposite impression. This is the main way
  our version departs from both references, which are blank templates to fill
  in — we should borrow their typography and structure, not their empty boxes.
- The `tip` example text is guidance for ANSWERING and mostly should not
  survive into the handover. Keep it only where the answer is a format or a
  list whose shape the example clarifies; drop it everywhere the answer speaks
  for itself. Decide per field rather than globally.
