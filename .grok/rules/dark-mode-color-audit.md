# Dark mode color audit

**Trigger:** Any change to colors (CSS tokens, hex/rgb, gradients, tinted shadows, `theme-color`, `:root`, `.app.deep`).

**Required:** Audit **deep** theme (`.app.deep`) so every changed surface stays readable. Do not ship light-only color work.

## Checklist

- [ ] Semantic tokens preferred over one-off hex
- [ ] Paired deep values where needed
- [ ] Primary text contrast ~≥4.5:1; secondary/muted still legible
- [ ] Buttons, links, path active/dopamine, chips readable on deep
- [ ] Borders/chrome visible (not lost into canvas)
- [ ] No hardcoded light-only colors on dark without override

## Verify

Toggle theme to dark in the app. Spot-check Home, Sketch, Design, Deliver, Tools.

See root `AGENTS.md` and `DESIGN_GRAMMAR.md` § G4.4.
