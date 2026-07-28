# Creative Companion — Product Requirements (living)

**Status:** Living · aligns app + redesign brief · **v1.51 path**  
**Not:** Commons (workplace/family rooms) — separate product.

---

## 1. One sentence

A **body-double desk** where a designer does **one shippable step**, builds a **direction board**, freezes a **brand system**, and leaves with a **client-ready pack**.

Not a chatbot. Local-first; optional Supabase cloud; optional live Helper via server proxy.

---

## 2. Primary path (exactly five)

Process language follows classic brand identity process (Wheeler / Logo Design Love),  
ordered **brief-first** (ADHD): know the project before gathering refs.  
Step **ids** stay stable (`define` / `research` / …); labels are user-facing.

| # | Label | View id | Step id | Job |
|---|--------|---------|---------|-----|
| 1 | **Strategy** | `project` | `define` | Brief / detective form (form-only — no mood board) |
| 2 | **Research** | `studio` | `research` | Pins; star up to 6 for pack |
| 3 | **Identity** | `brand` | `design` | Live artboard + accordion editors |
| 4 | **Touchpoints** | `flow` | `sketch` | One current step; drafts / applications desk |
| 5 | **Assets** | `finish` | `deliver` | Preview + one primary Download PDF |

**Off-path (Tools):** Timer (`insights`), Ideate (`spark`), Review (`review`), Calendar, Clients, Settings, Helper prefs, breakdown, export extras.

**Default chrome:** no GameHUD / XP bar (`showProgress` default off).

---

## 3. Success criteria (spine)

- [ ] New user: complete Strategy brief → star one Research pin → set tagline on Identity → one Touchpoints step → download Assets PDF without hunting Tools.
- [ ] Touchpoints: current step owns first fold (Complete step primary; Split if too big secondary).
- [ ] Identity: artboard readable first (left on wide; first on mobile).
- [ ] Assets: one primary PDF download; thin pack warns with links to Research/Identity.
- [ ] Helper default: **Coach · Critique · Break** only; else under More.
- [ ] Path progress never counts empty brief as “done” (detective requiredReady).

---

## 4. Non-goals

- Native mobile app  
- Fake AI logo generator  
- Reintroducing Focus Mode product or Define mood board  
- Commons room types / family product  
- Billing (see `PRICING_RECOMMENDATION.md` — research only)

---

## 5. Technical guardrails

| Area | Rule |
|------|------|
| Version | **Manual** `npm run bump` / `bump:minor` / `bump:major` then add + commit (hooks no-op) |
| Portal submit | Atomic `UPDATE … WHERE status` + `row_count` — never SELECT-then-UPDATE |
| Attachments | `client-uploads` + `is_client_upload_target`; `attach: true` fields ripple-check |
| Deploy | Netlify/Vercel base `/` never `./`; Helper secrets server-side |
| Color | Dark mode (`.app.deep`) audit on every color change — `AGENTS.md` |
| Skills | `supabase-rls-guardrails`, `schema-change-ripple` before RPC/field changes |

---

## 6. Related docs

| Doc | Role |
|-----|------|
| `docs/REDESIGN_BRIEF.md` | Original IA wireframes |
| `DESIGN_GRAMMAR.md` | Visual/UX grammar (G1 path updated to five stops) |
| `AGENTS.md` | Owner rules every session |
| `docs/DEPLOY_AI.md` | Helper proxy env |
| `todo.md` | Session log / residual ideas |

---

## 7. Implementation stack (status)

| PR | Goal | Status |
|----|------|--------|
| 1 | Five-stop path + Tools | **Done** v1.51 |
| 2 | Work AOF | **Done** v1.52 |
| 3 | System artboard-first | **Done** v1.52 |
| 4 | Pack AOF + thin warning | **Done** v1.52 |
| 5 | Helper 3 verbs (+ ops secrets optional) | **Done** code; secrets optional |
| 6 | This PRD + grammar/README | **Done** v1.52 |
| 7 | Board polish + Ideate diverge framing | **Done** this release |
| 8 | Skeletons, path prefetch, device checklist | **Done** this release |

Device/perf checklist: `docs/DEVICE_CHECKLIST.md`

### Chrome extraction (reverted)

The `AppHeader` / `AppMain` / `AppSidebar` extraction (`236582f`) white-screened
production (props bag / shadowing / undeclared identifiers). **Reverted to
inlined chrome in `App.jsx`** while keeping CSS split, five-stop path, and
later PR work. Do not re-extract without browser smoke of the signed-in shell.
