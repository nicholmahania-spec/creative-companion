# Prompt audit — Creative Companion v1.43.0

Scope: every **prompt-like** system that coaches or drives creative work — Ideate sparks, Helper live system prompt, scripted buddy, process-guide coaching, path plains.  
Not: UI chrome strings (Still thin, buttons) except where they double as process coaching.

---

## Executive summary

| Corpus | Role | Grade | Top issue |
|--------|------|-------|-----------|
| `sparkPrompts` (10) | Ideate tool prompts | **B+** | Overlaps Opposite button; cover-biased |
| `oppositeSparks` (5) | Force-opposites | **A-** | Good format; short list |
| Helper `SYSTEM_PROMPT` | Live LLM persona | **A-** | Solid 7-step; not wired to buddy file prompt |
| `DESIGN_SYSTEM_PROMPT` | Documented buddy identity | **D** | **Stale 4-step** (Clarify→…→Refine) |
| `processGuide` COACHING | On-step tip panels | **B** | Good; parallel to journey plain |
| `designProcessTip` / `activityTip` | Scripted coach | **B** | Duplicates processGuide voice |
| `intentUserPrompt` jobs | Live user messages | **B+** | Aligned 7-step; aliases OK |
| Soft Signal custom spark | Demo one-off | **B** | Not in main list (intentional) |

**Verdict:** Craft quality of spark prompts is **good**. The real P0/P1 is **persona drift** — three “system identities” (Helper live, DESIGN_SYSTEM_PROMPT, process spine) disagree on process shape. Secondary: **opposite redundancy** (main list already has 2× “Opposite day”) and **cover/brand bias** over broader UI/UX.

---

## 1. Corpus map

```
Ideate UI
  sparkPrompts[] ── nextSpark ──► currentSpark card
  oppositeSparks[] ── oppositeSpark ──► currentSpark card
  processGuide.ideate.prompt ──► tip panel

Helper (BuddyMate)
  helperAi.SYSTEM_PROMPT ──► live xAI (7-step desk)
  buddy.DESIGN_SYSTEM_PROMPT ──► docs only? (4-step legacy)
  buddy.activityTip / designProcessTip / coachOnTask ──► scripted
  helperAi.intentUserPrompt ──► live user payload

Path chrome
  journey.JOURNEY_STEPS[].plain
  i18n pathPlain.*
  processGuide COACHING plain/prompt/checks
```

---

## 2. Ideate spark prompts (detailed)

### 2.1 Inventory — `sparkPrompts`

| # | Prompt (abbrev) | Craft move | Bias |
|---|-----------------|------------|------|
| 0 | Mark · one color · sticker size · human | Constraints + mark | Brand/mark |
| 1 | Feeling the cover must land | Emotion + cover | Cover/brand |
| 2 | Visual system · quiet attention | System + ADHD values | Product voice ✓ |
| 3 | Understand in three seconds | Hierarchy | Universal ✓ |
| 4 | Strip decorative layer | Hierarchy/edit | Universal ✓ |
| 5 | Opposite day bold/loud → quiet twin | Opposite | **Dup with button** |
| 6 | Opposite day soft/editorial → product | Opposite | **Dup with button** |
| 7 | Three directions · six words · no adj | Volume/shortlist | Ideate core ✓ |
| 8 | One ink · one font | Hard constraints | Print/brand |
| 9 | Steal one rule · rewrite for audience | Appropriation + audience | Universal ✓ |

**Stats:** 10 prompts · 54–87 chars · ~8–15 words · avg ~71 chars.  
**ADHD-friendly:** short, one job, question or imperative. **Pass.**

### 2.2 Inventory — `oppositeSparks`

All start with **“Force the opposite:”** + pair + micro-action. Consistent template. Themes: calm/bold, photo/type, handmade/system, dense/empty, literal/abstract. **No pure color opposite** (palette roles).

### 2.3 Ideate prompt issues (ranked)

| Sev | Issue | Detail |
|-----|--------|--------|
| **P1** | Opposite overlap | Main list #5–6 already “Opposite day”; button has 5 more. User can hit Opposite 7 times without leaving “opposite mode.” Energy meter counts both. |
| **P1** | Cover/mark skew | 0,1,8 lean brand-book leave-behind; weak on **flows, states, empty desk, a11y copy, interaction**. Product is “UI/UX + brand” but sparks read **brand identity studio**. |
| **P2** | No project context | Prompts never inject detective goal/audience/tagline. Generic is OK for ADHD blank desk; Soft Signal shows custom spark works. Optional: “Given goal: {goal}…” when detective filled. |
| **P2** | Six-word exercise (#7) | Best Ideate-native prompt — buried mid-list. Should be early or sticky. |
| **P2** | No “pin this / fill A” CTA in prompt text | UI has buttons; prompts don’t nudge A/B/C explicitly except #7. |
| **P3** | Soft Signal spark not in list | Demo custom string fine; `nextSpark` jumps to index 1 of main list (documented). |
| **P3** | No tests on content quality | Only wrap mechanics tested. |

### 2.4 Recommended spark deck (if apply)

**Main list (10) — reduce opposite, balance UI/UX:**

1. Keep #3 three-seconds (hierarchy)  
2. Keep #7 six-words ×3 (volume) — move early  
3. Keep #4 strip decorative  
4. Keep #2 quiet attention system  
5. Keep #9 steal one rule  
6. **New:** Empty state / first-run UI: “What does the empty desk show before any content?”  
7. **New:** One primary action: “Where does the finger go first — and why?”  
8. Keep #0 or #8 one constraint (merge color+font)  
9. Keep one cover/feel (#1) for brand book path  
10. **One** opposite-day only (or remove both; leave button)

**Opposite list (5–6):** keep format; add color-role opposite; optional motion/static.

---

## 3. Helper / AI system prompts

### 3.1 Live — `helperAi.js` SYSTEM_PROMPT

Strengths:
- Names Helper + Creative Companion
- ADHD desk, ~120 words, no markdown headings
- **7-step spine** correct
- Leave-behind PDF promise; not XP theatre
- Craft domains listed; no fake clients
- Stay on design desk

Gaps:
- Does not mention **G / path strip / detective sheet** by name (optional)
- Model default `grok-4.5` — product policy OK
- No injection of processGuide checks into system (user intent only)

**Grade: A-** — best single source of truth for live AI.

### 3.2 Documented — `buddy.DESIGN_SYSTEM_PROMPT` **P0 drift**

```
4-step process:
1) Understand & Clarify
2) Strategy & Wireframing
3) Visual Design
4) Refinement
```

Product is **7-step** Define→Deliver since v1.21+. This string is **wrong** if any live path or docs cite it. Comment at top of buddy.js still says “1 Clarify → 2 Structure → 3 Visual → 4 Refine”.

**Recommend:** Replace with same spine as SYSTEM_PROMPT (or delete and re-export Helper system prompt from one module).

### 3.3 Dual persona names

| Source | Name | Process |
|--------|------|---------|
| helperAi SYSTEM | Helper, design buddy | 7-step |
| buddy DESIGN_SYSTEM | expert UI/UX designer | 4-step |
| BuddyMate comment | Design buddy | 7-step in UI |

Not catastrophic if DESIGN_SYSTEM is unused at runtime — but **dead wrong docs invite future bugs**.

---

## 4. Process coaching triples (redundancy)

For each step, coaching exists as:

1. `JOURNEY_STEPS[].plain` (path tooltip)  
2. `i18n pathPlain.*`  
3. `processGuide` plain + prompt + checks  
4. `designProcessTip(phase)` scripted  
5. `activityTip(view)` scripted  
6. Live `intentUserPrompt` one-liner  

Example **Ideate**:
- Journey: “Messy ideas first. Aim for 5–8 sparks. Shortlist A/B/C.”  
- processGuide: “Force 5–8 messy directions…”  
- designProcessTip: “force 5–8 messy directions. Opposite ideas…”  
- activityTip spark: “One spark → pin or A/B/C → then Sketch.”  
- Live job: “many directions, no judging yet.”

**Consistent intent, five voices.** Acceptable for offline/scripted layers; risk is **edit drift**. After spark audit honesty, “5–8 sparks” still over-promises vs 3 shortlist slots.

**Recommend:** Single `COACHING[id].prompt` as canonical; journey plain = short; designProcessTip/activityTip thin wrappers.

---

## 5. Live intent user prompt

`intentUserPrompt` builds structured context (screen, project, step, energy, pins, timer) + job line. Aliases clarify→define, structure→sketch, etc. **Good.**

Missing context that would help craft:
- `designVersion`, tagline presence, pathDoneCount / next gap  
- Detective goal one-liner when on Ideate/Sketch  

Optional P2 enhancement — not required for ship.

---

## 6. What is *not* broken

- Spark length good for ADHD cards  
- Opposite template consistent  
- Live Helper system prompt product-aligned  
- Scripted fallback always available  
- process-walk / spark store don’t need prompt content tests for mechanics  
- Soft Signal custom spark shows injection path works  

---

## 7. Proposed apply waves

### P1 — Persona single source (**do first**)
1. Rewrite `DESIGN_SYSTEM_PROMPT` + buddy file header to **7-step** matching Helper.  
2. Optionally: `export { SYSTEM_PROMPT as DESIGN_SYSTEM_PROMPT } from helperAi` or shared `lib/helperPersona.js`.

### P2 — Spark deck rebalance
1. Remove or reduce main-list Opposite day (#5–6).  
2. Add 2 UI/UX prompts (empty state, primary action).  
3. Move six-word shortlist earlier.  
4. Unit: length bounds, no duplicate “Opposite day” if removed; count ≥8 for energy.

### P3 — Process copy DRY
1. designProcessTip reads processGuide.prompt when available.  
2. Soften “5–8 sparks” → “many directions; shortlist A/B/C” product-wide.

### P4 — Context injection (optional)
1. Spark card subtitle: goal from detective when set.  
2. intentUserPrompt: next gap + goal line.

---

## 8. Metrics

| Metric | Value |
|--------|-------|
| sparkPrompts | 10 |
| oppositeSparks | 5 |
| Opposite already in main list | 2 |
| Live system prompt words | ~120 policy |
| Stale 4-step system strings | 1 file (buddy.js header + DESIGN_SYSTEM_PROMPT) |
| Parallel process coaching layers | 5–6 |

---

## 9. Verdict

**Sparks are craft-good, not craft-broken.** Priority is **align system personas to 7-step**, then **rebalance Ideate deck** away from double-opposite and cover-only bias.

Ready to implement **P1+P2** on request (`apply prompt audit`).
