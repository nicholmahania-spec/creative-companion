# design-sync notes — creative-companion

Repo-specific gotchas for future syncs. Read this before re-running.

## What this repo is

Not a published component library — it's a private React 19 + Vite app
(`"private": true`, no `main`/`module`/`exports`/`types`). `dist/` is the Vite
**app** build, not a library build, so there is no library entry to bundle.
The converter runs in **synth-entry mode** from `src/`.

## Scope: Button only (owner's call, 2026-07-28)

`src/components/ui/` holds five files. Only `Button.jsx` is real.

Verified 2026-07-28:

- **No Tailwind exists in this repo.** No `tailwind.config.*`, no
  `postcss.config.*`, no tailwind dependency. `Button.jsx`'s own header comment
  says so: *"Maps to live desk CSS classes in index.css (no Tailwind / no
  btn-outline)."*
- `Card.jsx`, `Textarea.jsx`, `ButtonGroup.jsx` style themselves entirely with
  Tailwind utility classes (`rounded-lg`, `bg-background`, `inline-flex`,
  `min-h-[80px]`, `text-muted-foreground`, …). Those classes resolve to
  **nothing**. The components render as unstyled boxes.
- `Badge.jsx` maps to `.badge`, `.badge-muted`, `.badge-accent`,
  `.badge-outline`, `.badge-destructive` — **zero `.badge` rules exist in any
  CSS file in the repo**. It carries its own `// we need to define destructive
  badge` comment. Also renders unstyled.
- `Button.jsx`'s classes (`.btn`, `.btn-primary`, `.btn-secondary`,
  `.btn-ghost`, `.btn-sm`) **are all defined** in `src/styles/shell.css`.
- **None of the five are imported anywhere** in `src/` or `e2e/` — grep finds
  zero usages. They are dead code, which is why the rot went unnoticed.

Shipping the four broken ones would put unstyled components in front of the
design agent, which would then reproduce them wrong in every design it builds.
That is the "UI in front of nothing" case the repo's build rule forbids, so
they are excluded via `componentSrcMap: null`.

**To widen scope later:** fix those four against real `shell.css` classes (or
add the missing `.badge` rules to `shell.css`), then drop their `null` entries
from `componentSrcMap` and author previews.

## Where the design system actually lives

- `src/index.css` is 2 lines — it only `@import`s `./styles/shell.css`.
- `src/styles/shell.css` (9,372 lines, 167 custom properties) is the real
  always-on design system. This is `cfg.cssEntry`'s target via `index.css`.
- `src/styles/lazy-*.css` are per-route stylesheets imported by their view
  components, not part of the always-on shell.
- **`src/theme/theme.css` is orphaned** — 124 lines of motion tokens
  (`--duration-*`, `--ease-*`, `--spring-*`) that **nothing imports**. Its own
  header comment says "Add to the root variables in theme.css", i.e. it was
  never wired up. Not synced, because the app itself doesn't use it. Worth
  fixing in the app separately.

## Running it (there is no library build)

```sh
node .ds-sync/resync.mjs --config .design-sync/config.json \
  --node-modules ./node_modules --entry ./.design-sync/ds-entry.js --out ./ds-bundle
```

`--entry` is mandatory and must be passed every time:

- Without it the converter looks for `node_modules/creative-companion-react`
  and **crashes** (`ENOENT … /package.json`) — npm never self-installs a
  private app, so that path cannot exist.
- `.design-sync/ds-entry.js` is a committed 1-line library entry that exports
  only the synced components. It also fixes `PKG_DIR`: the converter walks up
  from the entry to the nearest named `package.json`, landing on the repo root.
- Do NOT drop `--entry` to "let it synthesize". Synth-entry mode `export *`s
  **every** `.jsx` under `src/` — that bundles the whole application (store,
  routes, Supabase client), not the design system.

`@types/react` is not a dependency of this repo, so prop extraction degrades
(`[DTS_REACT]`). Fixed without touching `package.json` by symlinking the staged
copy — recreate per clone:

```sh
mkdir -p node_modules/@types && ln -sfn ../../.ds-sync/node_modules/@types/react node_modules/@types/react
```

Even with types present, `Button.jsx` is untyped JS, so extraction yields a
bare `[key: string]: unknown`. The real contract is hand-written in
`cfg.dtsPropsFor.Button` — **keep it in sync with the component by hand**;
nothing checks it.

## Config gotchas hit on the first run (2026-07-28)

- **`cssEntry` must be `src/styles/shell.css`, not `src/index.css`.** The
  converter copies `cssEntry` verbatim into `_ds_bundle.css`; it does not
  resolve relative `@import`s. Pointing at the 2-line `index.css` shipped a
  dangling `@import './styles/shell.css'` and **zero** actual CSS (106 bytes)
  while still exiting 0. Always check `_ds_bundle.css`'s byte count after a
  config change — it should be ~210 KB.
- **`tokensGlob` is a no-op without `tokensPkg`.** It globs *inside a
  node_modules tokens package*, not the repo (`copyTokens` returns early on
  `if (!tokensPkg)`). An initial attempt to ship the webfonts through it
  failed silently — `tokens/` was empty and nothing warned. Fonts go through
  `extraFonts` instead.
- **`guidelinesGlob` defaults sweep `docs/**/*.md`** — that pulled 128 internal
  audit logs (`MICRO_AUDIT_*`, `REDLINE_*`, `PROMPT_AUDIT_*`) into the design
  agent's guidelines. Narrowed to `DESIGN_GRAMMAR.md` only, per the owner
  2026-07-28.

## Known render warns (checked on every re-sync — an unlisted warn is new)

- `[TOKENS_MISSING]` — 20 undefined custom properties, all legitimately absent:
  - `--tw-translate-x/-y`, `--tw-rotate`, `--tw-skew-x/-y` … — **dead Tailwind
    runtime variables left in `shell.css`** from an era when the repo had
    Tailwind. Nothing sets them; they are inert. (Same root cause as the four
    broken `ui/` components.)
  - `--z-overlay`, `--z-toast`, `--define-ch-1`, `--define-muted` — defined in
    the `src/styles/lazy-*.css` route stylesheets, which are deliberately not
    synced (they are per-route, not the always-on shell).

## Fonts

Font families are loaded by a Google Fonts `<link>` in `index.html`, not by any
`@font-face` in the CSS — so nothing in the stylesheet closure would load them
and every design would silently render in a fallback. Handled by shipping a
small CSS file carrying the equivalent `@import url(...)`; expect
`[FONT_REMOTE]` (informational), not `[FONT_MISSING]`.

Families in that request: DM Sans, Fraunces, Lato, Libre Baskerville, Playfair
Display, Plus Jakarta Sans, Source Sans 3, Space Grotesk.

## Re-sync risks

- **Scope is deliberately one component.** A future sync that suddenly reports
  five is a sign someone "fixed" the `componentSrcMap` nulls without fixing the
  components. Check the four render styled before widening.
- **Synth-entry mode has no `.d.ts` to read from** — `Button`'s props contract
  is extracted from JSX source, so it is weaker than a typed library build
  would give. If props go missing from `Button.d.ts`, that's why; the fix is
  `cfg.dtsPropsFor.Button`.
- **The font `@import` is remote.** If Google Fonts is unreachable, or the
  family list in `index.html` changes, `.design-sync/webfonts.css` goes stale
  independently — it is a hand-maintained copy of that `<link>`, not derived
  from it.
- **`.design-sync/conventions.md` is the highest-leverage file here** — it is
  inlined into the design agent's system prompt. Every class/token it names was
  verified against `ds-bundle/_ds_bundle.css` on 2026-07-28. Re-validate on
  every sync rather than trusting it; do not rewrite it wholesale.
- **`guidelines/DESIGN_GRAMMAR.md` is partly stale** and ships anyway (owner's
  call): its header names "Instrument Serif · Inter" as the typefaces, but
  `--font-sans` is Plus Jakarta Sans and `CLAUDE.md` records that Inter was
  never loaded at all. `conventions.md` explicitly contradicts it so the agent
  trusts the token. If the doc is ever corrected in the repo, drop that
  correction from `conventions.md` too.
- **Dark mode is `.app.deep`**, a container class — not `prefers-color-scheme`
  and not `data-theme`. If the app ever switches mechanism, `conventions.md`'s
  setup snippet goes wrong silently.
- `src/index.css` being a 2-line shim is load-bearing for `cssEntry`. If the
  app ever inlines shell.css back into `index.css` or adds more `@import`s, the
  synced closure changes shape.
