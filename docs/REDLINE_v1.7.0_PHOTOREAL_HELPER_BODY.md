# Redline v1.7.0 — Photoreal full-body Helper Lottie

**Date:** 2026-07-19  
**Scope:** Replace vector face reels with photoreal full-body Helper motion driven by `public/buddy/helper-body.png`.

## Intent

Helper should feel like the same 3D character in the product — full body, photoreal, mood-reactive — not a flat vector face disc. Motion stays Lottie (code-split `lottie-web`), with static PNG fallback for `prefers-reduced-motion` and load failure.

## Changes

| Area | Detail |
|------|--------|
| `helperLottieReels.js` | Image-layer reels (idle / happy / think / rest) referencing `helper-body.png` |
| `HelperCharacterLottie` | `assetsPath` → `BASE_URL/buddy/`; circle vs body crop; fallback img |
| `BuddyMate` | FAB + compact avatar use body reels + `helper-body.png` fallback |
| CSS | Lottie host fill, circle crop, object-position upper body for fallbacks |
| Tests | `helperLottieReels.test.js` — asset wiring + mood aliases |

## Moods

| Mood | Motion |
|------|--------|
| idle | Soft float + breathe + micro-rotate |
| happy / win / celebrate | Bounce + scale pop + wiggle |
| think / focus / coach / hyper | Lean sway |
| rest / break / tired | Low settle + slow breath |

## Non-goals

- Multi-asset body variants (happy face PNG, etc.)
- Canvas renderer
- Embedding base64 PNG in the JS bundle

## Acceptance

1. FAB and open panel show the photoreal Helper body (cropped circle for avatars).  
2. Mood changes drive distinct loops without full remount thrash beyond mood switch.  
3. `reduceMotion` → static `helper-body.png`.  
4. Unit tests pass; production build includes `/buddy/helper-body.png`.  
