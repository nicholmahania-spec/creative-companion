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

### Resolved (2026-07-25 sweep — most of this backlog was stale)
Checked all 6 items below against current code before touching anything:
1. `ReviewFocusView.jsx` nested FocusShell — **already fixed**, no nesting exists (4 clean single-shell branches, `onExit` wired on all).
2. `console.log`/`alert()` in Preview components — **already clean**, none found.
3. `InsightsView.jsx` `'Start 2'` dead code — **already gone**.
4. `DefineView.jsx` DOM mutation (`e.target.value = ''`) — **already gone**.
5. `cloudSync.js` `withTimeout` timer leak — **already fixed** (`.finally(() => clearTimeout(timerId))` present).
6. Export buttons allow double-click — **fixed this session** (commit `0090289`): `exportBusy` guard in `runExport()`, panel buttons disabled while exporting.

Remaining a11y sub-items from #6 (modal focus-trap coverage, command palette ARIA
structure, skip-link DOM order) not re-verified — pick up if revisiting a11y.

### LOW — Graphic design agent known-remaining items
- `border-radius` inconsistency: many hardcoded `8/10/12/14/16px` values coexist with the `4px` token language. Broad normalization would touch ~15k-line `index.css` — risk/reward tradeoff.
- `EmptyIllustration.jsx` has mixed stroke weights (4/2.25/2/1.75/1.5) — intentional for a decorative illustration, not a bug.

---

## Mood-board / Research enhancement roadmap (2026-07-24)

Evaluated a broad mood-board feature wishlist against this app's actual shape — a
guided 7-step workflow (Define→Research→Ideate→Sketch→Design→Review→Deliver)
with a masonry mood board inside Research, not a freeform canvas tool. Filtered
to what extends the existing architecture vs. what would fight it.

### Phase 1 — DONE (commit `9c12599`)
1. **Link Parser for Research URL pins** — done. `submitBoardUrl()` now calls
   a deployed Supabase Edge Function (`link-preview`, project `shzkqbtoepqqdkjgupry`)
   that fetches the target URL server-side and parses `<title>` / OpenGraph
   tags. Shows a real preview (title + image + source host); falls back to
   treating the URL as a direct image if parsing fails or Supabase isn't
   configured.
2. **Color swatches extracted from mood images** — done. `src/lib/extractColors.js`
   does client-side dominant-color sampling (canvas `getImageData`) on each
   uploaded image pin. Suggested swatches show under the pin; clicking one
   calls `addPaletteColor(hex)`. Verified end-to-end (extract → click →
   palette updates). Note: extraction silently no-ops for pasted external
   image URLs without permissive CORS headers (by design — see commit
   message for the crossOrigin tradeoff); works reliably for local uploads.

### Phase 2 — later, not yet scoped
- Eyedropper: sample a color from any point on a pinned image (not just
  dominant colors) directly into the palette.
- Aspect-ratio cropper for uploads before pinning.

### Someday / maybe (explicitly deferred — conflicts with the app's guided-workflow design)
- Infinite canvas, layer ordering (bring to front/back) — the app is
  intentionally a structured masonry grid inside one step, not a freeform
  board; this would fight the existing architecture rather than extend it.
- Texture/pattern library, integrated stock-asset search — large scope,
  third-party licensing/API dependency, not core to the workflow.

---

## Running to-do list ("fridge list") — DONE (commit `66c0b0b`)

Per-project todo list, deliberately kept separate from the existing desk-tasks/
quick-add system. `src/components/RunningTodo.jsx` (popup + drawer),
`src/lib/runningTodoStages.js` (keyword stage tagging), store fields/actions in
`useAppStore.js` (`runningTodo`, `addRunningTodoItem`, `toggleRunningTodoItem`,
`removeRunningTodoItem`, `sortRunningTodo`, `resetRunningTodoIfNewDay`).

Behavior: centered "anything to add?" popup on every project open (any view) →
items keyword-tagged to one of the 7 stages, falling back to the current
stage → stays flat until "Sort" is pressed once → then groups by stage with a
"Start here" badge on the first incomplete item per group → "Add to list"
button opens the same popup and new items auto-file into their stage group
without re-sorting → daily reset clears completed items only, keeps
unfinished items and the sorted state.

### Open follow-ups (not yet built, recommended but unconfirmed)
1. **Research-page popup collision** — the add-todo popup currently doesn't
   special-case the Research view. Since Research already has its own inline
   URL/Note add-pin popovers, recommend suppressing the to-do popup while
   Research's own inline add form is open, so they don't compete for
   attention on the busiest page. Not built yet — needs confirmation.
2. **Mobile drawer vs. bottom sheet** — shipped as a full-width drawer on
   ≤640px (not a distinct bottom-sheet redesign). Revisit once tried on an
   actual phone.

---

## Real-project fit gaps — Sparrow's Promise Brand Clean-Up (2026-07-24)

App is built for creating a brand from scratch (Define→Research→Ideate→
Sketch→Design). This real project is audit-and-document an *existing* brand
(explicitly "no new logo design, no rebranding, no strategy") — Ideate/Sketch
don't apply; work goes Define (scope) → Design (document what exists) →
Deliver. All 4 approved phases DONE (commits `c46036b`..`d45ff42`):

### A. CMYK on every palette swatch — done (`c46036b`, `eaf3ed8`)
Turned out clear-space/min-size/logo-don'ts/imagery-guidelines already existed
end-to-end (initial gap analysis was wrong there) — only real gap was CMYK,
which existed for the 4 role rows but not the full palette swatch grid, the
markdown export, or the in-app BrandArtboard preview. Fixed all three, reusing
the existing `colorSpec()`/`hexToCmyk()` in `brandSystem.js`.

### B. In-app asset-audit tracker — done (`0f8642b`)
New "Asset audit" collapsible section in Define (above Tools). Log each
existing file, tag usable/outdated/missing, optional note + thumbnail.
`src/components/AssetAudit.jsx`, `assetAudit[]` per project.

### C. Real fillable brand-recognition templates — done (`fbffb2e`)
New "Stationery" tab in Design: letterhead (8.5x11in), business card
(3.5x2in, per contact), envelope (#10), email signature (HTML+PNG) — all
filled with real palette/type/logo/org contact info and exported at correct
physical page sizes via `src/lib/stationery.js`. Verified: downloaded and
opened a valid letterhead PDF.

### D. Lightweight hours/invoice tracker — done (`d45ff42`)
New "Hours & invoice" Tools-menu entry, drawer UI matching the running
to-do panel. Log dated hours against a rate, see running totals, export a
simple itemized invoice PDF (`src/lib/invoice.js`). Verified: totals math
correct, valid PDF downloaded.

All 119 tests pass; each phase verified end-to-end in a headless browser
before commit.

---

## Next session starting point

1. Start with **ReviewFocusView.jsx** nested FocusShell fix (HIGH #1) — it's the natural continuation of the UX agent's work
2. Remove **console.log / alert** calls from Preview components (HIGH #2) — quick wins
3. Address MEDIUM items in order (DefineView controlled select, cloudSync timer, App.jsx a11y)
4. After all fixes: run `npm run bump` to increment the version

