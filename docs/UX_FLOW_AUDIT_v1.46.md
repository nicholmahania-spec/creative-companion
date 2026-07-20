# UX flow audit — Creative Companion v1.46

**Scope:** End-to-end user journeys from gate → 7-step path → leave-behind PDF, plus off-path tools, recovery, and failure modes.  
**Baseline:** Supersedes journey table in `REDLINE_v1.22.0_UX_MAPPING_PATH.md` (most v1.22 P0s are fixed).  
**Product honesty:** Brand direction leave-behind desk — not Figma.

---

## Executive summary

| Journey | Health | Notes |
|---------|--------|-------|
| **Happy path** (login → PDF) | **B+** | Continuous 7-step + gap chrome; e2e process-walk green |
| **First-run / onboard** | **B** | Lands Define; first step sits on Sketch queue |
| **Return / resume** | **B+** | Session resume banner + `cc-active-view` |
| **Gap recovery** | **A-** | Pill + strip + G + ⌘K (chrome collapsed v1.42) |
| **Deliver / thin pack** | **B** | Confirm banner; readiness deep-links |
| **Forced break** | **B-** | Hard lock is correct ADHD care; can feel like a wall |
| **Off-path tools** | **B** | Timer/Calendar/Settings/Helper; re-entry via path 1–7 |

**Overall flow grade: B+** — shippable continuous path. Remaining pain is **progress honesty** (Design/early steps), **cognitive load of chrome**, and a few **branch dead-ends** (empty Soft Signal replace, break lock mid-export).

---

## 1. Master flow map

```
┌─────────────┐     ┌──────────────┐     ┌────────────────────────────┐
│ Auth gate   │────►│ Onboarding   │────►│ Define (1)                 │
│ local/cloud │     │ name + step  │     │ Detective · kits · → Res.  │
└─────────────┘     └──────────────┘     └─────────────┬──────────────┘
                                                       │
     Path bar 1–7 · N/7 pill · gap strip · G · ⌘K      │
                                                       ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Research 2│─►│Ideate 3  │─►│Sketch 4  │─►│Design 5  │─►│Review 6  │
│pins ★    │  │A/B/C     │  │step C/N  │  │system    │  │preview   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └────┬─────┘
                                                             │
                                                             ▼
                                                      ┌──────────────┐
                                                      │ Deliver 7    │
                                                      │ brand book   │
                                                      │ PDF / print  │
                                                      └──────────────┘

Off-path (any time): Timer · Calendar · Settings · Helper · Soft Signal
Interrupt: Forced break overlay (blocks path until done / emergency)
```

---

## 2. Journey table (current)

| Stage | View | User job | Primary forward | Escape / secondary | Flow health |
|-------|------|----------|-----------------|--------------------|-------------|
| Gate | LoginPage | Unlock / cloud sign-in | Enter desk | — | **A** |
| Onboard | modal | Name + ~25 min step | Finish → **Define** | Empty desk mode | **B+** (was Sketch; fixed) |
| Resume | banner | Return to last path view | Continue · {step} | Dismiss | **A-** |
| 1 Define | project | Goal, audience, kits | Go to Research | Detective, readiness | **B+** |
| 2 Research | studio | Refs, ★ ≤6, timer | Go to Ideate | Empty still-thin | **B+** |
| 3 Ideate | spark | Sparks, A/B/C, Choose | Go to Sketch | Pin stay, Queue chosen | **B** |
| 4 Sketch | flow | One step, Complete, why | Go to Design | Queue, micro-steps | **B+** |
| 5 Design | brand | Type/color/voice/logo | Go to Review (+ bump v1) | Accordion + preview | **B** |
| 6 Review | review | Notes, questions, preview | Go to Deliver | Path chips | **B+** |
| 7 Deliver | finish | PDF / print / handoff | Ship | Thin confirm, readiness | **B+** |

v1.22 skips (Research→Design, Design→Deliver, Ideate hasContent always false) are **fixed** in product.

---

## 3. Cross-cutting chrome (always-on flow aids)

| Control | Behavior | Flow value |
|---------|----------|------------|
| Path bar 1–7 | Jump any step; empty steps focus field | High |
| N/7 pill | Count + fix next gap | High |
| Gap strip | Still thin links + Next gap · G | High (ADHD) |
| Keys 1–7, C, N, G | Power path | High |
| ⌘K | Jump + gap | Medium |
| Helper | Coach off-path | Medium |
| Resume banner | Once per session | High return |

**Cognitive load residual (P2):** Pill + strip + per-step “Go to X” + process tips can stack. Acceptable after redundancy collapse; mobile strip already compact.

---

## 4. Critical path walkthrough (ADHD persona)

### A. First open
1. **Login** — local password or cloud  
2. **Onboard** — project name + first step → toast desk ready → **Define**  
3. **Mismatch:** first step lives on **Sketch queue**, attention lands on **Define** (correct for process) — user may not see the step they typed until Sketch  
4. **Define** detective + Go to Research  
5. **Research** pin + star (or empty still-thin) → Ideate  
6. **Ideate** Opposite alone does **not** fill step; need A/B/C or spark pin → Sketch  
7. **Sketch** Complete (C) / capture (N) → Design  
8. **Design** may already show **filled** in path (default palette) — false confidence  
9. **Review** notes + preview → Deliver  
10. **Deliver** download; if thin → confirm Print/Download anyway  

### B. Return next day
1. Unlock → **resume banner** with last view  
2. Continue or dismiss → gap strip shows still thin  

### C. Soft Signal demo
1. Settings → Soft Signal → **replace workspace** confirm  
2. Lands rich multi-step content — best “full flow” demo  

---

## 5. Branch & failure flows

| Branch | Entry | Risk | Recovery |
|--------|-------|------|----------|
| Forced break | Pomodoro end | Hard block on all path | Complete kit / emergency unlock |
| Thin leave-behind | Print/PDF | User may cancel | Banner + still ship |
| Empty Research | studio | Stuck if no upload | Still-thin + G; note pin |
| Ideate empty | spark | Opposite doesn’t complete | Honest progress (v1.43) |
| Leave-behind full | ★ 7th pin | Toast | Unstar others |
| Cloud sync fail | header chip | Stale cloud | Retry |
| Offline | — | SPA still navigates | offline e2e |

---

## 6. Ranked flow findings

### P1 — Onboard step vs landing view
User names a **first step** but starts on **Define**. Intentional process order, but **memory drop**: step is invisible until Sketch.

**Fix:** After onboard, chip “Your step is waiting on Sketch” on Define, or dual CTA: “Fill detective” + “See my first step”.

### P1 — Design path “done” too early
Default palette makes Design green/filled at create → **gap strip under-prioritizes Design craft**.

**Fix:** From design file audit D1 — stock palette doesn’t count.

### P1 — Progress signal vs craft signal diverge
`pathDoneCount` can be high while leave-behind still **thin** (readiness coreOk). User trusts N/7, then hits thin confirm at PDF.

**Fix:** Deliver/gap strip soft line when `thin` but process “full”; or readiness-aware still-thin.

### P2 — Forced break mid-flow
Correct product care; export/path feel interrupted. Emergency unlock exists but anxiety-inducing.

**Fix:** Toast before lock stronger “you’ll come back to {view}”; restore view after break (store `preBreakView`).

### P2 — Forward CTA density
Each step has Go to next + gap strip Next gap (may differ if current step full but later gaps remain). Two “next” mental models.

**Fix:** When current step full, primary = journey next; strip = earliest *empty* (already). Microcopy: strip title “Earliest empty · …”

### P2 — Tools re-entry
Timer/Settings hide path context until user presses 1–7. Tools pill shows label.

**OK enough;** optional “Back to path · {step}”.

### P3 — Soft Signal replace is scary but correct
Confirm copy is human; residual is no “preview merge” (by design).

### P3 — Multiple project switch
Select project doesn’t force path step reset — can land Design of project A after Define of B. Edge case.

---

## 7. What works well (do not break)

1. **Single spine** Define→Deliver with nextLabel on each step  
2. **Onboard → Define** (v1.22 fix)  
3. **Gap system** (pill/strip/G) after redundancy collapse  
4. **Ideate honesty** (v1.43) Opposite ≠ done  
5. **Resume banner** one-shot per session  
6. **Review pack preview** before Deliver  
7. **process-walk e2e** as living flow contract  
8. **Keyboard path** 1–7 without leaving fields-guard  

---

## 8. Flow metrics (product)

| Metric | Target | Notes |
|--------|--------|-------|
| Steps gate → first path content | ≤3 screens | Login, onboard, Define |
| Path jumps without dead CTA | 7/7 | Met |
| Distinct “fix next gap” CTAs | ≤3 chrome | Met (G, pill, strip) |
| e2e full process | 1 walk | process-walk |
| Time-to-PDF (demo Soft Signal) | short | Seeded |

---

## 9. Comparison to v1.22 mapping

| v1.22 P0 | v1.46 status |
|----------|--------------|
| Unified path CTAs | **Done** |
| Onboard → Define | **Done** |
| Research → Ideate | **Done** |
| Design → Review | **Done** |
| Review pack preview | **Done** |
| Ideate hasContent | **Done** (honest rules) |
| 5-step label residue | **Mostly gone** (some system-* CSS names remain) |

---

## 10. Proposed apply waves

### F1 — First-run coherence (P1)
1. Define shows “First step waiting on Sketch: {title}” when onboard step exists.  
2. Optional: “Open Sketch step” secondary CTA.

### F2 — Progress honesty in flow (P1)
1. Design hasContent fix (stock palette).  
2. When process N/7 high but pack thin, strip or Deliver eyebrow: “Path has content · leave-behind still thin.”

### F3 — Break continuity (P2)
1. Save `preBreakView`; restore after break ends.  
2. Micro toast: “Back to {label}.”

### F4 — Next-label clarity (P2)
1. Gap strip button prefix “Earliest empty ·” when different from journey next.

---

## 11. Verdict

Flow is **continuous and e2e-proven**. Remaining UX flow debt is **trust calibration** (what “filled” means vs ship-ready) and **first-run attention** (step vs Define), not missing path links.

Ready to implement **F1–F3** on request (`apply ux flow audit`).
