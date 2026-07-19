# Creative Companion — Brand-art / Vector PDF Redline  
**As of v1.1.1**  
**Reviewer stance:** Senior brand designer + production design systems  
**Scope:** Leave-behind artifact only (not full app UX)  
**Date:** 2026-07-19

---

## Executive verdict

Print path is the honest sharp path. **Download PDF is still a photograph of UI** (html2canvas → JPEG → jsPDF). That fails brand credibility: type is not type, swatches are pixels, pins blur, file size is large, clients zoom into mush.

**Ship bar:** Download PDF must be a **vector document** (text + rectangles as PDF primitives). Pin photos may remain raster embeds. Preview-match raster stays optional under “More formats.”

| Lens | Score | Note |
|------|------:|------|
| Print CSS handoff | **7.0** | Good enough for Save as PDF |
| Download PDF craft | **3.0** | Raster snapshot of SPA chrome |
| Artboard as designed plate | **5.0** | Better hierarchy; still UI form |
| Spec honesty | **6.0** | Labels say raster — honest but not proud |

---

## Critical defects

| # | Issue | Sev |
|---|-------|-----|
| 1 | **PDF is bitmap** — not selectable text, not true vectors | Critical |
| 2 | **Cover / roles not first-class in snapshot** for export engine | High |
| 3 | **Logo image** only via DOM capture | High |
| 4 | **Pin images** need embed path without full-sheet raster | High |
| 5 | **Multi-page** must break on sections, not slice a bitmap mid-glyph | High |
| 6 | **HTML export kicker** still “Brand identity template” | Med |
| 7 | **Type pairs** map poorly into PDF (no embedded webfonts) — use Helvetica/Times mapping + print labels of real faces | Med |

---

## Implementation plan (this cycle)

### Vector Download PDF (`downloadBrandPackVectorPdf`)
1. jsPDF letter, 48pt margins  
2. Cover band: fill from `mapPaletteRoles` / `colorRoles`  
3. Project name + tagline as **text**  
4. Sections: Positioning, Voice, Palette (rects + hex text), Typography (labels), Logo direction, Do/Don’t, Mood pins (note + optional image data URL embed)  
5. Page break helper when y exceeds content bottom  
6. Optional hide watermark  
7. Wire Pack **Download PDF** to vector by default  
8. Keep raster capture as **Download preview PDF** under More formats  

### Brand art
9. HTML export kicker → “Direction sheet”  
10. Print CSS already improved — ensure vector path matches roles  

### Tests
11. Unit: vector PDF returns PDF magic bytes / non-empty blob  
12. E2E: Download button still present (label may include Vector)

---

## Non-goals this cycle

- Full font embedding of Google Fonts in PDF  
- Pixel-identical match to on-screen artboard  
- InDesign-level grid systems  

---

## Ship bar for audit close

Download produces text-selectable PDF; Print remains client-recommended; tests green.

*End redline v1.2.0*
