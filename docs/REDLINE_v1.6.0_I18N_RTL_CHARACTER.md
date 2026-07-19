# Creative Companion — Full UI catalog · RTL · Character Lottie  
**As of v1.5.0**  
**Reviewer stance:** i18n + motion design lead  
**Date:** 2026-07-19

---

## Executive verdict

1.5 localized the **signature + path**. The rest of the desk is still English-first, **LTR-only**, and Helper’s face is a **static JPEG** while the brand mark gets Lottie.

| Lens | Score | Note |
|------|------:|------|
| UI string catalog | **3.5** | Path only |
| RTL readiness | **1.0** | No dir, no logical layout |
| Character Lottie | **2.0** | Mark Lottie only; Helper is photo |

**One line:** Translate the desk, flip the layout, animate the Helper.

---

## Critical defects

| # | Issue | Sev |
|---|-------|-----|
| 1 | Settings / Work / Pack / Login still hard-coded English | Critical |
| 2 | No Arabic (or other RTL) locale | Critical |
| 3 | No `dir="rtl"` or mirrored chrome | Critical |
| 4 | Helper face static — no character reels for mood | High |
| 5 | Forward/back transitions not mirrored in RTL | High |
| 6 | i18n fallback incomplete for nested keys | Med |

---

## Ship list

### Full UI catalog (P0)
1. Expand `i18n.js` with `ui.*` keys: tools, settings sections, pack CTAs, work, board, common  
2. Wire Settings, Login, Pack export labels, Tools menu, Work complete, empty titles  
3. `t()` falls back to English for missing keys  
4. Unit tests: every locale has productName + ui.completeStep  

### RTL (P0)
5. Add `ar` locale (RTL)  
6. `document.documentElement.dir = 'rtl' | 'ltr'` from locale  
7. CSS: logical props + RTL overrides for journey, header, pack layout, buddy dock  
8. Swap forward/back enter animations when `dir=rtl`  

### Character Lottie reels (P0)
9. `helperLottieReels.js` — idle / happy / think / rest reels (vector character)  
10. `HelperCharacterLottie` component, code-split lottie-web  
11. BuddyMate FAB + panel face use reels by mood; reduceMotion → static image  
12. Optional soft loop per mood  

### P1
13. Tools / Account menu strings  
14. Pack print/download strings  

---

## Non-goals

- Professional translator QA for every language  
- Full legal/privacy copy  
- 60fps body-mechanics character  

---

## Audit close

Catalog covers primary chrome; ar + dir=rtl; Helper has Lottie reels; tests green.

*End redline v1.6.0*
