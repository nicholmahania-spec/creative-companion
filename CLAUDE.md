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

**Reducing cognitive load is the single biggest priority within this rule.**
When choices compete, pick whichever one requires the user to think, decide,
or remember less — even over other ADHD-friendly considerations. Simpler
and dumber beats clever and complex.

## Pending idea — do not build yet (user has no concept of time / numbers don't register)

The user has explicitly said "I have no concept of time and numbers mean
nothing" — a real constraint, not a preference. This directly affects the
planned time-tracking/stats feature (see conversation history: replacing the
Pomodoro forced-break with passive time tracking + per-project stats).

Whatever that feature becomes, it must NOT rely on raw numbers/clock time as
the primary way information is shown to the user (no "1h 47m", no "3:15 PM",
no countdown). Time needs to be represented some other way that actually
registers for someone who is time-blind — this still needs to be figured
out (visual/relative/comparative representations, session counts, etc. are
candidate directions, not decided). Consult the
`adhd-executive-function-advisor` subagent on this specifically before
designing the stats view.

**Explicitly deferred — do not implement until asked.**
