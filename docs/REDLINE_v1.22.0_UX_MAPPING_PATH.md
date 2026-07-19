# Redline v1.22.0 — UX mapping: login → 7-step branding path → PDF

**Scope:** Walk Login through Define → Research → Ideate → Sketch → Design → Review → Deliver and ship a professional vector PDF leave-behind.

**Verdict (pre-fix):** **PARTIAL** — path bar is 7-step; residual CTAs still skip steps or use 5-step labels (Work/Board/System/Pack). Can produce a direction pack PDF, not a full agency brand system.

## Journey table (audit)

| Step | View | What user does | Exit CTA (before) | Gap |
|------|------|----------------|-------------------|-----|
| Login / gate | LoginPage | Unlock desk | — | OK — clear gate |
| Onboard | modal | Name + first step | Lands **Sketch** | Should land **Define** |
| 1 Define | project | Name, kits, readiness | **Go to Sketch** + 5-step “Go to” | Next = Research; brief read-only; legacy links |
| 2 Research | studio | Upload/star pins | **Go to System** (Design) | Skips Ideate |
| 3 Ideate | spark | Sparks | ← Work / Done → Work | Back/next not path; hasContent always false |
| 4 Sketch | flow | One desk step | path-next OK | OK enough for direction work |
| 5 Design | brand | Artboard + rules | **Go to Deliver** / Pack | Skips Review |
| 6 Review | review | Checklist + readiness | No pack preview | Blind critique |
| 7 Deliver | finish | Vector PDF / print | — | OK for leave-behind |

## Ranked fixes (this cycle)

### P0 — must ship

1. **Unified path CTAs** — every step primary next uses `journey.nextLabel` / `nextView` (Define→Research, Research→Ideate, Ideate→Sketch, Design→Review, Review→Deliver).
2. **Define brief editable** on Project (not “Edit on System” only).
3. **Project “Go to”** — replace 5-step Work/Board/System/Pack with full 7-step list.
4. **Research next** → Ideate (not Design/System).
5. **Design next** → Review (not Pack/Deliver).
6. **Review** embeds live pack artboard preview.
7. **Ideate hasContent** — spark advanced or quote pin exists.
8. **Helper process buttons** navigate to phase views (still coach reply).
9. **Onboard** lands on Define (`project`), not Sketch.
10. **i18n residue** — openWork/goToSystem/hasOpenWorkStep/back links align with 7-step words.

### P1 — this cycle if cheap

11. SparkView back = Research; primary next = Sketch.
12. Tools views use “← Path” not “← Work”.

### P2 — later (honest product boundary)

- Multi-direction Ideate capture (A/B/C cards) beyond sparks
- Sketch A/B/C draft templates
- Full logo lockup builder / type specimen suite beyond artboard
- Multi-page brand guidelines PDF

## Product honesty

Creative Companion is a **brand direction pack desk**: brief → refs → sparks → desk steps → system artboard → review → vector PDF. It is not Figma or a full guidelines generator. Success = finish a client leave-behind without dead-end CTAs.
