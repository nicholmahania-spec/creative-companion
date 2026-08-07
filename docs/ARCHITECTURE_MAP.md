# The six-area architecture, mapped against what is actually built

An outside review (2026-08-06) proposed reorganising the product around
**Client → Project → Work → Brand → Delivery → Relationship**, with six primary
areas plus a separate client portal. This maps that proposal against the code,
so the decision is made against what exists rather than what anyone remembers.

**Read this as a dated snapshot, not as a status file.** Per
`docs/ONBOARDING.md`, the ranking is code > tests > CI > rationale > any claim
in a doc — including this one. Every row below was checked against source on
2026-08-06 at `63f834b`, and the file path is given so the next reader can
re-check rather than trust it.

---

## The headline

**The reviewer could not see the running app** — it says so itself — and still
listed eight things to "build first". **Six of the eight already exist.**

| Proposed as "build first" | Reality |
|---|---|
| Client directory | Exists — `src/views/ClientsView.jsx`, `ClientRecordView.jsx` |
| Projects | Exists — the whole app is project-shaped |
| One Next Step | Exists — the Next card, Phase 5 |
| Client questionnaires | Exists — `PublicDiscoveryFill.jsx`, `/f/:shareId` |
| Brand Vault | **Partly** — the brand system exists; the asset library is schema-only |
| Client portal | Exists — `PublicClientPortal.jsx`, `/c/:portalId` |
| Approval / feedback | Exists — approve / request-changes per step |
| Final delivery | Exists — `PublicBrandReveal.jsx`, `/d/:portalId` |

That is not a feature gap. **It is the clarity problem the same review scored
6/10, and it is better evidence for that criticism than the criticism itself.**
The product's difficulty is not that these are missing. It is that someone
looking at it cannot tell they are there.

Two of the proposal's specific recommendations also contradict decisions
already taken, and are **not** actioned here: "Powered by Creative Companion"
on client materials (PRODUCT.md §20 and the owner's 2026-08-06 call both say
never), and progress counters like "7 of 9 milestones" (§21, plus the owner's
standing note that numbers do not register).

---

## The one real architectural gap

**Clients are not an entity in the app.** `buildClientGroups`
(`src/lib/client/clientDirectory.js:23`) derives the whole client directory by
grouping projects on a lowercased `detective.clientName` string.

Consequences, all of them observable:

- Nothing can be attached to a client — no note, no preference, no file, no
  history. There is nowhere to put it.
- Renaming the client on one project **splits them into two clients**.
- A client with no project cannot exist, so there are no leads and no past
  clients.
- Everything on the client record is inherited from whichever project
  mentioned it first: email, phone, logo.

`ClientRecordView.jsx` is 172 lines and shows a monogram, name, project count,
phone/email pills, a "New project" button, and a list of projects. Nothing
else, because nothing else is stored.

**And the real schema already exists.**
`supabase/migrations/20260805120000_clients_brands_projects.sql` declares
`clients` → `brands` → `projects` with RLS, and `src/services/projectSync.js`
creates a real client row and brand row on every sync (lines 97–142). **Those
rows are written and never read back.** The hierarchy the review asks for is
already in the database, already owner-scoped, already populated — and the UI
in front of it groups strings.

That is the same shape as the Asset Library: schema landed, UI never built. It
is also the cheapest high-value work available, because the hard half is done.

---

## Area by area

### Home — proposed as "what do I need to do today?"

**Mostly exists.** `HomeView.jsx` carries multi-project pickup, "needs you",
and hours. The Next card gives one action rather than a list.

**Gap:** the review's "Recent Activity" feed. There is no cross-project
activity timeline. Note that a previous session deliberately deleted an
activity panel because it read from a table that never existed — the honest
sources named at the time were `workLog`, tasks and projects. That reasoning
still holds.

### Clients — proposed as the heart of the product

**Exists as a view, missing as a model.** See above. This is the gap.

What the review wants on a client (notes, preferences, documents, timeline,
brand, "what's next") requires client-level storage. The table exists; nothing
reads it.

### Projects — proposed as modular workflows per project type

**Already built, and already decided.** `src/lib/journey/projectTypes.js`
declares seven types, and stages switch by what the job actually bought —
`logo` walks four stops, `expansion` three. PRODUCT.md §26.1 records the owner
choosing modular over a fixed ten-stage spine on 2026-08-05.

**The honest limit is in the file's own header:** four of the seven types
(`logo-package`, `identity`, `refresh`, `rebrand`) currently resolve to the
*same* five stops, because the finer stages do not exist yet. `refresh` and
`rebrand` also set `startsFromExisting: true`, which nothing consumes — so the
"start from what exists, audit it, keep/change/explore" flow the review
describes has a flag and no behaviour.

That is the real Projects work: not a re-architecture, the finer stages.

### Brand Vault — proposed as the signature feature

**Half built, and the half that exists is good.** Identity is already
sub-sectioned (`identitySubsteps.js`): Mark, Words, Colour, Type, Preview.
Colour carries HEX/RGB/CMYK, roles, contrast and accessibility. Typography
carries heading/body faces.

**Missing:** the container. There is no asset library UI, no per-asset usage
rights, no version chain surfaced, and no "Download Brand Package" that is
browsable rather than one zip. `src/lib/assets/assetLibrary.js` and
`assetBytes.js` exist with tests and are imported by nothing.

The review's framing is sharper than the current one and worth adopting:
**everything belongs to a brand.** Fonts are not a feature, they are an asset
of a brand. That is also the correct argument for finishing the asset library
before font packs.

### Tools — proposed as "contained, supporting the workflow"

**Already contained.** `TOOLS_MENU_VIEWS` is five entries: `spark`, `review`,
`insights`, `book`, `concept`. The review's warning about a nav with fourteen
top-level items does not apply to this app.

### Studio — proposed as business software

**Exists, thinly.** The sidebar already has a "Studio" group: Home, Calendar,
Clients, Settings. Invoicing, hours and work log exist
(`src/features/billing/`). Settings is deliberately thin — Calm, Theme,
Notifications, Keyboard shortcuts, Retained versions, Sample project, Danger.

**Missing:** studio branding lives in one pref (`studioName`, added
2026-08-06) rather than a profile with a mark; no revenue/retention view; no
saved workflow templates.

### Client Portal — proposed as a separate, simpler experience

**Exists and is already separate.** Three public no-login routes: `/f/` fill,
`/c/` portal, `/d/` delivery reveal. The portal carries the questionnaire,
messaging, per-step review with approve / request-changes, and the brand book.

**Gap, and it is the review's best portal point:** the portal has **no asset
download**. After delivery the client can view the book; they cannot come back
for their logo files. "A living brand home rather than a portal that becomes
useless after delivery" is a real hole, and it depends on the asset library.

---

## What this changes about the plan

Nothing in the proposal argues for a re-architecture. The spine it describes —
Client → Project → Brand → Delivery → Relationship — is the spine already
chosen and largely built. Three items are genuinely missing, and they are the
same three already on the list:

1. **Read the client/brand hierarchy the sync already writes.** Highest value,
   lowest cost, unblocks client notes, preferences, history and repeat-client
   flow in one move.
2. **Asset library UI** — unblocks the Brand Vault, the client download centre,
   and font packs, in that order.
3. **Finer project-type stages** — so the four collapsed types differ, and
   `startsFromExisting` does something.

Everything else the review proposes either exists, contradicts a standing
decision, or is Phase 3 by its own admission.
