# Idea backlog — what happened to each

Companion to `docs/IDEAS.md`, which holds the two lists verbatim. This file is
the reading: what already exists, what exists in a different form than was
asked for, what later measurement **contradicted**, and what is still open.

**How this was checked, and how far to trust it.** Every line below was checked
against the code, not against the documentation — because the documentation has
misled a reader four times in this repo, and an audit written from stale docs
inherits the staleness. It is a grep-plus-spot-check pass, not an exhaustive
audit: "built" means the mechanism exists and is reachable, not that it is as
complete as the idea imagined. Where a first-pass match turned out to be noise
(a code comment about a rejected *UI design* reading as a rejected-*concepts*
feature; the word "coverage" meaning colour coverage rather than brand-book
coverage) it is listed as NOT built.

---

## Already built

| Idea | Where it lives |
|---|---|
| Decision log / brand memory | `src/lib/decisionLog.js`, surfaced in Design and Case Study export |
| "Why?" on a design decision | `colorRoleWhy` per role, `src/views/DesignView.jsx` |
| Brand consistency checking | `src/lib/brand/` — mark, font and application checks (**see contradictions**) |
| Client view vs designer view | `src/features/client-portal/PublicClientPortal.jsx` |
| Revision round manager | `src/components/RevisionRounds.jsx` |
| Client presentation / leave-behind | `src/components/BrandArtboard.jsx` |
| Brand handoff | `src/features/client-portal/DeliverToClient.jsx`, `PublicBrandReveal.jsx` |
| Brand expansion (applications) | `touchpointApps`, `src/views/SketchView.jsx` |
| "Need help" button | `src/features/helper/BuddyMate.jsx` |
| Project recipe / type | `src/views/NewProjectIntake.jsx`, `src/lib/projectTypes.js` |
| Scope + deliverables builder | `deliverablesPicked`, `brandSurfaces` in the brief |
| Competitive landscape | `src/views/ResearchView.jsx` |
| Inspiration / reference library | mood pins, `src/lib/moodPins.js` |
| Decision comparison | `src/components/AlignmentBars.jsx` — five bars, never one score |
| Brand change log / versions | `src/services/versionService.js` |
| Brand source of truth | `src/lib/brandSystem.js` → tokens, `brand.md`, artboard |
| Integration layer foundation | `src/lib/assets/assetLibrary.js` (Phase 7 part one) |

## Built, but not the shape that was asked for

- **Brand inventory for existing brands** — `existingAssets` is a text field in
  the brief, not a structured inventory of what the client already owns.
- **Design freeze / approval locks** — approvals are recorded, but nothing is
  *locked*; an approved element can still be edited.
- **Designer private notes** — a private `workLog` exists, which is a record of
  what was done, not notes about the design.
- **Time / effort tracking** — a focus timer exists; nothing accumulates time
  against a project.
- **Accessibility beyond colour** — contrast is thorough (WCAG AA/AAA, the
  readability rows). Type size, motion, focus order and reading order for the
  *client's* deliverables are not checked.

## Contradicted by what was measured afterwards

These three are the reason this file exists. Each was a good idea that later
evidence argued against, and the evidence is worth more than the idea.

**1. "Brand linting" that catches a slightly-wrong colour.** The idea was a
tool that says *"this blue is slightly off."* Measured: it cannot be done at
this fidelity. Ordinary JPEG noise moves a **correct** colour by up to ΔE00
4.17, and CMYK conversion moves one by 6.14 — so below about 12, correct work
and wrong work are indistinguishable. What shipped is a **large-error
detector**, and the panel says so in as many words. The fine-grained version is
not deferred; on raster input it is not available.

**2. A "Brand Readiness: 68%" completeness score.** Already tried, already
reverted, and the reversal is recorded in `PHASES.md` as *"measurement that
punished use"* — an untouched project opened at 33% in red, a failing grade for
work not yet begun, at exactly the moment (task initiation) where it does most
damage. Anything of this shape needs to withhold a score until there is
something to measure, and must never let doing more work lower the number.
The replacement idea in the same lists — **"Loose Ends"** — is the better one,
because a named unresolved thing is actionable and a percentage is not.

**3. Focus Mode.** Deliberately not built in Phase 5, with the reasoning kept:
a focus mask already ships that de-emphasises without hiding, a persisted
collapse state is itself another thing to remember, and it hides your work
whenever the app is wrong about which stage you are on.

## Still genuinely open

Ordered by how much they would change day-to-day use, not by effort.

1. **Brand element dependencies** — *"this colour is used in 11 approved
   assets; changing it affects 4 brand-book pages."* Nothing tracks this.
   `StepDependencyReminder` is about journey steps, a different thing. This is
   the single biggest gap and the one that makes the rest compound.
2. **Asset usage tracking** — the other half of the same gap: where is this
   logo actually used?
3. **Loose Ends** as a first-class project state — unanswered questions,
   missing assets, unresolved decisions, waiting approvals. Better than any
   percentage.
4. **Safe stopping point** — "Where you left off" exists as a sentence; the
   deliberate *stop* moment does not.
5. **Rejected concepts archive** — explored-and-discarded directions are not
   kept. Nothing in the store retains them.
6. **Client preference memory** — what this client has liked and disliked,
   across projects. Nothing tracks it.
7. **Keep / Change / Explore** for rebrands — no such framing exists.
8. **Brand book coverage** — the builder does not know which pages *this*
   project needs; a logo-only job and a full identity get the same structure.
9. **Font licensing** — no record of whether a typeface may be redistributed to
   the client. This one has legal consequences, and the packaging code will
   happily zip whatever it is given.
10. **Client "what happens next?" view** — the portal shows state, not sequence.
11. **Pricing / proposal connection** — revision rounds exist; money does not.
12. **Client feedback translator** and **design rationale generator** — the two
    most AI-shaped ideas in the lists, and the two least verifiable. Neither
    exists.

## The one I would argue against

The lists themselves end with an item titled *"And one thing I would NOT do"* —
that instinct is right, and this repo is unusually good at recording what it
declined and why. Anything added from the open list should record the same.

The candidate I would push back on hardest is a **single brand-health number**,
in any of its guises. It has been built once, it punished the designer for
starting, and it was reverted. If it returns it should return as named loose
ends, not as a percentage.
