# Micro audit — v1.6.0 (full catalog · RTL · character Lottie)

**Against:** `docs/REDLINE_v1.6.0_I18N_RTL_CHARACTER.md`  
**Gates:** unit 32/32 · e2e 8/8 · build + perf pass

| Item | Status |
|------|--------|
| Expanded `ui.*` catalog + EN fallback | **Pass** |
| ar locale + `dir=rtl` / `lang` | **Pass** |
| RTL CSS (journey, pack, header, transitions flip) | **Pass** |
| Settings language includes العربية | **Pass** |
| HelperCharacterLottie reels (idle/happy/think/rest) | **Pass** |
| FAB + panel face use reels; static img fallback | **Pass** |
| Pack / Tools / Work key strings via i18n | **Pass** |
| Lottie remains code-split | **Pass** |
| Main bundle under 420KB | **Pass** (~375KB) |

## Residual (honest)

| Item | Disposition |
|------|-------------|
| 100% of every Settings paragraph translated | Progressive; EN fallback for sparse locales |
| Professional localization QA | Human process |
| Photoreal Helper body Lottie | Vector face reels ship; photo fallback remains |

## Loop

**Closed.**

## Verdict

Ship **v1.6.0**.
