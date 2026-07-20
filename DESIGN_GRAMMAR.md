# Creative Companion — UX Honeycomb Audit & Design Grammar

**Product spine:** Capture → project desk → make → hold → export  
**Audience:** ADHD-leaning designers/artists who need calm, honest tools — not a fake “AI studio”  
**Brand:** Warm bone paper · plum ink · purple accent (`#7B3FE4`) · teal growth (`#2A9D8F`)  
**Type:** Instrument Serif (display) · Inter (UI)

This document is the **source of truth** for layout and interaction decisions. If a screen fights these rules, the screen is wrong.

---

## Part 1 — Morville’s UX Honeycomb Audit

Peter Morville’s honeycomb: **Useful · Usable · Desirable · Findable · Accessible · Credible · Valuable**.  
Below: whole product + screen-level notes, with **Desirable** and **Credible** emphasized (your ask).

Scoring: **Strong** · **Mixed** · **Weak** · **Risk**

### 1.1 Whole product

| Facet | Score | Evidence in product | Gap / risk |
|--------|--------|----------------------|------------|
| **Useful** | Strong | One capture field, lane-bound desk, micro-steps, mood wall, spark, brief, export pack, focus pocket | Brand is “direction not generator” — good. Don’t reintroduce fake logo gens. |
| **Usable** | Mixed | Editorial nav (Flow / Studio / Project); capture only on Flow + Project; decision list on Project | Spark / Brand / Insights buried in **More** — usable once found, easy to miss. Capture repeats on Project above long decision list (cognitive load). |
| **Desirable** | Mixed→Strong | Serif display, paper capture, desk-now folio, glass header, asymmetric wall | Residual “AI template” tells: same page recipe every view (kicker → H2 → lede → content); purple CTA twins (Capture + Export); purple ambient gradients everywhere; ✦ mark + soft glow = generic “premium SaaS.” |
| **Findable** | Mixed | Primary 3 clear; lane switcher shared | Secondary views lack persistent secondary IA. Keyboard (⌘K) claimed for Spark — must always work. Reset vs Creative Reset naming slightly opaque. |
| **Accessible** | Mixed | Some `aria-*`, `role=dialog`, focus-visible ring | Modals need focus trap + Esc consistently; energy `<select>` custom chevron may need contrast check; pure purple-on-bone is ok if text never relies on color alone (energy pills do). |
| **Credible** | Mixed | Honest export (print/HTML), saved logo *direction*, auto-save chip, no fake metrics dashboards | Credibility leaks: Studio Mate rotating affirmations can feel like wellness chatbot; Insights % of desk is thin “proof”; seed demo projects can feel like the product is a mock; dual storage keys historically risk silent data weirdness. |
| **Valuable** | Strong (if kept honest) | ADHD loop is the value: dump → one next step → pin → export | Value dies if chrome multiplies (pills, second toolbars, card launchers). |

### 1.2 Screen audit (current IA)

#### Flow — desk
| Facet | Notes |
|--------|--------|
| **Desirable** | Best screen. Paper line capture, one elevated “now” card, quiet rest items. Feels like a desk, not a todo SaaS. |
| **Credible** | Energy labels + micro-steps match real creative work. Avoid stacking empty-state poetry + purple empty cards. |
| **Useful / Usable** | Core job. Lane switch works. Checkbox density is fine. |
| **Fix** | Empty desk should stay wall-like (already), not a second marketing card. |

#### Studio — mood wall
| Facet | Notes |
|--------|--------|
| **Desirable** | Wall intent is right; single pin still looks sparse (template emptiness). Hero pin + caption overlay helps. |
| **Credible** | Real uploads / drag > stock gradient seeds alone. Seeds are ok for first run if labeled as examples. |
| **Usable** | Capture removed from Studio (good). Lane switch still needed. |
| **Fix** | Prefer 2–3 seed pins on empty onboard; never orphan a lone primary button under a pin. |

#### Project — lane + brief + next moves
| Facet | Notes |
|--------|--------|
| **Desirable** | Decision *list* beats 2×2 card launcher (old chrome). Brief folio is desirable. |
| **Credible** | Brief is real project data. “Open desk · N open” is honest meta. |
| **Usable** | Capture + lane + brief + 4 links + snapshot = long page. Risk of “everything page.” |
| **Fix** | Capture can stay, but keep primary CTA hierarchy: **one** purple action above the fold max (Capture *or* Export in header — never both competing with a third). |

#### Spark
| Facet | Notes |
|--------|--------|
| **Desirable** | Dark slab + italic serif = distinctive. |
| **Credible** | One provocation > brainstorm dump — honest. Rotating canned sparks are fine if not sold as “AI coach.” |
| **Findable** | More menu + ⌘K only — weak findability. |

#### Insights / Brand / Export / Reset / Mate
| Screen | Desirable | Credible | Notes |
|--------|-----------|----------|--------|
| **Insights** | Mixed | Weak–Mixed | Big % looks dashboard-y; soft copy helps. Timer is the real tool — lead with it over vanity %. |
| **Brand** | Mixed | Stronger if honest | Palette + type + logo *direction* rows — good. Don’t invent fake marks. |
| **Export** | Strong | Strong | Print/HTML pack is credible deliverable. |
| **Reset** | Stronger after numbered rows | Strong | Ritual, not settings dump. |
| **Mate** | Mixed | Risk | Presence is desirable for body-doubling; stock affirmations undermine credibility if over-smiling. Keep short, sparse, dismissible. |

### 1.3 Desirable & Credible — synthesis

**What already earns desire**
- Material metaphor: paper, wall, desk-now folio, left-accent lists  
- Restraint on primary nav (3 items)  
- Display/UI type pairing  
- Warm bone vs lilac SaaS fog  

**What still reads as AI template**
1. **Identical page recipe** on every view: `view-kicker` → `h2` → `view-lede` → body  
2. **Accent inflation** — purple used for nav underline, buttons, borders, glows, pins, gradients  
3. **Twin CTAs** — Capture + Export both primary purple  
4. **Soft motivational copy** stacked with product UI (Mate, Insights note, empty states)  
5. **Decorative gradients** as substitute for real content (sparse studio, seed swatches)  
6. **Inconsistent radius language** — pills + 10px + 2px left-accent all at once without hierarchy  

**What undermines credibility**
1. Claims of depth (Insights “proof,” Mate “with you”) without substance  
2. Hidden secondary tools (Brand/Spark) while header still feels busy  
3. Export labeled as product power while desk is the real product — mismatch of chrome  
4. Demo seeds that never get replaced look like fake portfolio  

---

## Part 2 — Strict Design Grammar

### G0 — Product sentence (never break)

> **One calm loop:** dump a thought → park it on a lane → take one next step → pin direction → export what you can stand behind.

If a feature does not serve that sentence, it is chrome noise.

---

### G1 — Information architecture

| Rule | Spec |
|------|------|
| **G1.1 Primary nav** | Exactly **Flow · Studio · Project**. No pills. No second toolbar. |
| **G1.2 Secondary** | Spark, Brand, Insights, theme, fullscreen live under **More** (or keyboard). Never a fourth primary tab without killing one. |
| **G1.3 Capture** | Allowed only on **Flow** and **Project**. Forbidden on Studio, Spark, Brand, Insights. |
| **G1.4 One lane** | Active project filters desk + wall + export. Lane switcher is text underline, not pill group. |
| **G1.5 Project is a list** | Next moves = decision rows. **Ban** 2×2 feature cards / “app launcher” grids. |

---

### G2 — Page structure (anti-template)

Every screen must pick **one** structure. Do not clone the same three-line hero.

| View | Structure recipe |
|------|------------------|
| **Flow** | Capture (paper) → **title block optional / short** → lane → desk list. Prefer action before essay. |
| **Studio** | Title minimal → lane → **wall fills the stage**. Empty wall is a material surface, not a CTA card farm. |
| **Project** | Lane → **brief folio** → “Next move” list → desk snapshot. Capture above only if needed; keep brief above fold when possible. |
| **Spark** | Minimal kicker/title → **slab is the page**. No capture. No lane. |
| **Brand** | Specimens first (palette bleed, type) → decisions → export. |
| **Insights** | **Timer first**, then one honest number, then one short note. No three equal metric cards. |
| **Modals** | Kicker + title + list/rows + one quiet dismiss. No stacked equal secondary buttons. |

**G2.1 Title block budget**  
Max **one** kicker + one H2 + one lede (≤2 lines). If lede restates the kicker, delete the lede.

**G2.2 Ban list — page chrome**
- Second sticky bar under header  
- Pill segmented controls for primary nav or energy (energy = text select or quiet chip, not pill row of tools)  
- Dashed “dropzone” rectangles  
- Equal card grids of features  
- Gradient mesh backgrounds competing with content  

---

### G3 — Layout measure & rhythm

| Token | Value | Use |
|-------|--------|-----|
| **Desk measure** | `max-width: 720px` | Flow, Project, Spark, Brand, Insights, forms |
| **Wall measure** | `max-width: 960px` | Studio only |
| **Header max** | `1180px` | Shell |
| **Vertical rhythm** | 8px base; sections **24 / 32 / 48** | Prefer 32 between major blocks |
| **Main padding** | `2.5rem 1.75rem 4.5rem` | Don’t shrink to “card padding” feel |

**G3.1 Asymmetry rule**  
At least one element per primary view breaks the grid: left accent, uneven pin, off-square slab, non-centered empty wall content.

**G3.2 Density**  
ADHD-friendly ≠ sparse emptiness. Prefer **one dense useful region** over large blank canvas with a single lonely card.

---

### G4 — Color grammar (60-30-10)

| Role | Token | Hex / value | Allowed uses |
|------|--------|-------------|--------------|
| **60% field** | `--bg-canvas`, `--bg-warm` | `#F6F1EB`, `#FFFCFA` | Page, paper surfaces |
| **30% ink** | `--text-primary/secondary/muted`, borders | plum ink | Type, hairlines, structure |
| **10% accent** | `--accent-primary` | `#7B3FE4` | **One** primary action per view, active nav line, left spine accents |
| **Growth** | `--accent-growth` | `#2A9D8F` | Success / held / low-energy only — never primary CTA |

**G4.1 Accent budget (strict)**  
Per viewport you may use purple for:
1. **One** filled primary button, **or**  
2. Active indicator (nav underline / lane underline), **and**  
3. Up to **one** structural left border (desk-now, brief, modal, mate)

You may **not** also: glow the whole page purple, gradient-mesh the canvas, and purple-fill Export + Capture + Upload simultaneously.

**G4.2 Export hierarchy**  
Header **Export** may stay primary **only** if Capture is the sole competing primary in main. If both show, demote Export to ghost/outline **or** demote Capture to strong secondary. (Pick one system and keep it.)

**Recommended default:**  
- **Capture** = primary in main  
- **Export** = outline / solid-but-smaller, or primary only when Brand/export intent is active  

**G4.3 Deep Focus**  
Invert field/ink; keep calm chrome. Dopamine (next/active only) must stay high-contrast on deep. Same grammar — no neon soup.

**G4.4 Dark mode audit (mandatory on every color change)**  
Any edit to palette tokens, hex/rgb, gradients, tinted shadows, or theme-color **requires** a deep-theme (`.app.deep`) readability pass before ship. Light-only fixes are incomplete.

| Check | Pass criteria |
|--------|----------------|
| **Token pair** | New color uses semantic token or has `:root` + `.app.deep` values |
| **Body text** | Primary ~≥4.5:1 on surface; muted still legible |
| **CTAs / path active** | Dopamine and primary buttons readable on deep bg |
| **Chrome** | Header, journey, menus, chips, borders visible (not crushed) |
| **Hardcoded light hex** | No bare `#fff` / light gray on dark without deep override |

Agent rule of record: **`AGENTS.md`** (loaded every session).  
Helpers: `src/lib/color.js` (`contrastRatio`, `contrastGrade`).

---

### G5 — Typography grammar

| Role | Face | Size / weight | Where |
|------|------|----------------|--------|
| **Display** | Instrument Serif | ~2.15–2.85rem, weight 400 | H2, logo wordmark, desk-now title, spark quote, decision labels, big numbers |
| **UI** | Inter | 400–700 | Body, nav, buttons, meta, kickers |
| **Kicker** | Inter | 11px, 700, 0.16em tracking, uppercase | View label only — purple |
| **Lede** | Inter | ~15px, secondary, max ~40ch | One sentence |
| **Meta** | Inter | 13px, secondary | Energy + context |

**G5.1** Never set body copy in serif.  
**G5.2** Never set buttons in serif.  
**G5.3** Italics reserved for spark provocation (and rare pull-quotes).  
**G5.4** Kickers are labels, not decoration — one per section max.

---

### G6 — Shape, edge, elevation

| Element | Radius | Border | Shadow |
|---------|--------|--------|--------|
| **Paper / folio / list primary** | `0 10–12px 12px 0` (square left) | hairline + **3px left accent** optional | inset highlight + shadow-1 |
| **Primary button** | 10–11px | light inner highlight | soft purple shadow |
| **Mate / More / Reset** | square-left editorial | left accent 2–3px | glass + shadow-2 |
| **Pills** | full pill | only energy chips & mate chip | none or hairline |
| **Mood pins** | 2px (almost none) | none | hover whisper only |

**G6.1 Ban** equal 16px rounded rectangles for every card (the default AI look).  
**G6.2 Elevation** comes from **border + left spine + paper**, not stacked drop shadows.

---

### G7 — Component inventory (only these)

Use these primitives. Inventing a new card type requires updating this list.

1. **Capture line** — underline field, not boxed input  
2. **Desk-now** — elevated folio row  
3. **Desk-item** — hairline left, no box  
4. **Lane switch** — text + underline  
5. **Decision row** — full-width type row + meta  
6. **Brief folio** — top accent bar + paper  
7. **Mood pin** — media/face + caption  
8. **Spark slab** — dark, left accent, serif italic  
9. **Text link** — underline secondary action  
10. **Primary button** — one per region  
11. **Ghost / text action** — header utilities  
12. **Section kicker** — muted uppercase for sublists  
13. **Modal sheet** — export-overlay + left-accent panel  
14. **Mate strip** — fixed presence, dismissible  

**Deprecated / banned components**
- Pill primary nav  
- Feature tile grid  
- Floating multi-tool capture bar  
- “Body Double” chat bubble aesthetic  
- Fake logo generator UI  
- Three equal stat cards  

---

### G8 — Motion & feedback

| Rule | Spec |
|------|------|
| **Duration** | 200ms default; ≤340ms entrance |
| **Entrance** | Soft `translateY(6px)` + fade once per view — not per card |
| **Hover** | 1px lift max on buttons; pins may −2px / slight rotate on hero only |
| **Mate pulse** | Only while focus timer runs |
| **Reduced motion** | Kill entrance + pulse |
| **Save** | One quiet chip — not toast spam |

---

### G9 — Voice & credibility copy

| Do | Don’t |
|----|--------|
| Name the real object: desk, wall, brief, pack | “Your creative journey,” “unlock potential” |
| Short, concrete next step | Long empathy paragraphs beside controls |
| Honest empty: “Nothing in this lane yet” | Fake busy charts |
| Mate: sparse, optional | Continuous affirmations that sound scripted |
| Export: “Brand direction pack” | “AI-generated brand kit” |

**G9.1** Max **one** soft line of encouragement per screen.  
**G9.2** Seed content is fine if it can be edited/deleted and looks like a designer’s note, not lorem.

---

### G10 — Credibility mechanics (product, not paint)

1. **Persist what you claim** — brief, logo direction, pins, tasks survive reload.  
2. **Export only real fields** — no invented palette beyond project direction.  
3. **Progress** = countable desk checks or time held — never vanity “creativity score.”  
4. **Studio Mate** is presence (body double), not a chatbot — no input field.  
5. **Brand** saves a *direction sentence*, not a generated mark file.  

---

## Part 3 — Screen acceptance checklist

Before shipping a screen, all boxes must pass:

### Desirable
- [ ] Not the same kicker/H2/lede clone without a unique structure choice from G2  
- [ ] Accent budget (G4.1) not exceeded  
- [ ] At least one asymmetric material element (G3.1)  
- [ ] No second toolbar / pill nav / feature card grid  
- [ ] Serif only where G5 allows  

### Credible
- [ ] Every number/stat is real and explained  
- [ ] Empty states don’t fake content density  
- [ ] Export/download matches on-screen truth  
- [ ] Secondary features aren’t oversold in chrome  
- [ ] Copy passes G9 (one soft line max)  

### Honeycomb quick pass
- [ ] **Useful** — primary action obvious in <3s  
- [ ] **Usable** — keyboard Esc closes overlays; focus visible  
- [ ] **Findable** — user can reach Spark/Brand without guessing (document ⌘K)  
- [ ] **Accessible** — labels on icon-only controls; contrast on meta  
- [ ] **Dark mode (G4.4)** — if any color changed, deep theme audited for readability  
- [ ] **Valuable** — removes a real creative friction, not adds a toy  

---

## Part 4 — Priority fixes (grammar debt)

Ordered by impact on **desirable + credible** vs AI-template look:

| P | Fix | Honeycomb |
|---|-----|-----------|
| **P0** | **CTA hierarchy:** Capture primary in main; Export outline (or reverse on Brand only) | Desirable, Usable |
| **P0** | **Insights:** lead with focus timer; demote % to secondary meta | Credible |
| **P1** | **Vary page recipes** per G2 (especially shorten Flow lede; wall-first Studio) | Desirable |
| **P1** | **Mate copy:** 2–3 dry lines, no “creative energy is flowing” | Credible, Desirable |
| **P1** | **Spark findability:** ⌘K always + optional quiet link from Project only (already on list) | Findable |
| **P2** | **Studio seeds:** 2–3 pins for new projects so wall never looks abandoned | Desirable, Credible |
| **P2** | **Modal focus trap** + consistent Esc | Accessible, Usable |
| **P2** | Single storage story (no dual-key mystery) | Credible |
| **P3** | Reduce page-level purple radial atmospheres to one soft leak | Desirable |

---

## Part 5 — One-line design director filter

Before merge:

> **Would a senior art director mistake this for a generic purple “AI productivity” template?**  
> If yes — cut chrome, cut accent, cut lede, raise material (paper/wall/list), tell one honest next step.

---

*Grammar version: 1.1 · Enforced in app (2026-07): Export outline by default / primary on Brand; Insights timer-first; per-view recipes; dry Mate copy; quieter atmospheres. Update this file when IA or tokens change — don’t let CSS and grammar drift.*
