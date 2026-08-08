# Creative Companion — design grammar

**Living rules for layout, path, color, and interaction.**  
If a screen fights these, the screen is wrong — not the grammar.

| | |
|--|--|
| **Product** | Customer / project system for a solo brand designer with ADHD |
| **Path** | Exactly five stops (see G1) — declared once in `src/lib/journey.js` |
| **Visual system** | Tech Studio: cool gray canvas, white cards, ink CTAs, 4px radius |
| **Type** | Plus Jakarta Sans only (`--font-sans` / `--font-display`) — three weights 500 / 600 / 700 |
| **Source of truth** | This file + `docs/PRD.md` + `AGENTS.md` |

---

## G1 — Path (five stops)

| # | Label | View | Job |
|---|--------|------|-----|
| 1 | **Strategy** | `project` | Client + brief. Form-only — no mood board. |
| 2 | **Research** | `studio` | One wall of refs; ★ up to 6 for the pack. |
| 3 | **Identity** | `brand` | Mark → Words → Color → Type → Preview. |
| 4 | **Touchpoints** | `flow` | Applications from the brief; note or “looks right”. |
| 5 | **Assets** | `finish` | Preview leave-behind → one download + handoff. |

**Derive, never restate.** Use `JOURNEY_STEPS`, `labelForStepId`, `labelForView`, `PATH_STEP_COUNT`.  
Ideate (`spark`) and Review are **Tools**, not path siblings. Timer, Calendar, Clients, Settings, Brand Book Builder — Tools.

**G1.1 One job per path page** — writing / wall / artboard / applications / ship. No Desk density on writing surfaces.  
**G1.2 Full main width** — shell `.main` fills the grid cell on every view (no 780px island). Reading measure lives on form/prose columns inside the page, not on `.main`.  
**G1.3 One primary CTA** per page job; path Next solid; rail Continue secondary.  
**G1.4 `pathDone` both ways** — user verdict outranks proxies. One tick, one meaning.

**G1.5 A stage must hand you a tool, not a form.**

> **Every stage must provide a meaningful work surface appropriate to the
> stage's job. A page is not considered functional merely because it stores
> information related to that job.**

Owner, 2026-08-08, after Identity drifted into ~29 text inputs with the live
artboard walled off behind a fifth tab. Storage is not a work surface. The
test for any path page is *what can I actually DO here* — and "describe the
thing" is not an answer.

Before adding an input, in this order:

1. Does this already exist in the brief (`detective`)? → **read it, never re-ask it**
2. Does it already exist elsewhere in the app? → **one authoring home, link to it**
3. Can the app derive it? → **derive it** (the client's four positioning
   spectrums sat unread for months while the designer hand-placed the same
   answers on five sliders)
4. Should a design action produce it first? → **the decision comes first, the
   documentation is its by-product**

Only when all four are genuinely no does a new field earn its place. Corollary:
the artboard is the **workspace** identity decisions are made against, not a
formatted summary of project information printed beside the forms.

---

## G2 — ADHD / executive function (outranks aesthetics)

Before any UI/UX/workflow decision: cognitive load and decision fatigue first.

| Do | Don’t |
|----|--------|
| One initiation path | Equal dual primaries |
| Ambient proof of progress | Tools re-opened to “see progress” |
| Important chrome always visible | Critical controls only at bottom or inside bare `<details>` |
| Limits inform | Hard-block work ready to start |
| Words for status | Raw clocks / fractions as the primary readout |
| Defaults aggressive | Settings to undo a bad default |

Icon-only is a **closed list** (close, nav, arrows when paged thing is named, search, ⋯ in named row, + beside list name). Else label. See `AGENTS.md` / `CLAUDE.md`.

---

## G3 — Page structure

| Surface | Recipe |
|---------|--------|
| **Strategy** | Title · quiet status · brief form · path continue |
| **Research** | Title · framed wall / drop plane · pack stars |
| **Identity** | Subnav · one sub-screen · artboard · continue |
| **Touchpoints** | Title · application cards · continue |
| **Assets** | Title · preview (full page fit) · download + handoff · secondary below |
| **Desk** | Artboard + pack pins + brief · rail: client · path gap primary · resume secondary if different |
| **Tools** | One tool job; return to path via chrome |

**Ban:** second map of the same chapters, start-here chip ramps that jump to the first field, scoreboards (“0 of 35”), dual equal Next.

---

## G4 — Color (Tech Studio)

| Role | Tokens | Use |
|------|--------|-----|
| Field | `--bg-canvas`, `--bg-card`, `--bg-elevated` | Page and panels |
| Ink | `--text-primary`, `--text-secondary`, `--text-muted` | Type (muted ≥ ~4.5:1 on worst surface) |
| Structure | `--border-subtle`, `--border-strong` | Hairlines |
| Primary action | `--text-primary` fill / `--ts-ink` on buttons | One solid primary per region |
| Focus / active path | `--dopamine` | Focus rings, active step edge — not a second purple brand |
| Growth | `--accent-growth` / done states | Done marks, success — never primary CTA |

**G4.1 Accent budget** — one filled primary per region; active path indicator allowed; no gradient mesh atmospheres.  
**G4.2 Deep theme** — `.app.deep`. Every color change needs a deep audit (AGENTS.md). Prefer semantic tokens.  
**G4.3 No light-only hex** on dark without override.

**G4.4 Ink and paper** — two surfaces, and the difference is meaning.
*Workspace* is the app: canvas, cards, panels, chrome. Themed; it goes dark when the designer does.
*Paper* is a picture of what the client receives: letterhead, envelope, email signature, book sheet.
**Not themed** — a client's letterhead is white at 2am, and a preview that inverted in deep mode
would be lying about what gets printed. Use `--paper` / `--paper-ink` / `--paper-edge`; they are
intentionally absent from `.app.deep`. What a sheet *casts* is workspace and may theme (the book
sheet's shadow does). If a preview needs a dark ground, theme the surface **around** the sheet —
`.assets-preview-frame` — never the sheet. Guarded by `paperSurfaces.test.js`.

Helpers: `src/lib/color.js` (`contrastRatio`, `contrastGrade`).

---

## G5 — Type

| Rule | Spec |
|------|------|
| Family | Plus Jakarta Sans (loaded in `index.html`) |
| Weights | **500 / 600 / 700 only** |
| Sizes | `rem` only; prefer `--fs-1`…`--fs-6` |
| Measure | Prose ≤ **65ch** |
| Display | Same family, tighter tracking via `--tracking-display` — no orphan serif stack |

---

## G6 — Shape & spacing

| Token | Value |
|-------|--------|
| Radius | `--radius` = **4px** (pill / none / circle only other forms) |
| Spacing | `--space-1`…`--space-7` |
| Containers | Prefer whitespace + weight over borders; border when space cannot carry hierarchy |

---

## G7 — Components (keep inventing rare)

Path: brief field, wall pin, artboard, application card, ship CTA, desk gap card.  
Chrome: header, journey rail, Tools menu, centered overlays (never bottom sheets).  
Utility: buttons primary / secondary / ghost, quiet status lines.

**Banned:** pill primary nav, feature tile grids, fake logo generators, vanity creativity scores, Promise/Proof tiles bound to nothing.

---

## G8 — Motion

≤200ms default; reduced-motion kills entrance and pulse. Save = quiet chip, not toast spam.

---

## G9 — Voice

Name real objects: brief, wall, mark, pack, handoff.  
No “unlock your potential.” Empty states honest. Mate / Helper sparse and optional.

**G9.1 American English, everywhere a user can read it.** Owner, 2026-08-08 —
a permanent product requirement, not a preference. color · favorite · organize ·
organization · customize · behavior · center · labeled · canceled · license ·
program · gray. Never colour / favourite / organise / behaviour / centre /
labelled / cancelled / licence / grey.

Applies to labels, buttons, headings, helper text, empty states, tooltips,
toasts, validation, onboarding, generated copy, the client portal, the brand
book, and default/example text. **Never mix the two.**

Three things it does **not** apply to, each for a reason:

| Not covered | Why |
|---|---|
| **Stored field ids** (`colourPalette`, `colourAxes`, `dominantColour`) | An id is data. Renaming one orphans every answer already saved on a real project — the rule already stated at the top of `detectiveBrief.js`. Fix the label; leave the key. |
| **Text the client typed** | Never silently rewrite a user's own words. |
| **Keyword lists that MATCH client text** | `contrastMatrix`'s high-contrast list and `colourAxes`' veto list must accept both spellings, or half the clients who ask are ignored. Matched against, never rendered. |

Non-user-facing code comments are out of scope — don't churn them.

---

## G10 — Credibility

1. Persist what you claim.  
2. Export only real fields — no invented pack content.  
3. Preview = download (real PDF raster on Assets).  
4. Logo-only jobs ship mark files, not a full book as primary.  
5. Approvals attach to showable artifacts, not bare stage names.

---

## Screen checklist (before ship)

- [ ] One job; one primary CTA  
- [ ] Path labels from journey helpers, not literals  
- [ ] Full main width on path pages  
- [ ] Accent budget; dark audit if colors changed  
- [ ] Type rem + three weights; prose ≤65ch  
- [ ] 44px taps on mobile path chrome  
- [ ] No dual map / scoreboard / bottom-only critical control  

---

## Grammar debt (not product backlog)

| Debt | Note |
|------|------|
| `shell.css` `!important` stack | Ratchet; reduce by fixing base rules, never raise budget |
| Root grammar vs CSS drift | Update this file when IA or tokens change |
| Touchpoints notes ≠ book mocks | Process gap; one pipeline later |
| Logo multi-concept | SPEC; optional “Client chose” line ships |

---

*Grammar 2.0 · 2026-08 · five-stop path · Tech Studio tokens. Supersedes honeycomb / purple-AI / seven-stop drafts.*
