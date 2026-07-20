# Redline v1.46.0 — All ranked residuals closed

Closes leftover items from humanize / redundancy / spark / prompt cycles.

## Closed

| Residual | Fix |
|----------|-----|
| Hard-coded niche toasts | Routed through i18n EN keys (+ ES overrides for humanize set) |
| pack-ready-fix ad-hoc nav | `goToProcessStep` + `focusPathGapTarget` for handoff/learnings |
| ES missing toast keys | Spanish strings for step/export/helper micros |
| leave-behind full fallback EN | `ui.leaveBehindFull` |

## Accepted product boundary (not residuals)

| Item | Why not a bug |
|------|----------------|
| GameHUD XP when Progress on | Opt-in progress mode |
| Helper sass | Product voice |
| App.jsx size | Structural debt, not user-facing residual |
| Soft Signal custom spark | Demo intentional |
| FR/DE/JA/AR full toast catalog | EN fallback via `t()` is designed behavior |
| PathProgressPanel `showFixCta` API | Kept for flexibility; default off |

## Verify
Unit · Playwright · perf · residual checklist zero P0/P1
