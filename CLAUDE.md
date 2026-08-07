> ## Read before you commit
>
> **This file is the product spec — what to build and why. It says nothing
> about how to ship it, and everything below is easy to satisfy while still
> getting the commit wrong.** The working rules live elsewhere and are not
> optional:
>
> | Read | For |
> |---|---|
> | `AGENTS.md` | Owner decisions are final; the two mandatory advisors; copy and layout rules |
> | `docs/ONBOARDING.md` | **How to ship a change** — the version bump, the CSS layout (`shell.css` + `lazy-*.css`, all loaded eagerly), deploy targets |
> | `docs/PRD.md` | The same shipping rules in more detail, plus agent rank order |
> | `DESIGN_GRAMMAR.md` | Settled naming/chrome decisions — check before renaming any label |
>
> **The one that gets missed:** *version bumps are manual and belong in the
> same commit* — `npm run bump:major` for breaking, `bump:minor` for a
> `feat:`, `npm run bump` otherwise, then stage `package.json` and
> `package-lock.json` **with** that commit. The git hook that used to do this
> is disabled and must not be re-enabled: in this environment a hook that
> stages during a commit lands its changes in the *next* commit's tree.
>
> This has been missed repeatedly, including across three merged PRs on
> 2026-08-07 (#170, #171, #172), all of which shipped without a bump. Nothing
> in CI catches it, so the only guard is reading this.

---

**Document Version:** 1.0
**Product Type:** SaaS / Web Application
**Primary Users:** Graphic Designers / Brand Designers
**Secondary Users:** Branding Clients
**Primary Purpose:** Guide, organize, document, and manage the complete brand identity process without replacing the designer's existing creative tools.

---

# 1. Product Overview

The platform is a centralized workspace for graphic designers who create brand identities.

It guides the designer through the branding process from **initial client discovery through final brand delivery**, while providing tools for organization, decision support, accessibility, client collaboration, asset management, and brand book creation.

The platform does **not** attempt to replace professional creative software such as Illustrator, Photoshop, InDesign, Figma, Canva, or After Effects.

Instead:

> **Creative tools are where the work is made.
> This platform is where the brand lives.**

Designers can create work wherever they are most comfortable and bring those assets into the platform.

The platform then connects those assets to the larger brand system, client approvals, project decisions, guidelines, and final brand book.

---

# 2. Problem Statement

Brand identity projects involve far more than designing a logo.

A designer may need to manage:

* Client discovery
* Strategy
* Research
* Creative direction
* Moodboards
* Logo concepts
* Logo revisions
* Typography
* Color
* Accessibility
* Brand applications
* Client feedback
* Approvals
* File management
* Version control
* Brand guidelines
* Final documentation
* Client delivery

These activities are often spread across numerous applications.

A typical workflow might involve:

* Google Forms for questionnaires
* Email for communication
* Notion for notes
* Illustrator for logos
* Photoshop for mockups
* InDesign for brand books
* Figma for digital work
* Google Drive for assets
* Dropbox for delivery

The designer becomes responsible for mentally connecting all of these systems.

This creates unnecessary:

* Cognitive load
* Decision fatigue
* Context switching
* Organizational overhead
* Repetitive work
* Forgotten steps
* Scattered information
* Client communication problems

The platform addresses this by bringing the **workflow around the design** into one connected environment.

---

# 3. Product Vision

Create the central operating system for professional brand identity projects.

The platform should help a designer answer five questions at any point:

### 1. What am I doing?

The current stage of the branding process.

### 2. Why am I doing it?

The strategy, client responses, and decisions that inform the current stage.

### 3. What have I already decided?

A persistent record of brand decisions.

### 4. What happens next?

A clear next step rather than an overwhelming blank canvas.

### 5. Where does everything belong?

A centralized system for assets, approvals, guidelines, and documentation.

---

# 4. Product Principles

## Principle 1: Don't Replace Creative Tools

The platform should complement existing design software.

Designers can continue using:

* Adobe Illustrator
* Adobe Photoshop
* Adobe InDesign
* Figma
* Canva
* After Effects
* Other creative applications

The platform manages the **brand workflow**, not every possible design task.

---

## Principle 2: Reduce Mental Load

The interface should minimize the amount of information a designer has to hold in working memory.

The system should:

* Break large projects into smaller steps
* Clearly identify the current stage
* Show what has been completed
* Identify what remains
* Preserve previous decisions
* Surface relevant information at the appropriate moment
* Avoid unnecessary choices
* Provide sensible defaults
* Prevent users from needing to repeatedly enter the same information

---

## Principle 3: Designer Remains the Decision Maker

The platform should provide guidance, not dictate creative outcomes.

It can say:

> "This color combination does not meet the selected accessibility standard."

It should not say:

> "This is the color you must use."

The designer maintains creative control.

---

## Principle 4: The Brand System Should Remember

Information entered early in the project should inform later stages.

For example:

**Brand personality:**

* Warm
* Playful
* Trustworthy
* Approachable

When the designer reaches typography, those attributes can be surfaced as context.

When the designer reaches color, they can be surfaced again.

The platform should continually connect **strategy → decisions → design → applications**.

---

## Principle 5: The Brand Book Is the Output, Not the Brand

The platform should distinguish between:

**Brand System**

and

**Brand Book**

The brand system contains the actual information and assets.

The brand book is a curated presentation of that system.

This means a designer can continue updating the brand after the original brand book has been completed.

---

# 5. Target Users

## Primary User: Brand Designer

A graphic designer who develops brand identities for clients.

They may be:

* Freelance designers
* Independent brand designers
* Small design studios
* Creative agencies
* In-house brand designers

Particularly valuable for designers who struggle with:

* Executive functioning
* Organization
* Decision fatigue
* Project overwhelm
* Context switching
* Keeping track of complex workflows

The product should **not** imply that these users are incapable of designing.

The problem is managing the complexity surrounding the creative work.

---

## Secondary User: Client

The client interacts with the project through a simplified client portal.

They need to:

* Complete questionnaires
* View project information
* Communicate with the designer
* Review work
* Provide feedback
* Approve elements
* View the completed brand book

Clients should not need to understand the designer's internal workflow.

---

# 6. Core User Journey

The primary workflow is:

**Create Project**

↓

**Client Questionnaire**

↓

**Discovery & Strategy**

↓

**Creative Direction**

↓

**Design Development**

↓

**Client Review**

↓

**Revision**

↓

**Approval**

↓

**Brand System Development**

↓

**Brand Applications**

↓

**Brand Book**

↓

**Client Delivery**

↓

**Ongoing Brand Management**

---

# 7. Dashboard

The designer's dashboard should provide an overview of all active projects.

Each project should display:

* Client
* Project name
* Project status
* Current workflow stage
* Completion percentage
* Upcoming action
* Outstanding client actions
* Outstanding designer actions
* Recent activity
* Approval status

### Example

**Sparrow's Promise**

Brand Identity

**Stage:** Logo Development
**Progress:** 54%

**Next Step:** Review logo concepts

**Waiting on Client:** Logo concept approval

---

# 8. Project Workspace

Each project becomes a centralized workspace.

Primary sections:

1. Overview
2. Questionnaire
3. Strategy
4. Creative Direction
5. Logo
6. Typography
7. Color
8. Imagery
9. Supporting Elements
10. Applications
11. Assets
12. Approvals
13. Client Portal
14. Brand Book
15. Project History

---

# 9. Guided Branding Workflow

This is the core feature.

The platform provides a structured sequence of stages.

The exact stages should be configurable, but the default workflow should include:

### Stage 1: Client Discovery

Collect:

* Business information
* Goals
* Audience
* Competitors
* Brand history
* Existing identity
* Preferences
* Challenges
* Desired perception

---

### Stage 2: Brand Strategy

Document:

* Mission
* Vision
* Values
* Audience
* Positioning
* Differentiators
* Personality
* Brand attributes
* Desired emotional response

---

### Stage 3: Creative Direction

Establish:

* Visual direction
* Keywords
* Mood
* Design characteristics
* References
* Inspiration
* Things to avoid
* Moodboard

---

### Stage 4: Logo Development

Designer can document:

* Logo concepts
* Concept rationale
* Iterations
* Variations
* Client presentations
* Revisions
* Approved logo
* Logo versions

---

### Stage 5: Typography

Document:

* Primary typeface
* Secondary typeface
* Display type
* Body type
* Hierarchy
* Weights
* Sizes
* Usage
* Typography rationale

---

### Stage 6: Color

Connect to the dedicated color tool.

Document:

* Primary colors
* Secondary colors
* Accent colors
* Neutrals
* Background colors
* Text colors
* HEX
* RGB
* CMYK
* HSL
* Pantone where applicable
* Accessibility information

---

### Stage 7: Supporting Visual System

Document:

* Patterns
* Shapes
* Icons
* Illustrations
* Graphic elements
* Photography direction
* Image treatment
* Textures

---

### Stage 8: Brand Applications

Add real-world examples.

Examples:

* Business cards
* Mailers
* Brochures
* Packaging
* Social media
* Signage
* Apparel
* Presentations
* Websites
* Advertising
* Motion
* Environmental graphics

---

### Stage 9: Brand Guidelines

Define how the system should be used.

Examples:

* Logo clear space
* Minimum logo size
* Incorrect logo usage
* Color usage
* Typography hierarchy
* Photography direction
* Graphic element usage
* Application guidelines

---

### Stage 10: Brand Book

Compile the approved brand system into the final document.

---

# 10. Brand Decision Memory

A major differentiating feature.

The platform should maintain a **Decision Log**.

Each major decision can include:

**Decision:** Primary typeface
**Selection:** Typeface X
**Reason:** Approachable, modern, humanist
**Status:** Approved
**Approved By:** Client
**Date:** Date

The system should use these decisions as context later in the project.

This prevents the designer from repeatedly asking:

> "Why did I choose this?"

---

# 11. Color Palette Tool

The color tool should allow designers to create and manage palettes.

### Core Features

* Add colors
* Generate variations
* Name colors
* Assign color roles
* Save palettes
* Compare palettes
* Test combinations
* Check contrast
* Check accessibility
* Identify problematic combinations
* Suggest adjusted alternatives
* Document usage

### Accessibility

The system should test relevant color combinations against recognized accessibility standards.

The designer should be able to see:

**PASS**

or

**FAIL**

along with the relevant contrast information.

The tool should suggest potential adjustments while allowing the designer to maintain creative control.

---

# 12. Asset Library

The Asset Library is the central repository for the project's brand materials.

### Categories

* Logos
* Fonts
* Colors
* Photography
* Illustrations
* Icons
* Print
* Digital
* Motion
* Mockups
* Templates
* Packaging
* Signage
* Other

### Asset Information

Each asset may contain:

* Name
* Category
* Description
* Version
* Date
* Status
* Usage
* Related guideline
* Approval status
* Source
* File type
* Dimensions

---

# 13. External Asset Integration

Designers should be able to upload finished work created elsewhere.

Supported examples include:

* Business cards
* Letterhead
* Mailers
* Flyers
* Brochures
* Posters
* Social graphics
* Packaging
* Signage
* Mockups
* Motion graphics
* Video
* Presentations
* Website graphics
* Email signatures
* Advertisements
* Photography
* Illustrations

The platform should **not require these assets to have been created inside the application.**

---

# 14. Brand Book Builder

Two primary modes.

## Mode A: Automated Brand Book

Designer selects a template.

The system populates it using existing project information.

For example:

**Cover**

↓

**Brand Overview**

↓

**Brand Strategy**

↓

**Logo**

↓

**Logo Variations**

↓

**Logo Usage**

↓

**Color**

↓

**Typography**

↓

**Imagery**

↓

**Supporting Graphics**

↓

**Applications**

↓

**Guidelines**

The designer reviews and edits the generated book before delivery.

---

## Mode B: Custom Brand Book Builder

Designer creates a brand book from scratch.

Features:

* Drag-and-drop page building
* Page templates
* Text
* Images
* Assets
* Color blocks
* Typography
* Brand data
* Custom layouts
* Page duplication
* Reordering
* Section creation
* Saved layouts
* Reusable templates

---

# 15. Custom Template System

Designers should be able to save their own brand book structures.

For example:

**Nichol's Brand Book Template**

Then a new project could automatically start from that structure.

The system could populate the template with the new project's:

* Logo
* Colors
* Fonts
* Guidelines
* Assets
* Applications
* Strategy

This turns repetitive documentation into a reusable workflow.

---

# 16. Client Portal

The client receives a simplified interface.

### Client can:

**Complete**

* Questionnaire

**Communicate**

* Message designer

**Review**

* Concepts
* Directions
* Assets
* Brand elements

**Approve**

* Logo
* Color
* Typography
* Other defined milestones

**Request Changes**

* Provide feedback
* Comment on presented work

**View**

* Final brand book
* Approved assets
* Project information

---

# 17. Client Approval System

Each approval should create a record.

Example:

**Logo Concept**

Status: Approved

Approved by: Client
Date: August 4, 2026

This should prevent confusion about which version was approved.

The system should maintain version history rather than simply replacing old files.

---

# 18. Client Communication

Project-specific messaging should remain attached to the project.

The designer should be able to distinguish:

* General messages
* Feedback
* Approval requests
* Revision requests
* Questions
* Project updates

This prevents important decisions from disappearing inside email threads.

---

# 19. Brand Book Client View

The final brand book can be presented as:

* Online interactive brand guide
* Downloadable document
* Client portal resource

The client should be able to access the approved brand system after project completion.

---

# 20. Brand System as a Living Document

The project does not necessarily end when the brand book is delivered.

The designer can return later and add:

* New assets
* New applications
* New campaigns
* New templates
* New guidelines
* New brand extensions

The system should distinguish between:

**Brand Book Version 1.0**

and

**Current Brand System**

This allows the brand to evolve without losing historical documentation.

---

# 21. Executive Function Support

This should be built into the UX rather than marketed as an afterthought.

### Reduce Choices

Avoid presenting dozens of options at once.

### Clear Next Action

Every project should have a visible next step.

### Progress Visibility

Show:

**Completed → Current → Next**

### Save Decisions

Never make the designer remember a decision already made.

### Contextual Prompts

Surface relevant information when it becomes useful.

### Prevent Forgotten Steps

Incomplete required items should be visible before the project advances.

### Flexible Workflow

Allow designers to go backward or jump ahead when appropriate.

### Pause and Resume

The designer should be able to leave a project and return without needing to reconstruct where they were.

---

# 22. Design Decision Assistant

This is a future-facing feature that could become one of the product's strongest differentiators.

The system can surface existing project information during design decisions.

For example:

> **Brand Personality**
>
> Warm
> Approachable
> Trustworthy
> Playful

Then:

> **Typography Consideration**
>
> Does the selected typeface reinforce the characteristics established during strategy?

The system shouldn't automatically make the decision.

It should help the designer **evaluate their own decision against the established strategy.**

---

# 23. Consistency Checking

Eventually, the system should be able to compare assets against the established brand system.

For example:

**Asset:** Business Card

Potential issue:

> The blue used in this asset does not match the approved primary brand color.

Or:

> This typeface is not currently listed in the approved typography system.

Or:

> This color combination does not meet the selected accessibility requirement.

The system acts as a **second set of eyes**, not an autonomous designer.

---

# 24. Project Status System

Projects should have clear statuses.

Example:

* Setup
* Questionnaire
* Discovery
* Strategy
* Creative Direction
* Concept Development
* Client Review
* Revisions
* Approval
* Brand Development
* Brand Book
* Final Review
* Completed
* Archived

---

# 25. Search

Global project search should eventually allow designers to search across:

* Clients
* Projects
* Assets
* Brand elements
* Decisions
* Messages
* Approvals
* Brand books

---

# 26. Notifications

Notifications should include:

### Designer

* Client completed questionnaire
* Client sent message
* Client requested revision
* Client approved element
* Client hasn't responded
* Project milestone approaching

### Client

* Questionnaire requested
* New concept available
* Approval requested
* Designer responded
* Brand book available

---

# 27. Permissions

### Designer

Full project control.

### Client

Limited project access.

Client should only see what the designer chooses to make available.

### Future: Team Member

Could support:

* Designer
* Creative director
* Project manager
* Copywriter
* Other collaborators

---

# 28. MVP

The first version should **not attempt to build everything**.

The MVP should prove the central workflow.

### MVP Feature Set

#### Project Management

* Create project
* Client information
* Project dashboard
* Workflow stages
* Progress tracking

#### Questionnaire

* Create/send questionnaire
* Client completes questionnaire
* Responses automatically attach to project

#### Guided Workflow

* Step-by-step brand workflow
* Strategy
* Creative direction
* Logo
* Typography
* Color
* Applications
* Brand guidelines

#### Brand System

* Logo library
* Typography
* Colors
* Supporting elements
* Decision log

#### Color Tool

* Palette creation
* Color roles
* Contrast testing
* Accessibility checks

#### Asset Library

* Upload assets
* Categorize assets
* Mark assets as approved
* Add assets to brand book

#### Client Portal

* Questionnaire
* Messaging
* Review
* Approval

#### Brand Book

* Select template
* Automatically populate
* Edit
* Export

This would already be a substantial product.

---

# 29. Phase 2

After the core workflow works:

### Brand Book

* Custom page builder
* Custom templates
* Reusable layouts
* Advanced asset placement

### Client Collaboration

* Comments
* Element-level feedback
* Approval history
* Revision rounds

### Brand System

* Advanced asset relationships
* Version history
* Brand consistency checks

### Designer Workflow

* Custom workflows
* Custom questionnaire templates
* Saved project templates

---

# 30. Phase 3

More advanced capabilities:

* AI-assisted decision support
* Automated brand consistency checking
* Intelligent accessibility recommendations
* Automated brand book organization
* Asset tagging
* Smart search
* Brand system health checks
* Brand evolution/versioning
* Advanced integrations with creative tools
* Team collaboration
* Agency management

---

# 31. Non-Goals

The platform should **not** initially attempt to become:

* A replacement for Illustrator
* A replacement for Photoshop
* A replacement for InDesign
* A replacement for Figma
* A replacement for After Effects
* A general-purpose photo editor
* A full video editor
* A general-purpose social media design tool

The product should remain focused on the **branding workflow and brand system**.

---

# 32. Success Metrics

The product should measure whether it actually reduces friction.

### Workflow

* Time from project creation to completed brand book
* Percentage of projects completed
* Percentage of workflow stages completed
* Number of forgotten/incomplete required items

### Designer Experience

* Time spent managing project administration
* Number of context switches
* Designer-reported mental load
* Designer-reported decision fatigue
* Number of repeated data entries

### Client Experience

* Questionnaire completion rate
* Approval turnaround time
* Feedback completion rate
* Client portal usage
* Client satisfaction

### Product Usage

* Number of assets uploaded
* Number of brand books generated
* Number of templates reused
* Number of projects per designer
* Number of returning designers

---

# 33. Key UX Requirement

The application should never feel like another project management system the designer has to maintain.

That is critical.

If the platform creates more administrative work than it removes, it defeats the purpose.

The UX should constantly ask:

> **Can the system remember this for the designer?**

> **Can this information be automatically reused?**

> **Can this decision be connected to something already established?**

> **Can this step be simplified?**

> **Can the designer see what matters right now without seeing everything at once?**

---

# 34. The Core Product Architecture

At a conceptual level:

```text
                         CLIENT
                           │
                           ▼
                    CLIENT PORTAL
                           │
                 Questionnaire / Feedback
                 Approvals / Communication
                           │
                           ▼
                    BRAND PROJECT
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
    STRATEGY          DESIGN SYSTEM        ASSET LIBRARY
       │                   │                   │
       │          ┌────────┼────────┐          │
       │          ▼        ▼        ▼          │
       │        LOGO     COLOR     TYPE        │
       │                   │                   │
       │            Accessibility              │
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
                   BRAND APPLICATIONS
                           │
             External Creative Tools
                           │
                           ▼
                     BRAND SYSTEM
                           │
                           ▼
                    BRAND BOOK BUILDER
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
           Auto Template        Custom Builder
                 │                   │
                 └─────────┬─────────┘
                           ▼
                     FINAL BRAND BOOK
                           │
                           ▼
                      CLIENT PORTAL
```

---

# 35. The Most Important Product Relationship

The platform should establish this relationship:

**Strategy informs Design.**

**Design informs the Brand System.**

**The Brand System informs Applications.**

**Applications demonstrate the Brand System.**

**The Brand Book documents the entire system.**

And the client is connected to the process through:

**Questionnaire → Review → Feedback → Approval → Delivery**

---

# 36. Product Positioning

The simplest explanation of the product is:

> **A brand design workflow platform that helps designers take a project from client discovery to completed brand system and brand book, while keeping strategy, decisions, assets, approvals, and client communication connected in one place.**

Shorter:

> **The workspace where a brand comes together.**

Or, for the core philosophy:

> **The creative tools are where the work is made. Your brand lives here.**

---

# 37. The Product's Real Differentiator

The individual features are useful.

But the strongest part of the product isn't the questionnaire.

It isn't the color checker.

It isn't the client portal.

It isn't even the brand book builder.

**It's the connection between them.**

A client answer from the questionnaire can influence strategy.

Strategy can influence creative direction.

Creative direction can influence logo, color, and typography.

Those decisions can be remembered by the system.

The approved system can be connected to uploaded applications.

Those applications can automatically become available to the brand book.

The brand book can be generated from the accumulated project information.

The client can review and approve the work throughout the process.

And the completed brand system remains available after the project is finished.

That is the product.

**You're building a connected brand-development ecosystem rather than another isolated design tool.**

---
---

# Brand Platform — Expansion Spec
### Turning the 8 improvement areas into build-ready detail

---

## 1. The Connection Mechanism (the actual differentiator)

The core insight from Section 37 only works if there's a real data structure behind it. Here's the mechanism:

### Tag every entity with the same vocabulary

Every strategy attribute, typeface, color, and asset gets scored against a shared set of dimensions — not free text, but a small fixed vocabulary so things are actually comparable:

| Dimension | Scale |
|---|---|
| Formality | casual ←→ formal |
| Energy | calm ←→ energetic |
| Warmth | cold ←→ warm |
| Weight | light ←→ bold |
| Era | classic ←→ modern |

A strategy attribute like "warm, playful, approachable" gets translated (by the designer, with the system suggesting defaults) into target values on these five scales. Every typeface, color, and pattern in the system carries the same five values — either pre-tagged in a reference library (fonts especially — this is very doable for a curated starter set of ~200 fonts) or manually tagged when uploaded.

### The nudge, computed

```
similarity_score = 1 - (euclidean_distance(strategy_target, asset_tags) / max_distance)
```

When a designer selects a typeface, the system shows:

> This choice scores 82% aligned with your strategy attributes (warm, playful). Weight leans slightly more formal than your target — worth a second look, not a blocker.

That's it. No AI needed for v1 — it's a distance calculation over five numbers. This is the mechanism that makes Decision Memory *active* instead of a static log.

### Schema (Supabase/Postgres)

```sql
create table strategy_attributes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  label text not null,               -- "warm", "playful"
  formality numeric(3,2),            -- 0.00–1.00
  energy numeric(3,2),
  warmth numeric(3,2),
  weight numeric(3,2),
  era numeric(3,2),
  created_at timestamptz default now()
);

create table brand_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  token_type text not null,          -- 'typeface' | 'color' | 'pattern' | 'imagery'
  name text not null,
  formality numeric(3,2),
  energy numeric(3,2),
  warmth numeric(3,2),
  weight numeric(3,2),
  era numeric(3,2),
  source text,                       -- upload path, font name, hex, etc.
  created_at timestamptz default now()
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  stage text not null,               -- 'typography' | 'color' | 'logo' | etc.
  decision_label text not null,      -- "Primary typeface"
  selected_token_id uuid references brand_tokens(id),
  rationale text,
  alignment_score numeric(3,2),      -- computed at time of decision
  status text default 'proposed',    -- proposed | approved | revised
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz default now()
);
```

`decisions` is the join table everything else hangs off — get this one right early, since consistency checking (item 4 below) and the brand book auto-population both read from it.

---

## 2. Executive-Function Support — concrete features, not principles

| Principle from the doc | Concrete feature |
|---|---|
| Reduce choices | **Focus Mode** — a view toggle that collapses the sidebar to only the current stage; everything else greys out and requires a deliberate click to expand |
| Clear next action | A single persistent "Next" card pinned to the top of every project view — one action, one button, never a list |
| Preserve decisions | Decision Memory (above) surfaced as a small pill next to any relevant field: "You said warm/playful — see how this compares" |
| Prevent forgotten steps | A stage can't be marked complete with required fields empty, but *incomplete is never blocking* — designer can jump ahead and a soft badge follows the gap |
| Pause and resume | **"Where you left off"** — on project open, one line: *"You were reviewing Logo Concept 3 — client hasn't responded yet."* Not a dashboard, a sentence. |
| — (new) | **Frictionless capture** — a global quick-add (keyboard shortcut, floating button) that takes an unstructured note/image/link from anywhere in the app and drops it in an "Inbox" attached to the project. Designer files it into the right stage later, when they have bandwidth — capturing the thought costs zero categorization effort in the moment. |
| — (new) | **Non-punitive overdue language** — no red badges/exclamation marks for waiting-on-client items. Use neutral, low-arousal copy: *"Still waiting on: logo approval (5 days)"* in muted grey, not alert red. Anxiety-provoking UI actively works against the exact audience this product serves. |
| — (new) | **Undo everywhere** — every destructive or reordering action gets a 5-second undo toast rather than a confirmation dialog. Confirmation dialogs are a decision; undo is not. |

---

## 3. Bridge to Existing Creative Tools

Manual upload-only is the weak point given Principle 1 explicitly says "don't replace Illustrator/Photoshop/Figma."

**Given your existing Adobe MCP access, the fastest real bridge:**

- An "Add to Brand Project" action inside Adobe apps (via the Adobe for Creativity connector you already use) that pushes a selected asset straight to the Asset Library with category + basic metadata pre-filled from the file (dimensions, type, source app).
- For Figma: a lightweight plugin that does the same — select frame → push to project → auto-tagged as "Digital Application."
- Both write directly into the `brand_tokens` / asset table with `source_app` recorded, so later consistency checks know provenance.

This turns the platform from "one more tab" into "the place things land automatically while I keep working where I already work" — which is the actual promise in Section 1.

---

## 4. Consistency Checking — move to Phase 2, it's just a diff

No AI required for the first version. Given the `decisions` and `brand_tokens` tables above, this is a rules pass that runs whenever a new asset is uploaded:

```sql
-- Pseudocode logic, run on asset upload
1. Extract dominant colors from uploaded asset (simple pixel sampling)
2. Compare against approved decisions.selected_token_id where token_type = 'color'
3. If distance > threshold → flag: "Color X doesn't match your approved palette"
4. Extract embedded font metadata if available (PDF/vector files carry this)
5. Compare against approved typography decisions
6. If contrast between any flagged color pair fails WCAG AA → flag with the ratio
```

Output is a non-blocking banner on the asset card:

> ⚠ This business card uses #2E5C8A — your approved primary is #1B4C7E. Close, but not a match.

Same "second set of eyes, not an autonomous designer" framing the doc already commits to in Section 23 — this is just making it cheap enough to ship early instead of deferring to Phase 3's AI-assisted version.

---

## 5. Trimmed MVP

The original MVP (Section 28) is nearly the full product. A ruthless first slice that still proves the core thesis:

**Cut to this:**

1. Create project + basic client info
2. One collapsed workflow: **Strategy → Typography → Color → Logo** (skip the full 10-stage sequence for v1)
3. Decision Log (the `decisions` table, populated manually through simple forms)
4. Color tool: palette + contrast checker only (skip variation generation for v1)
5. Auto-populated brand book from just those four stages, one template
6. Client portal: view + single approve/reject button (skip granular commenting for v1)

**Explicitly deferred to Phase 1.5:**

- Full questionnaire builder (start with one fixed intake form)
- Asset Library categories beyond "Logo / Color / Type / Applications"
- Multiple brand book templates

The goal of this slice: prove that a decision made in Strategy visibly and usefully shows up again in Typography and Color. If that loop doesn't feel valuable in the smallest possible version, no amount of additional stages fixes it.

---

## 6. Business Model — options to decide between

| Model | Who pays | Fits when |
|---|---|---|
| Per-seat subscription | Designer | Simple, predictable, standard SaaS — good default |
| Per-project fee | Designer, per active project | Matches freelance cash flow (pay when you land a client) better than a flat monthly fee |
| Tiered by project count | Designer | Studios with many concurrent projects pay more; solo freelancers stay cheap |
| White-label portal upcharge | Designer, optional add-on | Client-facing portal branded to the designer's studio instead of the platform — premium tier, meaningfully increases perceived professionalism for the designer's own clients |

**Recommendation given the target user (freelancers/small studios with executive-function challenges):** per-project pricing with unlimited seats removes a second recurring bill to track, which matters for exactly the audience this product is trying to reduce cognitive load for. White-label as a $X/mo add-on is the natural upsell once a studio has repeat volume.

This decision also determines whether the client portal shows "Powered by [Platform]" — worth locking down before building the portal's visual chrome.

---

## 7. The Delivery Moment — designed, not defaulted

Currently: a status flips to "Completed" and the portal updates. For a designer, this is the moment referrals get decided and the client's felt experience of the whole engagement peaks or falls flat.

**Concrete delivery flow:**

1. Designer marks brand book "Ready to Deliver" — triggers a *preview* state, not immediate publish
2. A short designer-written note field: "A message to include with delivery" (pre-filled with a warm default the designer can edit/skip)
3. Client receives a dedicated reveal page — not just an updated portal tab — with the brand book presented full-screen, a short intro animation/transition (not gimmicky, just: don't dump them straight into a static PDF-like view)
4. After viewing, client sees a simple prompt: "Anything else you'd like the designer to know?" — captures a testimonial/reaction in the same moment, which the designer can later reuse for their own marketing (with permission)
5. Designer gets a notification the moment the client views it — the reveal is witnessed, not silent

This costs relatively little to build (mostly a dedicated route + a transition) but directly serves the emotional high point of the relationship, which the current spec treats as incidental.

---

## Summary — priority order if built sequentially

1. **Decision/token schema** (Section 1) — everything else depends on this existing correctly
2. **Trimmed MVP** (Section 5) — smallest loop that proves the schema is worth having
3. **Executive-function features** (Section 2) — cheap, high-impact, no dependencies
4. **Consistency checking** (Section 4) — near-free once the schema exists
5. **Creative tool bridge** (Section 3) — bigger lift, biggest retention driver
6. **Delivery moment** (Section 7) — polish, but disproportionately high emotional ROI
7. **Business model** (Section 6) — decide early even if implementation comes later, since it shapes the portal UI
