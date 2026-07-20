# Redline v1.40.0 — Still thin + fill hints

Process guidance after path pill (1.38) and gap strip (1.39).

## Shipped

### Wave A — Fill hints
1. `pathStepFillHint(stepId)` — short how-to per process step
2. Gap strip chip when open: **Open · {hint}** (e.g. Pin at least one ref)
3. **Still thin:** first 3 missing steps (+N) on gap strip

### Wave B — Empty states + polish
1. Research empty board: Still thin · Research + Gap · G
2. Sketch empty (no tasks): Still thin · Sketch
3. Mobile gap strip: still-thin full-width under actions
4. PathProgressPanel **onFixNextGap** → same as G (micro toast + focus)

## Verify

Unit 61 · Playwright 13/13 · perf ≤430 KB
