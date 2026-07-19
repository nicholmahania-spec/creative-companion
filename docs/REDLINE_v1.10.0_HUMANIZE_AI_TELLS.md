# Redline v1.10.0 — Humanization (AI-tells audit)

**Date:** 2026-07-19  
**Critic lens:** AI tells · stock gloss · indigo SaaS residue · sterile perfection · meaningless complexity  
**Surface under review:** Creative Companion product chrome (SPA), Helper character, empty illu system, login specimen, brand artboard.

---

## Audit findings

### 1. Stock 3D mascot (sterile perfection + AI character tropes)
| | |
|--|--|
| **The Tell** | Glossy symmetrical “cute AI robot” with black void face, beret + pencil cliché, pure black cutout |
| **Location** | Helper FAB + expanded hero (`helper-body.png`) |
| **Why it's bad** | Reads as Midjourney/Imagine stock companion, not a desk tool with human craft |
| **Actionable fix** | Stage as paper-desk prop (warm matte ground, hard contact shadow, no multi-glow); longer-term: custom 2D mark or textured photo. This cycle: CSS stage humanization only |

### 2. Floating accent orbs in empty states
| | |
|--|--|
| **The Tell** | Meaningless filled circles as “accent” (AI soft-orb shorthand) |
| **Location** | `EmptyIllustration` desk/board/path/calendar variants |
| **Why it's bad** | Orbs fill space without narrative; compete with path-mark language |
| **Actionable fix** | Replace with path-mark geometry (rising steps, pin star, left rail) |

### 3. Indigo / lilac SaaS residue
| | |
|--|--|
| **The Tell** | `#eef2ff` / `#F5F3FF` / `#1E1B4B` / navy deep hero — classic AI-UI + Tailwind indigo defaults |
| **Location** | product-card, mood-add-hero, task-row.is-next, journey-guide, help-card-featured, concept lanes, deep step-focus |
| **Why it's bad** | Undermines stated stone desk system; screams template SaaS |
| **Actionable fix** | Warm paper / charcoal only |

### 4. Rainbow gamification glow bars
| | |
|--|--|
| **The Tell** | Amber → teal multi-stop gradients on XP fills |
| **Location** | Game HUD + buddy XP bars |
| **Why it's bad** | Mobile-game dopamine chrome, not craft desk |
| **Actionable fix** | Single growth or stone fill |

### 5. Soft teal canvas glow
| | |
|--|--|
| **The Tell** | Body radial growth glow + pure white halo (gentle AI studio lighting) |
| **Location** | `body` background-image |
| **Why it's bad** | Feels generated “premium soft light” rather than paper under a lamp |
| **Actionable fix** | Flat stone canvas + subtle grain; no teal bloom |

### 6. Multi-layer soft glow on Helper stage
| | |
|--|--|
| **The Tell** | Radial sage under glow + dual drop-shadow “bloom” |
| **Location** | `.buddy-compact-hero` / body filter |
| **Why it's bad** | AI product shot lighting |
| **Actionable fix** | Matte card, hard oval contact shadow, no bloom |

### 7. Product card rainbow hairline
| | |
|--|--|
| **The Tell** | Gradient strip primary→soft→growth on purpose card |
| **Location** | `.product-card::before` |
| **Why it's bad** | Decorative complexity; brand color should live on pack only |
| **Actionable fix** | Single stone hairline or remove |

### What already feels human
- Login dual card (specimen + form) with real copy  
- Path mark (three rising steps) as brand glyph  
- Brand artboard as direction sheet (not neon dashboard)  
- Stone light tokens on core path (when indigo not leaking)  
- Copy v1.9 plain language  

---

## Humanization score: **5.5 / 10**

Craft intent is real; residual AI stock (mascot) + indigo leaks + soft glows pull it toward generic product AI.

### Top 3 priorities
1. **Purge indigo/lilac/navy** from all surfaces → stone paper.  
2. **Empty illu + XP + canvas** — kill orbs, rainbow bars, teal bloom; add grain.  
3. **Helper stage** — desk prop lighting, not product-render glow. (Asset reskin later.)

---

## Implement this cycle

- [x] CSS indigo → stone paper (all listed hotspots)  
- [x] XP fills single color  
- [x] Body canvas + optional grain  
- [x] EmptyIllustration de-orb  
- [x] Helper hero matte stage  
- [x] product-card top strip simplify  
