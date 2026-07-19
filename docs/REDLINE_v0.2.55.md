# Creative Companion — Professional Redline  
**As of v0.2.55** (post redesign + polish waves)  
**Reviewer stance:** Senior UX / UI / graphic design lead — agency handoff critique  
**Method:** Login → unlock → every path step → Tools → Helper → every Settings control → export surfaces  
**Date of review:** 2026-07-19

---

## Executive verdict

You now have a **legible product spine**. That is real product work, not cosmetic:

```
1 Project → 2 Work → 3 Board → 4 System → 5 Pack
```

Neutral stone chrome, starred pack pins, shared `BrandArtboard`, thin-pack friction, skip link, journey `aria-label`s, PDF multi-page when needed — these are competent engineering craft.

**It still does not look or feel like a tool that authors brand direction.** It looks like a well-organized multi-view SPA that *talks about* brand while the artifact remains a long form-card with a colored header.

**Harsh scores (0–10):**

| Lens | Score | Why |
|------|------:|-----|
| Product clarity (path) | **7.0** | Spine is honest in the bar; Pack “quick map” still lies |
| ADHD / focus UX | **6.0** | Work fold is better; System dual-edit + Helper noise pull attention |
| UI craft | **5.5** | Neutral tokens land; monotony of panels / radii / type remains |
| Graphic / brand credibility | **4.0** | Artboard ≠ designed pack; type is free-text; logo is canned concepts |
| Consistency / IA honesty | **4.5** | Names, maps, and dead routes still contradict the redesign |
| Visual identity of *the product* | **3.5** | Gradient disc “logo”; no signature lockup or pack specimen on login |

**One line:** You built the correct room labels. The room still looks rented.

**Ship bar for “professional design desk”:** someone who has never used the app should open Pack, download PDF, and believe a designer *composed* that document — not that a form was screenshotted into jsPDF.

---

## What improved since v0.2.49 (credit, then cut)

1. **Neutral chrome** — product accent is stone/ink, not Soft Signal indigo. Correct.
2. **Header lockup** — “Creative Companion” full name (not truncated “Companion”).
3. **Path a11y** — journey as ordered list + “Step N:” labels; skip link.
4. **Board → Pack curation** — ★ Pack, pack order, hero pin, DnD board order.
5. **Shared artboard** — System / Pack preview / export panel share one component.
6. **Pack primary** — single Download + thin confirm; more formats in details.
7. **Empty defaults** — real empty desk path; Soft Signal is Settings opt-in.
8. **Progress optional** — GameHUD behind Settings; quieter default desk.
9. **Onboard mini path** — 1–5 labels under first-run copy.
10. **PDF** — preview-faithful raster + auto multi-page at small scale.

These raise the floor. They do **not** raise the ceiling of craft.

---

## 0. Product / system brand (the app itself)

| Issue | Sev | Redline |
|-------|-----|---------|
| **Logo mark is a generic disc** | Critical | `.logo-mark` is still a flat stone circle + pseudo highlight. A product that sells brand direction cannot ship a default SaaS blob. Commission a 1-color monoline mark or lockup; put it on login, header, pack footer. |
| **CSS comment still says “refined indigo”** | Low | `index.css` header comment lies about the token system. Update or delete — craft hygiene. |
| **One type family for product + specimen** | High | Plus Jakarta everywhere. Specimen claims heading/body pairs but renders the same UI font stack. Either load Google/variable pairs for common faces, or show honest “name only — install face to match” with a *designed* fallback pairing (e.g. display serif + sans) that *looks* intentional on the pack. |
| **Internal route names still structure the product** | Med | Users see Project/Work/Board/System/Pack. Code still uses `flow`, `studio`, `brand`, `finish`, `insights`, `spark`. Fine for engineers; **user-facing copy and maps must never leak old names.** Pack quick map fails this (see §6). |
| **Radius monotony** | Med | Same ~14px card language path-wide. Pack and artboard should feel like *paper/document*; Work can stay desk. Differentiate surface systems (`surface-desk` vs `surface-document` is half-started). |
| **Footer always present** | Low | Version + Cloud/Local is good for trust; on Pack it competes with the export moment. Soften or hide on Pack when export panel open. |

**Redline:** Product identity = lockup + type + paper system. User brand color **only** on artboard/pack.

---

## 1. Login

**Controls touched:** Sign in / Create account tabs (cloud) · Email · Password · Show/Hide · Confirm password · Forgot password · Submit · proof column (decorative).

| Issue | Sev | Redline |
|-------|-----|---------|
| **Hero sells the wrong artifact** | Critical | Left “proof” column is still a **todo step card** (“Write the one shippable step… / Complete step”). Product promise is **leave with a brand pack**. Show a mini pack cover (name + tagline + 3 swatches + 2 pins). |
| **Fake CTA** | High | “Complete step” is a `<span class="login-proof-btn">` styled as a button. Deceptive affordance. Either make it non-button chrome (no button chrome) or a real inert illustration. |
| **Copy density** | Med | Eyebrow + 3-line title + fake card + 3 bullets + form lede + storage essay. Cut to: one promise + form + one-line storage. |
| **Local password framing** | Med | “Create access password for this browser” is engineer-speak. Prefer “Protect this desk on this device.” |
| **No visual of the pack** | Critical | After all export work, first impression still doesn’t show the deliverable. |
| **Password min 6** | Low | Fine for local toy gate; weak if cloud is real. Align with Supabase policy messaging. |
| **Show password toggles both fields** | Low | Confirm + password share one show state — OK; label as “Show passwords.” |

**Ship bar:** Left = pack specimen. Right = email/password. One sentence. Real mark.

---

## 2. First-run onboarding

**Controls:** Project name · First step · Brief (optional) · Open Work · Skip empty · path list (display only).

| Issue | Sev | Redline |
|-------|-----|---------|
| **Good:** Path 1–5 listed; no forced Soft Signal | — | Keep. |
| **Modal reuses export-overlay chrome** | Med | Onboarding should not feel like “export pack.” Distinct sheet: calmer, shorter, no portfolio-export styling. |
| **Three fields before Work** | Med | ADHD bar: name + one step is enough. Brief belongs on Project/System. Move brief off first run or collapse. |
| **Skip is a text link** | Low | Correct hierarchy. Keep primary = Open Work. |
| **No illustration of path outcome** | Med | After path chips, one quiet line: “You leave with a PDF brand pack.” |

---

## 3. Shell chrome (every authenticated page)

### 3.1 Header

**Controls:** Logo text · Project select (if multi) · Timer chip (if running) · Sync error chip · **Tools** menu · **Account** chip menu.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Tools is a junk drawer** | High | Break into steps · Helper on/off · Timer · Calendar · New project. These are different jobs. Split: (A) desk actions on Work, (B) Tools = Timer/Calendar only, (C) New project on Project. |
| **Tools group label repeats button label** | Low | Menu header says “Tools” under a button named Tools. Redundant. |
| **Account chip uses first letter only** | Low | Fine; ensure contrast on dark theme. |
| **Theme only in account menu** | Low | OK if Settings also has it (it does). |
| **Log out vs Log out / lock** | Low | Naming is honest for local; keep. |
| **Skip link after GameHUD** | Low | DOM order: progress strip then skip then path. Move skip **first** in header for SR order. |

### 3.2 Journey bar

**Controls:** 5 step buttons · Tools pill when off-path.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Good:** Tools pill when on Timer/Calendar | — | Keep honesty. |
| **No progress through path** | Med | All steps look equal forever. Optional: subtle “visited / has content” state without gamification (e.g. filled num when pack readiness item met). |
| **Mobile crowding** | Med | 5 labels still crush on narrow widths. Consider icons + current label only, or horizontal scroll with snap. |

### 3.3 GameHUD (Settings → Progress bar XP)

**Controls:** Expand bar · level · XP · streak · combo · daily · quests.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Correctly off by default** | — | Keep. |
| **Still game-language heavy** | Med | If Progress is on, tone should be “session focus,” not arcade (🔥 ⚡). Optional quiet mode labels. |
| **Doubles Helper XP chrome** | High | FAB shows Lv; GameHUD shows Lv; Helper panel shows XP bar. One XP surface max when Progress on. |

### 3.4 Footer

Version · user · Cloud/Local. **OK for trust.** Too persistent on Pack — see §0.

### 3.5 Global chrome: toasts, undo, autosave

| Issue | Sev | Redline |
|-------|-----|---------|
| **Toast spam** | Med | Star pin, hero, role assign, helper toggle all toast. Batch or silent-success for micro actions. |
| **Undo complete** is excellent | — | Keep pattern; extend to other destructive undos if possible. |

---

## 4. Path step 1 — Project

**Controls:** Open Work · Open Pack · readiness meter + 5 fix links · Active/Archive/All pills · Name + Save · Brief · Archive · Restore archived select · Deadline + Calendar · Quick add · Go to Work/Board/System/Pack · Delete project.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Dual primary in header** | Med | Open Work + Open Pack equal weight. Primary = Open Work; Pack secondary until readiness ≥ ~60%. |
| **Readiness vs Pack readiness mismatch** | High | Project checklist includes “open Work step”; Pack page checklist is pack-artifact focused. Align criteria or rename Project meter to “Path readiness.” |
| **Brief edited in three places** | High | Project + System essentials + artboard positioning. Pick **one source UI** (artboard or Project); others read-only deep-link. |
| **Quick add on Project** | Med | Duplicates Work capture. Project is naming/readiness — not a second inbox. Remove or demote. |
| **Pills (Active/Archive/All)** | Low | Functional; visual weight competes with readiness. Collapse under “Projects.” |
| **Archive vs Delete** | Low | Good. Confirm copy is clear. |
| **Go to link list** | Good | Reinforces path. Keep. |
| **Empty desk snapshot** | Good | Keep. |

---

## 5. Path step 2 — Work

**Controls:** Context line · Current step title edit · Complete · Split · More → Design checklist · Due date · Remove · Capture + Add · Energy & voice (energy select, due, voice) · Process chips · How this works dismiss · Break project down / Board / System / Pack links · Queue show/hide · Queue checkboxes · Done show/hide · Undo done · Delete done · Breakdown modal (multi-step).

| Issue | Sev | Redline |
|-------|-----|---------|
| **Current step owns fold** | Good | Keep hierarchy. |
| **Action row still busy** | High | Complete + Split + More + Due + Remove = cognitive load. Default: **Complete** + one overflow “…” menu (split, due, remove, checklist). |
| **Energy & voice hidden** | Med | Correct for calm; ensure first-time users know capture can set energy. |
| **Design checklist + Helper process** | High | Process lives in Work details *and* Helper More tools (clarify/structure/visual/refine). One process model. |
| **Queue checkbox always `checked={false}`** | Med | Visual: boxes never show checked state before toggle completes — fine if list re-renders; still feels like broken checkboxes if animation fails. Prefer complete-on-row-click or explicit “complete” control. |
| **Below-fold path text links** | Low | Redundant with journey bar. Keep one of: journey bar *or* Work footer links. |
| **How this works card** | Good | Quiet + dismissible. Keep default off after first dismiss. |
| **Breakdown wizard** | Med | Valuable ADHD feature; 5-dot progress is fine. Reduce “ADHD project breakdown” clinical label → “Break into micro-steps.” |
| **No timer on Work** | Med | Timer is Tools-only. Optional: tiny “25” secondary on current step (start focus without leaving). |

---

## 6. Path step 3 — Board

**Controls:** Upload · Paste URL · Color/note · Spark escape · Star more / Clear stars · Drag reorder · Per pin: ★ Pack · ↑↓ · Hero · caption · Remove · Go to System.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Upload-first is correct** | Good | Keep hero upload. |
| **Pin chrome denser than the pin** | Critical | Tools under every pin (star, order, hero, note field, remove) turn the board into a form grid. Pattern: hover/focus reveals tools; note as optional expand; hero = long-press star or single “★ hero” state. |
| **Star more (fill to 6)** | Med | Dangerous: bulk-stars mediocre pins into the pack. Rename “Star next unpinned (careful)” or remove; prefer intentional starring. |
| **Spark as tertiary add** | Med | Sparks are quotes, not visual refs — weak pack content. Keep off-path; don’t promote as pack strategy. |
| **URL pins / CORS** | Med | External image URLs often fail in PDF raster. Prefer upload; warn on URL pins for export. |
| **Go to System primary** | Good | Clear next step. |
| **Empty state copy** | Good | Mentions 2–6 stars. |

---

## 7. Path step 4 — System

**Controls:** Board · Download pack · Live artboard (inline edit) · Edit tabs: Tagline · Voice · Colors · Type · Logo · Pins · Palette builder · Contrast checker · Logo concepts · Upload mark · Go to Pack.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Dual editing model** | Critical | Artboard is editable *and* accordion forms duplicate the same fields. User doesn’t know which is source of truth (both write store — but cognitively it’s double desk). **Redline:** artboard is preview; Edit tabs are the only inputs — *or* artboard is the only editor and tabs disappear. |
| **Artboard kicker “Brand identity template”** | High | Generic template language. Use project name context: “Direction sheet” / client-ready kicker. |
| **Type is free-text labels** | Critical | Defaults “Plus Jakarta Sans Bold/Regular” with specimen that still uses UI stack mapping. No font picker, no load guarantee. This is the #1 reason packs look fake. |
| **Logo = 2 canned concepts + text field** | High | Concept 1/2 are placeholder product design. Replace with: direction text + mark upload only. Kill fake “Concept 1 Saved” rows or make them user-authored. |
| **Pins edit tab shows first 6 of *all* board pins** | High | Artboard uses **starred** pins only; System Pins section uses `deskMood.slice(0, 6)` — **not** `inPack`. Contradicts Board/System/Pack story. Fix: show starred only + link to Board. |
| **Contrast checker is good craft** | Good | Keep; it earns “design tool” credibility. |
| **Palette roles on artboard** | Med | Assign-role-then-click is clever but invisible. One-line coach: “1) pick role chip 2) click swatch.” |
| **Download pack from System** | Low | Goes to Pack view — good. Don’t silent-export without preview. |
| **Mobile: artboard + forms stack forever** | High | Sticky artboard or tabs: Preview \| Edit. |

---

## 8. Path step 5 — Pack

**Controls:** Readiness list + fix links · Download pack · Preview full · Work one more step · Edit system · More formats (HTML/MD/JSON/Print/backup) · New project · Log out · **Quick map**.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Primary download + thin confirm** | Good | Keep. |
| **Preview artboard is compact** | Med | Compact can hide mood/type density. Ensure compact still *looks* like the PDF. |
| **“Start over or leave” hierarchy** | High | **Log out is `btn-primary`** next to New project secondary. Wrong. Log out = ghost/danger; New project = secondary; Download remains the only primary on page. |
| **Quick map is a critical honesty failure** | Critical | Still lists: **1 Project · 2 Work · 3 Ideas · 4 Brand · 5 Finish** and links **Ideas → `concept`** (removed from UI). This actively unteaches the redesign. **Delete this map** or rewrite to Project → Work → Board → System → Pack with live views only. |
| **More formats** | Low | Correctly demoted. Export panel still resurfaces all formats (see §14). |
| **Pack page still doesn’t feel “special”** | High | Same white panels as Project. Pack should be a presentation surface: larger preview, less chrome, paper shadow, one CTA. |

---

## 9. Tools — Timer (`insights` / Focus timer)

**Controls:** Back · Start/Pause · 25 · 2 · Force break switch · Mark step done · Back to loop · Body double.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Route name `insights`** | Low | User label is Focus timer — OK. |
| **Force break toggle skips consent** | High | Settings uses confirm + `forceBreaksConsented`. Timer toggles freely. Same switch, same consent gate. |
| **“Back to loop”** | Med | Dead metaphor. → “Back to Work.” |
| **“Body double”** | Med | Product language elsewhere is Helper / Design buddy. One term. |
| **No break duration choice** | Low | Fixed Pomodoro model — OK if explained once. |
| **Timer chip in header jumps here** | Good | Keep. |

---

## 10. Tools — Calendar / Deadlines

**Controls:** Back · Project deadline · Clear · Month nav · Today · Day cells · Upcoming list (if present).

| Issue | Sev | Redline |
|-------|-----|---------|
| **Honest scope** | Good | Deadlines, not full calendar product. |
| **Cannot add/edit step dues from calendar** | Med | Month is mostly display. Either deep-link day → Work with due filter, or allow set due on click. |
| **No empty illustration** | Low | When no deadlines, show one CTA: set project deadline. |

---

## 11. Tools — Spark

**Controls:** Back · Another spark · Pin to mood board · Done.

| Issue | Sev | Redline |
|-------|-----|---------|
| **OK as optional stimulus** | — | Don’t let it dilute Board quality. |
| **Pins as quote on default indigo** | Med | Use project palette[0] — still often default. Prefer neutral paper pin. |
| **Back goes Work** not Board | Low | After pin, you route Board — good. Done → Work is fine. |

---

## 12. Helper / Little Helper (BuddyMate)

**Controls:** FAB open · Minimize · Close (off) · Coach · Critique · Break · More: Water/Food/Bathroom · Logged break · Break kit add · Process 4 · Full review · Coach (again) · Time · Progress · badges.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Primary three verbs** | Good | Coach / Critique / Break — keep. |
| **Naming soup** | High | Little Helper · Design buddy · Body double · Helper · FAB level. Pick **Helper** everywhere. |
| **XP on FAB always** | High | Even when Progress is off, FAB shows level. Respect `showProgress` — hide Lv/XP chrome when Progress off. |
| **More tools reopens the old kitchen sink** | High | Wellness + kit + process + 4 quick buttons + badges. After “three primary verbs,” this undoes calm. Collapse wellness into Break flow only. |
| **Duplicate Coach** | Low | Primary Coach + More “Coach” (`tip`). Merge. |
| **AI production honesty** | High | GitHub Pages host often has no xAI proxy → scripted fallback. UI should say “Scripted desk coach” vs “Live AI” when configured — never imply GPT-grade critique if local scripts. |
| **Auto-nudge every few minutes** | Med | ADHD: helpful until interruptive. Settings: “Helper quiet mode” (no timed pings). |
| **FAB covers CTAs** | Med | Dock policy exists; verify Pack download and System primary not obscured on mobile. |

---

## 13. Forced break overlay

**Controls:** Clock · kit checkoffs · Emergency unlock phrase.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Consent + Settings gate** | Good | Hard lock is honest when enabled. |
| **Emergency phrase** | Good | Friction is intentional. |
| **Visual design** | Med | Full-screen card is OK; avoid playful XP during lock. Rest aesthetic. |

---

## 14. Export panel (Preview full)

**Controls:** Close · artboard · open work list · PDF · HTML · MD · JSON · Print · Close again.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Formats explode again** | High | Pack carefully hid formats; panel re-elevates five downloads. Panel primary = PDF only; rest in “Other formats.” |
| **Open work list on brand pack** | Med | Client pack may not want internal todos. Optional toggle “Include open work.” Default off for client-facing PDF. |
| **Raster PDF** | High (known) | html2canvas ≠ vector brand PDF. Roadmap: true multi-page layout engine or print CSS. Until then, label “PDF preview export (raster).” |

---

## 15. Settings & preferences (every control)

### Appearance
| Control | Critique |
|---------|----------|
| **Theme light/dark** | Works. Theme values `warm`/`deep` vs UI “light/dark” — rename internal or map labels carefully. |
| **Reduce motion** | Essential. Verify Helper hop + GameHUD burst honor it (partially). |

### Presence & sound
| Control | Critique |
|---------|----------|
| **Design buddy** | Description mentions Coach/Critique/Break — good. Align name with Helper. |
| **Timer sound** | Clear. |
| **Force break lockouts** | Consent confirm good. **Must match Timer page.** |

### Work
| Control | Critique |
|---------|----------|
| **Collapse queue by default** | Good ADHD default. |
| **Show How this works** | Good. |
| **Progress bar (XP)** | Good off-default. When on, hide Helper level chrome or accept double XP (don’t). |

### Account / Access
| Control | Critique |
|---------|----------|
| **Sign out** | Clear. |
| **Sync now** | Cloud only — good. |
| **Change local password** | Two fields + Update — OK; show match error on submit. |
| **Supabase env hint** | Engineer-facing; bury under Advanced. |

### Your data
| Control | Critique |
|---------|----------|
| **Download / Import JSON** | Good. Import confirm good. |
| **Advanced storage** | Cache key OK for power users. |
| **Start empty desk** | Sets view to `flow` (Work) — good. Confirm copy good. |
| **Full reset + setup** | Good. |

### Optional sample
| Control | Critique |
|---------|----------|
| **Load Soft Signal** | Correct opt-in + confirm. Keep out of onboarding. |

### About
| Control | Critique |
|---------|----------|
| Version / build | Good. |
| Product blurb still mentions “forced breaks” as core | Fine if optional — say “optional forced breaks.” |

**Settings IA redline:** Group order is solid. Visual: every section is identical `panel brand-section` — dense. Use sticky section nav on long Settings for mobile.

---

## 16. Empty states (cross-cutting)

| Surface | Note |
|---------|------|
| Work no step | Clear CTAs — good. |
| Board no pins | Mentions star 2–6 — good. |
| System pins empty | Upload + Open Board — good. |
| Queue / Done empty | Quiet — good. |
| Pack thin | Warning + confirm — good. |
| Calendar empty | Weak — add CTA. |

---

## 17. Visual / graphic design system notes

1. **Panel language is exhausted.** Every page = white card + stone label + secondary text. Differentiate: Work = desk, Board = wall (tighter grid, less card chrome), System/Pack = document (margin, type scale, less UI chrome).
2. **Buttons:** Primary ink fill is calm; on dark theme primary is light — verify contrast on all states (hover/disabled).
3. **Mood board:** Image pins need consistent crop/ratio; caption field under every pin destroys gallery reading.
4. **Artboard footer “Creative Companion · Brand identity · date”** is OK for tool watermark; allow hide for client PDF.
5. **No motion language for success on Pack download** beyond toast — add quiet “Saved to downloads” confirmation in-panel.
6. **Dark mode:** stone tokens are better than pure black; check mood pin text and artboard role badges.

---

## 18. Critical bugs / honesty defects (fix before polish)

| # | Defect | Sev |
|---|--------|-----|
| 1 | Pack **Quick map** still sells Ideas / Brand / Finish and links to removed `concept` | **Critical** |
| 2 | System **Pins** section shows all pins, not ★ Pack pins | **High** |
| 3 | Timer force-break toggle **bypasses consent** used in Settings | **High** |
| 4 | **Log out primary** on Pack “Start over” | **High** |
| 5 | Helper **Lv chrome** when Progress off | **High** |
| 6 | **Dual edit** System artboard + forms | **High** |
| 7 | Login sells **todo**, not pack | **Critical** (trust) |
| 8 | Type specimen **does not prove type** | **Critical** (craft) |

---

## 19. Priority ship order (recommended)

### P0 — honesty (1–2 days)
1. Fix Pack quick map or delete it.
2. System Pins = starred only.
3. Force-break consent shared.
4. Pack button hierarchy (Download only primary).
5. Helper hide XP when Progress off.

### P1 — craft credibility (1 week)
1. Login pack specimen + kill fake button.
2. One System edit model.
3. Type: curated font pairs with real CSS family loading (even 6 pairs).
4. Board pin tools on hover/focus.
5. Export panel = PDF primary only.

### P2 — product identity (design sprint)
1. Real product mark + lockup.
2. Pack as presentation surface (layout, type scale, paper).
3. PDF quality roadmap (beyond raster).
4. Helper naming + quiet mode.

### P3 — depth
1. Calendar interactivity.
2. Tools menu declutter.
3. Vector/print-quality pack.
4. Cloud AI status UI.

---

## 20. Page-by-page control inventory (audit checklist)

| Surface | Controls reviewed |
|---------|-------------------|
| Login | tabs, email, password, show, confirm, forgot, submit, proof |
| Onboard | name, step, brief, open, skip, path list |
| Header | project select, timer chip, sync, Tools×5, Account×3, GameHUD, journey×5, skip, footer |
| Project | open work/pack, readiness×5, pills, name, brief, archive, restore, deadline, quick add, go-to×4, delete |
| Work | complete, split, more/checklist, due, remove, capture, energy, voice, process, how-it-works, links, queue, done, breakdown |
| Board | upload, url, note, spark, star fill/clear, pin tools, go system |
| System | artboard edits, tabs×6, palette, contrast, logo, pins, export bar |
| Pack | ready, download, preview, secondary, formats, new, logout, map |
| Timer | start/pause, 25, 2, force, after×3 |
| Calendar | deadline, clear, nav, today, grid |
| Spark | another, pin, done |
| Helper | FAB, coach, critique, break, more tools, kit, process |
| Forced break | kit, emergency |
| Export panel | formats×5, close |
| Settings | theme, reduce motion, buddy, sound, force, queue, how-it-works, XP, account, sync, password, backup, import, empty, reset, demo, about |

---

## 21. Final line

**v0.2.55 is a coherent ADHD design desk in structure.** It is still a **form app wearing a brand-pack costume** in craft. Fix honesty defects first (map, pins, consent, hierarchy). Then spend design budget on the **artifact people download** and the **first screen people see** — not on more panels.

If you only do five things next:

1. Delete/fix Pack quick map  
2. Login = pack specimen  
3. One System edit surface  
4. Real type pairs on artboard  
5. Product mark  

---

*End of redline v0.2.55*
