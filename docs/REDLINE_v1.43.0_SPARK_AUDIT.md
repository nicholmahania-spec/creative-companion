# Redline v1.43.0 — Apply Spark / Ideate audit

Implements S1–S4 from `SPARK_AUDIT_v1.42.md`.

## S1 — Honesty
1. `pathStepHasContent('ideate')` requires **direction title/note** or **quote/spark pin** — not bare `sparkIndex`
2. `oppositeSpark` uses wrapping `oppositeIndex`; no longer unbounded `sparkIndex++`
3. `sparksTried` increments on Another / Opposite (energy UI only)
4. Unit: journeyProgress ideate matrix + `sparkStore.test.js`

## S2 — Fidelity UX
1. Process tip panel from `getProcessPhase('ideate')`
2. Split progress: Sparks tried N/8 · Shortlist F/3
3. Pin spark stays on Ideate + micro toast
4. i18n: path title, actions; open Research separate from pin

## S3 — Sketch bridge
1. **Queue chosen → Sketch** when a titled direction is Chosen

## S4 — E2E
1. process-walk: Opposite leaves Ideate thin; checklist visible; Queue chosen after Choose

## Verify
Unit 67 · Playwright 13/13 · perf ≤430 KB
