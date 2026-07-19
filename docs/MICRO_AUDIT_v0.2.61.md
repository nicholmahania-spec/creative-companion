# Micro audit — v0.2.61 (axe, quiet toasts, PWA, perf budget)

**Date:** 2026-07-19  
**Checks:** unit 24/24 · e2e 7/7 (incl. axe) · build green · perf budget pass

| Item | Status |
|------|--------|
| axe-core serious/critical on path | **Pass** (color-contrast disabled for brand swatches) |
| Quiet micro toasts | **Pass** (errors/export/complete remain) |
| SW cache v3 + assets/buddy | **Pass** |
| Settings offline note | **Pass** |
| `npm run test:perf` + CI | **Pass** (main JS ~350KB / 420KB) |

## Verdict

Ship **v0.2.61**.
