# Redundancy re-audit cycle — v1.42.0

After applying D1–D4 from v1.41 audit.

## Before → after

| Surface | v1.41 | v1.42 |
|---------|-------|-------|
| Interactive “same as G” CTAs | ~8–10 | **3** (G, ⌘K, strip/pill) |
| Still thin UIs on Review | 2–3 | **1** (strip) |
| PathProgress IIFEs | 2 | **0** |
| Fill-hint EN tables | 2 | **1** |
| Process id catalogs | 2 parallel | **1 spine** (journey + coach overlay) |
| Helper Path N/7 spam | every path tip | **0** |

## Remaining intentional (not bugs)
1. Path pill **and** strip both call next gap — pill = count, strip = next label + still thin (complementary chrome)
2. ⌘K lists gap for discoverability when not looking at path
3. Process tip checklists (teaching ≠ nav)
4. PathProgress **chips** (deep map for PDF readiness)

## New residual (low)
| Item | Severity |
|------|----------|
| PathProgressPanel still accepts showFixCta API (unused in app) | P3 dead API OK for tests |
| pack-ready-fix still uses ad-hoc setActiveView + focus | P2 optional → goToProcessStep |
| App.jsx still large | P2 |

## Verdict
**P0 UX noise closed.** Process gap has one chrome system. Re-audit clean for product ship.
