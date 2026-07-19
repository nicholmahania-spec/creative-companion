# Creative Companion — Beautification Redline  
**As of v1.2.0**  
**Reviewer stance:** Senior product designer / visual systems  
**Scope:** Look & feel only (chrome, type, surface, motion, density) — not IA  
**Date:** 2026-07-19

---

## Executive verdict

Functionally the desk is complete. Visually it still reads as **competent SaaS with leftover indigo DNA** and **one-radius-fits-all cards**. Neutrals landed; **accent discipline and surface differentiation** did not fully finish.

| Lens | Score | Note |
|------|------:|------|
| Token honesty (stone vs brand) | **6.5** | Tokens OK; hover/active still flash indigo `#4F46E5` |
| Surface hierarchy | **6.0** | Desk/wall/document half-done; panels still lift on hover everywhere |
| Type rhythm | **6.5** | Single family; display token unused |
| Chrome (header / path) | **6.0** | Journey active border still indigo-tinted |
| Density / polish | **6.5** | Good quiet mode; residual hairline inconsistency |
| Pack / artboard beauty | **7.0** | Stronger after 1.1–1.2; chrome lags behind |

**One line:** Stop renting indigo. Own stone + growth teal. Quiet the panels.

---

## Critical defects (beautify)

| # | Issue | Sev |
|---|-------|-----|
| 1 | **Indigo residue** — `rgba(79, 70, 229, …)` on journey active/hover, pills, tool-rail | Critical |
| 2 | **Panel `:hover` elevates every card** — ADHD-noisy, unrefined | High |
| 3 | **Journey active** uses indigo border, not stone/growth | High |
| 4 | **`--font-display` unused** — no display scale for Pack/page titles | Med |
| 5 | **Canvas flat stone** — no subtle paper depth | Med |
| 6 | **Primary button** — flat ink, no refined press/depth | Med |
| 7 | **Header** — basic bar; weak separation from path | Med |
| 8 | **Focus rings** — OK but mix glow colors | Low |
| 9 | **Dark mode** — journey hover still purple-tinted | High |

---

## Ship list (implement this cycle)

### P0
1. Global replace indigo hover/active → stone / growth tokens  
2. Kill default `.panel:hover` lift (keep only interactive cards)  
3. Journey active/done fully on stone + growth  

### P1
4. Paper canvas (light radial + hairline)  
5. Page title display tracking; Pack titles use display weight  
6. Header bar: hairline + subtle blur  
7. Primary button: refined shadow + active press  
8. Main content max-width rhythm unified  

### P2 (if time)
9. Settings jump chips more refined  
10. Login proof column already dark — ensure no indigo  

---

## Non-goals

- New illustration system  
- Motion redesign  
- Brand color on chrome (must stay off)  

---

## Audit close

No indigo in interactive chrome; panels calm; path active is growth/stone; tests still green.

*End beautification redline v1.3.0*
