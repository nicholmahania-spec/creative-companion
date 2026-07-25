# Creative Companion

React 19 + Vite 8 + Zustand 5 single-page app.

## Commands

```sh
npm run build   # production build (do NOT call `vite build` directly — vite is not on $PATH)
npm run dev     # dev server
npm test        # vitest unit tests
npm run bump    # increment version in src/lib/version.js
```

## Git workflow rule — version bump

**Always run `npm run bump` before/with every push to `main`.** No push to
main without a version bump in the same batch of commits.

## Branch

Active development branch: `claude/debug-code-6u77sp`

## Key files

- `todo.md` — prioritized remaining work list
- `insights.md` — architecture, design tokens, CSS gotchas, critical constraints
- `src/index.css` — full CSS design system (~15k lines); LightningCSS strict — never leave orphaned declarations outside a rule block
- `src/App.jsx` — central orchestration / prop-drilling hub
- `src/store/useAppStore.js` — Zustand store

## UI rule — modals/popups always center, never bottom/top sheets

On mobile, popup/dialog cards (Discovery brief, Before/After, Shortcuts,
Command palette, confirmations, etc.) must render centered on screen, same
as desktop. Never slide up from the bottom or drop down from the top —
the user has said this explicitly: "I do not like popups that come from the
bottom or top. I need things front and center." All shared overlay chrome
lives in `.export-overlay`/`.export-panel` in `src/index.css` — keep
`align-items: center` at every breakpoint. (Persistent side panels that are
genuinely drawers for browsing a list, like the running to-do panel, are a
different pattern and not covered by this rule — this is about dialogs/popups
specifically.)

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

**Decision fatigue carries that same top-priority weight, not a lesser
sub-point of cognitive load.** Every extra choice a screen forces — an extra
button, an unsorted list the user has to read fully to find one item, a
setting to configure, a disambiguation step — is a real cost even when each
one looks small individually. Default aggressively; group/order lists so
the common case never requires reading the whole thing; never fix one kind
of friction by introducing a new decision elsewhere.

**Every ADHD audit/finding must state four things, not two: the problem, why
it's a problem for ADHD (which mechanism it hits — task initiation, working
memory, decision fatigue, time blindness, rejection sensitivity/shame,
object permanence, interruption recovery), the solution, and why that
solution actually helps ADHD.** A problem or fix stated without its "why" is
incomplete — restate it with the reasoning included, don't just list bare
findings.

## User feedback on ADHD issues — direct quotes, carried forward as standing lessons

Real things the user has said about their own experience of the app, kept
verbatim so the intent doesn't get diluted on retelling. Weigh these as
concretely as the advisor subagent's own principles when making design calls.

- **Hidden/collapsed content is invisible, not "one click away."** On the
  Project overview page's collapsed `Tools`/`Asset audit` sections: "they are
  hidden and my first thought was 'I have no idea what this is.' It's a
  cognitive load issue and invisible." A closed `<details>` with a bare label
  is a memory test, not a control — if the user can't see what's inside, they
  don't open it.
- **"Bottom of the page" is functionally just as hidden as a collapsed
  panel.** On moving Archive/Delete to a footer strip: "if its at the
  bottom - I won't see it or use it." Scroll position is not a safe place to
  put something that needs to be seen — below-the-fold and behind-a-toggle
  are the same failure for this user. Prefer chrome that's visible in the
  same spot on every screen (e.g. near the project header) over "put it at
  the bottom" as a default fix for declutter.
- **Progress/comparison should read as evidence, not require re-opening a
  tool.** On Asset audit: "I feel like it would be helpful to see that during
  each step of the process. I want like a before-and-after thing going as I
  build the brand." The user wants ambient, glanceable proof of progress
  (a before/after signal), not the editing tool itself surfaced everywhere.
  Distinguish "I want to see this is happening" (→ a small always-visible
  read-only indicator) from "I want to use this tool" (→ stays in one place,
  opened on demand) — don't conflate the two into one big always-open panel.

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
