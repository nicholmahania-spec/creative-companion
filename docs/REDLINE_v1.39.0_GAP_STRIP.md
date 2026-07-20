# Redline v1.39.0 — Gap strip + this-step chip

Continues process discoverability after v1.38 path pill parity.

## Shipped

### Wave A — Under-path gap strip
1. **This step · filled / open** chip (current journey step via `pathStepHasContent`)
2. **Next gap · {label} · G** button → same as `goToNextProcessGap`
3. When process full → **Ship · brand book PDF** → Deliver
4. Path pill title includes next gap name when known

### Wave B — Discoverability
1. Shortcuts sheet: N/7 pill + gap strip lines
2. Tools keyboard chip mentions path N/7
3. Helper activity tips (Define / Research / Ideate / Design / Review / Deliver) mention path N/7 or G

### Wave C — Bundle
1. **EmptyIllustration** lazy-loaded (main chunk headroom for strip)

## Verify

Unit 60 · Playwright 13/13 · perf ≤430 KB main
