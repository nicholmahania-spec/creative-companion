# Micro audit — v1.5.0 (Lottie · i18n · transitions)

**Against:** `docs/REDLINE_v1.5.0_LOTTIE_I18N_TRANSITIONS.md`  
**Gates:** unit 29/29 · e2e 8/8 · build + perf pass

| Item | Status |
|------|--------|
| Redline committed | **Pass** |
| Lottie path-mark (code-split `lottie-web`) | **Pass** |
| Static SVG fallback + reduceMotion | **Pass** |
| i18n: en/es/fr/de/pt/ja wordmark + path | **Pass** |
| Settings language select | **Pass** |
| `document.documentElement.lang` | **Pass** |
| Directional view transitions (forward/back/none) | **Pass** |
| Journey pulse on step change | **Pass** |
| Unit tests for i18n | **Pass** |
| Lottie off main chunk (~301KB lazy) | **Pass** |
| CSS media query syntax fixed | **Pass** |

## Residual (park)

| Item | Disposition |
|------|-------------|
| Full UI string catalog | Only signature + path by design |
| RTL | Park |
| Custom Lottie character reels | Park — mark is the brand motion |

## Loop

**Closed.**

## Verdict

Ship **v1.5.0**.
