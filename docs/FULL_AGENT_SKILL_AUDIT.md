# Full agent + skill audit — Creative Companion

**Date:** 2026-07-27 · **Version:** 1.48.245  
**Workspace:** `/Users/macadmin/creative-companion`  
**Method:** Code review + specialist subagents. Not a live browser click-through.  
> **Follow-up (2026-07-28):** PR1–PR4 + residual fixes shipped through v1.49.x (Focus safety, path continues, Define progress honesty, mood board, proxy hardening, Ideate diverge). Treat historical scores as pre-fix baseline.
**Parallel of:** `/Users/macadmin/build/creative-companion-react/.claude` (same agent/skill set).

---

## What was run

### Agents (7/7)

| Agent | Result score | One-line |
|-------|-------------:|----------|
| `adhd-executive-function-advisor` | **EF 6.2/10** | Home/Sketch strong; Design/Focus/triple-progress hurt |
| `ux-professional` | **UX 5.0/10** | Main path ~6.5–7 alone; Focus pulls it down |
| `ui-professional` | **UI 4.5/10** | Dead Tailwind Focus kit = second broken design system |
| `editorial-layout-director` | **Editorial 5.5/10** | Stage structure OK; monochrome fog + Focus chrome fail squint |
| `graphic-design-professional` | **GD 4.5/10** | Token/doc drift; Design indigo islands; no “now” hue |
| `code-reviewer` | **Code 3.5/10** (focus/export surfaces) | FocusShell/Ideate/Design Focus/Deliver multi-ship unsafe |
| `code-writer` | **Plan only** | 4 PRs — see below (no product edits this pass) |

### Skills (4/4)

| Skill | How applied | Result |
|-------|-------------|--------|
| `dev-env-guardrails` | Node check + build | **Node v26.5.0** ✓ · **`npm run build` FAIL** — `pdf-lib` not in `node_modules` (listed in package.json, `npm ls` empty) |
| `layout-integrity` | Full checklist on main vs Focus | **Main shell PASS** · **Focus FAIL** (fluidity, 360, shell anchoring) |
| `token-efficiency` | Session discipline + duplicate hunt | Flag: `ResearchPreview.jsx.bak`; no product rewrites this pass |
| `ux-workflow-audit` | Login→deliver first-user punch-list | Cross-checked with prior `E2E_AUDIT_LOGIN_TO_DELIVER.md` |

Related: `docs/E2E_AUDIT_LOGIN_TO_DELIVER.md`, `mockups/overview-ideate-audit-fix.html`.

---

## Scoreboard (consensus)

| Surface | ADHD | UX | UI | GD | Editorial | Code risk |
|---------|-----:|---:|---:|---:|----------:|-----------|
| Login | 7 | — | — | 7 | 8 | Low |
| Onboard / Home | 7–9 | Strong | — | — | — | Progress lie |
| Define | 6.5 | — | — | 6 | 4 | Medium |
| Research | 6.5 | — | — | 7 | 7.5 | Medium |
| Ideate | 6 | — | — | 5.5 | 6.5 | Focus **P0** |
| Sketch | 7.5 | — | — | 6.5 | **8** | Focus task ids |
| Design | **4** | — | — | **3.5** | 5 | Focus **P0** |
| Review | 7 | — | — | 6 | 7 | Focus note wipe |
| Deliver | 7 | — | — | 6.5 | 7.5 | Multi-ship **P0** |
| Focus (agg.) | **3.5** | — | — | **3** | **4** | **P0 cluster** |
| **Product** | **6.2** | **5** | **4.5** | **4.5** | **5.5** | **3.5 focus** |

---

## Cross-agent consensus (must fix)

### P0 — ship-blockers

1. **`npm run build` fails** — `pdf-lib` declared but not installed in `node_modules` (and/or bad static import in `formPdfUtils.js` per code-writer).  
2. **`FocusShell`** — `FOCUSABLE`, `closeDrawer`, `restoreFocusRef` undefined → crash when drawer path runs.  
3. **`IdeateFocusView`** — Rules of Hooks (return before `useEffect`); nested shell; bracket never starts.  
4. **`DesignFocusView`** — `brandFields` missing on store → TypeError after intent.  
5. **`DeliverFocusView` multi-ship** — `runExport` + `exportBusy` only ships first format.  
6. **`SketchFocusView` `addTask`** without `id`.

### P1 — path thread / honesty

7. **Sticky Next missing** on Define, Research, Sketch, Design, Review (only Ideate Send is solid).  
8. **Deliver main** — primary Brand book PDF missing / buried.  
9. **Onboard** — Define false-complete from name; `clientName` not seeded.  
10. **Triple “done” systems** — path vs detective required vs pack readiness.  
11. **Forced break skipped** in Focus early-returns.  
12. **Timer/Calendar back** hard-codes Sketch (`flow`).  
13. **Define** form-only vs AGENTS mood-board rule.  
14. **Dead Tailwind** across Focus + `Card`/`Textarea` UI kit.  
15. **xAI proxy** — unauthenticated cost abuse (security).

### Skills-specific

| Skill finding | Severity |
|---------------|----------|
| Layout integrity: Focus fails 360 / fluidity / nav anchoring | P1 |
| Layout integrity: main shell largely passes | OK |
| Dev-env: Node 26 OK; build not green | P0 |
| Token-efficiency: delete `ResearchPreview.jsx.bak` | P2 |
| UX workflow: new user cannot ship without discovery | P1 |

---

## Agent deep-dive summaries

### ADHD (6.2/10)
**Best:** Home Continue, DefineStartHere, Sketch “Now”, clock≠timer, thin-pack language.  
**Worst:** Design 7-tab landfill, Focus intent tax, triple progress, Ideate dual rails, onboard seed then leave.  
**Do not add:** more Focus variants, hard step locks, XP/% as primary, extra Design tools on default path.

### UX + UI + layout-integrity
Main desk ~6.5–7 alone. Focus drops combined to **~5 / ~4.5**.  
Layout skill: main PASS, Focus FAIL. SketchFocus is the reference; DefineFocus is the anti-pattern.

### Graphic design + editorial layout
Monochrome Tech Studio removes squintable “you are here.” Three grammars fight (live gray vs docs teal vs root purple). Design indigo utility blocks = brand breach. Restore one accent for path-active only; purge dead Tailwind; restore Define board or rewrite AGENTS.

### Code reviewer (focus surfaces 3.5/10)
Additional: export analytics missing braces; Research Focus Backspace deletes pins; Review Focus fixed 300px panel; progress hints lie vs checker.

### Code writer — PR stack (implement next)

| PR | Goal | Size |
|----|------|------|
| **1** | Build green + FocusShell + IdeateFocus + break overlay in focus | S–M |
| **2** | Sticky Next ×5 + Deliver primary PDF | M |
| **3** | Onboard clientName + honest Define progress | S |
| **4** | Timer/Calendar return view, Review chip, dep strip, soft note delete | S |

---

## Unified top-15 fix order

1. Install/resolve **`pdf-lib`** + fix any bad import → `npm run build` green  
2. Repair **FocusShell** (or hide all Focus betas)  
3. Fix **IdeateFocus** hooks + bracket + single shell  
4. Fix **DesignFocus** `brandFields`  
5. Fix **Deliver multi-ship** + **primary PDF** on main Deliver  
6. **Sticky Next** on all path steps  
7. Onboard **seed clientName** + honest Define done  
8. **SketchFocus** full task shape  
9. Unify **progress** rules + fill hints  
10. Forced break visible in Focus  
11. Timer/Calendar **return to last path view**  
12. Strip dead Tailwind / fix UI primitives with real CSS  
13. One **path-active accent** (squint test)  
14. Delete `.bak` mirrors; fix xAI proxy auth  
15. Refresh e2e after CTAs exist  

---

## What is healthy (do not regress)

- Flat Tech Studio (no glass/glow)  
- Surface roles: wall / desk / document  
- Sketch one-fold + Review/Deliver sticky preview  
- Ideate focus-within dimming  
- Home one-CTA, journey soft-gated  
- DefineStartHere, autosave note, research timer stays on Research  
- Plus Jakarta loaded; muted contrast repair  

---

## Explicit gaps this run

- **No copy-editor agent** exists in `.claude/agents` (neither tree). Copy only flagged when UX/ADHD hit it.  
- **No live Playwright** — build must green first.  
- **Code-writer did not edit** product code (plan only, per audit-first).

---

*Generated by running all project agents + skills in parallel, 2026-07-27.*
