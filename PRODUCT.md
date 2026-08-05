# Brand Design Workspace
## Product Development Document

Consolidated 2026-08-05 from the full product conversation. Repetition removed;
ideas organised into a vision and feature framework.

**Relationship to the other documents.** `CLAUDE.md` is the PRD v1.0 plus the
Expansion Spec, and remains the requirements of record. This document is the
wider product thinking those requirements sit inside. Where the two disagree,
the disagreements are listed in §26 rather than silently resolved.

**The central promise:**

> **You create the brand. The platform remembers everything else.**

---

## 01. Product Vision

A brand design workspace that remembers the entire creative process, reduces
mental load, connects designer, client, brand, assets, documentation and
production, and keeps a brand organised across its whole lifecycle.

**What it is not:** another design tool, another project manager, another
client portal, or an AI that designs brands for you.

The biggest opportunity is to make it **something designers rely on during the
thinking**, not something they open only to administer a project and export a
brand book.

---

## 02. The Core Problem

Design process fragmentation · mental load · decision fatigue · client
communication · asset chaos · version confusion · brand documentation ·
handoff and production.

The designer becomes the only thing connecting a dozen disconnected tools.

---

## 03. Product Philosophy

The platform does not replace creative tools. It organises the creative
process around them.

> Creative tools are where the work is made. This platform is where the brand
> lives.

---

## 04. Target Users

Freelance designers · brand designers · small studios · creative agencies ·
in-house designers · and specifically designers with executive-function
challenges. The product must never imply the user cannot design — the problem
is the complexity surrounding the work.

---

## 05. Core Product Architecture

```text
CLIENT → BRAND → PROJECT → PROCESS → ASSETS → DOCUMENTATION → PRODUCTION → ONGOING BRAND
```

The three-way distinction that makes this scale:

| Entity | Means |
| --- | --- |
| **Client** | who you work with |
| **Brand** | what you maintain — outlives any single project |
| **Project** | what you are doing right now |

A brand belongs to the client, not to the project that created it. Project 2
uses the brand Project 1 built.

---

## 06. Project Types — modular, not one fixed workflow

A $500 logo must not walk through forty steps built for a full identity.
Projects start by asking **"what are we building?"**

1. **Logo Design** — logo only
2. **Logo Package** — logo, variations, basic colour, typography
3. **Brand Identity** — the complete system
4. **Brand Refresh** — evolve an existing identity
5. **Rebrand** — substantial change, with equity to preserve
6. **Brand Expansion** — established brand, new applications
7. **Custom** — designer defines the workflow

**Projects can grow.** Logo → Logo Package → Brand Identity via *Expand
Project*, without starting over.

**Refresh and Rebrand start from what exists**, not a blank page: upload the
current brand, get an audit (logo, colour, type, applications, accessibility,
consistency), then decide per element — **Keep / Change / Explore**, or
Keep / Modify / Replace / Retire.

---

## 07. Designer Workflow

```text
Discovery → Strategy → Creative Direction → Exploration → Design → Review
→ Revision → Approval → Documentation → Handoff → Production
```

Every stage is a **module**, not a mandatory step. The designer chooses which
are active; the project type sets sensible defaults.

---

## 08. Executive Function Support

A differentiator, not a marketing layer.

- **Brain Dump** — dump everything unsorted first; the system helps sort it
  into preferences, considerations, open questions, tasks, ideas. *The designer
  should not have to organise their thoughts before the software can help.*
- **Focus Mode** — one stage, one next task, the strategy in view, nothing else
- **One Next Step** — never a list
- **Decision Reduction** — aggressive defaults
- **Easy Wins / "One More Thing"** — offer a tiny low-effort task after a finish
- **Parking Lot** — ideas that are not ready, kept without cluttering the flow
- **Revisit Later** — flag an unsure decision instead of forcing it
- **Open Questions** — Open → Answered → Resolved, surfaced before the stage
  that needs them
- **Unstuck Mode** — see §21
- **Project Health** — see §22
- **Loose Ends** — and the state of having none
- **Pause & Return** — records where you were *and the unresolved thought*
- **"You're Done"** — an explicit end state

---

## 09. Brand Intelligence — the brain

The system remembers goals, audience, competitors, personality, positioning,
keywords, creative direction, likes and dislikes, approved decisions, rejected
concepts **and why they were rejected**, logo/colour/type rationale, and client
feedback.

Then the designer can ask: *"Why did we choose this typeface?"* · *"What were
the client's concerns about the logo?"* · *"Does this new colour fit?"* ·
*"What still needs doing before I deliver?"* · *"I'm stuck — what should I work
on?"*

This turns a project organiser into a **project memory system**, and it is the
single biggest differentiator.

**Supporting structures:**

- **Why field** — every decision carries WHAT / WHY / BASED ON. Feeds the brand
  book automatically.
- **Concept Archive** — rejected work kept with its feedback and reason, so the
  same dead end is not walked twice.
- **Client Preference Tracking** — what this client has responded well and
  badly to, accumulated.
- **Brand System Dependencies** — changing the primary colour flags the assets
  it affects.
- **Brand Change Log** — what changed, why, who approved, what it touched.
- **Asset Usage Tracking** — where a given logo actually appears.

---

## 10. Brand System

Logos · colour · typography · imagery · graphic elements · patterns · icons ·
voice · applications · usage rules · accessibility.

Plus a **Brand Overview** — one page that answers "what is this brand again?"
at a glance.

---

## 11. Colour & Accessibility

Palette creation and repair · contrast checking · colour roles · light/dark
pairs · print and digital considerations · brand-safe alternatives.

**Accessibility beyond colour**, eventually: type size, readability, small
text, colour-only information, motion, digital applications.

---

## 12. Brand Book Studio

**Automatic** (template + generated), **Custom** (own reusable layout), and
**Living** (documentation keeps evolving after delivery).

**Coverage indicator:** which parts of the brand system the book actually
documents, and what is missing — the designer decides whether each gap matters.

---

## 13. Asset Library

Everything, whether made inside the platform or not: logos, printables, cards,
mailers, packaging, motion, mockups, photography, social templates,
presentations, PDFs, font documentation, production files.

**Usage rights on every asset** — client-owned / designer-owned / licensed /
third-party / restricted / do-not-distribute — so the platform can refuse to
put something in a client download that must not be redistributed.

---

## 14. Asset Packaging & Handoff

A first-class feature, not an afterthought. A client should never receive
`logo-final-final-2.ai`.

- **Package Builder** — pick deliverables, get a professional folder structure
- **Naming conventions** — `SparrowsPromise_Logo_Primary_FullColor.svg`, and
  designers can define their own
- **Version control** — only the *approved* version ships
- **Reusable package types** — Logo, Brand Identity, Social, Print, Website,
  Full Handoff, and the designer's own
- **Deliverable checklist** — what is missing before this can go out
- **Font packs with a legal distinction:** *font file included* (licensed for
  distribution) vs *font information only* (family, weights, usage, source,
  licence). Never bundle a commercial font just because the brand uses it.
- **Client Download Centre** — browsable, not one opaque ZIP

---

## 15. Client Directory

The client is the **top-level entity**.

```text
CLIENT → Profile · Contacts · Projects · Brand Systems · Assets
         · Brand Books · Communications · Approvals · History
```

Multiple contacts with roles · private designer notes · tags · communication
preferences · portal access control · relationship timeline · excellent search
across clients, projects, assets, messages and approvals.

**Repeat-client workflow:** returning client → *"Their current brand is v1.4.
Use existing brand / create new / create refresh."*

**Client files vs brand assets** stay separate — contracts and meeting notes
are not brand materials.

---

## 16. Client Portal

Questionnaires · presentations · review · comment · approve · message ·
progress · brand book · downloads · update requests · ordering approved
materials.

**Client view is not designer view.** The designer sees 47 things. The client
sees: *you are here · your action · due Friday.*

Plus gentle **client education** (*what is a secondary logo?*) to cut the
email load, and a **"what happens next"** view to reduce client anxiety.

**"Client doesn't know what they want" workflow:** structured either/or
choices rather than asking a layperson for design vocabulary.

---

## 17. Feedback & Approval

Versioned feedback attached to **element → version → feedback → revision**.

- **Revision Round Manager** — rounds, not scattered comments
- **Designer approval vs client approval** — separate states
- **Approval gates** — optional, before expensive work begins
- **Design freeze / locks** — modifying an approved element reopens approval
- **"Show Me What Changed"** — changed vs unchanged, per version
- **Rejected concept archive** — see §09
- **Client Feedback Translator** — turns *"make it pop"* into candidate design
  variables to investigate. **It must not interpret feedback as fact** — it
  helps the designer investigate, never decides.

---

## 18. Brand Lifecycle

The brand does not end at delivery. `v1.0 → v1.1 → v1.2 → v2.0`.

Refreshes · expansions · new applications · retired (not deleted) assets ·
historical versions · dependencies · lineage · future designers.

**Maintenance reminders** turn a one-off project into an ongoing relationship.
**Ownership transfer** hands a whole brand to another studio or in-house team.

---

## 19. Production & Fulfilment

Framed as **Brand-to-Production**, never as generic dropshipping.

*"The client approved this. Now let's get it made."*

- **Production preflight** — dimensions, CMYK, DPI, bleed, safe area, outlined
  fonts, correct PDF
- **Product templates** carrying each product's specifications
- **Provider marketplace** — compare price and turnaround; the platform sends
  the approved file
- **Ship direct to client**, with status in the portal
- **Designer markup** — production becomes a revenue line
- **Reorders** using the locked approved version, with a warning when a newer
  brand version exists
- **Production specs live on the asset** — stock, finish, bleed, vendor
- **Designer's own vendor catalogue**, learned over time

---

## 20. Designer Attribution

**The platform belongs to the designer, not the other way around.**

*"Designed by Nichol Mahania Design"* — never *"Powered by [SaaS]"* on a
client's materials. The client portal is **white-label by default**.

Configurable per surface (brand book, portal, presentation, package,
production), with a designed credit page rather than a watermark. Project
credits support multiple contributors. **Brand lineage survives expansion** —
a later designer's work does not overwrite the original credit.

A *Contact Designer* button throughout the portal routes requests back into
the designer's system, so the platform never cuts the designer out of their own
client relationship.

---

## 21. Motivation & Delight

Healthy dopamine, **not gamification**.

Progress · tiny wins · completed stages · "Look What You Built" · No Loose Ends
· the Brand Shelf of finished work · Before/After · Ship It · **"You can stop
here."**

**Explicitly forbidden:** XP, levels, leaderboards, competitive scoring, daily
streaks, "you haven't worked today", constant badges, artificial urgency.

**The emotional loop:** overwhelmed → the app says what matters now → finish
one small thing → see it moved the project → feel competent → know the next
step → eventually, done.

> *"You're done. Nothing is waiting for you."* is likely the biggest reward
> this audience can be given.

**The "I'm Stuck" button** is central, not a nicety. It asks what kind of stuck
— too many options / dislike them all / don't know what's next / confusing
feedback / can't focus — and returns **process guidance, not an answer.**
Usually by making the problem smaller: *"Don't choose the final font. Pick
three you don't hate."*

---

## 22. Project & Brand Health

Not a vanity score — a readiness assessment.

**Project Health:** workflow · client responsiveness · scope · approvals ·
assets · brand system · accessibility.

**Client responsiveness tracking** exists so a stalled project reads as
*"blocked by client approval, sent 6 days ago"* rather than the designer
assuming they are behind.

**Delivery preflight:** brand system, files, accessibility, approvals,
documentation, licensing, scope — with what must be resolved before delivery.

**Scope Creep Detector:** a request outside the defined scope surfaces to the
**designer** (never as a warning to the client) as *add to project / create
proposal / discuss*.

---

## 23. AI Layer

**AI supports the designer; it does not replace them.** Turning this into "AI
that designs brands for you" would weaken the product.

Legitimate uses: summarise questionnaires · extract strategy · identify
contradictions · organise brain dumps · generate checklists · suggest next
steps · explain client feedback · check consistency · draft rationale · build
the brand book · find missing documentation · prepare handoff · flag
accessibility · identify affected assets when a brand element changes.

---

## 24. The Designer's Personal System

Designers build their own methodology into the software: project workflows
("recipes"), questionnaire templates, brand strategy formats, creative briefs,
moodboards, presentation templates, deliverable packages, checklists, client
processes, asset libraries, private inspiration libraries.

> Not *"this is how branding should be done"* but *"tell us how you work, and
> we will help you work that way consistently."*

**Private inspiration library** with tagged references, and *why* each was
saved — which is what makes it more useful than a Pinterest board.

---

## 25. Product Differentiation

Eight interconnected systems, with AI across them rather than being the
product:

1. **Brand Intelligence** — strategy, decisions, rationale, memory, consistency
2. **Workflow Engine** — modular types, steps, progress, focus mode, health
3. **Design Support** — colour, accessibility, comparison, exploration, checks
4. **Brand Asset System** — assets, versions, permissions, packaging, libraries
5. **Client Collaboration** — questionnaires, presentations, feedback, approvals
6. **Brand Book Studio** — templates, generation, custom layouts, living docs
7. **Delivery & Handoff** — packages, naming, folders, downloads
8. **Brand Lifecycle** — refreshes, rebrands, expansions, version history

The modularity is what stops this becoming an overwhelming monster: a logo-only
project touches three or four systems; a full identity touches nearly all.

---

## 26. Conflicts with decisions already taken

Recorded rather than silently resolved. Each needs an owner decision.

### 26.1 Modular project types vs the ten-stage rebuild — **direct conflict**

On 2026-08-05 the decision was taken to **rebuild the journey to the spec's ten
fixed stages**, and Phase 2 of `PHASES.md` is written against it. §06 here says
the opposite: a fixed spine is the mistake, and the workflow must adapt to what
is being built.

These cannot both be implemented. §06 is the later and more considered
position, and it also subsumes the ten stages (they become the default module
set for *Brand Identity*). **Recommend: §06 wins, Phase 2 is rewritten as
"modular stages with per-project-type defaults".** Not actioned without
confirmation.

### 26.2 Client → Brand → Project vs the planned projects table — **RESOLVED 2026-08-05**

Phase 1a plans a `projects` table. §05/§15 require **Brand as an entity that
outlives projects**, owned by a client. That is a three-table hierarchy, not
one. Cheaper to get right before Phase 1a than to migrate afterwards.

**Owner chose the hierarchy** ("Same brand, many projects"): a client owns
brands, a brand collects projects over years, and colour/type/decisions live
on the brand so later jobs already know them. Implemented in
`supabase/migrations/20260805120000_clients_brands_projects.sql`. Phase 1a
syncs through all three tables from day one; the UI keeps its flat project
list for now (one brand per client is a sync-layer simplification, not the
model).

### 26.3 Progress percentages vs the no-numbers constraint

§22 and PRD §7 both want percentages and health scores. The owner's standing
constraint is that numbers and clock time do not register, and the pack-ratio
guard was removed on 2026-08-05 to permit them. The tension is unresolved:
§21 forbids scores-as-gamification while §22 wants readiness percentages. The
distinction the product needs is **readiness (actionable) vs score (judgement)**
— worth stating explicitly before either is built.

### 26.4 Brand Brain and "What Am I Missing?" are already in flight

PR #126 implements both. Adversarial review found: the keyword recall model
fails in the case the feature exists for (vocabulary mismatch — Furnas et al.
report 80–90% failure for single-term matching), its empty state asserts a
false negative, and its completeness headline renders a persistent count of
undone work. See the review on #126 and `DEVELOPMENT.md` "Contested claims".

### 26.5 Production, packaging and attribution have no schema yet

§14, §19 and §20 imply asset-level metadata (usage rights, production specs,
attribution, lineage) that no current table models. These should shape the
schema in Phase 1/3 rather than be bolted on.
