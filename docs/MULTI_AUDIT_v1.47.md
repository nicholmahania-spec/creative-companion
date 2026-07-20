# Multi-audit pack — Creative Companion v1.47.0

**Date:** 2026-07-19  
**Scope:** Humanize · UX flow · Per-step transitions · Beautification · Micro  
**Method:** Code + grammar + prior redlines (v1.22–v1.47) + live path rules  
**Unit baseline:** 78 tests green  

---

## Portfolio scorecard

| Audit | Grade | Trend vs prior | One line |
|-------|:-----:|----------------|----------|
| **Humanize** | **A-** | ↑ (v1.45 closed P0) | Warm desk voice; few niche EN strings left |
| **UX flow** | **A-** | ↑ (v1.47 F1–F4) | Continuous path; honesty chrome shipped |
| **Transitions (each step)** | **A-** | ↑ (nav solid; craft gates improved) | 1–7 links solid; soft craft gates remain by design |
| **Beautification** | **B+** | ↑ (indigo mostly gone) | Stone/growth; density/chrome polish remains |
| **Micro** | **A-** | ↑ | Hooks, gap, honesty, e2e contract healthy |

**Launch readiness (product UX):** shippable for leave-behind desk demo.  
**Not claimed:** full brand-system tool, Figma, multi-locale toast perfection.

---

# 1. Humanize audit (re-audit @ v1.47)

## Grade: A-

### Closed (v1.45–1.46)
| Item | Status |
|------|--------|
| 4-step Clarify/Structure/Visual/Refine in Helper idle | Closed |
| Figma in bathroom tips | Closed |
| Core toasts machine voice | Closed (i18n) |
| XP leading ship toasts | Closed |
| Empty states stiff | Softened |
| Niche toast EN | Mostly closed (i18n catalog) |

### Remaining (P2/P3 only)

| # | Finding | Sev | Notes |
|---|---------|-----|-------|
| H1 | Settings still hardcodes `Synced to cloud` | P3 | One line |
| H2 | Buddy tip “Queue clear…” not i18n | P3 | Scripted EN |
| H3 | FR/DE/JA/AR toast keys fall back to EN | P3 | By design of `t()` |
| H4 | GameHUD XP when Progress **on** | Accepted | Opt-in theatre |
| H5 | Helper sass / roast tone | Accepted | Product voice |

### Principles still met
- Failures: “Couldn’t… try again?”  
- Process words: Define→Deliver  
- Leave-behind language over “Pack downloaded” on success paths  

### Humanize residual open: **none P0/P1**

---

# 2. UX flow audit (re-audit @ v1.47)

## Grade: A- (was B+ at v1.46)

### Master path (confirmed)

```
Login → Onboard → Define → Research → Ideate → Sketch → Design → Review → Deliver → PDF
Chrome: 1–7 · N/7 · gap strip · G · ⌘K
Off-path: Timer · Calendar · Settings · Helper
Interrupt: Forced break (restores view @ v1.47)
```

### Journey health

| Journey | Grade | Evidence |
|---------|:-----:|----------|
| Happy path | **A-** | process-walk e2e |
| First-run | **A-** | Onboard→Define + first-step chip |
| Resume | **A-** | Session banner |
| Gap recovery | **A** | Pill/strip/G collapsed |
| Path vs thin leave-behind | **A-** | Strip + Deliver eyebrow |
| Forced break | **B+** | Restores view + micro toast |
| Off-path tools | **B+** | Tools pill; path keys return |

### Closed since UX_FLOW_AUDIT_v1.46
| Finding | Status |
|---------|--------|
| Onboard step invisible on Define | **Closed** — first-step chip |
| Design false-full / N/7 trust | **Closed** — stock palette honesty |
| Break loses place | **Closed** — resumeView |
| Next vs earliest empty | **Closed** — Earliest empty · G |

### Remaining UX flow (P2)

| # | Finding | Sev |
|---|---------|-----|
| U1 | Chrome stack (strip + tips + CTAs) still dense on small screens | P2 |
| U2 | Soft Signal replace is intentional hard fork (no merge) | Accepted |
| U3 | Multi-project switch may keep previous path view | P3 |

### UX flow residual open: **none P0/P1**

---

# 3. Transitions audit (each step)

## Grade: A-

Navigation next-labels match the 7-step spine. Craft gates stay **soft** (ADHD no-trap) but **honest** where we fixed false greens.

| Transition | Nav | Craft gate | Missable deliverables | Score |
|------------|-----|------------|----------------------|:-----:|
| **1→2 Define→Research** | Go to Research | Soft (name/goal/audience) | Brief from detective; must-haves | **A-** |
| **2→3 Research→Ideate** | Go to Ideate | Soft (any pin) | ★ leave-behind pins; captions | **B+** |
| **3→4 Ideate→Sketch** | Go to Sketch | Honest (A/B/C or spark pin) | Chosen winner; queue draft | **A-** |
| **4→5 Sketch→Design** | Go to Design | Soft (any task) | Why line; complete decisions | **B+** |
| **5→6 Design→Review** | Go to Review (+v1→v2 nudge) | **Honest craft** (not stock palette) | Tagline, voice, roles, logo | **A-** |
| **6→7 Review→Deliver** | Go to Deliver | Soft (notes or tagline+★) | Feedback notes vs goal | **B+** |

### Cross-step chrome
| Control | Role | Score |
|---------|------|:-----:|
| Path 1–7 | Jump + focus if empty | **A** |
| N/7 pill | Count + gap | **A** |
| Gap strip | Still thin · earliest empty · ship | **A** |
| G / ⌘K | Same gap action | **A** |

### Transition residual open
| # | Finding | Sev |
|---|---------|-----|
| T1 | Research “any pin” still soft (no ★ required for step done) | P2 craft |
| T2 | Sketch “any task” includes onboard blob | P2 craft |
| T3 | Review without notes still possible | P2 craft |

None block navigation. Craft remains operator-owned for launch demos.

---

# 4. Beautification audit (@ v1.47)

## Grade: B+

Baseline: `REDLINE_v1.3.0_BEAUTIFY.md` (v1.2 era). Current CSS scan:

| Check | Result |
|-------|--------|
| Indigo `#4F46E5` / `79,70,229` in CSS | **~0 product chrome** (3 residual mentions max; tokens stone/growth) |
| Accent tokens | Stone ink + growth teal |
| `--font-display` | Used; pack titles **Fraunces** |
| Empty states | Path-mark illustrations, no orbs |
| Panel hover noise | Improved vs v1.3; still some elevation patterns |
| Motion | Reduce-motion respected (html dataset + CSS) |

### Lens scores (now)

| Lens | Score | Note |
|------|------:|------|
| Token honesty | **8.5** | Stone + growth owned |
| Surface hierarchy | **7.5** | Desk/document better; still heavy CSS surface |
| Type rhythm | **8.0** | Fraunces pack + Jakarta UI |
| Chrome (header/path) | **8.0** | Path pill/strip polish; header OK |
| Density | **7.5** | Gap strip adds density; mobile compact |
| Pack / artboard | **8.5** | Strong leave-behind presence |
| Motion taste | **7.5** | Buddy rich; reduce-motion OK |

### Remaining beautify (P2)

| # | Finding | Sev |
|---|---------|-----|
| B1 | `system-*` / `brand-*` class names lag path “Design” language | P3 |
| B2 | Gap strip + path + page header = visual chrome stack | P2 |
| B3 | Dark mode journey states need spot-check (not fully re-scored) | P2 |
| B4 | one-pager marketing type still separate (documented OK) | Accepted |
| B5 | CSS file large (~11k lines) — maintainability, not user bug | Accepted |

### Beautify residual open: **none P0** (indigo P0 closed historically)

---

# 5. Micro audit (@ v1.47)

## Grade: A-

| Area | Check | Result |
|------|-------|--------|
| Hooks | pathProgress / leaveBehindThin above early returns | OK |
| Design honesty | stock palette ≠ done | OK unit |
| Ideate honesty | sparkIndex alone ≠ done | OK unit |
| Gap nav | goToProcessStep + buildPathProgressCtx | OK |
| Break resume | preBreakView / resumeView | OK |
| Pack readiness | goToProcessStep for misses | OK |
| Persona | 7-step HELPER_SYSTEM_PROMPT | OK unit |
| Spark deck | no Opposite day in main list | OK unit |
| Humanize | no Figma / 4-step in buddy samples | OK unit |
| E2E | process-walk / path-smoke / brand PDF | 13/13 last ship |
| Perf | main ≤440 KB budget | OK (documented) |
| Product boundary | not Figma / leave-behind | Honest copy |

### Micro residual
| # | Finding | Sev |
|---|---------|-----|
| M1 | App.jsx monolith (~6.6k) | P2 maintainability |
| M2 | Some micros still template EN (brandRoleAssign → n) | P3 |
| M3 | exportFiles large (~1.9k) | P2 |

### Micro residual open: **none P0/P1 product bugs**

---

# 6. Consolidated residual ledger

## Open P0
**None**

## Open P1
**None** (for these five audits)

## Open P2 (optional polish backlog)
1. ~~Soften Research hasContent to prefer ★ pin~~ → **Closed v1.48** (`inPack || ≥2 pins`)  
2. ~~Gap-strip density on mobile~~ → **Closed v1.48**  
3. ~~Dark mode path visual spot-check~~ → **Closed v1.48** (growth teal, deep chrome)  
4. ~~Settings “Synced to cloud” → i18n humanize~~ → **Closed v1.48** (`ui.syncedOk`)  
5. ~~App.jsx modularization (gap strip)~~ → **Closed v1.48** (`JourneyGapStrip.jsx`); Design/Research extracts remain optional

## Accepted (not residuals)
- Soft craft gates (user can skip steps via path) — ADHD  
- Helper sass  
- Progress HUD XP when enabled  
- Marketing one-pager separate type  
- Multi-locale EN fallback  

---

# 7. Launch checklist (from multi-audit)

### Product truth
- [x] 7-step continuous CTAs  
- [x] Gap recovery chrome  
- [x] Design / Ideate honesty  
- [x] First-step chip on Define  
- [x] Break restores view  
- [x] Thin leave-behind vs path fill messaging  
- [x] Human toasts core paths  

### Operator (demo day)
- [ ] Soft Signal full walk on prod URL  
- [ ] Blank project craft checklist (goal, ★ pins, A/B/C chosen, tagline, notes, PDF)  
- [ ] Forced break → resume → export once  
- [ ] Thin PDF confirm path once  

### Optional polish before “flawless”
- [x] B2 mobile strip density — v1.48  
- [x] H1 Settings sync toast i18n — v1.48  
- [x] Dark mode journey pass — v1.48  

---

# 8. Verdict

| Question | Answer |
|----------|--------|
| Humanize solid? | **Yes** — A- |
| UX flow solid? | **Yes** — A- after v1.47 |
| Transitions solid? | **Yes nav**; craft soft by design, honesty improved |
| Beautification solid? | **Mostly** — B+; no indigo crisis |
| Micro solid? | **Yes** — A- |

**Overall product UX posture for leave-behind launch: ready**, with operator craft checklist still required for client-quality demos.

---

*End multi-audit pack v1.47.0*
