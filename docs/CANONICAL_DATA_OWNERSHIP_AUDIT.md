# Canonical Data Ownership Audit

**Date:** 2026-08-12
**Branch:** `claude/canonical-data-ownership-audit-8njb3q`
**Base commit:** `6a86208`
**Scope:** read/write ownership of project and brand data. Audit only — no
production behaviour was changed by this document.

> **This document changes nothing.** Every finding below is a description of
> the code as it stands at `6a86208`. No fallback was removed, no writer was
> retired, no test was weakened. Three other workstreams (App-wide Visual
> Reset, Production Package Truth, Navigation/Lifecycle Regression Suite) are
> live on the same base; several findings here touch surfaces they own and are
> marked **cross-workstream — do not act from this branch**.

---

## 1. Executive summary

The historical failure pattern — *one brand fact, several storage locations,
several input surfaces, export fallbacks papering over the gap* — has been
**largely dismantled**, and dismantled deliberately. The repo now carries an
explicit ownership vocabulary that most codebases never get:

- `FIELD_HOMES` (`src/lib/book/bookContent.js:80`) names one home per printed field.
- `BRIEF_WORD_SOURCES` / `BRIEF_OWNED_WORDS` (`src/lib/brand/briefWords.js:42,94`)
  encode **resolve, never copy** for facts the brief already asks for.
- `allBrandSurfaces` (`src/lib/journey/touchpoints.js:179`) splits the client's
  answer from the designer's additions instead of merging them into one array.
- Five source-grep guard tests already pin the rules:
  `positioningOwnership`, `sheetIsNotAnAuthoringSurface`, `bookOwnsNothing`,
  `phase0Ownership`, `identityConsumesBrief`.

The specific field the task names — `project.positioning` — **is fixed**. It has
one authoring surface (`DesignView.jsx:1141`), a separate storage slot from
`brief`, a snapshot entry, and a test that pins both halves.

What remains is not the old shape. It is **four narrower defects**, each real
and each demonstrated by executable evidence (§11):

1. **`logoImage` has two independent authors** and the brand-book cover drop is
   the second one. It desyncs the `logoConcepts[chosen]` mirror and the next
   concept-level edit silently destroys the cover — which is also the file the
   client ZIP ships as the logo. **P0.**
2. **`versionService.restoreVersion` restores two fields the snapshot never
   captures** (`brief`, `deadline`), blanking both. **P1.**
3. **Client submissions write `detective` without recomposing `brief`**, so the
   composed summary — and every export reading it — is stale until the designer
   happens to press a key in Define. **P1.**
4. **The export layer resolves only 2 of the 6 brief-backed identity fields**
   that the UI resolves through `effectiveWord`, so the sheet and the delivered
   book disagree about `voice`, `dontUse`, `messagingPersonality` and
   `orgEmail`. **P1.**

Plus a cluster of orphan/round-trip defects around the Asset Library (F5 in §4, F8 in §7).

**Nothing found requires an emergency fix, and nothing was fixed here.**
Findings 1 and 3 are the two that can lose work a designer did.

---

## 2. Canonical ownership table

Categories used in the *Kind* column:

| Kind | Meaning |
|---|---|
| **AUTH** | authoritative — someone typed it, it is the system of record |
| **DERIV** | derived — computed from AUTH data, never typed |
| **MIRROR** | a controlled copy of AUTH data, re-derived on every write |
| **UI** | interface state, not brand truth |
| **SAMPLE** | transient measurement, replaceable, not a decision |
| **ARTIFACT** | produced file bytes / production metadata |

Writer classes follow the task's A–E scale (A legitimate shared, B controlled
derived, C compatibility, D duplicate authoring location, E dangerous).

### 2.1 Brief / Strategy

| Field | Canonical owner | Writers | Readers | Kind | Fallbacks | Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| `detective.*` (all chapter ids) | `project.detective` — the client's answers | `updateDetective` (A), `mergeDetectiveAnswers` (A, portal/OCR review), `mergeDiscoveryAnswers` (A, public link), `setProjectDeadline` (B, `projectDeadline` only), `createProjectFromIntake` (A), `linkBriefAttachmentToAsset` (B, `*Files` only) | DefineView, DetectiveSheet, pack snapshot, book, PDF, brandBrain, journeyProgress | AUTH | none | low | correct as modelled |
| `project.brief` | **derived** from `detective` | `updateDetective` (B), `applyDetectiveToBrief` (B, deprecated, **0 callers**), `createProjectFromIntake` (B), `updateProjectBrief` (**E** — only caller is `versionService:553`) | `exportFiles:363`, DesignView, `isStarterProject` | DERIV | `brief \|\| p.brief` at `useAppStore:1013` | **P1** | see F2, F3 |
| `positioning` | `project.positioning`, written on the sheet | `DesignView:1141` (A) | pack, bookContent, bookDocument, brandBookPdf | AUTH | `effectiveWord` → `detective.usp` for display only | low | **already correct** |
| `voice` | the brief (`detective.toneOfVoice`) | **none in `src/`** (by design); `versionService:569` (C) | `effectiveWord`, pack, book, PDF | AUTH-in-brief | `effectiveWord` on screen; `pack.voice \|\| pack.toneOfVoice \|\| d.toneOfVoice` in **two** downstream places | **P1** | see F4 |
| `messagingPromise`, `messagingProof` | the brief | none in `src/`; `versionService` (C) | pack, book | AUTH-in-brief | `p.X \|\| d.X` at `exportFiles:479-480` | low | **already correct** — the one fallback pair that matches the UI |
| `messagingPersonality` | the brief (`detective.brandAsPerson`) | none in `src/`; `versionService:599` (C) | `effectiveWord`, `pack`, `brandBookPdf:759` | AUTH-in-brief | **none in export** | **P1** | see F4 |
| `dontUse` | the brief (`detective.avoid`) | none in `src/` | `effectiveWord`, pack, `brandBookPdf:1967` | AUTH-in-brief | **none in export** | **P1** | see F4 |
| `doUse` | `project.doUse` | `DesignView:1142` (A) | pack, book | AUTH | none | low | **already correct** — no brief question exists, so an empty box is honest |
| `tagline` | `project.tagline` | `DesignView:1140` (A) | pack, book, PDF, caseStudy | AUTH | none | low | **already correct** |
| `orgEmail`, `orgPhone` | the brief (`clientEmail`/`clientPhone`), designer override on the project | StationeryKit (A, override), `updateBrandField` | `effectiveWord` (Stationery, EmailSignature, `applicationRepresentation:167`), pack, `brandBookPdf:362,1871` | AUTH+override | `effectiveWord` on screen; **none in export** | **P1** | see F4 |
| `audience`, `feel`, `brandWords`, `toneOfVoice`, `brandAsPerson`, `avoid`, `accessibilityNeeds`, `existingAssets`, `competitors`, `brandSurfaces`, `deliverablesPicked` | `project.detective` | as `detective.*` above | pack hoists several to top level | AUTH | — | low | **already correct** |
| `project.deadline` | `project.deadline` (calendar) | `setProjectDeadline` (A), `mergeDiscoveryAnswers` (B, only when studio blank), `createProjectFromIntake` (B) | CalendarView, DefineView, pack, `PRIVATE_PACK_FIELDS` strips it from delivery | AUTH | `projectDeadlineProp \|\| activeProject?.deadline` (`DefineView:68`) | **P2** | see F7 — `updateDetective('projectDeadline')` writes only the brief copy |
| `strategyAttributes` | `project.strategyAttributes` | `setStrategyAttributes` (A), `seedStrategyAttributes` (B, once-only) | AxisTagger, alignment | AUTH | `Array.isArray()` distinguishes "cleared" from "never set" | low | **already correct** — the materialise-once design is right |
| `brandTokenTags` | `project.brandTokenTags` | `setBrandTokenTags` (A) | alignment | AUTH | none | low | correct |

### 2.2 Directions

| Field | Canonical owner | Writers | Readers | Kind | Fallbacks | Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| `directions[]` | `project.directions` | `updateDirection`, `addDirection`, `deleteDirection`, `setDirectionRefs`, `captureDirectionFrom`, `toggleDirectionEvidence` — all through the single `directionsWithSlot` birth point (A) | DirectionComposition, DirectionPreview, pack, book | AUTH | `d.label \|\| d.id` (`exportFiles:422`) — compatibility for pre-slot records | low | **already correct** — exemplary |
| `directions[].chosen` | same | `updateDirection` only (A) | decisionLog, `directionWorkingMaterial` | AUTH | none | low | correct; the `chosen` ≠ `active` split is right |
| `activeDirectionId` | `project.activeDirectionId` | `setActiveDirection` (A), `addDirection` (B), `updateDirection` on choose (B), `deleteDirection` (B, clears) | DirectionInDevelopment, Identity | UI | none | low | correct |
| `directions[].refs`, `.evidence` | same | `setDirectionRefs`, `captureDirectionFrom`, `toggleDirectionEvidence` (A) | `directionComposition`, `directionEvidence` | AUTH (refs only) | resolves to `null` when the target is gone — deliberate | low | **already correct** |
| materialization | *not stored* | — | `directionWorkingMaterial`, `projectViewForDirectionMaterial:207` returns a **projection**, never a store write | DERIV | — | low | **already correct** |
| `currentPaletteRef` / `currentTypePairingRef` | **do not exist** | — | — | — | — | none | correct — computed on demand by `paletteSnapshot` / `typePairingSnapshot`, whose ids are content-derived |
| `artifacts{}` | `project.artifacts` | `putArtifact`, `captureDirectionFrom` (A, idempotent by content id) | direction resolution | AUTH (immutable) | none | low | **already correct** |

### 2.3 Identity

| Field | Canonical owner | Writers | Readers | Kind | Fallbacks | Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| `palette[]` | `project.palette` | `setProjectPalette`, `updatePaletteColor`, `addPaletteColor`, `removePaletteColor` (A) | everything | AUTH | `palette \|\| p.palette \|\| hard-coded four` (`exportFiles:329`) | low | correct |
| `paletteTokens[]` | `project.paletteTokens` (names + ids only) | `setPaletteTokens` — Colour bench only (A) | bookBuilder, book | AUTH | — | low | **already correct**; the book's second editor was removed and is grep-pinned |
| `colorRoles` | `project.colorRoles` | `setColorRole` (A) | contrast, pack, book | AUTH w/ derived default | `p.colorRoles \|\| mapPaletteRoles(palette)` | low | legitimate derivation |
| `typeHeading`, `typeBody` | Type bench | `DesignView` via `updateBrandField` (A) | everything | AUTH | `\|\| 'Plus Jakarta Sans …'` (`exportFiles:428`) | low | correct |
| `typeWhy`, `typeSource`, `typeLicenceNote`, `fontFilesLicensed` | project | `DesignView:2424` etc. (A) | packagePlan | AUTH | blank default is deliberate | low | correct |
| `logoConcepts[]` | `project.logoConcepts` | `addLogoConcept`, `chooseLogoConcept`, `updateLogoConcept`, `removeLogoConcept`, `setLogoConcepts` (A) | Mark screen, direction refs | AUTH | — | low | correct |
| `logoConcepts[].chosen` | same | the four concept actions (A) | mirror source | AUTH | exactly one chosen enforced by each writer | low | correct |
| **`logoImage`** | *intended:* MIRROR of `logoConcepts[chosen].image` | `addLogoConcept`/`chooseLogoConcept`/`removeLogoConcept` (B), `setLogoConcepts` (**incomplete B**), **`setLogoImage` (D/E)** — called by `App.jsx:2419,2422` (book cover drop), `DesignView:1318` (undo), `versionService:563` | pack cover, book Logo page, **`packagePlan:270,295` → the mark file in the client ZIP**, mocks, stationery | MIRROR | — | **P0** | see F1 |
| `logoDirection` | MIRROR of `logoConcepts[chosen].why` | four concept actions (B), `setLogoDirection` (D — `useAppStore:1097`; sole external caller `versionService:555`) | book Logo page | MIRROR | — | P2 | see F1b |
| `logoClientChose` | project | **no writer in `src/`** | — | orphan | — | P3 | see F9 |
| `designVersion` | `project.designVersion` | `bumpDesignVersion` / `bumpDesignVersionIfV1` only (A) | pack, versionService, DesignView | AUTH | `\|\| 'v1'` | low | **already correct** — paired with `identitySavedAt` in one `set` |
| `identityEditedAt` / `identitySavedAt` | project | `identityEdit()` spread into the same `set` as the field write (B) | `identityStamp` | DERIV | — | low | **already correct** |
| `identitySubstep` | project | DesignView (A) | DesignView | UI | `\|\| 'logo'` | low | correct |

### 2.4 Touchpoints

| Field | Canonical owner | Writers | Readers | Kind | Fallbacks | Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| `detective.brandSurfaces` | the client's brief | `updateDetective` only (A) | `allBrandSurfaces` | AUTH | — | low | **already correct** — grep-pinned |
| `designerSurfaces[]` | `project.designerSurfaces` | `SketchView:325` `updateBrandField` (A) | `allBrandSurfaces` | AUTH | unioned for display | low | **already correct** — this is the model fix that should be copied elsewhere |
| `touchpointApps{}` | `project.touchpointApps` | `SketchView.setTouchpointApp` (A) — read-modify-write via generic `updateBrandField` | book Applications page, `journeyProgress:199` | mixed | `\|\| {}` | P2 | see F10 — one bag holds AUTH (`note`), UI (`done`) and SAMPLE (`check`) |
| `touchpointApps[id].done` | same | same | progress | AUTH (acceptance) | — | low | correct meaning, wrong container (F10) |
| `touchpointApps[id].check` | same | `ApplicationForensicProof.onChecked` | forensic panel | **SAMPLE** | — | P2 | F10 — a transient measurement persisted inside the same object as a decision |
| produced application artifacts | `project.packageAssets` | `BusinessCardProduce`, `EmailSignatureProduce` (A) | `applicationPackageAssets` (**read-only**, documented) | ARTIFACT | — | low | **already correct** — the "no second storage model" note is honoured |

### 2.5 Production

| Field | Canonical owner | Writers | Readers | Kind | Fallbacks | Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| `packageAssets[]` | `project.packageAssets` | `addPackageAsset`, `updatePackageAsset`, `removePackageAsset` (A) | packagePlan, packageFiles, ClientPackagePanel, `applicationPackageAssets` | ARTIFACT | `\|\| []` | low | correct |
| `packageAssets[].deliverable` | same | `updatePackageAsset` (A) | deliverables checklist | AUTH | empty default is deliberate | low | **already correct** |
| `packageAssets[].rights` | same | `addPackageAsset` default `clientOwned` (A) | `USAGE_RIGHTS` gate in packagePlan | AUTH | — | low | correct |
| `packageAssets[].heldBack` | same | `addPackageAsset` (A) | README, panel | AUTH | — | low | correct |
| artifact references / fingerprints | **do not exist** for production | — | — | — | — | none | the only `fingerprint` in the repo is `clientInbox:122`, an unread-diff key — unrelated |
| production metadata | `packageAssets` row fields | as above | packagePlan | ARTIFACT | — | low | correct |

### 2.6 Delivery

| Field | Canonical owner | Writers | Readers | Kind | Fallbacks | Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| package readiness | **derived** | none | `packagePlan`, `packHandoffStatus` | DERIV | — | low | **already correct** — no stored "ready" flag to go stale |
| delivery / publication state | **the `client_portals` server row** | three SECURITY DEFINER RPCs (`brandDelivery.js`) | DeliverToClient, PublicBrandReveal | AUTH (server) | `preview` is local-only by design | low | **already correct** |
| `clientPortalId` | `project.clientPortalId` | `setClientPortalId` (A) | portal routes | AUTH | — | low | correct |
| `portalSeen{}` | root store | `markPortalSeen` (A) | clientInbox | UI cache | — | low | correct |
| client package / ZIP | **derived at export time** | none | `packageFiles`, `exportFiles` | DERIV | — | low | **already correct** — no stored ZIP |
| `PRIVATE_PACK_FIELDS` | `brandDelivery.js:43` | — | `buildDeliveryPack` | policy | pinned by `deliveryPackPrivacy.test.js` | low | **already correct** |

### 2.7 Assets

| Field | Canonical owner | Writers | Readers | Kind | Fallbacks | Risk | Recommendation |
|---|---|---|---|---|---|---|---|
| `state.assets[]` (Asset Library metadata) | root store + Supabase `assets` table | `addAssets`, `upsertAssets`, `setAssetCategory`, `removeAsset` (A) | AssetLibraryView **only** | AUTH | — | **P1** | see F5 — no restore path |
| asset bytes | Supabase `brand-assets` bucket; IndexedDB is a cache | `assetStorage.save` (A) | `assetBytes`, `signedUrls` | ARTIFACT | — | low | boundary is correctly drawn and documented |
| `detective.*Files[]` | `project.detective` | `mergeDiscoveryAnswers`/`mergeDetectiveAnswers` (additive, A), `linkBriefAttachmentToAsset` (B) | brief, adoption | AUTH | `file.assetRef` added beside the legacy `url` | low | correct — additive merge is the right call |
| provenance (`source_app`, `origin`, `role`, `replaces_id`) | Supabase row | `assetStorage.save` (A) | **nothing in `src/`** | AUTH | — | P2 | F5 — written, never read back |
| `moodItems[]` | root store | `addMoodPin` etc. (A) | Research wall, pack pins | AUTH | — | low | correct |

---

## 3. Duplicate writer findings

### F1 — `logoImage` has a second, unrelated author *(P0)*

**Two facts share one field.** `project.logoImage` is documented as a mirror of
`logoConcepts[chosen].image` — `chooseLogoConcept` (`useAppStore.js:3575`),
`updateLogoConcept` (`:3637`) and `removeLogoConcept` (`:3664`) all re-derive
it, and their comments say why. But `setLogoImage` (`:3328`) writes it
directly, and `App.jsx:2419,2422` (`handleCoverImageDrop`) uses that to store
**the brand book's cover art** in the same field.

The consequences, all demonstrated in §11:

1. After a cover drop, `logoImage` ≠ `logoConcepts[chosen].image`. The mirror
   invariant that three writers exist to maintain is broken.
2. The **next** concept-level edit — starring a concept, editing its `why`,
   deleting one — re-derives the mirror and **silently destroys the cover**. No
   toast, no undo, nothing to notice.
3. Conversely, a cover drop silently replaces the mark **in the client's
   deliverable**: `packagePlan.js:270,295` builds the logo file in the client
   ZIP from `pack.logoImage`, and `brandBookPdf.js:1134,1165` draws the Logo
   page from it. A designer dropping a photograph on the export preview cover
   ships that photograph as the brand's logo file.

Classification: **D/E — duplicate authoring location that can silently
overwrite canonical truth.** This is the same shape as the `positioning`
defect, in the image column instead of the text column.

**Do not fix from this branch.** `handleCoverImageDrop` is export-preview
presentation and `packagePlan` is Production Package Truth's contract. The fix
(a separate `bookCoverImage` field, or routing the drop through
`addLogoConcept`) crosses both.

### F1b — `setLogoConcepts` is an incomplete mirror writer *(P2)*

`setLogoConcepts` (`useAppStore.js:3614`) restores `logoDirection` from the
chosen concept — its comment says "The mirror is re-derived here too, so the
invariant holds after every write" — but it does **not** restore `logoImage`.
The one caller (`DesignView.jsx:1317-1318`) compensates by calling
`setLogoImage` immediately after, and `logoConcepts.test.js:200-201` pins that
pairing. So the bug is latent, not live: a second caller that follows the
comment rather than the call site gets a stale mark. `setLogoConcepts` is also
the only one of the five concept writers that does not stamp `identityEdit()`.

### F2 — `updateProjectBrief` is a writer for a derived field *(P1)*

`project.brief` is derived: `updateDetective` recomposes it on every keystroke
(`useAppStore.js:1012`). `updateProjectBrief` (`:999`) writes it directly,
bypassing the derivation. Its **only** caller is `versionService.js:553` —
and that call passes `data.brief`, which `createVersionSnapshot` never writes.
(`grep -n brief src/services/versionService.js` returns exactly two hits: the
comment at `:113` explaining that `brief` is deliberately *not* snapshotted,
and the restore at `:553`.)

So **restoring any version blanks `project.brief`**. It usually self-heals,
because the same restore then replays `data.detective` through
`updateDetective`, which recomposes. It does not heal when the snapshot's
detective is null or empty — then `brief: brief || p.brief` keeps the `''` that
`updateProjectBrief` just wrote.

`applyDetectiveToBrief` (`:1055`) is the deprecated one-shot recompute and has
**zero callers** — see F11.

### F3 — client submissions do not recompose the brief *(P1)*

`mergeDetectiveAnswers` (`:2188`) and `mergeDiscoveryAnswers` (`:2258`) both
write `project.detective` and neither recomposes `project.brief`. Proven in
§11: after a client submits through the public link, `detective.audience`
holds the answer and `project.brief` does not, and `buildBrandPackSnapshot`
ships the stale summary.

It then repairs itself on the next unrelated Define keystroke, which is the
worst version of this: the corruption window is invisible and its end is
untriggerable. Any export taken between submission and that keystroke — pack,
brand book, delivery pack — carries a brief missing the client's answers.

This is the **inverse of the historical pattern**: not "a second screen writes
the composed field", but "a second writer of the source field forgets the
derivation". Same root cause — the derivation lives inside one writer instead
of at the read.

Classification: **B, incorrectly implemented.** Both are legitimate writers of
`detective`; neither honours the invariant `updateDetective` maintains.

### F4 — the export layer resolves brief-backed words differently from the UI *(P1)*

`briefWords.js` states the rule and claims the export honours it:

> "…the same order `buildBrandPackSnapshot` already resolves in, so what you
> see is what ships."

It does not. Of the six fields with a `BRIEF_WORD_SOURCES` entry that the UI
resolves through `effectiveWord`:

| Field | Brief source | UI resolves? | `buildBrandPackSnapshot` resolves? |
|---|---|---|---|
| `messagingPromise` | `messagingPromise` | yes | **yes** (`exportFiles:479`) |
| `messagingProof` | `messagingProof` | yes | **yes** (`exportFiles:480`) |
| `voice` | `toneOfVoice` | yes | **no** (`exportFiles:365`) |
| `dontUse` | `avoid` | yes | **no** (`exportFiles:441`) |
| `messagingPersonality` | `brandAsPerson` | yes | **no** (`exportFiles:481`) |
| `orgEmail` / `orgPhone` | `clientEmail` / `clientPhone` | yes | **no** (`exportFiles:468,470`) |

`voice` is rescued twice downstream — `bookDocument.js:79` and
`brandBookPdf.js:760` each re-implement `pack.voice || pack.toneOfVoice ||
d.toneOfVoice`. That is the resolution rule duplicated in two consumers
instead of applied once at the boundary, and it only covers `voice`.

`dontUse` and `messagingPersonality` are **not** rescued anywhere. Proven in
§11: with `detective.avoid` and `detective.brandAsPerson` answered, the sheet
shows both "from the brief" and the pack ships `''` — the book's Usage page
prints "—" (`brandBookPdf:1967` is guarded by `has(pack?.dontUse)`) and the
Voice page's Personality line is absent (`brandBookPdf:759`).

`orgEmail`/`orgPhone` are the sharpest case, because the resolution *is*
applied in the produced artifacts (`applicationRepresentation.js:167-168`,
`StationeryKit`, `EmailSignatureProduce`) and *not* in the brand book PDF's
contact line (`brandBookPdf:362,1871`). The same project therefore prints the
client's email on the business card and a blank line in the book.

**Cross-workstream.** `exportFiles.js`, `brandBookPdf.js` and `packagePlan.js`
are Production Package Truth's surface. Do not change them here.

---

## 4. Orphaned field findings

### F5 — the Asset Library has no restore path *(P1)*

Three independent gaps compose into one:

1. **`hydrateFromPayload` never reads `payload.assets`.** `exportAllData`
   (`:2583`) deliberately includes `assets` with a comment explaining that
   metadata must travel. `hydrateFromPayload` (`:2595`) restores `templates`,
   `portalSeen`, `themeSource`, `clientRecords`, `deletedProjects`, `forms`,
   `prefs` — and not `assets`. It is the only exported key with no restore
   branch. Proven in §11.
   This is precisely the defect the `PERSISTED_KEYS` header memorialises for
   `templates` ("Anything in `partialize` has to be in the payload too, or the
   round-trip is lossy by construction") — the payload half was fixed and the
   hydrate half was not.
2. **`assetStorage.list(projectId)` (`assetStorage.js:69`) has no caller in
   `src/`.** `createAssetStorage` is constructed at exactly one site
   (`App.jsx:670`, brief-attachment adoption) and only `.save` and
   `.findBriefSource` are used. The durable Supabase `assets` table is
   therefore **written but never read back**.
3. Consequently `state.assets` is populated only by uploads made in this
   browser session's localStorage lineage. On a new device the shelf is empty
   even though both the payload and the server row hold the metadata.

The provenance columns (`source_app`, `source_ref`, `origin`, `role`,
`replaces_id`) written by `databaseRow` (`assetStorage.js:14-32` (`databaseRow`)) are read by
nothing in `src/` for the same reason.

### F6 — `clearAllData` leaves three persisted keys behind *(P2)*

`blankWorkspaceState()` (`:666`) seeds `templates: []` but not `assets`,
`clientRecords` or `portalSeen`. `clearAllData` (`:2858`) spreads that blank
state, so "clear all data" resets projects, tasks and mood items and leaves
the Asset Library, the client directory and the portal-seen cache intact.
Proven in §11.

`clientRecords` is the one that matters: it holds private notes and
preferences about named clients, and it survives an action whose label
promises it will not.

### F9 — fields written by nothing

| Field | Read by | Written by | Verdict |
|---|---|---|---|
| `logoClientChose` | nothing | nothing | fully dead. Its own doc comment in `brandIdentityDefaults` describes a feature that `chooseLogoConcept:3575` explicitly replaced ("no `logoClientChose` text box to keep in step with it"). **P3 — delete candidate.** |
| `roughIdeas` | `journeyProgress`, `stopEstablished`, its own screen | nothing (documented: `useAppStore.js:1395`) | intentionally frozen for saved projects. **P3, documented — leave.** |
| `messagingPersonality`, `voice`, `dontUse`, `messagingPromise`, `messagingProof` (project-side) | pack, book | nothing in `src/` except `versionService` restore | **intentional** — these are brief-owned; the project field is the override slot. Correct, but see F4: the override slot being empty must resolve, and for three of them it does not. |
| `forms` | `hydrateFromPayload`, `exportAllData` | nothing in `src/` | present in both halves of the round trip and authored nowhere. **P3.** |

### F11 — dead code around the brief

- `applyDetectiveToBrief` (`useAppStore.js:1055`): marked `@deprecated`, **zero
  callers** in `src/` or `e2e/`. P3.
- `pack.deliverablesPicked`: `BrandBookBuilderView.jsx:1065` reads
  `pack.detective?.deliverablesPicked || pack.deliverablesPicked`. The second
  operand is never set — `buildBrandPackSnapshot` has no top-level
  `deliverablesPicked` key. Dead half of a fallback chain. P3.
- `versionService` restores `positioning`, `voice`, `messagingPromise`,
  `messagingProof`, `messagingPersonality`, `imagery*` — of these only
  `positioning` and the `imagery*` trio have an authoring surface, so the rest
  restore `''` over `''` forever. P3.

---

## 5. Export fallback findings

Every `||` chain in the export path, classified. **None were removed.**

| Chain | Location | Why it exists | Still needed? | Canonical source | Removing it would… |
|---|---|---|---|---|---|
| `p.messagingPromise \|\| d.messagingPromise` | `exportFiles:479` | brief asks the same question; project field is the override | **yes** | brief, project overrides | drop the client's answer from the book |
| `p.messagingProof \|\| d.messagingProof` | `exportFiles:480` | same | **yes** | same | same |
| `pack.voice \|\| pack.toneOfVoice \|\| d.toneOfVoice` | `bookDocument:79` **and** `brandBookPdf:760` | compensates for `exportFiles:365` not resolving | **yes, but misplaced** | brief (`toneOfVoice`) | blank the Voice page. The right change is to resolve once at `exportFiles:365`, then these two become redundant — **masking a missing canonical resolution** |
| `pack.story \|\| d.story` | `bookDocument:79` | hoisting added later than the field | migration support | `detective.story` | drop Story for projects answered before hoisting |
| `p.colorRoles \|\| mapPaletteRoles(palette)` | throughout | roles are optional overrides on a derived default | **yes** | derived | force every project to assign nine roles |
| `p.writingCase \|\| 'sentence'`, `writingCaps \|\| 'sparing'` | `exportFiles:490-491` | `migrate` only re-merges defaults below v5 | **yes** — comment is accurate | default | print no writing rule on v5+ projects |
| `p.typeHeading \|\| 'Plus Jakarta Sans Bold'` | `exportFiles:428` | same default as the store | **yes** | store default | print an empty face name |
| `palette \|\| p.palette \|\| [4 hard-coded hexes]` | `exportFiles:329` | pack must always have a cover colour | **yes** | `project.palette` | crash the cover |
| `d.label \|\| d.id` | `exportFiles:422` | pre-slot directions stored a `label` | **compatibility** | `directions[].id` | mislabel legacy directions |
| `pack.detective?.deliverablesPicked \|\| pack.deliverablesPicked` | `BrandBookBuilderView:1065` | — | **no** — second operand never exists | `detective` | nothing. Dead. (F11) |
| `brief \|\| p.brief` | `useAppStore:1013` | keeps a hand-written brief when compose yields nothing | **yes**, but it is what makes F2's blanking sticky | derived | — |
| *(absent)* `pack.dontUse` ← `d.avoid` | `exportFiles:441` | — | **missing** (F4) | brief | — |
| *(absent)* `pack.messagingPersonality` ← `d.brandAsPerson` | `exportFiles:481` | — | **missing** (F4) | brief | — |
| *(absent)* `pack.orgEmail/orgPhone` ← `d.clientEmail/clientPhone` | `exportFiles:468,470` | — | **missing** (F4) | brief | — |

**The pattern worth naming:** the fallbacks that exist are almost all
defensible. The defects are the fallbacks that are **absent** where the UI has
one, and the one that is **duplicated in two consumers** instead of applied at
the boundary.

---

## 6. Derived-vs-authored findings (ADHD / computation rule)

Places the app still asks for something it can derive, or asks twice:

| Where | What is asked | What already holds it | Severity |
|---|---|---|---|
| `detective.projectDeadline` **and** `project.deadline` | the same date, in two fields | `setProjectDeadline` writes both; `updateDetective('projectDeadline')` writes only one; `createProjectFromIntake` writes both (with a comment explaining a cold-start tester had to type it twice) | **P2 (F7)** — the fix that was applied at creation was not applied to the sheet's own input |
| Brand book cover art | dropped separately | nothing — but it is stored in `logoImage`, which is the mark | **P0 (F1)** — not a re-ask, a collision |
| `project.name` vs `detective.clientName` | project name vs client name | genuinely two facts; `clientFacingName` picks correctly | **correct** — the book's second input was removed and grep-pinned |
| `positioning` | the designer's synthesis | `detective.usp` offered as a fallback, not copied | **correct** — a fallback is deliberately not the same fact |

**Correctly derived and worth naming as the model:** package readiness,
`allBrandSurfaces`, `paletteSnapshot`/`typePairingSnapshot` ids, alignment
scores, `mapPaletteRoles`, the direction letter (`directionLetter` derives
A/B/C from position rather than storing it — the comment at
`useAppStore.js:476` explains exactly what storing it cost).

---

## 7. Production / package ownership findings

Production is the **cleanest area audited**. Specifically:

- `applicationPackageAssets.js` reads `packageAssets` and explicitly declines
  to introduce a second store ("This module only READS packageAssets — no
  second storage model").
- Produce paths write real bytes into `packageAssets` and never into
  `touchpointApps.check`; both `BusinessCardProduce.jsx:5` and
  `EmailSignatureProduce.jsx:5` say so in their headers.
- `packagePlan.js` refuses to fabricate files, refuses to redistribute fonts,
  and refuses to ship anything whose `rights` say otherwise — and *reports*
  every exclusion rather than silently dropping it.
- There is no stored "ready" flag and no stored ZIP; both are derived.

Two findings:

### F10 — `touchpointApps[id]` mixes three data categories in one bag *(P2)*

One object holds `note` (AUTH — the designer's sentence about the surface,
printed in the client's book), `done` (AUTH — mock acceptance, feeds
`journeyProgress:199`) and `check` (**SAMPLE** — a colour measurement of an
uploaded image). It is written through the generic `updateBrandField` by a
hand-rolled read-modify-write (`SketchView.jsx:273-282`) rather than a
dedicated store action.

Consequences: the transient sample rides into the pack
(`exportFiles:401` copies the whole object), and there is no store-level
action whose name states what may be written. The read-modify-write is
currently safe — it re-reads `getState()` per call and zustand's `set` is
synchronous — but nothing enforces that.

### F8 — the two asset models *(P2)*

`project.packageAssets` (per-project, `dataUrl` bytes inline in the
localStorage blob, size-capped with a `heldBack: 'tooLarge'` row) and
`state.assets` (root-level, `project_id` on the row, durable Supabase +
IndexedDB bytes) are two storage models for "a file belonging to this
project". Both are defensible individually — the package needs bytes at hand,
the library needs durability — but only `packageAssets` reaches the client ZIP,
and only `assets` is durable. A file in the wrong one is either undeliverable
or unrecoverable, and nothing links them.

**Cross-workstream** — Production Package Truth owns the package half.

---

## 8. Highest-risk conflicts

Ordered by what can actually lose a designer's work.

| # | Conflict | Severity | Can silently destroy |
|---|---|---|---|
| 1 | `setLogoImage` (cover drop) vs the `logoConcepts[chosen]` mirror | **P0** | the brand mark, or the cover — whichever was written second — including the logo file in the client ZIP |
| 2 | `versionService.restoreVersion` writing `brief`/`deadline` from keys the snapshot never captures | **P1** | the composed brief and the calendar deadline, on every version restore |
| 3 | `mergeDetectiveAnswers` / `mergeDiscoveryAnswers` not recomposing `brief` | **P1** | nothing permanently, but every export in the window ships a brief missing the client's answers |
| 4 | `effectiveWord` resolution absent from `buildBrandPackSnapshot` for 4 fields | **P1** | nothing stored; the delivered book contradicts the screen |
| 5 | `hydrateFromPayload` dropping `payload.assets` + `assetStorage.list` having no caller | **P1** | the Asset Library, on any restore to a fresh device |
| 6 | `updateDetective('projectDeadline')` vs `project.deadline` | **P2** | nothing; the two dates silently diverge |
| 7 | `clearAllData` leaving `clientRecords` / `assets` / `portalSeen` | **P2** | nothing; private client notes survive a wipe the user asked for |

---

## 9. Recommended correction order

Sequenced so each step's guard exists before the step that needs it. **None of
this was done here.**

1. **F2 — `versionService` restore.** Smallest, most isolated, zero
   cross-workstream surface: either add `brief`/`deadline` to
   `createVersionSnapshot`, or (better, since `brief` is derived) stop
   restoring them. One file, one owner.
2. **F3 — recompose `brief` in both merge actions.** Contained to
   `useAppStore.js`. Best done as *hoisting the derivation to the read* rather
   than adding a third copy of the recompose call — the recurring bug is that
   the derivation lives inside writers.
3. **F1 — split cover art from the mark.** The P0, but it needs coordination:
   `handleCoverImageDrop` (visual/export preview) and `packagePlan`
   (Production Package Truth). Give the book a `bookCoverImage`, leave
   `logoImage` as a mirror with `setLogoImage` reduced to the upload path that
   also creates a concept.
4. **F4 — resolve the brief-owned words once, at the pack boundary.** Add the
   four missing resolutions in `buildBrandPackSnapshot`, then the duplicated
   `voice` chains in `bookDocument` and `brandBookPdf` become removable. Add a
   guard test asserting `buildBrandPackSnapshot` agrees with `effectiveWord`
   for every `BRIEF_WORD_SOURCES` key — that is the test that would have
   caught this and would prevent the next one.
5. **F5 — give the Asset Library a restore path.** Restore `payload.assets` in
   `hydrateFromPayload`; call `assetStorage.list` on project open.
6. **F6, F7** — one-line-class corrections with tests.
7. **F10, F8** — structural; schedule deliberately, not opportunistically.
8. **F9, F11** — dead-code removal last, when nothing else is in flight.

---

## 10. Architecture that is already correct

Worth stating plainly, because the amount of it is the headline finding.

- **`positioning`** — the named historical example is fully closed: separate
  field, one authoring surface, snapshot entry, reaches the pack, and
  `positioningOwnership.test.js` pins all five halves.
- **`FIELD_HOMES`** — a real ownership registry, with `bookOwnsNothing.test.js`
  asserting every printed field has a home to route to. Very few codebases
  have this.
- **`BRIEF_WORD_SOURCES` / "resolve, never copy"** — the correct answer to
  "the brief already asked this". The rule is right; only its application in
  the export layer is incomplete (F4).
- **`allBrandSurfaces`** — the model fix. Two lists, one view, both reach the
  client, authorship preserved. This is what F1 should be made to look like.
- **Directions** — `directionsWithSlot` as the single birth point;
  `chosen` ≠ `active`; letters derived from position rather than stored;
  deletion not repaired by loaders; refs resolving to `null` rather than
  substituting current material.
- **`artifacts{}`** — content-derived ids give immutability and dedupe for
  free, and the "small values only, never bytes" boundary is stated and held.
- **Project-scoped writes** — every async-adjacent action takes an explicit
  `projectId` so a project switch mid-await cannot land data on the wrong
  project. Pinned by `projectScopedWrites.test.js`.
- **Tombstones** — deletion stored as a fact, unioned rather than replaced on
  sync.
- **`identityEdit()`** — stamped in the same `set` as the field write, with a
  comment explaining why a follow-up call would be wrong.
- **`seedStrategyAttributes`** — materialise-once, using
  `Array.isArray` to distinguish "cleared" from "never set" instead of a
  `seeded` flag.
- **Delivery state** — lives on the server row; `preview` is deliberately
  local-only so it cannot become an unrecallable publish.
- **`PRIVATE_PACK_FIELDS`** — an allow-list with a test proving no book page
  reads any of them.
- **`packagePlan`'s three refusals** — no fabricated files, no font
  redistribution, nothing shipped against its rights, and every exclusion
  reported.

---

## 11. Evidence

Eight assertions were executed against the real store at `6a86208` to prove
current behaviour rather than assert it. The script is **not** part of this
branch's diff — it was run from a temporary file and removed; the source is
reproduced here so any reader can re-run it.

```
✓ F1  setLogoImage desyncs the chosen-concept mirror, and a later concept
      edit silently restores the mark
✓ F1b setLogoConcepts restores logoDirection but NOT logoImage
✓ F3  mergeDiscoveryAnswers writes detective without recomposing brief
      (and buildBrandPackSnapshot ships the stale brief)
✓ F3  mergeDetectiveAnswers has the same gap
✓ F4  voice / dontUse / messagingPersonality / orgEmail diverge between
      effectiveWord() and buildBrandPackSnapshot()
✓ F5  hydrateFromPayload ignores payload.assets even when local is empty
✓ F6  assets, clientRecords and portalSeen survive clearAllData()
✓ F7  updateDetective('projectDeadline') writes only the brief copy

Test Files  1 passed (1)
     Tests  8 passed (8)
```

F2 was established by reading rather than execution: `grep -n brief
src/services/versionService.js` returns only the comment at `:113` and the
restore at `:553`; `grep -n deadline` returns only the restore at `:554`.
Neither key appears in `createVersionSnapshot` (`:102-165`).

---

## 12. Severity index

| ID | Finding | Severity |
|---|---|---|
| F1 | `logoImage` has two independent authors; cover drop clobbers the mark and ships as the client's logo file | **P0** |
| F2 | `restoreVersion` blanks `brief` and `deadline` from keys the snapshot never captures | **P1** |
| F3 | Client submissions write `detective` without recomposing `brief` | **P1** |
| F4 | Export resolves 2 of 6 brief-backed identity fields the UI resolves | **P1** |
| F5 | Asset Library has no restore path (`hydrateFromPayload` + `assetStorage.list`) | **P1** |
| F1b | `setLogoConcepts` is an incomplete mirror writer | **P2** |
| F6 | `clearAllData` leaves `assets`, `clientRecords`, `portalSeen` | **P2** |
| F7 | `detective.projectDeadline` and `project.deadline` can diverge | **P2** |
| F8 | Two asset storage models with no link between them | **P2** |
| F10 | `touchpointApps[id]` mixes AUTH, UI and SAMPLE in one bag | **P2** |
| F9 | `logoClientChose`, `forms` written by nothing | **P3** |
| F11 | `applyDetectiveToBrief` unused; `pack.deliverablesPicked` dead fallback; `versionService` restores five unwritable fields | **P3** |
