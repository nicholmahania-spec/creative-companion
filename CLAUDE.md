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

## Design rule — ADHD / executive function first (non-negotiable)

Creative Companion exists to reduce executive-function friction for creative
freelancers (task initiation, working memory, decision fatigue, time
blindness, rejection sensitivity). This is the reason the tool exists, not a
secondary concern.

**Before finalizing any UI, UX, workflow, or gating decision, consult the
`adhd-executive-function-advisor` subagent first.** Aesthetics, convention,
and cleverness are subordinate to this lens. If a proposed change adds
friction (extra required decisions, ambiguous locked states, silent state
loss, shame-coded errors) it needs to be reworked or rejected, even if it is
otherwise good software design.
