# Redline v1.38.0 — Path N/7 pill + Gap · G parity

Multi-wave process discoverability after v1.37.

## Shipped

### Wave A — Path bar process pill
1. **N/7** pill on path nav while journey active (replaces Tools · … only on path)
2. Click → Fix next process gap (same as **G**)
3. Partial / full styles (`is-partial`, `is-full`); `data-done` for count
4. When full → open Deliver + ship toast

### Wave B — Gap · G on every path step
1. **Define** — Fix next gap · G (existing)
2. **Research** — Gap · G beside pin count
3. **Ideate** — Gap · G in SparkView header
4. **Sketch** — Gap · G in flow top
5. **Design** — Gap · G (existing)
6. **Review** — Gap · G beside Back / Deliver

### Wave C — Correctness + palette
1. `goToNextProcessGap` scopes mood/tasks to **active project** (match desk filters)
2. ⌘K action label: `Fix next process gap (N/7)` or Process full
3. soft-signal e2e: pill ≥3/7 + Design Gap · G
4. brand-book-pdf: exact `^Fix next gap` selector (avoid pill clash)

## Verify

Unit 60 · Playwright 13/13 · perf ≤430 KB main
