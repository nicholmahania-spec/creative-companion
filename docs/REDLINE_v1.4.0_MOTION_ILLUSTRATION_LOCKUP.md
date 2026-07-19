# Creative Companion — Motion · Illustration · Lockup Redline  
**As of v1.3.0**  
**Reviewer stance:** Brand / motion / product design lead  
**Scope:** Motion language, empty-state illustration system, product lockup  
**Date:** 2026-07-19

---

## Executive verdict

Stone chrome is honest. What is still missing is **a product that has a face**:

1. **Motion** is ad hoc (Buddy has a language; the desk does not).  
2. **Empty states** use tiny CSS doodles — not a system.  
3. **Lockup** is a CSS pseudo-element mark — not a shippable brand asset.

| Lens | Score | Note |
|------|------:|------|
| Motion system | **4.0** | Tokens exist; no view enter/exit grammar |
| Illustration system | **4.5** | Empty craft is cute but one-off |
| Product lockup | **4.0** | Favicon SVG ok; header is CSS fake mark |
| Reduce-motion honesty | **7.0** | Pref exists; not applied globally to UI motion |

**One line:** Give the desk a voice (motion), a hand (illustrations), and a signature (lockup).

---

## Critical defects

| # | Issue | Sev |
|---|-------|-----|
| 1 | No **motion tokens** for enter / exit / press beyond generic transition | High |
| 2 | **View changes** are hard cuts — jarring for ADHD focus shifts | High |
| 3 | Buddy motion rich; **desk motion silent** — product feels split | Med |
| 4 | Empty states only on Work/Board — **Calendar/Pack/Settings** bare | High |
| 5 | Empty craft not reusable components | Med |
| 6 | **Logo is CSS** — not SVG; print/export/PWA inconsistent | Critical |
| 7 | No **wordmark + mark** lockup for login/header | High |
| 8 | `prefers-reduced-motion` not wired to CSS animations globally | High |

---

## Ship list (this cycle)

### Motion (P0)
1. CSS variables: `--motion-enter`, `--motion-exit`, `--ease-out-expo`  
2. `.view-enter` fade+soft rise on main view surfaces  
3. `html[data-reduce-motion="true"]` kills transform animations; duration → 0.01ms  
4. Match `prefers-reduced-motion: reduce` media query  

### Illustration system (P0)
5. Shared `EmptyIllustration` variants: `desk` · `board` · `pack` · `path` · `calendar`  
6. Use on Work empty, Board empty, Pack thin/empty, Calendar empty  
7. SVG-based, monoline, stone/growth palette — same as lockup language  

### Lockup (P0)
8. Ship `public/mark.svg` (path mark) + optional dark  
9. `LogoLockup` React component: SVG mark + “Creative Companion” wordmark  
10. Header + Login use LogoLockup (not CSS pseudo mark)  
11. Favicon stays path mark (aligned)  

### P1
12. Journey step press micro-scale (disabled when reduce motion)  
13. Toast enter already exists — align duration to tokens  

---

## Non-goals

- Lottie / heavy video  
- Full character system beyond Helper  
- Multi-language wordmark  

---

## Audit close

SVG lockup in header/login; empty illustrations on major empty states; global reduce-motion; view enter motion. Tests green.

*End redline v1.4.0*
