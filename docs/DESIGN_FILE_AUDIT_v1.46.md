# Design file audit — Creative Companion v1.46

**Scope:** What counts as a “design file” in this product, how Design (step 5) produces it, fidelity to `DESIGN_GRAMMAR.md`, brand book PDF structure, and ranked gaps.  
**Not in scope:** External Figma files (product intentionally is **not** Figma).

---

## Executive summary

| Layer | What it is | Grade | Top issue |
|-------|------------|-------|-----------|
| **Canonical design file** | Multi-page **vector brand book PDF** (+ HTML/MD/JSON pack) | **B+** | Two visual models (sheet vs 7-page book) |
| **Live design surface** | `BrandArtboard` direction sheet | **B** | Design-step preview is **not editable** |
| **Design step UI** | Accordion edit + sticky preview | **B** | Dense; `conceptPackage` dead |
| **Grammar doc** | `docs/DESIGN_GRAMMAR.md` | **C** | Stale (**v1.11**); one-pager diverges |
| **Starter kits** | `brandKits.js` (4 kits) | **A-** | Solid stone-first seeds |
| **Color system** | Roles cover/text/accent/quiet | **A-** | Matches leave-behind intent |
| **Process fidelity** | Design checklist + version bump | **B+** | Easy “done” via palette alone |

**Verdict:** There is **no external design file** (.fig/.sketch). The product *is* the design file pipeline: **edit on Design → ship brand book PDF on Deliver**. Quality is production-usable; main debt is **doc drift**, **dual sheet models**, and **preview/edit split** on Design.

---

## 1. What is a “design file” here?

| Artifact | Location | Role |
|----------|----------|------|
| **Vector brand book PDF** | `downloadBrandPackVectorPdf` | Primary client handoff (7 pages) |
| **Raster preview PDF** | `downloadBrandPackPdfRaster` | WYSIWYG artboard snapshot |
| **HTML / MD / JSON pack** | `exportFiles.js` | Alternate leave-behind |
| **Direction sheet (DOM)** | `BrandArtboard` | On-screen leave-behind preview |
| **Persisted project brand fields** | Zustand project | Source of truth for all exports |
| **Grammar** | `docs/DESIGN_GRAMMAR.md` | Design system rules for the *desk* UI |
| **One-pager** | `public/one-pager.html` | Marketing/spec sheet (separate visual system) |
| **Soft Signal demo** | `public/demos/` | Seeded brand run |

**No** `.fig` / Sketch / XD in repo. Boundary: *direction leave-behind, not freeform canvas* (stated in BrandArtboard + residuals).

---

## 2. Design step (path 5) map

```
Design view (activeView === 'brand')
├── Header: title, pack pins n/6, designVersion, Bump, → Review
├── Process tip (design checklist)
├── Sticky BrandArtboard (id=system-artboard, editable=false)  ← preview only
└── Accordion Edit
    ├── Tagline (essentials) + brief
    ├── Voice · do / don’t
    ├── Colors (palette editor + roles)
    ├── Type (TYPE_PAIRS)
    ├── Logo (image, wordmark, clearspace)
    └── Pins (leave-behind stars)
```

**Direction kits** seed Design from **Define** (lazy `BrandKitsGrid`), not on Design itself.

---

## 3. Brand pack snapshot (data model)

`buildBrandPackSnapshot` freezes:

- Identity: name, tagline, brief, voice, logo*, designVersion  
- Detective, directions (filled only), feedback, handoff, learnings  
- Type pair, do/don’t, palette, colorRoles  
- ★ pins (max 6, hero order)  
- Task progress counts  

**Readiness** (`packReadiness`): detective, tagline, palette, pins, voice, brief, handoff, learnings. Thin if **coreOk < 3**.

---

## 4. PDF / leave-behind structure (the design file)

### 4.1 Vector brand book (~7 pages)

Documented promise: cover, voice/positioning, color, type, logo lockups, usage, mood.

| Page theme | Content drivers |
|------------|-----------------|
| Cover | name, tagline, cover role, logo, version, date |
| Positioning / voice | brief, voice, detective cues |
| Color system | roles + hex swatches |
| Type | heading/body labels → jsPDF built-in fonts |
| Logo lockups | wordmark + image + clearspace notes |
| Usage | do / don’t |
| Mood | starred pins only |

**Strengths:** selectable text, role-first color, watermark toggle, File System Access + fallbacks.  
**Limits:** custom type pairs map to **Helvetica/Times-ish** in vector PDF (not real webfonts); pin images optional/heavy path.

### 4.2 Direction sheet (DOM / raster)

`BrandArtboard` single long sheet: cover band → positioning → voice → palette roles → type → do/don’t → pins → watermark.

Used for: Design sticky preview, Review preview, Deliver preview, print, raster PDF.

### 4.3 Dual-model risk (P1)

| Model | When |
|-------|------|
| **Sheet** | On-screen + raster PDF + print |
| **7-page book** | Primary “Download brand book PDF” |

Users can expect the download to match the sticky preview **page-for-page** — it does not. Product copy is mostly honest (“multi-page brand book”), but Design sticky is still a **single sheet**.

**Recommend:** One sentence under Design artboard: *“Preview is the direction sheet. Download is a multi-page brand book.”*

---

## 5. Design grammar fidelity

`DESIGN_GRAMMAR.md` (last labeled **v1.11**):

| Rule | Live product (v1.46) | Match |
|------|----------------------|-------|
| 7-step path | Yes | ✓ |
| Stone canvas, no indigo chrome | Yes | ✓ |
| Brand color on pack only | Mostly | ✓ |
| Plus Jakarta UI | Yes | ✓ |
| Fraunces pack titles | Leave-behind CSS | Partial (PDF uses built-in fonts) |
| No floating orbs | EmptyIllustration | ✓ |
| Helper paper stage | BuddyMate | ✓ |
| One primary CTA / fold | Mostly | ✓ |

**Drift:**

1. Grammar not updated since path/spark/humanize waves.  
2. `public/one-pager.html` uses **DM Sans + Instrument Serif** and a different palette — contradicts “never reintroduce purple-era Instrument Serif as global UI” spirit for marketing asset.  
3. Desk labels still mix “System” class names (`system-view`, `system-artboard`) with path **Design**.

---

## 6. Progress honesty (Design step)

`pathStepHasContent('design')`:

```
tagline OR palette.length ≥ 2 OR designVersion ≠ 'v1'
```

| Issue | Severity |
|-------|----------|
| Default project already has **4-color palette** → Design is **done at project birth** | **P1** |
| Version bump alone marks Design done without craft | **P2** |
| No requirement for type pair or logo | P2 (OK for thin leave-behind) |

**Recommend (honesty):** Require **tagline** *or* (palette roles touched / voice) *or* (version ≠ v1 **and** tagline/voice). Or: default palette does not count until user edits palette or applies a kit.

---

## 7. BrandArtboard edit split (P1 UX)

On Design, artboard is **`editable={false}`**. All edits via accordion; artboard is live **preview** only (roles not assignable on preview swatches).

| Pros | Cons |
|------|------|
| Avoids dual edit surfaces | Role assignment UI only in Colors section / export modal editable modes |
| Clear “edit vs preview” | Feels less like designing *on* the sheet |
| | Export overlay may still use editable artboard paths inconsistently |

**Recommend:** Either enable limited editable artboard on Design (tagline/roles) *or* label sticky region **“Live leave-behind preview (edit below)”**.

---

## 8. Dead / dual systems

| System | Status |
|--------|--------|
| `conceptPackage` on project | **Dead UI** (comment: pipeline removed); still in snapshot/export |
| `logoDirection` field | Seeded by kits? kits don’t set it; conceptPackage did |
| Direction kits | Live on Define only |
| Soft Signal workspace | Full design-file seed (good demo) |

---

## 9. Accessibility & i18n (Design)

| Item | Status |
|------|--------|
| Accordion tabs | role=tablist — OK |
| Artboard region | aria-label — OK |
| Section labels | Mostly EN hard-coded (Tagline, Voice, Colors…) | P2 |
| Design version | labeled | OK |
| WCAG contrast helper | exists in Design colors | OK |

---

## 10. Tests covering design files

| Test | Coverage |
|------|----------|
| `e2e/brand-book-pdf.spec.js` | Download wiring, gap, G |
| `e2e/process-walk` | Version bump on Design |
| `exportFiles.test.js` | Snapshot / readiness / markdown |
| `brandKits.test.js` | Kit lookup |
| `color` | roles/contrast (via usage) |

**Gaps:** no e2e that opens Design accordion and asserts artboard text updates; no unit for “default palette ≠ design done” if honesty fixed.

---

## 11. Ranked findings

| Sev | Finding |
|-----|---------|
| **P1** | Design step “done” by **default palette** at project create |
| **P1** | Dual leave-behind models (sheet preview vs 7-page vector) under-explained |
| **P1** | Sticky artboard non-editable without clear “preview only” copy |
| **P2** | `DESIGN_GRAMMAR.md` stale (v1.11); one-pager font/palette drift |
| **P2** | Vector PDF fonts ≠ project type pair webfonts |
| **P2** | `conceptPackage` dead weight in model/export |
| **P3** | Accordion labels not i18n |
| **P3** | `system-*` class naming vs path “Design” |

---

## 12. What is solid (keep)

- Product boundary: leave-behind, not Figma  
- Stone + growth palette discipline on desk  
- Role-based color (cover/text/accent/quiet)  
- Version bump before Review CTA  
- Pack readiness deep-links to Design sections  
- Lazy BrandArtboard + lazy kits (perf)  
- Soft Signal as complete design-file demo  

---

## 13. Proposed apply waves

### D1 — Honesty (P1)
1. Design hasContent: ignore stock default palette unless mutated / kit applied / roles set.  
2. Unit test: blank project Design not done until craft signal.

### D2 — Preview clarity (P1)
1. Caption under sticky artboard: sheet preview vs multi-page download.  
2. Optional: `editable` tagline/roles on Design artboard *or* keep false + stronger label.

### D3 — Grammar refresh (P2)
1. Bump `DESIGN_GRAMMAR.md` to v1.46 process language.  
2. Align one-pager fonts to Plus Jakarta / Fraunces or mark “marketing only.”

### D4 — Model hygiene (P2)
1. Deprecate or hide empty `conceptPackage` from export if unused.  
2. Document vector PDF font mapping limits in Deliver hint.

---

## 14. Metrics

| Metric | Value |
|--------|-------|
| BrandArtboard LOC | ~387 |
| exportFiles LOC | ~1880 |
| Brand kits | 4 |
| Design accordion sections | 6 |
| Vector PDF page themes | ~7 |
| External design tool files in repo | **0** |

---

## 15. Verdict

**Design file = brand leave-behind pipeline.** Implementation is real and shippable. Highest-value fixes: **progress honesty** (default palette), **preview vs multi-page honesty**, and **grammar/one-pager alignment**.

Ready to implement **D1–D3** on request (`apply design file audit`).
