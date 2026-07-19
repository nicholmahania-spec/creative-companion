# Redline v1.12.0 — Locale fill + Helper asset weight

**Base:** v1.11.0 residual

## Scope

1. Compress Helper body PNG (web weight) + sync Lottie asset dims  
2. Translate v1.11 chrome keys for es/fr/de/pt/ja/ar (thin pack, confirms, settings presence, empties, path honesty)  
3. Tests for locale overrides  

## Acceptance

- helper-body.png < 500KB  
- Locales resolve thinPackBanner / cancel without EN-only holes for es  
- Unit tests + build:check green  
