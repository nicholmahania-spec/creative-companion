# Redline v1.8.0 — UI audit + UX audit

**Date:** 2026-07-19  
**Base:** v1.7.1 (photoreal Helper body + hero stage)  
**Scope:** Path spine, Helper panel density, chrome/deep leftovers, a11y motion, System/Pack honesty, ADHD cognitive load.

## P0 — implement this cycle

| # | Issue | Fix |
|---|--------|-----|
| 1 | Break care open auto-`logBreak` | Toggle panel only; log only on explicit control |
| 2 | System accordion can hide all sections | Never set section to `null` |
| 3 | System CTA “Download pack” only navigates | Label **Go to Pack** / `openPack` |
| 4 | System sticky artboard starved by 780px main | Wider measure for system-view / pack-view |
| 5 | Helper panel overflows short viewports | Card max-height + scroll; shrink hero on short height |
| 6 | OS `prefers-reduced-motion` ignored by Lottie | OR OS media with Settings pref |
| 7 | Board lightbox modal without focus management | Focus close on open; Esc already; basic restore |

## P1 — implement this cycle (quick wins)

| # | Issue | Fix |
|---|--------|-----|
| 8 | Work lacks path-forward CTA | **Go to Board** via `journeyNext` |
| 9 | Empty titles hard-coded EN | Wire `ui.noStepYet` / `noPinsYet` / `packDest` / `queueClear` |
| 10 | Twin primaries Coach+Critique | Coach primary; Critique secondary |
| 11 | Action toast indigo | Stone charcoal |
| 12 | Deep header / more-menu navy | Stone deep tokens |
| 13 | Deep Helper hero indigo tint | Charcoal + sage |
| 14 | helperQuiet still pings on view change | Skip view/step tips when quiet |
| 15 | Status line 1-line truncate | 2-line clamp |
| 16 | Tools menu missing Spark | Add Spark menuitem |
| 17 | Export modal raster PDF lie | Align copy with vector primary |
| 18 | Deep `--text-muted` too faint | Bump toward 0.55 |

## P2 — park

- Full modal focus-trap system for all dialogs  
- Full i18n surface for Settings/Helper  
- DESIGN_GRAMMAR rewrite (stone + 5-step path)  
- Thin-pack inline confirm (vs `window.confirm`)  
- Mood-specific Helper expression PNGs  

## Acceptance

1. Opening Break does not award break XP / reset wellness.  
2. System always shows one edit section.  
3. System primary says Go to Pack.  
4. Desktop System shows sticky artboard beside edit.  
5. Helper card scrolls inside short viewports.  
6. OS reduce-motion stops Lottie without Settings.  
7. Unit tests + build:check pass.  
