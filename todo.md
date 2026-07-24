# Creative Companion — Work Log & TODO

> Last updated: 2026-07-24 (session `6792b3d7`)
> Branch: `claude/debug-code-6u77sp` on `nicholmahania-spec/creative-companion`
> Build: **green** (`npm run build` ✓ ~500ms) at commit `217408b`

---

## Completed this session

### Multi-agent pass (UI / UX / Graphic Design professionals)

| Commit | What | Who |
|--------|------|-----|
| `e190642` | App-wide code review: Rules of Hooks, a11y, UX bugs | main session |
| `c33cd9a` | In-flight agent partial changes | automated |
| `19675d7` | Repaired 8 CSS syntax errors introduced by agent edits | main session |
| `44ac172` | Graphic design pass: hierarchy, tokens, consistency | graphic-design-professional agent |
| `217408b` | UX pass: fixed DeliverFocusView nested FocusShell + exit + console.log | ux-professional agent |

### Specific fixes in `e190642`
- **IdeateFocusView.jsx**: Moved `pick()` + `useEffect` before early return (React Rules of Hooks)
- **SketchFocusView.jsx**: Fixed `/* */` block comments leaking as JSX text
- **LoginPage.jsx**: `maxScore: 4→5` (strength bar overflow), live strength feedback on `onChange`, added `id="password-error"` for `aria-describedby`
- **App.jsx**: Replaced `alert()` with `flashToast?.()` in `startVoice()`
- **CalendarView.jsx**: Added `aria-label` to `←`/`→` month nav buttons
- **DesignView.jsx**: Added `aria-label` to palette role swatch buttons; added `reader.onerror` handler
- **SettingsView.jsx**: Added `id`/`aria-label` to new-password input; `disabled` on Sync button while syncing
- **ResearchView.jsx**: Added URL validation in `submitBoardUrl()`

### Specific fixes in `44ac172` (graphic-design-professional)
- `src/index.css`: Explicit `h1` font-size in modular scale (`clamp(2rem, 4vw, 2.75rem)`)
- `src/index.css`: Removed stale "Gamified Minimalist" `:root` block that re-introduced squircle radii and drop shadows (overriding the flat lock)
- `src/index.css`: Normalized `.btn-primary` vertical padding so all buttons resolve to 40px height
- `src/index.css`: `.text-link` and login lede moved from `--text-muted` → `--text-secondary` (WCAG AA); `.text-link:hover` uses `--dopamine`
- `src/components/PathStepIcon.jsx`: All 7 nav icons stroke normalized to `1.75px`
- `src/views/ResearchView.jsx`: Mood-pin gradient fallback retuned to `#1E3A8A→#2563EB`; image placeholder background → `var(--bg-muted)`

### Specific fixes in `217408b` (ux-professional)
- `src/views/DeliverFocusView.jsx`: Removed nested `FocusShell`, extracted `exitFocus`, removed `console.log`, flattened shipped-state markup, switched to `focus-chip-row` class

---

## Remaining TODO

### HIGH — UX bugs still open

#### 1. `ReviewFocusView.jsx` — nested FocusShell (UX agent was mid-fix when rate-limited)
Lines 82–141 and 238–281 each wrap an inner `FocusShell` inside an outer `FocusShell`, causing double-rendered shell chrome (two progress bars, two headers). Pattern to fix, matching how `217408b` fixed `DeliverFocusView`:
- Flatten: keep only the inner `FocusShell`, hoist `stepLabel`/`stepIndex`/`stepCount`/`onExit` up to it
- Outer shell at line 82 is missing `onExit` (no `exitFocus` wired)
- Add `const exitFocus = () => setActiveView?.('studio')` (checking what the correct target should be)

#### 2. `console.log` / `alert()` in Preview components
These log/alert in production:
- `src/components/DefinePreview.jsx:29` — `console.log('Retry requested...')`
- `src/components/ResearchPreview.jsx:45` — `console.log('Retry requested...')`
- `src/components/ReviewPreview.jsx:32` — `console.log('Retry requested...')`
- `src/components/ReviewPreview.jsx:218` — `console.log('Jump to ...')`
- `src/components/ReviewPreview.jsx:232` — `alert('AI feedback requires backend setup...')`
- `src/components/SketchPreview.jsx:30` — `console.log('Retry requested...')`

Fix: remove `console.log` calls (or demote to `/* noop */`). For `ReviewPreview.jsx:232`, replace `alert()` with `flashToast?.()` if available in context, otherwise just remove.

### MEDIUM — Deferred from earlier code review (not yet addressed)

#### 3. `src/views/InsightsView.jsx` — unreachable dead code
`'Start 2'` branch is unreachable. Find and remove.

#### 4. `src/views/DefineView.jsx` line ~226 — direct DOM mutation
`e.target.value = ''` resets a select by mutating the DOM directly instead of using controlled state. Replace with a React state variable for the select value.

#### 5. `src/lib/cloudSync.js` — `withTimeout` timer leak
The timeout `setTimeout` is not cleared when the promise resolves successfully, leaving a dangling timer. Add `clearTimeout(timerId)` in the resolution path.

#### 6. `src/App.jsx` — multiple accessibility gaps
- Several modal overlays lack `focus-trap` + `aria-modal="true"` (keyboard users can tab behind the modal)
- Command palette has invalid ARIA structure
- Skip-to-content link is not the first focusable element in the DOM
- `flashToast` timer not cleared before setting a new one (timer accumulation)
- Export buttons allow double-click (no `disabled` guard during export)

### LOW — Graphic design agent known-remaining items
- `border-radius` inconsistency: many hardcoded `8/10/12/14/16px` values coexist with the `4px` token language. Broad normalization would touch ~15k-line `index.css` — risk/reward tradeoff.
- `EmptyIllustration.jsx` has mixed stroke weights (4/2.25/2/1.75/1.5) — intentional for a decorative illustration, not a bug.

---

## Next session starting point

1. Start with **ReviewFocusView.jsx** nested FocusShell fix (HIGH #1) — it's the natural continuation of the UX agent's work
2. Remove **console.log / alert** calls from Preview components (HIGH #2) — quick wins
3. Address MEDIUM items in order (DefineView controlled select, cloudSync timer, App.jsx a11y)
4. After all fixes: run `npm run bump` to increment the version

