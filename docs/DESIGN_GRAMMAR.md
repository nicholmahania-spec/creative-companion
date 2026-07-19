# Design grammar — Creative Companion

**Last updated:** v1.11 (2026-07-19)  
**Product:** ADHD creative desk — one step on screen, one brand pack at the end.

## Path (only five stops)

| # | Label | Job |
|---|--------|-----|
| 1 | **Project** | Name the work. Who is it for? |
| 2 | **Work** | One step only. Complete it. Next rises. |
| 3 | **Board** | Upload refs. Star up to 6 for the pack. |
| 4 | **System** | Colors, voice, type, do/don’t — live artboard. |
| 5 | **Pack** | Preview, print, or download vector PDF. |

Tools (Timer, Calendar, Spark, Settings) are **off-path**. Path bar shows “Tools · …” when there.

**Keyboard:** digits `1`–`5` jump path steps when focus is not in a field.

## Color

| Role | Light | Notes |
|------|--------|--------|
| Canvas | Stone `#F5F5F4` | Flat paper — no teal/white AI bloom |
| Ink | Near-black `#0C0A09` | Primary text and chrome |
| Growth | Teal `#0F766E` | Success / XP / accent growth only |
| Brand color | **On pack artboard only** | Never indigo SaaS chrome |

**Forbidden residual:** indigo/lilac (`#eef2ff`, `#1e1b4b`), rainbow XP fills, soft multi-glow orbs.

## Type

- **UI:** Plus Jakarta Sans (desk chrome)  
- **Pack page title:** Fraunces (display occasion only — leave-behind)  
- **Pack sheet body:** project type pair (heading + body on System)  
- Display tracking tight; body readable, not shouting.  
- Never reintroduce purple-era Instrument Serif as global UI.

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

- **Primary CTA:** one per fold (Complete step, Go to Pack navigate, Print/Download on Pack)  
- **Honesty:** navigate labels must not say “Download”  
- **Confirms:** inline banners — avoid `window.confirm` for path-critical flows  
- **Modals:** focus trap + restore via `useModalFocus`  

## Tone

Plain. One job per sentence. Helper can be warm-sassy but short. No productivity theatre.

## Surfaces

| Surface | Feel |
|---------|------|
| Header / menus | Near-solid paper, light blur only |
| Work hero | Stone card + left ink rail |
| Helper panel | Cream card, matte hero stage |
| Pack | Document / leave-behind |

---

*This grammar supersedes purple “Flow/Studio” language in older redesign briefs.*
