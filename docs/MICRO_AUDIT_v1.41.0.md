# Micro audit v1.41.0

| Area | Check | Result |
|------|-------|--------|
| still-thin links | Only missing steps; +N not a button | OK |
| goToProcessStep | setActiveView + focusPathGapTarget | OK |
| Path bar | Focus only when !hasContent | OK |
| i18n EN/ES | stillThin + fillHint.research | OK |
| tFormat | Replaces all `{label}` occurrences | OK |
| pathStepFillHint | English fallback still in journeyProgress | OK |

## Residual

None P0/P1. Optional: FR/DE/JA/AR fillHint overrides (EN fallback works).
