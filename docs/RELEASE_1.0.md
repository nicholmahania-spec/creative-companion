# Creative Companion 1.0 — readiness & done criteria

**Version:** 1.0.0  
**Date:** 2026-07-19  
**Status:** **Shipped as complete for the design-desk product promise**

---

## Product promise (met)

| Promise | Evidence |
|---------|----------|
| One next design step | Work owns the fold; queue secondary |
| Path Project → Work → Board → System → Pack | Journey bar + e2e path smoke |
| Leave with a brand pack | PDF download + Print/Save as PDF |
| ADHD-friendly presence | Helper Coach/Critique/Break; optional forced breaks |
| Real empty defaults | Blank desk; Soft Signal opt-in only |
| Neutral product chrome | Stone tokens; brand color on artboard |

---

## Quality gates (green at 1.0)

| Gate | Command / check |
|------|-----------------|
| Unit | `npm test` (24+) |
| E2E path + reliability | `npm run test:e2e` |
| axe serious/critical on path | `e2e/axe-path.spec.js` |
| Offline shell | `e2e/offline.spec.js` |
| Perf budget | `npm run test:perf` after build |
| CI | `.github/workflows/ci.yml` |

---

## Explicit non-goals (deferred past 1.0)

These are **not** incomplete 1.0 bugs; they are future product investment:

1. **Vector brand PDF** — current PDF is preview-faithful raster; print CSS is the sharper path  
2. **Multiplayer / team workspaces** — single-user desk (local or optional Supabase)  
3. **Full calendar product** — deadlines only  
4. **Commissioned brand system for the product** — monoline mark is intentional CSS/SVG craft  
5. **Native apps** — PWA shell only  

---

## Settings map (complete)

- Appearance: theme, reduce motion  
- Presence: Helper, quiet mode, sound, force breaks  
- Work: queue collapse, how-it-works, progress XP, **toast detail**  
- Account / data / sample / Helper AI / About  

---

## How to verify a 1.0 install

1. Open app → unlock / onboard  
2. Walk path; star 2 pins; set tagline; Download PDF  
3. Toggle Settings → Toast detail → Show all; star a pin → toast appears  
4. Toggle Quiet; micro toasts stop  
5. (Optional) Deploy with SW; revisit offline  

---

## Changelog summary (0.2.x → 1.0)

Redesign spine, redline P0–P2, craft cleanup, pack quality, desk reliability, e2e/a11y/axe, quiet toasts, offline shell, perf budget, toast preference, Spark lazy split, this readiness doc.

**1.0 means: the desk does what it claims, with tests and honest limits.**
