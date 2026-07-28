# Research → features: the 44 links, the 28 items, the 7 phases

> Recovered 2026-07-28 from the transcript of session `89cf2f66` after the chat
> was cleared. The plan had never been written to disk — only Phase 1's code
> survived, in commit `e39ba7e`. This file exists so that cannot happen again.
>
> Original instruction: *"deep research all of these links… tell me how we can
> implement these things and create phases. do not leave anything out. if you
> think it should be left out, ask me first."*

---

## Status

| Phase | What | Status |
|-------|------|--------|
| 1 | Make the brand book tell the truth | **DONE** — `e39ba7e` |
| 2 | Get paid properly (invoice) | **DONE** — `bfc1c5c`, branch `feat/payable-invoice` |
| 3 | Scope and revisions | not started |
| 4 | Touchpoints becomes real | not started |
| 5 | Contract | not started |
| 6 | Case study export | not started |
| 7 | Craft lenses | not started |

---

## The phases

### Phase 1 — Make the brand book tell the truth — DONE (`e39ba7e`)

Items 15, 17, 18, 19, plus brief additions 12, 13, 14, 16. Ask Promise and
Proof; print `story`, `usp`, `toneOfVoice`, `technical`; add writing guidelines
and print/finish specs; add "where will the brand be used", accessibility
constraints, and split `existingAssets` into style-guide / logo.

*First because it fixes a live defect in a client-facing document, it's all
data-layer, and "where used" is what Phase 4 needs.*

Note: items **18** (writing guidelines — title vs sentence case, ALL CAPS) and
**19** (print/finish specs — Pantone, stock, formats) are listed in the phase
but are **not** mentioned in the `e39ba7e` commit message. Verify against the
book before assuming they shipped.

### Phase 2 — Get paid properly — DONE (`bfc1c5c`)

Items 1, 2. The 11-point invoice checklist, plus line items that can be
**flat-price or hourly**. `addTimeEntry` rejected anything without hours, so a
fixed-fee project could not be invoiced honestly.

### Phase 3 — Scope and revisions

Items 3, 4, 5, 10, and the useful half of 9. Scope checklist at project start
(deliverables in plain terms · revision count **as a number** · file formats ·
one decision-maker · out-of-scope named). Revision rounds with a definition, a
limit, a counter, and a pause-and-ask at the limit. Feedback log — Reviewer /
Issue / Decision / Status — which becomes what the Review stop actually
produces.

Plus item **8** (client survey): the owner moved this into Phase 3.

### Phase 4 — Touchpoints becomes real

Items 22, 26. The book renders the applications the client actually named, not
five fixed ones. Touchpoints currently receives no client input at all — Phase
1's "where will this be used?" checklist is what feeds it.

### Phase 5 — Contract

Items 6, 7. Generated from what Phases 1 and 3 already captured. Needs legal
review before it ever reaches a client — build it as the studio's template, not
a send-button.

See also the separately-scoped **Dropbox Sign** e-signature flow in `todo.md`
("Client contract signing before work begins"), which is the sending half of
this and is blocked on an owner-created API key.

### Phase 6 — Case study export

Item 28 — *"the strongest thing in all 44 links."* The portfolio article says
curate 3–6 case studies and always share your process, answering five
questions. The app already holds every answer: purpose from `goal`, how from
`decisionLog`, **how long from `workLog`** (the private work clock), outcome
from the pack. Nobody else can generate this because nobody else recorded the
hours.

### Phase 7 — Craft lenses

Items 23, 24, 25, 27. Smallest and most speculative, so last.

---

## Decisions the owner locked in

- **Survey (item 8) joins Phase 3.**
- **Service tiers (item 21) stay parked.**
- **One phase at a time, with verification between.**
- Groups 2 and 3 are wanted as *features*, not just vocabulary — which is why
  items 22–28 were re-mined out of them after an initial pass wrote them off.

⚠️ The final message listed *three* things to park and the transcript preserves
only two (tiers, and the survey which was un-parked into Phase 3). **The third
parked item was not recovered.** Ask before assuming nothing is missing.

---

## The 28 items

### From Group 1 — process templates

| # | item | source | status when found |
|---|------|--------|-------------------|
| 1 | Invoice: number, dates, payment methods, contact, tax, notes | invoice | 8 of 11 missing → **done P2** |
| 2 | Invoice: fixed-price line items | pricing pages | impossible, hours×rate only → **done P2** |
| 3 | Revision rounds: define a round, set a limit, pause at limit | revisions | no concept of it |
| 4 | Revision billing: hourly / per-round / flat | revisions | — |
| 5 | Feedback log: Reviewer / Issue / Decision / Status | style guide | — |
| 6 | Contract: 9 sections, generated from brief | contract | — |
| 7 | Trademark / name check before design | brand identity | — |
| 8 | Client survey: mid-project, post, retainer | survey | — |
| 9 | Onboarding stage: welcome, expectations, **one decision-maker** | onboarding | — |
| 10 | Scope checklist: deliverables, revision count as a number, formats, decision-maker, out-of-scope | PM | partial |
| 11 | Portal: "what's next", contract reference, document hub, review scheduling | portal + ClickUp | partial |
| 12 | Brief: where the brand will be used | questionnaire | ❌ → **done P1** |
| 13 | Brief: accessibility constraints | questionnaire | ❌ → **done P1** |
| 14 | Brief: existing style guide? existing logo? (split from `existingAssets`) | questionnaire | vague → **done P1** |
| 15 | Brief: **Promise** and **Proof** | StoryBrand | book had the tiles, brief never asked → **done P1** |
| 16 | Brief: the plan, and one consistent CTA | StoryBrand | ❌ |
| 17 | Brand book: print `story`, `usp`, `toneOfVoice`, `technical` | style guide | collected, never printed → **done P1** |
| 18 | Brand book: writing guidelines (title vs sentence case, ALL CAPS) | style guide | ❌ |
| 19 | Brand book: print/finish specs (Pantone, stock, formats) | style guide | ❌ |
| 20 | Ideal client profile + outreach angles | customer profile, personas | ❌ |
| 21 | Service tiers / packages | pricing pages | flat checklist only — **parked** |

### Re-mined from Groups 2 and 3

| # | item | source |
|---|------|--------|
| 22 | Application set driven by "where will the brand be used" — the book renders 5 fixed touchpoints regardless | business cards ×4, questionnaire |
| 23 | Grid overlay on Board pins | Pinterest grids |
| 24 | "Which rule am I breaking, and why" on a design decision | rule-breaking |
| 25 | Review lens: visceral / behavioural / reflective | emotional design |
| 26 | Layout pattern reference (8 web layouts, F/Z scanning) | layout ideas, hierarchy |
| 27 | Feedback discipline check: trigger → rules → feedback | micro-interactions |
| 28 | **Case study export** — purpose, role, how, how long, outcome | portfolio |

---

## The framing that came out of it

The business wrapper around the work:

```
profile (who to work with) → brief/questionnaire (what they need)
  → contract (terms) → THE WORK ← the app is only here
  → invoice (getting paid)
```

Two ends were done badly-ish — the brief well, the invoice thinly — and the
contract was absent entirely. Phases 2, 3 and 5 are that whole wrapper.

**One caution recorded at the time:** the emotional-design article argues for
celebration animations, delight and liberal micro-interactions. `CLAUDE.md` and
the ADHD advisor argue the opposite — `reduceMotion`, no ambient stimulation,
*"a prompt whose answer is always the same is a toll."* Both are right for their
audience; this app is a tool for one time-blind person trying to start work, not
a consumer app competing for retention. **When these conflict, the advisor
outranks the article.**

---

## The links

### Group 1 — Process templates (the implementable core)

- https://reallygooddesigns.com/free-creative-brief-template/
- https://reallygooddesigns.com/free-branding-design-questionnaire-template/
- https://reallygooddesigns.com/customer-profile-template/
- https://reallygooddesigns.com/freelance-invoice-templates/
- https://reallygooddesigns.com/free-design-contract-template/
- https://reallygooddesigns.com/what-is-a-style-guide/
- https://reallygooddesigns.com/brand-style-guide-examples/
- https://reallygooddesigns.com/brand-and-visual-identity/
- https://reallygooddesigns.com/how-to-create-a-client-survey-for-creative-agencies/
- https://reallygooddesigns.com/what-is-client-onboarding/
- https://reallygooddesigns.com/what-is-a-client-portal/
- https://reallygooddesigns.com/project-management-fundamentals-explained-for-creative-studios/
- https://reallygooddesigns.com/client-personas-and-outreach-messages/
- https://reallygooddesigns.com/how-to-charge-for-revisions/
- https://reallygooddesigns.com/creative-agency-clickup-dashboard-example/

### Group 2 — Craft principles (audit lenses, not features)

- https://reallygooddesigns.com/emotional-design-in-ux/
- https://reallygooddesigns.com/micro-interactions-guide/
- https://reallygooddesigns.com/visual-hierarchy-guide/
- https://reallygooddesigns.com/typography-website-examples/
- https://www.pinterest.com/grids_system/grids-the-design-inspiration/ *(login wall; 309 pins, source `grids.qoopu.net`)*
- https://reallygooddesigns.com/graphic-designs-that-broke-the-rules/
- https://reallygooddesigns.com/graphic-design-trends-2026/

### Group 3 — Galleries (reference material)

- https://reallygooddesigns.com/dark-mode-websites/
- https://reallygooddesigns.com/website-footer-examples/
- https://reallygooddesigns.com/event-email-examples/
- https://reallygooddesigns.com/email-header-and-footer/
- https://reallygooddesigns.com/website-contact-page/
- https://reallygooddesigns.com/mobile-website-design/
- https://reallygooddesigns.com/brand-identity-examples/
- https://reallygooddesigns.com/portfolio-website-design/
- https://reallygooddesigns.com/resume-infographic/
- https://reallygooddesigns.com/pricing-page-design-examples/
- https://reallygooddesigns.com/storybrand-website-examples/
- https://reallygooddesigns.com/website-layout-ideas/
- https://reallygooddesigns.com/business-card-mockup/ *(5 yrs old — verify licences at source)*
- https://reallygooddesigns.com/square-business-card/
- https://reallygooddesigns.com/designer-business-cards/
- https://reallygooddesigns.com/business-card-design-ideas/
- https://reallygooddesigns.com/business-card-ideas/
- https://reallygooddesigns.com/design-bundles-and-resources/
- https://reallygooddesigns.com/get-yourself-into-creative-mode/

### Group 4 — Tools (buying decisions)

- https://hype4.academy/articles/design/best-ux-ui-design-tools-in-2025 — **house bias:** hype4 is Michal Malewicz's site and the author says he switched to Sketch because he "was forced to." A Sketch-house publication reviewing Sketch's competitor.
- https://reallygooddesigns.com/best-ux-design-tools/
- https://reallygooddesigns.com/best-software-tools-for-print-design/ — Affinity Publisher detailed: master pages, live preflight, one-time purchase not a subscription
- https://base44.com/lp-english — AI app builder; the category this app already occupies the hard way

Verified against vendor pricing at the time (the hype4 article had one wrong
number): **Sketch** $12/editor/mo yearly Standard · $24 Professional · $44
Enterprise. **Figma** Pro $16 Full / $12 Dev / **$3 Collab**; Org $55/$25/$5;
Enterprise $90/$35/$35. The article's "if you share a file with a client you pay
for the client to edit it" complaint costs $3/mo now, not a full seat.

Checked while verifying: https://www.sketch.com/pricing/ ·
https://www.figma.com/pricing/ · https://cpoclub.com/tools/best-ux-design-tool/ ·
https://www.aha.io/software/roadmap-product-management-b
