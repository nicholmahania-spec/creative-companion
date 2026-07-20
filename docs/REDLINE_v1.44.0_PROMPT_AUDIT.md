# Redline v1.44.0 — Apply prompt audit

Implements P1–P4 from `PROMPT_AUDIT_v1.43.md`.

## P1 — Persona single source
- `lib/helperPersona.js`: `HELPER_SYSTEM_PROMPT` + `DESIGN_SYSTEM_PROMPT` alias
- 7-step spine only (removed stale 4-step buddy identity)
- helperAi + buddy re-export shared persona

## P2 — Spark deck rebalance
- Removed main-list “Opposite day” (Opposite button owns that)
- Added empty-state + primary-action UI prompts
- Six-word shortlist moved to index 0
- oppositeSparks +1 color-role opposite
- Unit: `sparkPrompts.test.js`

## P3 — DRY process tips
- `designProcessTip` prefers `getProcessPhase(id).prompt`
- Softened “5–8 sparks” → many directions / shortlist A/B/C (journey, processGuide, pathPlain)

## P4 — Context injection
- Ideate spark card shows detective/brief goal line when set
- Helper activity: goal, audience, pathDoneCount, nextGapLabel
- Live intentUserPrompt includes those fields

## Verify
Unit · Playwright · perf ≤430 KB
