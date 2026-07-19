# Redline v1.9.0 — Copy audit

**Date:** 2026-07-19  
**Base:** v1.8.0  
**Lens:** ADHD cognitive load, path honesty, one idea per sentence, consistent verbs, character without thrash.

## Principles

1. **One job per string** — no stacked instructions in empty states.  
2. **Honest CTAs** — navigate ≠ download; print ≠ vector PDF.  
3. **Plain over jargon** — “step you can finish” beats “shippable outcome” where users first land.  
4. **Helper personality stays**, but greetings/tips stay under ~120 chars when possible.  
5. **Catalog first** — English `i18n.ui` owns product chrome; locales fall back.

## P0 — fix this cycle

| # | Bad | Fix |
|---|-----|-----|
| 1 | `packSub`: “print · or download preview” under-sells vector PDF | “Print for paper · or download vector PDF” |
| 2 | `packHint` three-product essay | Two short sentences; keep “vector PDF” for e2e |
| 3 | Work empty: two long “shippable/micro-steps” lines + packDest wall | One body sentence; packDest shorter |
| 4 | Project “Open Work step” grammar | “Has an open Work step” |
| 5 | Thin-pack `confirm` walls | Short: “Pack is thin (no tagline, palette, or pins). Print/Download anyway?” |
| 6 | System “Open Pack” vs journey “Go to Pack” | Align EN `openPack` → **Go to Pack** |
| 7 | Onboard still “shippable” dense | “one step you can finish in ~25 minutes” |
| 8 | How-this-desk card multi-path stack | “One step on screen. Finish it. Board → System → Pack.” |
| 9 | Break-care open chat dump | One short line |
| 10 | Helper greetings very long / twin-primary in-joke | Shorter warm-sassy set |

## P1 — fix this cycle

| # | Item | Fix |
|---|------|-----|
| 11 | Board empty body | Shorter; keep ★ Pack instruction |
| 12 | Project / System page-subs | Plain, parallel structure |
| 13 | Pack fallback pins hint | “Star pins on Board to curate” |
| 14 | Export panel raster note | Already fixed 1.8 — tighten once more if needed |
| 15 | Tools Spark subtitle | “Loose idea → pin or step” |
| 16 | `pathPlain.pack` | Match pack honesty |
| 17 | Wire new EN keys into App empties | `emptyStepBody*`, `emptyPinsBody`, `howDeskWorks`, `thinPackConfirm*` |

## P2 — park

- Translate all new keys into es/fr/de/pt/ja/ar (fallback EN OK)  
- Settings full i18n surface  
- Helper scripted library full pass (WATER/FOOD length)  
- Soften remaining window.confirm walls to inline panels  

## Acceptance

1. Pack sub + hint match Print vs vector PDF.  
2. Empty Work is one title + one body (+ short packDest).  
3. Project readiness copy is grammatical.  
4. Go to Pack is consistent on System.  
5. e2e still finds Print / Save as PDF + vector PDF.  
6. Tests + build:check green.  
