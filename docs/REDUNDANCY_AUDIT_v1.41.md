# Redundancy audit — Creative Companion v1.41.0

Date: post–v1.41 (path pill → gap strip → still-thin → i18n waves).  
Scope: process progress UX, shared libs, copy, and structural duplication.  
Not a residual bug list — intentional product boundary (not Figma) is out of scope.

---

## Executive summary

Process “fix next gap” discoverability was layered wave-by-wave (v1.35–v1.41). That worked, but the desk now has **too many same-action surfaces** and **two parallel process catalogs**. Highest ROI: collapse gap CTAs to a **single chrome system** (path pill + strip), keep Review/Deliver panel as deep progress only, delete per-step Gap · G chrome, and unify fill-hint + path-progress context builders.

| Rank | Theme | Severity | Effort |
|------|--------|----------|--------|
| 1 | “Fix next gap” CTA explosion (G / pill / strip / step headers / palette / panel) | **P0 UX noise** | M |
| 2 | Dual “Still thin” (strip + PathProgressPanel) | **P1 UX** | S |
| 3 | Dual fill hints (`pathStepFillHint` + `fillHint` i18n) | **P1 code** | S |
| 4 | Review/Deliver identical PathProgress IIFEs | **P1 code** | S |
| 5 | `goToNextProcessGap` rebuilds ctx vs `pathProgressCtx` | **P1 correctness risk** | S |
| 6 | `JOURNEY_STEPS` ≈ `PROCESS_PHASES` (two 7-step sources) | **P2 arch** | L |
| 7 | Helper tips repeat “Path N/7 or G” every view | **P2 copy** | S |
| 8 | Keyboard / shortcuts re-document same three controls | **P2 chrome** | S |
| 9 | Leave-behind / brand book / pack wording variants | **P2 copy** | M |
| 10 | `App.jsx` monolith (~6.6k lines) hosts all of the above | **P2 maintainability** | L |

---

## 1. Fix-next-gap action surface (P0)

### What exists (same intent: earliest empty step + focus)

| Surface | Where | Action |
|---------|--------|--------|
| **G** key | Global (not in inputs) | `goToNextProcessGap` |
| **⌘K** “Fix next process gap (N/7)” | Command palette | same |
| **N/7 pill** | Path bar | same |
| **Gap strip** “Next gap · {label} · G” | Under path (journey only) | same |
| **Still-thin step links** | Gap strip | `goToProcessStep` (any missing step) |
| **Gap · G** buttons | Define, Research, Ideate, Sketch, Design, Review headers | same as G |
| **Fix next gap · G** | Define primary row | same |
| **PathProgressPanel** “Fix next gap · {label}” | Review + Deliver | same via `onFixNextGap` |
| Empty Research **Gap · G** text-link | Board empty state | same |
| Shortcuts sheet + Tools chip + Helper tips | Discoverability | document the same |

**Count:** ~10+ interactive entry points for one mental action.

### ADHD impact

Multiple equal CTAs raise **choice cost** and visual noise. The product already has a strong hierarchy candidate:

1. **Always visible chrome:** path pill (count) + gap strip (next + still thin)  
2. **Keyboard power users:** G + ⌘K  
3. **Deep check:** PathProgressPanel on Review/Deliver only  

Per-step **Gap · G** headers largely **duplicate the strip**.

### Recommended consolidate (target)

| Keep | Demote / remove |
|------|------------------|
| Path N/7 pill | Per-step header **Gap · G** (all steps) |
| Gap strip next-gap + still-thin links | Define dual “Fix next gap · G” if strip is present |
| G + ⌘K | Research empty inline Gap · G (point to strip only) |
| PathProgressPanel on Review/Deliver (chips + still thin list; **one** fix CTA or none if strip visible) | Second Fix button if strip already shows next gap |

---

## 2. Dual “Still thin” (P1)

| Location | Form | Interactive? |
|----------|------|----------------|
| Gap strip | First 3 missing + `+N` | Yes (buttons) |
| PathProgressPanel | Full missing join | No (text only) |
| Research empty | “Still thin · Research — {hint}” | Partial (Gap link) |
| Sketch empty | “Still thin · Sketch — {hint}” | No |

**Recommend:** Strip = always-on still thin. Panel = process chips only (or single line “See path strip”) when journey chrome is visible. Keep **step-local** empty callouts (Research/Sketch) as fill coaching, not a second still-thin inventory.

---

## 3. Dual fill-hint systems (P1 code)

| API | File | Used by |
|-----|------|---------|
| `pathStepFillHint(stepId)` | `journeyProgress.js` | Unit tests only (UI moved to i18n) |
| `pathFillHint(locale, id)` + `fillHint.*` | `i18n.js` | App strip + empty states |

**English strings duplicated** (same meaning, two sources of truth).

**Recommend:** One source — either:

- `pathStepFillHint` as EN default; `pathFillHint` wraps `t()` with fallback to it, **or**  
- Drop `pathStepFillHint`; tests call `pathFillHint('en', id)` only.

---

## 4. Duplicate PathProgressPanel wiring (P1 code)

Review and Deliver each use a near-identical IIFE:

```text
ctx = { project, moodItems, tasks, sparkIndex, palette }
rows = pathProgressSummary(...)
missing = pathMissingLabels(...)
nextGap = pathFirstGap(...)
<PathProgressPanel … onOpenStep={setActiveView + focus} onFixNextGap={goToNextProcessGap} />
```

Meanwhile App already has **`pathProgressCtx`**, **`pathDoneCount`**, **`pathNextGap`**, **`pathMissingRows`**.

**Recommend:**

```jsx
const pathRows = useMemo(
  () => pathProgressSummary(JOURNEY_STEPS, pathProgressCtx),
  [pathProgressCtx]
)
// pass pathRows / pathMissingLabels from pathMissingRows / pathNextGap
// onOpenStep={goToProcessStep}  // unify with still-thin links
```

Delete both IIFEs; one helper component or props from shared memos.

---

## 5. `goToNextProcessGap` rebuilds scope (P1 risk)

| Path | Mood/tasks filter |
|------|-------------------|
| `pathProgressCtx` | deskMood / deskTasks (project-scoped) |
| `goToNextProcessGap` | Re-filters from store by `currentProjectId` |

Same intent, two implementations → drift risk (e.g. future field on ctx not applied to gap jump).

**Recommend:** `goToNextProcessGap` uses `pathFirstGap(JOURNEY_STEPS, pathProgressCtx)` (or getState + shared `buildPathCtx(st)` helper used by both).

Also: `goToNextProcessGap` and `goToProcessStep` both do setView + flash + focus; next-gap can be:

```js
const gap = pathFirstGap(...)
if (gap) return goToProcessStep(gap)
// else ship toast + Deliver
```

(with micro toast key still “next gap” vs “open”).

---

## 6. Two process catalogs (P2 architecture)

| Module | Role | Overlap |
|--------|------|---------|
| `journey.js` `JOURNEY_STEPS` | Path nav, keys 1–7, labels, nextView | id, view, label, plain |
| `processGuide.js` `PROCESS_PHASES` | Coaching checks, prompts, phase labels | same ids/views |

Views match 1:1. Labels/plain/prompts are parallel prose systems.

**Recommend (long-term):** Single `PROCESS_STEPS` with `{ id, view, num, label, plain, prompt, checks, nextView }`; journey + guide become views on one table. Medium risk, high cleanup.

---

## 7. Helper + shortcuts copy (P2)

Buddy `activityTip` appends **“Path N/7 or G”** on nearly every path view (Define through Deliver). Once the strip is always visible, tips should coach **content** (pin, A/B/C, tagline), not re-advertise chrome.

Shortcuts sheet lists:

- G fix next gap  
- Path N/7 pill · same as G  
- Gap strip · Next gap  

= three lines for one action family. Collapse to: **“G / path N/7 / strip → next empty step.”**

Tools chip: `C · N · G · path N/7 · 1–7 · ?` — already dense; after header Gap removal, chip can stay as keyboard legend only.

---

## 8. Leave-behind vocabulary (P2)

Parallel terms for the same artifact:

- Leave-behind  
- Brand book PDF  
- Pack / pack preview / in pack  
- ★ Leave-behind  

Mostly intentional (UI honesty after residuals). Residual redundancy is **thin-pack** copy in i18n + banners + readiness lists. Low urgency; one glossary in Settings About is enough.

---

## 9. Structural (P2)

- **`App.jsx` ~6680 lines** owns gap strip, all step views, export, auth, timer, etc.  
- Process progress logic should live in `lib/journeyProgress` + small components (`JourneyGapStrip`, `PathProgressPanel` only).  
- Not a product bug; slows audits and invites more layering.

---

## What is *not* redundant (keep)

| Feature | Why keep |
|---------|----------|
| Path step **is-done** styling | Different from gap jump |
| Process tip panels (Research/Design/Review checks) | Teaching content, not nav |
| G key | Power-user; zero chrome cost |
| ⌘K gap action | Discoverable when strip scrolled away |
| Soft Signal / demo path | Content seed, not chrome |
| PathProgressPanel chips | Full map useful at Review/Deliver before PDF |

---

## Proposed cleanup waves (if “next” = de-dupe)

### Wave D1 — Chrome collapse (highest UX win)
1. Remove per-step **Gap · G** headers (keep Define primary row *or* neither if strip always on).  
2. PathProgressPanel: drop Fix next gap button when `journeyActive` (strip owns it); keep chips + still thin text.  
3. Research empty: remove nested Gap · G link; keep fill hint only.  
4. e2e: assert strip + G + palette, not per-step Gap · G.

### Wave D2 — One progress context
1. `buildPathProgressCtx(storeState)` shared.  
2. `pathRows` / missing / nextGap from one useMemo chain.  
3. Review/Deliver panels consume shared props.  
4. `goToNextProcessGap` → `goToProcessStep(pathNextGap)`.

### Wave D3 — One fill-hint source
1. Delete or thin-wrap `pathStepFillHint`.  
2. Tests via `pathFillHint('en', …)`.

### Wave D4 — Process catalog merge (optional later)
1. Merge journey + processGuide tables.  
2. Buddy tips drop “Path N/7 or G” spam; one tip mentions strip once.

---

## Metrics (before cleanup)

| Signal | Approx |
|--------|--------|
| Gap-related UI strings / handlers in `App.jsx` | 30+ |
| Interactive “same as G” buttons (full path walk) | 8–10 visible depending on view |
| Still thin UIs on Review when thin | **3** (strip + panel + maybe chip state) |
| Fill-hint string tables | **2** (EN × 2 sources) |
| PathProgress IIFEs | **2** identical |

---

## Verdict

No open **functional** P0 bugs from redundancy, but **UX redundancy is real**: the last six minors optimized for discoverability of “fix next gap” and over-served that action.  

**Recommended product stance:** one chrome system (pill + strip + G), one deep panel (Review/Deliver chips), one fill-hint source, one path ctx builder.  

Ready to implement **Wave D1–D2** on request (`next` de-dupe / “apply redundancy audit”).
