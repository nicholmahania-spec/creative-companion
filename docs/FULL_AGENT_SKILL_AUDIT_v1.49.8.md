# Full agent + skill audit — Creative Companion v1.49.8

**Date:** 2026-07-27 · **Version:** 1.49.8 · **Commit:** `34dbf5c`  
**Workspace:** `/Users/macadmin/creative-companion`  
**Method:** Code review + 6 specialist subagents. Not a live browser click-through.  
**Baseline:** Node v26.5.0 · **176 tests pass** · **`npm run build` green**

**Standing constraints honored:** Define form-only (no mood board restore); step strip context-only (no missing-field nags); audit only — no product edits this pass.

---

## What was run

### Agents (7 roles / 6 subagent runs)

| Agent | Score | One-line |
|-------|------:|----------|
| `adhd-executive-function-advisor` | **Path 7.1 · Focus 6.4 · product ~6.9** | Sticky Next + Define honesty landed; honesty cracks + Design density remain |
| `ux-professional` + `ux-workflow-audit` | **Path 7.6 · with Focus 6.9** | New user **can** ship brand book PDF without luck |
| `ui-professional` + `layout-integrity` | **Main 7.5 · Focus 4.0 · agg 6.0** | Desk tokens solid; phantom Tailwind + dead Button outline kill Focus |
| `graphic-design-professional` | **Path mean 6.4 · Focus 7.4 · composite 6.5** | Dual path maps + gray fog; Design indigo island |
| `editorial-layout-director` | **Path 6.1 · Focus 7.8 · composite 6.3** | Define/Sketch intentional; Ideate noise + late-path 55/45 clone |
| `code-reviewer` | **Focus/export 6.5 · overall ~7** | Prior P0 crashes fixed; fake Share + sticky work-log + open proxy |
| `code-writer` | **Plan only** | 5 residual PRs — see below |

### Skills (4/4)

| Skill | How applied | Result |
|-------|-------------|--------|
| `dev-env-guardrails` | Node check + `npm test` + `npm run build` | **Node v26.5** ✓ · **176/176** ✓ · **build green** ✓ |
| `layout-integrity` | Main vs Focus checklist | **Main PASS** · **Focus FAIL** (300px Review, dead TW, Button) |
| `token-efficiency` | Audit-only; no drive-by rewrites | Residual: dual design system / dead ui kit deferred |
| `ux-workflow-audit` | Login → Deliver first-user sequence | Path thread fixed; residual honesty + Design Share |

---

## Scoreboard (consensus)

| Surface | ADHD | UX | UI | GD | Editorial | Code |
|---------|-----:|---:|---:|---:|----------:|-----:|
| Login / entry | 7.5 | 6.5–7.4 | — | — | — | Low |
| Onboard | 7.5 | **8.0** | — | — | — | Low |
| 1 Define | **8.0** | **8.0** | 7.5 | 7.2 | 7.5 | Low |
| 2 Research | 7.0 | 7.5 | — | 6.6 | 6.4 | Med (timer source) |
| 3 Ideate | 6.5 | 6.8 | — | 5.7 | 5.2 | Med (progress lie) |
| 4 Sketch | 7.0 | 7.5 | — | 6.8 | 6.9 | Med (why rules) |
| 5 Design | **5.5** | **5.5** | — | **4.9** | 5.4 | **P0 fake Share** |
| 6 Review | 7.5 | 7.8 | — | 6.5 | 6.3 | Low path / Focus panel |
| 7 Deliver | 7.5 | **8.2** | — | 6.3 | 6.0 | Low |
| Focus (agg.) | 6.4 | 6.9 | **4.0** | 7.4 | 7.8 | 6.5 |
| **Product** | **~6.9** | **~7.5 path** | **~6.0** | **~6.5** | **~6.3** | **~7** |

### Delta vs prior full audit (v1.48.245 → v1.49.8)

| Metric | Before | After | Δ |
|--------|-------:|------:|--:|
| ADHD product | 6.2 | **~6.9** | **+0.7** |
| UX path | ~5 | **~7.6** | **+2.6** |
| UI product | 4.5 | **~6.0** | **+1.5** |
| Code focus/export | 3.5 | **6.5** | **+3.0** |
| Build | FAIL | **green** | fixed |
| Ship without luck? | **No** | **Yes** | fixed |

---

## Verified shipped (do not re-open)

| Fix | Status |
|-----|--------|
| FocusShell `FOCUSABLE` / drawer trap | Fixed |
| IdeateFocus hooks + single shell | Fixed |
| DesignFocus brand fields | Fixed |
| Deliver multi-ship `exportBusyRef` + Promise | Fixed |
| SketchFocus task ids | Fixed |
| pdf-lib / build | Fixed |
| Forced break overlay in Focus | Fixed |
| Sticky `path-continue-row` on path steps | Present |
| Deliver primary Brand book PDF | Present |
| Onboard `clientName` + Define `requiredReady` | Present |
| Form-only Define / context-only dep strip | Present |
| roughIdeas persist, relative work log UI, Pomodoro→Helper | Present |
| Timer/Calendar `pathReturnView` | Present |

---

## Cross-agent consensus — residuals

### P0 — trust / correctness

1. **Design fake Share** (`DesignView.jsx`) — `setTimeout` toast “shared successfully”; fake `designcompanion.com` URL; invite is theater.  
2. **Work-log stage pollution** — Research mounts `setTimerFocusSource('research')` forever; bank uses source over `activeView`; labels may show raw `"research"`.  
3. **xAI proxy open without secret** (ops/security) — when `XAI_PROXY_SECRET` unset, origin-empty POSTs allowed; in-memory rate limit only.

### P1 — path honesty / load

4. **Ideate progress vs Send** — path requires title+note; Send needs choose+title; UI says why optional; fill hints stale.  
5. **Sketch why** — progress requires why on all open tasks; Done does not; vacuous complete if all completed empty-why.  
6. **Focus beta CTAs** still on Ideate/Sketch/Design/Review/Deliver while Focus is fragile / Define gated.  
7. **Design density** — many tabs + utility chrome; indigo Figma island (brand breach).  
8. **JourneyGapStrip “Download brand book PDF”** navigates to Deliver only.  
9. **Review Focus 300px fixed panel** + empty Preview drawer; no Tailwind runtime for Focus kit.

### P2 — polish / debt

10. Dual path maps (step-rail + sidebar) dilute “you are here.”  
11. Dead `btn-outline` / ui kit / phantom Tailwind.  
12. Settings back always Define; progress triple systems (path / pack / detective ± GameHUD).  
13. Focus work clock silent (outside `STAGE_VIEWS`).  
14. Deliver Focus nested shell; ship-success on partial fail edge case.

---

## Skills-specific

| Finding | Severity |
|---------|----------|
| Dev-env: Node 26, tests, build all green | OK |
| Layout-integrity: main PASS, Focus FAIL | P0/P1 Focus |
| Token-efficiency: no product rewrites this pass | OK |
| UX workflow: first user can ship PDF via Next · … → Brand book PDF | **Pass** (was fail) |

---

## Code-writer residual PR stack (implement on confirm)

| PR | Goal | Size | Risk |
|----|------|------|------|
| **A / PR1** | Work-log stage truth (`activeView` bank; clear Research source; label map) | S | Med |
| **B / PR2** | Hide path Focus beta CTAs (keep routes) | S | Low |
| **C / PR3** | Ideate/Sketch progress honesty (align checker to UI, no nags) | S–M | Med |
| **D / PR4** | Remove Design fake Share dialog | S | Low |
| **E / PR5** | Review Focus: FocusShell drawer, kill 300px panel | S | Low–Med |

**Defer:** Button/outline dual-system rewrite; xAI proxy prod secret (ops); full Focus redesign; Define mood board; missing-field nags.

---

## What NOT to add

- Define mood/refs board  
- Missing-field step nags  
- New accent palette / teal-purple revival  
- More Focus entry points or Define Focus ungate  
- Extra progress rings / XP as primary wayfinding  
- Multiplayer collab stub pretending to work  

---

## Bottom line

**v1.49.8 fixed the path cliff.** Sticky Next, honest Define, primary Deliver PDF, Focus crash cluster, and build green moved path UX from ~5 → ~7.5–7.6 and ADHD from ~6.2 → ~6.9.

Remaining damage is **honesty and trust**, not missing features: fake Design Share, sticky work-log Research tag, Ideate/Sketch progress mismatch, and Focus still advertised while UI-kit dead classes leave Focus at ~4 UI.

**Next ship:** PR1→PR5 above after explicit go. No code until confirmed.
