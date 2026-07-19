# Creative Companion — Professional Redline  
**As of v0.2.49** (post path redesign)  
**Reviewer stance:** UX / UI / graphic design lead, handoff-ready critique  
**Method:** Login → every path step → Tools → Helper → Settings → Pack export

---

## Executive verdict

The **v0.2.48 redesign brief was partially executed**. The product now has a legible spine:

```
Project → Work → Board → System → Pack
```

That is a real improvement. Chrome is thinner. Work’s current step is closer to the fold. Pack has a single primary download. Board can star pins. Helper primary verbs are three.

**It is still not a design desk that looks like it authors brand.** It is a competent multi-view SPA with a journey bar, a form-heavy System page topped by a mock artboard, and residual product archaeology (`flow`, `insights`, ConceptPipeline, XP, forced breaks).

**Score (harsh):**

| Lens | Score | Note |
|------|-------|------|
| Product clarity | 6.5/10 | Path is right; Tools + leftovers still blur it |
| UX (ADHD focus) | 5.5/10 | Work better; System/Tools/breaks still cognitively loud |
| UI craft | 5/10 | SaaS-default indigo cards; not memorable |
| Graphic / brand tool credibility | 4/10 | Artboard is UI chrome dressed as a pack, not a designed artifact |
| Consistency | 4.5/10 | Naming, dual systems, off-path ghosts |

**One line:** You renamed the rooms and moved the furniture. You have not yet built a room that looks expensive enough to sell brand direction.

---

## What improved (credit, then move on)

1. **Path honesty** — Board on the path; Ideas/Concept off-path. Correct.  
2. **Header** — Manifesto subline gone; “Tools” better than “Extra”; GameHUD not default.  
3. **Work** — Current step higher; process no longer permanent furniture.  
4. **Pack** — Primary download + readiness + thin-pack friction.  
5. **Board starring** — Explicit pack pins (max 6).  
6. **Refresh** — Last view restored (no longer always Work).  
7. **Helper** — Coach / Critique / Break as primary row.

These are table stakes for the brief. They are not yet a visual or craft victory.

---

## 0. System / brand identity of the *product*

| Issue | Sev | Redline |
|-------|-----|---------|
| **Product name split** | High | Login says “Creative Companion”; header says “Companion.” Pick one lockup. |
| **Logo mark** | Critical | Still a generic gradient disc. A brand-direction tool with a default SaaS blob fails the first trust test. |
| **Chrome uses user-brand indigo** | High | App accent `#4F46E5` collides with Soft Signal / default project palette. Chrome must go **neutral**; brand color lives only on the artboard. |
| **One type family everywhere** | High | Plus Jakarta for UI *and* specimen. No proof you can handle type pairing. |
| **Radius + shadow monotony** | Med | Same 12–18px cards path-wide. Pack never feels “special.” |
| **Internal route names leak** | Med | `flow`, `studio`, `brand`, `finish`, `insights` in code/classes still structure thinking. Users see System/Pack; code still thinks Brand/Finish. |

**Redline:** Neutral shell (ink + paper). Expensive pack. Distinct mark. Stop borrowing the user’s first swatch as the app brand.

---

## 1. Login

**Touch every control:** Sign in / Create account tabs · email · password · show password · Forgot · submit · proof column (non-interactive).

| Issue | Sev | Redline |
|-------|-----|---------|
| **Wrong hero** | Critical | Proof column still sells a **todo step card**, not the **brand pack**. You sell “leave with a pack.” Show a mini pack cover. |
| **Fake CTA** | High | “Complete step” is a `<span>` styled as a button. Deceptive affordance. |
| **Copy density** | Med | Eyebrow + 3-line title + card + 3 bullets + form lede. Cut to one promise + form. |
| **Cloud vs local** | Med | Still engineering-framed for local password. Users want “Open my desk.” |
| **No pack specimen** | Critical | After all the export work, login still doesn’t show the artifact. |

**Ship bar:** Left: pack mockup. Right: email/password. One sentence. Logo that looks intentional.

---

## 2. Onboarding (first-run dialog)

| Issue | Sev | Redline |
|-------|-----|---------|
| **Skip empty desk** | High | Still an equal path to blank. ADHD products shouldn’t normalize empty as success. Quiet link only. |
| **Then dumps to Work** | Med | After setup, `setActiveView('flow')` is correct for desk; fine. Don’t also lecture about XP. |
| **No visual of Board→System→Pack** | Med | Path is the product; onboarding never draws it. |

---

## 3. Global chrome

### Header
| Control | Critique |
|---------|----------|
| **Companion wordmark** | Truncated brand; still no crafted mark. |
| **Project `<select>`** | Only if >1 project — good. Ugly native select — bad. Custom pill needed. |
| **Timer chip** | OK when running. |
| **Tools menu** | **Kitchen sink:** breakdown, Helper, Timer, Spark, Calendar, Direction sketches, New project, Stuck. Tools should be 4 items max; rest in Settings. |
| **Account chip** | Settings / Light-Dark / Log out — fine. “Dark/Light” better than old “Dark screen.” |
| **GameHUD** | Hidden by default — **correct.** Must never return to primary chrome. |
| **Path bar (1–5)** | Clear. Still no real “completion” state (active only). Settings has **no** path highlight (`journeyIdForView` → null) — user feels lost. |

### Path bar redlines
- Settings, Timer, Calendar, Spark: **orphan pages** with “← Work” and no path context.  
- Visiting Timer still soft-maps to Work (path 2 lit) while content is Timer — **lying indicator**. Off-path tools must **dim the path** or show “Tools · Timer,” not fake Work active.

---

## 4. Project (path 1)

| Issue | Sev | Redline |
|-------|-----|---------|
| **Form, not home** | High | No readiness: steps, pins starred, system completeness, pack ready. |
| **Brief vs System positioning** | High | Two fields, one job. They diverge. One source of truth. |
| **Multi-project delete** | Med | Exists in settings-ish flows; Project page still feels orphaned from Pack quality. |

**Redline:** Project = identity card + health meters → CTA “Open Work” / “Open Pack.”

---

## 5. Work (path 2)

**Controls:** Current step title edit · Complete · Split if too big · Design mode · due date · remove · Capture · energy/voice options · queue/done toggles · footer links Board/System/Pack · breakdown.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Duplicate comment / residue** | Low | Code still has doubled “Current step owns the fold” — signal of rushed merge; clean craft. |
| **Step is better, not pure** | Med | Capture strip + queue + design mode + how-it-works still stack under the fold. Acceptable if step is truly first. **Verify on 13" laptop.** |
| **Energy on capture** | High | Still unexplained; mostly no visible system effect. Hide until it reorders or changes Helper. |
| **Design mode** | Med | Checklist still doesn’t change the canvas. Mode without UI change = education, not product. |
| **Footer link farm** | Med | Board · System · Pack text links recreate the path under the work. Path bar is enough. |
| **XP toasts** | High | Still gamify Complete/Split in places. Professionals want quiet success. |
| **No undo on Complete** | High | ADHD mis-tap. Soft undo 5s. |

**Visual:** Step title scale improved. Card still same panel language as Settings. Hero should feel like a **single stage**, not a form panel.

---

## 6. Board (path 3)

**Controls:** Upload · URL · Color/note · Spark · drop zone · star Pack · caption · remove · Go to System.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Star UX** | Med | “☆ Pack” is clear enough; selection state on the **tile** (not only a chip) would read faster. |
| **Fallback pins in pack** | High | Unstarred board still dumps first 6 into pack with a soft note. That **undermines starring**. No stars = empty mood section + CTA “Star pins,” not silent fill. |
| **URL pins / CORS** | Med | Still fragile in PDF capture. Prefer upload. |
| **Secondary add modes** | Med | URL / note / spark OK; primary upload is correct. |
| **No layout craft** | High | Grid of cards, not a curated board. Designers expect drag-reorder, scale, reject. |

**Redline:** Pack pins only. Reorder. Hero pin. Board should look like a **mood wall**, not a CMS media library.

---

## 7. System (path 4) — formerly Brand

**Controls:** Artboard (read-only composition) · accordion Tagline/Voice/Colors/Type/Logo/Pins · palette builder · contrast · type fields · logo concepts · mood upload · Go to Pack.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Artboard is a fake** | Critical | It’s the same direction-sheet markup as export, good. But **editing is still disconnected forms below**. Accordion default **all closed** means first paint is artboard + cryptic tabs — no discoverability that tabs open editors. |
| **Default closed accordion** | High | First-time: “how do I edit tagline?” Click Tagline tab — unstated. Open Tagline by default or inline-edit artboard. |
| **Color still list-not-roles** | Critical | No bg / text / accent / border roles. `palette[0]` is still cover. Pale first swatch kills cover. |
| **Type is text fields** | Critical | No live specimen of actual webfonts beyond UI default. “Plus Jakarta Sans Bold” as string is amateur. |
| **Logo** | High | Concept radio + free text; no mark upload on System. |
| **Pins section vs Board** | Med | Dual mood UI again. System pins should only manage **which starred pins** / order, not re-upload universe. |
| **Dual identity model** | Critical | ConceptPipeline package fields still exist off-path and can still fight System fields. |
| **PDF capture of artboard** | Med | Raster screenshot path is OK v1; type stays soft; multipage is screenshot logic. |

**Graphic design redline:** Until color roles + type specimen + logo slot exist, this is a **questionnaire with a pretty header**, not a system builder.

---

## 8. Pack (path 5)

**Controls:** Thumbnail · readiness list · Download (confirm if thin) · Preview full · Work / Edit system · More formats (HTML/MD/JSON/Print/backup) · Start over section.

| Issue | Sev | Redline |
|-------|-----|---------|
| **Thumb ≠ artboard fidelity** | High | Mini cover is a sketch of the pack, not the live artboard component. Should embed/share the same artboard component. |
| **Readiness is good** | — | Keep; make checks deep-link to System accordion section. |
| **Thin confirm** | Good | Keep. |
| **Start over / leave** | Med | Correct secondary; ensure it doesn’t dominate. |
| **Award XP on Finish visit** | Med | Still fires journey_finish XP when opening Pack — **celebration for navigation**. Wrong. |

---

## 9. Tools (off-path) — touch each

### Timer (`insights`)
| Issue | Sev | Redline |
|-------|-----|---------|
| **Name** | High | Internal `insights` vs “Focus timer.” Rename route mentally/UI fully. |
| **Forced breaks** | Critical | Still a third system vs Helper vs soft tips. Consent, one model. |
| **Emergency phrase** | High | Hostile under client pressure. Hold-to-exit + schedule. |
| **Step context** | Med | Shows linked step — good. Make it the hero under the clock. |

### Spark
| Issue | Sev | Redline |
|-------|-----|---------|
| **Full page for a sentence** | High | Should be a drawer from Work/Board. |
| **Fortune-cookie energy** | Med | Tie to current step domain or kill. |

### Calendar
| Issue | Sev | Redline |
|-------|-----|---------|
| **Generic month grid** | Med | Not a production milestone tool. |
| **Path lies** | High | Lights Work while on Calendar. |

### Direction sketches (ConceptPipeline)
| Issue | Sev | Redline |
|-------|-----|---------|
| **Second product** | Critical | Full pipeline still in Tools. Competes with Board + System. **Park or merge.** Do not invest UI polish here until path is pure. |
| **Fill Brand** | High | Reintroduces dual write paths. |

### Breakdown wizard
| Issue | Sev | Redline |
|-------|-----|---------|
| **Powerful, buried** | Med | Entry from Tools/Stuck OK; also surface on empty Work only. |
| **Wizard length** | Med | Too many steps for overwhelm moment. One screen: goal + generate. |

### Stuck / creative reset overlay
| Issue | Sev | Redline |
|-------|-----|---------|
| **Duplicate of Tools** | Med | Same destinations again. One escape hatch max. |

---

## 10. Helper (BuddyMate)

**Primary:** Coach · Critique · Break  
**More:** Body checks, Break Kit, process, full review, time, progress, etc.

| Issue | Sev | Redline |
|-------|-----|---------|
| **More still a product** | High | Primary row is clean; More reopens the carnival. Cap More to wellness + kit only. |
| **Voice brand** | Med | Sass vs professional coach unresolved. |
| **AI key in client** | High | Product risk; not UX theatre — document, proxy later. |
| **Auto messages** | Med | View/step pings still compete with focus. Prefer silent unless user opens Helper. |

---

## 11. Settings & preferences (every control)

| Control | Critique |
|---------|----------|
| **Theme** | OK. Native button toggle fine. |
| **Reduce motion** | Required. Good. |
| **Design buddy** | Duplicate of Tools → Helper. One master switch only (Settings *or* Tools). |
| **Timer sound** | OK; needs preview. |
| **Force break lockouts** | Most dangerous control — still mid-page. Needs confirm + first-run consent copy. |
| **Collapse queue** | Good power user. |
| **Show how this works** | Fine. |
| **Progress bar (XP)** | Good that it’s opt-in. Default off must stay. |
| **Account / sync / password** | Acceptable. Settings sub still says “Local-only — no account” even when CLOUD may be true — **copy bug**. |
| **Advanced storage** | Correctly collapsed. Good. |
| **Backup / import / wipe / full reset** | Keep; visual hierarchy for danger. |
| **Soft Signal sample** | Demo is valuable; must be “Load demo project” sandbox, never silent overwrite risk. |
| **← Work** | From Settings, back-link should be “← Desk” or last path step, not always Work. |

---

## 12. Export modal / PDF / formats

| Issue | Sev | Redline |
|-------|-----|---------|
| **Modal vs System artboard** | Med | Two previews (System live + export modal). One component. |
| **PDF = screenshot** | Med | Acceptable v1; not print-craft. Long-term: vector/text PDF. |
| **Mood direction** | Improved | Pin paint fixed; starring still optional fallback. |
| **HTML/MD** | OK under More. |

---

## 13. Cross-cutting UX defects

1. **Naming still dual:** User-facing System/Pack vs code Brand/Finish/flow/studio.  
2. **Three break systems:** soft Helper, Timer end, forced lockout.  
3. **Toast culture:** XP and confirmations still noisy.  
4. **No undo** on complete/delete pin.  
5. **A11y:** Path + Tools + Helper focus order unproven; forced overlay is an a11y landmine.  
6. **Mobile:** Path five pills + Tools + account = chrome-first on small screens.  
7. **Concept + Board + System** = three places for “direction.”  

---

## 14. Graphic design craft (as BD tool)

A creative director still asks: *Why trust this to define a brand?*

| Expected in a system tool | Present? |
|---------------------------|----------|
| Color roles | No |
| Type ramp specimen | No (text only) |
| Logo mark upload + clear space | No |
| Art directed mood layout | No (grid) |
| Component / UI kit preview | No |
| Print margins / page system | Weak (raster) |
| Distinct product brand | No (generic indigo SaaS) |

**The Soft Signal demo content is still better designed than the empty product shell.** That means quality lives in **seed data**, not in the **tool**.

---

## 15. Priority redlines (next 8 only)

1. **Neutral app chrome; brand color only on artboard.**  
2. **Craft a real mark + one product name.**  
3. **System: inline edit or default-open Tagline; color roles; type specimen.**  
4. **Pack pins: starred only — no silent fallback.**  
5. **Kill or freeze ConceptPipeline until Board+System are pure.**  
6. **One break model + consent; fix Settings cloud copy.**  
7. **Path indicator truth for Tools (don’t light Work on Timer).**  
8. **Quiet Complete (no XP toast by default); undo.**  

---

## 16. What not to build next

- More Helper personality  
- More gamification  
- More export formats  
- More path steps  
- Polish on ConceptPipeline  

**Build:** artboard fidelity, color roles, pin curation honesty, chrome neutrality.

---

## 17. Bottom line

As a **UX** lead: IA is finally sayable in one breath. Execution is still a multipage app with ghost products in Tools.  
As a **UI** lead: Redesign reduced noise; it did not create hierarchy or beauty.  
As a **graphic designer:** System artboard is the right *shape* of idea; the *craft* is still form fields and a cover bar.

**You moved from carnival → corridor.**  
**You have not yet entered the studio.**

---

*Document status: redline committed for v0.2.49. Pair with `docs/REDESIGN_BRIEF.md` for target; this file is the gap analysis after partial implementation.*
