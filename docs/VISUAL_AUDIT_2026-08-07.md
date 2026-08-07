# Visual audit — mobile & desktop

**Date:** 2026-08-07 · **Version audited:** v3.51.1 · **Branch:** `claude/visual-audit-fix-review-qjcxmd`

Audit was run against the **built app** (`npm run build` + `vite preview`), driven with
Playwright at two viewports, in both themes:

| | Viewport | Theme |
|---|---|---|
| Mobile | 390 × 844, `isMobile`, DPR 2 | light + deep |
| Desktop | 1440 × 900 | light + deep |

Surfaces walked: Home, Strategy, Research, Identity, Touchpoints, Assets, Brand book,
Review, Insights, Calendar, Settings, Ideate.

Every finding below is backed by a measurement or a screenshot, not an impression.
Nothing here is a proposal to reverse a settled owner decision — where a finding brushes
against one (Define is form-only, no chapter rail, full-width path pages), it is noted as
such and the decision is kept.

---

## Severity key

| | Meaning |
|---|---|
| **P0** | Content or controls are unreachable / an action does the wrong thing |
| **P1** | Works, but materially harms comprehension, hierarchy, or accessibility |
| **P2** | Polish, consistency, wasted space |

---

## P0 — Content is clipped off the right edge of every mobile path view

**Evidence.** At 390 px the app shell renders wider than the viewport and the excess is
hidden, not scrollable:

```
.app          width 390   scrollWidth 475   overflow-x: hidden
.app-shell    width 390   scrollWidth 475   overflow-x: hidden
.header       width 475   min-width: auto   max-width: none    ← the overflowing item
.step-rail    width 475
.main         width 475
html/body/#root  overflow-x: hidden   →  no horizontal scroll available anywhere
```

The clipped width tracks the length of the header's back-link label, so it differs per stop:

| Stop | Shell width | Clipped |
|---|---|---|
| Home | 432 px | 42 px |
| Research | 452 px | 62 px |
| Identity | 456 px | 66 px |
| Touchpoints | 447 px | 57 px |
| **Assets** | **475 px** | **85 px** |

Visible consequences on mobile (from the screenshots): `Send the brie`, `Continue →
Researc`, `NEE`(DED), `Traditio`(nal), `Professio`(nal), `Afford`(able), `Mi`(nimal),
`you@yourstudio.co`, half of every `Download` button on Assets, and the whole right half
of `Break down project` / `Add` / `Next · Assets` on Touchpoints.

Two specific casualties:

- **`.header-context` is squeezed to width 0** — the project name never renders on any
  mobile path view. The one piece of "which project am I in" orientation is gone.
- **The `Account` label sits at x 395–448** — entirely past the 390 px edge. Users see a
  fragment of the person icon with no label.

**Root cause.** `.header-content-simple` is `display: flex; flex-wrap: nowrap`. Its
children are `☰` (44 px, `flex-shrink: 0`) + back link (117 px) + context (0 px) +
`.header-actions` (**257 px, `flex-shrink: 0`**). That sums past 390, and `.header` has
`min-width: auto` / `max-width: none`, so it establishes a min-content floor the grid
track cannot go below. `.app`'s `overflow-x: hidden` then silently amputates the rest.

**Proposed fix.**

1. On `.header`, add `min-width: 0; max-width: 100%` so it can no longer widen the shell.
2. On `.header-content-simple`, add `min-width: 0` and allow the back link to truncate
   (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap` with `min-width: 0`).
3. Under `@media (max-width: 640px)`, drop `flex-shrink: 0` from `.header-actions` and
   reduce it to icon-only for `To-do` / `Client` / the work clock, keeping accessible
   names via `aria-label`. Account keeps its icon, drops its visible label.
4. Give `.header-context` a `min-width` floor (e.g. `4rem`) so the project name is never
   collapsed to nothing — it is the primary orientation cue.
5. Add a regression guard: extend the existing e2e suite with a spec asserting
   `document.querySelector('.app').scrollWidth <= clientWidth` on every path stop at
   390 px. This class of bug is invisible to every current test because `documentElement.
   scrollWidth` stays at 390 — the clipping hides its own symptom.

> Note: this is a containment bug, **not** an argument for changing the header's
> information architecture. The back affordance, project context and action chips all stay.

---

## P0 — The To-do FAB sits on top of the primary "Add" button on Touchpoints

**Evidence.** `.todo-fab` is `position: fixed` at `(286, 778) 86 × 48` on a 390 × 844
viewport. On Touchpoints, `document.elementsFromPoint()` at the FAB's centre returns:

```
SPAN.todo-fab__label > BUTTON.todo-fab > BUTTON.btn.btn-primary ("Add") > …
```

The FAB is above the page's primary "Add" button in the hit-test stack, so a tap on the
right end of `Add` opens the To-do drawer instead of adding the step. It also overlaps the
`Due soon` card header on Home and the `03_COLOR` package rows on Assets, though those
are visual-only.

**Proposed fix.**

1. Add bottom padding to scroll containers equal to the FAB's height + gap
   (`padding-block-end: calc(48px + 1.5rem + env(safe-area-inset-bottom))`) so no content
   can ever come to rest underneath it.
2. Respect the iOS home indicator: `bottom: calc(1rem + env(safe-area-inset-bottom))`.
3. Where a page has a full-width primary action bar (Touchpoints' capture row, Assets'
   build button), have the FAB yield — collapse it to icon-only, or hide it while that bar
   is in view via an `IntersectionObserver`.

---

## P1 — Radios and checkboxes are invisible in dark mode

**Evidence.** Measured on the Strategy brief with `prefers-color-scheme: dark`:

| Control | Border vs canvas | Needed | |
|---|---|---|---|
| `input[type=radio]` | **1.15 : 1** (`#000` on `#151515`) | 3 : 1 | **FAIL** |
| `input[type=checkbox]` | **1.15 : 1** | 3 : 1 | **FAIL** |
| `.field-input` border | 4.25 : 1 | 3 : 1 | pass |
| placeholder text | 7.34 : 1 | 4.5 : 1 | pass |
| footer text | 8.14 : 1 | 4.5 : 1 | pass |
| spectrum end labels | 9.29 : 1 | 4.5 : 1 | pass |

The same controls measure 19.26 : 1 in light. This affects the four brand-personality
spectrum rows (Modern/Traditional, Playful/Professional, High-end/Affordable,
Bold/Minimal — 20 radios) and all 24 deliverable checkboxes on the brief.

**Root cause.** `color-scheme` is declared **nowhere** in the app (`grep -rn "color-scheme"
src/` returns only `exportFiles.js` and a `matchMedia` query). Native form controls
therefore keep light UA styling on the dark canvas.

**Proposed fix.** One line, plus a verification pass:

```css
.app.deep { color-scheme: dark; }
:root      { color-scheme: light; }
```

This also fixes the native date picker, `<select>` menus and scrollbars in deep mode, which
have the same problem. Then re-check the deep-mode audit checklist in `AGENTS.md` for the
date field and any `accent-color` pairings.

---

## P1 — Touch targets below the 44 px minimum

**Evidence** (measured at 390 px; WCAG 2.2 AA target size is 24 px, Apple/Material
guidance is 44/48 px):

| Control | Size | Where |
|---|---|---|
| `.step-rail-step` | **× 22 px tall** | Primary path nav — all five stops, every view |
| `input[type=radio]` | 17 × 17 | Strategy brief (20 of them) |
| `input[type=checkbox]` | 17 × 17 | Strategy brief (24 of them) |
| `.bbb-color-row__hex-input` | 88 × 22 | Brand book, ×4 |
| `×` remove-colour | 16 × 20 | Brand book, ×4 |
| `.bbb-page-link` | × 17 px | Brand book, ×6 |
| `.pref-switch` | 40 × 22 | Settings |
| `.journey-projects-add` (`+`) | 23 × 23 | Home sidebar |
| `<summary>` disclosures | × 20 px | Touchpoints, Assets, Review |

The step rail is the worst of these: it is the *main* way to move through the product on
mobile and it is a 22 px tap strip.

**Proposed fix.** Rather than resizing each control (which would inflate the layout), add
an inline-size-preserving hit area:

```css
@media (pointer: coarse) {
  .step-rail-step, .bbb-page-link, summary, .pref-switch { position: relative; }
  .step-rail-step::after, /* … */ {
    content: ''; position: absolute; inset-block: -11px; inset-inline: 0;
  }
}
```

For radios and checkboxes, wrap each in its existing `<label>` and give the label
`min-height: 44px; display: flex; align-items: center` — the label is already the
accessible target, it just is not big enough. This costs no vertical space on the checkbox
lists because the rows are already ~40 px apart.

---

## P1 — Every path stop offers the same "continue" twice, with two different names

**Evidence** (per view, from the running app):

| Stop | Top of page | Bottom of page |
|---|---|---|
| Strategy | `Continue → Research` | `Next · Research` |
| Research | `Continue → Identity` | `Next · Identity` |
| Identity | `Continue → Words` | `Next · Words` |
| Touchpoints | `Continue → Assets` | `Next · Assets` |

Same destination, two labels, two visual treatments, and on Strategy they are 4,600 px
apart. `AGENTS.md` already rules on this: *"One solid primary CTA for the page job"* and
*"Footer: path continue primary leads."*

**Proposed fix.** Keep the footer `Next · <stop>` as the single primary — it is where the
owner's own rule puts it, and it is where you land after finishing the work. Demote the
step-rail CTA to a quiet text affordance, or remove it, since the step rail already shows
the next stop as a clickable step. Unify the label to one verb across both if both stay.

**This does not touch** the step rail itself, the five-stop path, or the Define
form-only decision.

---

## P1 — The gradient ring is on almost every button, so it ranks nothing

**Evidence** (count of buttons with a gradient `background-image`, desktop):

| View | Gradient buttons | `btn-primary` |
|---|---|---|
| Home | 3 | 1 |
| Strategy | 5 | 1 |
| Research | 2 | 1 |
| Identity | 3 | 1 |
| **Touchpoints** | **9** | **3** |
| **Assets** | **10** | **2** |

On Touchpoints the ring is on `Continue → Assets`, `Add step`, `Break down project`,
`Add`, `Website`, `Social`, `Print`, `App` and `Next · Assets` — nine of nine buttons.
On Assets it is on six `Download` buttons *and* on `Back to the desk`, a back action.
When the accent is on everything it stops meaning "this one."

Touchpoints also renders **three** `btn-primary` filled purple buttons on a single mobile
screen (`Add step`, `Add`, `Next · Assets`).

**Proposed fix.** Make the gradient ring mean exactly one thing — *the path-forward
primary* — and reserve it for one button per view:

- `btn-primary` + gradient → the single page-job action (footer `Next · <stop>`).
- Everything else → flat `btn-secondary` with `--border-strong`, no gradient.
- Never on a back/cancel action (`Back to the desk`).
- Repeated peer actions (six `Download PDF`s, four surface chips) get one shared quiet
  style; they are a set, not six competing decisions.

---

## P1 — Brand book: raw internal ids are shown to users, and reordering is button-soup

**Evidence** — the "IN THIS BOOK" list renders:

```
Lock  Move up  Move down   Front cover
Lock  Move up  Move down   (no label)
Lock  Move up  Move down   bbb-anchor-1     ← raw slug
Lock  Move up  Move down   Color palette
Lock  Move up  Move down   Typography
Lock  Move up  Move down   bbb-anchor-4     ← raw slug
Lock  Move up  Move down   Back cover
```

Three problems in one control: `bbb-anchor-1` / `bbb-anchor-4` are internal ids leaking
into the UI; one row has no label at all; and the label sits *after* its own buttons, so
you cannot tell what you are about to move until you have read past the controls. That is
21 controls, several of them 17–22 px tall (see touch targets above).

**Proposed fix.**

1. Give every book section a human label; fall back to the section's page title rather
   than its anchor id, and fix or drop the unlabelled row.
2. Put the label **first** in each row, buttons trailing.
3. Replace `Move up`/`Move down` pairs with drag-to-reorder plus keyboard
   `Ctrl+↑`/`Ctrl+↓` on the focused row, and back it with the 5-second undo toast
   `CLAUDE.md` §2 already asks for. That removes 14 of the 21 controls.

---

## P1 — "NOT IN THE BOOK YET" is a 10-row deficit scoreboard

**Evidence.** The book inspector ends with ten rows of `Brand Voice — needs a positioning
line, tagline, promise, proof, personality or tone of voice`, `Our Story — needs …`, and so
on, right-aligned italic against left-aligned labels.

`CLAUDE.md` §2 is explicit that this pattern is counterproductive for the target user:
*"no red badges … use neutral, low-arousal copy"*, and `AGENTS.md` bans *"full-field
scoreboards"*. A ten-item list of everything you have not done, permanently in view, is the
scoreboard in its purest form.

**Proposed fix.** Collapse to a single quiet line — `7 sections not in the book yet` —
that expands on click. Keep the neutral register and the muted colour. The information
stays available; it stops being an unavoidable ten-line reminder of incompleteness.

**Owner call to make:** whether it collapses by default or stays open. Recommendation:
collapsed.

---

## P2 — Placeholder text is carrying real instructions

**Evidence.** Identity → Mark, "Mark mistakes to avoid" uses its placeholder for content:

```
One rule per line (defaults used if empty):
Do not stretch or distort
Do not recolor outside palette roles
Do not place on low-contrast photos      ← clipped mid-line by the textarea's height
```

Two faults: the guidance disappears the moment the user types a single character, and the
last line is visibly sliced by the fixed textarea height even before that.

**Proposed fix.** Move the rules into a small persistent hint below the field (or a
"use the defaults" button that fills them in), and give the textarea `field-sizing:
content` with a `min-height` so it does not slice its own contents.

---

## P2 — Research's empty state has no drop target

**Evidence.** `AGENTS.md` requires a *"framed drop plane"* on Research and warns against
*"Research empty prose without a framed drop plane."* What renders is a 60 px strip reading
*"Newest first. Drop an image anywhere below, or use Upload, URL or Note above."* followed
by unframed centred prose on bare canvas, then ~400 px of nothing.

The instruction says "drop below"; there is no visible "below" to drop onto.

**Proposed fix.** Give `.research-artboard` a visible frame (dashed `--border-strong`,
`min-height: 22rem`) that is present when the wall is empty, with the empty copy centred
*inside* it. This is the already-specified behaviour, not a new design.

---

## P2 — Assets: ~2,900 px of empty left column

**Evidence.** At 1440, `.main` is 1240 px wide. The book preview occupies a ~640 px left
block; the right rail carries the client package, fonts, stationery, contacts and every
download in a ~500 px column that runs 3,700 px tall. Below the preview, the left column is
empty for the remaining ~2,900 px.

**Proposed fix.** Make the preview `position: sticky; top: <header height>` so it stays
beside the content it describes, and let the lower sections (Stationery, Contacts, the
download grid) span the full 1240 px width instead of staying in the narrow rail. Both are
already full-width-eligible under the path-page rule in `AGENTS.md`.

---

## P2 — Smaller items

| # | Finding | Fix |
|---|---|---|
| a | Home's `Day / Week / Month / Year / All time` segmented control wraps `All time` to its own row on mobile, breaking the segment affordance | `overflow-x: auto` on the group with `flex-wrap: nowrap`, or shorten to `All` |
| b | Home's right column ends after `Client`, leaving a large bottom-right void while `Ready to ship` and `Hours worked` sit left/full-width | Move `Ready to ship` into the right column; it is the natural pair to `Client` |
| c | Mobile header drops the `Creative Companion` wordmark **and** the project name — no identity cue at all | Covered by the P0 fix (restore `.header-context` with a min-width floor) |
| d | `Studio` appears as both the sidebar section label and the Home `<h1>` | Rename the `<h1>` to the user's studio name, or drop the sidebar eyebrow |
| e | Empty-state copy is centre-aligned on Research and Touchpoints while every other block on those pages is left-aligned | Left-align empty-state copy to match |
| f | `Print / save as PDF` (orange) and `Download PDF` (dark) sit adjacent in the book toolbar with no stated difference, and orange appears nowhere else in the app | Retire the orange; label the difference (`Print…` vs `Save PDF`) or merge |
| g | Brand book inspector is a 352 px porthole onto 1,818 px of controls on mobile, with no scroll affordance — the cut lands mid-word on `EDGE SPACE`, reading as the end of the panel | Content is reachable (`overflow-y: auto`), but add a scroll shadow / fade and let the panel take viewport height on mobile |

---

## Explicitly *not* raised as issues

- **Path-page width.** Measured, and it is correct: `.main` is 1240 px of 1440 with no
  cap, and the Strategy brief's panels fill 1192 px of it. The `AGENTS.md` width checklist
  passes on Strategy, Research, Identity and Touchpoints.
- **No chapter rail on Strategy, Define as form-only, five stops, board-on-Research.**
  Settled owner decisions; nothing above proposes reopening them.
- **A "scroll trap" from focus.** Initially suspected — tabbing through the clipped mobile
  header does *not* shift `.app.scrollLeft`. The earlier symptom was a Playwright
  `scrollIntoView` artifact, not a user-reachable state. The clipping is real; the trap is
  not.
- **Console errors.** All 34 are `ERR_CONNECTION_RESET` on outbound font/asset requests
  blocked by the sandbox proxy, not app faults.

---

## Suggested order

| | Item | Why first |
|---|---|---|
| 1 | P0 mobile clipping | Content is unreachable on five of five path stops |
| 2 | P0 FAB hit-stealing | A tap does the wrong thing |
| 3 | P1 `color-scheme: dark` | One line; unblocks the dark-mode audit gate |
| 4 | P1 touch targets | Cheap, mechanical, affects the main mobile nav |
| 5 | P1 duplicate CTA + gradient scope | Restores hierarchy; no new components |
| 6 | P1 book ids/reorder, P1 scoreboard | Contained to the book builder |
| 7 | P2 | Polish |

---
---

# Addendum — advisor review, and what it changed

Three advisors reviewed the proposed fixes: `adhd-executive-function-advisor`,
`devils-advocate`, and `design-process-professor`. Their pushback was substantive and
**five of my proposals were wrong**. Two of those were wrong on facts I could have checked
and hadn't; one fails an accessibility conformance requirement outright.

I re-verified every disputed claim in the running app rather than taking either my own
original reading or an advisor's on trust. The corrections below are the result.

---

## The big one: a single root cause sits under four separate findings

**`overflow-x: hidden` on the app's ancestor chain silently disables every
`position: sticky` in the product.**

Proven by direct experiment — scroll to y=2000 on Strategy, measure `.header`:

| | `.header` top | Sticking? |
|---|---|---|
| As shipped | **−2000** | no |
| After `html,body,#root,.app,.app-shell { overflow-x: visible }` | **0** | **yes** |

Nothing else was changed. `overflow-x: hidden` with `overflow-y: visible` computes
`overflow-y` to `auto`, which makes `.app` / `.app-shell` scroll containers. Sticky
children then stick to *those* containers — which never scroll, because the **window** is
what scrolls. So the sticky is inert.

Four declarations are affected, all of them currently dead code:

| Element | Declared | Actual |
|---|---|---|
| `.header` (`shell.css:703`) | `sticky; top: 0` | scrolls away |
| `.assets-preview-frame` | `sticky` | off-screen by scrollY 1200 |
| `.assets-ship` (ship ticket) | `sticky` | off-screen by scrollY 2400 |
| `.path-continue-row` (`shell.css:7619`) | `sticky; bottom: 0` | computes `static`; absent entirely on Strategy |

**This reframes three of my own findings:**

- **The duplicate-CTA debate dissolves.** I measured Strategy at scrollY 2200:
  `forwardCTAsOnScreen: []`. Not one, not two — **zero** forward affordances on screen.
  The top `Continue →` has scrolled away, the footer `Next ·` is 2,400px below, and the
  sticky that was supposed to keep one in view is inert. The problem was never
  redundancy. It was that neither copy is reachable where you actually are.
- **P2 "make the Assets preview sticky" was already implemented** — and is broken for
  the same reason. My proposal was to add something that is already in the CSS.
- **The 2,900px empty left column on Assets** is the visible symptom of the dead sticky,
  not an independent layout problem.

**Revised fix.** Repair the header's `min-width` first (P0-A) so nothing overflows, *then*
remove `overflow-x: hidden` from the chain. Four findings resolve at once, and the
`overflow-x: hidden` that was masking the mobile clipping goes with them.

---

## Proposals that were wrong

### ✗ Icon-only header actions on mobile — **withdrawn**

`devils-advocate` cites Aurora Harley, [*Icon Usability*](https://www.nngroup.com/articles/icon-usability/)
(NN/g, 2014): *"Icon labels should be visible at all times, without any interaction from
the user."* Her granted exceptions are home, print and search — not "work clock." Worse,
`Client` and `Account` would both render as unlabelled person glyphs, adjacent, meaning
different things. `aria-label` serves assistive tech and does nothing for the sighted
touch user; there is no hover on a phone.

`adhd-executive-function-advisor` independently reached the same conclusion and quoted the
codebase back at me — the `.todo-fab` comment already says *"a bare list glyph is an
invented private code."*

**Replaced with:** drop the **duplicate** To-do pill from the mobile header entirely — the
FAB already carries To-do and its count, so the header copy is pure duplication and
removing it recovers most of the 257px in one move. Keep `Client` and the work clock
labelled; shorten the clock to the elapsed time rather than unlabelling it. Combined with
`min-width: 0`, back-link truncation and dropping `flex-shrink: 0`, that should clear the
overflow without stripping a single label.

### ✗ Drag-to-reorder in the brand book — **fails conformance**

`devils-advocate` is right and this is not a matter of taste. **WCAG 2.2 SC 2.5.7 Dragging
Movements (Level AA)** requires that all drag functionality be achievable with a single
pointer without dragging. The Understanding document explicitly forecloses my proposed
keyboard fallback: *"achieving keyboard equivalence … does not automatically meet this
success criterion, unless that equivalent keyboard operation also provides controls that
can be clicked or tapped."* It then names the exact control I proposed deleting as the
compliant remedy — adjacent up/down controls. The failure has a catalogue number,
[F108](https://www.w3.org/WAI/WCAG22/Techniques/failures/F108).

`adhd-executive-function-advisor` reached the same place from motor variability: dragging a
17–22px row on a coarse pointer is a precision task that fails silently.

**Replaced with:** keep pointer-operable move controls, but collapse the two text buttons
into one trailing overflow menu (`⋯` → Move up / down / to top / to bottom). That still
removes most of the 21 controls, gives a 44px target instead of two 20px ones, and
satisfies 2.5.7. Drag becomes a desktop *enhancement*, never the only path. Label-first
ordering and the undo toast stand unchanged.

### ✗ Removing the top `Continue → X` — **withdrawn**

Hoa Loranger, [*The Same Link Twice on the Same Page*](https://www.nngroup.com/articles/duplicate-links/)
(NN/g, 2016), is broadly against duplication but carves out exactly this case:
*"Duplicating links is usually not necessary if your pages are 2–3 screens long"* and
*"Place redundant links far apart."* Strategy's two CTAs are 4,600px apart — 5.5 screens.
`CLAUDE.md` §2 also names *"a single persistent 'Next' card pinned to the top of every
project view"* as a stated executive-function accommodation, which outranks tidiness.

And my own measurement settles it: zero CTAs on screen at depth.

**Replaced with:** don't delete either. Fix the sticky (above) so exactly one is in view at
any scroll position. **Unify the label regardless** — `Continue → Research` vs
`Next · Research` for one destination is a clean [WCAG SC 3.2.4 Consistent
Identification](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html)
defect and that half of the finding stands.

### ✗ `::after` hit areas using a bare `summary` selector — **amended**

`devils-advocate` verified a collision in this repo that my proposal would have created.
`inset-block: -11px` extends the overlay 11px *below* the summary, and these `<summary>`
elements sit directly above buttons inside their `<details>`:

- `src/views/DeliverView.jsx:432` (`Extras…` → export button at :435), `:504` (`Leave` → :506)
- `src/views/SketchView.jsx:429`, `:501`
- `src/App.jsx:4524` (`More` → HTML / MD / JSON / Print at :4526–4529)

That is FAB-style hit-stealing reintroduced by the fix for a different finding.

**Amended:** enumerate selectors explicitly instead of bare `summary`; use asymmetric
insets (`inset-block-start` only) wherever content sits directly below; check for
`overflow: hidden` ancestors that would clip the overlay. The step rail is unaffected —
`--space-5` is 24px, so ±11px overlays leave a 2px gap.

### ✗ `color-scheme: dark` on `.app.deep` — **amended**

Per [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme), the canvas and
document scrollbar follow the **root** element's scheme. `.app` is a `div` under `#root`
under `body`, so my version would not have fixed scrollbars — that claim was wrong and is
withdrawn. Also, `color-scheme: dark` flips the UA default `color` *and*
`background-color`, so any control setting only one inverts;
`src/styles/lazy-deliver.css:426` keeps `.book-preview-sheet` as a light "paper" surface in
deep mode, which is the collateral risk.

**Amended:** declare on the root, driven by the theme class, and add an explicit
`color-scheme: light` on the paper-sheet subtree. Verify with a deep-mode screenshot diff
hunting native controls on light surfaces. The core fix — radios and checkboxes at
1.15:1 — is unaffected and still correct.

---

## Proposals that survived, with changes

### Gradient scope — the real finding is worse than I reported

I screenshotted with `animations: 'disabled'`, so I missed this entirely.
`adhd-executive-function-advisor` caught it and I confirmed it with
`document.getAnimations()` on Touchpoints:

```
total: 9   running: 9   — all btn-spin-chrome, linear infinite
Continue → Assets · Add step · Break down project · Add ·
Website · Social · Print · App · Next · Assets
```

Both `.btn-primary:not(.is-earned)` (`shell.css:7466`, 2.4s) and
`.btn-secondary/.btn-outline:not(.is-earned)` (`:7509`, 3.2s) animate forever. **Nine
independently rotating objects in peripheral vision on one screen**, for an audience whose
core difficulty is sustaining attention.

The codebase already holds the right rule, at `App.jsx:3372-3378`: *"the gradient ring
fires ONLY when the stop you are on is complete — a reward you caused, not standing
chrome… rarity is the mechanism."* It is exactly inverted in the CSS: `is-earned` is the
quiet case and everything else spins.

**Revised fix:** motion belongs to `.is-earned` only. Everything else is a static plate.
That is restoring the codebase's own stated doctrine, not a new opinion.

On *which* button gets the accent: `devils-advocate` found no credible opposition to
"one primary per screen" as a principle — the [GOV.UK Design System](https://design-system.service.gov.uk/components/button/)
states it with a research trail. But it ties the primary to *the page's own main call to
action*, and my rule hard-assigned it to the footer `Next`. On Touchpoints the page job is
capturing touchpoints, so `Add` is the primary and `Next · Assets` is navigation away from
unfinished work. **Assignment is per view, not always the footer.**

### "NOT IN THE BOOK YET" — collapse, but the rows must do something

Both advisors converged on a defect I missed. `adhd-executive-function-advisor` read
`BrandBookBuilderView.jsx:1666-1678`: the rows are `<span>` + `<span>`. **They are not
clickable.** There is no route from the gap to the thing that fills it. Collapsing as-is
converts an unactionable deficit list into a *hidden* unactionable deficit list.

`design-process-professor` adds the cost of hiding it: it is currently the only place in
the app that enumerates what a complete brand system contains — positioning, tagline,
promise, proof, personality, tone of voice, story, audience, imagery, usage. Strip it and
the app's implicit definition of a brand narrows to *a logo, some colours and some fonts.*

`devils-advocate` cites [Wang, *Accordions on Desktop*](https://www.nngroup.com/articles/accordions-on-desktop/)
(NN/g, 2023) — *"valuable content hidden under an accordion may be missed altogether"* —
while noting the owner's §2 low-arousal ruling governs here.

**Revised fix:** collapse by default, and make each expanded row a **link to the stop that
fills it**. The `omitted` entries already carry `id`, `label` and `needs`
(`src/lib/book/bookContent.js:302-307`); this needs one id→view map. Reframe the summary
as inventory, not shortfall: `12 of 19 sections in the book`, not `7 sections not in the
book yet`. Same information; a progress statement is also a stronger expand-trigger than a
deficit count.

### FAB — pad and move it, never hide it

`adhd-executive-function-advisor` found that `.todo-fab` **already** disappears under one
invisible rule (`shell.css:9841` — hidden whenever any input has focus). Adding an
IntersectionObserver would give it two independent, indistinguishable disappearance
conditions. It is also the frictionless-capture entry point from `CLAUDE.md` §2: if it
isn't there when the thought arrives, the thought is gone.

**Revised fix:** keep the bottom padding and `env(safe-area-inset-bottom)`. Resolve the
Touchpoints overlap by **shifting** the FAB up by the action bar's height, not hiding it.
Same control, same place in memory, always present.

---

## What the professor added that isn't a visual issue at all

Two findings outside this audit's scope, recorded because they are higher-value than most
of what is in it.

**1. The verbal half of the identity is authorable only downstream of the mark.**
`PAGE_FIELDS.voice` in `src/lib/book/bookContent.js` declares tagline, positioning,
promise, proof, personality, tone of voice — and the only place to type them is the Brand
Book builder, a Tool, after Identity is done. So at the concept presentation the rationale
available is about the *direction*, not the brand. Marks defended on direction get chosen
on taste, and taste-chosen marks come back for a second round.

Suggested single next move: render `PAGE_FIELDS.voice` on **Identity → Words**. The fields
already exist and are typed; nothing new to design. It also makes the gap-list collapse
free, because those items stop being introduced for the first time as things missing.

**2. `packagePlan.js:405-406` can report a sold deliverable as delivered when it isn't.**

```js
logoPrimary:    () => kinds.has('mark'),
logoVariations: () => kinds.has('mark'),
```

One uploaded file satisfies both. `deliverableChecklist` is the only mechanism connecting
what was *sold* to what *shipped*, and everything else in that file is scrupulous about not
overclaiming. The professor also notes the package is short of current handoff convention:
no mono/reverse/greyscale versions as files, no lockups, no SVG **and** PDF vector, no
favicon set or social avatar. (Not shipping font files, and saying so in the README, is
correct and better than most freelance practice.)

Both belong in their own issue, not this one.

---

## Revised order

Changed from the original: the root-cause fix now leads and resolves four findings; the
button animation moves up because it is a CSS-only change with a continuous cost; and the
professor's ranking correction moves two "P2" items up, because they change the *work*
rather than the chrome.

| | Item | Why here |
|---|---|---|
| 1 | Header `min-width: 0` + drop duplicate mobile To-do pill | Unblocks #2; content currently unreachable |
| 2 | **Remove `overflow-x: hidden` from the chain** | Fixes clipping + four dead stickies + the CTA problem at once |
| 3 | `color-scheme` at root (+ paper-sheet exception) | 1.15:1 controls; the brief's adjectives are the input to concept work |
| 4 | Kill `btn-spin-chrome`; scope the ring to `.is-earned` | Nine spinners on every screen; restores the codebase's own rule |
| 5 | FAB padding + shift (never hide) | A tap does the wrong thing today |
| 6 | Touch targets, explicit selectors, asymmetric insets | Mechanical; the step rail is the main mobile nav |
| 7 | Mark do/don'ts out of the placeholder | Guidance that vanishes ships to the client in `02_LOGO/` |
| 8 | Research framed drop plane | Reinstates the friction the one-wall decision removed |
| 9 | Book: labels, id leak, overflow-menu reorder, gap links + collapse | Contained to the builder |
| 10 | Unify CTA label (SC 3.2.4); remaining P2 | Polish |

## Where the advisors disagreed with each other

Only one place, and it is worth recording. On the gradient accent,
`devils-advocate` (via GOV.UK) wants the primary assigned to the *page-job* action;
`adhd-executive-function-advisor` wants motion reserved for `.is-earned` and everything
else static. These are compatible — the first decides *which* button is solid, the second
decides that *nothing* animates unless earned. The revised fix takes both.

## Standing owner decisions — untouched

Define is form-only, no chapter rail on the brief, five stops, board-primary on Research,
Identity ordered Mark → Words → Colour → Type → Preview. The professor noted the
literature (Slade-Brooking, Bokhua, d.school) puts verbal identity before the mark and
recorded the tension once; the owner's order stands and nothing above proposes changing
it. The proposal to surface `PAGE_FIELDS.voice` on Identity → Words works *within* that
order rather than reversing it.

---
---

# Implementation log — 2026-08-07

What was built from the revised order, what was measured, and the two things
the owner ruled on.

## Shipped

| | Finding | Result |
|---|---|---|
| ✅ | **`overflow-x: hidden` killing every sticky** | Removed from the whole chain. `.header` sticks (was `top: -2000` at scrollY 2000, now `0`), the brief footer sticks, the Assets ship ticket sticks. **`Next · Research` is now on screen at scroll depth, where the audit measured *zero* forward CTAs** — which is what the duplicate-CTA argument was really about |
| ✅ | **Mobile clipping (42–85px)** | `.header` / `.header-content-simple` / `.header-actions` get `min-width: 0`, back link ellipsises, step rail's map scrolls while its CTA holds. Clean at 320 / 390 / 430 / 768 / 1440 across twelve views |
| ✅ | **Project name collapsed to width 0** | `.header-context` holds a `4rem` floor instead of the old `width: 0` workaround. Present on every path stop |
| ✅ | **Radios/checkboxes at 1.15:1 in deep** | `color-scheme` on `:root` via `:has()`. **1.15:1 → 18.26:1.** Every input, textarea and select across eight views re-scanned in deep: nothing inverted |
| ✅ | **Refresh losing four screens** | Both hand-maintained lists now derive from `viewRegistry`. Desk, Clients, Asset library and New project all restore |
| ✅ | **Password rule contradiction** | Gate states the real minimum (6) and the strength guidance separately |
| ✅ | **`Sparrow's Promise` as fact** | Reads as the example it always was. Sample data and fixed date deliberately unchanged — the file argues for both |
| ✅ | **Client-facing dead end** | "Try again shortly" → the portal's own recovery line. Two tests that pinned the old wording now assert the intent |
| ✅ | **`RES` / `IDE` / `TOU` / `ASS`** | Deleted. The keyboard-shortcut alternative was rejected: number keys address `stepsForProject()`, which is renumbered per project, so the hint would advertise a key that does nothing on a reduced-scope project |
| ✅ | **FAB in the home-indicator area** | `env(safe-area-inset-bottom)` |
| ✅ | **FAB covering the end of every page** | Mobile views reserve the pill's own footprint |

New regression guard: `e2e/no-horizontal-overflow.spec.js`. It **fails on the
pre-fix CSS** (435px of content in a 320px shell) and passes after — verified
by stashing the fix, not assumed.

## Owner decisions

**Button-85 chrome — kept as-is.** `shell.css` tags the spinning rainbow ring
on every non-earned button `owner: Button-85 chrome`; `App.jsx:3371` records
the opposite intent, tagged `advisor` ("ring only on `.is-earned`, **Static
always**, one per screen"). The two comments genuinely contradict each other,
so it went to the owner rather than being resolved by an audit. Raised with
measurements — **nine concurrent infinite animations on one Touchpoints
screen** — and deliberately retained. No code changed. **Do not reopen.**

**FAB overlap — shrink while scrolling.** Chosen over reserving a gutter or
moving the pill. Implemented: 86px at rest, 60px while moving, restored after
450ms idle, `aria-label` unchanged throughout.

State this plainly rather than claiming the finding closed: the shrink reduces
the colliding area but **does not eliminate the measured collisions**.
Touchpoints' `Next · Assets` and Assets' `Back to the desk` are full-width
rows, and a bottom-right pill overlaps those at any width — and the pill is
back to full size on idle, which is exactly when a tap happens. Reserving a
gutter remains the only option that removes them outright, and it is available
if the tradeoff ever looks worth it.

## Not done

Everything below item 6 in the revised order — the book's label/id leak and
overflow-menu reorder, the gap list's jump links and collapse, the Mark
do/don'ts placeholder, the Research drop plane, the CTA label unification
(`Continue → X` vs `Next · X`, a clean SC 3.2.4 defect), and the cold-start
work: saying what the app is on the gate, framing the auto-created project as
a starter, and the `INCLUDED`-over-unchecked-boxes heading.
