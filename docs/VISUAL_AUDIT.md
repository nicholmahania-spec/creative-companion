# Master Visual Design + Art Direction Audit

**Creative Companion v3.51.5** · audited 2026-08-07 · light + deep themes, 1440px and 390px
**Scope:** form, not function. Nothing in the application was modified.

Screens inspected in a running build: lock screen, Home/Studio (light + deep), Desk, Strategy,
Research, Identity, Touchpoints, Assets, Settings, Clients, Tools menu, Brand Book Builder,
Review, Timer, Asset Library, Ideate, mobile Home, mobile nav.

---

## 0. The one-paragraph verdict

Creative Companion is **structurally further along than it looks**. Someone has already done the
hard, unglamorous work: the radius ramp was collapsed from 39 values to 3, the spacing ramp from
229 padding values to 7 steps, `--text-muted` was repaired from a 2.58:1 failure to 5.28:1, and
the CSS carries honest comments explaining each fix. That is a real design system underneath.

But the product does not look like that, because a late layer of `!important` overrides sits on
top of it and repaints every button in the application with a **7-stop spinning rainbow conic
gradient**. This single decision is doing more damage to perceived quality than every other issue
in this document combined. Below it sit three genuine structural problems — duplicated
navigation on every path page, catastrophic column imbalance on the two most important screens,
and a Brand Book Builder that is visually a different product. Fix those four things and this
goes from "assembled" to "art-directed" without touching the token layer at all.

**Would I believe this was professionally designed?** Today: no. The rainbow reads as unfinished
in a way that overrides everything else a viewer might notice. But the distance to "yes" is
much shorter than it appears, and most of it is subtraction.

---

# PART I — WHAT'S ACTUALLY THERE

## Phase 1–2 · Application sweep and visual inventory

**Path (5 stops):** Strategy → Research → Identity → Touchpoints → Assets
**Tools:** Brand book, Asset library, Timer, Ideate, Review, Share form, Export, Hours & invoice, Discovery brief
**Chrome:** header, left sidebar (Studio / Projects / This project), path subnav, footer
**Surfaces:** Home/Studio dashboard, Desk, Clients, Client record, Calendar, Settings, Login/lock,
New project intake, public client portal routes

**Component vocabulary in use:** card panel, eyebrow label (caps, tracked), section rule,
field input, textarea, radio row, checkbox column, bipolar 5-dot scale, segmented control,
toggle switch, button (primary / secondary / outline / ghost), underlined link row, disclosure
`<details>`, modal overlay, floating pill, progress dots, colour swatch strip, artboard preview,
document thumbnail, monospace file tree, day-initial week strip.

That is a **large** component surface for a solo product — and a lot of it is one-off.

---

# PART II — THE DESIGN SYSTEM AUDIT

## Phase 3 · Colour

### What's working

The token layer is genuinely well-reasoned. Roles are named semantically (`--bg-canvas`,
`--text-secondary`, `--border-subtle`), light-only hex values are called out as a hazard, and the
comments record *why* each value is what it is. Contrast on the values that matter passes:

| Pair | Ratio | Verdict |
|---|---|---|
| `--text-muted` #6B6B73 on white | 5.28:1 | PASS AA |
| `--text-muted` on canvas #F5F5F5 | 4.84:1 | PASS AA |
| `--dopamine` #5B42F3 plate + white label | 5.97:1 | PASS AA |

### Problems

**C1 · Success and warning are grey.** `--success: #808080` and `--warning: #A7A7A7` are
literally neutral greys. A semantic status palette with no semantics. Worse, there are now *two*
success colours in the same `:root` — grey `--success` and green `--positive: #15803D` /
`--accent-growth: #15803D` — so "this went well" is grey in form validation and green everywhere
else. `--warning` at 2.41:1 also fails AA outright.

**C2 · Three unrelated accents, no system.** Purple `#5B42F3` (chrome CTAs), teal `#0F766E`
(brand default), and an orange `#C87A4A` that appears only on the Brand Book Builder's primary
button and exists as no token at all. Three accents is not a palette; it's three decisions made
on three different days.

**C3 · The rainbow.** Seven hard-coded hex values — `#ff006e #8338ec #3a86ff #00ddeb #06d6a0
#ffbe0b` — appear in the conic gradient, outside the token system entirely, repeated verbatim in
**8 separate rules**. Covered in full in Phase 7.

**C4 · Accent used with no semantic purpose.** The footer renders `v3.51.5` in `--dopamine`
purple. The version number is the most colourful text in the footer. In deep theme it is also the
lowest-contrast text on the page.

**C5 · Deep theme has no elevation language.** With every shadow token set to `none` and card
(#141414-ish) sitting on canvas (#0B0B0B-ish) with a barely-visible border, cards read as ghost
rectangles. Light theme gets away with `none` because white-on-grey separates itself; dark does
not.

---

## Phase 4 · Typography

### What's working

One family (Plus Jakarta Sans), actually loaded, actually specified — with a comment recording
that Inter used to lead the stack while never being loaded. A 6-step `rem` ramp exists. `--measure:
65ch` exists.

### Problems

**T1 · The ramp is not being used.** 84 distinct `font-size` values ship. `--fs-1`/`--fs-2` are
used 224 times — but raw values outnumber them in aggregate: `0.75rem` ×51, `0.78rem` ×46,
`0.72rem` ×47, `0.8rem` ×39, `0.8125rem` ×38, `0.85rem` ×31, and on down. `0.78rem` and `0.8rem`
and `0.8125rem` are three sizes that are visually identical and mathematically different.

**T2 · 244 uses of type below the stated floor.** The token block says "`--fs-1` is the floor and
nothing should go below it." Shipping today, below 0.75rem: `0.72` `0.7` `0.68` `0.65` `0.62`
`0.6` `0.58` `0.55` `0.5` `0.5625` `0.4375` **`0.4rem`** — that last one is **6.4px**.

> **Refinement (verified after first publication).** The very smallest of these are not interface
> text. `0.4rem` and `0.4375rem` live in `.stationery-letterhead-footer` and `.bbb-lockup__mark` —
> inside a 220px letterhead thumbnail and a brand-book lockup cell, where small type is
> *representing* small type at reduced scale. That is a legitimate scale model, and raising it
> would break the model. The real defect there is that **the preview is too small**, which is a
> layout problem (Phase 5b, and roadmap Phase 4 #14), not a type-ramp problem.
>
> Genuinely sub-floor **interface** text was narrower and has been fixed: `.buddy-kit-meta`,
> `.bf-status`, `.role-rgb` / `.role-cmyk` and `.progress-ring-label` at 0.58rem (9.3px), plus
> mobile `.cal-event` at 0.55rem (8.8px). All now resolve to `--fs-1`.

**T3 · Everything is bold.** On the lock screen, the H1, the section labels, the body copy
("Work stays on this device…"), the field labels and the hint text are all 600–700. There is no
weight hierarchy, so the eye has no entry point. The same flatness recurs on Home: "Projects",
"Up next", "Due soon", "Client", "Ready to ship", "Hours worked" are all the same size and
weight as their own meta values ("1 open", "Quiet", "None").

**T4 · Clipped text.** Two confirmed instances: the Identity "Mark mistakes to avoid" textarea
cuts "Do not place on low-contrast photos" in half horizontally at its bottom edge; the Review
feedback row truncates its placeholder mid-word to "What you decided (optio". Both are
straightforward defects, both on screens a client-facing designer will use daily.

**T5 · Two placeholder conventions in one form.** Strategy mixes instruction-as-placeholder
("Trading name is fine", "A range is fine", "Two lines is plenty") with example-as-placeholder
("e.g. you@studio.com", "e.g. small-batch coffee roastery"). Guidance in the placeholder slot
disappears the moment the user types — which is precisely when a user with working-memory load
needs it.

**Could I recognise this product's typography as belonging to this product?** No. Plus Jakarta
Sans at 600 weight is the default voice of roughly every 2023–2026 SaaS product. There is no
display treatment, no distinctive tracking at scale, no editorial contrast anywhere except one
place — see Phase 12.

---

## Phase 5–6 · Spacing and alignment

**S1 · The whole Strategy form sits 26px off the page's own axis.** The H1 "Strategy" starts at
x=224. The `01 Your details` section rule also starts at x=224. But every label and every input
inside it is indented to x=250, because of the section's left rule plus padding. So the entire
40-field form is softly misaligned with the heading that introduces it, all the way down a
4,745px page. Nothing about it is obviously broken; it just never feels settled.

**S2 · Two content widths per page, no rationale.** Also on Strategy: the page header and its
"Send the brief" button run to x=1416; the form column stops at x=1120. That is a 296px
inconsistency between the header's right edge and the content's right edge, leaving a dead
gutter beside the form while the header spans the full width.

**S3 · Settings caps its content at ~895px** on a 1440px canvas, leaving ~320px permanently
empty — while `DESIGN_GRAMMAR.md` G1.2 explicitly requires full main width and warns against
exactly this ("never re-cap `.main` … or you get a dead gutter").

**S4 · Card heights are unmanaged.** On Home, the "Projects" card has ~90px of dead space beneath
its single row; "Due soon" and "Client" sit side by side at mismatched heights; "Ready to ship"
is orphaned in the left column with an entire empty grid cell to its right.

**S5 · Radio groups are 48px apart.** The three "Where are you starting from?" options are spaced
so loosely they read as three separate questions rather than one choice set.

---

## Phase 6b · Radius

The token block declares three radii and says so emphatically. **26 distinct `border-radius`
values ship.** Most resolve correctly to `var(--radius)` (240 uses), but the exceptions are the
tell: `var(--radius, 6px)` appears 6 times — a **6px fallback inside a 4px system** — and
`.field-input` is forced to `border-radius: 0 !important`, so every input in the app is square
while every card, button and panel is 4px. That is why the lock screen's fields read as bare
underlines while its button reads as a rounded plate: they are two different shape languages,
adjacent.

---

## Phase 6c · Shadows and depth

Every shadow token is `none`, and `.btn, .panel { box-shadow: none !important }` enforces it.
**In light theme this is correct and quietly sophisticated** — the app avoids the "everything
floats" failure mode entirely, and it should keep doing so.

One place where the absence hurts:
- **Deep theme** (C5 above) — nothing separates card from canvas.

> **Correction (verified after first publication).** An earlier draft of this audit reported the
> Tools modal scrim as clipped — sidebar and header undimmed, with a white notch at the bottom.
> That was an artefact of full-page screenshot capture: `position: fixed` elements only paint the
> viewport, so a scrim looks truncated in a tall stitched image. Measured at viewport size,
> `.export-overlay` is `inset: 0` at `z-index: 200` over a header at `z-index: 40`, and covers
> everything uniformly. **The scrim is correct.** The modal's lack of a shadow is real but reads
> fine against the scrim in light theme; only the deep-theme border point stands.

---

## Phase 6d · Iconography

This is the most concrete "unfinished" signal in the product.

- `lucide-react` and `@radix-ui/react-icons` are **both installed as dependencies and imported
  zero times.**
- Only **5 files** contain an inline `<svg>`.
- **27 distinct Unicode glyphs are used as icons, 154 times, across 26 files** — including four
  literal emoji: 🚀 💬 📋 📖.

The Tools menu shows the consequence in one frame: three real stroke icons (and the *same*
printer icon used for both "Brand book" and "Asset library" — two destinations, one glyph),
then `✦` `◎` `↗` `⬇` `$` `?` standing in for the other six. **A dollar sign and a question mark
are being used as icons.** They have different weights, different optical sizes, and different
baselines from each other and from the real icons above them.

The sidebar has the same split: Home, Calendar, Clients and Tools get real stroke icons; Settings
gets `⚙` and Desk gets `▦`. Two of seven nav items are typography pretending to be iconography.

> **Correction (verified after first publication).** Two parts of this finding were overstated,
> and the recommended fix was wrong.
>
> **The count.** Of the 154 glyph uses, most are legitimate typography, not fake icons: `→` (75)
> is a separator inside prose and labels ("Strategy → Research"), `✓` (18) is a checkmark in text,
> `★`/`☆` (19) are star ratings. The genuine icon-substitutes were the chrome glyphs — `⚙ ▦ ✦ ◎ ↗
> ⬇ ☰ ✕` plus ASCII `$` and `?` in the Tools menu and sidebar, and three emoji in the client
> inbox. About 14 sites, not 154 — but they were the *visible* ones, on the two surfaces a user
> touches most.
>
> **The fix.** The recommendation to adopt `lucide-react` was wrong. The app already has a
> coherent house icon set in `components/HeaderIcon.jsx` — custom-drawn, 24-box, 1.75 stroke,
> round caps — whose own header states the rule this finding is about ("Real icons, not emoji").
> Importing lucide would have introduced a *second* icon style beside it, which is the problem,
> not the cure. The set has been extended in the same idiom instead, and `lucide-react`,
> `@radix-ui/react-icons` and `@radix-ui/react-navigation-menu` — all three imported zero times —
> have been removed from the dependency tree.

---

# PART III — COMPOSITION AND HIERARCHY

## Phase 4b · Visual hierarchy, screen by screen

**Home/Studio — the same information three times.** "My project → NEXT → Strategy" appears in
the hero card, again in the "Projects" card ("My project / Next: Strategy"), and again in the
"Up next" card ("My project / CONTINUE / Strategy"). Three cards, one fact. `DESIGN_GRAMMAR.md`
G3 bans exactly this ("second map of the same chapters"), and the product's own Principle 2
("Reduce Mental Load") is undercut by tripling the reading for zero new information.

**Every path page carries its "next" action twice, in two visual languages.** Consistently:

| Page | Top-right (outline + rainbow) | Bottom-right (solid purple + rainbow) |
|---|---|---|
| Strategy | `Continue → Research` | `Next · Research` |
| Research | `Continue → Identity` | `Next · Identity` |
| Identity | `Continue → Words` | `Next · Words` |
| Review | — | `Next · Assets` |

> **Correction (verified after first publication).** An earlier draft called this a G1.3
> violation and recommended deleting the top CTA. That misread the grammar: G1.3 says *"One
> primary CTA per page job; path Next solid; **rail Continue secondary**"* — the pairing is
> deliberate and documented, and `App.jsx` carries a comment saying so ("Secondary: in-page Next
> is the solid primary"). The rail Continue should stay.
>
> What was actually wrong is that the rainbow ring made the secondary shout as loudly as the
> primary, so the intended hierarchy never landed. With the ring gone the solid primary clearly
> wins and the pairing reads correctly. The remaining defect is narrower and real: **the two
> controls use different separators for the same relationship** — `Continue → Research` against
> `Next · Research`. One vocabulary, one glyph.

Strategy additionally stacks `Send the brief` 70px below `Continue → Research`, both hairline
secondaries at near-identical weight. These are different kinds of action — one navigates, one
sends work to a client — and nothing in their treatment says so.

**Desk — two identical primaries.** "Open Strategy" appears as the artboard CTA *and* as the
rail's "What's next" CTA, both solid purple, both on screen simultaneously.

**Header hierarchy is inverted.** The `Working· just started` status pill (note the missing space
before the middle dot) carries a heavy black border that makes it the loudest object in the
header — louder than Account, louder than the wordmark. A status readout is outranking
navigation. G2 also asks for "words for status," not a clock-shaped chip.

**Settings — emphasis inverted.** Eleven rainbow-bordered buttons on one page, including a
**disabled** "Update" that still carries the full gradient. Meanwhile the DANGER zone's "Clear all
projects" and "Full reset" are the only borderless buttons on the page. **The two most
destructive actions in the application are its quietest controls.**

---

## Phase 5b · Information density and the empty-space problem

**Assets is the worst layout in the product**, and it is the last screen before a client handoff.
On a 1440px canvas the left column is a ~660px-wide box containing the text "Building your
preview…" and then roughly **3,500px of empty white**, while the entire page — twenty-plus stacked
panels — is crammed into a ~500px right column. Approximately **45% of the delivery screen is a
permanently empty rectangle.**

Inside that 500px column, with no grouping or rhythm: Still thin · Your studio · Download brand
book PDF · Handoff · Client package tree · Fonts · Licence · Files made elsewhere · Build client
package · Also open · Send it to your client · Page setup · Learned · Case study · Stationery ·
Address · Contacts · Letterhead · Business card · Envelope · Email signature · Extras · Leave.
That is a settings dump, not a delivery moment.

Two more things in that column:
- **The document previews are unreadable.** Letterhead, Envelope and Email signature — the actual
  artefacts this product exists to produce — render as ~130px grey thumbnails where the body copy
  is a 2px smear.
- **The file tree skips a number.** `01_BRAND_GUIDE` `02_LOGO` `03_COLOR` `04_TYPE` `06_PROJECT`.
  There is no `05`. In the one artefact the client actually receives.

**Research has the opposite problem.** The wall — the visual heart of the research stage — is an
empty 190px bordered strip with a sentence in it. It is not a drop target; there is no dashed
boundary, no invitation, no area. Below it, a *second* empty-state message says the same thing
again in a different style and alignment (one boxed and left-aligned, one unboxed and centred,
70px apart). The whole page occupies the top 570px of a 900px viewport.

**Review** repeats the imbalance: right column ends at y≈660, left continues to y≈1120, leaving
460px dead bottom-right.

**Strategy is a 4,745px uninterrupted scroll** containing roughly 40 fields, all rendered at the
same width, height, border and placeholder grey. The `01`–`05` sections are headings in a river,
not containers — nothing collapses. For a product whose stated primary user has executive-function
challenges, and whose own Principle 2 promises to "break large projects into smaller steps," this
is the single largest gap between what the product says and what it does.

---

## Phase 18 · Visual rhythm

The app has almost none. The dominant composition, on nearly every screen, is:

> H1 → rule → card → card → card → CTA

Every card is white, 4px, hairline-bordered, full-width or half-width, with the same internal
padding and the same `eyebrow / title / body / button` stack. Nothing is ever larger, darker,
full-bleed, image-led, or typographically different. There is no moment of scale contrast
anywhere in the five path stops.

The one exception proves it is achievable — see Phase 12.

---

# PART IV — THE HARD LOOK

## Phase 7 · What makes this look AI-generated

### 🔴 The spinning rainbow — the single biggest visual mistake

Every button variant in the application (`.btn-primary`, `.btn-secondary`, `.btn-outline`) is
overridden by an `!important` layer that applies a 7-stop conic gradient border and animates it:

```css
.btn-primary:not(.is-earned) {
  border: 3px solid transparent !important;
  background:
    linear-gradient(var(--dopamine-plate), var(--dopamine-plate)) padding-box,
    conic-gradient(from var(--btn-spin, 0deg),
      #ff006e, #8338ec, #3a86ff, #00ddeb, #06d6a0, #ffbe0b, #ff006e) border-box !important;
  animation: btn-spin-chrome 2.4s linear infinite;
}
```

Verified in the running app:

- It applies to **every button variant**, not just primary. Outline and secondary get it too, at
  2px instead of 3px.
- It is declared in **four separate places at four different speeds** — 2.4s, 2.4s, 3.2s, 2s.
  Confirmed live on the Timer view: two buttons spinning at 2.4s and 3.2s simultaneously, so
  buttons on the same screen are permanently out of phase with each other. That is why no two
  buttons in any screenshot show the same hue at the same corner.
- It runs **infinitely**, forever, on the highest-attention element of every screen.
- It fires on **disabled** buttons (Settings "Update", Assets "Business card → Download PDF"),
  so a control the user cannot press is among the most visually active things on the page.
- It contradicts the same file's own comment 5,000 lines earlier — *"Flat high-contrast dark slate
  fill — no gradients, no glow"* — and `DESIGN_GRAMMAR.md` G4.1, *"no gradient mesh atmospheres."*
- It gets dramatically worse in deep theme, where saturated cyan/magenta/amber on near-black reads
  as gamer-RGB peripheral lighting.

**Credit where due:** reduced-motion *is* handled correctly. `App.jsx` mirrors
`prefers-reduced-motion` onto a `data-reduce-motion` attribute, and I verified in a
reduced-motion browser context that the animation is fully suppressed. This is not an
accessibility failure. It is an art-direction failure — and it is the reason this product does not
look professionally designed.

### Other generic-SaaS tells

| Tell | Where | Verdict |
|---|---|---|
| Generic AI purple `#5B42F3` as the only CTA colour | Everywhere | **CHANGE** — it is the default accent of AI products, and it is not this product's brand |
| Everything inside a card | Home, Desk, Review, Settings | **CHANGE** — cards should mark a real boundary, not be the default container |
| Emoji as icons (🚀 💬 📋 📖) | 4 sites | **REMOVE** |
| Typographic characters as icons (`$` `?` `✦` `◎` `⬇` `↗` `⚙` `▦`) | 154 uses | **REMOVE** |
| Bare unstyled `<details>` disclosures | Assets (`▸ Page setup`, `▸ Extras`, `▸ Leave`), Review (`▸ Prompts`) | **CHANGE** — G2 explicitly bans critical controls inside bare `<details>`; "Leave" is a whole action hidden in one |
| Bold + underline + border on plain links | Desk, Assets, Review (3 screens, same pattern) | **CHANGE** — three emphasis mechanisms on one link reads as unstyled default HTML |
| Native browser date input | Strategy | **CHANGE** — alien text colour, padding and icon next to every other field |
| Raw internal IDs in UI | Brand Book Builder (`bbb-anchor-1`, `bbb-anchor-4`) | **REMOVE** |
| Truncated hex values | Brand Book Builder colour rows show `#1` `#6` `#A` `#F` | **FIX** |
| Zero-count scoreboards | "0 pins", "Gaps · 5 left" + "FIX · 5 GAPS", "Check all 21", "1 loose end" | **CHANGE** — G3 bans scoreboards; several screens show the same count twice in two formats |
| Progress as 5 unlabelled dots | Home project card | **CHANGE** — G2 asks for words, not fractions; dots are less legible than either |

### Phase 13 · The "designer was in the room" test

**Feels deliberate:** the flat no-shadow surface language, the 4px radius commitment, the muted-text
contrast repair, the Review direction sheet, the honest empty-state copy ("Nothing on the wall
yet"), the decision to name real objects (brief, wall, mark, pack, handoff).

**Feels like the framework's default:** browser radio buttons, browser date picker, browser
`<details>` triangles, browser checkbox columns, underlined anchors, the 5-dot bipolar scales,
the pale toggle switches, and the entire icon situation.

**Feels like a decision made at 2am:** the rainbow.

---

## Phase 8 · Responsive

Mobile (390px) is a **linear stack of the desktop cards** — same six cards, same order, same
padding, nothing recomposed. Specific defects:

- **The wordmark disappears entirely on mobile.** The header becomes a bordered hamburger box plus
  "Client" and "Account". The product's identity is absent from the screen a user sees most.
- **The segmented control wraps 4 + 1**, orphaning "All time" onto its own row.
- ~300px of dead space below the last card before the footer.
- The gradient border at this scale reads as a printing misregistration.

> **Correction (verified after first publication).** An earlier draft reported the floating "To-do"
> pill as overlapping the "Due soon" card. Same full-page capture artefact as the scrim above:
> `.todo-fab` is `position: fixed; right: 1.1rem; bottom: 1.1rem`, and measured in a 390×844
> viewport it sits at y=778 — correctly pinned to the bottom-right corner, over nothing.
> **There is no collision.**

## Phase 8b · The Brand Book Builder is a different product

Reached by one click from the Tools menu, and it is visually unrelated to everything around it:
near-black chrome panel, cream `#EDEAE3` canvas, and an **orange primary button** that exists
nowhere else in the application and as no token anywhere. The app's own light sidebar sits
directly against the builder's black panel with no transition. Two design systems, adjacent, in
one product — and this is the headline output the whole workflow builds toward.

Inside it: the "IN THIS BOOK" reorder list puts labels *to the right* of their buttons, misaligns
them, leaves two rows unlabelled, and prints raw anchor IDs where page names belong. The "NOT IN
THE BOOK YET" table right-aligns italic grey body copy against left labels so narrow that **every
single row wraps**. The second page preview is cut off by the viewport with no visible scroll
affordance.

---

## Phase 15 & 17 · Restraint — what should disappear

Ranked by how much each removal buys:

1. **The conic gradient and its animation.** Removes 8 rules, 42 gradient declarations' worth of
   noise, and the product's single largest credibility problem.
2. **The duplicate "next" CTA** on all five path pages. One nav affordance per page, not two.
3. **Two of the three "Strategy is next" cards** on Home.
4. **The `RES` / `IDE` / `TOU` / `ASS` abbreviation column** on the Desk rail — it prints a
   3-letter truncation of the word already displayed 200px to its left. It is pure noise, and one
   of the four abbreviations is unfortunate.
5. **The second empty-state message** on Research.
6. **The card wrapper** around single-sentence content (Research's drop hint, Review's notes).
7. **The purple on the footer version number.**
8. **The `Working· just started` pill's black border.**

## Phase 16 · The luxury test

What would most increase perceived quality, in order: **precise alignment** (fix S1 and S2 and the
whole app tightens without a single new pixel of decoration) → **weight hierarchy** (stop setting
body copy at 600) → **one accent, used rarely** → **real icons** → **scale contrast** (one large
moment per screen).

---

# PART V — IDENTITY

## Phase 9 · First impression

**Five seconds, cold:** *"A capable indie tool that hasn't had a designer yet."* The rainbow reads
first and reads as unfinished; the grey-on-grey cards read second and read as generic; the honest,
specific copy reads third and is the first thing that suggests real care.

**What it should feel like:** *quiet, precise, editorial, professional* — a studio instrument. The
kind of tool a brand designer is not embarrassed to have open when a client is looking over their
shoulder.

**What's causing the difference:** one decorative decision applied globally with `!important`, plus
an absence of scale contrast. Not the token system, which is fine.

## Phase 10 · Does it have a visual point of view?

Remove the logo and the name. Could you recognise this app? **No.** Plus Jakarta Sans 600, white
cards on cool grey, 4px radius, purple CTA — that is the shared default appearance of a large
category of products. The rainbow is distinctive, but distinctive is not the same as ownable; it
reads as an error rather than a signature.

## Phase 11 · Does the brand survive inside the interface?

The **voice** does, and it is the strongest asset the product has. "Nothing on the wall yet." "Two
lines is plenty." "Trading name is fine." "What you would not put in an email." "Never sent to the
client." "Still waiting on…" — this is a real, warm, specific, non-corporate register that
understands its user. `DESIGN_GRAMMAR.md` G9 is being honoured.

The **visual identity** does not survive at all. Nothing about the surfaces, shapes, colour
relationships or composition says what the copy says. There is a brand in the words and no brand
in the pixels.

## Phase 12 · Find the signature

There is one already, and it is good — it just isn't being used as one.

> **The Direction Sheet** on the Review screen: a solid black block, a tight tracked caps eyebrow,
> the brand name set large and confident, em-dash placeholders for unanswered fields, and palette
> roles listed with hex *and* CMYK in a monospace face.

It is the only place in the application with real scale contrast, real editorial confidence, and a
composition that looks authored rather than assembled. It looks like a page from a brand manual —
which is exactly what this product is for.

**Signature directions, in order of fit:**

**1. The Specimen Block** *(recommended — build on what exists)*
A recurring full-bleed black-or-brand-coloured plate with the project's own type and colour set
large. Appears as: the Desk artboard, each path stop's header, the project card on Home, the Brand
Book cover, the client reveal. Why it fits: the product's whole thesis is "your brand lives here" —
so the brand should be the largest object on every screen, not a 4px swatch strip in a corner.
Recognisable because *every project looks different in the same frame*.

**2. The Working Margin**
A persistent left margin column carrying only the eyebrow label and step number in small tracked
caps, with content in a generous measure beside it. Turns the current 26px accidental indent (S1)
into a deliberate editorial grid. Why it fits: it is how brand manuals are actually set, and it
gives the app a structural signature that costs nothing but alignment.

**3. Ink and Paper**
Commit to a two-surface world — true paper white for anything that represents client-facing
artefact, and a distinctly cooler working grey for tool chrome — so a designer can always tell at
a glance whether they are looking at *the work* or *the workspace*. Why it fits: this is the
product's stated core distinction (Brand System vs Brand Book) expressed as a visual rule.

**4. The Em-Dash Placeholder**
Already present on the Direction Sheet: unanswered fields render as `—` rather than empty or grey
"none". Small, but it makes incompleteness feel calm and intentional rather than like a gap — which
is precisely right for this audience. Promote it to a system-wide rule.

**5. Hairline Rules Instead of Cards**
Replace most card boundaries with single hairline rules and whitespace, reserving the card for
genuine containment. G6 already asks for this ("prefer whitespace + weight over borders"). Would
remove the "everything in a box" tell in one systemic change.

Directions 1 and 2 together would give this product a look nothing else has.

---

# PART VI — SCORING AND PRIORITIES

## Phase 25 · Screen-by-screen

| Screen | Score | Working | Biggest problem | Priority |
|---|---|---|---|---|
| **Assets / Deliver** | **2/10** | Client package concept is genuinely smart | 45% of screen permanently empty; 20+ ungrouped panels in a 500px column; unreadable artefact previews | 🔴 Critical |
| **Brand Book Builder** | **3/10** | The page preview itself is nicely set | Entirely different design system; raw anchor IDs in UI; every row of "NOT IN BOOK" wraps; truncated hex values | 🔴 Critical |
| **Lock / Login** | **3/10** | Honest, well-written security copy | Wordmark printed twice; decorative non-functional path chips; everything at 600 weight; rainbow button; 350px card on a 1440px screen | 🔴 Critical |
| **Strategy** | **4/10** | Excellent question writing; sensible 01–05 grouping | 4,745px unsegmented scroll; 40 identical fields; 3 competing CTAs; whole form 26px off axis | 🔴 Critical |
| **Home / Studio** | **4/10** | Clear next action exists | Same fact in 3 cards; orphaned card + empty grid cell; no weight hierarchy; "Studio"/"Home"/"Studio" name collision | 🟠 High |
| **Settings** | **4/10** | Sensible grouping; good danger-zone concept | 11 rainbow buttons incl. a disabled one; destructive actions are the quietest; two input styles; 320px dead gutter | 🟠 High |
| **Desk** | **5/10** | Genuinely useful density; artboard idea is right | 6 rainbow buttons; duplicate primary CTA; `RES/IDE/TOU/ASS` noise column; empty rail block | 🟠 High |
| **Identity** | **5/10** | Clean sub-step nav concept | A *design* stage with no design in it — five text inputs; clipped textarea; grey inputs contradict Strategy's white | 🟠 High |
| **Research** | **5/10** | Best empty-state copy in the app | The wall isn't a wall — 190px strip, no drop target; two empty states 70px apart; page fills top 60% only | 🟠 High |
| **Review** | **6/10** | **Direction Sheet is the best thing in the app** | Truncated placeholder; misaligned "Log it"; 460px dead space; underline-link list again | 🟡 Medium |
| **Tools menu** | **4/10** | Right contents, right grouping | `$` and `?` as icons; duplicate printer icon used for two destinations | 🟡 Medium |
| **Clients (empty)** | **4/10** | Honest empty message | Search + sort chrome rendered for zero items; one grey line on 700px of nothing | 🟡 Medium |
| **Mobile Home** | **3/10** | Cards do stack cleanly; the To-do FAB is correctly pinned | Wordmark gone entirely; control wraps 4+1; zero mobile-specific composition | 🟠 High |
| **Deep theme** | **4/10** | Token discipline mostly holds | No card/canvas separation; rainbow becomes neon; purple footer text near-illegible | 🟠 High |

## Phase 29 · Product scores

| Dimension | Score | One line |
|---|---|---|
| Visual cohesion | **3/10** | Two entirely separate design systems ship in one product. |
| Typography | **4/10** | One good family, one good ramp, 84 sizes actually used, 6.4px shipping. |
| Colour | **5/10** | Token layer is thoughtful and passes contrast; three unrelated accents and grey "success" undo it. |
| Spacing | **5/10** | A real 7-step ramp exists and is mostly honoured; the axis breaks on the most-used page. |
| Layout | **3/10** | Two flagship screens waste 45% of the canvas. |
| Hierarchy | **3/10** | Duplicate CTAs on every path page; status chip outranks navigation; disabled buttons out-shout destructive ones. |
| Component consistency | **4/10** | Two input styles, two segmented-control selected states, three underline conventions, four spin speeds. |
| Design-system maturity | **6/10** | Genuinely good foundations, systematically overridden by 420 `!important`s in one file. |
| Brand expression | **2/10** | Present in the copy, absent from the pixels. |
| Visual identity | **2/10** | Not recognisable with the logo removed. |
| Memorability | **2/10** | Memorable only for the rainbow, which is not the memory you want. |
| Restraint | **2/10** | An infinite 7-colour animation on every button. |
| Professionalism | **3/10** | Reads as a capable prototype, not a shipped product. |
| Perceived product value | **3/10** | A designer would hesitate to open this with a client watching. |
| Mobile visual quality | **3/10** | Desktop compressed into a phone, with a collision. |
| **Overall visual quality** | **3.5/10** | Strong bones, no art direction, one decision doing outsized damage. |

## Phase 21 · Design debt

**Cosmetic:** 84 font sizes · 26 radii · `Working· just started` missing space · truncated
placeholder · footer version in purple · misaligned "Log it" · duplicate printer icon.

**Structural:** Assets and Review column imbalance · Strategy's 4,745px scroll · Strategy's 26px
axis break · Settings' width cap · duplicate CTAs across all five path pages · Home's triple
restatement · mobile's uncomposed stack · 420 `!important` declarations that make every one of
these more expensive to fix than it should be.

**Brand:** no signature · no scale contrast · identity absent from surfaces · Brand Book Builder
as a separate product.

**Prototype-grade, ship-blocking:** `bbb-anchor-1` / `bbb-anchor-4` in the UI · truncated hex
values · clipped textarea · clipped placeholder · permanent "Building your preview…".

## Phase 22 · Would I show this?

**Show proudly:** the Review Direction Sheet. Alone.
**Would not show:** Assets, Brand Book Builder, the lock screen, mobile.
**Needs most attention:** Assets — it is both the worst-composed screen and the last one before a
client sees the work.

---

# PART VII — THE PLAN

## Phase 27 · The ten biggest wins

| # | Current problem | Change | Expected impact |
|---|---|---|---|
| 1 | Every button carries an infinitely spinning 7-colour conic gradient at 4 different speeds | Delete the 8 gradient override rules. Primary = solid ink fill, secondary = 1px hairline, ghost = text | **The single largest jump in perceived quality available.** Removes the one thing that reads as unfinished before anything else is noticed |
| 2 | Assets wastes 45% of the canvas on an empty box; 20+ panels in a 500px column | Rebuild as two real columns: preview left at 60%, actions right at 40%, panels grouped into Package / Stationery / Extras | Turns the worst screen into a credible delivery moment |
| 3 | Every path page has two "next" CTAs in two visual languages | One nav affordance per page. Keep the bottom `Next · <stop>`, delete the top duplicate | Fixes 5 screens with one change; restores G1.3 |
| 4 | Brand Book Builder is a visually separate product with an orphan orange accent | Bring it onto the app's surfaces and accent; keep the cream *page* canvas (correct — that's paper) | Removes the "two products" break at the workflow's climax |
| 5 | Strategy is one 4,745px scroll of 40 identical fields | Make `01`–`05` real collapsible sections, one open at a time, with the section rule as the boundary | Directly serves the stated primary user; the product's biggest promise-vs-delivery gap |
| 6 | Chrome glyphs and emoji used as icons; three unused UI libraries in the tree | Extend the house `HeaderIcon` set (see correction below); drop the unused libraries | Removes the most concrete "unfinished" signal |
| 7 | Home states "Strategy is next" in three separate cards | One hero card. Delete the "Up next" panel; reduce "Projects" to a list | Cuts the dashboard's reading load by a third |
| 8 | No scale contrast anywhere on the path | Promote the Direction Sheet's specimen block to every path stop's header | Gives the product a signature and a rhythm in one move |
| 9 | `--success` and `--warning` are greys; three unrelated accents | One accent + true semantic green/amber/red. Retire `#5B42F3` or commit to it as *the* brand — not both | Colour starts meaning something |
| 10 | Mobile is the desktop stack; the header carries no product identity at all | Restore the wordmark mark; let the segmented control scroll rather than wrap | Mobile stops looking like an afterthought |

## Phase 26 · Prioritised findings

**🔴 CRITICAL** — makes the product look unfinished
1. The spinning rainbow on every button *(global)*
2. Assets column imbalance *(screen)*
3. Brand Book Builder's separate design system + raw anchor IDs *(screen)*
4. Duplicate "next" CTA on all five path pages *(global)*
5. Strategy's 4,745px undifferentiated scroll *(screen)*
6. Glyphs and emoji as icons *(global)*
7. Truncated hex values, clipped textarea, clipped placeholder *(mixed)*

**🟠 HIGH** — significantly raises perceived quality
8. Home's triple restatement *(screen)*
9. Weight hierarchy — stop setting body copy at 600 *(global)*
10. Strategy's 26px axis break + two content widths *(screen, but pattern is global)*
11. Deep theme card/canvas separation *(global)*
12. Settings — destructive actions quietest, disabled buttons loudest *(screen)*
13. Missing mobile wordmark *(global)*
14. Two input styles (white-filled vs grey-filled) across path pages *(global)*
15. Identity has no design on it *(screen)*

**🟡 MEDIUM** — polish
16. Consolidate 84 font sizes onto the ramp; eliminate all 244 sub-floor uses
17. One selected-state language for segmented controls
18. Style the four bare `<details>` disclosures
19. Retire the underline+bold+border link-row pattern (3 screens)
20. Fix the clipped modal scrim; give deep-theme modals a border
21. Remove `RES/IDE/TOU/ASS`; remove duplicate counts; remove "0 pins"
22. Research's second empty state; make the wall an actual drop plane

**🟢 LOW**
23. `Working· just started` spacing · footer version colour · date-picker styling · empty rail
    block · radio group spacing · `var(--radius, 6px)` fallbacks

### Global fixes that repair multiple screens at once

| Fix | Screens repaired |
|---|---|
| Delete gradient overrides | **All 14** |
| Extend HeaderIcon over chrome glyphs | Sidebar, Tools menu, client inbox |
| One CTA per page | 5 path pages + Desk |
| Weight-hierarchy pass | All |
| Single input style | Strategy, Identity, Settings, Review, Desk, Brand Book |
| Retire underline-link rows | Desk, Assets, Review |

## Phase 24 · Visual guardrails — DO NOT DO THIS

Based on this product's actual identity, not generic advice:

1. **No gradients on interactive elements.** Ever. The fill is flat or it is not a button.
2. **No permanent animation.** Motion has a trigger and an end. G8 already says ≤200ms.
3. **No type below `--fs-1` (0.75rem).** The floor is a floor.
4. **No typographic character standing in for an icon.** No emoji. If it needs a glyph, it needs
   an icon; if it needs no icon, it needs a label.
5. **No second route to the same destination on one screen.** One next action, one label.
6. **No card around a single sentence.** Whitespace and weight first, border only when space
   cannot carry the hierarchy.
7. **No screen where a column is more than ~30% empty at rest.** If content does not fill it, the
   grid is wrong.
8. **No new accent colour without a token and a stated role.**
9. **No `!important` to fix an appearance.** Fix the base rule. The file already carries this as
   acknowledged debt.
10. **No critical control inside a bare `<details>`** — and never one named "Leave".
11. **No internal identifier visible to a user.**
12. **A disabled control is never louder than an enabled one.**

## Phase 23 · The system to converge on

**Colour** — Canvas `--bg-canvas`; Surface `--bg-card`; Ink `--text-primary` / `-secondary` /
`-muted` (all three already pass AA — keep them); Border `--border-subtle` / `-strong`; **one**
accent used for focus and the active path only; Primary action = ink fill; semantic Success
`#15803D`, Warning (a real amber, not `#A7A7A7`), Error `#B91C1C`. Retire `--success: #808080`,
`--warning: #A7A7A7`, `--border-accent: #A1A1A1`, and either `--dopamine` or `--accent-primary` —
they are the same value under two names.

**Type** — Plus Jakarta Sans, weights 500/600/700 only. `--fs-1`…`--fs-6`, no exceptions, no
sub-floor. Body copy at 500 — not 600. `--measure: 65ch` on prose.

**Spacing** — `--space-1`…`--space-7` only. One content axis per page: heading, section rule and
field labels share an x. One content width per page.

**Radius** — `4px` / `pill` / `circle`. Delete the `6px` fallbacks. Inputs match everything else
or the exception gets written down and defended.

**Elevation** — No shadows in light theme; that restraint is correct and distinctive. Deep theme
gets separation from a lifted surface value and a visible border, not a shadow.

**Components** — one button set (primary ink / secondary hairline / ghost text), one input, one
card, one modal, one segmented control with one selected-state language, one empty state
(icon-optional, one sentence, one action, never two messages), one link row without underline.

## Phase 19–20 · Motion and delight

**Delete first:** the infinite button spin (permanent motion is not delight, it is noise).

**Then add, sparingly** — trigger → motion → purpose:

| Trigger | Motion | Purpose |
|---|---|---|
| Path stop completed | Section rule draws left→right, 200ms | Cause and effect — you finished a thing |
| Save | Existing quiet chip fades in/out, 160ms | Reassurance without a toast |
| Brief section collapses | Height ease 180ms, sibling section opens | Continuity — you moved, you didn't jump |
| Client opens the reveal | Specimen block fades up 320ms, once | The delivery moment (PRODUCT.md §7) |
| Colour role assigned | Swatch scales 1.0→1.03→1.0, 120ms | Selection confirmed |

**Delight, in character with this product's voice — quiet, not gamified:**
- First pin on the Research wall: the wall's frame settles into place rather than popping in.
- Brief section completed: the `—` placeholders in the Direction Sheet fill in live, so the
  designer *sees* strategy becoming the brand — the product's entire thesis, rendered.
- Returning to a project: keep the "where you left off" sentence. It is already the warmest moment
  in the app.
- Handoff built: the specimen block renders once at full bleed before the download starts.

No confetti. No streaks. No scores. This audience is served by calm, not reward loops.

---

# PART VIII — VISUAL NORTH STAR

> Creative Companion is a studio instrument, not a dashboard. It is set like a brand manual: a
> quiet cool-grey workspace, generous margins, hairline rules instead of boxes, one family at
> three weights, and no decoration that isn't doing a job. The loudest thing on any screen is the
> client's own brand — their type, their colour, set large in a specimen block — because the
> product's promise is that the brand lives here. Everything else recedes: chrome is grey, actions
> are ink, and colour appears only where the work itself supplies it. Nothing pulses, nothing
> glows, nothing competes for attention with the one thing the designer should do next.

**The product should feel:** Quiet · Precise · Editorial · Confident · Warm · Uncluttered · Trustworthy

**The product should not feel:** Loud · Gamified · Playful-for-its-own-sake · Generic · Busy · Corporate · Anxious

**Visual principles**
1. The brand is the hero; the app is the frame.
2. Whitespace and weight before borders and boxes.
3. One primary action per screen — always the same one the user was told was next.
4. Colour means something or it isn't there.
5. Flat is a commitment, not an absence.
6. Type ramp and spacing ramp are closed sets.
7. Incompleteness renders calmly — `—`, never red, never a score.
8. Motion has a trigger and an end.
9. An icon is an icon; a character is not.
10. If it cannot be said in the words the copy already uses, it doesn't ship.

**Signature elements**
1. **The Specimen Block** — full-bleed plate carrying the project's own type and colour.
2. **The Working Margin** — persistent left column of tracked caps eyebrows and step numbers.
3. **Ink and Paper** — cool grey for workspace, true paper white for anything client-facing.
4. **The Em-Dash Placeholder** — unanswered fields read `—`, calmly.
5. **Hairline rules over cards.**

---

# MASTER ROADMAP

### Phase 1 — FIX *(nothing else should start first)*
| # | Change | Scope | Impact |
|---|---|---|---|
| 1 | Delete the 8 conic-gradient override rules + `btn-spin-chrome` | Global | Largest single quality gain available |
| 2 | Remove `bbb-anchor-*` IDs, fix truncated hex, fix `05` gap, fix clipped textarea + placeholder | 4 screens | Removes prototype-grade defects |
| 3 | Restore the product mark in the mobile header | Global | The screen users see most stops being the one with no identity on it |

*Depends on nothing. #1 must precede all of Phase 2 — the `!important` layer masks whatever else you change.*

### Phase 2 — SYSTEMIZE
| # | Change | Scope | Impact |
|---|---|---|---|
| 4 | One CTA per page: delete the top duplicate on all five path pages | Global | Restores hierarchy on the product's core surface |
| 5 | Extend `HeaderIcon` over the chrome glyph sites; delete emoji | Global | Removes the clearest unfinished signal |
| 6 | Collapse 84 font sizes onto `--fs-1`…`--fs-6`; eliminate all 244 sub-floor uses; body copy to weight 500 | Global | Hierarchy appears without new elements |
| 7 | One input style; one segmented-control selected state; retire underline-link rows | Global | Fixes 6+ screens |
| 8 | Single content axis and single content width per page (start with Strategy) | Global pattern | The app "tightens" with no new pixels |
| 9 | Deep-theme surface separation; retire `--success`/`--warning` greys and the duplicate accent token | Global | Colour and theme start meaning something |

*Depends on #1. #6 and #8 are independent of each other and can run in parallel.*

### Phase 3 — DIFFERENTIATE
| # | Change | Scope | Impact |
|---|---|---|---|
| 10 | Build the Specimen Block from the Review Direction Sheet; place it on every path stop header, Desk, Home project card, Brand Book cover, client reveal | Global | The product becomes recognisable |
| 11 | Bring the Brand Book Builder onto the app's surfaces and accent; keep cream for the page only | Screen | Removes the "two products" break |
| 12 | Adopt the Working Margin as the path grid | Global | A structural signature that costs only alignment |
| 13 | Ink-and-paper rule: workspace grey vs client-facing white | Global | Expresses Brand System vs Brand Book visually |

*Depends on Phase 2 (#8 in particular — the margin needs a settled axis).*

### Phase 4 — POLISH
| # | Change | Scope | Impact |
|---|---|---|---|
| 14 | Rebuild Assets as a real two-column delivery screen; group the 20+ panels into three sections; enlarge artefact previews | Screen | Turns the worst screen into a showable one |
| 15 | Strategy `01`–`05` as collapsible sections, one open at a time | Screen | The product's biggest promise-vs-delivery gap |
| 16 | Home: one hero card, not three restatements | Screen | Cuts dashboard reading load by a third |
| 17 | Make the Research wall an actual drop plane; single empty state | Screen | The visual stage becomes visual |
| 18 | Mobile: scroll the segmented control, recompose card order | Global | Mobile stops looking like an afterthought |
| 19 | Style the four `<details>`; rename/relocate "Leave"; remove `RES/IDE/TOU/ASS` and duplicate counts | Mixed | Removes the last framework-default tells |

*#14 depends on #7 (one card/panel language). #15 is independent — could ship earlier if the ADHD case is prioritised.*

### Phase 5 — DELIGHT
| # | Change | Scope |
|---|---|---|
| 20 | Direction-sheet `—` placeholders fill live as the brief is answered | Global |
| 21 | Section-rule draw on stop completion; wall frame settles on first pin | 2 screens |
| 22 | Client reveal: specimen block at full bleed, once, before download | Screen |
| 23 | Keep and extend the "where you left off" sentence | Global |

*Depends on Phase 3 (#10). Nothing here ships before the Specimen Block exists.*

---

# FINAL ART DIRECTOR VERDICT

**If I saw this today, would I believe it was professionally designed?** No — and the reason is
narrower than it looks. A viewer forms the judgement in about two seconds, from the spinning
rainbow ring on the first button they see, and nothing after that gets a fair hearing.

**What's holding it back.** One decorative decision applied globally through 420 `!important`
declarations, sitting on top of a design system that already knows better and says so in its own
comments. Then three structural problems: navigation duplicated on every page of the core
workflow, two flagship screens that waste nearly half their canvas, and a headline feature that
belongs to a different product. And beneath those, an absence rather than an error — no scale
contrast anywhere, so every screen reads at the same volume.

**What's already strong.** The foundations are better than the surface suggests, and they were
built deliberately: 39 radii collapsed to 3, 229 padding values to 7, a contrast failure affecting
127 usages found and fixed, a phantom font removed from the stack. The decision to ship *no*
shadows is a real and unusual act of restraint that most products in this category get wrong. The
copy is excellent — specific, warm, honest, and written by someone who understands the user. And
the Review Direction Sheet proves the team can compose at a high level when the screen asks for it.

**What would make it exceptional.** Delete the rainbow, then take the Direction Sheet seriously as
the product's visual thesis. Every screen should do what that one panel does: put the client's own
type and colour on a large plate and let the workspace recede around it. A brand workflow tool
whose interface is quiet enough for the brand to be the loudest thing in it would be genuinely
distinctive — nothing in this category looks like that, and this codebase is roughly four
subtraction-heavy changes away from it.

**If you changed only one thing:** delete the conic gradients. It is a net-negative-lines change
that lifts all fourteen screens at once, and until it's gone, no other visual improvement will be
visible to anyone.
