# Path pages multi-agent audit — 2026-08-03

Post-merge of desk/Home/Strategy/Research/Identity rebuild + chip removal + mobile touch fixes (`main` through PR #68).

**Agents:** `adhd-executive-function-advisor`, `copy-editor`, `ux-professional`, `five-w-one-h-auditor`, `design-process-professor`, `ui-professional`, `quality-control-critic`.

---

## Merged already (this session)

| PR | What |
|----|------|
| #65 | Identity stamp chip + unit CI |
| #66 | Client-state path banner |
| #67 | Mobile path touch 1–4 |
| #68 | All path-title ambient chips (before/after, mark done under titles) |

---

## Consensus themes

1. **Return wall (Home/Desk)** — two equal CTAs, client-unread vs path Continue mismatch, Mark done styled as primary on desk gap.
2. **Touchpoints is a broken path rung** — done gate fires from Strategy brief fields; page is a task desk, not applications.
3. **Dual Next** — step-rail Continue + footer Next both solid primary.
4. **Assets path-done vs ship** — brand-word checkboxes buried but gate the tick.
5. **Mobile targets** — Research pin 24px (fixed in this PR); desk checkboxes still small.
6. **Copy** — shame (“Needs work”), scoreboards, download label that doesn’t download.

---

## Blocking backlog (owner decisions needed)

| ID | Finding | Source | Suggested direction |
|----|---------|--------|---------------------|
| T1 | Touchpoints auto-done from Strategy | QC | Rebuild applications stop **or** remove from path until real |
| T2 | Touchpoints page ≠ applications work | QC | Same as T1 |
| A1 | Assets tick needs collapsed brand-word checks | 5W1H / QC | Drop from gate **or** un-bury checks |
| H1 | Home “Needs you” but Continue is path | ADHD | Client-first primary when unread |
| D1 | Desk Mark done is `btn-primary` | ADHD / UX | Primary = Open stop; Mark done secondary |
| S1 | Strategy dual primary Send + Next | UX / QC | One solid primary |

---

## Keep (do not undo)

- Ambient path chips removed  
- Strategy form-only; Research one wall  
- Identity Mark→…→Preview + resume + shared Continue logic  
- Stationery on Assets; ★ pins on Research  
- Full-width path mains; mobile footer stack; subnav tap-min  

---

## Shipped in follow-up PRs

### PR #69 (quick honesty)
1. Gap strip: **Open Assets** (was “Download brand book PDF”)  
2. Research pin star / remove / shortlist drop → **44px**  
3. Palette health: **Tighten roles** (was Needs work)  
4. Path footer sticky: **safe-area-inset-bottom**  
5. Identity mobile subnav: **horizontal scroll row**  
6. Assets status chip: short form, not full gap list  
7. Research `.page-sub`: **token muted** (not `#A1A1A1`)  

### PR path-audit-all (blocking set)
1. **Touchpoints gate** — completed titled task only (not Strategy checklists)  
2. **Assets path-done** — handoff/learnings only (brand-word checks optional polish)  
3. **Home pickup** — client unread → **Open client inbox** primary; Desk is ghost  
4. **Desk gap** — **Open {stop}** primary; Mark done secondary  
5. **Strategy** — one solid primary (Send when form complete, else Next)  
6. **Step-rail Continue** — secondary (page Next is solid primary)  
7. **Touchpoints footer** — Back to the desk + correct Next fallback  
8. **Desk task checks** — 44px tap targets  

---

## Still open (later)

- Full Touchpoints **applications** rebuild (gate is honest; page is still a task desk)  
- Identity Words placeholders copy pass  
- Dual-resume Desk lastView vs gap labeling polish
