# Design grammar — Creative Companion

**Last updated:** v1.47 (2026-07-19)  
**Product:** ADHD creative desk — one step on screen, one brand leave-behind at the end.

## Path (exactly seven design-process steps)

Nothing more, nothing less — the professional graphic design process:

| # | Label | Desk | Job |
|---|--------|------|-----|
| 1 | **Define** | Project | Goal, audience, must-haves (Detective sheet) |
| 2 | **Research** | Board | Refs, mood, star ≤6 for pack |
| 3 | **Ideate** | Spark | Many directions; shortlist A/B/C; opposites |
| 4 | **Sketch** | Work | One draft step; complete; next rises |
| 5 | **Design** | System | Type, color, voice, live artboard preview |
| 6 | **Review** | Review | Feedback, readiness, revise |
| 7 | **Deliver** | Pack | Multi-page brand book PDF, handoff, eval |

Tools (Timer, Calendar, Settings) are **off-path**. Spark is **on-path** as Ideate.

**Keyboard:** digits `1`–`7` jump process steps when focus is not in a field.  
**G / path N/7 / strip:** earliest empty process step (not always “next label”).

## Design file (what ships)

| Artifact | Role |
|----------|------|
| Sticky **direction sheet** on Design | Live leave-behind **preview** (edit accordion below) |
| **Multi-page vector brand book PDF** | Primary client handoff on Deliver |
| HTML / MD / JSON pack | Alternate leave-behind formats |

Vector PDF maps type pair **labels** to built-in PDF fonts (not full webfont embedding).

## Color

| Role | Light | Notes |
|------|--------|--------|
| Canvas | Stone `#F5F5F4` | Flat paper — no teal/white AI bloom |
| Ink | Near-black `#0C0A09` | Primary text and chrome |
| Growth | Teal `#0F766E` | Success / accent growth only |
| Brand color | **On pack artboard only** | Never indigo SaaS chrome |

**Forbidden residual:** indigo/lilac (`#eef2ff`, `#1e1b4b`), rainbow XP fills, soft multi-glow orbs.

**Stock blank palette** (`#1C1917 #0F766E #A8A29E #FAFAF9`) alone does **not** mark Design step complete — require tagline, voice, logo, roles, or a customized palette.

## Type

- **UI:** Plus Jakarta Sans (desk chrome)  
- **Pack page title (sheet):** Fraunces when CSS available  
- **Pack sheet body:** project type pair (heading + body on Design)  
- **Vector PDF:** built-in font mapping from labels  
- Display tracking tight; body readable, not shouting.  

## Motion

- Path mark Lottie + Helper body Lottie (code-split)  
- Settings **or** OS `prefers-reduced-motion` → static  
- Prefer hard contact shadows over soft product glow  

## Illustration

| Asset | Language |
|-------|----------|
| Path mark | Three rising steps in a rounded square |
| Empty states | Same mark language — **no floating orbs** |
| Helper | Handcraft desk mascot (matte / felt texture); stage is paper prop |

## Components

- **Primary CTA:** one per fold (Complete step, Go to next process step, Print/Download on Deliver)  
- **Honesty:** navigate labels must not say “Download”  
- **Confirms:** inline banners — avoid `window.confirm` for path-critical flows  
- **Modals:** focus trap + restore via `useModalFocus`  

## Tone

Plain. One job per sentence. Helper can be warm-sassy but short. No productivity theatre. Path N/7 ≠ client-ready leave-behind.

## Surfaces

| Surface | Feel |
|---------|------|
| Header / menus | Near-solid paper, light blur only |
| Work hero | Stone card + left ink rail |
| Helper panel | Cream card, matte hero stage |
| Pack | Document / leave-behind |

## Marketing assets

`public/one-pager.html` is a **marketing** sheet and may use a separate type/palette for print/PDF pitch decks. Product UI follows this grammar.

---

*This grammar supersedes purple “Flow/Studio” language and legacy 4-step Clarify→Refine buddy copy.*
