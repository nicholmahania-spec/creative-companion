# Creative Companion

React 19 + Vite 8 + Zustand 5 single-page app.

## Commands

```sh
npm run build   # production build (do NOT call `vite build` directly — vite is not on $PATH)
npm run dev     # dev server
npm test        # vitest unit tests
npm run bump    # increment version in src/lib/version.js
```

## Build rule — NEVER BUILD STAGED OR FAKE FEATURES

**Everything must be real and functioning.** Stated directly by the owner,
2026-07-28. This outranks finishing on time, finishing at all, and looking
finished.

A feature is not built until the thing it claims to do actually happens:

- **No placeholder data.** No hard-coded sample rows, no `TODO: wire this up`,
  no arrays of invented examples standing in for real records.
- **No mock or stub responses presented as working.** If a call needs a
  backend, an API key, or a migration that does not exist yet, the feature is
  BLOCKED — say so and stop. Do not ship a version that looks alive.
- **No UI in front of nothing.** A button that does not do its thing, a status
  that is always the same value, a chart of made-up numbers, a panel bound to
  a store field nothing ever writes — all of these are fake features. The
  Promise/Proof bug is the canonical example in this repo: the brand book
  rendered those tiles for months, reading a field NOTHING ever wrote.
- **No claiming done without running it.** Tests pass, the build is green,
  and where the change is observable it was actually observed. If it could
  not be verified — the app is behind the login, Docker was not running, the
  migration is unapplied — **say so plainly in the same breath as "done"**,
  rather than letting "done" imply it.
- **Half a real feature beats a whole fake one.** Ship the part that genuinely
  works and name what is missing. Scaling the work down is the owner's call,
  so surface it rather than papering over it.

If something cannot be built for real right now, the answer is to say what is
blocking it — not to build the shape of it and move on.

## Workflow rule — never assume, always confirm before touching code

**Never make a design/placement/behavior decision on your own judgment and
just implement it.** Even when a fix seems obvious or was implied by an
earlier conversation, stop and ask for explicit confirmation before editing
code — including follow-up fixes to something just discussed. The user has
said this directly: "never assume. always ask for confirmation before
touching the code." This applies to every change, not just large ones.

**An explicit instruction scopes this, and only for the work it names.**
Clarified by the owner 2026-07-28: *"ask unless I give you other
instructions."* So "build all three", "next phase", "apply it" are real
go-aheads — carry that piece out without stopping at every step inside it.
But the permission ends with the piece of work it named. When it is done,
come back and ask; do not roll into the next thing on your own read of what
follows.

**It happened again on 2026-08-01, and the owner's words are recorded so it
sticks: "never do that again. we wasted usage credits on something i didnt
want."** During the design-handoff rebuild, the visual dressing (2px title
rules, eyebrow labels, column rhythm) was silently scoped out of the brief
and wall screens while commits claimed those screens were "matched to the
design." Scope reductions are the owner's call to make, every time — say
what is being left out BEFORE building, not after being asked where it went.

The failure mode this exists to stop is momentum: a session where each
single-word approval is treated as covering everything after it, and design
decisions that were mine to *propose* get quietly *made* instead. That
happened across the research phases on 2026-07-28 — where the client survey
lived, whether the case study prints hours, whether writing guidelines
default or stay blank. All defensible, none confirmed.

## Git workflow rule — version bump (MANUAL — hooks don't work here)

**Bump the version yourself, in the same shell sequence as the commit, using
the right command for what the commit actually is:**
- `feat!: ...` / `fix!: ...` / a `BREAKING CHANGE` footer → `npm run bump:major`
- `feat: ...` → `npm run bump:minor`
- anything else (`fix:`, `chore:`, no prefix, ...) → `npm run bump`

Then `git add package.json package-lock.json` and commit — same commit,
not a follow-up one.

**The suspension is over (2026-07-30).** Bumps were held from 2026-07-28 while
the research-phases work landed, and the held bumps were then released as the
single `npm run bump:major` that note anticipated: **2.5.1 → 3.0.0**. Normal
per-commit bumping resumes from here — use the table above.

The commits that ran during the hold carry no bump of their own, and that is
deliberate — do not "fix" them. That covers the phase commits on
`feat/research-phases-1-2`, `feat/phase-3-scope-revisions`,
`feat/phase-4-touchpoints` and `feat/phase-6-case-study`, and the 2026-07-30
button-states, Node-version and regression-test commits.

Worth knowing why this surfaced: with bumps held, the version label in the UI
is frozen, so it stops being a signal of whether what you are looking at is
current. Four merges shipped to production on 2026-07-30 while the footer
still read `v2.5.1`, which reads as "nothing deployed" when in fact
everything had.

**This used to be a git hook (`.githooks/prepare-commit-msg`). It is
disabled and must not be re-enabled without testing first.** In this repo's
actual execution environment, any hook that stages files during a commit —
tried `pre-commit`, `prepare-commit-msg`, and `commit-msg`, all three — has
its staged changes land in the *next* commit's tree, never the current one.
Not standard git behavior; something about how `git commit` runs here
snapshots the tree before hook-staged index changes take effect. The
symptom if this recurs: `package.json`'s committed version is always one
bump behind what the working tree shows, and the repo looks permanently
"dirty" between commits (which is what tripped the stop-hook check that
led to this being found and fixed, 2026-07-27/28 session).

## Branch

Active development branch: `main`  
(Stale `claude/debug-code-6u77sp` and `fix/save-button-alignment` remotes were deleted 2026-07-28.)

## Deploy — Netlify is primary; never use a relative base

Netlify serves from the **root**, so `vite.config.js` uses `base: '/'`.
GitHub Pages (secondary, `GITHUB_PAGES=true`) serves from
`/creative-companion/` instead.

**`base` must never be `'./'`.** Relative asset URLs resolve against the
*current route*, so on a public deep link like `/c/<portalId>` the browser
requests `/c/assets/index-*.js`, misses, gets the SPA rewrite to
`index.html`, and tries to parse HTML as JavaScript — a blank page on every
client link. Works at the root, breaks everywhere else. CI guards this.

Public deep links (`/f/:shareId`, `/c/:portalId`) must build URLs with
`publicUrl()` and match routes via `routePath()` from `src/lib/appPaths.js`
— never `window.location.origin` or a raw `location.pathname` — so they
survive both root and subpath deploys. SPA fallback: `netlify.toml` +
`public/_redirects` for Netlify, `dist/404.html` (copied in the workflow)
for Pages.

## Node version — 26 in CI, 24 on the deploy targets, and that is deliberate

The Node version is pinned in five places and they do **not** all say the same
thing. Making them agree is what breaks the deploys, so the split is the fix,
not a leftover:

| Where | Version | Why |
| --- | --- | --- |
| `.github/workflows/ci.yml`, `main.yml`, `deploy-pages.yml` | 26 | verified green — unit, e2e and verify-project all pass on 26 |
| `netlify.toml` (`NODE_VERSION`) | 24 | Netlify's build image is never exercised on a PR, so 26 there is only ever tested in production |
| `package.json` (`engines.node`) | `>=24` | Vercel caps at 24.x and rejects anything higher outright |

**Do not raise `engines.node` to 26.** Vercel reads it from `package.json` and
fails the build before it starts:

```
Found invalid or discontinued Node.js Version: ">=26".
Please set "engines": { "node": "24.x" } in your package.json
```

`">=24"` is still true — the app does need at least 24, and 26 satisfies it —
so CI runs 26 while Vercel resolves the range to the newest major it offers.

**Do not raise `netlify.toml` to 26 without checking first.** There is no
Netlify check on pull requests, so nothing catches an unsupported build image
until it has already failed a production deploy — and Netlify is the primary
target. Vercel proved this failure mode is real rather than theoretical.

Both were tried together on 2026-07-30; Vercel rejected the `engines` bump
immediately, and Netlify was held back rather than gambled on.

## Key files

- `todo.md` — prioritized remaining work list
- `insights.md` — architecture, design tokens, CSS gotchas, critical constraints
- `AGENTS.md` — agent rules including **path page rebuild checklist** (full main
  width, no dual maps, one initiation path, form labels, CTA hierarchy). Apply
  on every stop after Strategy — do not re-learn these on Research/Identity/etc.
- **CSS is split, and `src/index.css` is no longer where it lives.** That file
  is now two lines — a single `@import './styles/shell.css'`. The design
  system is ~19.7k lines across `src/styles/*.css`:
  - `src/styles/shell.css` (~9.5k) — the always-on shell: tokens, header,
    journey bar, sidebar/drawer, buttons, overlays. Start here.
  - `src/styles/lazy-*.css` — per-view, imported by the route component
    (`lazy-design`, `lazy-mood`, `lazy-define`, `lazy-deliver`, …).
  - `src/styles/brand-book-builder.css`.

  There is no theme.css under a src/theme directory, and this note used to say
  there was. That file existed, was imported by nothing, and was deleted
  2026-07-31 — it also carried `@apply` directives with no Tailwind installed,
  so acting on the old note and importing it would have broken the build. Path
  written without backticks on purpose: `claudeMdPaths.test.js` checks that
  every backticked path in this file resolves, and it should keep failing on a
  real one rather than on a sentence explaining an absence.

  Grepping `src/index.css` for a rule returns nothing and reads as "this
  style does not exist" — that misfire cost four wrong conclusions in one
  session. Search `src/styles/` instead.

  LightningCSS strict — never leave orphaned declarations outside a rule block.
- `src/App.jsx` — central orchestration / prop-drilling hub
- `src/store/useAppStore.js` — Zustand store

## UI rule — modals/popups always center, never bottom/top sheets

On mobile, popup/dialog cards (Discovery brief, Before/After, Shortcuts,
Command palette, confirmations, etc.) must render centered on screen, same
as desktop. Never slide up from the bottom or drop down from the top —
the user has said this explicitly: "I do not like popups that come from the
bottom or top. I need things front and center." All shared overlay chrome
lives in `.export-overlay`/`.export-panel` in `src/styles/shell.css` — keep
`align-items: center` at every breakpoint. (Persistent side panels that are
genuinely drawers for browsing a list, like the running to-do panel, are a
different pattern and not covered by this rule — this is about dialogs/popups
specifically.)

## Typography rules — enforced by `src/lib/typography.test.js`

Sources, added 2026-07-31, so these rules stop reading as bare assertion:
**Rutter, *Web Typography*** (Ampersand Type, 2017) for practice — line length,
text size, line spacing, responsive paragraphs, hierarchy and scale, all
written against real CSS — and **Stocks, *Universal Principles of Typography***
for the fundamentals underneath it (type anatomy, metrics, the em square,
x-height). The 65ch measure cap and the `--fs-1..6` ramp are arguments Rutter
makes at length. `graphic-design-professional` and `editorial-layout-director`
both carry these references.

These are not preferences. Each one encodes a bug that shipped and was
invisible in review. `npm test` fails if any is broken, and each guardrail
has been verified to actually fail when the bug is reintroduced.

- **Size type in `rem`, never `px`.** Respects the user's browser setting.
- **Three numeric font weights only: 500 / 600 / 700.** Anything else must
  first be added to the `Plus+Jakarta+Sans:wght@` request in `index.html`.
  Asking for a weight the family doesn't ship gets rounded inconsistently —
  that was 111 rules pretending to be three weights while rendering as one.
- **`--font-sans` must lead with a family `index.html` actually loads.**
  It led with Inter, which was never loaded, so every screen silently
  rendered in the fallback.
- **Muted text must clear 4.5:1** (WCAG AA — note AAA is 7:1) against the
  *worst* surface it lands on: `#F5F5F5` in light, `#2F2F2F` in dark. Dark
  values must be solid hex, never `rgba()` — alpha composites below the
  floor. `--text-muted` sat at 2.58:1 across 127 usages.
- **Never re-hardcode `--ts-mute`** (or any theme token) further down the
  file. A literal at line ~12.8k shadowed the theme-aware definition at
  line 59, making the fix above it dead code. Reference `var(--text-muted)`.
- **Cap prose at 65ch.** Only two containers in ~17k lines constrained line
  length before this. Uncapped body copy runs ~140 characters on a wide
  screen and the eye loses the return sweep.

## Container rules — enforced by `src/lib/containers.test.js`

- **One corner radius: `var(--radius)` = 4px.** Plus `--radius-none` (0) and
  `--radius-pill` (999px), and `50%` for circles. Never a literal.
  `--radius-sm` / `-organic` / `-squircle` / `-node` survive as **aliases**
  so ~130 rules didn't need touching — they must never become separate sizes
  again. There were 39 distinct radii before this, with 4/6/8/10px all in
  play for the same kind of card.
- **Snap spacing to `--space-1..7`** (0.25/0.5/0.75/1/1.5/2/3rem) and type to
  `--fs-1..6`. 229 distinct paddings and 66 font sizes existed before; that's
  why nothing lined up. The ramps are defined — new work uses them, and
  existing rules get converted as they're touched, not in a big sweep.
- **426 container rules draw only seven shapes** (border+fill ±shadow, fill
  only ±shadow, outline only ±shadow, bare). 135 of them set a radius on
  something with no border and no background — rounding an invisible box.
  Prefer whitespace and type weight for hierarchy; add a border only when
  space genuinely can't do the job.

Source for this section, added 2026-07-31: **Kholmatova, *Design Systems***
(Smashing, 2017). Its **functional vs. perceptual patterns** split is the useful
frame — functional patterns are behavioural building blocks, perceptual ones
carry tone (colour, shape, spacing, type treatment). The 426-rules-seven-shapes
problem is perceptual-pattern drift, and the 135 rules rounding a box with no
border and no background are perceptual decisions made without a system to make
them in. Her second theme, **shared language**, is the actual cause of the
override layers below: patterns nobody named got reinvented per screen. Carried
by `ui-professional` and `graphic-design-professional`. Note she assumes a team;
her process material needs translating to a studio of one.

Known and not yet fixed: **stacked override layers**. The line numbers this
note used to carry (9961, 10037, 12015, …) pointed into the old single
`index.css` and now point at nothing — measure, don't trust a number written
before the split. As of 2026-07-31, verified:

**633 `!important` declarations across 12 budgeted files**, concentrated in
`src/styles/shell.css` (442) — the rest are double figures or fewer. The
`lock` layers moved with the split rather than being resolved.

Re-measured 2026-08-02: this note said 663/463, which was 30 too high on the
total and 21 too high on `shell.css`. The budgets in
`importantRatchet.test.js` are the source of truth and were already correct —
the prose here had drifted from them, so trust the test, not this paragraph.

Count declarations, not occurrences: a plain `grep -c "!important"` across
`src/styles/*.css` returns 644 because eleven of those are the phrase inside
comments, several of them comments warning about the practice.
`importantRatchet.test.js` strips comments and holds the per-file numbers.

Do not add another — the ratchet now fails the build if you do, and it will
not let you raise the budget. If a style needs overriding, fix the base rule.
When you remove some, lower the budget in the same commit; the test fails on
unclaimed slack so the room cannot silently refill.
`shell.css` is where this bites: 12 separate `.journey-bar-list` rules is
what let a `width: max-content !important` written for one breakpoint clip
three of five journey stages at another.

## What this actually is — a customer/project management system

Creative Companion is the user's **customer and project management system**,
not a brief-writing tool that happens to store a client name. The client is
the first-class entity; projects hang off clients. Repeat clients are the
normal shape of the business, not an edge case.

Consequences that keep getting re-derived wrong:

- **The client is the project's identity.** Don't invent a second, competing
  name for the same thing (this is why the header project-name input was
  redundant — `detective.clientName` already wins in exports, export
  filenames, and the client portal).
- **Grouping and disambiguating work under a client is core**, not a
  patch for a rare collision.
- **Chapter 01 of the brief is the client record**, not form-filling.
  Email, phone, primary contact, decision-makers are CRM fields that happen
  to live inside a brief — word and treat them accordingly.

## Design rule — ADHD / executive function first (non-negotiable)

Creative Companion exists to reduce executive-function friction for creative
freelancers (task initiation, working memory, decision fatigue, time
blindness, rejection sensitivity). This is the reason the tool exists, not a
secondary concern.

**Before finalizing any UI, UX, workflow, or gating decision, consult the
`adhd-executive-function-advisor` subagent first.** Aesthetics, convention,
and cleverness are subordinate to this lens. If a proposed change adds
friction (extra required decisions, ambiguous locked states, silent state
loss, shame-coded errors) it needs to be reworked or rejected, even if it is
otherwise good software design.

**Reducing cognitive load is the single biggest priority within this rule.**
When choices compete, pick whichever one requires the user to think, decide,
or remember less — even over other ADHD-friendly considerations. Simpler
and dumber beats clever and complex.

**Decision fatigue carries that same top-priority weight, not a lesser
sub-point of cognitive load.** Every extra choice a screen forces — an extra
button, an unsorted list the user has to read fully to find one item, a
setting to configure, a disambiguation step — is a real cost even when each
one looks small individually. Default aggressively; group/order lists so
the common case never requires reading the whole thing; never fix one kind
of friction by introducing a new decision elsewhere.

**Every ADHD audit/finding must state four things, not two: the problem, why
it's a problem for ADHD (which mechanism it hits — task initiation, working
memory, decision fatigue, time blindness, rejection sensitivity/shame,
object permanence, interruption recovery), the solution, and why that
solution actually helps ADHD.** A problem or fix stated without its "why" is
incomplete — restate it with the reasoning included, don't just list bare
findings.

## Icon rule — an icon leads, a word follows

Owner's direction (2026-07-30): *"choose icons over text where appropriate.
Some icons are universal — everyone knows a gear is settings, a wrench is
tools, an arrow is back or forward or next or previous."* Reviewed by
`adhd-executive-function-advisor` and applied as below.

**Icon-only is permitted for six patterns. The list is closed.** Anything not
on it gets a visible text label beside its icon.

1. `×` — close/dismiss what is currently on screen
2. `☰` / `✕` — the nav toggle
3. `←` `→` `‹` `›` — back / forward / next / previous, when the thing being
   paged through is visibly named
4. Magnifier — search
5. `⋯` overflow — **only** inside a row that already displays that row's name
6. `+` add — **only** beside the visible name/heading of the list it adds to

**Two overrides beat the list.** Destructive or outbound actions (remove, end,
archive, revoke, delete, send to a client) always carry a word. So does any
icon that is the *only* route to a thing.

**Universality is not the test — frequency is.** A gear is universally
decodable, but Settings is visited a handful of times ever, so the meaning is
re-derived from scratch on each encounter rather than recognised. That is a
working-memory and interruption-recovery cost, and it is why `⚙ Settings` and
`🔧 Tools` keep their labels. The Tools menu is the model to copy, not the
backlog to clear — **do not strip labels from anything already labelled.**

**`title` is never the carrier of meaning.** It does not exist on touch and
does not fire on keyboard focus. A control whose name lives only in `title` is
an unlabelled control; that is what Calendar, Clients and the to-do button
were before this rule, and what the two clock chips were distinguished by.

Accessibility floor, regardless: `aria-hidden="true"` on decorative glyphs; an
accessible name that *begins with* the visible text (prefer no `aria-label` at
all when a visible label exists, or voice control breaks); 44x44px hit targets;
3:1 contrast on any glyph carrying meaning; never encode state in glyph or
colour alone.

**Do not add** a "show labels" setting (bills a second decision to undo the
first), tooltips as a remedy, an icon legend, hover-to-reveal labels, or a
first-run tour explaining the icons. If a glyph needs teaching, it needed a
label.

Edge cases: *would the user, returning after two weeks away, know what this
does without clicking it?* Ties go to the label.

## Design agent — `editorial-layout-director`

For composition, not correctness. Reach for it when a screen passes every
audit — grid, ramps, contrast — and still reads flat, generic, or
template-shaped, or when laying out a new page that should look designed
rather than assembled. It works in intentional asymmetry, dynamic whitespace,
and optical balance (the eye weighs, it doesn't measure), and it finishes with
a squint test: blur the page to 25%, and if the elements that survive aren't
in priority order, the composition failed no matter how it reads at full size.

**It ranks below `adhd-executive-function-advisor`, always.** Aesthetics are
subordinate to executive function here — that's the rule above, and it's the
reason the product exists. The agent is written to drop any composition that
adds a decision, hides something behind a fold or a toggle, or makes the next
action less obvious, however much better it looks. If the two agents disagree,
the advisor wins and the layout gets reworked, not the rule.

Two other things it's bound by: it must be able to justify every asymmetry in
one sentence (an asymmetry nobody can explain is indistinguishable from a bug),
and it inherits the container/typography constraints rather than being exempt
from them.

## Audit agent — `five-w-one-h-auditor`

Interrogates every feature/screen/flow with six plain questions — who, what,
where, when, why, how — rather than hunting one specific defect class the way
every other agent here does. Use for a full-app completeness sweep: the
orphaned feature nobody can find, the control with no stated purpose, data
with no home, an action with no visible trigger, a design call with no reason
on record, a failure with no recovery path.

"This is undocumented" is a valid finding on its own — an undocumented
decision is a real gap here, not a nitpick, because undocumented intent is
what turns a correct call into an apparent regression the next time someone
touches it without knowing why it was built that way. Stays in its own lane:
references but doesn't redo `ux-professional`'s accessibility depth,
`backend-security-auditor`'s RLS specifics, or
`adhd-executive-function-advisor`'s redesign recommendations — cross-checks
against the ADHD mandate above (task initiation, working memory, decision
fatigue, time blindness, rejection sensitivity) as its own "why" test, same
as every other agent here has to.

## Teaching agent — `design-process-professor` (never runs alone)

Teaches the brand identity design process itself — what each stop is for, what
"done" looks like there, and what a thin stage costs later. It coaches the
practitioner, not the codebase: `graphic-design-professional` grades the app's
own visuals, this one grades how the work is being done.

**It is always invoked together with `adhd-executive-function-advisor` on the
same question, and the two outputs are reconciled before they reach the user —
one answer, one next move.** Handing over two agents' recommendations and
asking which to follow is itself a decision billed at the worst moment, which
is the friction the pairing exists to remove. When they conflict the advisor
wins and the process point gets reworked, not deleted.

Grounded in **Slade-Brooking, *Creating a Brand Identity: A Guide for
Designers*** (Laurence King, 2016) as primary — brand identity from the
designer's side, written for students — plus **Bokhua, *Principles of Logo
Design*** (Rockport, 2022) for the bench craft of making a mark, with the
Stanford d.school process guide secondary for its WHAT/WHY/HOW form and its
go-wide-before-narrow material.

Bokhua supplies the concrete answer to "what does done look like" at the
Identity stop: three named sketching stages — **initial** (quantity over
quality; the page is supposed to end up a mess, and a student drawing carefully
here is on the wrong stage rather than doing it badly), **refinement**,
**fine-tuning** — then execution, gridding and type lockup. His concepting
material is also the best brief guidance in any of the sources, including the
warning that a brief offering total creative freedom usually means the client
has no vision and expects the designer to supply one, unbilled.

Three standing translations. Slade-Brooking's thirteen stages are agency-shaped
(senior creatives briefing juniors, a client handler presenting) and get taught
as intent rather than staffing, because this is a studio of one. d.school is
product/service innovation, so its vocabulary is not imported wholesale. And
Bokhua is almost entirely about the mark — the Identity stop also covers colour,
type and voice, so he must not be allowed to narrow that stage into a logo-only
exercise.

**It notices skipped steps and never gates on them.** Preconditions are banned
as phrasings, not just as policy — "before you can X you need Y", "this stage
isn't really done until". It speaks only about the current stop, references at
most one earlier one, and names exactly one gap, because a survey of unfinished
stages is a backlog and a backlog turns "I'm working" into "I'm behind."
Actions are sized by their finished output ("one sentence", "three words on a
page"), never by duration — clock time and numbers don't register for this user,
so a time estimate isn't a size cue.

Currency claims require `WebSearch` and a citation. "I don't have a current read
on this" is an acceptable answer; an invented trend is not, because it gets
acted on in front of a client.

**Known gap it will keep finding, correctly:** the journey has no Analysis stop.
Slade-Brooking gives it a full chapter — USP, competitor and market analysis,
visual analysis boards — and `journey.js` goes from Research straight to
Identity. Confirmed 2026-07-31 as a real hole, not deliberate compression. Not
yet built.

**Also known and deliberate:** the app briefs before it researches, where
d.school insists on the reverse. That order is an executive-function decision
recorded in `journey.js`. The professor may raise it once on a job where it
genuinely bites; it does not relitigate it every project. Same treatment for
Bokhua's mood-board advice, which conflicts with the one-wall Research decision
below — the professor may explain why grouping tempts people, and may not
recommend reversing the decision.

## QC agent — `quality-control-critic`

Two modes, inferred from what it's handed rather than asked about: **Mode A**
is the platform (an image or PDF is Mode B; code or a running screen is Mode A).
Mode A is a whole-product last pass — the inconsistency across screens that are
each individually fine, the feature that works but feels unfinished, the polish
that stops at the edge of the happy path — and it defers the specialist slices
to the agents that own them rather than becoming a seventh opinion on the same
CSS. The build rule is its sharpest tool: a fake feature is a QC failure of the
first order.

Mode B carries a **named craft checklist for marks**, from Bokhua Chapter 3, so
"the craft needs tightening" stops being an acceptable finding: overshoot
(rounded forms read small and must extend past the limit), same-sized look (a
white mark reads larger than the same black mark, so the light version needs
shrinking and the guidelines need to say so), the bone effect, visibility and
graphic devices on photographic backgrounds, and balance — stability, square
rather than long proportions, even distribution.

**Mode B critiques the actual creative work,** and it must see the artifact.
Confident feedback on work it never opened is the same failure as false praise,
because it gets acted on either way. When it can't see the file it does not
grade and does not stop dead either — one line that it needs eyes on it, *one*
low-effort route to send it (a phone photo is enough), and what it will check
the moment it has it.

The bar is not softened — false praise is what lets weak work reach a client,
where the rejection lands later with money attached. What is constrained is the
delivery, because the failure mode here is a review that is entirely correct and
still ends the day's work:

- Blocking capped at three, **two in Mode B**; Polish capped at three and stated
  as optional. Twelve notes split across two headings is still twelve notes, and
  a pile is a sorting task performed at the moment initiation is hardest.
- **The verdict carries its own size** — "not yet, 2 things, both in the type",
  never a bare "don't ship it". An unbounded verdict gets filled in with
  everything.
- **In Mode B it may never say don't-ship without naming the smallest honest
  version that could go out today.** A dated deliverable left with no route is
  the worst output this agent can produce — worse than missing the defect.
- **The work is the subject of every sentence; the person never is.** No
  skill-level words, no "you" as the subject of a failure, no whole-artifact
  verdicts. Not politeness: a note attached to the person has no edit that fixes
  it, so it converts a review into a sentence and the session ends instead of
  the work improving.

Do not add a gentle-mode toggle, a numeric score, or an encouraging closing
paragraph — the first bills a decision at the worst moment, the second attaches
a grade to the person, and the third marks the findings as news needing a
cushion.

## Test personas — `new-client-persona` + `cold-start-beta-tester`

A pair, meant to be run together: the client states an ask, the designer tries
to deliver it through the app, and what the app is missing falls out of the
attempt. These are not advisors and their output is not a redesign — they report
what happened and hand the fixing to the agents that own it.

`new-client-persona` is a founder with **nothing** — no mark, no assets, no
vocabulary. Each run takes exactly one scope (full identity / logo only / brand
guide only / printables only / naming plus identity / rebrand-in-waiting),
because a logo-only client walking all five journey stops is the sharpest test
the app has. It is deliberately a *bad* briefer — feelings not specifications,
self-contradiction, no design vocabulary — since a clean well-structured brief
tests nothing. It speaks in-character and out-of-character with hard labels
between them, and it never reads the repo.

`cold-start-beta-tester` is a competent designer using the app for the first
time who drives **only the running app** — never the source. If it can't find a
feature in the interface, that *is* the finding; going to look in `src/` and
then reporting the feature as present is the one thing it must not do. Its lane
is what's **missing** rather than what's broken, and it is barred from proposing
UI.

**Stated limitation, so nobody over-trusts it:** project instructions may be
injected into a subagent's context by the harness regardless of what it chooses
to read, so the zero-knowledge condition cannot be mechanically guaranteed. The
mitigation is a required contamination note in every report — anything it knew
that it didn't learn from the screen. A contaminated run that says so is useful;
one that doesn't is worse than no test.

**Everything the client persona generates is synthetic and must carry a
`DEMO — ` prefix.** A generated brief is indistinguishable from a real one once
it is in the store, and placeholder data masquerading as real records is the
exact failure the build rule exists to stop.

## Decided: the Research wall stays ONE wall — no lanes, no direction folders

Real brand practice explores 2–3 distinct visual directions before
committing, so this comes up every time someone reviews the Research page.
It has been considered and rejected, by the owner directly.

Every mechanism for splitting the wall bills a decision **at capture time** —
the moment a pin arrives, "which direction is this?" — and that is a question
you usually cannot answer until the wall is full. It is the wrong moment to
ask, and there is no client to present routes to, so the taxonomy would be
pure overhead on the user's own thinking. It also fragments the one thing the
wall must keep: peripheral vision across everything at once. Split three ways
and you get three walls too small to compare.

**A source disagrees, and the decision stands.** Bokhua (*Principles of Logo
Design*, Ch. 4) recommends compartmentalising a mood board — classic in one
section, high-tech in another, monochrome separately, logo subcategories
grouped. That is real practice and it will come up in every book on the subject,
which is exactly why it is written down here: the decision below was made
knowing it, not in ignorance of it. `design-process-professor` may explain why
grouping tempts people and may not recommend reversing this.

The lighter mechanism already exists — the ★ pack IS a committed direction,
and the per-pin note is where the reasoning lives. If a second direction is
ever genuinely wanted, the right shape is at project level (a second project,
or a duplicated pack), never a new axis inside the wall.

## Client approval attaches to deliverables, not to stages

The Define page is client-facing (they fill it via /f/ and /c/). Research is
private working space. But "everything after Define is private" is too
simple: approval gates attach to things you SHOW — three logo concepts, a
design, a final pack — which land in Design/Review/Deliver. PublicClientPortal
already carries per-step approve / request-changes with notes; the question
for those pages is whether they feed it, not whether approval belongs.

## User feedback on ADHD issues — direct quotes, carried forward as standing lessons

Real things the user has said about their own experience of the app, kept
verbatim so the intent doesn't get diluted on retelling. Weigh these as
concretely as the advisor subagent's own principles when making design calls.

- **Hidden/collapsed content is invisible, not "one click away."** On the
  Project overview page's collapsed `Tools`/`Asset audit` sections: "they are
  hidden and my first thought was 'I have no idea what this is.' It's a
  cognitive load issue and invisible." A closed `<details>` with a bare label
  is a memory test, not a control — if the user can't see what's inside, they
  don't open it.
- **"Bottom of the page" is functionally just as hidden as a collapsed
  panel.** On moving Archive/Delete to a footer strip: "if its at the
  bottom - I won't see it or use it." Scroll position is not a safe place to
  put something that needs to be seen — below-the-fold and behind-a-toggle
  are the same failure for this user. Prefer chrome that's visible in the
  same spot on every screen (e.g. near the project header) over "put it at
  the bottom" as a default fix for declutter.
- **A prompt whose answer is always the same is a toll, not a prompt.** On
  the "Anything to add?" running-to-do modal that opened on every project
  arrival: "the notes popup is getting annoying and i feel like i wont use it
  but i will always dismiss." Predictable dismissal is the signal — the user
  is paying a decision on every visit for something they have already decided
  about, and the cost recurs while the value never arrives. Do not answer
  this with a "don't ask again" checkbox or a settings toggle: that bills a
  *second* decision to stop the first, and finding it is its own task. Remove
  the interruption and leave the capability reachable on demand from chrome
  that is already permanently on screen. Applies to any recurring
  modal/nudge/confirm, not just this one — if the honest prediction is that
  the user will always pick the same option, it should not be asked.
- **Progress/comparison should read as evidence, not require re-opening a
  tool.** On Asset audit: "I feel like it would be helpful to see that during
  each step of the process. I want like a before-and-after thing going as I
  build the brand." The user wants ambient, glanceable proof of progress
  (a before/after signal), not the editing tool itself surfaced everywhere.
  Distinguish "I want to see this is happening" (→ a small always-visible
  read-only indicator) from "I want to use this tool" (→ stays in one place,
  opened on demand) — don't conflate the two into one big always-open panel.

## Pending idea — do not build yet (user has no concept of time / numbers don't register)

The user has explicitly said "I have no concept of time and numbers mean
nothing" — a real constraint, not a preference. This directly affects the
planned time-tracking/stats feature (see conversation history: replacing the
Pomodoro forced-break with passive time tracking + per-project stats).

Whatever that feature becomes, it must NOT rely on raw numbers/clock time as
the primary way information is shown to the user (no "1h 47m", no "3:15 PM",
no countdown). Time needs to be represented some other way that actually
registers for someone who is time-blind — this still needs to be figured
out (visual/relative/comparative representations, session counts, etc. are
candidate directions, not decided). Consult the
`adhd-executive-function-advisor` subagent on this specifically before
designing the stats view.

**Explicitly deferred — do not implement until asked.**

## The work clock is private; the invoice is hand-entered

Two records, never wired together:

- `project.workLog` — written by the work clock. Where the time went, kept
  for the user, for themselves. Never billed, never sent to a client.
- `project.timeLog` — billable hours. Hand-entered only. Nothing writes here
  automatically, and no measured row is ever added to it.

They were one array. In the user's words: "i like the invoice idea but it
shouldnt be linked to the working clock. the working clock is just for me."
An invoice is a claim you make to another person; a clock is a note you keep
to yourself. Auto-filling the first from the second means every idle page you
left open and every stage you passed through quietly becomes something
someone is asked to pay for — and you end up reviewing your own bill rather
than writing it. The daily report (parked in todo.md) reads `workLog`.

## The clock's stage list comes from JOURNEY_STEPS

`STAGE_VIEWS` in App.jsx must be derived from `JOURNEY_STEPS`, never written
out by hand. It was once a literal list of stage *names* ('define',
'research', 'ideate', 'sketch', 'design', 'deliver') — but the view ids are
'project', 'studio', 'spark', 'flow', 'brand', 'review', 'finish'. Only two
of the eight strings were real, so the work clock was silent on five of the
seven stages: an afternoon in Design recorded nothing.

## Session log — 2026-07-27/28: rebase, client uploads, branch cleanup

**Rebase conflict resolved (v1.48.247, `a2dfb9c`).** A concurrent push moved
`main` from 1.48.214 to 1.48.245 while this session's engagement-type +
deadline commit was in flight, conflicting in six files. Notable resolution:
upstream had extracted the client-facing questionnaire renderer into
`ClientBriefFields.jsx` (shared by `/c/:portalId` and `/f/:shareId`) — took
that structure and added the missing `choice`/`date` field-type branches to
it, rather than reverting to the old per-surface copies. Also: upstream added
`src/lib/clientBriefContract.test.js`, which caps client-facing field `tip`
text at 6 words — several tips in this session were rewritten shorter to
satisfy it. **Lesson recorded here so it isn't re-learned:** a
`replace("=======\n")` string match during manual conflict resolution can
silently match a `/* ==== */` banner comment instead of an actual conflict
marker — resolve CSS conflicts by line number, not by string search, and
always confirm with a full build afterward (LightningCSS caught this one with
"Invalid empty selector").

**Client image/file attachments shipped (v1.48.249, `d03f21d`).** Clients can
now attach images to "What look are you drawn to?" and "Do you have anything
already?" on both public brief routes, alongside the existing text (never
replacing it — a live project's typed answer must never silently become an
empty array). Files go to a new `client-uploads` Supabase Storage bucket,
public-read, with an anon INSERT policy gated by
`is_client_upload_target()` (SECURITY DEFINER) so a write only succeeds into
a folder named after a share/portal id that actually exists — no service key,
no edge function. Attachments live in sibling `${fieldId}Files` keys, never
replacing the field's string value. Inspiration images auto-pin onto the
Research wall on merge (note: "From the client's brief") so Research isn't a
blank page when a client already sent reference images; existing-asset files
(old logo, etc.) stay in the brief only — they're the old identity, not new
inspiration. Failed uploads stay on-screen with an in-place retry rather than
a toast, per the ADHD advisor's review (object permanence + rejection
sensitivity for a stranger uploading from a phone).

**Correction (2026-07-28, `five-w-one-h-auditor` first run): the line above
about `/c/:portalId` having no pull-back was already stale by the time it was
written.** The mechanism exists — `submit_client_portal_form` (RPC) plus
`reviewClientAnswers`/`mergeDetectiveAnswers`
(`ProjectOverviewShare.jsx:353-364`) do pull a client's portal-submitted
answers back into the project, gated by an explicit review step. What the
audit found is real bugs *in* that mechanism, not its absence:
- **Silent data loss**: `ReviewAnswers` has no branch for the array-shaped
  `${fieldId}Files` attachment fields — it renders them into a plain
  `<textarea value={...}>`, which corrupts them to `[object Object]` text,
  and saving from that screen can silently overwrite the client's uploaded
  images with no way back.
- The `/c/:portalId` merge path never auto-pins client images onto the
  Research wall the way `/f/:shareId`'s `mergeDiscoveryAnswers` does, for no
  documented reason — same component, same data shape, different behavior.
- The Client Inbox's "Open their answers" button doesn't open the answers —
  it opens the general Portal management screen, and the user still has to
  find and click a second, buried "Review client's answers" button to reach
  what the first one promised.

**All three are fixed as of 2026-07-31** — verified in the code, not assumed:

- `ReviewAnswers` has an `Array.isArray(value)` branch rendering attachments
  as read-only thumbnails (`ProjectOverviewShare.jsx`), so there is nothing
  left to accidentally type over.
- Both merge paths auto-pin client images — `mergeDetectiveAnswers` and
  `mergeDiscoveryAnswers` each carry the "From the client's brief" note.
- "Open their answers" opens the review screen, via a one-shot flag consumed
  once the portal data has loaded.

Left here rather than deleted because the *shape* of the failure is the
lesson: two surfaces built from one data shape drifted apart, and the second
one was missed. That is why the "Quoted separately" fix on 2026-07-31 was
applied to `DetectiveSheet.jsx` and `ClientBriefFields.jsx` together.

A note that says "not fixed" long after something is fixed costs a real
re-investigation every time someone reads it. If you fix an item above, say
so here in the same commit.

**Branch audit.** `claude/debug-code-6u77sp` and `fix/save-button-alignment`
were stale WIP branches from earlier sessions (Jul 24–25), both superseded by
what had since landed on `main` — one would have reintroduced removed
questionnaire fields, the other's one live change (`submitForm`'s owner_id
null-check) was already on `main` in a slightly different form. Both deleted
locally; remote deletion on `origin` returned HTTP 403 — this session's git
credentials cannot delete remote refs, so that needs doing from a surface
with actual push/admin rights to the GitHub repo. `gh-pages` is not a feature
branch — it's the CI-published Pages deploy target — and was left alone.

## "Done" has two authorities, and the user's one wins

`project.pathDone` is the user's own verdict on a stop, and it outranks both
the live condition and `pathReached` — in BOTH directions. Tri-state on
purpose: `true` = done, `false` = not done, key absent = let the app decide.

It is not a boolean because the app has to be correctable both ways. Every
condition in `pathStepMeetsCondition` is a proxy — Touchpoints reads
`brandSurfaces`, Identity reads craft signals — so a mark drawn in Illustrator
or a stage approved over the phone is invisible to them, and Touchpoints has
already shipped the opposite bug, auto-ticking on onboarding before any work
existed. A toggle that only worked in one direction would visibly do nothing in
half the cases that need it, and a control the user learns is unreliable is
worse than no control.

**One tick, one meaning.** The flag counts on the journey bar, the home dots,
"what's missing" and `pathFirstGap` alike. Do not add a third "marked done, no
content" visual state, a "marked manually" asterisk, a reason field, a nag when
a manually-done stage later gains real content, or a strict-vs-manual setting.
A tick that shows but does not count is the same broken feedback loop as one
that vanishes; a third symbol is a decode cost on every glance with no action
attached. Un-marking carries no confirm — nothing is destroyed, the toggle is
its own undo, and the honest prediction is that the answer is always yes.

This does not reopen the vanishing-tick problem `markPathReached` exists to
stop. That bug was *silent, non-local* loss caused by ordinary work; this is an
explicit action the user just took with the same control sitting there to undo
it.

## The identity stamp is words, never a number or a time

`project.identityEditedAt` and `identitySavedAt` are real ISO strings and
**neither is ever rendered as a clock or version number**. `src/lib/identityStamp.js`
turns them into one of three sentences for any surface that needs a words-only
status. The ambient Identity chip was removed (noise under the path title);
Bump on Preview remains the deliberate save-point control. The owner has no
concept of time and numbers do not register, so "v4" or "3 days ago" is a
value that must be translated before it means anything. `identityStamp.test.js`
fails on a digit in any label, and on the words *stale / out of date /
unsynced / pending / behind / you* — a status that names the user as the agent
of a deviation is a verdict with no edit that fixes it.

**It compares against the last saved version, not against the client.** The
obvious wording — "the client hasn't seen this version" — was rejected because
nothing in this app records a client being shown the identity (`portalSeen`
runs the other way: it tracks the designer seeing the client's activity). That
chip would have been bound to a field nothing writes, which is the Promise/Proof
failure exactly. `identitySavedAt` is written by `bumpDesignVersion`, which is
a real, discrete, already-existing event.

Nine store actions stamp `identityEditedAt`; they are listed in
`IDENTITY_WRITER_ACTIONS` and the test drives each one. Instrument the store,
never the ~40 view call sites that funnel through it. `updateBrandField` also
writes org contact details and print notes, so it stamps only for ids in
`IDENTITY_FIELDS` — a new phone number is not a change to the identity.

The manual `Bump · vN` control in `src/views/DesignView.jsx` was deliberately
left alone: a version stays a milestone you name, edits alone do not spend one,
and every bump fires a `versionService` snapshot against an 8-per-project cap.

## The client chat shows time two different ways, on purpose

One thread, two audiences, two representations. Do not "unify" them.

- **Client side** (`src/components/PublicClientPortal.jsx`) — a conventional
  timestamp, in the client's own locale and zone. A client is an ordinary
  person judging whether their designer is responsive, and this is what every
  other messaging surface they use shows.
- **Studio side** (`src/components/ProjectOverviewShare.jsx`) — day dividers
  only, from `src/lib/messageDayLabel.js`. No per-message stamp, no clock time.

A clock time is not information for this owner; it is an input to a subtraction
performed against a "now" fetched from somewhere, billed on every message.

The vocabularies still map, which is what stops a phone call going wrong: "the
message you sent this morning" and a divider reading **Today** are the same
fact at different resolution. **An app-invented scale would break that** — do
not replace the day names with Recent / A while back / Ages, because none of
those has an equivalent in the client's speech.

**Absolute day names, never elapsed.** Today / Yesterday / the weekday name /
a flat `Earlier` past the current week — a closed list of four, guarded by
`messageDayLabel.test.js`, which fails on any digit and on
*waiting / overdue / unanswered / late / stale / you / ago*. An absolute day
states a fact about the MESSAGE; "3 days unanswered" states a fact about the
PERSON, and the only edit that fixes that is the reply already being avoided.
Collapsing to `Earlier` also stops the label becoming a quietly bigger
accusation the longer a thread sits.

Do not add: a "show exact times" toggle (a second decision to undo the first),
hover/tap-to-reveal the real stamp (`title` is never the carrier of meaning
here, and it turns a label into a control), a response-time stat or streak, or
a third divider state for "marked read" — the unread divider already exists.

Related and NOT the same thing: step approvals and change-requests genuinely
have no per-event time. They live in the `client_portals.step_status` jsonb and
share the portal's `updated_at`, which is what the "Per-event times don't exist
server-side" note in `src/lib/clientInbox.js` refers to. Per-MESSAGE times do
exist — `client_portal_messages.created_at` is real, is returned by
`get_client_portal_messages`, and needed no migration. Giving approvals their
own timestamps would need one.

## The journey is declared once — derive from it, never restate it

`src/lib/journey.js` owns the path: the stops, their order, their ids, their
views, their labels, and how many there are. Everything else reads from it.

Use `JOURNEY_STEPS`, `PATH_VIEWS`, `PATH_STEP_COUNT`, `labelForView(view)`,
`labelForStepId(id)`. Never write a stop's label as a string literal, never
retype the list of views or ids, never hard-code the number of stops.

This is the dominant defect in this codebase. At the v1.53.6 rename, nine
modules held their own copy and exactly one was updated:

- three completion gates compared a five-row count against `7`, so `pathFull`
  and `packReady` were unreachable and a finished project read 5/7
- the first-run demo tour walked new users through a seven-step path
- the shortcuts modal advertised keys 6 and 7, which do nothing
- the Helper status line, the resume banner, the to-do headings, the client
  inbox and the badge list all named stops the app had renamed
- `WorkLogPanel`'s neutral `'Work'` fallback was swept into `'Touchpoints'`
  by a bulk rename, so unlabelled hours would be blamed on a real stop

A copy fails loudly on correct changes and stays silent on wrong ones — the
worst of both. `journeySingleSource.test.js` greps source for restated labels;
per-step *logic* keyed by id is fine and expected, restating the *words* is not.

Tests must derive too. `processGuide.test.js` and `clientInbox.test.js` both
froze the old order and old labels, so an intentional rename read as a
regression and turned `main` red.
