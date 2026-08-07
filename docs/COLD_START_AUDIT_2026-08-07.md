# Cold-start audit — what a stranger sees

**Date:** 2026-08-07 · **Version audited:** v3.51.1 · **Branch:** `claude/visual-audit-fix-review-qjcxmd`

Companion to `VISUAL_AUDIT_2026-08-07.md`. That one asked *does it render correctly.*
This one asks **does it make any sense to somebody who has never seen it.**

Method: a genuinely cold browser context — no `localStorage`, no prior session — walked
through the app in the order a first-time user meets it, at **390 × 844** and **1440 × 900**.
Every screen, every menu, every disclosure expanded, plus the client-facing public routes.
Screens were read for *comprehension*, not layout: what does this word mean, what is this
number counting, what happens if I press this.

The persona is the product's own primary user from `CLAUDE.md` §5 — a working brand
designer — but one who has never used this tool and has not read the docs. They know
branding. They do not know **this app's vocabulary**.

---

## Headline

> **The app never says what it is, never says what to do, and hands you a project you
> did not create.**

There is no onboarding, no tour, no welcome, no help, no tooltip, and no "what is this"
anywhere in the product. I searched every captured string across every screen:

| Term | Occurrences |
|---|---|
| `Welcome`, `Getting started`, `Tour`, `How to`, `Tip`, `Docs` | **0** |
| `Help` | 2 — both the word *"Helper"* (a Settings toggle for the mascot) |
| `Learn` | 4 — all *"Learned"* / `MyProject_Brand_Guide.pdf` |

The nearest thing to a guided introduction is **`Settings → Sample project → Soft Signal /
Harbor & Hearth`** — two unlabelled buttons at the bottom of Settings, filed under
`ACCESS · DATA`, directly above the red `DANGER` zone. A worked example is exactly what a
new user needs and it is buried in the last place they would look.

---

## Severity key

| | Meaning |
|---|---|
| **C0** | A new user is blocked, misled, or shown something factually wrong |
| **C1** | A new user can proceed but cannot tell what something means or does |
| **C2** | Friction, inconsistency, wasted first impression |

---

# Part 1 — The journey, in order

## Screen 1 — the password gate (the entire first impression)

What is actually on screen, in full:

```
Creative Companion                     ← logo
Creative Companion                     ← h1, the same words again
[1 Strategy] [2 Research] [3 Identity] [4 Touchpoints] [5 Assets]
Set a password for this device
Work stays on this device. There is no password reset — save it somewhere safe.
Name        [Optional]
Password    [        ] Show
8+ characters, mixing upper/lowercase, numbers or symbols.
Password strength: Enter password
Confirm     [        ]
[ Create ]
v3.51.1
```

### C0 — The stated password rule is not the rule

`LoginView.jsx:338` promises *"8+ characters, mixing upper/lowercase, numbers or symbols."*
`auth.js:47` enforces `pass.length < 6` — six characters, **no character-class check at
all**. And if you do fail it, the error reads *"Password must be at least 6 characters."*

So the first screen shows a rule, enforces a different one, and errors with a third. A new
user is asked to meet a stricter bar than exists, on the one screen where they have the
least patience.

**Fix.** Pick one. Either enforce what the copy claims, or — better, since this is a local
device password with no reset — state the real rule: *"At least 6 characters."* Delete the
character-class sentence; it is not checked. Align `SettingsView.jsx:424`'s `New (6+)`
placeholder to whatever is chosen so the two screens stop disagreeing.

### C0 — Nothing on this screen says what the product is

"Creative Companion" appears twice and means nothing to a stranger. The five chips —
`1 Strategy 2 Research 3 Identity 4 Touchpoints 5 Assets` — are the app's internal path
vocabulary, presented before the user has been taught any of it, and they are not
clickable. A designer landing here cannot tell whether this is a project manager, a
portfolio site, a design tool, or a note app.

**Fix.** One sentence under the wordmark, before the password: *"Take a brand identity
project from client brief to finished brand book — the workflow around the work, not
another design tool."* Label the five chips as what they are: *"The five stops you'll move
through:"*. This is the product's own positioning from `CLAUDE.md` §36 and it currently
appears nowhere in the running app.

### C1 — An irreversible commitment before any value is shown

*"There is no password reset — save it somewhere safe"* is the correct warning and it is
in the right place. But it is the **entire** proposition: a stranger is asked to accept a
permanent, unrecoverable consequence before seeing a single screen of the product.

**Fix.** Offer a way in that costs nothing — a *"Look around first"* link that loads one of
the existing sample projects (`Soft Signal` / `Harbor & Hearth`) read-only, with the
password step deferred until they create something of their own. The samples already exist;
they are simply unreachable until after the commitment.

### C1 — `Name` / `Optional` is the first thing you read, and it is ambiguous

Label says `Name`. Placeholder says `Optional`. Whose name — mine, my studio's, the
project's? It becomes the footer credit on client-facing pages, which is a meaningful
choice, and nothing says so.

**Fix.** `Your name` with placeholder `Shown on pages you send clients — optional`.

### C2 — Smaller things on this screen

| Finding | Fix |
|---|---|
| `Password strength: Enter password` — a status row whose value is an instruction | Hide the meter until a character is typed |
| `Create` — create *what*? | `Create my desk` or `Set password and start` |
| `Confirm` has no placeholder or hint while the field above has both | `Type it again` |
| Fields are bottom-rule only, very low affordance on white | Give inputs a visible box, as everywhere else in the app |
| `v3.51.1` shown to a first-time user | Keep it; it's small and harmless — but it is the only thing on screen with no purpose for this reader |

---

## Screen 2 — you land in a project you never made

Press `Create` and you arrive directly on Home. **There is no onboarding step at all** —
the panel the e2e helpers expect (`.onboard-primary`) never appears on a cold boot.

You are now looking at:

- a project called **"My project"** that you did not create or name
- a sidebar section `THIS PROJECT` with a `Desk` you have not heard of
- a heading that says **`Studio`** while the sidebar section above it also says `STUDIO`
- `NEXT / Strategy` and a `Continue · Strategy` button, for a project with nothing in it

### C0 — A phantom project

Auto-creating "My project" is defensible (a blank app is worse). Presenting it *as though
the user made it* is not. There is no "this is a starter — rename it or start a real one"
anywhere.

**Fix.** Name it honestly and make the next action obvious. Title the card
*"Starter project"* with one line under it: *"Rename this, or start a real one — nothing
here is saved to a client yet."* Then `+ New project` becomes the clear action instead of
competing with a project that looks already-underway.

### C1 — `Studio` is used for two different things, adjacent

The sidebar's section eyebrow is `STUDIO` (meaning *your workspace-level screens*), and the
page `<h1>` directly beside it is also `Studio` (meaning *the Home dashboard*). Two
meanings, one word, 60px apart.

**Fix.** Keep the `<h1>` as the orientation landmark and drop the sidebar eyebrow — it
labels a group whose members (`Home`, `Calendar`, `Clients`, `Settings`, `Tools`) are
self-evidently top-level. (Noted in the first audit as P2(d); the cold-start walk is what
makes it actually confusing rather than merely redundant.)

---

## Screen 3 — `Desk`, the densest screen in the app

`Desk` is one click from Home, sits under `THIS PROJECT`, and is where the product's
thinking lives. To a stranger it is eight unexplained all-caps sections in a row:

```
IDENTITY · LIVE ARTBOARD          RESEARCH · STARRED FOR THE CLIENT SHORTLIST
STRATEGY · THE BRIEF              CHECK MY BRAND
WHAT DID WE DECIDE?               CLIENT
WHAT'S NEXT                       YOURS ONLY          THIS WEEK
```

### C0 — `RES` · `IDE` · `TOU` · `ASS`

The `WHAT'S NEXT` list renders each upcoming stop with a right-aligned three-letter
abbreviation of the word already printed on the same line:

```
Research      RES
Identity      IDE
Touchpoints   TOU
Assets        ASS
```

They carry no information the full label doesn't, they read as codes with meaning, and the
fourth one is `ASS`. On mobile, where the row is narrower, they are more prominent, not
less.

**Fix.** Delete them. If the column exists to hold a keyboard hint, show the actual
shortcut (`2` `3` `4` `5`) — those are real, bound app-wide, and currently undiscoverable.

### C0 — Default colours presented as the user's brand

A brand-new project's `LIVE ARTBOARD` shows `#1C1917 #0F766E #A8A29E #FAFAF9` under the
wordmark "My project". Nothing marks these as defaults. A new user reasonably concludes
the app has picked their brand colours, or that someone else's project is loaded.

On mobile they are also **truncated to `#1C1…` `#0F7…` `#A8…` `#FAF…`** — a partial hex is
useless; it can be neither read nor copied.

**Fix.** Label the block *"Placeholder — set real colours on Identity"* until the user sets
one, and let the swatch row wrap or scroll on mobile rather than clipping the values.

### C1 — Two counts that appear to contradict

```
CHECK MY BRAND
  1 loose end
  5 brief answers nobody has given
```

One number, then a different number, stacked, both underlined like links. A stranger cannot
tell whether there is one problem or five, or how they relate.

*"nobody has given"* is also oddly accusatory for a solo user who is the only person who
could have given them.

**Fix.** One count, one register: *"6 things still open — 5 in the brief, 1 elsewhere."*
Replace *"nobody has given"* with *"not answered yet."*

### C1 — `WHAT DID WE DECIDE?` is unreadable as a feature

```
WHAT DID WE DECIDE?
[Why this typeface?]
[Why did we choose this?          ] [Ask]
[Check all 21]
```

On an empty project this asks why you chose a typeface you have not chosen. `Ask` implies
something will answer — a stranger cannot tell whether this is AI, search, or a note field.
`Check all 21` counts 21 of something never named.

**Fix.** Name the mechanism in the section, not the prompt: *"Decisions on record — search
what you've already settled, so you don't re-decide it."* Change `Ask` to `Search
decisions`. Change `Check all 21` to `See all 21 decisions`. On an empty project, show the
empty state instead of a question about a non-existent choice.

### C1 — `Already done` / `Skip this one` before you have started

The `WHAT'S NEXT` card offers three actions on the first stop: `Open Strategy`,
`Already done`, `Skip this one`. On a fresh project, two of the three dismiss work that has
not begun, and neither says what dismissing does.

**Fix.** On a project with no content anywhere, show only `Open Strategy`. Reveal the
dismissals once there is anything to dismiss.

### C2 — Also on Desk

| Finding | Fix |
|---|---|
| `Pack still thin for handoff` — three jargon words in five | `Not enough here to send the client yet` |
| `Open Strategy` appears twice, both as primaries | One primary; demote the artboard copy to a text link |
| `YOURS ONLY` has two near-identical note fields (`Park an idea for later` / `Notes to yourself — what you would not put in an email`) | Merge, or state the difference in a single line |
| `THIS WEEK` shows `S M T W T F S` with no dates | Add the dates, or drop the strip when there are no hours |
| Grey dead block ~120px below `No hours logged this week` | Let the column end |
| `Open Assets` is a bare text link between two bordered buttons | Match the affordance to its neighbours |

---

## Screen 4 — `+ New project`, the thing a real user actually wants

### C0 — There is no field for the project's name

The only text input is `Business or client name` under `WHO'S IT FOR?`. The project silently
takes that name. A user looking for "project name" will not find one and will not learn that
the client name became it.

**Fix.** Either label it honestly — `Client or business name` with a hint *"this names the
project too"* — or add an optional `Project name` that defaults to the client name.

### C0 — `INCLUDED` labels a column of *unchecked* boxes

```
INCLUDED                          QUOTED SEPARATELY
[ ] Primary logo                  [ ] Letterhead and stationery
[ ] Logo variations               [ ] Email signature
[ ] Colour palette                …
```

Every box is empty, under a heading that asserts these items *are* included. The heading
describes a category; the checkbox describes a state; they contradict on first read. And
`QUOTED SEPARATELY` implies a quoting feature the product does not have, so the distinction
has no visible consequence.

**Fix.** Make the headings describe the act, not the state: `What you're making` /
`Costs extra — tick if agreed`. Or drop the two-column split entirely for v1 and let the
designer tick what is in scope.

### C1 — `Scope: full brand package · 5 stops on the path`

A grey chip that looks pressable, isn't, and uses two pieces of internal vocabulary
(`scope`, `stops on the path`) before either has been introduced.

**Fix.** *"This sets up all five stages — you can change it later."*

### C1 — Two exits, no way to choose between them

`[Start project]` and `[Send them the brief to fill in]` sit side by side with nothing
explaining the difference or which is normal. The second is a sentence, not a label.

**Fix.** Make the primary unambiguous and the alternative subordinate: `Start project`,
then below it as a link — *"Or email the client a form to fill in first."*

### C2 — Also here

| Finding | Fix |
|---|---|
| All-caps eyebrows (`WHO'S IT FOR?`, `IS THERE A DATE IT HAS TO BE DONE BY?`) on a conversational form — the exact "settings eyebrow" pattern `AGENTS.md` bans on client-facing forms | Sentence case |
| `IS THERE A DATE IT HAS TO BE DONE BY?` wraps to two awkward lines | Shorten to `Any deadline?` |
| The form is centred with a large left gutter while every other page is left-aligned full width | Match the rest of the app |
| Native `mm/dd/yyyy` date field regardless of locale | Use the user's locale format |

---

## Screen 5 — the Tools menu, where features go to hide

```
GO TO           Brand book · Asset library · Timer · ✦ Ideate · ◎ Review
THIS PROJECT    ↗ Share Strategy form · ⬇ Export · $ Hours & invoice · ? Discovery brief
```

### C1 — Two names for the same client-facing thing

`Share Strategy form` and `Discovery brief` are both about getting the brief to the client,
and nothing distinguishes them. A new user must open both to learn the difference.

**Fix.** Name them by what the user gets: `Send the brief to the client` and
`Preview what the client sees`.

### C1 — `Ideate` and `Review` are opaque as menu items

`Ideate` is jargon; `Review` is ambiguous about who is reviewing (me? the client?).

**Fix.** `Ideate` → `Explore ideas`. `Review` → `Check before sending` (which is what it
does — it lists gaps and revision rounds).

---

## Screen 6 — `Ideate`, ~90 words of instruction before one input

The preamble stacks four layers before any control, and the third mixes tenses:

> Tried several idea prompts (messy is fine) · Tried opposite ideas (calm vs bold) · Saved
> useful prompts · Did not stick only to the first idea · One direction chosen to sketch
> next — Push for many messy directions. Try the opposite button. Do not marry the first
> idea. Keep A/B/C short.

The first half is **past tense** — it reads as a record of what you already did, on a screen
where you have done nothing. The second half is imperative. They are one undifferentiated
paragraph.

### C1 — Fixes

| Finding | Fix |
|---|---|
| Past-tense checklist reads as false history | Render it as an actual checklist with empty checkboxes, or rewrite to imperative |
| Four instruction layers (~90 words) before one text field | Keep the one-line subtitle; move the rest behind a `What is this?` disclosure |
| `1 · DIVERGE (ROUGH DUMP)` | `1 · Get lots of ideas down` |
| Buttons `New` / `Opposite` with no object | `New prompt` / `Flip it` |
| Helper text says *"Promote"*; no control says Promote | Match the verb to the button (`Choose`) |
| `Keep diverging (or choose A/B/C)` is the primary, styled disabled, and is a parenthetical not an action | Make the primary `Add another idea`; put the guidance beside it |

---

## Screen 7 — `Review`

```
Gaps · 5 left
NOTES (SHARED WITH TOUCHPOINTS)
ROUNDS      No rounds yet — 2 agreed        [Start a round]
FEEDBACK    Nothing logged yet.             [Log it]
FIX · 5 GAPS   Goal / who it is for · Tagline · ★ Starred pictures · Voice · Positioning
```

| Finding | Fix |
|---|---|
| **C1** `No rounds yet — 2 agreed` reads as a contradiction (it means 0 used of 2 contracted) | `0 of 2 revision rounds used` |
| **C1** `Gaps · 5 left` — gaps in what? | `5 things still to fill in` |
| **C1** `NOTES (SHARED WITH TOUCHPOINTS)` exposes internal coupling as a parenthetical | *"Notes — these also show on Touchpoints"* |
| **C1** `FIX · 5 GAPS` lists bare labels with no verbs and no visible affordance | Prefix each with the action and make them obviously clickable |

---

## Screen 8 — Settings, and a demo client's name in your account

### C0 — `Every page you send says: Sparrow's Promise · 7 Aug 2026`

`StudioIdentityBlock.jsx:42` hardcodes it:

```js
const preview = creditedFooter(['Sparrow's Promise', name, '7 Aug 2026'])
```

A brand-new user with an empty studio name and a project called "My project" is told, as a
statement of fact, that every page they send carries **a client name they have never heard
of** and a **fixed date**. It is meant as a preview; it is not framed as one, and the sample
data is a real client name from the owner's own portfolio.

**Fix.** Frame it as an example and use the user's own data: *"Example — pages you send will
read: `<project name>` · `<your studio name>` · `<today>`"*. Fall back to a neutral
placeholder (`Client name`) rather than a real one.

### C0 — Password minimum contradicts the signup screen

`New (6+)` here vs `8+ characters, mixing upper/lowercase, numbers or symbols` on the gate.
Same fix as Screen 1: one rule, stated once.

### C1 — The sample projects are hidden in the worst possible place

`Sample project → [Soft Signal] [Harbor & Hearth]` — two unlabelled buttons under
`ACCESS · DATA`, immediately above `DANGER · Clear all projects · Full reset`. These are the
app's only worked examples and the single best answer to "what does this thing do."

**Fix.** Surface them on the empty Home and on the gate as *"Look around a finished project
first."* Say what the button does before it does it — pressing an unlabelled button next to
a danger zone is not a risk a new user will take.

### C2 — Also in Settings

| Finding | Fix |
|---|---|
| `CALM` as a section heading | `Comfort` or `Reduce distraction` |
| `Notifications: All` — a state-showing button that doesn't look like a cycle control | Use a select, or `Notifications: All ▾` |
| `Backup` / `Import` with no note on format or scope | *"Downloads everything as one JSON file"* |
| `Clear all projects` vs `Full reset` — no stated difference, both destructive | Say what each destroys, and follow `CLAUDE.md` §2 (undo, not confirm) |
| `Keyboard shortcuts → Show` is the only help-shaped thing in the app, and it is buried | Also expose it from the Account menu |

---

## Screen 9 — what the *client* sees (the secondary user, per `CLAUDE.md` §5)

A client is by definition always a first-time user. Visiting a bad or expired portal link
(`/c/<unknown>`) gives them, in full:

```
This link isn't working right now. Try again shortly.
```

On a blank white card, ~700px of empty space below it, **no branding, no designer name, no
project, no recovery path**.

### C0 — The message is wrong, and it is the designer's first impression

An unknown id is permanent, not transient. *"Try again shortly"* tells the client to keep
retrying a link that will never work. There is nothing telling them whose link it was or
who to contact — and this page is, for many clients, their first contact with the
designer's professionalism.

`/f/<unknown>` at least prints `Brand discovery questionnaire` above the same sentence.
`/c/` prints nothing at all.

**Fix.** Distinguish the cases. For an unknown/expired id: *"This link has expired or was
mistyped. Ask <designer/studio name> for a new one."* Carry the studio identity (name and
logo — the app already stores both) on every public route, and reserve *"try again
shortly"* for genuine network failures.

---

# Part 2 — Cross-cutting findings

## C0 — Four screens do not survive a page refresh

`App.jsx:345` restores `activeView` from `localStorage` against an allow-list. Four ids are
missing from it, so a reload silently returns you to Home:

| Screen | Refresh behaviour |
|---|---|
| `Desk` | → Home |
| `Clients` | → Home |
| `Asset library` | → Home |
| `New project` | → Home |

Verified by hashing screenshots: `desk`, `clients`, `assets` and `create` all rendered
byte-identical to `home`. The code comment at `App.jsx:361` already admits the `clients`
case and leaves it.

For a new user this reads as the app losing their place at random — and mid-way through
`New project`, a refresh silently discards a part-filled form. `CLAUDE.md` §21 lists
*"Pause and resume"* as a core principle; it fails on four screens including the two a
newcomer uses most.

**Fix.** Add `desk`, `clients`, `clientRecord`, `assets` and `create` to the allow-list
(and to `sessionResume`'s `ALL_VIEWS`, which is missing the same ids). Guard it with a test
that derives the allow-list from `viewRegistry.lazyViews` instead of restating it — a
hand-maintained duplicate of a list is what caused this.

## C1 — The vocabulary a newcomer must absorb, unassisted

Counted across the captured screens. None of these is explained anywhere:

| Term | Uses | Means |
|---|---|---|
| `Desk` | 90 | The per-project command screen |
| `handoff` | 17 | Sending final files to the client |
| `pack` / `Pack` | 17 | The bundle of deliverables |
| `Ideate` | 9 | Explore ideas |
| `wall` | 8 | The Research board |
| `thin` | 6 | Not enough content yet |
| `stops` | 2 | The five workflow stages |
| `Diverge` | 4 | Generate many options |
| `shortlist` | 4 | The A/B/C directions |
| `specimen` | 4 | A type sample |
| `Park` | 4 | Save an idea for later |
| `loose end` | 2 | An unresolved item |

Several are genuinely good product language — `Desk`, `wall`, `stops` are evocative and
worth keeping. The problem is that **all of them arrive at once, undefined**.

**Fix.** Two cheap moves, no new screens: (1) first-use inline definitions — the first time
`Desk` appears in a session, render it as `Desk — this project's home base`; (2) a glossary
behind the existing `Keyboard shortcuts → Show` panel, renamed `Shortcuts & terms`.

## C1 — There is no way to tell a placeholder from real content

On a fresh project, the same visual treatment is used for the user's data and for defaults
the app supplied: brand colours, the "My project" wordmark in the artboard, the
`Heading specimen` / `Body specimen` type samples, and the Settings footer preview. A new
user cannot tell which of these they are responsible for.

**Fix.** One consistent placeholder treatment — reduced opacity plus a `Placeholder` chip —
applied to every default until the user overwrites it.

## C2 — Mobile-specific, on top of everything in the first audit

| Finding | Fix |
|---|---|
| Hex values truncate to `#1C1…` on Desk — unreadable and uncopyable | Wrap or horizontally scroll the swatch row |
| The mobile drawer stacks *both* nav systems (`01–05` path **and** Studio/Projects/Desk) in one scroll — the first time a newcomer sees the whole IA, it is a 15-item list | Group with headings, or show the path only inside a project |
| To-do FAB overlaps content on Desk and Touchpoints (also in audit #1) | Covered there |
| The gate renders fine on mobile — no clipping — because the path views' header chrome isn't present | No action; confirms audit #1's root cause |

---

# Part 3 — Priority

Ordered by *"how much does this change whether a stranger can use the product."*

| | Item | Why |
|---|---|---|
| 1 | Say what the app is on the gate; offer `Look around first` via the existing samples | Nothing else matters if they don't know what it is |
| 2 | Fix the password rule contradiction (gate / enforcement / error / Settings) | Factually wrong on screen one |
| 3 | Public-route error copy + studio identity on `/c/` and `/f/` | The client's first impression of the designer |
| 4 | Add the four missing ids to the `activeView` allow-list | Silent data/place loss on refresh |
| 5 | `Sparrow's Promise` out of the Settings preview | A stranger's name presented as the user's own |
| 6 | Frame the auto-created project as a starter; name the project field on intake | Removes the "whose project is this" confusion |
| 7 | Delete `RES/IDE/TOU/ASS`; label placeholder colours; fix the `1 loose end / 5 answers` split | Desk is the product's core screen and its densest |
| 8 | `INCLUDED` heading vs unchecked boxes; the two unexplained exits | The first real task a user performs |
| 9 | Ideate/Review copy; Tools menu naming; glossary | Comprehension, once they are moving |
| 10 | Remaining C2s | Polish |

---

## Not raised

- **The five-stop path, `Desk` as a concept, board-primary on Research, Define form-only.**
  Settled owner decisions. Several *names* are hard for a newcomer, and that is a
  first-use-explanation problem, not an argument to rename or restructure anything.
- **Layout, contrast, touch targets, clipping.** Covered in `VISUAL_AUDIT_2026-08-07.md`;
  not repeated here.
- **The `Helper` / mascot feature.** Off by default; a cold user never meets it.

---

# Part 4 — Status

Against Part 3's priority list. Written after implementation, not predicted from it.

| # | Item | State |
|---|---|---|
| 1 | Say what the app is on the gate | **Done.** A positioning sentence plus a caption naming the five chips as a path; the chips' accessible name now comes from that visible caption via `aria-labelledby` rather than an `aria-label` only assistive tech received |
| 1b | `Look around first` via the samples | **Deferred, deliberately.** Pre-auth access to the samples means rendering the app read-only before a password exists — an auth-surface change, not a copy fix |
| 2 | Password rule contradiction | **Done.** The gate states the real minimum and the strength guidance separately |
| 3 | Public-route error copy + studio identity | **Done.** "Try again shortly" → the portal's own recovery line; the Settings preview reads as the example it always was |
| 4 | Four missing ids in the `activeView` allow-list | **Done.** Both hand-maintained lists derive from `viewRegistry` now, so a new view cannot be forgotten by one of them |
| 5 | `Sparrow's Promise` out of the Settings preview | **Done** |
| 6 | Frame the auto-created project as a starter | **Done.** Tagged `Starter — rename it or start your own`, via a shared `isStarterProject` predicate the migration also asks — `'My project'` is a sentinel and could not simply be renamed |
| 6b | Name the project field on intake | **Done, by labelling rather than by adding a field.** The client name silently *became* the project name; it now says so, with the truthful escape hatch (`renameProject` is wired). A second optional text box was rejected: the screen's own header records the advisor ruling that the client name is the only thing worth typing here |
| 7 | `RES` / `IDE` / `TOU` / `ASS` | **Done.** Deleted |
| 7b | Placeholder colours presented as the user's brand | **Done.** Labelled while the palette is still the factory four, via the existing `paletteIsUntouched` — `color.js` records three features already broken by asking this question the wrong way. Hexes also stopped truncating at 390px |
| 7c | `1 loose end` / `5 brief answers` | **Done.** The headline counted *categories* while each row counted *items*; it sums the rows now. `nobody has given` → `not filled in yet` |
| 8 | `INCLUDED` over unchecked boxes | **Done — and the finding was wrong.** The heading was accurate; the real defect is that blank means full scope, so ticking *narrows*. The rule now sits next to the boxes, in the state it is about |
| 8b | Two exits with nothing to choose between them | **Done.** Stacked, not side by side: one primary, one subordinate sentence |
| 9 | Decisions panel comprehension | **Done.** `What did we decide?` → `Decisions on record` with a line saying what it is; `Ask` → `Search`; `Check all 21` → `Check all 21 brand items` |
| 9b | Ideate / Review naming, Tools menu, glossary | **Not done.** A glossary mechanism exists (`lookupGlossaryTerm`) but these names are untouched |
| 10 | Remaining C2s | **Partly.** `Pack still thin for handoff`, the dateless `S M T W T F S` strip and the mobile hex truncation are done. The duplicate `Open Strategy` primaries and the two near-identical `YOURS ONLY` note fields are not |

## Findings that were wrong

Recorded because an audit that never marks its own misses trains no one.

- **`INCLUDED` as a false heading.** It was true. See item 8.
- **The mobile drawer as one undifferentiated 15-item scroll.** It was already
  grouped under three visible headings — `Studio`, `Projects`, `This project`
  — with 14 interactive rows across them. Verified at 390px; no change made.
