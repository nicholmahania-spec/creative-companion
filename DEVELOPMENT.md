# Development

`CLAUDE.md` is the product requirements document and nothing else. This file
holds the operational knowledge: how to build, commit and deploy, the
guardrails enforced in code, and the rules for advisors, agents and skills.

Numbers here were re-verified on 2026-08-05 against the actual source. Several
had drifted from the note that previously carried them — treat any figure as
measurable, and measure before trusting it.

## Table of Contents
- [Commands](#commands)
- [Git Workflow](#git-workflow)
- [Deployment](#deployment)
- [Node Version](#node-version)
- [Key Files](#key-files)
- [Enforced Guardrails](#enforced-guardrails)
- [Architecture Notes](#architecture-notes)
- [Design Principles](#design-principles)
- [Agent References](#agent-references)
- [Testing & Personas](#testing--personas)

## Commands

```sh
npm run build   # production build (do NOT call `vite build` directly — vite is not on $PATH)
npm run dev     # dev server
npm test        # vitest unit tests
npm run bump    # increment version in src/lib/version.js
npm run cc      # the CLI (see below) — `npm run cc -- export harbor`
```

### `cc` — the command line

```sh
node bin/cc.mjs <command> [workspace] [options]
```

A **workspace** is the app's own backup payload: what Settings → Backup
downloads, what cloud sync pushes, what `public/demos/*.json` are. Pass a path,
a demo name (`harbor`, `soft-signal`), or nothing — with no argument `cc` uses
the newest `creative-companion-backup-*.json` in the working directory.

| Command | Does |
|---|---|
| `cc ls` | every project: type, client, stages done, pack readiness, deadline |
| `cc info` | one project in full — brief, direction, system, work, client, decisions |
| `cc check` | what the pack is still missing. **Exits 1 when not ready**, so it gates CI |
| `cc contrast` | WCAG reading of a palette, with the smallest fix for each failure. Takes bare hex codes too |
| `cc export` | the brand book PDF, markdown, HTML, tokens, mark files and zip, to a directory |

Every command takes `--json`; `check` and `contrast` take `--strict` /
`--warn-only` to choose the exit code.

**How it runs `src/`.** `src/` is Vite code — extensionless relative imports,
the `@` alias, `import.meta.env` — and plain Node resolves none of it.
`scripts/cli/runtime.mjs` asks Vite itself via `ssrLoadModule`, applying the
real `vite.config.js`. So the CLI and the app call the *same* functions and
cannot drift into two answers about what a brand pack contains. No new
dependency; the server runs in `middlewareMode` and never binds port 5274.

**What it deliberately does not touch.** Not the zustand store — that is a
browser object with a `localStorage` adapter, and a CLI that needed one would
need a fake browser. The backup payload is the seam the app already exports
through, and `buildBrandPackSnapshot` is the function every exporter reads.

**The one honest limitation.** `rasterizeToPngDataUrl` needs a canvas and
returns `''` without one, so images that are not already PNG/JPEG data URLs are
dropped from a headless PDF. `cc export` counts them and says so rather than
shipping a book with silent holes.

`scripts/cli/cli.test.mjs` builds the demo book end to end and asserts the PDF's
page count — `scripts/build-harbor-demo.mjs` imported a path that had stopped
existing and nothing noticed for months, because nothing ran it.

## Git Workflow

**Bump the version yourself, in the same shell sequence as the commit, using
the right command for what the commit actually is:**

- `feat!: ...` / `fix!: ...` / a `BREAKING CHANGE` footer → `npm run bump:major`
- `feat: ...` → `npm run bump:minor`
- anything else (`fix:`, `chore:`, no prefix, ...) → `npm run bump`

Then `git add package.json package-lock.json` and commit — same commit, not a
follow-up one.

Why it matters: with bumps skipped, the version label in the UI freezes, so it
stops being a signal of whether what you are looking at is current. Four merges
once shipped to production while the footer still read `v2.5.1`, which reads as
"nothing deployed" when in fact everything had.

**This used to be a git hook (`.githooks/prepare-commit-msg`). It is disabled
and must not be re-enabled without testing first.** In this repo's execution
environment, any hook that stages files during a commit — `pre-commit`,
`prepare-commit-msg` and `commit-msg` were all tried — has its staged changes
land in the *next* commit's tree, never the current one. The symptom if this
recurs: `package.json`'s committed version is always one bump behind the
working tree, and the repo looks permanently dirty between commits.

## Deployment

**Netlify is primary; never use a relative base**

Netlify serves from the **root**, so `vite.config.js` uses `base: '/'`.
GitHub Pages (secondary, `GITHUB_PAGES=true`) serves from `/creative-companion/`.

**`base` must never be `'./'`.** Relative asset URLs resolve against the
*current route*, so on a public deep link like `/c/<portalId>` the browser
requests `/c/assets/index-*.js`, misses, gets the SPA rewrite to `index.html`,
and tries to parse HTML as JavaScript — a blank page on every client link.
Works at the root, breaks everywhere else. CI guards this.

Public deep links (`/f/:shareId`, `/c/:portalId`) must build URLs with
`publicUrl()` and match routes via `routePath()` from `src/lib/appPaths.js` —
never `window.location.origin` or a raw `location.pathname` — so they survive
both root and subpath deploys. SPA fallback: `netlify.toml` +
`public/_redirects` for Netlify, `dist/404.html` for Pages.

**Vercel deploys via its GitHub App, not a workflow.** `.github/workflows/vercel-deploy.yml`
was deleted 2026-08-05: it called the `vercel` CLI at six points and never
installed it, so it had never succeeded once. Nothing gates Vercel deploys on
CI — the native mechanism for that is Vercel's Deployment Checks in project
settings, which is not currently configured.

## Node Version

**26 in CI, 24 on the deploy targets, and that is deliberate**

Making these agree is what breaks the deploys, so the split is the fix, not a
leftover:

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

**Do not raise `netlify.toml` to 26 without checking first.** There is no
Netlify check on pull requests, so nothing catches an unsupported build image
until it has already failed a production deploy — and Netlify is primary.

## Key Files

- `todo.md` — prioritized remaining work list. (`insights.md` no longer exists;
  the old note claiming it does was stale.)
- `src/app/MainOutlet.jsx` — where views are rendered and props are wired.
  `src/App.jsx` still exists and is large, but view rendering has moved out of
  it; check both before assuming where a prop comes from.
- `src/store/useAppStore.js` — Zustand store. Persist key is
  `creative-companion-storage` (not `creative-companion`), version 5.
- **CSS is split, and `src/index.css` is not where it lives.** That file is a
  two-line `@import`. The design system is across `src/styles/`:
  - `src/styles/shell.css` — the always-on shell: tokens, header, journey bar,
    sidebar/drawer, buttons, overlays. Start here.
  - `src/styles/lazy-*.css` — per-view, imported by the route component.
  - `src/styles/brand-book-builder.css`.

  Grepping `src/index.css` for a rule returns nothing and reads as "this style
  does not exist" — that misfire cost four wrong conclusions in one session.
  Search `src/styles/` instead.

  **Per-view lazy stylesheets are all loaded eagerly.** Vite preloads them, so
  you cannot rely on `lazy-x.css` being absent on another view. A rule in one
  view's sheet naming a class another view's root carries WILL apply there —
  that is how a dead `.brand-layout` rule in `lazy-design.css` pinned the brief
  page to 672px.

  LightningCSS strict — never leave orphaned declarations outside a rule block.

## Enforced Guardrails

These fail `npm test`. Each was written against a bug that shipped and was
invisible in review, and each has been verified to actually fail when the bug
is reintroduced. **A guardrail that cannot fail is worse than none** — it
records a rule as enforced while checking nothing.

### Typography — `src/lib/typography.test.js`

- **Size type in `rem`, never `px`.** Respects the user's browser setting.
- **Three numeric font weights only: 500 / 600 / 700.** Anything else must
  first be added to the `Plus+Jakarta+Sans:wght@` request in `index.html`.
- **`--font-sans` must lead with a family `index.html` actually loads.** It led
  with Inter, which was never loaded, so every screen rendered in the fallback.
- **Muted text must clear 4.5:1** against the worst surface it lands on:
  `#F5F5F5` light, `#2F2F2F` dark. Dark values must be solid hex, never
  `rgba()` — alpha composites below the floor.
- **Never re-hardcode a theme token further down the file.** A literal late in
  the file shadowed the theme-aware definition near the top, making the fix
  above it dead code.
- **Cap prose at 65ch.**

Sources: **Rutter, *Web Typography*** (Ampersand Type, 2017) for practice;
**Stocks, *Universal Principles of Typography*** for the fundamentals. The 65ch
cap and the `--fs-1..6` ramp are arguments Rutter makes at length.

### Containers — `src/lib/containers.test.js`

- **One corner radius: `var(--radius)` = 4px**, plus `--radius-none` (0),
  `--radius-pill` (999px), and `50%` for circles. Never a literal.
  `--radius-sm` / `-organic` / `-squircle` / `-node` are **aliases** and must
  never become separate sizes again.
- **Snap spacing to `--space-1..7`** (0.25/0.5/0.75/1/1.5/2/3rem) and type to
  `--fs-1..6`.
- Prefer whitespace and type weight for hierarchy; add a border only when space
  genuinely can't do the job.

Source: **Kholmatova, *Design Systems*** (Smashing, 2017) — functional vs.
perceptual patterns. She assumes a team; her process material needs translating
to a studio of one.

### Ratchets — `importantRatchet.test.js`, `scaleRatchet.test.js`

Two-sided: **over budget fails the build, and under budget without lowering the
budget also fails.** A budget with slack silently refills.

As measured 2026-08-05:

| Ratchet | Current budget |
| --- | --- |
| `!important` declarations | **577** across 13 files |
| distinct raw font sizes | **74** |
| distinct raw spacing values | **312** |

Do not add another `!important` — fix the base rule instead. When you remove
some, lower the budget in the same commit.

Count declarations, not occurrences: a plain `grep -c "!important"` overcounts,
because some hits are the phrase inside comments — several of them comments
warning about the practice. The test strips comments first.

### Removed guards, and why (so they are not re-added by accident)

- `packCountPhrasing.test.js` — **removed 2026-08-05 on the owner's
  instruction.** It failed the build on any rendered `N/6` pack ratio and
  required "shortlist full" phrasing. PRD §7 specifies a dashboard completion
  percentage and §32 measures completion percentages, which that guard
  forbade. The guard lost; percentages are now allowed.
- `claudeMdPaths.test.js` — removed when `CLAUDE.md` became the PRD. It
  asserted the doc referenced real repo paths; the PRD contains none.
- `src/lib/clientBriefContract.test.js` — removed as a broken duplicate. It
  called `Deno.readFileSync` in a Vitest/Node run so it threw on every run, and
  once fixed it read the wrong file and matched zero tips. The real cap lives
  in `src/lib/brief/clientBriefContract.test.js`.

## Architecture Notes

### The journey is declared once — derive from it, never restate it

`src/lib/journey/journey.js` owns the path: the stops, their order, ids, views,
labels, and how many there are. Everything else reads from it.

Use `JOURNEY_STEPS`, `PATH_VIEWS`, `PATH_STEP_COUNT`, `labelForView(view)`,
`labelForStepId(id)`. Never write a stop's label as a string literal, never
retype the list of views or ids, never hard-code the number of stops.

This is the dominant defect in this codebase. At one rename, nine modules held
their own copy and exactly one was updated: completion gates compared a
five-row count against `7` so `pathFull` was unreachable; the demo tour walked
users through a seven-step path; the shortcuts modal advertised keys that do
nothing; and a neutral `'Work'` fallback was swept into a real stop name by a
bulk rename, so unlabelled hours would be blamed on a stage.

A copy fails loudly on correct changes and stays silent on wrong ones — the
worst of both. `src/lib/journey/journeySingleSource.test.js` greps source for
restated labels. Per-step *logic* keyed by id is fine and expected; restating
the *words* is not.

### The work clock is private; the invoice is hand-entered

- `project.workLog` — written by the work clock. Where the time went, kept for
  the user. Never billed, never sent to a client.
- `project.timeLog` — billable hours. Hand-entered only. Nothing writes here
  automatically.

They were one array. Auto-filling the invoice from the clock means every idle
page you left open quietly becomes something someone is asked to pay for.

### Displayable timestamps vs ordering timestamps

In `src/lib/client/clientInbox.js`, `at` is the **displayable** time and only
exists where a real per-event timestamp does (message rows). Step/approval rows
have no `at` — their `sortAt` is the portal's row-level `updated_at`, shared by
every event on that portal. **Never render `sortAt`.** The desk did, and showed
the same fabricated age against several different approvals.

## Design Principles

### ADHD / Executive Function First

The product exists to reduce executive-function friction for creative
freelancers (task initiation, working memory, decision fatigue, time blindness,
rejection sensitivity). See PRD §21 and §33.

**Before finalizing any UI, UX, workflow, or gating decision, consult the
`adhd-executive-function-advisor` subagent first.** Aesthetics, convention and
cleverness are subordinate to this lens. If a proposed change adds friction
(extra required decisions, ambiguous locked states, silent state loss,
shame-coded errors) it needs reworking or rejecting, even if it is otherwise
good software design.

**Reducing cognitive load is the single biggest priority within this rule.**
When choices compete, pick whichever requires the user to think, decide or
remember less. Simpler and dumber beats clever and complex.

**Decision fatigue carries that same top-priority weight.** Every extra choice
a screen forces is a real cost even when each looks small. Default
aggressively; group and order lists so the common case never requires reading
the whole thing; never fix one kind of friction by introducing a new decision
elsewhere.

**Every ADHD audit/finding must state four things:** the problem, why it's a
problem for ADHD (which mechanism it hits), the solution, and why that solution
actually helps. A finding without its "why" is incomplete.

### Icon Rule — an icon leads, a word follows

**Icon-only is permitted for six patterns. The list is closed.** Anything not
on it gets a visible text label beside its icon.

1. `×` — close/dismiss what is on screen
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
decodable, but Settings is visited rarely, so its meaning is re-derived rather
than recognised. That is why `⚙ Settings` and `🔧 Tools` keep their labels.
**Do not strip labels from anything already labelled.**

**`title` is never the carrier of meaning.** It does not exist on touch and
does not fire on keyboard focus.

Accessibility floor: `aria-hidden="true"` on decorative glyphs; an accessible
name that *begins with* the visible text; 44x44px hit targets; 3:1 contrast on
any glyph carrying meaning; never encode state in glyph or colour alone.

**Do not add** a "show labels" setting, tooltips as a remedy, an icon legend,
hover-to-reveal labels, or a first-run tour explaining the icons. If a glyph
needs teaching, it needed a label.

### Modals always center

Popup/dialog cards must render centered on screen on every breakpoint — never
bottom or top sheets. Shared overlay chrome lives in `.export-overlay` /
`.export-panel` in `src/styles/shell.css`; keep `align-items: center`.
Persistent side panels for browsing a list are a different pattern and are not
covered by this rule.

## Agent References

### Devil's advocate — `devils-advocate`

Attacks a decision that has just been made and finds a named, real, citable
source who disagrees. **It may never invent an expert, quote or citation** — a
fabricated authority gets acted on and repeated, which is worse than silence.
"No credible opposition found" is a valid verdict. Capped at two objections,
each with who / what they'd say / where it bites / what would change your mind,
and a confidence rating it may not round up.

### Design — `editorial-layout-director`

For composition, not correctness. Reach for it when a screen passes every audit
and still reads flat, generic or template-shaped. It works in intentional
asymmetry, dynamic whitespace and optical balance, and finishes with a squint
test.

**It ranks below `adhd-executive-function-advisor`, always.** If the two
disagree, the advisor wins and the layout gets reworked. It must justify every
asymmetry in one sentence, and it inherits the container/typography
constraints rather than being exempt from them.

### Audit — `five-w-one-h-auditor`

Interrogates a feature/screen/flow with who, what, where, when, why, how.
Use for a completeness sweep: the orphaned feature nobody can find, the control
with no stated purpose, data with no home, an action with no visible trigger, a
design call with no reason on record, a failure with no recovery path.

"This is undocumented" is a valid finding on its own — undocumented intent is
what turns a correct call into an apparent regression next time someone touches
it.

### Teaching — `design-process-professor` (never runs alone)

Teaches the brand identity design process itself. **Always invoked together
with `adhd-executive-function-advisor` on the same question, and the two
outputs reconciled before they reach the user** — handing over two agents'
recommendations and asking which to follow is itself a decision billed at the
worst moment.

Grounded in **Slade-Brooking, *Creating a Brand Identity*** (Laurence King,
2016) plus **Bokhua, *Principles of Logo Design*** (Rockport, 2022), with the
Stanford d.school process guide secondary. Bokhua supplies the three sketching
stages — initial (quantity over quality), refinement, fine-tuning.

**It notices skipped steps and never gates on them.** Preconditions are banned
as phrasings. It names exactly one gap, because a survey of unfinished stages
is a backlog and a backlog turns "I'm working" into "I'm behind." Actions are
sized by finished output ("one sentence", "three words on a page"), never by
duration. Currency claims require `WebSearch` and a citation.

### QC — `quality-control-critic`

Two modes, inferred from what it's handed: an image or PDF is Mode B (the
creative work), code or a running screen is Mode A (the product).

Mode B carries a named craft checklist for marks, from Bokhua Ch. 3: overshoot,
same-sized look (a white mark reads larger than the same black mark), the bone
effect, visibility on photographic backgrounds, and balance.

**Mode B must see the artifact.** Confident feedback on work it never opened is
the same failure as false praise. When it can't see the file it does not grade
and does not stop dead either — one line that it needs eyes on it, one
low-effort route to send it, and what it will check.

Constraints on delivery: Blocking capped at three, **two in Mode B**; Polish
capped at three and optional. **The verdict carries its own size** — "not yet,
2 things, both in the type", never a bare "don't ship it". **In Mode B it may
never say don't-ship without naming the smallest honest version that could go
out today.** The work is the subject of every sentence; the person never is.

Do not add a gentle-mode toggle, a numeric score, or an encouraging closing
paragraph.

## Testing & Personas

### `new-client-persona` + `cold-start-beta-tester`

A pair, meant to be run together: the client states an ask, the designer tries
to deliver it through the app, and what the app is missing falls out of the
attempt. They report what happened and hand the fixing to the agents that own
it.

`new-client-persona` is a founder with **nothing** — no mark, no assets, no
vocabulary. Each run takes exactly one scope (full identity / logo only / brand
guide only / printables only / naming plus identity / rebrand-in-waiting). It is
deliberately a *bad* briefer — feelings not specifications, self-contradiction,
no design vocabulary — since a clean brief tests nothing. It never reads the
repo.

`cold-start-beta-tester` is a competent designer using the app for the first
time who drives **only the running app**, never the source. If it can't find a
feature in the interface, that *is* the finding. Its lane is what's **missing**
rather than what's broken, and it is barred from proposing UI.

**Stated limitation:** project instructions may be injected into a subagent's
context regardless of what it reads, so the zero-knowledge condition cannot be
mechanically guaranteed. Every report must carry a contamination note — a
contaminated run that says so is useful; one that doesn't is worse than no test.

**Everything the client persona generates is synthetic and must carry a
`DEMO — ` prefix.** A generated brief is indistinguishable from a real one once
it is in the store.

## Contested claims in the Expansion Spec (reviewed 2026-08-05)

The Expansion Spec was appended to `CLAUDE.md` verbatim on the owner's
instruction. Two of its load-bearing claims did **not** survive review by the
`devils-advocate` agent. Recorded here rather than in `CLAUDE.md` so the spec
stays the spec — but do not start building §1 without reading this.

### §1 — the five-dimension vocabulary and the "82% aligned" score

**Does not survive as written.** *(Confidence: medium-high — findings are real
and directly on point; full texts returned 403, so treat the structure as solid
and any specific loadings as unread.)*

- **Shaikh & Chaparro**, *Perception of Fonts: Perceived Personality Traits and
  Uses* (Wichita State SURL; repr. *Digital Fonts and Reading*, World
  Scientific, 2016) — 379 participants, 40 typefaces, 15 semantic-differential
  scales. Factor analysis returned **three CORRELATED factors** (Osgood's
  Potency / Evaluative / Activity), not five independent ones. They also treat
  *appropriateness* as a separate instrument, where the spec folds Formality
  and Era onto the same ruler.
- **Brumberger**, *The Rhetoric of Typography* (Technical Communication 50(2),
  2003) — readers ascribe persona to the **text** independently of the
  typeface, and ratings shift by demographic. Personality is a property of
  type-plus-copy-plus-reader, so a stored per-font vector is unstable however
  carefully it is tagged.

Why it matters mechanically: Euclidean distance assumes orthogonal,
commensurably-scaled axes. If the real structure is three correlated factors,
five hand-drawn axes over it are partly redundant — Weight/Energy and
Formality/Era will co-vary — and a redundant pair silently gets **double
weight**. The scalar also hides the dimension that carried the brief: a font
wrong on Warmth alone still scores ~78%, which the spec's own copy renders as
"worth a second look, not a blocker" — when Warmth is exactly the brief for
"warm, playful, approachable".

Cheapest honest fixes, in order: drop the single percentage and show
**per-dimension bars**; or validate the five scales first (≈30 fonts, ≈20
designers, factor it — if you recover three correlated factors, use three axes
with an explicitly weighted or Mahalanobis distance).

**Also unsourced:** the spec applies ONE vocabulary to typefaces, colours,
patterns and imagery. A search for evidence that colour and typeface share a
dimensional space returned **nothing** — every study found was typeface-only.
Not disproof, but the burden sits with the spec.

### §4 — "consistency checking is just a diff"

**Survives with rework.** *(Confidence: high on the colour metric — the ΔE00
numbers below were computed, not recalled. Medium on font extraction —
practitioner sources, untested toolchain.)*

Use **CIEDE2000** (CIE 015 / ISO 11664-6), not RGB distance. Computed on the
spec's own example:

| Pair | ΔE00 | RGB Euclidean |
| --- | --- | --- |
| `#2E5C8A` vs `#1B4C7E` (the spec's real mismatch) | **5.4** | 27.6 |
| `#F2F2F2` vs `#E5E5E5` (two off-whites nobody would flag) | **2.77** | 22.5 |

Half the perceptual difference, nearly the same RGB distance — so any RGB
threshold tuned to catch the first also fires on the second. Under this repo's
ADHD mandate that is not cosmetic: a checker that cries wolf on invisible
differences attaches an unresolvable "did I do something wrong?" to every
upload. Suggested bands: ΔE00 < 2 match, 2–5 close, > 5 different.

Extraction has no cheap fix and the promise should be narrowed:
- "simple pixel sampling" on a photographic mockup returns the background
- CMYK print assets have a legitimately different hex after conversion and
  will always flag
- **type converted to outlines carries no font name at all** — and that is the
  normal delivery format for brand work, so the checker would report clean on
  exactly the files most likely to have drifted

Scope it to "flag only what we can extract confidently, and say plainly when
we could not read the file."

### Not checked

Algorithm-aversion / false-precision literature (Dietvorst, Logg) was probed
and **not** retrieved — do not cite it as support. The dimensionality objection
above already disposes of the percentage without it.
