# Redline v1.27.0 — Soft Signal process seed + design version discipline

## Shipped

1. **Soft Signal demo** seeds full process fields: Design Detective Sheet, A/B/C directions (A chosen), logo wordmark/clearspace, designVersion v2, feedback notes, handoff, learnings. Stage labels = real 7-step path.
2. **Design → Bump** version control (vN → vN+1) via `bumpDesignVersion`.
3. **Go to Review** auto-bumps v1 → v2 so version discipline is hard to skip.
4. **Path bar hasContent**: Review marks done with feedback notes; Deliver with handoff/learnings; Design with version ≠ v1.
5. **Hydrate** merges detective + directions defaults for older backups.

## Verify

Unit 49 · Playwright 8/8 · perf ~421.5 / 425 KB
