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
