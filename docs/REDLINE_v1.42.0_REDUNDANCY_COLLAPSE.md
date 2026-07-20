# Redline v1.42.0 — Redundancy collapse (audit applied)

Implements D1–D4 from `REDUNDANCY_AUDIT_v1.41.md`.

## D1 — Chrome collapse
- Removed per-step **Gap · G** (Define, Research, Ideate, Sketch, Design, Review)
- Removed Define **Fix next gap · G** secondary
- PathProgressPanel: `showFixCta={false}`, `showMissing={false}` (strip owns next-gap + still thin)
- Research empty: fill hint + **G** only (no nested Gap button)

## D2 — One path context
- `buildPathProgressCtx(storeState)` — single project filter
- `pathRows` / `pathDoneCount` / `pathNextGap` / `pathMissing*` from one summary
- Review + Deliver panels share memos (no IIFE rebuild)
- `goToNextProcessGap` → `goToProcessStep(gap, { micro: 'next' })`

## D3 — One fill-hint source
- `PATH_FILL_HINTS` + `pathStepFillHint` in journeyProgress (EN)
- `pathFillHint(locale)` uses locale override then EN helper
- Removed EN fillHint table from i18n (ES overrides remain)

## D4 — Catalog + copy
- `PROCESS_PHASES` derived from `JOURNEY_STEPS` + COACHING overlay
- Helper tips no longer spam “Path N/7 or G”
- Shortcuts: one line for G / N/7 / strip

## Verify
Unit 64 · Playwright 13/13 · perf ≤430 KB
