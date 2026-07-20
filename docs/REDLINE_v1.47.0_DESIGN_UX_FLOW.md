# Redline v1.47.0 — Design file + UX flow + transition audits

Implements D1–D4, F1–F4, and transition honesty from:

- `DESIGN_FILE_AUDIT_v1.46.md`
- `UX_FLOW_AUDIT_v1.46.md`
- Transition scorecard (craft vs navigation)

## Shipped

### D1 / F2 — Design progress honesty
- Stock default palette alone ≠ Design done
- Craft: tagline, voice, logo/wordmark, color roles, or customized palette
- Unit: `isStockProjectPalette` + design hasContent matrix

### D2 — Preview clarity
- Design sticky caption: direction sheet preview vs multi-page brand book PDF
- Edit below only (`editable={false}` kept, labeled)

### F1 — First-run coherence
- Define chip: first Sketch step title + Open Sketch step

### F2 — Path vs leave-behind trust
- Strip + Deliver: “Path has content · leave-behind still thin…”

### F3 — Break continuity
- `preBreakView` / `resumeView` restore after forced break + micro toast

### F4 — Earliest empty
- Gap strip: “Earliest empty · {step} · G” when ≠ journey next

### D3 — Grammar
- `DESIGN_GRAMMAR.md` → v1.47 process + design-file rules
- one-pager marked marketing-only

### D4 — Model hygiene
- Empty `conceptPackage` omitted from pack snapshot
- Deliver: vector PDF font honesty line

## Verify
Unit · Playwright 13/13 · perf budget
