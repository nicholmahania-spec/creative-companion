# End-to-end audit — Login → Deliver

**Date:** 2026-07-27  
**App version:** 1.48.245  
**Method:** Code review + specialist subagents (entry, steps 1–3, steps 4–7, ADHD/code cross-cut). **Not live browser.**  
> **Follow-up (2026-07-28):** PR1–PR4 + residual fixes shipped through v1.49.x (Focus safety, path continues, Define progress honesty, mood board, proxy hardening, Ideate diverge). Treat historical scores as pre-fix baseline.
**Playwright:** Could not run — production build fails resolving `pdf-lib` from `src/lib/overviewOcr.js` (blocks `path-smoke` / `process-walk`).

**Skills / agents used:**
- `ux-workflow-audit` skill method (first-time user, page order, punch-list)
- Entry agent (login → onboard → home)
- Define → Ideate agent
- Sketch → Deliver agent
- ADHD executive-function + code-reviewer agent

---

## Overall scores

| Segment | Score | One-line |
|---------|------:|----------|
| Entry (login → first productive screen) | **4.5/10** | Linear gate, but onboard **lies about Define done** and drops focus |
| 1 · Project overview | **6.5/10** | Start-with-these strong; **no Next · Research** |
| 2 · Research | **6.0/10** | Board solid; **no Next · Ideate** |
| 3 · Ideate | **5.5/10** | Send · Sketch works; Focus Mode **broken** |
| 4 · Sketch | **6.5/10** | Desk clear; **no Next · Design** |
| 5 · Design | **5.0/10** | Deep craft; no forward CTA; fake Share |
| 6 · Review | **5.5/10** | Notes/gaps OK; **no Next · Deliver**; “Ready” chip lies |
| 7 · Deliver | **3.5/10** | **Primary ship CTA missing** — journey cliff |
| **Path as a whole** | **~5/10** | Craft exists; **thread of the journey is thin** |

**Can a brand-new user ship a brand pack without luck?**  
**No.** Export is possible only if they discover More formats → Preview → PDF (or Focus Deliver). Main Deliver does not present an obvious primary download.

---

## Happy path (as coded)

```
Login → [cloud hydrate?] → Onboarding → (Home optional)
  → project (Project overview / Define)
  → studio (Research)
  → spark (Ideate)  ← only step with solid in-page continue (Send · Sketch)
  → flow (Sketch)
  → brand (Design)
  → review (Review)
  → finish (Deliver / ship)
Tools off-path: Timer, Calendar, Clients, Settings
Focus Modes: *-focus full-bleed (unsafe shell)
```

**Continue mechanisms:** desktop step-rail, sidebar 1–7 / G, Home Continue, Ideate Send only.  
**Hard gates:** none (soft progress via `pathStepHasContent`).

---

## P0 / P1 punch-list (prioritized)

### Build / CI

| ID | Sev | Where | What | Fix |
|----|-----|-------|------|-----|
| B1 | **P0** | `overviewOcr.js` → `pdf-lib` | Build fails; e2e cannot start | Install/declare `pdf-lib` or remove import |
| B2 | **P1** | `e2e/process-walk.spec.js` | Expects old CTAs (`Next · Research`, heading Define) | Update specs or restore CTAs |

### Entry

| ID | Sev | Where | What new user feels | Fix (minimal) |
|----|-----|-------|---------------------|---------------|
| E1 | **P1** | `finishOnboarding` + `pathStepHasContent('define')` | After naming, Define counts **done** → Continue skips to Research | Don’t count name/placeholder brief as define complete; require detective core |
| E2 | **P1** | Onboard name vs `detective.clientName` | Re-enter same client name on brief | Seed `clientName` on finish |
| E3 | **P1** | Focus after onboard | Cursor nowhere (`#project-name` dead) | Focus first Start-here field |
| E4 | **P2** | Cloud login | No product sentence | One lede under logo |
| E5 | **P2** | Login “Reset” | Feels like wipe account | Rename → Clear form |

### Path continue (systemic)

| ID | Sev | Where | What | Fix |
|----|-----|-------|------|-----|
| C1 | **P1** | Define, Research, Sketch, Design, Review | **No sticky Next** (comments/e2e claim otherwise) | Add `path-continue-row` on each: Next · {stage} |
| C2 | **P1** | Step rail when *you are* the gap | Continue CTA **hidden** | Also show “Go to next stage” when current is filled enough |
| C3 | **P1** | Timer / Calendar back | Always return to **Sketch** (`flow`) | Restore `lastView` / pre-tool view |

### Ideate / Focus

| ID | Sev | Where | What | Fix |
|----|-----|-------|------|-----|
| F1 | **P0** | `IdeateFocusView.jsx` | Hooks before/after early return → crash risk | All hooks first |
| F2 | **P0** | same | Nested FocusShell; bracket never starts | Single shell; seed bracket when titles full |
| F3 | **P0** | `FocusShell.jsx` | `FOCUSABLE` / `closeDrawer` / `restoreFocusRef` undefined | Repair shell or hide all Focus betas |
| F4 | **P0** | Focus early-return in App | Forced break overlay skipped | Show overlay in focus or block focus during break |
| F5 | **P1** | Review Focus | “Addressed” **deletes** notes | Soft archive + undo |
| F6 | **P1** | Double decision log | Store + view both append | One site only |

### Deliver / ship

| ID | Sev | Where | What | Fix |
|----|-----|-------|------|-----|
| D1 | **P1** | `DeliverView.jsx` | Comment promises primary Download; UI has Handoff + More formats only | Primary **Download brand book PDF** → `runExport('pdf')` |
| D2 | **P1** | `JourneyGapStrip` | “Download brand book PDF” only navigates to finish | Download or rename; show on finish |
| D3 | **P2** | Export naming | brand-direction vs Brand Book vs kit | One glossary of format names |
| D4 | **P2** | Thin-pack guard | Inconsistent across PDF vs kit | Same confirm for all ship paths |

### Progress honesty

| ID | Sev | Where | What | Fix |
|----|-----|-------|------|-----|
| P1 | **P1** | Dual Define “done” | Start-here vs path bar disagree | Align with required detective fields |
| P2 | **P2** | Ideate done rule | Title+why vs Choose-only Send vs spark pin | One rule + fill hint |
| P3 | **P2** | Sketch why | Open tasks need why for path complete | Inline “add a short why” |
| P4 | **P2** | Review status chip | Always says “Ready · n/m” | “Gaps · n left” when incomplete |

### ADHD / product rules

| ID | Sev | Where | What | Fix |
|----|-----|-------|------|-----|
| A1 | **P1** | Define form-only | Violates AGENTS.md side-by-side mood board | Restore board strip or amend AGENTS |
| A2 | **P2** | StepDependencyReminder | Missing deps → renders **null** | One dismissible “still needs…” jump |
| A3 | **P2** | Ideate UI vs coaching | Converge-first A/B/C; no rough dump | Rough list or spark→title (see mockup) |

---

## Step-by-step snapshot

### Login → Onboard → Home
- Local setup has a product line; cloud sign-in largely does not.
- Onboard forces a project name then lands on Project overview — good skeleton.
- **Critical:** onboard seeds progress that **skips real Define work** and doesn’t write detective client name.
- Multi-project Home: selection ≠ active header until Continue.

### 1 Project overview
- **Strength:** Start with these, autosave note, chapter resume, relative deadline.
- **Weak:** Share hierarchy, milestones as side-quest, no Next · Research, form-only vs AGENTS board rule.

### 2 Research
- **Strength:** Empty state, pin/star/pack, timer stays on page.
- **Weak:** No Next · Ideate; goal/audience strip weak; dependency strip silent when empty.

### 3 Ideate
- **Strength:** Choose → Send · Sketch is the best path continue in the app.
- **Weak:** Focus Mode landmine; why/progress mismatch; spark not wired to titles.

### 4 Sketch
- **Strength:** Now/Queue/Done, Ideate decision line + Edit back.
- **Weak:** No Next · Design; energy H/M/L opaque; Focus task ids.

### 5 Design
- **Strength:** Craft depth, pack empty → Research.
- **Weak:** No Next · Review; tab overload; Share/invite mock; Focus is a toy subset.

### 6 Review
- **Strength:** Gaps deep-link; notes area.
- **Weak:** No Next · Deliver; Ready chip lies; Focus deletes notes.

### 7 Deliver
- **Strength:** Gaps list, multi-format capability in code.
- **Weak:** **Primary download missing**; ship is a discovery problem; export naming soup.

---

## Recommended fix order (top 15)

1. Fix **build** (`pdf-lib`) so e2e can run.  
2. Repair or **hide all Focus Modes** (FocusShell + IdeateFocus).  
3. **Primary Download** on Deliver + thin confirm.  
4. **Sticky Next** on Define → Research → Ideate → Sketch → Design → Review → Deliver.  
5. Onboard: seed **clientName**; stop false Define complete; focus Start-here.  
6. Align **path progress** with real required work.  
7. Timer/Calendar **return to last path view**.  
8. Soften Review Focus note deletion.  
9. Dependency strip for **missing** fields.  
10. Export label glossary + consistent thin-pack guard.  
11. Restore or formally drop Define mood board (AGENTS).  
12. Ideate: hide why until choose + spark→title (mockup).  
13. Review status copy honesty.  
14. Sketch task `id` + why cue.  
15. Refresh **process-walk** e2e to real UI.

---

## What is already good (do not regress)

- Single journey spine of 7 steps in `journey.js`
- DefineStartHere anti-stall pattern
- Research timer that stays on Research
- Ideate Send · Sketch + decision log → Sketch handoff
- Autosave + “Saves as you type”
- Cloud hydrate escape after 3s
- Soft (not hard) step gating for ADHD
- Pack readiness gaps that deep-link

---

## Related artifacts

- Mockup addressing Overview + Ideate: `mockups/overview-ideate-audit-fix.html`
- Prior overview/ideate agent notes: session audits 2026-07-27

*Audit only — no product code changes in this pass.*
