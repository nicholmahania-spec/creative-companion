## How to build with Creative Companion

Creative Companion is a **CSS-variable design system with global semantic
classes**. It is NOT a utility-class system.

**There is no Tailwind here.** No `flex`, `gap-4`, `rounded-lg`,
`bg-background`, `text-muted-foreground`, `min-h-[80px]` — none of those class
names exist in the stylesheet and they will render as nothing. If you need
layout, write real CSS (inline `style` or your own rule) using the tokens
below.

### Setup

Load `styles.css` once. No provider or wrapper component is required —
`Button` is a plain function component with no context dependency.

Theme: light is the default on `:root`. **Dark mode is opt-in via a container
class**, not `prefers-color-scheme` and not a `data-theme` attribute:

```jsx
<div className="app deep">…</div>   {/* dark surfaces + dark text tokens */}
```

### Tokens — the styling vocabulary

Always `var(--token)`; never hard-code a hex, a px radius, or an ad-hoc size.

| Family | Names |
|---|---|
| Surfaces | `--bg-canvas` (page, `#F5F5F5`), `--bg-card`, `--bg-elevated`, `--bg-muted`, `--bg-warm`, `--bg-surface` |
| Text | `--text-primary` (`#1A1A1A`), `--text-secondary`, `--text-muted` (`#6B6B73`) |
| Borders | `--border-subtle`, `--border-strong`, `--border-hairline`, `--border-default`, `--border-focus`, `--border-accent` |
| Accent | `--accent-primary`, `--accent-deep`, `--accent-soft`, `--accent-growth`, `--accent-danger`, `--dopamine`, `--dopamine-deep`, `--dopamine-soft`, `--dopamine-ink` |
| Spacing | `--space-1` … `--space-7` = 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3 rem |
| Type size | `--fs-1` … `--fs-6` = 0.75 / 0.875 / 1 / 1.25 / 1.5 / 2 rem |
| Font | `--font-sans` (Plus Jakarta Sans), `--font-display` (aliases `--font-sans`) |
| Radius | `--radius` = **4px**, `--radius-pill` = 999px, `--radius-none` = 0 |

Three hard rules, each enforced by a test in the source repo:

1. **Size type in `rem`, never `px`** (`--fs-*` already are).
2. **Font weight is 500, 600 or 700 only.** No other weight is loaded; asking
   for one gets rounded inconsistently.
3. **One corner radius: `var(--radius)`, 4px.** `--radius-sm`, `--radius-organic`,
   `--radius-squircle` and `--radius-node` all resolve to `var(--radius)` — they
   are back-compat aliases, not distinct sizes. Never write a literal radius.

Also: cap body copy at `65ch`, and keep muted text at 4.5:1 contrast — use
`--text-muted`, which is already tuned for that against both the light and dark
canvases.

### Components

`Button` is the only component in this library. Read
`components/general/Button/Button.d.ts` for its exact props and
`Button.prompt.md` for usage. Everything else you build from the tokens above
and plain elements.

`variant`: `primary` | `secondary` | `ghost` | `outline` (`outline` is an alias
of `secondary`). `size`: `md` | `sm` (`soft` aliases `sm`). Give a screen **one**
primary button; pair it with `ghost` for the escape action.

### Where the truth is

Read `styles.css` and the `_ds_bundle.css` it imports before styling — that is
the real, complete stylesheet (210 KB), and it is authoritative over this
summary. `guidelines/DESIGN_GRAMMAR.md` carries the product's layout and
interaction intent. (Note: that document's header names "Instrument Serif ·
Inter" as the typefaces — this is stale; the shipped font is Plus Jakarta Sans
via `--font-sans`. Trust the token, not the doc.)

### Idiomatic example

```jsx
const { Button } = window.CreativeCompanion;

<section
  style={{
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius)',
    padding: 'var(--space-6)',
    maxWidth: '65ch',
  }}
>
  <h2 style={{ font: '600 var(--fs-5)/1.2 var(--font-display)', margin: 0, color: 'var(--text-primary)' }}>
    Send this brief to your client
  </h2>
  <p style={{ fontSize: 'var(--fs-3)', color: 'var(--text-muted)', margin: 'var(--space-3) 0 var(--space-5)' }}>
    They can fill it in from a link — no account needed.
  </p>
  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
    <Button variant="ghost">Back</Button>
    <Button variant="primary">Send to client</Button>
  </div>
</section>
```

# CreativeCompanion (creative-companion-react@2.0.0)

This design system is the published creative-companion-react React library, bundled as a single
browser global. All 1 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.CreativeCompanion`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).
- `guidelines/` — the design system's own usage guidance (1 doc(s), see `guidelines/index.md`). Read these before composing larger layouts.

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.CreativeCompanion.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Button } = window.CreativeCompanion;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Button />);
```

## Tokens

107 CSS custom properties from creative-companion-react. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (19): `--bg-canvas`, `--bg-warm`, `--bg-card`, …
- **spacing** (8): `--highlight-inset`, `--space-1`, `--space-2`, …
- **typography** (3): `--font-sans`, `--font-display`, `--tracking-display`
- **radius** (8): `--radius-none`, `--radius`, `--radius-pill`, …
- **shadow** (7): `--glass-shadow`, `--shadow-0`, `--shadow-1`, …
- **other** (62): `--accent-primary`, `--accent-deep`, `--accent-soft`, …

## Components

### general
- `Button`
