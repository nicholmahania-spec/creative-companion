# Creative Companion — Redesign Brief (v1)

**Scope:** Information architecture + above-the-fold structure for **Work · Brand · Finish** only.  
**Not in scope:** New features, AI expansion, gamification redesign, mobile polish pass, rebrand illustration.  
**Goal:** One desk. One step on screen. One board for direction. One system sheet. One pack.

---

## 1. Product thesis (one sentence)

**A body-double desk where a designer does one shippable step, builds a direction board, freezes a brand system, and leaves with a client-ready pack.**

Everything that does not serve that sentence loses chrome weight or exits the primary path.

---

## 2. Naming lock (glossary)

| Old (kill or hide) | New (user-facing) | Role |
|--------------------|-------------------|------|
| flow / desk loop | **Work** | One current step |
| studio / picture board / mood | **Board** | Refs + images that feed the pack |
| concept / Ideas pipeline | **Direction** *(optional secondary)* | Sketches → lock; or fold into Board later |
| insights | **Timer** | Focus container for current step |
| Extra / Need help? | **Tools** | Single overflow |
| buddy / body double | **Helper** | Coach presence (corner only) |
| GameHUD / XP primary | **Progress** *(Settings or collapsed chip)* | Never primary chrome |
| journey guide strip | *(delete)* | Journey dots are enough |
| brand-section 01–06 essay | **System** sections | Short labels only |

**Primary path labels (5 max):**

```
Project → Work → Board → System → Pack
```

Map to existing routes for implementation without a rewrite:

| Path label | Current view id | Notes |
|------------|-----------------|--------|
| Project | `project` | Name, brief, deadline |
| Work | `flow` | Current step only |
| Board | `studio` | Was buried; **promote to path** |
| System | `brand` | Brand identity artboard |
| Pack | `finish` | Preview + download |

**Tools menu (not on path):** Timer, Spark, Calendar, Break down steps, Helper on/off, New project, Settings.

---

## 3. IA map

```
                    ┌─────────────┐
                    │   Login     │
                    │  Open desk  │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │  PATH (always visible)  │
              │  Project Work Board     │
              │  System Pack            │
              └────────────┬────────────┘
                           │
     ┌───────────┬─────────┼─────────┬──────────┐
     ▼           ▼         ▼         ▼          ▼
 Project       Work      Board     System      Pack
 name/brief    ONE       pins +    live        preview
 deadline      STEP      curate    artboard    + PDF
               complete  for pack  = export
               capture
                           │
                    ┌──────▼──────┐
                    │    TOOLS    │
                    │ Timer Spark │
                    │ Calendar    │
                    │ Breakdown   │
                    │ Helper      │
                    │ Settings    │
                    └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   HELPER    │
                    │ corner only │
                    │ Coach /     │
                    │ Critique /  │
                    │ Break       │
                    └─────────────┘
```

**Rules:**

1. Path never includes Timer, Spark, Calendar, Settings.
2. No second “stuck” nav that re-lists Tools on Work.
3. Helper is not a page; it is presence + 3 verbs.
4. Progress/XP is not a path sibling; chip or Settings only.
5. Ideas/Concept pipeline: **v1 path ignores it** or merges “upload sketch” into Board. Do not put two brand editors on the path.

---

## 4. Global chrome (redline wire)

```
┌──────────────────────────────────────────────────────────────┐
│ [Mark] Companion          [Project ▾]     [Tools ▾] [You ▾] │
│                                                           │
│  ○ Project  ● Work  ○ Board  ○ System  ○ Pack              │
└──────────────────────────────────────────────────────────────┘
```

| Element | Rule |
|---------|------|
| Logo sub-pitch | **Delete** from header |
| GameHUD bar | **Remove** from default; optional chip in Tools or Settings |
| Journey guide (“You are on step… Go to Ideas”) | **Delete** |
| “Extra” / “Need help?” | Merge → **Tools** |
| Helper badge in header | **Delete**; FAB is enough |
| Path dots | Show state by **visit + pack readiness**, not fake “done by index” |

**Header height budget:** one row brand/actions + one row path. Max ~112px desktop before main content.

---

## 5. Above-the-fold: Work

### Job
Only the **current step** owns attention. Capture and complete are the only primary actions.

### Wire (viewport ~ first 700px)

```
┌─────────────────────────────────────────────────────────────┐
│ WORK                                              2/8 done  │
│ Soft Signal Studio · due Aug 9                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   CURRENT STEP                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Lock type pair for episode covers                  │   │
│   │  low energy · micro                                     │   │
│   │                                                         │   │
│   │  [ Complete step ]     [ Split if too big ]             │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   + Capture next …………………………… [Add]                    │
│                                                             │
│   Queue (5) ▸   Done (2) ▸                                  │
└─────────────────────────────────────────────────────────────┘

  (below fold / Tools only)
  Process mode, How this works, deadline deep links, etc.
```

### Must / Must not

| Must | Must not |
|------|----------|
| Step title largest type on page | Process rail permanent furniture |
| Complete is primary button | “Go to Board/System” primary CTA above step |
| Empty step → inline Capture as hero | How-it-works card above step after first session |
| One project context line | Full project pill strip if only one project |

### Interaction notes

- **Split if too big** → opens breakdown (existing wizard); only show when queue heavy or user taps.
- Process Clarify→Refine: **optional mode** under step (“Design mode ▸”) that reveals checklist for current step only — not a second page header.
- XP toast: silent save default; celebration rare (level-up only) in a later pass.

---

## 6. Above-the-fold: System (Brand)

### Job
A **live artboard** that *is* the pack. Forms edit the artboard; they are not the page.

### Wire

```
┌─────────────────────────────────────────────────────────────┐
│ SYSTEM                          [Board]  [Download pack]    │
│ Soft Signal Studio · pack 60%                               │
├─────────────────────────────────────────────────────────────┤
│  ARTBOARD (export source of truth)                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ████ cover (role: brand primary, not palette[0] only) │  │
│  │  Brand identity                                       │  │
│  │  Soft Signal Studio                                   │  │
│  │  “Your voice, at your pace.”                          │  │
│  │  [■][■][■][■]  palette roles strip                    │  │
│  │  Display · Body                                       │  │
│  │  Do / Don’t (two columns)                             │  │
│  │  Mood: [pin][pin][pin][pin]  ← curated pack pins only │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Edit ▸ Tagline  Voice  Colors  Type  Logo  Pins            │
│  (one open section at a time — accordion, not 6 panels)     │
└─────────────────────────────────────────────────────────────┘
```

### Must / Must not

| Must | Must not |
|------|----------|
| Artboard matches Pack PDF 1:1 | Long scroll of 01–06 panels before any preview |
| Color **roles** (bg / text / accent / quiet) | Unordered hex list as identity |
| Pack pins = explicit include (max 6) | Silent “first 8 mood items” |
| Type specimen preview | Font name as plain text only with no preview |
| Single source of truth for voice/do/don’t | Duplicate fields from Ideas package on the path |

### Color role default

When user has 4 swatches: map by luminance + user override — never assume `palette[0]` is cover-safe.

---

## 7. Above-the-fold: Pack (Finish)

### Job
**See the pack. Download it.** Rest is secondary.

### Wire

```
┌─────────────────────────────────────────────────────────────┐
│ PACK                                                        │
│ Soft Signal Studio                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  Ready                        │
│  │                          │  Tagline ✓  Palette ✓         │
│  │   [ same artboard mini ] │  Pins 4    Steps 6/10         │
│  │                          │                               │
│  │                          │  [ Download pack ]  ← primary │
│  │                          │  Preview full                 │
│  └──────────────────────────┘                               │
│                                                             │
│  ⚠ Thin pack: no pins yet — [Add from Board]                │
│                                                             │
│  More formats ▸     Work one more step · Edit system        │
└─────────────────────────────────────────────────────────────┘
```

### Must / Must not

| Must | Must not |
|------|----------|
| Thumbnail = export preview | Essay above the fold |
| One primary download (PDF) | 8 equal buttons |
| Thin-pack warning if empty identity | Ship empty with zero friction copy |
| Formats under disclosure | Backup as peer to brand pack |

---

## 8. Board (path step — AOF only)

*Included because path promotion is required for Mood direction to exist.*

```
┌─────────────────────────────────────────────────────────────┐
│ BOARD                         [Upload images]               │
│ Pins feed System + Pack · star up to 6 for pack             │
├─────────────────────────────────────────────────────────────┤
│  [ big drop / upload zone ]                                 │
│  grid of pins · ★ = in pack                                 │
└─────────────────────────────────────────────────────────────┘
```

No third media system. Concept sketches can wait or land as pins with type `sketch`.

---

## 9. Helper (constraint, not a page)

**Three verbs only:**

1. **Coach** — next move for current step  
2. **Critique** — risks for current step  
3. **Break** — log break / open kit  

Wellness detail, process essays, full review, XP lines → behind a single “More” or Settings.  
Default: minimized FAB; auto-minimize after system pings.

---

## 10. Visual system constraints (for UI pass)

| Token | Direction |
|-------|-----------|
| Type | UI: one sans. Artboard may show user type names as specimen; chrome never competes with pack cover. |
| Color | App chrome: neutral gray + one ink. **Accent reserved for primary actions.** User brand colors appear only on artboard/pack — not on nav. |
| Radius | Artboard 12–16; chrome slightly tighter so pack feels special. |
| Density | Prefer empty field over third helper paragraph. |
| Motion | Respect reduce-motion; no idle wiggle on primary path. |

---

## 11. Success criteria

**IA / UX**

- [ ] New user can name project → complete one step → upload one image → set tagline → download PDF without opening Tools.
- [ ] Work first screen: current step is fully visible without scrolling on 13" laptop (1440×900, browser chrome on).
- [ ] No XP bar in default header.
- [ ] Path has exactly 5 items; Board is one of them.
- [ ] Pack PDF matches System artboard (already direction of travel).

**Design**

- [ ] App chrome does not use the same indigo field as a default client cover in a way that confuses “product” vs “brand.”
- [ ] Empty pack warns before download.
- [ ] Settings has no raw storage keys in default view.

**Non-goals for this brief**

- Redesign Soft Signal demo content  
- Rebuild Helper character art  
- Server-side AI proxy  
- Native mobile app  

---

## 12. Implementation order (when building)

1. **Chrome cut** — remove journey guide + GameHUD default; Extra → Tools; kill header manifesto.  
2. **Path remap** — Board into journey; Ideas off-path or merged later.  
3. **Work AOF** — reorder DOM/CSS so step card is first; demote process/how-it-works.  
4. **System artboard-first** — sticky/live sheet on top; accordion editors.  
5. **Pack** — preview thumb + one CTA + thin warning.  
6. **Pack pins** — star/include on Board → System/Pack only those pins.

Estimate: **one focused PR per step**; do not mix with new features.

---

## 13. One-line for the team

> **Stop selling the carnival in the header. Put the step, the board, the system sheet, and the pack on a five-stop path — and make the pack look more expensive than the app chrome.**

---

*Brief status: approved for implementation when ready. Source critique: professional redline session (login → settings).*
