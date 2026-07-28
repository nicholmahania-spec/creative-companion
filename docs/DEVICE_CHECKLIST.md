# Real-device & perf gate (PR8)

Run after path/spine changes. Not automated CI — about 10 minutes.

## Devices

| Device | Checks |
|--------|--------|
| **Desktop** (Chrome/Safari, 1440×900) | Path 1–5; Work step above fold; Board upload; System artboard left; Pack PDF |
| **Desktop deep theme** | Toggle dark; path active, CTAs, Board notes, Pack preview readable |
| **Phone** (Safari iOS preferred) | Nav drawer inert when closed; Work complete; Board pin note; System artboard first; Pack download |

## Path smoke (spine)

1. New project → fill Project brief (required core)  
2. Work: Complete one step  
3. Board: upload image, star with why  
4. System: tagline  
5. Pack: thin warning if empty, then download PDF  

## Perf notes

- Lazy path views + CSS split already ship; main CSS ~151KB.  
- Idle prefetch warms Define/Sketch/Research/Design/Deliver after unlock.  
- Suspense uses `PathViewSkeleton`.  
- Optional: Lighthouse on production URL — LCP &lt; 2.5s aspirational, not a hard fail.  
- Helper live requires Vercel `XAI_*` secrets (see `docs/DEPLOY_AI.md`).

## Board links

Client rejects localhost/private IPs before `link-preview` (`src/lib/safeBoardUrl.js`). Server function should still fail closed.
