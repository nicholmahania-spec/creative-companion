# Creative Companion

React 19 + Vite 8 + Zustand 5 single-page app.

## Commands

```sh
npm run build   # production build (do NOT call `vite build` directly — vite is not on $PATH)
npm run dev     # dev server
npm test        # vitest unit tests
npm run bump    # increment version in src/lib/version.js
```

## Workflow rule — never assume, always confirm before touching code

**Never make a design/placement/behavior decision on your own judgment and
just implement it.** Even when a fix seems obvious or was implied by an
earlier conversation, stop and ask for explicit confirmation before editing
code — including follow-up fixes to something just discussed. The user has
said this directly: "never assume. always ask for confirmation before
touching the code." This applies to every change, not just large ones.

## Git workflow rule — version bump (MANUAL — hooks don't work here)

**Bump the version yourself, in the same shell sequence as the commit, using
the right command for what the commit actually is:**
- `feat!: ...` / `fix!: ...` / a `BREAKING CHANGE` footer → `npm run bump:major`
- `feat: ...` → `npm run bump:minor`
- anything else (`fix:`, `chore:`, no prefix, ...) → `npm run bump`

Then `git add package.json package-lock.json` and commit — same commit,
not a follow-up one.

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

## Key files

- `todo.md` — prioritized remaining work list
- `insights.md` — architecture, design tokens, CSS gotchas, critical constraints
- `src/index.css` — full CSS design system (~15k lines); LightningCSS strict — never leave orphaned declarations outside a rule block
- `src/App.jsx` — central orchestration / prop-drilling hub
- `src/store/useAppStore.js` — Zustand store

## UI rule — modals/popups always center, never bottom/top sheets

On mobile, popup/dialog cards (Discovery brief, Before/After, Shortcuts,
Command palette, confirmations, etc.) must render centered on screen, same
as desktop. Never slide up from the bottom or drop down from the top —
the user has said this explicitly: "I do not like popups that come from the
bottom or top. I need things front and center." All shared overlay chrome
lives in `.export-overlay`/`.export-panel` in `src/index.css` — keep
`align-items: center` at every breakpoint. (Persistent side panels that are
genuinely drawers for browsing a list, like the running to-do panel, are a
different pattern and not covered by this rule — this is about dialogs/popups
specifically.)

## Typography rules — enforced by `src/lib/typography.test.js`

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

Known and not yet fixed: **five stacked override layers** (`grep -n "lock"`
around lines 9961, 10037, 12015, 12858, 13388, 14494) totalling ~4.5k lines
and ~650 `!important`s. Do not add a sixth. If a style needs overriding,
fix the base rule.

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
sensitivity for a stranger uploading from a phone). **Known gap, not fixed:**
the client-portal form-submit path (`/c/:portalId`) still has no pull-back
mechanism into the project at all — pre-existing, not introduced this
session, but worth closing if the portal's own form-fill is meant to feed the
brief the same way `/f/:shareId` does via `mergeDiscoveryAnswers`.

**Branch audit.** `claude/debug-code-6u77sp` and `fix/save-button-alignment`
were stale WIP branches from earlier sessions (Jul 24–25), both superseded by
what had since landed on `main` — one would have reintroduced removed
questionnaire fields, the other's one live change (`submitForm`'s owner_id
null-check) was already on `main` in a slightly different form. Both deleted
locally; remote deletion on `origin` returned HTTP 403 — this session's git
credentials cannot delete remote refs, so that needs doing from a surface
with actual push/admin rights to the GitHub repo. `gh-pages` is not a feature
branch — it's the CI-published Pages deploy target — and was left alone.

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
