# Redline v1.41.0 — Clickable still-thin + path guide i18n

Process strip after v1.40 fill hints.

## Shipped

### Wave A — Jump any thin step
1. **Still thin** labels are buttons → `goToProcessStep` (view + focus field)
2. Path bar empty step click focuses useful field
3. Shared `goToProcessStep` for ADHD land-on-work

### Wave B — i18n
1. `ui.stillThin`, step filled/open, next gap / ship copy (EN + ES)
2. `fillHint.*` + `pathFillHint(locale, stepId)`
3. `tFormat` for `{label}` templates
4. Localized next-gap micro toasts and strip button

## Verify

Unit 62+ · Playwright 13/13 · perf ≤430 KB
