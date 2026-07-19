# Creative Companion — Professional Redline  
**As of v1.0.0**  
**Reviewer stance:** Senior UX / UI / graphic design lead — cold critique of shipped 1.0  
**Method:** Login → unlock → every path step → Tools → Helper → every Settings control  
**Date:** 2026-07-19

---

## Executive verdict

1.0 delivers a **coherent ADHD design desk** with a real spine and export. That is a real product.

It still **does not look expensive enough to author brand for clients**. The path is honest; the **artifact and surfaces** still share one SaaS panel language. Competence without authorial voice.

**Harsh scores (0–10):**

| Lens | Score | Why |
|------|------:|-----|
| Product clarity (path) | **7.5** | Spine is clear; Tools residual, Settings density |
| ADHD / focus UX | **6.5** | Work fold good; System still long; Helper More still weighty |
| UI craft | **6.0** | Neutral tokens land; radius/panel monotony |
| Graphic / pack credibility | **5.0** | Better type pairs + roles; artboard still form-document hybrid; PDF raster |
| Consistency / honesty | **7.0** | Path fixed; “body-double” / warm theme labels leak |
| Product visual identity | **4.5** | Monoline mark OK as craft; not a designed lockup system |

**One line:** You shipped the right desk. The pack still looks like a careful export of a form, not a designed leave-behind.

---

## What 1.0 already fixed (credit, don’t re-open)

Path map honesty · starred pins · force-break consent · Pack download hierarchy · Helper XP gated · login pack specimen · System preview-only artboard · type pairs · board hover tools · export PDF primary · print CSS · watermark toggle · Esc stack · axe/e2e · quiet toasts · offline SPA.

---

## 0. Product identity

| Issue | Sev | Redline |
|-------|-----|---------|
| **Login tag still “Body-double desk”** | High | Product language elsewhere is Helper. Use one: “Helper desk for ADHD creative work.” |
| **Mark is CSS craft, not lockup system** | Med | Acceptable for 1.0 non-goal; ensure favicon + logo-mark match (done). Don’t invent a second mark. |
| **Footer competes with Pack** | Med | Hide or minimize footer on Pack view. |
| **Soft Signal on login** | Med | Specimen implies sample brand is the product. Rename to “Your project” / generic “Acme Covers” so it doesn’t read as Soft Signal-only. |

---

## 1. Login

**Controls:** Sign in / Create (cloud) · email · password · show · confirm · forgot · submit · proof column.

| Issue | Sev | Redline |
|-------|-----|---------|
| Tagline “Body-double” | High | → Helper desk |
| Specimen named Soft Signal | Med | Generic project name |
| Storage essay below form | Med | One line + “Details in Settings” |
| Show password lacks `aria-pressed` | Low | Add |
| Primary button copy OK | — | Keep Unlock / Create access |

---

## 2. Onboarding

| Issue | Sev | Redline |
|-------|-----|---------|
| Specimen good | — | Keep |
| Brief still on first run | Low | Optional OK; already optional |
| Mobile hides specimen | Low | OK density |

---

## 3. Shell

| Issue | Sev | Redline |
|-------|-----|---------|
| Journey no “has content” state | Med | Subtle filled num when step has data |
| Tools menu solid | — | Timer/Calendar/Helper only — keep |
| Account “Dark/Light” vs Settings | Low | Match “Switch to dark” language |
| Skip link OK | — | Keep |

---

## 4. Project

| Issue | Sev | Redline |
|-------|-----|---------|
| Brief read-only + Edit on System | Good | Keep |
| Dual Open Work / Open Pack | Med | Pack ghost — already; ensure Open Work is only primary |
| Quick add collapsed | Good | Keep |
| Readiness vs Pack readiness labels | Med | Rename Project meter to “Path readiness” |

---

## 5. Work

| Issue | Sev | Redline |
|-------|-----|---------|
| No page H1 “Work” | Med | Add quiet title or `sr-only` H1 for a11y + orientation |
| Complete + More | Good | Keep |
| Design checklist vs Helper process | Med | Checklist label: “Local design checklist (offline)” so it doesn’t compete with Helper Process |
| Queue always-false checkbox look | Low | Use complete affordance that doesn’t look broken |
| Capture strip OK | — | Keep |

---

## 6. Board

| Issue | Sev | Redline |
|-------|-----|---------|
| Lightbox OK | — | Keep |
| Lazy images OK | — | Keep |
| Star next unpinned | Low | Keep careful wording |
| Empty craft OK | — | Keep |
| Go to System primary | Good | Keep |

---

## 7. System

| Issue | Sev | Redline |
|-------|-----|---------|
| Preview + Edit tabs | Good | Keep |
| Edit label long | Low | Shorten to “Edit” |
| Sticky artboard on wide screens | High | Pin artboard while scrolling edit tabs |
| Pins tab starred-only | Good | Keep |
| Logo direction + upload | Good | Keep |

---

## 8. Pack

| Issue | Sev | Redline |
|-------|-----|---------|
| Download + Print dual | Good | Keep hint |
| Watermark toggle | Good | Keep |
| Start over / Log out still panel-heavy | Med | Collapse under details “Leave desk” |
| Path map | Low | Keep thin |
| Footer on Pack | Med | Hide |

---

## 9. Timer / Calendar / Spark

| Issue | Sev | Redline |
|-------|-----|---------|
| Timer copy fixed | Good | Keep consent |
| Calendar day → deadline | Good | Keep |
| Spark lazy | Good | Keep |

---

## 10. Helper

| Issue | Sev | Redline |
|-------|-----|---------|
| Break care vs Process split | Good | Keep |
| AI badge | Good | Keep |
| Quiet mode | Good | Keep |

---

## 11. Settings (every control)

| Control | Critique |
|---------|----------|
| Theme / Screen dual rows | **High** — Theme button + separate Screen status is redundant. One row: status + toggle. |
| Reduce motion | OK |
| Helper / quiet / sound / force | OK; force consent OK |
| Queue / how-it-works / XP / toast | OK |
| Account password | OK |
| Data backup | OK |
| Soft Signal | OK opt-in |
| Helper AI section | OK |
| Hide watermark | OK (also on Pack) — OK dual |
| About 1.0 line | OK |
| **Density** | **Med** — no section jump links; add sticky mini-nav: Appearance · Presence · Work · Account · Data · About |

---

## 12. Critical ship list (implement this cycle)

### P0 — craft honesty
1. Login: Helper tagline; generic pack specimen name  
2. Settings: merge Theme + Screen into one row  
3. Work: add `h1` (visible quiet or sr-only)  
4. Pack: hide app footer; collapse “Start over or leave”  
5. Project: “Path readiness” label  

### P1 — surface craft  
6. System: sticky artboard on desktop  
7. Journey: `is-done` / has-content state for steps with data  
8. Login: show-password `aria-pressed`; shorter storage note  
9. Work: design checklist summary copy disambiguation  
10. Settings: compact section nav  

### P2 — polish  
11. Account menu theme labels  
12. Pack empty thin state already OK  
13. Document residual non-goals (vector PDF) — no code  

---

## Control inventory (touched)

Login · Onboard · Header Tools×3 · Account×3 · Journey×5 · Project all · Work all · Board all · System all · Pack all · Timer · Calendar · Spark · Helper · Forced break · Export · Settings every switch/button.

---

## Final line

1.0 is a **working design desk**. This redline is about **finishing the craft so the product doesn’t apologize for itself**. Ship P0–P1; leave vector PDF as post-1.0.

*End redline v1.0.0*
