# Creative Companion — Lottie · Multilingual wordmark · Page transitions  
**As of v1.4.0**  
**Reviewer stance:** Brand motion + localization lead  
**Date:** 2026-07-19

---

## Executive verdict

1.4 gave a face (SVG lockup + empty illu + enter fade). Still missing **premium product motion**, **localized signature**, and **directional page choreography**.

| Lens | Score | Note |
|------|------:|------|
| Lottie / mark motion | **3.5** | Static mark; Helper has motion, brand mark does not |
| Multilingual wordmark | **2.0** | English only |
| Page transitions | **4.5** | One-shot fade; no forward/back grammar |
| Reduce-motion honesty | **7.5** | Pref exists; must cover Lottie + choreography |

**One line:** Animate the signature, translate the name, choreograph the path.

---

## Critical defects

| # | Issue | Sev |
|---|-------|-----|
| 1 | Mark is static — no draw / settle animation | High |
| 2 | No Lottie (or equivalent) load path for brand motion | High |
| 3 | Wordmark English-only — not exportable to multilingual markets | Critical for i18n claim |
| 4 | View enter always same direction — path navigation feels flat | High |
| 5 | No shared transition director (from step → to step) | Med |
| 6 | Language not in Settings | High |

---

## Ship list

### Lottie / mark motion (P0)
1. Dynamic `lottie-web` (code-split) for path-mark animation  
2. Hand-authored compact Lottie (or SVG path-draw fallback if load fails)  
3. Respect `reduceMotion` + `prefers-reduced-motion` → static mark  

### Multilingual wordmark (P0)
4. `lib/i18n.js` — locales: en, es, fr, de, pt, ja  
5. Wordmark + tagline + path step labels localized  
6. Settings: Language select; persist `prefs.locale`  
7. `LogoLockup` uses `t(locale, 'productName')`  
8. `document.documentElement.lang` updates  

### Choreographed transitions (P0)
9. Track journey index before/after; set `data-nav-dir="forward|back|none"`  
10. CSS: `view-enter-forward` / `view-enter-back` (slide + fade)  
11. Stagger journey step highlight pulse on change  
12. Disable transforms when reduce motion  

### P1
13. Login tagline localized  
14. Unit test i18n wordmarks  

---

## Non-goals

- Full app string catalog (every Settings string)  
- RTL layout  
- Server-side locale detection  
- Heavy multi-MB Lottie character reels  

---

## Audit close

Lottie/SVG mark motion offline-safe; 6 locales on lockup + path; directional view transitions; tests green.

*End redline v1.5.0*
