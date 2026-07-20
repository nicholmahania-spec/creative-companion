# Spark / Ideate audit — Creative Companion v1.42.0

Scope: path step **3 · Ideate** (`activeView === 'spark'`), `SparkView.jsx`, spark store, progress rules, Sketch handoff, e2e.  
Not a full product audit — Ideate slice only.

---

## Executive summary

Ideate is **structurally present** (path, A/B/C, sparks, opposite, Sketch chips, process-walk coverage) but **thinner and looser** than Define / Research / Design:

| Area | Grade | Note |
|------|-------|------|
| Process spine presence | **B+** | On path, keyboard 3, ⌘K, Soft Signal seeds |
| Teaching / process tips | **D** | No process-tip checklist (unlike Research/Design/Review) |
| Progress honesty | **C** | Easy to “fill” Ideate with one Opposite click |
| Spark engine | **C+** | Good prompts; `oppositeSpark` index math is inconsistent |
| A/B/C shortlist | **B** | Solid; Choose is exclusive; Sketch queue works |
| i18n | **D** | Hardcoded English in SparkView |
| Empty / still-thin | **C** | Global strip only; no Ideate-local still-thin |
| Tests | **B-** | process-walk hits Opposite + A/B; no unit tests for spark store |
| Redundancy (post-1.42) | **A-** | Gap · G removed; strip owns next gap |

**Verdict:** No ship-blockers for desk v1.x, but Ideate is the **weakest of the 7 process steps** for fidelity vs process guide (5–8 directions, opposites, shortlist → Sketch). Highest ROI: tighten progress rules, fix opposite index, add process tip panel, i18n titles.

---

## 1. Surface map

| Layer | Location | Role |
|-------|----------|------|
| UI | `src/views/SparkView.jsx` (~177 lines, lazy) | Prompts + A/B/C + actions |
| Store | `useAppStore` `sparkIndex`, `currentSpark`, `nextSpark`, `oppositeSpark`, `updateDirection` | Global sparks + project directions |
| Prompts | `sparkPrompts` (10), `oppositeSparks` (5) | Tool prompts, not fake data |
| Progress | `pathStepHasContent('ideate')` | done if sparkIndex>0 **or** quote pin **or** any direction title |
| Focus | `pathGapFocusSelector('ideate')` | `#dir-title-a`, `.spark-actions .btn-primary` |
| Sketch handoff | Sketch panel “Draft options (from Ideate)” | Queue draft tasks from titled directions |
| Coaching | `processGuide` ideate checks | **Not rendered** on Ideate view |
| Demo | Soft Signal directions + custom `currentSpark` | Seeded |

---

## 2. User flow (as implemented)

```
Research → Ideate
  ├─ A/B/C cards: title, note, Choose (exclusive)
  ├─ Prompt card: currentSpark
  │    Another spark → nextSpark (cycles 0..9)
  │    Opposite direction → oppositeSpark
  │    Pin to Research → quote pin + navigate studio
  │    Done — Go to Sketch / header Go to Sketch
  └─ path strip / G if thin
Sketch shows draft chips if any direction has title
```

**Missing vs process guide (`COACHING.ideate`):**
- No on-page checklist (5–8 directions, opposites, not married to first, ★ chosen)
- No “force 5–8” counter of **distinct** directions (only energy proxy)
- Pin useful sparks is optional; pin leaves Ideate (context switch)

---

## 3. Bugs & correctness (ranked)

### P1 — Progress too easy (`pathStepHasContent('ideate')`)

```js
sparkIndex > 0 || quote pin || any direction title
```

- **One** “Opposite direction” or “Another spark” sets `sparkIndex ≥ 1` → Ideate **done** with zero A/B/C content.
- process-walk Opposite-click alone would mark the step full before titles (titles are filled after, but strip can flip early).
- Contradicts fill hint: “Spark, A/B/C, or pin a spark note” — sparkIndex alone isn’t in the hint.

**Recommend:** Require **meaningful** content:

```js
// e.g.
const hasDir = directions.some(d => d.title?.trim())
const hasSparkPin = mood.some(m => m.type === 'quote' || /spark/i.test(m.note||''))
const hasChosen = directions.some(d => d.chosen && d.title?.trim())
return hasDir || hasSparkPin  // drop bare sparkIndex > 0
// optional stricter: hasDir && (sparkIndex > 0 || hasChosen)
```

### P1 — `oppositeSpark` index semantics diverge from `nextSpark`

| Action | sparkIndex | currentSpark |
|--------|------------|--------------|
| `nextSpark` | `(i+1) % sparkPrompts.length` (0–9 wrap) | `sparkPrompts[next]` |
| `oppositeSpark` | `sparkIndex + 1` (**unbounded**) | `oppositeSparks[(i+1) % 5]` |

- Progress UI uses `tried = max(sparkIndex+1, filledDirs)` capped at 8 → after enough Opposites, progress sticks at 8 even if user never filled A/B/C (same P1 as above).
- Unbounded `sparkIndex` pollutes any future logic that assumes modulo.
- Opposite list is **independent** of main list; OK product-wise, but index shared is confusing.

**Recommend:** Separate counters (`sparkIndex` / `oppositeIndex`) or:

```js
oppositeSpark: () => set(s => {
  const oi = ((s.oppositeIndex ?? 0) + 1) % oppositeSparks.length
  return {
    oppositeIndex: oi,
    sparkIndex: Math.min((s.sparkIndex || 0) + 1, sparkPrompts.length), // or only bump “tried” flag
    currentSpark: oppositeSparks[oi],
  }
})
```

### P2 — Direction energy metric is muddy

```js
tried = Math.max(sparkIndex + 1, filledDirs)
progress = min(tried, 8)
```

- Mixing **prompt views** with **shortlist slots** overstates “5–8 directions.”
- Professional process means **distinct directions**, not clicks on Another spark.
- Filled A/B/C maxes at 3 unless user rewrites — never reaches “8” from titles alone without sparks.

**Recommend:** Split UI: `Sparks tried: N` + `Shortlist: F/3` + optional “rich set” when N≥5 && F≥2.

### P2 — Pin to Research jumps view

Leaving Ideate mid-session loses A/B/C fold context (data persists, focus doesn’t). Better: pin in place + micro toast “Pinned · stay on Ideate” with optional “Open Research.”

### P2 — Soft Signal `sparkIndex: 0` with custom spark

Demo has directions filled → Ideate done via titles. Custom `currentSpark` may not be in `sparkPrompts`; `nextSpark` jumps to index 1 of main list (fine). Document that demo spark is one-off.

### P3 — Hardcoded “Ideate” / copy

`SparkView` ignores `pathLabel(locale,'ideate')` and `i18nT` — breaks locale path consistency (path bar localizes; page title does not).

### P3 — No unit tests for nextSpark / oppositeSpark / updateDirection

Only blank workspace checks `directions.length === 3`. Regression risk on index math.

---

## 4. UX / ADHD fidelity

| Expectation (process) | Reality |
|----------------------|---------|
| Messy volume 5–8 | Prompted in copy; energy meter weak signal |
| Force opposites | Button exists; good |
| Shortlist A/B/C | Good cards |
| Pick one to sketch | Choose + Sketch chips; **no auto-queue on Choose** |
| Don’t marry first | Copy only |
| Land on work | Focus to `#dir-title-a` on gap jump — good |

**Friction:** Two “Go to Sketch” buttons (header + footer). Acceptable, slightly redundant.

**Positive:** Exclusive Choose; sketch draft chips show ★; process-walk covers Opposite + A + B + Choose.

---

## 5. Comparison to other steps

| Step | Process tip panel | Local still-thin | i18n title | e2e depth |
|------|-------------------|------------------|------------|-----------|
| Define | kits + detective | no | yes | high |
| Research | **yes** | yes | yes | high |
| **Ideate** | **no** | no | **no** | medium |
| Sketch | empty callouts | yes | yes | high |
| Design | **yes** | no | yes | high |
| Review | **yes** + chips | strip | yes | high |
| Deliver | **yes** + chips | strip | yes | high |

Ideate is the odd step out for **teaching chrome**.

---

## 6. Redundancy (Ideate-local)

Post v1.42 gap collapse: **clean**. Remaining mild:

- Header **Go to Sketch** + footer **Done — Go to Sketch**
- Tools menu “Spark” label vs path “Ideate” (legacy naming in Tools)

---

## 7. Accessibility

| Item | Status |
|------|--------|
| dir title/note labels | sr-only — OK |
| Choose aria-pressed | OK |
| Spark prompt in card | text, not live region — OK |
| Opposite / Another | unlabeled beyond text — OK |
| Focus target after G | `#dir-title-a` first — good |
| Heading “Ideate” | hard EN — a11y OK, i18n not |

---

## 8. Proposed fix waves (if “apply spark audit”)

### S1 — Honesty (P1) — **ship first**
1. Ideate `pathStepHasContent`: drop bare `sparkIndex > 0`; require direction title **or** spark/quote pin.
2. Fix `oppositeSpark` to wrap opposite list without unbounded index (or cap + separate oppositeIndex).
3. Unit tests: nextSpark wrap, oppositeSpark, updateDirection exclusive choose, ideate hasContent matrix.

### S2 — Fidelity UX
1. Render process tip panel for ideate (`getProcessPhase('ideate')`).
2. Split progress: sparks tried vs shortlist F/3.
3. Pin spark: stay on Ideate + toast (optional link Research).
4. i18n page title + primary actions.

### S3 — Sketch bridge
1. “Queue chosen for Sketch” primary when `chosen && title`.
2. Optional: auto-offer draft task on Choose.

### S4 — Tests
1. `sparkStore.test.js` or extend blankWorkspace.
2. e2e: assert Ideate still thin until A/B title; strip after Opposite alone stays thin (if S1).

---

## 9. Metrics (current)

| Signal | Value |
|--------|-------|
| sparkPrompts | 10 |
| oppositeSparks | 5 |
| Direction slots | 3 (A/B/C) |
| SparkView LOC | ~177 |
| Ideate process tip in UI | 0 |
| Unit tests spark-specific | ~0 |
| process-walk Ideate coverage | Opposite + 2 titles + Choose |

---

## 10. Verdict

**Keep Ideate as step 3.** Product intent is clear; implementation is a solid MVP with **progress and index bugs** that make path N/7 **over-optimistic**.

Priority if applying: **S1 honesty + opposite index**, then **S2 tip panel + i18n**.

Ready to implement S1–S2 on request (`apply spark audit` / `next`).
