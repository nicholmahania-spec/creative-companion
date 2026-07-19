# Micro audit v1.7.0 — Photoreal full-body Helper Lottie

| Check | Result |
|-------|--------|
| Image layer points at `helper-body.png` | **Pass** |
| Four mood reels (idle/happy/think/rest) | **Pass** |
| Mood aliases (win, coach, break…) | **Pass** |
| `HelperCharacterLottie` assetsPath under BASE_URL | **Pass** |
| Circle crop for FAB / compact avatar | **Pass** |
| reduceMotion → static body PNG | **Pass** |
| Vector face reels removed from product path | **Pass** (replaced) |
| Unit tests for reels | **Pass** |
| Bundle does not embed 284KB PNG as base64 | **Pass** (external asset) |

## Residual

- ~~Optional: larger full-body (non-circle) mascot mode in expanded panel~~ → **v1.7.1 done**  
- Optional: mood-specific expression PNGs if art is produced later  

### v1.7.1 addendum

| Check | Result |
|-------|--------|
| Expanded panel `shape="body"` hero | **Pass** |
| Circle crop only on FAB | **Pass** |
| Hero ground + mood shell tints | **Pass** |
