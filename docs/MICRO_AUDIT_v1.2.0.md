# Micro audit — v1.2.0 (vector PDF redline closed)

**Against:** `docs/REDLINE_v1.2.0.md`  
**Gates:** unit 25/25 · e2e 8/8 · build + perf pass

| Item | Status |
|------|--------|
| Redline written + committed | **Pass** |
| `downloadBrandPackVectorPdf` (text + rects + roles) | **Pass** |
| Download PDF default = vector | **Pass** |
| Raster kept as Preview PDF (more formats) | **Pass** |
| Pack copy honest (vector vs print vs raster) | **Pass** |
| Snapshot includes colorRoles + logoImage | **Pass** |
| HTML kicker “Direction sheet” | **Pass** |
| Unit test vector path | **Pass** |
| Watermark hide on vector | **Pass** |

## Residual (honest)

| Item | Disposition |
|------|-------------|
| Full Google Font embedding in PDF | Park — Helvetica/Times + face labels |
| Pixel-identical to artboard | Not a goal — vector is production handoff |
| Multi-page section break polish | Good enough; long packs get new pages |

## Loop

**Closed.** Brand download is no longer a screenshot of the SPA.

## Verdict

Ship **v1.2.0**.
