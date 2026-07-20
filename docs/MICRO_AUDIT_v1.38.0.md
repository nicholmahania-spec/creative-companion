# Micro audit v1.38.0

| Area | Check | Result |
|------|-------|--------|
| Hooks | pathProgressCtx / pathDoneCount above early returns | OK |
| Project scope | Gap jump filters mood/tasks by currentProjectId | OK |
| Path pill | Visible only journeyActive; Tools pill off-path | OK |
| Gap CTAs | Define, Research, Ideate, Sketch, Design, Review | OK |
| Deliver | PathProgressPanel still owns Fix next gap | OK |
| Keyboard | G + ⌘K still wire goToNextProcessGap | OK |
| E2E | path-smoke Gap on 2–6; soft-signal pill; palette N/7 | OK |
| Perf | Main JS under 430 KB | OK |
| Product boundary | Still leave-behind / brand book, not Figma | OK |

## Residual

None P0/P1. Optional later: compact missing strip on Research empty board; i18n for Gap · G.
