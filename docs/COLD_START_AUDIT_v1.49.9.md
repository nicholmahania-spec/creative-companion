# Cold-start full agent + skill audit — Creative Companion v1.49.9

**Date:** 2026-07-27 · **Version:** 1.49.9 · **Commit:** `ccf3cdb`  
**Method:** First-time code review. Agents instructed **not** to read historical audit/redline docs. Sources: `src/`, `Claude.md`, `AGENTS.md`, skills, live tests/build only.  
**Baseline:** Node v26.5 · **177 tests pass** · **`npm run build` green**

**Standing product rule:** Define is form-only — do not reintroduce mood board.

---

## What was run

### Agents (7 roles)

| Agent | Score / one-line |
|-------|------------------|
| ADHD EF advisor | Path **7.3** · Focus productized **3.5** (orphaned) · blended **~6.5** |
| UX + ux-workflow-audit | Path **6.7** · with Focus **6.0** — ship file yes; client-credible pack no luck |
| UI + layout-integrity | Desk **~7.8** · Focus **~5.2** · agg **~6.5** |
| Graphic design | Path mean **6.4** · Focus **5.8** · product **6.3** |
| Editorial layout | Path **6.3** · Focus **5.5** · product **6.2** |
| Code reviewer | Path **7.5** · focus/export **5.5** · security **6** · overall **6.5** |
| Code writer | Plan only — 5 residual PRs |

### Skills (4/4)

| Skill | Result |
|-------|--------|
| `dev-env-guardrails` | Node 26.5 ✓ · tests 177 ✓ · build green ✓ |
| `layout-integrity` | Main desk mostly PASS · Focus + ui kit FAIL · desk-confirm bottom FAIL |
| `ux-workflow-audit` | Full login→deliver walk; sticky Next present; honesty gaps |
| `token-efficiency` | Audit-only; no drive-by rewrites |

---

## Scoreboard (consensus)

| Surface | ADHD | UX | UI | GD | Editorial | Code |
|---------|-----:|---:|---:|---:|----------:|-----:|
| Login | 6.5 | 6.5 | — | — | — | Low |
| Onboard | 8.0 | 7.0 | — | — | — | Low |
| 1 Define | 7.5 | 7.5 | 7.8 | **7.6** | **8.0** | Strong |
| 2 Research | 6.0 | 7.0 | — | 6.3 | 6.2 | Med |
| 3 Ideate | 7.0 | 7.5 | — | 5.4 | 5.5 | Low |
| 4 Sketch | **8.5** | 7.0 | — | 6.6 | 7.0 | Strong |
| 5 Design | **5.0** | **5.5** | — | 5.5 | 5.2 | Med (stubs) |
| 6 Review | 7.5 | 6.5 | — | 6.5 | 6.4 | Low |
| 7 Deliver | 8.0 | 7.5 | — | **7.4** | 7.1 | Med Focus |
| Focus (shipped UI) | **3.5** | **3.0** | **5.2** | 5.8 | 5.5 | 5.5 |
| **Path product** | **7.3** | **6.7** | **7.8** | **6.4** | **6.3** | **7.5** |
| **Blended** | **~6.5** | **~6.5** | **~6.5** | **~6.3** | **~6.2** | **~6.5** |

---

## Cross-agent consensus — top residuals

### P0 — trust / correctness

1. **Work clock dies after tab hide** — `visibilitychange` banks segment but never restarts while `workRunning` stays true (`App.jsx`). Session seconds may keep counting; workLog stops.
2. **Storage full is silent** — store dispatches `cc-storage-error`; **nothing listens**; UI can still pulse “Saved.”
3. **Design Figma “Use imported” stub** — `alert(...full version...)` + dead Tailwind island chrome.

### P1 — product honesty / load

4. **Focus step modes orphaned** — `*-focus` views mount in `App.jsx` but **no UI entry**; Settings “Focus mode” = chrome dim only. Dual product / wrong word.
5. **Design density** — seven peer tabs; no minimum-for-ship ramp.
6. **Home “Brand book ready”** when path N/7 full ≠ pack readiness.
7. **Deliver Focus** always shows success / “slate clean”; BrandPreview mock; format labels ≠ real files.
8. **Ideate dual primary** — spark “Use as title” competes with Send · Sketch.
9. **ui kit dead** — `btn-outline` missing; Card/Textarea Tailwind-only; no Tailwind in build.
10. **desk-confirm bottom sheet** vs center-modal rule.
11. **xAI proxy** open without secret; free client `model`; `VITE_XAI_API_KEY` still possible.

### P2 — polish

12. Path active = gray-on-gray; dual step-rail + sidebar.
13. Hue islands (`#3D5AFE`, `#0F766E`, `#2563EB`) vs monochrome Tech Studio.
14. Login Reset / onboard Skip labels; Ideate disabled button says Next.
15. pathGapFocusSelector `#design-version` missing; break-expired resume signal unused.
16. Work clock misattribute on project switch; store `===` vs `sameProjectId`.
17. Dead files: DefineMoodCanvas, DefineFocusView (gated), etc.

---

## What is already strong (do not re-open)

- Sticky `path-continue-row` / Next on path steps  
- Form-only Define + Start with these  
- Named next gap (not % as primary)  
- Sketch “Now” fold  
- Deliver primary Brand book PDF + thin-pack confirm  
- Work log ≠ invoice separation  
- Define progress = requiredReady  
- Ideate Send gated on choose  
- Timer/work clock conceptual split  
- Helper off by default  
- Build + unit tests green  

---

## Can a new user ship?

| Outcome | Answer |
|---------|--------|
| Download a brand book PDF | **Yes** — free Next, primary ship |
| Client-credible pack without trial-and-error | **No** — Design cliff + path ✓ ≠ pack ready |

---

## Code-writer PR stack (await confirm)

| PR | Goal | Size |
|----|------|------|
| **1** | Storage-full listener + honest toast / recovery | S |
| **2** | Design Figma: kill stub/alert; desk chrome only | M |
| **3** | Design gap focus target + expired-break signal | S |
| **4** | Delete dead DefineMoodCanvas / DefineFocus / unused FigmaConnect if unused | S |
| **5** | Hard-close orphan Focus routes (or productize later — not both) | M |

**Also high-ROI from code review (may fold into PR1 or a PR0):** work-clock tab-hide restart + project-switch bank.

**Leave alone:** Define form-only, path sticky Next, workLog separation, CSS five-layer rewrite, reintro mood board.

---

## Bottom line

Cold-start consensus: **the 7-step path is a real product** with solid EF bones (sticky Next, Sketch Now, Define form-only, Deliver PDF). Scores cluster around **6.5**. Ceiling is held down by **trust bugs** (storage, work clock hide), **Design load/stubs**, and **orphaned Focus modes** that confuse the word “Focus.”

No product code changed this pass. Implement only after explicit go.
