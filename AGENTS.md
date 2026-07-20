# Creative Companion — agent rules

## Color changes → dark mode audit (mandatory)

**Whenever you change colors** — CSS variables, hex/rgb/hsl values, gradients, borders, shadows that tint UI, `theme-color`, or tokens in `:root` / `.app.deep` — you **must** audit dark mode before calling the work done.

Dark mode is `.app.deep` (user theme `deep`), not a separate stylesheet.

### Do not ship if

- Body / meta / secondary text is hard to read on dark surfaces
- Primary or dopamine CTAs fail contrast on their background
- Borders, chips, or muted chrome vanish into the canvas
- Focus rings or active path states disappear on deep
- Hardcoded light-only colors (`#fff`, `#fafaf9`, stone grays) sit on dark without a `.app.deep` override or token

### Audit checklist (both themes)

Run mentally or in the running app with theme toggled to **deep**:

1. **Tokens** — every new/changed color has a paired deep value, or uses a semantic token (`--text-*`, `--bg-*`, `--border-*`, `--dopamine*`, `--accent-*`) that already works on deep
2. **Text** — primary ≥ ~4.5:1 on surface; secondary/muted still legible (not < ~3:1 on its bg)
3. **Interactive** — buttons, links, path steps, gap strip, Home CTAs readable in default + hover + active + disabled
4. **Chrome** — header, journey bar, GameHUD, menus, modals, toasts, footer
5. **Surfaces** — panels, step-focus hero, Home master/detail, empty states, alerts
6. **Accent scope** — dopamine stays high-contrast on deep; growth/done states stay readable; no light-theme-only ink
7. **Hardcoded hex** — search the diff for `#` and `rgb(`; any light-assuming value needs deep handling

### How to verify

- Prefer semantic tokens over one-off hex
- Toggle **Switch to dark** in the account menu (or set theme `deep`)
- Spot-check: Home, path step (Sketch), Design, Deliver, Tools menu
- Use `src/lib/color.js` (`contrastRatio`, `contrastGrade`) for questionable pairs
- If unsure, fix deep first — never “ship light, dark later”

### Related

- Design grammar: `DESIGN_GRAMMAR.md` → **G4.4 Dark mode audit**
- Palette tokens live in `src/index.css` (`:root` + `.app.deep`)
