# Creative Companion

React 19 + Vite 8 + Zustand 5 single-page app.

## Commands

```sh
npm run build   # production build (do NOT call `vite build` directly — vite is not on $PATH)
npm run dev     # dev server
npm test        # vitest unit tests
npm run bump    # increment version in src/lib/version.js
```

## Branch

Active development branch: `claude/debug-code-6u77sp`

## Key files

- `todo.md` — prioritized remaining work list
- `insights.md` — architecture, design tokens, CSS gotchas, critical constraints
- `src/index.css` — full CSS design system (~15k lines); LightningCSS strict — never leave orphaned declarations outside a rule block
- `src/App.jsx` — central orchestration / prop-drilling hub
- `src/store/useAppStore.js` — Zustand store
