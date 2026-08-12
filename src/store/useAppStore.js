import {
  DELIVERABLE_OPTIONS,
  DETECTIVE_CHAPTERS,
  isLogoOnlyScope,
  isWrongShapeForField,
  SPECTRUM_FIELDS,
} from '../lib/brief/detectiveBrief'
import { attributesFromBrief } from '../lib/brand/strategySeed'
import { BRAND_ROLE_KEYS } from '../lib/color'
import { liftMeasuredRows } from './workLogSeparation'
import { sameProjectId } from '../lib/journey/journeyProgress'
import { revisionSummary, roundCharge } from '../lib/revisions'
import { FOCUS_MASK_MIN_PCT, deviceTheme } from '../lib/uiPrefs'
import { create } from 'zustand'
import {
  isArtifactKind,
  makeRef,
  parseRefKey,
  refKey,
} from '../lib/artifacts/artifactRef'
import {
  pinFromSample,
  samplePinId,
  samplePinIsDisposable,
} from '../lib/brand/favorites'
import { sampleById } from '../lib/discovery/samples'
import {
  DIRECTION_SLOT_IDS,
  directionLetter,
  firstFreeDirectionSlot,
  isDirectionSlotId,
  orderedDirections,
} from '../lib/brand/directionLetters'
import {
  paletteSnapshot,
  typePairingSnapshot,
} from '../lib/artifacts/artifactSnapshot'
import { persist } from 'zustand/middleware'
import {
  appendDecision,
  decisionFromDirection,
} from '../lib/decisionLog'
import { addDays, toISODate } from '../lib/dates'
import { createBreakItem } from '../lib/helper/breakKit'
import { IDENTITY_FIELDS } from '../lib/journey/identityStamp'
import {
  expandProject,
  projectType,
  toggleStep,
  typeFromIntake,
} from '../lib/journey/projectTypes'

/** The default stage set for a type, as a plain list for the store. */
const projectTypeSteps = (typeId) => [...projectType(typeId).stepIds]
import versionService from '../services/versionService'
import {
  clientKey,
  renameClientRecord,
  setClientNotes as setClientNotesIn,
  addPreference as addPreferenceIn,
  removePreference as removePreferenceIn,
} from '../lib/client/clientRecord'

/**
 * The patch that records "the identity moved just now".
 *
 * Spread into the same `set` as the field write, never as a follow-up call —
 * a second write would be a second persist round and could interleave with a
 * project switch, stamping the wrong project.
 */
const identityEdit = () => ({ identityEditedAt: new Date().toISOString() })

/** Only genuine identity fields stamp — orgPhone and print notes are not the identity. */
const IDENTITY_FIELD_SET = new Set(IDENTITY_FIELDS)

/**
 * Every field id the Define sheet knows about.
 *
 * Client submissions are mirrored onto `project.detective` for any id in
 * this set. Both public routes now send the detective schema, so in the
 * normal case every answered id is mirrored. Older submissions made against
 * the discovery schema still land correctly: the ids the two schemas share
 * are detective ids too, and the ones they do not share are ignored rather
 * than inventing keys the sheet cannot render.
 *
 * Derived rather than hard-coded so it cannot drift as the schema changes.
 */
const DETECTIVE_FIELD_IDS = new Set(
  DETECTIVE_CHAPTERS.flatMap((c) =>
    (c.fields || []).flatMap((f) => (f.attach ? [f.id, `${f.id}Files`] : [f.id]))
  )
)

/**
 * Ideate tool prompts (not fake client data).
 * ≥8 for energy UI. Opposites live in oppositeSparks only (no "Opposite day" here).
 * Mix brand leave-behind + UI/UX (empty state, primary action, hierarchy).
 */
export const sparkPrompts = [
  'Write three directions in six words each — no adjectives, only nouns + verbs.',
  'What is the one thing a viewer must understand in three seconds?',
  'Where does the finger go first on this screen — and why?',
  'What does the empty state show before any content loads?',
  'Strip one decorative layer. Does hierarchy still hold?',
  'Design a visual system that protects quiet attention, not hustle energy.',
  'Steal one rule from a project you admire — rewrite it for this audience.',
  'What if the mark worked in one color at sticker size and still felt human?',
  'Name the feeling the cover must land — one sentence, no jargon.',
  'What would you design if the budget only allowed one ink color and one font?',
]

/** Opposite-direction sparks (Ideate force-opposites challenge) */
export const oppositeSparks = [
  'Force the opposite: calm ↔ bold. Sketch both in one line each.',
  'Force the opposite: photo-heavy ↔ pure type. Which serves the goal?',
  'Force the opposite: warm/hand-made ↔ crisp/system. Name the tradeoff.',
  'Force the opposite: dense info ↔ almost empty. Where does hierarchy live?',
  'Force the opposite: literal metaphor ↔ abstract mark. Which feels truer?',
  'Force the opposite: loud accent color ↔ near-monochrome. What still reads?',
]

export const defaultProjectPalette = [
  '#1C1917',
  '#0F766E',
  '#A8A29E',
  '#FAFAF9',
]

/** Empty Design Detective Sheet (Define step) */
/** Blank detective object derived from DETECTIVE_CHAPTERS so factory cannot
 *  drift from the schema (spectra, *Files, checklist arrays stay in sync). */
export function blankDetective() {
  const d = {
    /** Milestones: [{ id, label, date }] — not a chapter field, store-only */
    milestones: [],
  }
  for (const ch of DETECTIVE_CHAPTERS) {
    for (const f of ch.fields || []) {
      if (f.type === 'checklist') d[f.id] = []
      else d[f.id] = ''
      if (f.attach) d[`${f.id}Files`] = []
    }
  }
  return d
}

/**
 * The ONLY fields a template may carry onto a project. A template is a house
 * STYLE, not a project — so applying one must never touch `detective`
 * (Chapter 01 IS the client record), `tasks`, `directions`, or `moodItems`.
 * `applyTemplate` filters `template.data` through this list, which also
 * neutralises templates saved before this became a rule (they may still hold
 * a cloned `detective`/`tasks`/`directions`). Add a key here only if it is
 * genuinely reusable style, never project- or client-specific working data.
 */
export const TEMPLATE_STYLE_KEYS = [
  'tagline', 'voice',
  'typeHeading', 'typeBody',
  'logoWordmark', 'logoDirection', 'logoImage', 'logoClearspace',
  'logoMinSize', 'logoDonts',
  'palette', 'colorRoles',
  'messagingPromise', 'messagingProof', 'messagingPersonality',
  'imageryStyle', 'imageryDo', 'imageryDont',
  'writingCase', 'writingCaps', 'writingNotes',
  'printPantone', 'printStock', 'printFinish',
]

/**
 * Compose the free-text brief from Detective Sheet answers. Pure function
 * so it can run on every keystroke (updateDetective) as well as from the
 * standalone applyDetectiveToBrief action, instead of only ever running
 * when a "Next"/continue button happens to be clicked.
 * @returns {string}
 */
export function composeBriefFromDetective(detective) {
  const d = { ...blankDetective(), ...(detective || {}) }
  const parts = []
  if (d.clientName?.trim()) parts.push(`Client: ${d.clientName.trim()}`)
  if (d.goal?.trim()) parts.push(`Goal: ${d.goal.trim()}`)
  if (d.story?.trim()) parts.push(`Story: ${d.story.trim()}`)
  if (d.usp?.trim()) parts.push(`Unique selling point: ${d.usp.trim()}`)
  if (d.brandWords?.trim()) parts.push(`Words: ${d.brandWords.trim()}`)
  if (d.audience?.trim()) parts.push(`Audience: ${d.audience.trim()}`)
  if (d.feel?.trim()) parts.push(`Feel: ${d.feel.trim()}`)
  if (d.audiencePains?.trim())
    parts.push(`Audience pains/desires: ${d.audiencePains.trim()}`)
  if (d.competitors?.trim()) parts.push(`Competitors: ${d.competitors.trim()}`)
  if (d.toneOfVoice?.trim()) parts.push(`Tone of voice: ${d.toneOfVoice.trim()}`)
  if (d.avoid?.trim()) parts.push(`Avoid: ${d.avoid.trim()}`)
  if (d.engagementType) {
    const names = {
      new: 'New brand, starting from scratch',
      rebrand: 'Rebrand, replacing what exists',
      extend: 'Adding to an existing brand',
    }
    parts.push(`Engagement: ${names[d.engagementType] || d.engagementType}`)
  }
  if (Array.isArray(d.deliverablesPicked) && d.deliverablesPicked.length) {
    const names = d.deliverablesPicked
      .map((id) => DELIVERABLE_OPTIONS.find((o) => o.id === id)?.label || id)
      .join(', ')
    parts.push(`Deliverables: ${names}`)
  }
  if (d.deliverables?.trim())
    parts.push(`Also needed: ${d.deliverables.trim()}`)
  if (d.technical?.trim()) parts.push(`Technical: ${d.technical.trim()}`)
  if (d.existingAssets?.trim())
    parts.push(`Existing assets to keep: ${d.existingAssets.trim()}`)
  if (d.decisionMakers?.trim())
    parts.push(`Decision-makers: ${d.decisionMakers.trim()}`)
  if ((d.milestones || []).length) {
    const ms = d.milestones
      .filter((m) => m.label?.trim())
      .map((m) => `${m.label.trim()}${m.date ? ` (${m.date})` : ''}`)
      .join(', ')
    if (ms) parts.push(`Milestones: ${ms}`)
  }
  return parts.join('\n\n')
}

/**
 * Default brand identity template fields on each project.
 * Factory so every project gets fresh nested objects (detective,
 * colorRoleWhy, deliverWordsChecked, pathReached) — never shared refs.
 */
export function brandIdentityDefaults() {
  return {
  tagline: '',
  voice: '',
  typeHeading: 'Plus Jakarta Sans Bold',
  typeBody: 'Plus Jakarta Sans Regular',
  doUse: '',
  dontUse: '',
  /** Org contact info — letterhead / envelope / email signature templates */
  orgAddress: '',
  orgPhone: '',
  orgEmail: '',
  orgWebsite: '',
  /** Business-card contacts: [{ id, name, title, phone, email }] */
  contacts: [],
  /* Brand Book Builder settings. null = never opened; read through
     bookBuilderFor() in lib/bookBuilder.js, which fills every key at read
     time — so projects saved before this existed need no migration. */
  bookBuilder: null,
  /* Names for the palette's colours, index-parallel to `palette`. Holds only
     { id, name } — the hex lives in `palette` and nowhere else, so the two
     arrays can't disagree about a colour's value. Ids are persisted because
     page backgrounds and type colours reference a colour BY id; using array
     indices would silently re-point them whenever a colour was removed. */
  paletteTokens: [],
  /** Optional overrides; null/empty keys fall back to mapPaletteRoles(palette) */
  colorRoles: null,
  /** Why each assigned color role fits the Define brand words */
  colorRoleWhy: { cover: '', text: '', accent: '', quiet: '' },
  /* Stops this project has ever completed. A record, not a live verdict —
     see pathStepHasContent for why completion must not be able to regress. */
  pathReached: {},
  /* The user's own verdict on a stop, which outranks both the live condition
     and pathReached. `true` = done, `false` = not done, absent = let the app
     decide. Tri-state on purpose: the app's conditions are proxies (Touchpoints
     reads brandSurfaces, Identity reads craft signals), so work done in
     Illustrator or approved over the phone is invisible to them, and a stop can
     equally auto-tick before the user considers it finished. Either way the
     toggle must visibly do something, which a plain boolean cannot promise. */
  pathDone: {},
  /* Identity version stamp. Real ISO strings, never rendered — see
     lib/identityStamp.js for why the UI shows a sentence instead. */
  identityEditedAt: '',
  identitySavedAt: '',
  /** Last Identity sub-screen (mark/words/colour/type/preview) — resume after leave */
  identitySubstep: 'logo',
  /** Touchpoints applications: { [touchpointId]: { note, done } } */
  touchpointApps: {},
  /** Why the chosen type pair fits the Define brand words */
  typeWhy: '',
  /* Typography as INFORMATION. A commercial font licence almost never lets
     the designer hand the files on, so the package documents the faces and
     only ships files when `fontFilesLicensed` says the licence allows it —
     see lib/deliver/packagePlan.js. Blank is the honest default: the sheet
     prints "not recorded" rather than inventing terms. */
  typeSource: '',
  typeLicenceNote: '',
  fontFilesLicensed: false,
  /* Finished work made elsewhere and brought in for the client package —
     [{ id, name, dataUrl, group, item, variant, rights, addedAt }]. `rights`
     decides whether it may be handed over at all (USAGE_RIGHTS). */
  packageAssets: [],
  /** data URL mark for pack cover */
  logoImage: '',
  /**
   * Studio record of which mark the client approved (object permanence).
   * Not multi-concept storage — one line on Mark. Optional.
   */
  logoClientChose: '',
  /**
   * The marks actually made, so more than one has a home.
   * `[{ id, image, label, why, chosen }]` — exactly one `chosen`, and the
   * chosen image is mirrored into `logoImage` so every downstream reader
   * (pack, book, portal, mocks, stationery) is unchanged.
   *
   * WORKSPACE ONLY. Never added to the pack snapshot or any client surface:
   * a client sees the mark that was selected, not the ones that were not.
   * Deliberately absent from TEMPLATE_STYLE_KEYS for the same reason a
   * template must not carry another client's brief.
   */
  logoConcepts: [],
  /**
   * Immutable, id-keyed artifact snapshots — palettes and type pairings today.
   *
   * The thing Directions, Presentations, Books, Templates, Approvals and
   * Collections all need before any of them can be built: a way to say "this
   * one" about a creative artifact without copying its contents. Ids are
   * derived from content (`artifactSnapshot.js`), so the same palette
   * referenced from four places is stored once and an existing reference
   * cannot change meaning under a later edit.
   *
   * SMALL VALUES ONLY. This object is inside the single persisted blob. Hexes
   * and face names belong here; image bytes never do.
   */
  artifacts: {},
  /**
   * Surfaces the DESIGNER added at Touchpoints.
   *
   * Kept apart from `detective.brandSurfaces`, which is the client's own
   * answer to what the brand has to appear on. Touchpoints used to push
   * straight into that array, so a designer adding "signage" rewrote the
   * client's brief with no record that anyone had. Both lists are unioned for
   * display; only the client's half is the brief.
   */
  designerSurfaces: [],
  /**
   * Visual Discovery — a log of which of two shown samples was preferred.
   *
   * NOT A SECOND BRIEF. It holds no strategic answer and no brand decision:
   * `choices` records references to what was shown and what was chosen, and
   * everything a designer reads is DERIVED from it by
   * `lib/discovery/observations.js`. `verdict` records whether the person
   * agreed with the observation — agreement, not a decision.
   *
   * Deliberately NOT `directions`: that field is the Ideate A/B/C slots and
   * Phase 3's Directions will need the name.
   */
  visualDiscovery: { choices: [], verdict: null },
  /** Optional wordmark text (falls back to project name) */
  logoWordmark: '',
  /** Clearspace / min-size / lockup guidance */
  logoClearspace: '',
  /** Min reproduction size note */
  logoMinSize: '',
  /** Logo don'ts — one per line; defaults apply in export if empty */
  logoDonts: '',
  /** Messaging pillars */
  messagingPromise: '',
  messagingProof: '',
  messagingPersonality: '',
  /** Imagery guidelines */
  imageryStyle: '',
  imageryDo: '',
  imageryDont: '',
  /* Writing guidelines — the style-guide section this book never had.
     Two picks rather than a blank box, because every other question in this
     app that asks for composed prose gets skipped, and "sentence case, caps
     for short labels only" is a defensible default rather than an empty
     assertion. Defaults are applied at read time in the pack builder too, so
     projects saved before these keys existed still print a rule. */
  writingCase: 'sentence',
  writingCaps: 'sparing',
  writingNotes: '',
  /* Print and finish — what a printer asks for and this book could not
     answer. CMYK is already derived per swatch; these are the things no
     algorithm can infer. Printed only when filled. */
  printPantone: '',
  printStock: '',
  printFinish: '',
  /** Design version label (v1, v2...) */
  designVersion: 'v1',
  /* Scope — the five things the research says have to be agreed before work
     starts. Deliverables and file formats are already asked in the brief;
     these three had no home anywhere. `scopeOutOf` matters as much as the
     rest: what is NOT included is the half of a scope that gets argued
     about. */
  scopeRevisionsIncluded: 2,
  scopeRevisionBilling: 'perRound',
  scopeRevisionRate: '',
  scopeApprover: '',
  scopeOutOf: '',
  /** Revision rounds — [{ id, openedAt, note, closedAt, billedAmount }] */
  revisionRounds: [],
  /** Review: structured log — [{ id, reviewer, issue, decision, status }] */
  feedbackLog: [],
  /** Review: feedback notes from client / self */
  feedbackNotes: '',
  /** Deliver: short handover note for client */
  handoffNote: '',
  /** Deliver: one-paragraph evaluation / learnings */
  learnings: '',
  /** Deliver: per brand-word confirmation that the final piece delivers on it */
  deliverWordsChecked: {},
  /* Ideas that are not ready and must not become work. A thought with
     nowhere to go either gets forced into the workflow as a task — where it
     is now a thing you are failing to do — or it is lost. The parking lot is
     the third option, and nothing in the app ever nags about its contents.
     [{ id, text, at }] */
  parkingLot: [],
  /* The designer's own notes. Private by default and structurally private:
     buildBrandPackSnapshot copies named fields only, so this cannot reach a
     client export, the portal, or the brand book. Somewhere to write "client
     is attached to the old blue even though it fights the new direction"
     without it becoming a deliverable. */
  privateNotes: '',
  /** Define: Design Detective Sheet */
  detective: blankDetective(),
  }
}


/**
 * The three Ideate positions — A, B and C.
 *
 * THREE SLOTS EXIST. THREE RECORDS DO NOT HAVE TO.
 *
 * These are not data and they are not cards. They are the three ids a route
 * may occupy, which is how the shortlist stays a shortlist. `project.directions`
 * holds only routes that exist, and a new project holds none.
 *
 * SLOTS WERE ONCE CARDS, and the screen drew all three whether or not anything
 * had been written in them — an empty worksheet asking to be filled in. They
 * were also once letters: each slot carried `label: 'A' | 'B' | 'C'`, the
 * record stored it, and the decision log wrote it down. Delete B and the
 * surviving routes reflow, so the log then named a position C no longer held.
 * The id is the identity; `directionLetter` draws the rest.
 */
export const DIRECTION_SLOTS = Object.freeze(
  DIRECTION_SLOT_IDS.map((id) => Object.freeze({ id }))
)

/* Derived in `lib/brand/directionLetters`, re-exported so views keep one
   import and nothing in a render path has to pull the store in behind it. */
export { directionLetter, firstFreeDirectionSlot, orderedDirections }

/** True for 'a' | 'b' | 'c' — nothing else may become a direction. */
export function isDirectionSlot(id) {
  return isDirectionSlotId(id)
}

/**
 * The three positions with whatever record sits in each — `direction: null`
 * where nothing has been written or where the designer deleted it.
 *
 * The one thing a view needs, so no view has to fall back to blanks. Empty is
 * a state to draw, not a gap to fill.
 */
export function directionSlots(project) {
  const dirs = Array.isArray(project?.directions) ? project.directions : []
  return DIRECTION_SLOTS.map((sl) => ({
    ...sl,
    direction: dirs.find((d) => d?.id === sl.id) || null,
  }))
}

/**
 * A record for one slot. Only ever written by an explicit act — typing a
 * title, promoting a rough idea. Never by a loader.
 */
export function blankDirection(slotId) {
  const sl = DIRECTION_SLOTS.find((x) => x.id === slotId)
  /* `refs` holds refKeys and nothing else. A direction owns its label, title,
     why, chosen flag and position; every visual it shows belongs to the
     workspace that authored it, and is read through a reference.

     `evidence` is the same idea in list form: refKeys for the material the
     designer cited when they named this route — favorited pins and samples.
     Separate from `refs` because `refs` answers "which mark, which palette"
     (one artifact per slot) and this answers "what made me think so" (many,
     unordered, no slots). Collapsing them would need a slot per citation. */
  /* NO `label`. The displayed letter is derived from position by
     `orderedDirections`; storing it made the letter identity, which is what
     the decision log then had to lie about after a deletion. */
  return {
    id: sl.id,
    title: '',
    note: '',
    chosen: false,
    refs: {},
    evidence: [],
  }
}

/**
 * Is this project id tombstoned?
 *
 * A DELETION IS A FACT, AND IT HAS TO BE STORED AS ONE. Removing the project
 * from `projects` records only that this device does not have it, which is
 * indistinguishable from "this device has not received it yet" — and that
 * ambiguity is exactly what the sync resolved in the project's favour, pulling
 * it back from a remote row that nothing ever deletes.
 *
 * Compared with `sameProjectId` because ids arrive as numbers on old projects
 * and strings on new ones, and the cloud round trip goes through JSON.
 */
export function isTombstoned(deletedProjects, id) {
  return (Array.isArray(deletedProjects) ? deletedProjects : []).some((d) =>
    sameProjectId(d?.id, id)
  )
}

/** Add a tombstone, unless one is already there. `{ id, at }` and nothing
 *  else — the project's contents are being deleted, not archived here. */
export function withTombstone(deletedProjects, id, at) {
  const list = Array.isArray(deletedProjects) ? deletedProjects : []
  if (isTombstoned(list, id)) return list
  return [...list, { id, at: at || new Date().toISOString() }]
}

/**
 * A project's directions as a mutable copy, with `dirId`'s record guaranteed
 * to exist — created in slot order when the slot is empty.
 *
 * The one place a record can be born, shared by every writer so they cannot
 * disagree about position. Returns null for an id that is not a slot, and for
 * a caller that asked not to create. `create: false` is what a CLEAR uses:
 * removing a reference from a slot that holds nothing must not conjure a
 * direction to remove it from.
 */
export function directionsWithSlot(project, dirId, { create = true } = {}) {
  const id = String(dirId || '').toLowerCase()
  const slot = DIRECTION_SLOTS.find((sl) => sl.id === id)
  if (!slot) return null
  const dirs = (Array.isArray(project?.directions) ? project.directions : []).map(
    (d) => ({ ...d })
  )
  let idx = dirs.findIndex(
    (d) => d.id === id || String(d.label || '').toLowerCase() === id
  )
  if (idx < 0) {
    if (!create) return null
    dirs.push(blankDirection(slot.id))
    /* Inserted in slot order so B written after C still reads A·B·C.
       Position belongs to the slot, not to the array. */
    dirs.sort(
      (a, b) =>
        DIRECTION_SLOTS.findIndex((sl) => sl.id === a.id) -
        DIRECTION_SLOTS.findIndex((sl) => sl.id === b.id)
    )
    idx = dirs.findIndex((d) => d.id === slot.id)
  }
  return { dirs, idx }
}

/**
 * A fresh project's three empty directions.
 *
 * Still three records, because a new project has nothing to lose and every
 * reader already handles them. This is a SEED — the value a project starts
 * with. It is not a repair, and no loader may call it on a project that
 * already has a directions array, however short that array is.
 */
export function blankDirections() {
  /* NOTHING. A new project has no routes, and drawing three empty cards for
     routes nobody has formed turns a shortlist into a worksheet. A record is
     born when the designer presses "Add a direction" and at no other time —
     the name is kept because four call sites (project creation, two import
     paths, one migration) describe the same thing: what `directions` starts
     as. */
  return []
}

/**
 * The name a blank workspace's one project is created with.
 *
 * It is a SENTINEL as well as a label: `hasRealProjects` in the migration
 * decides a workspace is untouched partly by testing this exact string, so
 * changing it silently changes who gets their legacy data imported. Anything
 * that wants to present this project differently must do so in the view —
 * see `isStarterProject`.
 */
export const STARTER_PROJECT_NAME = 'My project'

/**
 * True while this is still the project the app made for you, not one you made.
 *
 * A blank workspace opens on a project called "My project" that the user never
 * created, presented exactly like one they did — so the cold-start audit found
 * newcomers unable to tell whether it was theirs, a sample, or someone else's,
 * and `+ New project` competing with something that looked already underway.
 *
 * Exported rather than restated because the migration already asks this same
 * question by hand, and two copies of a predicate drift — the `activeView`
 * allow-list lost four ids exactly that way.
 */
export function isStarterProject(p) {
  if (!p) return false
  return (
    p.name === STARTER_PROJECT_NAME &&
    !String(p.brief || '').trim() &&
    !(Array.isArray(p.decisionLog) && p.decisionLog.length > 0)
  )
}

/** Fresh real desk — no sample clients or fake tasks */
export function createBlankProject(name = STARTER_PROJECT_NAME, brief = '') {
  /* Date.now() alone collides for anything created inside the same
     millisecond, and every store action selects with `p.id === id` — so two
     projects sharing an id means a write to one silently writes to both.
     Same shape as the task/decision ids elsewhere in this file. Existing
     numeric ids keep working; only new projects get the suffix. */
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return {
    id,
    name: name || 'My project',
    active: true,
    /* The AUTO-COMPOSED summary of the brief. Rewritten from `detective` on
       every keystroke by `updateDetective` — including the client's, through
       the portal. Nothing a designer types should ever live here. */
    brief: brief || '',
    /* The designer's own positioning line, and a SEPARATE field for exactly
       that reason. Identity's "Positioning" box used to write `brief`, so a
       line written here was destroyed the next time anyone touched a brief
       question. Meanwhile the brand book already printed `positioning`
       (bookContent.js, brandBookPdf.js) — a field nothing in src/ wrote. One
       edit closes both halves: the box writes the field the book reads, and
       the composer can no longer reach it. */
    positioning: '',
    logoDirection: '',
    directions: blankDirections(),
    /** Ideate diverge dump — cheap ideas before A/B/C shortlist (persisted). */
    roughIdeas: [],
    /** Ideate → Sketch external memory: chose X because Y */
    decisionLog: [],
    palette: [...defaultProjectPalette],
    deadline: '',
    /* defineOpenChapter is gone — the brief is flat, there is no open
       chapter to remember. Old projects may still carry the field; it is
       ignored (projectShellEqual keeps it in its ignore set for them). */
    /** Last journey view opened in this project, so switching back resumes
     *  where you were instead of teleporting you to a computed "first gap". */
    lastView: null,
    ...brandIdentityDefaults(),
    tasks: [],
    runningTodo: blankRunningTodo(),
    /** Billable hours — hand-entered only. What a client gets charged is a
     *  claim you make deliberately, so nothing writes here automatically. */
    hourlyRate: '',
    timeLog: [],
    /** Private record of clocked work, written by the work clock. Never
     *  billed, never exported to a client. Yours. */
    workLog: [],
    /** Client discovery brief (pre-Define): answers keyed by field id,
     *  plus an optional completed-form file the client sent back. */
    discoveryAnswers: {},
    discoveryUpload: null,
    /** Public link token (discovery_shares.id) sent to the client, if any */
    discoveryShareId: null,
    discoveryShareStatus: null,
    /** Client portal (client_portals.id) — dashboard link with step
     *  push/approval, chat, and the fillable Project overview form. */
    clientPortalId: null,
  }
}

/** Fridge-list style running to-do, separate from desk tasks. */
export function blankRunningTodo() {
  return { items: [], sorted: false, lastResetDate: toISODate(new Date()) }
}

export function blankWorkspaceState() {
  const project = createBlankProject('My project', '')
  return {
    projects: [project],
    currentProjectId: project.id,
    tasks: [],
    moodItems: [],
    deletedProjects: [],
    breakKit: [],
    theme: deviceTheme(),
    /* 'auto' until the user actually toggles. Without this there is no way
       to tell "chose dark" from "never chose anything and got the old
       hard-coded default", so a device set to light could never be
       followed. */
    themeSource: 'auto',
    bodyDoubling: false,
    onboarded: false,
    sparkIndex: 0,
    oppositeIndex: 0,
    sparksTried: 0,
    currentSpark: sparkPrompts[0],
    prefs: {
      soundEnabled: true,
      reduceMotion: false,
      forceBreaksEnabled: true,
      forceBreaksConsented: false,
      queueCollapsed: true,
      showHowItWorks: false,
      /** ADHD: no timed Helper pings — open Helper for Coach */
      helperQuiet: true,
      /**
       * Hyper-focus mask: inactive field opacity, as a percent, bounded by
       * FOCUS_MASK_MIN_PCT..FOCUS_MASK_MAX_PCT in lib/uiPrefs. The floor is
       * a legibility floor — see the note there. Was 25, a value the app
       * never actually applied.
       */
      focusMaskPct: FOCUS_MASK_MIN_PCT,
      /** Soft blur on masked peripherals (px); 0 = off */
      focusMaskBlur: 2,
      /** 'normal' (flat 1.5px border) or 'high' (2.5px + soft outer ring) */
      focusRingStrength: 'normal',
      /** Collapse the sidebar to zero-width while a field has focus */
      hideNavUntilBlur: false,
      /** Legacy: tips UI removed; kept default true so old prefs hydrate quietly */
      hideTips: true,
      /* The studio's own name, printed on every client-facing surface —
         book footer, markdown pack, direction sheet, overview PDF. Empty is
         the NORMAL state, not an unfinished one: with nothing set the footer
         reads project name and date, which is what an unbranded professional
         deliverable looks like. Nothing anywhere nags for it.

         One value, not a per-surface map. "Should my name be on client work?"
         has one answer per studio; five toggles would be a 32-state space the
         designer then has to remember the position of. Empty IS the off
         state, so there is nothing to toggle either. */
      studioName: '',
      /* The studio's mark, as a data URL, for surfaces that can carry an
         image. Always written through `prepareStudioLogo`, which downscales
         and hard-caps it at 100KB of string — never straight from a file
         picker. `prefs` rides inside the single localStorage write that
         carries the whole workspace, so an uncapped logo here would fail the
         save of every project, not just its own. See src/lib/studio/
         studioIdentity.js for the full reasoning. */
      studioLogo: '',
      /* Brand book page setup. Sticky across projects rather than per-project:
         a studio's paper size and print habits don't change per client, and
         re-deciding them on every project is a recurring toll. Shown as text
         beside the download button so the state is read, not remembered.
         Values are declared in lib/brandBookSetup.js. */
      bookPageSize: 'letter',
      bookEdgeSpace: 'standard',
      bookPrintShop: false,
      /**
       * Toasts: quiet (default) hides micro successes; all shows pin/role/helper chatter.
       * Errors and exports always show.
       */
      toastMode: 'quiet',
      /** Seconds non-error toasts queue before flushing together; 0 = instant (default) */
      toastBatchWindow: 0,
      /* Invoice identity and terms. In prefs, not on the project: your
         address and payment details are the same on every invoice you send,
         while `hourlyRate` is negotiated per client and stays on the project.
         An invoice with no number, no due date and no way to pay is one the
         client has to email you about before they can pay it. */
      invoiceFrom: '',
      invoicePaymentMethods: '',
      invoiceTerms: 14,
      invoiceNotes: '',
      invoiceTaxLabel: '',
      invoiceTaxPercent: 0,
      invoiceNextNumber: 1,
      invoicePrefix: '',
    },
    // Template management
    templates: [],
  }
}

/** @deprecated kept for migration only — never seed into new installs */
export const seedTasks = []
export const seedProjects = []
export const seedMoodItems = []

const initial = {
  ...blankWorkspaceState(),
  templates: [],
}


/**
 * Exactly what persistence keeps — and therefore exactly what a workspace
 * payload must carry.
 *
 * `PERSISTED_KEYS` exists so `partialize`, `exportAllData` and the round-trip
 * test can read ONE list instead of three copies. They were three copies:
 * `templates` was in partialize and missing from the payload, so every cloud
 * sync and every JSON backup silently destroyed the user's saved templates.
 * The test written to catch that then hard-coded its own sixteen-string copy
 * of the list, which would not have caught the next one — the same mistake,
 * inside its own fix.
 *
 * `defaults` are applied for keys whose stored value may be absent.
 */
export const PERSISTED_KEYS = [
  'projects',
  'currentProjectId',
  'tasks',
  'moodItems',
  'breakKit',
  'theme',
  /* Must persist alongside `theme`, or an explicit choice survives only until
     reload — themeSource would reset to 'auto' and the device listener would
     quietly overwrite the theme the user picked. */
  'themeSource',
  'onboarded',
  'sparkIndex',
  'oppositeIndex',
  'sparksTried',
  'currentSpark',
  'prefs',
  /* Metadata is small and must survive a reload, or a designer who files ten
     assets and refreshes has filed nothing. The bytes are held separately and
     are NOT in this payload. */
  'assets',
  'portalSeen',
  'templates',
  /* Client memory. Listed here BEFORE it was needed anywhere else, because
     this list's own header records what happens when a key is persisted in
     one place and forgotten in another: `templates` was in partialize and
     absent from the payload, so every backup and every cloud sync wrote back
     a workspace without them. Notes about a client are exactly the kind of
     thing nobody notices is gone until they need it. */
  'clientRecords',
  /* Tombstones. Deleting a project has to mean deleting it everywhere, and
     the only durable record that a deletion HAPPENED is this list — the
     project itself is gone, so absence cannot be told apart from "this
     device has not seen it yet". Persisted, and therefore carried between
     devices by the same workspace payload everything else travels in. */
  'deletedProjects',
]

const PERSIST_DEFAULTS = {
  breakKit: [],
  deletedProjects: [],
  oppositeIndex: 0,
  sparksTried: 0,
  portalSeen: {},
  clientRecords: {},
  assets: [],
}

export function pickPersisted(state) {
  const out = {}
  for (const k of PERSISTED_KEYS) {
    out[k] = state[k] ?? PERSIST_DEFAULTS[k] ?? state[k]
  }
  return out
}

/* Debounced persisted write (issue #6).
   The workspace persists as ONE blob and DetectiveSheet fields call
   updateDetective on every keystroke, so without this each character ran a
   synchronous JSON.stringify(pickPersisted(state)) — projects, every mood
   image as a data URL, every brief — plus localStorage.setItem on the main
   thread. As a workspace fills toward the ~5MB budget that is visible typing
   lag. We coalesce rapid writes into one trailing write, and flush on
   tab-hide / unload so nothing is ever lost. */
const PERSIST_DEBOUNCE_MS = 400
let _persistPending = null // latest { key, value } not yet written
let _persistTimer = null

function _writePersistNow() {
  if (_persistTimer) {
    clearTimeout(_persistTimer)
    _persistTimer = null
  }
  if (!_persistPending) return
  const { key, value } = _persistPending
  _persistPending = null
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    const quota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22
    console.error(
      quota
        ? '[store] Browser storage is full — changes are NOT being saved. Remove some mood board images.'
        : '[store] Could not save to browser storage.',
      err
    )
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cc-storage-error', { detail: { quota } })
      )
    }
  }
}

/** Flush any pending debounced persist write immediately. Exported for tests;
 *  also wired to tab-hide / unload below so a trailing write is never lost. */
export function flushPersist() {
  _writePersistNow()
}

if (typeof window !== 'undefined') {
  // beforeunload/pagehide cover desktop; visibilitychange:hidden covers mobile
  // where the unload events are unreliable.
  window.addEventListener('beforeunload', _writePersistNow)
  window.addEventListener('pagehide', _writePersistNow)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') _writePersistNow()
    })
  }
}

const useAppStore = create(
  persist(
    (set, get) => ({
      ...initial,
      projects: initial.projects,
      currentProjectId: initial.currentProjectId,
      tasks: [],
      moodItems: [],
      breakKit: [],
      /* Client-level memory, keyed by normalised client name. Empty is
         the normal state — see lib/client/clientRecord.js for why this is
         name-keyed rather than pointed at the clients table. */
      clientRecords: {},
      /* Asset METADATA only — names, categories, versions, storage paths.
         The bytes never live here: they go to IndexedDB (lib/assets/
         assetBytes.js) and, when signed in, a private bucket. A 50 MB
         deliverable in this object would be written into the single
         localStorage blob that carries the entire workspace and take every
         project down with it, which is the same trap the studio logo's size
         cap exists to avoid. */
      assets: [],
      theme: deviceTheme(),
      themeSource: 'auto',
      bodyDoubling: false,
      onboarded: false,
      sparkIndex: 0,
      currentSpark: sparkPrompts[0],
      prefs: { ...initial.prefs },

      addBreakKitItem: (payload) => {
        const item = createBreakItem(payload || {})
        if (!item) return { ok: false, error: 'Add a short title' }
        set((state) => ({
          breakKit: [item, ...(state.breakKit || [])],
        }))
        return { ok: true, item }
      },

      removeBreakKitItem: (id) =>
        set((state) => ({
          breakKit: (state.breakKit || []).filter((i) => i.id !== id),
        })),

      updateBreakKitItem: (id, patch) =>
        set((state) => ({
          breakKit: (state.breakKit || []).map((i) =>
            i.id === id ? { ...i, ...patch, id: i.id } : i
          ),
        })),

      /**
       * Mark a break-kit item done (during break or anytime).
       * Recurring → stamps lastDoneAt for today; one-shot → completed.
       */
      completeBreakKitItem: (id) => {
        const now = new Date().toISOString()
        let found = null
        set((state) => ({
          breakKit: (state.breakKit || []).map((i) => {
            if (i.id !== id) return i
            found = i
            if (i.recurring) {
              return { ...i, lastDoneAt: now }
            }
            return { ...i, completed: true, lastDoneAt: now }
          }),
        }))
        return { ok: Boolean(found), item: found }
      },

      addProject: (project) =>
        set((state) => ({
          projects: [
            ...state.projects.map((p) => ({ ...p, active: false })),
            {
              logoDirection: '',
              palette: [...defaultProjectPalette],
              deadline: '',
              ...brandIdentityDefaults(),
              ...project,
              active: true,
            },
          ],
          currentProjectId: project.id,
        })),

      setCurrentProject: (id) =>
        set((state) => ({
          currentProjectId: id,
          projects: state.projects.map((p) => ({
            ...p,
            active: p.id === id,
          })),
        })),

      updateProjectBrief: (brief) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId ? { ...p, brief } : p
          ),
        })),

      /** Partial update Design Detective Sheet fields */
      updateDetective: (field, value) =>
        set((state) => {
          const projects = state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const det = { ...blankDetective(), ...(p.detective || {}), [field]: value }
            const brief = composeBriefFromDetective(det)
            return { ...p, detective: det, brief: brief || p.brief }
          })
          if (field !== 'clientName') return { projects }

          /* Renaming the client moves its memory with it. Without this, the
             first time someone fixes a typo in a client's name their notes
             and preferences would be silently orphaned under the old key —
             the worst failure available to a feature whose whole promise is
             that you do not have to remember. Runs per keystroke, and is a
             no-op unless the normalised key actually moved. */
          const before = state.projects.find((p) => p.id === state.currentProjectId)
          const from = before?.detective?.clientName || ''
          if (clientKey(from) === clientKey(value)) return { projects }
          return {
            projects,
            clientRecords: renameClientRecord(state.clientRecords || {}, from, value),
          }
        }),

      /** Free notes about a client — private, never client-facing. */
      setClientNotes: (name, notes) =>
        set((state) => ({
          clientRecords: setClientNotesIn(state.clientRecords || {}, name, notes),
        })),

      /** One short line: "prefers email", "likes warm colours". */
      addClientPreference: (name, text) =>
        set((state) => ({
          clientRecords: addPreferenceIn(state.clientRecords || {}, name, text),
        })),

      removeClientPreference: (name, text) =>
        set((state) => ({
          clientRecords: removePreferenceIn(state.clientRecords || {}, name, text),
        })),

      /* Milestones UI removed (owner). detective.milestones may still exist
         on old projects and is still formatted into terms/export if present. */

      /** Compose free brief from detective sheet answers */
      /** @deprecated brief now auto-syncs from updateDetective(); kept for
       *  any external callers wanting an explicit one-shot recompute. */
      applyDetectiveToBrief: () => {
        const state = get()
        const p = state.projects.find((x) => x.id === state.currentProjectId)
        if (!p) return { ok: false }
        const brief = composeBriefFromDetective(p.detective)
        if (!brief) return { ok: false, error: 'Fill detective fields first' }
        set({
          projects: state.projects.map((proj) =>
            proj.id === state.currentProjectId ? { ...proj, brief } : proj
          ),
        })
        return { ok: true }
      },

      /** Project calendar deadline. Also mirrors detective.projectDeadline so
       *  overview chapter fill + getDetectiveProgress stay honest. */
      setProjectDeadline: (deadline) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? {
                  ...p,
                  deadline: deadline || '',
                  detective: {
                    ...blankDetective(),
                    ...(p.detective || {}),
                    projectDeadline: deadline || '',
                  },
                }
              : p
          ),
        })),


      /** Remember the view a project was last on. */
      setProjectLastView: (projectId, view) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId && p.lastView !== view ? { ...p, lastView: view } : p
          ),
        })),

      setLogoDirection: (direction) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, logoDirection: direction, ...identityEdit() }
              : p
          ),
        })),

      /**
       * Point one of a direction's slots at an artifact, or clear it.
       *
       * SWAP AND SHUFFLE ARE THIS. "B's mark with C's type" is two calls; no
       * content moves. Choosing a direction is a different act entirely, and
       * this never touches `chosen` just as `chosen` never touches these.
       *
       * Setting a reference on an empty slot creates the record — pointing a
       * direction at a mark is a designer asking for one. Clearing does not:
       * removing a reference from a slot that holds nothing must not conjure a
       * direction to remove it from.
       *
       * @param {string} dirId  'a' | 'b' | 'c'
       * @param {object} patch  { mark?, typePairing?, palette? } refKey or null
       */
      setDirectionRefs: (dirId, patch, projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          const entries = Object.entries(patch || {})
          if (!entries.length) return state
          const create = entries.some(([, v]) => v != null && v !== '')
          return {
            projects: state.projects.map((p) => {
              if (p.id !== owner) return p
              const found = directionsWithSlot(p, dirId, { create })
              if (!found) return p
              const { dirs, idx } = found
              const refs = { ...(dirs[idx].refs || {}) }
              for (const [k, v] of entries) {
                if (v == null || v === '') delete refs[k]
                else refs[k] = String(v)
              }
              dirs[idx] = { ...dirs[idx], refs }
              return { ...p, directions: dirs }
            }),
          }
        }),

      /**
       * Snapshot what the project currently has and point a direction at it.
       *
       * THE SNAPSHOT IS WHY A DIRECTION DOES NOT ROT. Palette and type ids are
       * derived from content, so editing the palette tomorrow produces a
       * different id and this direction keeps resolving to the composition it
       * was actually built from. Nothing is duplicated: the same palette
       * captured by all three directions is one record in `artifacts`.
       *
       * The mark is a plain id into `logoConcepts` — a real record the
       * designer still owns. Delete that concept and the ref resolves to null,
       * which is the honest answer rather than a stand-in mark.
       */
      captureDirectionFrom: (dirId, kind, value, projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          const project = state.projects.find((p) => p.id === owner)
          if (!project) return state

          let ref = null
          let artifact = null
          if (kind === 'mark') {
            const hit = (project.logoConcepts || []).find((c) => c.id === value)
            if (hit) ref = refKey(makeRef('markConcept', hit.id))
          } else if (kind === 'palette' || kind === 'typePairing') {
            const snap =
              kind === 'palette'
                ? paletteSnapshot(project)
                : typePairingSnapshot(project)
            /* Nothing made yet is not a composition. An artifact with no
               colors or no faces would draw a row in three directions that
               reads as a part somebody decided. */
            const hasContent =
              kind === 'palette'
                ? (snap.hexes || []).length > 0
                : !!(snap.heading || snap.body)
            if (hasContent) {
              artifact = snap
              ref = refKey(makeRef(kind, snap.id))
            }
          }
          if (!ref) return state

          return {
            projects: state.projects.map((p) => {
              if (p.id !== owner) return p
              const found = directionsWithSlot(p, dirId)
              if (!found) return p
              const { dirs, idx } = found
              dirs[idx] = {
                ...dirs[idx],
                refs: { ...(dirs[idx].refs || {}), [kind]: ref },
              }
              return {
                ...p,
                artifacts: artifact
                  ? { ...(p.artifacts || {}), [artifact.id]: artifact }
                  : p.artifacts || {},
                directions: dirs,
              }
            }),
          }
        }),

      /**
       * Make a route.
       *
       * THE ONLY WAY A RECORD IS BORN, alongside typing into one that already
       * exists. Pressing this is a designer saying "here is a possibility",
       * which is exactly the act the three pre-drawn cards used to perform on
       * their behalf before they had formed one.
       *
       * It also opens the new route, because the next thing anyone does after
       * making a route is put something in it.
       *
       * @returns {string} the new route's id, or '' when all three are taken
       */
      addDirection: (projectId) => {
        const state = get()
        const owner = projectId ?? state.currentProjectId
        const project = state.projects.find((p) => p.id === owner)
        const slotId = firstFreeDirectionSlot(project)
        if (!slotId) return ''
        set((s2) => ({
          projects: s2.projects.map((p) => {
            if (p.id !== owner) return p
            const found = directionsWithSlot(p, slotId)
            if (!found) return p
            return { ...p, directions: found.dirs, activeDirectionId: slotId }
          }),
        }))
        return slotId
      },

      /**
       * Cite a piece of collected material on a direction, or stop citing it.
       *
       * THE BRIDGE RESEARCH NEVER HAD. Favorites, samples and pins were
       * collected and then read by nothing; a direction was three text fields
       * with no visible reason behind them. This is the join: a refKey, so the
       * direction points at the pin rather than copying its image, its hex or
       * its note. Delete the pin and the citation resolves to nothing, which
       * is what `directionEvidence` renders — never the project's current
       * material standing in for the material this route was built from.
       *
       * Adding creates the record, exactly as setting a ref does: citing
       * something is a designer asking for a direction. Removing does not.
       *
       * @param {string} dirId   'a' | 'b' | 'c'
       * @param {string} key     a refKey — `evidence:17…` or `sample:color:…`
       */
      toggleDirectionEvidence: (dirId, key, projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          const ref = String(key || '')
          if (!parseRefKey(ref)) return state
          return {
            projects: state.projects.map((p) => {
              if (p.id !== owner) return p
              const has = (
                (p.directions || []).find(
                  (d) => String(d?.id || '').toLowerCase() === String(dirId).toLowerCase()
                )?.evidence || []
              ).includes(ref)
              const found = directionsWithSlot(p, dirId, { create: !has })
              if (!found) return p
              const { dirs, idx } = found
              const list = Array.isArray(dirs[idx].evidence)
                ? dirs[idx].evidence
                : []
              dirs[idx] = {
                ...dirs[idx],
                evidence: has ? list.filter((k) => k !== ref) : [...list, ref],
              }
              return { ...p, directions: dirs }
            }),
          }
        }),

      /**
       * Which direction the designer is currently developing.
       *
       * ACTIVE IS NOT CHOSEN. Chosen is the verdict — the route the project is
       * proceeding with, logged as a decision, one at a time. Active is only
       * "this is the one I have open", so a designer can develop B for an
       * afternoon while A is still the chosen route and neither fact
       * overwrites the other. They were the same flag in every earlier sketch
       * of this screen, and the cost was that opening a second direction to
       * look at it silently changed the project's decision.
       *
       * Passing the id that is already active clears it: pressing Develop on
       * the direction you are developing means you are done with it.
       */
      setActiveDirection: (dirId, projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          const id = String(dirId || '').toLowerCase()
          const next = isDirectionSlot(id) ? id : null
          return {
            projects: state.projects.map((p) =>
              p.id === owner
                ? {
                    ...p,
                    activeDirectionId:
                      p.activeDirectionId === next ? null : next,
                  }
                : p
            ),
          }
        }),

      /**
       * Remove one Ideate direction. The slot stays; the record does not.
       *
       * A deletion has to survive a reload, an import and every future
       * migration, which is the whole reason the loaders above stopped
       * treating a short array as damage. Nothing here writes a replacement.
       *
       * The decision log keeps its entry on purpose: the log records that a
       * direction WAS chosen on a date, and that remains true after the card
       * is gone. Rewriting history to match the present is the opposite of
       * what a decision log is for.
       */
      deleteDirection: (dirId, projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          const id = String(dirId || '').toLowerCase()
          return {
            projects: state.projects.map((p) => {
              if (p.id !== owner) return p
              const dirs = Array.isArray(p.directions) ? p.directions : []
              const next = dirs.filter(
                (d) => String(d?.id || '').toLowerCase() !== id
              )
              if (next.length === dirs.length) return p
              /* Developing a direction that no longer exists is not a state
                 any screen can draw honestly. */
              const activeDirectionId =
                p.activeDirectionId === id ? null : p.activeDirectionId
              return { ...p, directions: next, activeDirectionId }
            }),
          }
        }),

      /**
       * Write one Ideate slot (a/b/c), creating its record if the slot is empty.
       *
       * WRITING IS THE EXPLICIT ACT. A slot with no record is a real state — a
       * direction that was deleted, or one never written — and nothing may
       * manufacture a record for it on load, on import or on render. Typing a
       * title is a designer asking for one, so this is where a record may be
       * born, and the only place. The slot list caps it at three.
       */
      updateDirection: (dirId, patch) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const found = directionsWithSlot(p, dirId)
            if (!found) return p
            const { dirs, idx } = found
            dirs[idx] = { ...dirs[idx], ...patch }
            // Choosing one un-chooses others + log decision for Sketch resume
            let decisionLog = Array.isArray(p.decisionLog) ? p.decisionLog : []
            /* CHOOSING OPENS. Having decided which route the project takes,
               the next act is making it — so the chosen route becomes the one
               being developed. The dependency runs one way only: opening a
               route to look at it must never decide anything. */
            let activeDirectionId = p.activeDirectionId
            if (patch.chosen === true) {
              dirs.forEach((d, i) => {
                if (i !== idx) d.chosen = false
              })
              activeDirectionId = dirs[idx].id
              const entry = decisionFromDirection(dirs[idx])
              decisionLog = appendDecision(decisionLog, entry)
            } else if (
              dirs[idx].chosen &&
              (patch.title != null || patch.note != null)
            ) {
              // Keep log in sync while refining title/why on the winner
              decisionLog = appendDecision(
                decisionLog,
                decisionFromDirection(dirs[idx])
              )
            }
            return { ...p, directions: dirs, decisionLog, activeDirectionId }
          }),
        })),

      /* `setRoughIdeas` is gone. The rough-idea dump was the one thing on
         Directions that authored content, and what it authored reached
         nothing: `project.roughIdeas` was read by its own screen and by two
         progress readouts, never by a brand book page, a pack, a case study
         or Identity. The field, its migration and the `hasRough` branch in
         `pathStepMeetsCondition` all stay so saved projects keep the state
         they have — nothing writes it any more.
      */

      /**
       * Manual decision log entry (Ideate why, Sketch note).
       * @param {{ kind?: string, directionId?: string, label?: string, title?: string, why?: string }} entry
       */
      logDecision: (entry) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const decisionLog = appendDecision(p.decisionLog, entry)
            return { ...p, decisionLog }
          }),
        })),

      /** Replace full palette for active project (max 8) */
      /**
       * @param {string[]} palette
       * @param {string|number} [projectId] - the project the palette was
       *   extracted FROM. Extraction decodes every pinned image, so without
       *   this a project switch mid-extraction overwrote the new project's
       *   palette with the old one's colours.
       */
      setProjectPalette: (palette, projectId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === (projectId ?? state.currentProjectId)
              ? {
                  ...p,
                  palette: (palette || []).slice(0, 8),
                  ...identityEdit(),
                }
              : p
          ),
        })),

      /**
       * Merge a patch into the active project's Brand Book Builder settings.
       * Section-level merge — `{ grid: {...} }` replaces only `grid`.
       */
      /**
       * Record that stops have been reached. Only ever adds.
       *
       * There is deliberately no way to clear a single stop: the whole point
       * is that ordinary work — starring another pin, a client re-submitting
       * their brief — must not be able to take a tick away. Starting over is
       * a new project.
       *
       * @param {string[]} stepIds
       * @param {string|number} [projectId] the project the work happened on
       */
      markPathReached: (stepIds, projectId) =>
        set((state) => {
          const ids = (stepIds || []).filter(Boolean)
          if (!ids.length) return {}
          const target = projectId ?? state.currentProjectId
          let changed = false
          const projects = state.projects.map((p) => {
            if (p.id !== target) return p
            const reached = { ...(p.pathReached || {}) }
            for (const id of ids) {
              if (!reached[id]) {
                reached[id] = true
                changed = true
              }
            }
            return changed ? { ...p, pathReached: reached } : p
          })
          // No-op writes would churn the persist layer and the cloud push on
          // every render pass that recomputes progress.
          return changed ? { projects } : {}
        }),

      /**
       * The user's own verdict on a stop. Outranks the live condition AND
       * `pathReached` — see pathStepHasContent.
       *
       * @param {string} stepId
       * @param {boolean|null} done - true = done, false = not done,
       *   null = hand it back to the app's own judgement.
       * @param {string|number} [projectId]
       *
       * Unlike markPathReached, this CAN clear a tick, and that is the point:
       * markPathReached protects against ordinary work silently taking a mark
       * away, which is a non-local loss with no cause on screen. This is the
       * opposite — an explicit action the user just took, with the same
       * control still sitting there to undo it. No confirm, deliberately:
       * nothing is destroyed, the toggle is its own undo, and a confirm here
       * would read as the app asking whether you are sure you are behind.
       */
      setStepDone: (stepId, done, projectId) =>
        set((state) => {
          const id = String(stepId || '')
          if (!id) return {}
          const target = projectId ?? state.currentProjectId
          return {
            projects: state.projects.map((p) => {
              if (p.id !== target) return p
              const next = { ...(p.pathDone || {}) }
              if (done === null || done === undefined) delete next[id]
              else next[id] = !!done
              return { ...p, pathDone: next }
            }),
          }
        }),

      setBookBuilder: (patch) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? {
                  ...p,
                  bookBuilder: { ...(p.bookBuilder || {}), ...(patch || {}) },
                }
              : p
          ),
        })),

      /**
       * The single writer for named colour rows — writes `palette` and
       * `paletteTokens` in one `set`, with the same cap, so they can never be
       * written apart or end up different lengths.
       *
       * Do not reach for `setProjectPalette` from a surface that shows names:
       * it writes hex only, which is exactly the desync this exists to stop.
       * Honours the same >= 2 floor as `removePaletteColor`.
       *
       * @param {{id: string, name: string, hex: string}[]} rows
       */
      setPaletteTokens: (rows) =>
        set((state) => {
          const next = (rows || []).filter((r) => r && r.hex).slice(0, 8)
          if (next.length < 2) return {}
          return {
            projects: state.projects.map((p) =>
              p.id === state.currentProjectId
                ? {
                    ...p,
                    palette: next.map((r) => r.hex),
                    paletteTokens: next.map((r) => ({
                      id: r.id,
                      name: r.name,
                    })),
                    ...identityEdit(),
                  }
                : p
            ),
          }
        }),

      updatePaletteColor: (index, hex) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const next = [
              ...(p.palette?.length ? p.palette : defaultProjectPalette),
            ]
            if (index < 0 || index >= next.length) return p
            next[index] = hex
            return { ...p, palette: next, ...identityEdit() }
          }),
        })),

      addPaletteColor: (hex = '#888888') =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const next = [
              ...(p.palette?.length ? p.palette : defaultProjectPalette),
            ]
            if (next.length >= 8) return p
            next.push(hex)
            return { ...p, palette: next, ...identityEdit() }
          }),
        })),

      removePaletteColor: (index) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const next = [
              ...(p.palette?.length ? p.palette : defaultProjectPalette),
            ]
            if (next.length <= 2) return p
            next.splice(index, 1)
            return { ...p, palette: next, ...identityEdit() }
          }),
        })),

      /**
       * Running to-do ("fridge list") — separate from desk tasks. Items are
       * keyword-tagged to one of the 7 workflow stages at add time. Stays
       * flat/unsorted until sortRunningTodo() is called once; after that,
       * new items still land pre-sorted into their stage automatically.
       */
      addRunningTodoItem: (text, stage) =>
        set((state) => {
          const trimmed = String(text || '').trim()
          if (!trimmed) return state
          return {
            projects: state.projects.map((p) => {
              if (p.id !== state.currentProjectId) return p
              const rt = p.runningTodo || blankRunningTodo()
              const item = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                text: trimmed,
                stage,
                completed: false,
                createdAt: Date.now(),
              }
              return { ...p, runningTodo: { ...rt, items: [...rt.items, item] } }
            }),
          }
        }),

      toggleRunningTodoItem: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const rt = p.runningTodo
            if (!rt) return p
            return {
              ...p,
              runningTodo: {
                ...rt,
                items: rt.items.map((it) =>
                  it.id === id ? { ...it, completed: !it.completed } : it
                ),
              },
            }
          }),
        })),

      removeRunningTodoItem: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const rt = p.runningTodo
            if (!rt) return p
            return {
              ...p,
              runningTodo: { ...rt, items: rt.items.filter((it) => it.id !== id) },
            }
          }),
        })),

      sortRunningTodo: () =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const rt = p.runningTodo || blankRunningTodo()
            return { ...p, runningTodo: { ...rt, sorted: true } }
          }),
        })),

      /** Daily reset: clears completed items only; keeps sorted state and
       *  unfinished items as-is. Safe to call repeatedly — no-ops same-day. */
      resetRunningTodoIfNewDay: (projectId) =>
        set((state) => {
          const today = toISODate(new Date())
          return {
            projects: state.projects.map((p) => {
              if (p.id !== projectId) return p
              const rt = p.runningTodo
              if (!rt || rt.lastResetDate === today) return p
              return {
                ...p,
                runningTodo: {
                  ...rt,
                  items: rt.items.filter((it) => !it.completed),
                  lastResetDate: today,
                },
              }
            }),
          }
        }),

      /** Business-card contacts — letterhead/envelope stay single, org-wide */
      addContact: () =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const contact = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: '',
              title: '',
              phone: '',
              email: '',
            }
            return { ...p, contacts: [...(p.contacts || []), contact] }
          }),
        })),

      updateContact: (id, field, value) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              contacts: (p.contacts || []).map((c) =>
                c.id === id ? { ...c, [field]: value } : c
              ),
            }
          }),
        })),

      removeContact: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return { ...p, contacts: (p.contacts || []).filter((c) => c.id !== id) }
          }),
        })),

      /* ── Client package assets ──────────────────────────────────────
         Finished work made in Illustrator, InDesign, Figma or anywhere else,
         brought in so the handoff can be assembled in one place. Stored as a
         data URL like the mark already is.

         `rights` defaults to clientOwned because that is what a piece made
         for this job is; anything else is a deliberate mark by the designer
         and holds the file back from the package. */
      addPackageAsset: (asset = {}) => {
        const row = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: String(asset.name || 'asset').slice(0, 120),
          dataUrl: asset.dataUrl || '',
          group: asset.group || 'application',
          item: asset.item || asset.name || 'asset',
          variant: asset.variant || '',
          rights: asset.rights || 'clientOwned',
          /* Which bought item from the brief this file IS, once the designer
             says. Empty until then — an unattributed file ticks nothing on
             the deliverables checklist, which is what stops one upload from
             vouching for every item at once. */
          deliverable: asset.deliverable || '',
          /* A file the app could not take — today only 'tooLarge'. Kept as a
             row rather than refused at the door, so the panel and the client's
             README can name it. A file silently not added is indistinguishable
             from one the designer forgot. */
          heldBack: asset.heldBack || '',
          sizeBytes: Number(asset.sizeBytes) || 0,
          /* WHO MADE THE BYTES — empty for everything that arrives through
             the file picker, which is the ordinary path. Only an in-app
             produce path sets it, so its absence is what lets the app tell
             its own output apart from the designer's. See
             lib/brand/productionProvenance for why attribution could not
             answer this and was being read as though it could.

             `producedAt` is the RUN; `addedAt` below is the FILING. They are
             the same instant the first time and diverge on re-production,
             where the row keeps its id and its filing date but holds new
             bytes. */
          producedBy: asset.producedBy || '',
          producedAt: asset.producedAt || '',
          addedAt: new Date().toISOString(),
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, packageAssets: [...(p.packageAssets || []), row] }
              : p
          ),
        }))
        return row
      },

      updatePackageAsset: (id, patch = {}) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              packageAssets: (p.packageAssets || []).map((a) =>
                a.id === id ? { ...a, ...patch, id: a.id } : a
              ),
            }
          }),
        })),

      removePackageAsset: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              packageAssets: (p.packageAssets || []).filter((a) => a.id !== id),
            }
          }),
        })),

      /* ── Parking lot ────────────────────────────────────────────────
         Park it, and it stops taking up room. Deliberately NOT a task: no
         due date, no completion, no counter anywhere that goes up when you
         add one. The only two operations are park and unpark. */
      parkIdea: (raw) => {
        const t = String(raw || '').trim()
        if (!t) return null
        const row = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          text: t.slice(0, 400),
          at: new Date().toISOString(),
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, parkingLot: [row, ...(p.parkingLot || [])] }
              : p
          ),
        }))
        return row
      },

      unparkIdea: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              parkingLot: (p.parkingLot || []).filter((i) => i.id !== id),
            }
          }),
        })),

      /** Lightweight hours/invoice tracking — separate from creative workflow */
      setHourlyRate: (rate) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId ? { ...p, hourlyRate: rate } : p
          ),
        })),

      /**
       * Add a billable line. Either hours (billed at the project rate) or a
       * flat `amount`.
       *
       * This used to reject anything without `hours > 0`, so a fixed-price
       * project could not be invoiced at all — you had to invent hours that
       * multiplied out to the agreed number. The brief asks the client for a
       * budget and a list of deliverables, which is project pricing; the
       * invoice could only express hourly.
       */
      addTimeEntry: ({ date, hours, amount, note = '' }) =>
        set((state) => {
          const h = Number(hours)
          const amt = Number(amount)
          const hasHours = Number.isFinite(h) && h > 0
          const hasAmount = Number.isFinite(amt) && amt > 0
          if (!date || (!hasHours && !hasAmount)) return state
          return {
            projects: state.projects.map((p) => {
              if (p.id !== state.currentProjectId) return p
              const entry = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                date,
                note: String(note || '').trim(),
                ...(hasHours ? { hours: h } : {}),
                ...(hasAmount ? { amount: amt } : {}),
              }
              return { ...p, timeLog: [...(p.timeLog || []), entry] }
            }),
          }
        }),

      /** Claim the next invoice number and advance the counter. */
      /**
       * The number this invoice WOULD get. Does not consume it.
       *
       * Split out of takeInvoiceNumber, which incremented before the PDF
       * existed — so a cancelled save dialog, a failed PDF engine import, or
       * an out-of-memory on a long log burned the number anyway, and each
       * retry burned another. Cancelling twice put the sequence three ahead.
       * That is exactly the gap the original comment said numbering-on-export
       * was there to prevent; it just moved the hole rather than closing it.
       */
      peekInvoiceNumber: () => {
        const { prefs } = get()
        const n = Number(prefs?.invoiceNextNumber) || 1
        const prefix = String(prefs?.invoicePrefix || '').trim()
        return prefix ? `${prefix}${n}` : String(n)
      },

      /** Consume it — call only once the PDF has actually been produced. */
      commitInvoiceNumber: () =>
        set((state) => ({
          prefs: {
            ...state.prefs,
            invoiceNextNumber: (Number(state.prefs?.invoiceNextNumber) || 1) + 1,
          },
        })),

      removeTimeEntry: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return { ...p, timeLog: (p.timeLog || []).filter((t) => t.id !== id) }
          }),
        })),

      /**
       * Open a revision round. No-op if one is already open — two open rounds
       * would make "which round am I on" unanswerable, which is the exact
       * question this feature exists to answer.
       */
      startRevisionRound: (note = '') =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const rounds = Array.isArray(p.revisionRounds)
              ? p.revisionRounds
              : []
            if (rounds.some((r) => r && !r.closedAt)) return p
            return {
              ...p,
              revisionRounds: [
                ...rounds,
                {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  openedAt: new Date().toISOString(),
                  note: String(note || '').trim(),
                  closedAt: '',
                },
              ],
            }
          }),
        })),

      /**
       * Close the open round, and optionally bill it.
       *
       * `bill` is opt-in and never inferred. A round going over the agreed
       * count is a fact; charging for it is a decision, and an app that
       * quietly added a line to an invoice would be making that decision on
       * the studio's behalf against a client it cannot see.
       */
      closeRevisionRound: ({ bill = false, hours = 0 } = {}) =>
        set((state) => {
          const project = state.projects.find(
            (p) => p.id === state.currentProjectId
          )
          if (!project) return state
          const rounds = Array.isArray(project.revisionRounds)
            ? project.revisionRounds
            : []
          const openIdx = rounds.findIndex((r) => r && !r.closedAt)
          if (openIdx < 0) return state

          const summary = revisionSummary(
            rounds,
            project.scopeRevisionsIncluded
          )
          const charge = bill
            ? roundCharge({
                billing: project.scopeRevisionBilling,
                rate: project.scopeRevisionRate,
                hours,
                isBeyond: summary.isBeyond,
              })
            : null

          const nextRounds = rounds.map((r, i) =>
            i === openIdx
              ? {
                  ...r,
                  closedAt: new Date().toISOString(),
                  billedAmount: charge || 0,
                }
              : r
          )

          /* A billed round becomes an invoice line, not a separate ledger.
             The invoice is the one place money is counted; a second running
             total somewhere else is a number waiting to disagree. */
          const nextTimeLog =
            charge && charge > 0
              ? [
                  ...(project.timeLog || []),
                  {
                    id: `${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 7)}`,
                    date: new Date().toISOString().slice(0, 10),
                    note: `Revision round ${summary.number}`,
                    amount: charge,
                  },
                ]
              : project.timeLog || []

          return {
            projects: state.projects.map((p) =>
              p.id === project.id
                ? { ...p, revisionRounds: nextRounds, timeLog: nextTimeLog }
                : p
            ),
          }
        }),

      /**
       * Mark a decision as one that broke a convention on purpose.
       *
       * A one-tap toggle applied AFTER the fact, never a field on the capture
       * form. The rejected version added a "which rule are you breaking?" box
       * to the decision form plus a rule that filling it made the `why`
       * mandatory — which fires a decision on every entry (and most decisions
       * break nothing), and punishes the user with a blocked save for
       * volunteering information. Capture is the most initiation-fragile
       * moment in the workflow; nothing gets added to it.
       *
       * There is no accompanying text field. The existing `why` already says
       * what the break was — "Quiet teal — calm, not corporate" IS the
       * statement — so this only marks which entries the case study should
       * present as deliberate.
       */
      toggleDecisionRuleBreak: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              decisionLog: (p.decisionLog || []).map((d) =>
                d.id === id ? { ...d, breaksRule: !d.breaksRule } : d
              ),
            }
          }),
        })),

      /** Feedback log — Reviewer / Issue / Decision / Status. */
      addFeedbackEntry: ({ reviewer = '', issue = '', decision = '', status = 'open' }) =>
        set((state) => {
          if (!String(issue || '').trim()) return state
          return {
            projects: state.projects.map((p) => {
              if (p.id !== state.currentProjectId) return p
              return {
                ...p,
                feedbackLog: [
                  ...(Array.isArray(p.feedbackLog) ? p.feedbackLog : []),
                  {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    reviewer: String(reviewer || '').trim(),
                    issue: String(issue).trim(),
                    decision: String(decision || '').trim(),
                    status,
                  },
                ],
              }
            }),
          }
        }),

      updateFeedbackEntry: (id, patch = {}) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              feedbackLog: (p.feedbackLog || []).map((f) =>
                f.id === id ? { ...f, ...patch } : f
              ),
            }
          }),
        })),

      removeFeedbackEntry: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              feedbackLog: (p.feedbackLog || []).filter((f) => f.id !== id),
            }
          }),
        })),

      /** Drop a row from the private work log. A measured record you disagree
       *  with is still yours to correct. */
      removeWorkEntry: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return { ...p, workLog: (p.workLog || []).filter((t) => t.id !== id) }
          }),
        })),

      /**
       * Record time actually worked, from the work clock.
       *
       * Writes to `workLog`, NOT to `timeLog`. These were the same array and
       * should never have been: the clock is the user clocking their own
       * hours, for themselves, and an invoice is a claim made to a client.
       * Wiring one into the other means every idle page you left open, every
       * stage you passed through, silently becomes something someone is
       * asked to pay for — and you would be reviewing a bill rather than
       * writing one. Billable hours stay hand-entered.
       *
       * Accumulates into ONE entry per stage per day rather than appending a
       * row every time you pause. A day of real work is dozens of
       * start/stops, and a log with sixty four-minute rows is not a record of
       * a day, it is a transcript of your attention.
       *
       * @param {number} ms - milliseconds worked, idle already excluded
       */
      logWorkedTime: (projectId, stage, ms) =>
        set((state) => {
          const minutes = Math.round((Number(ms) || 0) / 60000)
          // Under a minute is noise from a page you passed through.
          if (minutes < 1) return {}
          const target = projectId ?? state.currentProjectId
          const date = new Date().toISOString().slice(0, 10)
          const label = String(stage || 'work')
          return {
            projects: state.projects.map((p) => {
              if (p.id !== target) return p
              const log = [...(p.workLog || [])]
              const i = log.findIndex((e) => e.date === date && e.stage === label)
              if (i >= 0) {
                log[i] = {
                  ...log[i],
                  hours: Math.round((log[i].hours + minutes / 60) * 100) / 100,
                }
              } else {
                log.push({
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  date,
                  stage: label,
                  hours: Math.round((minutes / 60) * 100) / 100,
                  note: label,
                })
              }
              return { ...p, workLog: log }
            }),
          }
        }),

      /** Client discovery brief — merged project-brief + questionnaire */
      updateDiscoveryField: (fieldId, value) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              discoveryAnswers: { ...(p.discoveryAnswers || {}), [fieldId]: value },
            }
          }),
        })),

      setDiscoveryUpload: (upload) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId ? { ...p, discoveryUpload: upload } : p
          ),
        })),

      setClientPortalId: (portalId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId ? { ...p, clientPortalId: portalId } : p
          ),
        })),

      /** Snapshot of client activity already seen, keyed by portal id.
       *  Compared field-by-field to decide what's new — see clientInbox.js
       *  for why this is a content diff and not a timestamp. */
      portalSeen: {},

      /** Record a portal's activity as seen. Only ever called on an explicit
       *  open — never on a poll or a hover, so nothing silently stops being
       *  new while the user isn't looking. */
      markPortalSeen: (portalId, snapshot) =>
        set((state) => ({
          portalSeen: { ...(state.portalSeen || {}), [portalId]: snapshot },
        })),

      /** Merge answers that came from a client (portal form or an OCR'd
       *  paper form) into the project's own Define/detective answers.
       *  CONTRACT: a non-empty incoming value ALWAYS wins — it overwrites an
       *  existing answer (line ~1484 keys only on the incoming value, not the
       *  current one). Only empty or wrong-shape incoming values are skipped.
       *  This is deliberate: it runs AFTER a human review step, so the
       *  incoming values are the reviewed truth. Do NOT rely on this to
       *  protect an existing designer answer — it won't. That behaviour lives
       *  in mergeDiscoveryAnswers below (it computes `alreadySet` and skips);
       *  the two functions carry near-identical comments but OPPOSITE
       *  semantics, so read the body, not the blurb, before reusing either. */
      /**
       * @param {object} incoming - answers to merge
       * @param {string|number} [projectId] - the project the work STARTED on.
       *   Pass it whenever an await sits between the user's action and this
       *   call: OCR of a scanned form runs for seconds, and resolving
       *   `currentProjectId` at apply time merged a client's answers into
       *   whichever project happened to be open when it finished.
       */
      // Used by both the portal-answers review screen and the paper-scan/OCR
      // review screen. Client image attachments (`${id}Files` arrays) merge
      // additively rather than overwrite — same reasoning as
      // mergeDiscoveryAnswers below: the designer's own uploads and the
      // client's shouldn't be able to clobber each other. Inspiration images
      // also auto-pin onto the Research wall here, matching the /f/:shareId
      // path — a client attaching a look-reference via /c/:portalId gets the
      // same "the wall is where the designer actually looks" treatment
      // instead of the image sitting invisible inside a brief chapter.
      mergeDetectiveAnswers: (incoming, projectId) => {
        const inspirationFiles = Array.isArray(incoming?.inspirationLinksFiles)
          ? incoming.inspirationLinksFiles
          : []
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== (projectId ?? state.currentProjectId)) return p
            const merged = { ...(p.detective || {}) }
            Object.entries(incoming || {}).forEach(([k, v]) => {
              if (k.endsWith('Files') && Array.isArray(v)) {
                const existing = Array.isArray(merged[k]) ? merged[k] : []
                const seen = new Set(existing.map((f) => f.url))
                merged[k] = [...existing, ...v.filter((f) => !seen.has(f.url))]
                return
              }
              /* Refuse a shape the schema does not declare. The paper/OCR
                 route hands back plain text for every field, and a string
                 written into a checklist/choice/spectrum slot is invisible
                 everywhere downstream — unchecked boxes for a value that is
                 present, a spectrum with no position, and a client brand book
                 that prints stock applications because touchpointsFor() fell
                 back to LEGACY_TOUCHPOINTS. Nothing throws, so nothing tells
                 you. Review coerces these before they get here; this is the
                 backstop for any path that does not. */
              if (isWrongShapeForField(k, v)) return
              if (String(v || '').trim()) merged[k] = v
            })
            return { ...p, detective: merged }
          }),
        }))
        if (inspirationFiles.length) {
          const state = get()
          const target = projectId ?? state.currentProjectId
          inspirationFiles.forEach((f) => {
            get().addMoodPin({
              projectId: target,
              type: 'image',
              visual: f.url,
              note: 'From the client’s brief',
            })
          })
        }
      },

      setDiscoveryShare: (shareId, status = 'pending') =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, discoveryShareId: shareId, discoveryShareStatus: status }
              : p
          ),
        })),

      /** Bulk-merge answers the client submitted via their public link.
       *  Only fills fields the client actually answered — never blanks
       *  something the studio user already filled in.
       *
       *  Also mirrors the shared ids into `detective`. The two
       *  questionnaires are separate schemas stored under separate keys,
       *  so a client filling /f/:shareId wrote only to discoveryAnswers
       *  and the Define sheet — which reads `detective` — never showed a
       *  word of it. Mirroring is deliberately one-way and submit-only:
       *  ids are NOT renamed (detectiveBrief's header explains that
       *  renaming orphans saved answers), and a value the studio user has
       *  already entered always wins over the client's. */
      /* Takes the project id the check was started for. It used to write to
         whichever project was current when the promise resolved, which is a
         different project if the user switched while the fetch was in
         flight — and because the merge only fills blanks, one client's
         answers appearing on another client's brief would be silent. */
      mergeDiscoveryAnswers: (projectId, clientAnswers) => {
        // Images the client attached under "What look are you drawn to?" go
        // onto the Research wall, not just into the brief — a file three
        // scrolls into a chapter is invisible in practice, and the wall is
        // where the designer actually looks. Existing-asset files stay in
        // the brief only: they're the *old* identity, not new inspiration.
        const inspirationFiles = Array.isArray(clientAnswers?.inspirationLinksFiles)
          ? clientAnswers.inspirationLinksFiles
          : []
        set((state) => ({
          projects: state.projects.map((p) => {
            const target = projectId ?? state.currentProjectId
            if (p.id !== target) return p
            const merged = { ...(p.discoveryAnswers || {}) }
            Object.entries(clientAnswers || {}).forEach(([k, v]) => {
              /* Refuse a shape the schema does not declare. The paper/OCR
                 route hands back plain text for every field, and a string
                 written into a checklist/choice/spectrum slot is invisible
                 everywhere downstream — unchecked boxes for a value that is
                 present, a spectrum with no position, and a client brand book
                 that prints stock applications because touchpointsFor() fell
                 back to LEGACY_TOUCHPOINTS. Nothing throws, so nothing tells
                 you. Review coerces these before they get here; this is the
                 backstop for any path that does not. */
              if (isWrongShapeForField(k, v)) return
              if (String(v || '').trim()) merged[k] = v
            })
            const detective = { ...(p.detective || {}) }
            Object.entries(clientAnswers || {}).forEach(([id, incoming]) => {
              if (!DETECTIVE_FIELD_IDS.has(id)) return
              const filled = Array.isArray(incoming)
                ? incoming.length > 0
                : String(incoming || '').trim().length > 0
              if (!filled) return
              const existing = detective[id]
              // Attachment lists are additive, not a value to protect —
              // the designer's own uploads and the client's shouldn't be
              // able to clobber each other, only merge.
              if (id.endsWith('Files') && Array.isArray(incoming)) {
                const seen = new Set((existing || []).map((f) => f.url))
                detective[id] = [
                  ...(existing || []),
                  ...incoming.filter((f) => !seen.has(f.url)),
                ]
                return
              }
              const alreadySet = Array.isArray(existing)
                ? existing.length > 0
                : String(existing || '').trim().length > 0
              if (alreadySet) return
              detective[id] = incoming
            })
            // Client deadline → project.deadline (calendar) if studio empty
            const clientDeadline = String(
              clientAnswers?.projectDeadline || ''
            ).trim()
            const nextDeadline =
              clientDeadline && !String(p.deadline || '').trim()
                ? clientDeadline
                : p.deadline || ''
            if (clientDeadline && !String(detective.projectDeadline || '').trim()) {
              detective.projectDeadline = clientDeadline
            }
            return {
              ...p,
              deadline: nextDeadline,
              discoveryAnswers: merged,
              detective,
              discoveryShareStatus: 'submitted',
            }
          }),
        }))
        if (inspirationFiles.length) {
          const state = get()
          const target = projectId ?? state.currentProjectId
          inspirationFiles.forEach((f) => {
            get().addMoodPin({
              projectId: target,
              type: 'image',
              visual: f.url,
              note: 'From the client’s brief',
            })
          })
        }
      },

      /** Partial update of brand identity template fields */
      updateBrandField: (field, value) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? {
                  ...p,
                  [field]: value,
                  ...(IDENTITY_FIELD_SET.has(field) ? identityEdit() : null),
                }
              : p
          ),
        })),

      /**
       * Bump designVersion vN → vN+1 (or set v2 if freeform).
       * Call before big design changes.
       */
      bumpDesignVersion: () => {
        const state = get()
        const p = state.projects.find((x) => x.id === state.currentProjectId)
        if (!p) return { ok: false }
        const cur = String(p.designVersion || 'v1').trim()
        const m = cur.match(/^v?(\d+)$/i)
        const n = m ? Number(m[1]) + 1 : 2
        const next = `v${n}`
        /* `identitySavedAt` is what the words-only stamp compares against — a
           bump is the moment a versionService snapshot is taken, so it is the
           honest meaning of "last saved version". Written in the same `set` as
           designVersion so the two can never disagree about whether a save
           happened. */
        const savedAt = new Date().toISOString()
        set({
          projects: state.projects.map((proj) =>
            proj.id === state.currentProjectId
              ? { ...proj, designVersion: next, identitySavedAt: savedAt }
              : proj
          ),
        })
        // Fire-and-forget version snapshot — must not block the synchronous return
        versionService.autoVersion('version bump').catch(() => {})
        return { ok: true, version: next }
      },

      /**
       * If still on v1, bump once after a major design action (kit, mark, type pair).
       * Avoids keystroke spam — only discrete intentional actions call this.
       */
      bumpDesignVersionIfV1: () => {
        const state = get()
        const p = state.projects.find((x) => x.id === state.currentProjectId)
        if (!p) return { ok: false, bumped: false }
        const cur = String(p.designVersion || 'v1').trim()
        if (!/^v?1$/i.test(cur) && cur !== '') {
          return { ok: true, bumped: false, version: cur }
        }
        const result = {...get().bumpDesignVersion(), bumped: true}
        // Fire-and-forget version snapshot — must not block the synchronous return
        versionService.autoVersion('initial version bump').catch(() => {})
        return {...result, version: result.version}
      },

      /* Toggling is an explicit choice, so it pins the theme: the device is
         only followed until the user says otherwise, and then never again
         unless they reset it. */
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'warm' ? 'deep' : 'warm',
          themeSource: 'user',
        })),

      setTheme: (theme) => set({ theme, themeSource: 'user' }),

      /** Follow the OS again — used on load and on live scheme changes while
       *  the user has not pinned a theme. */
      applyDeviceTheme: () =>
        set((state) =>
          state.themeSource === 'user' ? {} : { theme: deviceTheme() }
        ),

      /* ── Asset library ────────────────────────────────────────────────
         Metadata actions only. Bytes are written to IndexedDB by the ingest
         path before these are called, so a row in this list always means a
         file that landed somewhere — never a placeholder for one that
         didn't. */

      /** Append normalised rows. Ingest has already validated them. */
      addAssets: (rows) =>
        set((state) => {
          const incoming = (Array.isArray(rows) ? rows : [rows]).filter(Boolean)
          if (!incoming.length) return {}
          /* Guard against a double-fire of the same drop — a dropped file that
             appears twice reads as a duplicate upload the designer has to
             reason about and clean up. */
          const seen = new Set((state.assets || []).map((a) => a.id))
          const fresh = incoming.filter((a) => a.id && !seen.has(a.id))
          if (!fresh.length) return {}
          return { assets: [...(state.assets || []), ...fresh] }
        }),

      /** Refile one asset. The view has called this since it was written; it
          was never defined, and the call site used `?.()` so the miss was
          silent rather than a crash. */
      setAssetCategory: (assetId, category) =>
        set((state) => ({
          assets: (state.assets || []).map((a) =>
            String(a.id) === String(assetId)
              ? { ...a, category: String(category || 'other') }
              : a
          ),
        })),

      removeAsset: (assetId) =>
        set((state) => ({
          assets: (state.assets || []).filter(
            (a) => String(a.id) !== String(assetId)
          ),
        })),


      /** Server rows are canonical after reload. Keep local-only legacy rows
          that the server has not seen, but replace a matching id wholesale so
          a durable storage_path cannot be overwritten by stale metadata. */
      upsertAssets: (rows) =>
        set((state) => {
          const incoming = (Array.isArray(rows) ? rows : [rows]).filter(Boolean)
          if (!incoming.length) return {}
          const byId = new Map((state.assets || []).map((asset) => [asset.id, asset]))
          incoming.forEach((asset) => {
            if (asset?.id) byId.set(asset.id, asset)
          })
          return { assets: [...byId.values()] }
        }),

      /** Point a legacy-compatible Brief attachment at its canonical source.
          The public URL remains a rendering fallback; it is not another asset
          record and is never a package input. */
      linkBriefAttachmentToAsset: (projectId, fieldId, url, assetRef) =>
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.id !== projectId) return project
            const key = `${String(fieldId || '').trim()}Files`
            const files = Array.isArray(project.detective?.[key])
              ? project.detective[key]
              : []
            return {
              ...project,
              detective: {
                ...(project.detective || {}),
                [key]: files.map((file) =>
                  file?.url === url
                    ? { ...file, assetRef: assetRef?.kind === 'asset' && assetRef?.id ? assetRef : file.assetRef }
                    : file
                ),
              },
            }
          }),
        })),
      toggleBodyDoubling: () =>
        set((state) => ({ bodyDoubling: !state.bodyDoubling })),

      setBodyDoubling: (bodyDoubling) => set({ bodyDoubling }),

      setOnboarded: (onboarded) => set({ onboarded }),

      setPref: (key, value) =>
        set((state) => ({
          prefs: {
            soundEnabled: true,
            reduceMotion: false,
            forceBreaksEnabled: true,
            queueCollapsed: true,
            showHowItWorks: false,
            ...state.prefs,
            [key]: value,
          },
        })),

      /**
       * Mirror pushWorkspace()'s image-offload results into local state so
       * the next sync sees Storage URLs instead of the original data URLs —
       * without this, every autosave would re-upload the same image bytes.
       * Also shrinks what gets persisted to localStorage.
       */
      applyImageUrlReplacements: (replacements = []) => {
        if (!Array.isArray(replacements) || !replacements.length) return
        set((state) => {
          const moodReps = new Map(
            replacements.filter((r) => r.kind === 'mood').map((r) => [r.id, r.url])
          )
          const logoReps = new Map(
            replacements
              .filter((r) => r.kind === 'logo')
              .map((r) => [r.projectId, r.url])
          )
          return {
            moodItems: moodReps.size
              ? state.moodItems.map((m) =>
                  moodReps.has(m.id) ? { ...m, visual: moodReps.get(m.id) } : m
                )
              : state.moodItems,
            projects: logoReps.size
              ? state.projects.map((p) =>
                  logoReps.has(p.id) ? { ...p, logoImage: logoReps.get(p.id) } : p
                )
              : state.projects,
          }
        })
      },

      exportAllData: () => {
        const s = get()
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          projects: s.projects,
          currentProjectId: s.currentProjectId,
          tasks: s.tasks,
          moodItems: s.moodItems,
          breakKit: s.breakKit || [],
          forms: s.forms || [],
          theme: s.theme,
          prefs: s.prefs,
          sparkIndex: s.sparkIndex,
          oppositeIndex: s.oppositeIndex ?? 0,
          sparksTried: s.sparksTried ?? 0,
          onboarded: s.onboarded,
          currentSpark: s.currentSpark,
          /* These are persisted by `partialize` but were missing here, so a
             cloud push or a JSON backup captured a workspace WITHOUT them and
             the matching pull/import wrote that back — silently destroying
             every saved template. Anything in `partialize` has to be in the
             payload too, or the round-trip is lossy by construction. */
          templates: s.templates || [],
          /* Metadata only — the bytes live in IndexedDB and do not travel in
             a JSON backup. An import on another device therefore restores the
             shelf with every file marked as not on this device, which is the
             truth, rather than cards pointing at bytes that were never
             carried. */
          assets: s.assets || [],
          portalSeen: s.portalSeen || {},
          themeSource: s.themeSource,
          clientRecords: s.clientRecords || {},
          deletedProjects: s.deletedProjects || [],
        }
      },

      /**
       * Apply a workspace payload (cloud pull or import).
       * Empty / invalid payload returns { ok: false }.
       */
      hydrateFromPayload: (data) => {
        if (!data || typeof data !== 'object') {
          return { ok: false, error: 'Empty workspace' }
        }
        if (!Array.isArray(data.projects) || data.projects.length === 0) {
          return { ok: false, error: 'No projects in workspace' }
        }
        if (!Array.isArray(data.tasks)) {
          return { ok: false, error: 'No tasks in workspace' }
        }
        const projects = data.projects.map((p) => {
          const base = {
            logoDirection: '',
            palette: [...defaultProjectPalette],
            deadline: '',
            directions: blankDirections(),
            ...brandIdentityDefaults(),
            ...p,
          }
          // Merge detective so partial imports keep all keys
          base.detective = {
            ...blankDetective(),
            ...(p.detective || {}),
          }
          /* Only a project that has NO directions array gets the seed. A short
             array is a designer's state — two directions, or none — and
             replacing it here discarded the ones that survived a deletion
             along with the one that was deleted. */
          if (!Array.isArray(base.directions)) {
            base.directions = blankDirections()
          }
          if (!Array.isArray(base.roughIdeas)) {
            base.roughIdeas = []
          }
          if (!base.designVersion) base.designVersion = 'v1'
          return base
        })
        /* TOMBSTONES UNION, THEY DO NOT REPLACE.
           A pull is not a restore. Replacing the list with the payload's copy
           would silently drop a tombstone this device made while offline —
           the incoming workspace simply predates that deletion — and the
           project would come straight back. Deletion is sticky in one
           direction only: an explicit undo lifts it, a sync never does. */
        const mergedDeleted = (Array.isArray(data.deletedProjects)
          ? data.deletedProjects
          : []
        ).reduce(
          (acc, d) => (d?.id == null ? acc : withTombstone(acc, d.id, d.at)),
          Array.isArray(get().deletedProjects) ? get().deletedProjects : []
        )
        /* …and a project the payload still carries but this device has
           tombstoned does not come back in through the front door either. */
        const kept = projects.filter((p) => !isTombstoned(mergedDeleted, p.id))
        const live = kept.length ? kept : projects

        const currentProjectId =
          data.currentProjectId &&
          live.some((p) => p.id === data.currentProjectId)
            ? data.currentProjectId
            : live[0].id
        const sparkIndex =
          typeof data.sparkIndex === 'number' ? data.sparkIndex : 0
        const oppositeIndex =
          typeof data.oppositeIndex === 'number' ? data.oppositeIndex : 0
        const sparksTried =
          typeof data.sparksTried === 'number' ? data.sparksTried : 0
        set({
          projects: live.map((p) => ({
            ...p,
            active: sameProjectId(p.id, currentProjectId),
          })),
          currentProjectId,
          deletedProjects: mergedDeleted,
          tasks: data.tasks,
          moodItems: Array.isArray(data.moodItems) ? data.moodItems : [],
          breakKit: Array.isArray(data.breakKit) ? data.breakKit : [],
          forms: Array.isArray(data.forms) ? data.forms : [],
          theme: data.theme === 'deep' ? 'deep' : 'warm',
          // Full defaults first so payloads from older builds keep the
          // intended defaults for prefs they never knew about
          prefs: {
            ...blankWorkspaceState().prefs,
            ...(data.prefs || {}),
          },
          sparkIndex,
          oppositeIndex,
          sparksTried,
          currentSpark:
            data.currentSpark ||
            sparkPrompts[sparkIndex % sparkPrompts.length] ||
            sparkPrompts[0],
          onboarded: data.onboarded !== false,
          bodyDoubling: false,
          /* Restored defensively: a payload written by an older build has no
             these keys at all, and reading `undefined` back into the store
             would wipe what the user has locally. Absent means "keep what we
             have", not "the user deleted them". */
          ...(Array.isArray(data.templates) ? { templates: data.templates } : {}),
          ...(data.portalSeen && typeof data.portalSeen === 'object'
            ? { portalSeen: data.portalSeen }
            : {}),
          ...(data.themeSource === 'auto' || data.themeSource === 'user'
            ? { themeSource: data.themeSource }
            : {}),
          ...(data.clientRecords && typeof data.clientRecords === 'object'
            ? { clientRecords: data.clientRecords }
            : {}),
        })
        return { ok: true }
      },

      /**
       * Restore a JSON backup from exportAllData.
       * Returns { ok: true } or { ok: false, error: string }.
       */
      importAllData: (raw) => {
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw
          return get().hydrateFromPayload(data)
        } catch {
          // Deliberately swallow the parser's own message. `JSON.parse` throws
          // things like "Unexpected token '<' ... is not valid JSON", which
          // names an internal format and a character offset — it reads as a
          // verdict on the user rather than on the file, and it tells them
          // nothing they can act on. Callers fall back to their own plain
          // wording ("Could not import that file"), localised.
          return { ok: false }
        }
      },

      renameProject: (id, name) => {
        const next = String(name || '').trim()
        if (!next) return
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name: next } : p
          ),
        }))
      },

      /** Delete a project and its tasks/pins. Last project may be removed
       *  (empty workspace is allowed — create again from + / New project). */
      /**
       * Delete a project and everything hanging off it.
       *
       * Returns a `restore` closure alongside the result, and that is what
       * lets the caller offer an undo instead of a confirmation dialog. The
       * distinction matters for this app's audience: a dialog is a decision
       * made under uncertainty with no way back, which is why its copy has to
       * shout ("You cannot undo this"). For a user who is rejection-sensitive,
       * that turns routine tidying into a stakes moment — so the tidying does
       * not happen, dead projects pile up on the desk, and every later scan of
       * the desk costs more. Undo inverts it: the choice becomes cheap, so it
       * gets made.
       *
       * The restore is honest rather than approximate, which is the condition
       * for offering it at all. Deletion touches exactly three slices —
       * `projects`, `tasks`, `moodItems` — so putting those three back, at the
       * original index and with the original selection, returns the workspace
       * to precisely its prior state. If deletion ever grows to touch a fourth,
       * this closure must grow with it: a restore that silently drops data is
       * worse than the dialog it replaced, because the user has been told it
       * was safe.
       */
      deleteProject: (id) => {
        const { projects, tasks, moodItems, currentProjectId, deletedProjects } =
          get()
        /* `sameProjectId`, not `!==`. Ids arrive as numbers on old projects
           and strings on new ones, and a round trip through import or a
           `<select>` can change which. Strict inequality made `NaN !== NaN`
           true as well, so a project whose id had gone bad could never be
           removed — the filter kept it and this reported "not found".
           One comparison rule for the whole app; see journeyProgress.js. */
        const remaining = projects.filter((p) => !sameProjectId(p.id, id))
        if (remaining.length === projects.length) {
          return { ok: false, error: 'Project not found' }
        }

        // Captured BEFORE the set() below, so the closure holds the real prior
        // state rather than re-deriving it from a store that has moved on.
        const prevProjects = projects
        const prevTasks = tasks
        const prevMoodItems = moodItems
        const prevCurrentId = currentProjectId
        /* The fourth slice. This closure's own docstring said deletion touched
           exactly three and that it must grow if that changed — it has.
           Undo is the ONE explicit "restore a deleted project" action the app
           has (`restoreVersion` cannot: it requires the version's project to
           be the current one, and a deleted project cannot be current). So
           undo lifts the tombstone; nothing else ever does. */
        const prevDeleted = deletedProjects
        const restore = () => {
          set({
            projects: prevProjects,
            tasks: prevTasks,
            moodItems: prevMoodItems,
            currentProjectId: prevCurrentId,
            deletedProjects: prevDeleted,
          })
          return { ok: true }
        }
        const nextDeleted = withTombstone(deletedProjects, id)

        if (remaining.length === 0) {
          set({
            projects: [],
            currentProjectId: null,
            tasks: tasks.filter((t) => !sameProjectId(t.projectId, id)),
            moodItems: moodItems.filter((m) => !sameProjectId(m.projectId, id)),
            deletedProjects: nextDeleted,
          })
          return { ok: true, empty: true, restore }
        }
        const nextId = sameProjectId(currentProjectId, id)
          ? (remaining.find((p) => !p.archived) || remaining[0]).id
          : currentProjectId
        set({
          projects: remaining.map((p) => ({
            ...p,
            active: sameProjectId(p.id, nextId),
          })),
          currentProjectId: nextId,
          tasks: tasks.filter((t) => !sameProjectId(t.projectId, id)),
          moodItems: moodItems.filter((m) => !sameProjectId(m.projectId, id)),
          deletedProjects: nextDeleted,
        })
        return { ok: true, empty: false, restore }
      },

      /** Soft-archive: hide from default lists, keep data. Last active project
       *  may be archived — workspace can have no open projects. */
      archiveProject: (id) => {
        const { projects, currentProjectId } = get()
        const target = projects.find((p) => p.id === id)
        if (!target) return { ok: false, error: 'Project not found' }
        let nextId = currentProjectId
        if (currentProjectId === id) {
          nextId =
            projects.find((p) => p.id !== id && !p.archived)?.id ?? null
        }
        set({
          projects: projects.map((p) =>
            p.id === id
              ? { ...p, archived: true, active: false }
              : {
                  ...p,
                  active: nextId != null && p.id === nextId,
                }
          ),
          currentProjectId: nextId,
        })
        return { ok: true, empty: nextId == null }
      },

      unarchiveProject: (id) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, archived: false } : p
          ),
        }))
        return { ok: true }
      },

      clearAllData: () => {
        const blank = blankWorkspaceState()
        set({ ...blank, onboarded: false })
        try {
          localStorage.removeItem('cc-hide-howto')
          localStorage.removeItem('cc-onboarded')
          localStorage.removeItem('cc-desk')
        } catch {
          /* ignore */
        }
      },

      /** Wipe all projects — true empty desk (no placeholder project). */
      clearToEmpty: () => {
        const blank = blankWorkspaceState()
        set({
          ...blank,
          onboarded: true,
          projects: [],
          currentProjectId: null,
          tasks: [],
          moodItems: [],
        })
      },

      setTasks: (tasks) => set({ tasks }),

      addTask: (task) =>
        set((state) => ({ tasks: [task, ...state.tasks] })),

      toggleTask: (id) =>
        set((state) => {
          const updated = state.tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          )
          // Keep open work first, completed at the bottom
          const open = updated.filter((t) => !t.completed)
          const done = updated.filter((t) => t.completed)
          return { tasks: [...open, ...done] }
        }),

      /**
       * Reorder a set of open tasks to a specific sequence (Sketch Focus
       * Mode's 1-2-3 priority ranking) — everything not in orderedIds
       * keeps its existing relative order, appended after.
       */
      reorderOpenTasks: (orderedIds) =>
        set((state) => {
          const rank = new Map(orderedIds.map((id, i) => [id, i]))
          const ranked = state.tasks
            .filter((t) => rank.has(t.id))
            .sort((a, b) => rank.get(a.id) - rank.get(b.id))
          const rest = state.tasks.filter((t) => !rank.has(t.id))
          return { tasks: [...ranked, ...rest] }
        }),

      updateTaskTitle: (id, title) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, title: title.trim() || t.title } : t
          ),
        })),

      /** Status tag shown under a desk step (energy, source) — not the why */
      updateTaskMeta: (id, meta) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, meta: String(meta || '') } : t
          ),
        })),

      /** One-line "why it fits the goal" — distinct from meta's auto-tags */
      updateTaskWhy: (id, why) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, why: String(why || '') } : t
          ),
        })),

      setTaskDueDate: (id, dueDate) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, dueDate: dueDate || '' } : t
          ),
        })),

      /**
       * Remove a step and any sub-steps hanging off it.
       *
       * Returns `{ ok, restore }` so the caller can offer an undo rather than
       * a "Cannot undo" confirmation. Note that this deletes CHILDREN too —
       * a restore that put back only the named row would quietly lose the
       * sub-steps, and the user would have been told the removal was
       * reversible. Snapshotting the whole list is the cheap way to be exactly
       * right instead of nearly right.
       */
      removeTask: (id) => {
        const prevTasks = get().tasks
        const next = prevTasks.filter((t) => t.id !== id && t.parentId !== id)
        if (next.length === prevTasks.length) return { ok: false }
        set({ tasks: next })
        return {
          ok: true,
          restore: () => {
            set({ tasks: prevTasks })
            return { ok: true }
          },
        }
      },

      breakIntoSteps: (taskId) => {
        const { tasks, currentProjectId } = get()
        const task = tasks.find((t) => t.id === taskId)
        if (!task) return
        const short =
          task.title.slice(0, 40) + (task.title.length > 40 ? '...' : '')
        const steps = [
          `Name the one feeling "${short}" must land (1 sentence)`,
          `Gather 3–5 refs that match that feeling (mood board)`,
          `Do a 15‑min messy first pass on "${short}" — ugly OK`,
        ]
        const newItems = steps.map((title, i) => ({
          id: Date.now() + i + 1,
          title,
          energy: 'low',
          meta: `Micro-step · from task`,
          completed: false,
          seeded: false,
          projectId: task.projectId ?? currentProjectId,
          parentId: taskId,
        }))
        // Parent moves to completed so micro-steps become the work queue
        const rest = tasks
          .filter((t) => t.id !== taskId)
          .map((t) => t)
        const parentDone = {
          ...task,
          completed: true,
          meta: 'Replaced by micro-steps',
        }
        set({
          tasks: [...newItems, ...rest.filter((t) => !t.completed), parentDone, ...rest.filter((t) => t.completed)],
        })
      },

      /** Add a batch of micro-steps for the active project (ADHD project breakdown) */
      addMicroStepsBatch: ({ steps, energy = 'low', goalLabel = '' }) => {
        const { currentProjectId, tasks, prefs } = get()
        const stamp = Date.now()
        const newItems = (steps || [])
          .map((title) => String(title || '').trim())
          .filter(Boolean)
          .map((title, i) => ({
            id: stamp + i + 1,
            title,
            energy,
            meta: goalLabel
              ? `Micro-step · ${goalLabel.slice(0, 32)}`
              : 'Micro-step · project breakdown',
            completed: false,
            seeded: false,
            projectId: currentProjectId,
            parentId: null,
            fromBreakdown: true,
          }))
        if (!newItems.length) return 0
        set({
          tasks: [...newItems, ...tasks],
          prefs: {
            ...prefs,
            queueCollapsed: true,
          },
        })
        return newItems.length
      },

      addMoodPin: (pin) =>
        set((state) => {
          const projectId = pin.projectId ?? state.currentProjectId
          const starred = (state.moodItems || []).filter(
            (m) =>
              m.inPack && (m.projectId == null || m.projectId === projectId)
          )
          const inPack = !!pin.inPack
          const shift = pin.boardOrder == null
          const newPin = {
            ...pin,
            id: pin.id || Date.now(),
            projectId,
            note: pin.note || '',
            inPack,
            boardOrder: pin.boardOrder != null ? pin.boardOrder : 0,
            packOrder:
              pin.packOrder != null
                ? pin.packOrder
                : inPack
                  ? starred.length
                  : 0,
            packHero: !!pin.packHero,
          }
          return {
            moodItems: [
              newPin,
              ...state.moodItems.map((m) => {
                if (!shift) return m
                if (m.projectId != null && m.projectId !== projectId) return m
                return { ...m, boardOrder: (m.boardOrder ?? 0) + 1 }
              }),
            ],
          }
        }),

      updateMoodPinNote: (id, note) =>
        set((state) => ({
          moodItems: state.moodItems.map((m) =>
            m.id === id ? { ...m, note } : m
          ),
        })),

      /** Color (and similar) pin body — hex / visual string on the pin. */
      updateMoodPinVisual: (id, visual) =>
        set((state) => ({
          moodItems: state.moodItems.map((m) =>
            m.id === id ? { ...m, visual: String(visual || '') } : m
          ),
        })),

      /** Reposition which part of an image pin shows through the cropped
       * tile/pack thumbnails (0-100 percentages, CSS background-position). */
      setMoodPinFocal: (id, focalX, focalY) =>
        set((state) => ({
          moodItems: state.moodItems.map((m) =>
            m.id === id ? { ...m, focalX, focalY } : m
          ),
        })),

      /**
       * Canvas geometry for one pin: position, size and stacking order.
       *
       * Additive and optional — a pin with no `x`/`y` has simply never been
       * moved, and the canvas auto-places it from `boardOrder`. That is what
       * makes this safe to add to boards that already exist, and it is also
       * the rule that keeps the canvas decision-free: arriving pins land
       * somewhere sensible, so arranging is something you may do, never
       * something you must do before you can work.
       *
       * @param {object} patch - any of { x, y, w, h, z }
       */
      setMoodPinLayout: (id, patch = {}) =>
        set((state) => ({
          moodItems: state.moodItems.map((m) =>
            m.id === id ? { ...m, ...patch } : m
          ),
        })),

      /** Raise a pin above every other pin in its own project. Scoped per
       *  project so one busy board cannot inflate z for the others. */
      bringMoodPinToFront: (id) =>
        set((state) => {
          const pin = (state.moodItems || []).find((m) => m.id === id)
          if (!pin) return {}
          const projectId = pin.projectId ?? state.currentProjectId
          const top = (state.moodItems || []).reduce((max, m) => {
            const same = m.projectId == null || m.projectId === projectId
            return same ? Math.max(max, m.z ?? 0) : max
          }, 0)
          if ((pin.z ?? 0) === top && top > 0) return {}
          return {
            moodItems: state.moodItems.map((m) =>
              m.id === id ? { ...m, z: top + 1 } : m
            ),
          }
        }),

      /** Drop a pin behind every other pin in its project. Uses a floor of 0
       *  rather than negative z so nothing can slip behind the canvas itself. */
      sendMoodPinToBack: (id) =>
        set((state) => {
          const pin = (state.moodItems || []).find((m) => m.id === id)
          if (!pin) return {}
          const projectId = pin.projectId ?? state.currentProjectId
          const scoped = (state.moodItems || []).filter(
            (m) => m.projectId == null || m.projectId === projectId
          )
          const bottom = scoped.reduce((min, m) => Math.min(min, m.z ?? 0), 0)
          return {
            moodItems: state.moodItems.map((m) => {
              if (m.id === id) return { ...m, z: bottom }
              const same = m.projectId == null || m.projectId === projectId
              return same ? { ...m, z: (m.z ?? 0) + 1 } : m
            }),
          }
        }),

      /**
       * Star/unstar a pin for the brand pack (max 6 per project).
       * @returns {{ ok: boolean, error?: string, inPack?: boolean }}
       */
      toggleMoodPinInPack: (id) => {
        const state = get()
        const pin = (state.moodItems || []).find((m) => m.id === id)
        if (!pin) return { ok: false, error: 'Pin not found' }
        const projectId = pin.projectId ?? state.currentProjectId
        if (pin.inPack) {
          const remaining = (state.moodItems || [])
            .filter(
              (m) =>
                m.id !== id &&
                m.inPack &&
                (m.projectId == null || m.projectId === projectId)
            )
            .sort((a, b) => (a.packOrder ?? 0) - (b.packOrder ?? 0))
          set({
            moodItems: state.moodItems.map((m) => {
              if (m.id === id) {
                return { ...m, inPack: false, packHero: false, packOrder: 0 }
              }
              const idx = remaining.findIndex((r) => r.id === m.id)
              if (idx >= 0) return { ...m, packOrder: idx }
              return m
            }),
          })
          return { ok: true, inPack: false }
        }
        const starred = (state.moodItems || []).filter(
          (m) =>
            m.inPack &&
            (m.projectId == null || m.projectId === projectId)
        )
        if (starred.length >= 6) {
          return { ok: false, error: 'Client shortlist is full (6 max)' }
        }
        set({
          moodItems: state.moodItems.map((m) =>
            m.id === id
              ? {
                  ...m,
                  inPack: true,
                  packOrder: starred.length,
                  packHero: starred.length === 0,
                }
              : m
          ),
        })
        return { ok: true, inPack: true }
      },

      /** Reorder starred pack pins; orderedIds = full starred list in new order */
      reorderPackPins: (orderedIds) => {
        const ids = (orderedIds || []).map(String)
        set((state) => {
          const heroId = (state.moodItems || []).find((m) => m.packHero)?.id
          return {
            moodItems: state.moodItems.map((m) => {
              const idx = ids.indexOf(String(m.id))
              if (idx < 0) return m
              return {
                ...m,
                inPack: true,
                packOrder: idx,
                // keep hero if still in list; else first becomes hero
                packHero: heroId
                  ? m.id === heroId
                  : idx === 0,
              }
            }),
          }
        })
        return { ok: true }
      },

      setPackHeroPin: (id) => {
        const state = get()
        const pin = (state.moodItems || []).find((m) => m.id === id)
        if (!pin?.inPack) return { ok: false, error: 'Add pin to pack first' }
        set({
          moodItems: state.moodItems.map((m) => ({
            ...m,
            packHero: m.id === id,
          })),
        })
        return { ok: true }
      },

      /**
       * Reorder all mood pins for a project (board grid order).
       * orderedIds = full list of pin ids in new visual order (project pins only).
       */
      reorderBoardPins: (orderedIds, projectId) => {
        const ids = (orderedIds || []).map(String)
        const pid = projectId ?? get().currentProjectId
        set((state) => {
          const mine = (state.moodItems || []).filter(
            (m) => m.projectId == null || m.projectId === pid
          )
          const others = (state.moodItems || []).filter(
            (m) => m.projectId != null && m.projectId !== pid
          )
          // Preserve any pin not in orderedIds at end
          const ordered = ids
            .map((id) => mine.find((m) => String(m.id) === id))
            .filter(Boolean)
          const leftover = mine.filter((m) => !ids.includes(String(m.id)))
          const nextMine = [...ordered, ...leftover].map((m, i) => ({
            ...m,
            boardOrder: i,
          }))
          return { moodItems: [...nextMine, ...others] }
        })
        return { ok: true }
      },

      movePackPin: (id, direction) => {
        const state = get()
        const pin = (state.moodItems || []).find((m) => m.id === id)
        if (!pin?.inPack) return { ok: false }
        const projectId = pin.projectId ?? state.currentProjectId
        const starred = (state.moodItems || [])
          .filter(
            (m) =>
              m.inPack && (m.projectId == null || m.projectId === projectId)
          )
          .sort((a, b) => (a.packOrder ?? 0) - (b.packOrder ?? 0))
        const idx = starred.findIndex((m) => m.id === id)
        if (idx < 0) return { ok: false }
        const swapWith = direction === 'up' ? idx - 1 : idx + 1
        if (swapWith < 0 || swapWith >= starred.length) return { ok: false }
        const ids = starred.map((m) => m.id)
        ;[ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]]
        get().reorderPackPins(ids)
        return { ok: true }
      },

      setColorRole: (role, hex) => {
        const key = String(role || '')
        /* Widened for Secondary and the extra accent slots. Read from
           color.js rather than re-typed, because a second copy of this list is
           exactly how a role becomes assignable in the UI and silently
           rejected by the store. */
        if (!BRAND_ROLE_KEYS.includes(key)) {
          return { ok: false, error: 'Unknown role' }
        }
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              colorRoles: {
                ...(p.colorRoles || {}),
                [key]: hex,
              },
              ...identityEdit(),
            }
          }),
        }))
        return { ok: true }
      },

      /**
       * @param {string} dataUrl
       * @param {string|number} [projectId] the project this image belongs to
       *
       * Takes an explicit project for the same reason setProjectPalette does.
       * Both callers read the file and downscale it before writing, and on a
       * large image that gap is long enough to switch projects in — after
       * which this wrote the mark to whatever was current when the promise
       * resolved, not the project the file was chosen for. No error, no toast:
       * the wrong project quietly gains someone else's logo and the right one
       * looks like the upload never happened.
       */
      setLogoImage: (dataUrl, projectId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === (projectId ?? state.currentProjectId)
              ? { ...p, logoImage: dataUrl || '', ...identityEdit() }
              : p
          ),
        })),

      /**
       * Record an artifact snapshot and hand back a reference to it.
       *
       * Idempotent by construction: the id comes from the content, so calling
       * this twice with the same palette writes once and returns the same ref.
       * Callers store the REF, never the record — that is the whole point.
       *
       * @param {{id: string, kind: string}} snapshot from `artifactSnapshot.js`
       * @returns {{kind: string, id: string}|null}
       */
      putArtifact: (snapshot, projectId) => {
        if (!snapshot?.id || !isArtifactKind(snapshot.kind)) return null
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          return {
            projects: state.projects.map((p) => {
              if (p.id !== owner) return p
              const bag = p.artifacts || {}
              /* Same id means same content. Rewriting it would churn the
                 persisted blob for no change. */
              if (bag[snapshot.id]) return p
              return { ...p, artifacts: { ...bag, [snapshot.id]: snapshot } }
            }),
          }
        })
        return makeRef(snapshot.kind, snapshot.id)
      },

      /* ── Visual Discovery ─────────────────────────────────────────────
         Show two things, record which was preferred. The choice stores
         REFERENCES to both samples — never the letterforms or the hex — so
         the log stays a few bytes per comparison and a sample can only ever
         mean one thing. */
      recordDiscoveryChoice: ({ category, shown, chose }, projectId) =>
        set((state) => {
          const pair = (Array.isArray(shown) ? shown : []).map(String)
          const picked = String(chose || '')
          /* Choosing something that was not on screen is not a preference. */
          if (pair.length !== 2 || !pair.includes(picked)) return state
          const owner = projectId ?? state.currentProjectId
          return {
            projects: state.projects.map((p) => {
              if (p.id !== owner) return p
              const vd = p.visualDiscovery || { choices: [], verdict: null }
              const prev = vd.choices || []
              const entry = {
                id: `vd_${prev.length}_${picked}`,
                category: String(category || ''),
                shown: pair,
                chose: picked,
                at: new Date().toISOString(),
              }
              return {
                ...p,
                visualDiscovery: {
                  ...vd,
                  choices: [...prev, entry],
                  /* A new choice invalidates an agreement about the old set —
                     the observation it was agreeing with has moved. */
                  verdict: null,
                },
              }
            }),
          }
        }),

      /** Agreement or disagreement with the observation. Not a brand decision. */
      setDiscoveryVerdict: (status, projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          const ok = status === 'accepted' || status === 'rejected'
          return {
            projects: state.projects.map((p) =>
              p.id === owner
                ? {
                    ...p,
                    visualDiscovery: {
                      ...(p.visualDiscovery || { choices: [] }),
                      verdict: ok
                        ? { status, at: new Date().toISOString() }
                        : null,
                    },
                  }
                : p
            ),
          }
        }),

      /** Start over. The choices go; nothing else in the project is touched. */
      clearDiscovery: (projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          return {
            projects: state.projects.map((p) =>
              p.id === owner
                ? { ...p, visualDiscovery: { choices: [], verdict: null } }
                : p
            ),
          }
        }),

      /* ── Favorites ────────────────────────────────────────────────────
         `favorite` and `inPack` are two different facts and were one boolean.

         `inPack` has always meant "on the client's shortlist" — capped at six,
         ordered, one hero, and read by the pack export, the artboard's mood
         strip, `stopEstablished`, `completeness` and `brandBrain`. It keeps
         that meaning exactly; 51 call sites depend on it.

         `favorite` is the designer's own "I like this, keep it as evidence for
         later" — unbounded, unordered, never client-facing. It is what Color,
         Type, Mark and Directions consume. Liking something and showing it to
         a client were the same click, so a designer could not keep a reference
         without putting it in front of the client. */
      /**
       * Like something, wherever it came from.
       *
       * A SAMPLE HAS NOWHERE TO KEEP A FLAG. Visual Discovery's stimuli belong
       * to the app, not to a project, so `sample:type:fraunces:700` matched no
       * pin and the heart in that view did nothing at all — the defect the
       * Phase 4 audit found. Rather than give samples a favorites list of
       * their own, favoriting one puts it on the wall as a pin whose id is its
       * reference. One favorite concept, one list, and Directions reads both
       * kinds of evidence through `favoritePins` without knowing the
       * difference.
       *
       * DISPOSAL IS THE CALLER'S CALL, not the pin's. In Visual Discovery the
       * heart both created the card and is the only way back to it, so
       * pressing it twice has to leave the wall as it found it — that is
       * `dispose: true`. On the Research wall the card is right there in front
       * of the designer and its heart must behave like every other heart on
       * that wall: turn off, and leave the card. One control, one meaning, per
       * surface. Deleting a card someone had arranged, from a button that says
       * "Remove favorite", is a destructive act reported as a smaller one.
       *
       * @param {string|number} id
       * @param {boolean} [on]  undefined toggles
       * @param {{projectId?: string, dispose?: boolean}} [opts]
       */
      toggleFavorite: (id, on, opts = {}) =>
        set((state) => {
          const { projectId, dispose = false } = opts || {}
          const key = String(id)
          const existing = state.moodItems.find((m) => String(m.id) === key)

          if (!existing) {
            /* Only a real sample may conjure a pin. An unknown id is a bug
               upstream, and inventing a card for it would put a reference to
               nothing on the research wall. */
            const sample = sampleById(key.replace(/^sample:/, ''))
            if (!sample || samplePinId(sample.id) !== key || on === false)
              return state
            const owner = projectId ?? state.currentProjectId
            return {
              moodItems: [
                { ...pinFromSample(sample), projectId: owner, boardOrder: 0 },
                ...state.moodItems.map((m) =>
                  m.projectId != null && m.projectId !== owner
                    ? m
                    : { ...m, boardOrder: (m.boardOrder ?? 0) + 1 }
                ),
              ],
            }
          }

          const next = on == null ? !existing.favorite : !!on
          if (
            !next &&
            dispose &&
            samplePinIsDisposable(
              existing,
              sampleById(key.replace(/^sample:/, ''))
            )
          ) {
            return {
              moodItems: state.moodItems.filter((m) => String(m.id) !== key),
            }
          }
          return {
            moodItems: state.moodItems.map((m) =>
              String(m.id) === key ? { ...m, favorite: next } : m
            ),
          }
        }),

      /* ── Logo concepts ────────────────────────────────────────────────
         Somewhere to put the two or three marks you actually made.
         The app had exactly ONE mark slot, so the losing concepts lived in a
         folder outside it and "which one did they approve" was re-derived
         from memory or a scroll back through email.

         THE CHOSEN CONCEPT IS COPIED INTO `logoImage`, and nothing
         downstream changes. The pack snapshot, the brand book, the portal,
         the touchpoint mocks and the stationery all keep reading the single
         field they already read. `logoConcepts` is workspace state and must
         never reach a client surface — `packageFiles`/`buildBrandPackSnapshot`
         do not know it exists, and `clientFacingLeak.test.js` keeps it that
         way. */
      addLogoConcept: (dataUrl, projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          return {
            projects: state.projects.map((p) => {
              if (p.id !== owner) return p
              const list = Array.isArray(p.logoConcepts) ? p.logoConcepts : []
              /* The first concept added is chosen automatically. A designer
                 with one mark should never have to also press a star to say
                 "yes, that one" — the app can see it is the only candidate.
                 Adding a second does NOT move the star. */
              const first = list.length === 0
              /* A project that wrote a direction before concepts existed has
                 that sentence in `logoDirection` and nowhere the designer can
                 see it. Adopt it into the first concept rather than leaving it
                 behind the mirror: once it lives on a concept the mirror can be
                 exact, and the text is visible and editable instead of being a
                 value only the brand book knew about. */
              const inherited = first ? String(p.logoDirection || '').trim() : ''
              const next = [
                ...list,
                {
                  id,
                  image: dataUrl || '',
                  label: '',
                  why: inherited,
                  chosen: first,
                },
              ]
              return {
                ...p,
                logoConcepts: next,
                ...(first ? { logoImage: dataUrl || '' } : null),
                ...identityEdit(),
              }
            }),
          }
        }),

      chooseLogoConcept: (conceptId, projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          return {
            projects: state.projects.map((p) => {
              if (p.id !== owner) return p
              const list = Array.isArray(p.logoConcepts) ? p.logoConcepts : []
              const hit = list.find((c) => c.id === conceptId)
              if (!hit) return p
              return {
                ...p,
                logoConcepts: list.map((c) => ({
                  ...c,
                  chosen: c.id === conceptId,
                })),
                /* The star IS the routing. No separate "use this one" step,
                   and no `logoClientChose` text box to keep in step with it. */
                logoImage: hit.image || '',
                /* Its reasoning comes with it, so the book's Logo page
                   describes the mark that actually shipped.

                   UNCONDITIONALLY, including when the new choice has no why.
                   The old guard skipped empty ones to protect a direction
                   written before concepts existed, and the cost was worse than
                   the thing it protected: star A, write "survives a 12mm
                   stamp", star B, and B shipped carrying A's sentence. Pre-
                   concept text is now adopted by the first concept in
                   `addLogoConcept`, so there is nothing left for the guard to
                   save and the mirror can simply be true. */
                logoDirection: hit.why || '',
                ...identityEdit(),
              }
            }),
          }
        }),

      /** Whole-list write. Exists for undo: restoring one removed concept
       *  means restoring the list AND the chosen flag exactly as they were,
       *  which no per-concept action can express. */
      setLogoConcepts: (list, projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          const next = Array.isArray(list) ? list : []
          /* The mirror is re-derived here too, so the invariant holds after
             every write to the list and not only after the per-concept
             actions. Undoing a removal restores the starred concept; without
             this the brand book would keep printing the rationale of whichever
             concept had been promoted in its place. */
          const chosen = next.find((c) => c?.chosen)
          return {
            projects: state.projects.map((p) =>
              p.id === owner
                ? {
                    ...p,
                    logoConcepts: next,
                    logoDirection: chosen?.why || '',
                  }
                : p
            ),
          }
        }),

      updateLogoConcept: (conceptId, patch, projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          return {
            projects: state.projects.map((p) => {
              if (p.id !== owner) return p
              const list = Array.isArray(p.logoConcepts) ? p.logoConcepts : []
              const target = list.find((c) => c.id === conceptId)
              /* The chosen concept's reasoning IS `logoDirection` — the field
                 the brand book's Logo page prints and `bookFieldsReach.test.js`
                 guards. Keeping them as two boxes is what made "How the mark
                 behaves" a form that could not tell you which concept it
                 described. */
              const mirrorsDirection =
                target?.chosen && Object.hasOwn(patch || {}, 'why')
              return {
                ...p,
                logoConcepts: list.map((c) =>
                  c.id === conceptId ? { ...c, ...patch } : c
                ),
                ...(mirrorsDirection ? { logoDirection: patch.why } : null),
                ...identityEdit(),
              }
            }),
          }
        }),

      removeLogoConcept: (conceptId, projectId) =>
        set((state) => {
          const owner = projectId ?? state.currentProjectId
          return {
            projects: state.projects.map((p) => {
              if (p.id !== owner) return p
              const list = Array.isArray(p.logoConcepts) ? p.logoConcepts : []
              const next = list.filter((c) => c.id !== conceptId)
              const removedChosen = list.some(
                (c) => c.id === conceptId && c.chosen
              )
              if (!removedChosen) return { ...p, logoConcepts: next, ...identityEdit() }
              /* Removing the chosen one must not leave `logoImage` pointing at
                 an image with no concept behind it — the deliverable would
                 keep shipping a mark the workspace no longer shows. Promote
                 the first survivor, or clear. */
              const promoted = next[0] || null
              return {
                ...p,
                logoConcepts: next.map((c, i) => ({ ...c, chosen: i === 0 })),
                logoImage: promoted?.image || '',
                /* The promoted concept brings its own reasoning, for the same
                   reason `chooseLogoConcept` does. Leaving the mirror alone
                   here would hand the deleted concept's rationale to whichever
                   mark inherited the star. */
                logoDirection: promoted?.why || '',
                ...identityEdit(),
              }
            }),
          }
        }),

      removeMoodPin: (id) =>
        set((state) => ({
          moodItems: state.moodItems.filter((m) => m.id !== id),
        })),

      setMoodItems: (moodItems) => set({ moodItems }),

      nextSpark: () =>
        set((state) => {
          const next = (state.sparkIndex + 1) % sparkPrompts.length
          return {
            sparkIndex: next,
            sparksTried: (state.sparksTried || 0) + 1,
            currentSpark: sparkPrompts[next],
          }
        }),

      /**
       * Ideate: opposite-direction prompt. Separate oppositeIndex wrap;
       * does not pollute sparkIndex. sparksTried bumps for energy UI only.
       */
      oppositeSpark: () =>
        set((state) => {
          const oi = ((state.oppositeIndex ?? 0) + 1) % oppositeSparks.length
          return {
            oppositeIndex: oi,
            sparksTried: (state.sparksTried || 0) + 1,
            currentSpark: oppositeSparks[oi],
          }
        }),

      createNewProject: (name = 'My project', brief = '') => {
        const project = createBlankProject(
          name || 'My project',
          brief || ''
        )
        get().addProject(project)
        return project
      },

      /* New-project intake: create a project with the three quick answers
         seeded into Chapter 01 of the brief. Only the client name is
         load-bearing (it's the project's identity and what keeps the list
         navigable); engagementType defaults to 'new', and an empty
         deliverablesPicked deliberately stays [] — that is full brand-package
         scope in progressItemInScope, so blank means "everything", not
         "nothing". Reviewed by adhd-executive-function-advisor: this must never
         block starting, so every field here is optional at the store level. */
      /* Desk: mark a journey stop "not needed" for THIS project, reversibly.
         Not a permanent skip (an irreversible action bills an "am I sure?"
         at the moment the desk exists to remove a decision) and not a
         hide-once (a row that returns tomorrow re-bills the same decision
         forever — the "prompt whose answer is always the same" failure).
         The row moves to the finished area labelled "Not needed" and one
         click puts it back. No new field on old projects: absent reads as
         an empty list. */
      /* Project type — what are we building? Sets which stages are on by
         default; the designer can still switch any of them. Absent means a
         full identity, which is what every project made before types
         existed already was, so nothing migrates. */
      /* Changing type is ADDITIVE, never a reset.
         This replaced stepsOn wholesale, so correcting a mis-derived type
         silently wiped every stage the designer had toggled — punishing the
         designer for the derivation being wrong, which is the one moment
         this action exists for (devil's advocate, 2026-08-05). It now unions
         like expandProject: changing type can only ever turn stages ON.
         Turning one off is a separate, deliberate, reversible act. */
      /* Strategy attributes: the designer's own words, each placed on the
         five rulers. Lives on the project document so it works offline and
         rides the existing sync; the Supabase tables are provisioned for the
         structured lift and are not written yet. */
      setStrategyAttributes: (projectId, attributes) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, strategyAttributes: attributes }
              : p
          ),
        })),

      /**
       * Place the client's positioning answers on the rulers, once.
       *
       * MATERIALISED, NOT DERIVED AT READ TIME, and that is the whole design.
       * A read-time merge would fight the designer: adjust a seeded word and
       * the derivation overwrites it; delete one and it returns on the next
       * render. Writing real attributes hands them over — from that moment
       * they are the designer's words to edit, remove or ignore, with no
       * tombstones and no second source of truth.
       *
       * Runs only when `strategyAttributes` has NEVER been set. An empty
       * array is a decision ("I cleared these"); `undefined` is the absence
       * of one. Distinguishing them is what stops a cleared list refilling
       * itself, without needing a `seeded` flag on every project.
       */
      seedStrategyAttributes: (projectId) => {
        const state = get()
        const p = state.projects.find((x) => x.id === projectId)
        if (!p) return { ok: false, seeded: 0 }
        if (Array.isArray(p.strategyAttributes)) return { ok: true, seeded: 0 }
        const seeded = attributesFromBrief(p.detective, SPECTRUM_FIELDS)
        if (!seeded.length) return { ok: true, seeded: 0 }
        set({
          projects: state.projects.map((x) =>
            x.id === projectId ? { ...x, strategyAttributes: seeded } : x
          ),
        })
        return { ok: true, seeded: seeded.length }
      },

      /* A tagged candidate — today only the chosen typeface. Keyed by a
         stable slot name rather than an array, because there is exactly one
         "the typeface for this project" and a list would invite a second. */
      setBrandTokenTags: (projectId, slot, tags) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, brandTokenTags: { ...(p.brandTokenTags || {}), [slot]: tags } }
              : p
          ),
        })),

      setProjectType: (projectId, typeId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, ...expandProject(p, typeId) } : p
          ),
        })),

      /* Switch one stage on or off for this project. Never deletes what is
         inside the stage — a stage is a view onto the project document, so
         this is reversible and needs no confirmation. */
      toggleProjectStep: (projectId, stepId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, stepsOn: toggleStep(p, stepId) } : p
          ),
        })),

      /* `toggleStepNotNeeded` and `stepsNotNeeded` were deleted on
         2026-08-08. The field was read by exactly one file — DeskView — and
         its only job was pruning the rail's "upcoming stops" leftovers list.
         That list is gone (replaced by the five workspace cards, which always
         show all five), so the concept had nothing left to prune: it was an
         acknowledgement invented to maintain a to-do the Desk should not have
         kept. No migration — an unread key on an old project costs nothing,
         and deleting persisted data to tidy a removed feature is the one
         irreversible move here.

         `pathDone` / `setStepDone` deliberately survive: they feed
         `pathStepHasContent` → `pathFirstGap`, i.e. which stop the app
         suggests next. That is real project state, not dashboard scaffolding.
      */

      createProjectFromIntake: (intake = {}) => {
        const clientName = String(intake.clientName || '').trim()
        const detective = {
          ...blankDetective(),
          clientName,
          engagementType: intake.engagementType || 'new',
          deliverablesPicked: Array.isArray(intake.deliverablesPicked)
            ? intake.deliverablesPicked
            : [],
        }
        if (intake.projectDeadline) {
          detective.projectDeadline = intake.projectDeadline
        }
        const project = createBlankProject(clientName || 'My project', '')
        project.detective = detective
        /* BOTH fields, the way setProjectDeadline does it.
           Creation set only detective.projectDeadline, but the brief's date
           input reads activeProject.deadline — a different field — so a
           deadline typed on the New project form vanished the moment the
           brief opened. A cold-start tester entered 19 Feb 2027, pressed
           Start project, and had to type it again. Data the designer
           entered must not disappear between the screen that asked for it
           and the screen that shows it. */
        if (intake.projectDeadline) {
          project.deadline = intake.projectDeadline
        }
        project.brief = composeBriefFromDetective(detective)

        /* Derive the project type ONCE, here, and freeze the stage list with
           it. Never recompute from the brief at read time.
           `deliverablesPicked` is a live brief field the CLIENT can edit
           through the portal — a live derivation would let a client tick a
           checkbox and silently remove stages from the designer's path, a
           state change with no event to attribute it to. Storing stepsOn
           explicitly (not just the type id) also means a later edit to
           PROJECT_TYPES defaults cannot reshape a project already in flight:
           the path you left is the path you come back to.
           (adhd-executive-function-advisor, 2026-08-05.) */
        const typeId = typeFromIntake({
          engagementType: detective.engagementType,
          logoOnly: isLogoOnlyScope(detective.deliverablesPicked),
        })
        project.projectType = typeId
        project.stepsOn = projectTypeSteps(typeId)

        get().addProject(project)
        return project
      },

      // selectors helpers used via get in components
      getActiveProject: () => {
        const { projects, currentProjectId } = get()
        return projects.find((p) => p.id === currentProjectId)
      },

      // Template Management
      saveAsTemplate: (name, description = '') => {
        const state = get()
        const { currentProjectId, projects } = state

        if (!currentProjectId) return { ok: false, error: 'No active project' }

        const project = projects.find(p => p.id === currentProjectId)
        if (!project) return { ok: false, error: 'Project not found' }

        // Create template from current project state
        const template = {
          id: `template-${Date.now()}`,
          name,
          description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Store the essential design elements that make up a template
          data: {
            tagline: project.tagline,
            voice: project.voice,
            typeHeading: project.typeHeading,
            typeBody: project.typeBody,
            logoWordmark: project.logoWordmark,
            logoDirection: project.logoDirection,
            // Omit binary mark from templates (localStorage quota)
            logoImage: '',
            logoClearspace: project.logoClearspace,
            logoMinSize: project.logoMinSize,
            logoDonts: project.logoDonts,
            palette: [...project.palette],
            colorRoles: project.colorRoles ? { ...project.colorRoles } : null,
            messagingPromise: project.messagingPromise,
            messagingProof: project.messagingProof,
            messagingPersonality: project.messagingPersonality,
            imageryStyle: project.imageryStyle,
            imageryDo: project.imageryDo,
            imageryDont: project.imageryDont,
            /* House style travels with the template. A studio that sets
               sentence case and a preferred stock once should not re-set them
               on every project started from this template. */
            writingCase: project.writingCase,
            writingCaps: project.writingCaps,
            writingNotes: project.writingNotes,
            printPantone: project.printPantone,
            printStock: project.printStock,
            printFinish: project.printFinish
            /* A template is a house STYLE, not a project. It deliberately does
               NOT carry `detective` (Chapter 01 IS the client record —
               name, email, phone, contacts), `tasks`, `directions`, or
               `moodItems`. Cloning those means applying a template to a live
               project silently overwrites that client's brief with a
               different client's data, unrecoverably. Style travels; the
               client record never does. See TEMPLATE_STYLE_KEYS below. */
          }
        }

        set(state => ({
          templates: [...state.templates, template]
        }))

        return { ok: true, templateId: template.id }
      },

      getTemplates: () => {
        const state = get()
        return [...state.templates].sort((a, b) =>
          new Date(b.updatedAt) - new Date(a.updatedAt)
        )
      },

      getTemplateById: (templateId) => {
        const state = get()
        return state.templates.find(t => t.id === templateId) || null
      },

      updateTemplate: (templateId, updates) => {
        set(state => ({
          templates: state.templates.map(template =>
            template.id === templateId
              ? { ...template, ...updates, updatedAt: new Date().toISOString() }
              : template
          )
        }))
        return { ok: true }
      },

      deleteTemplate: (templateId) => {
        set(state => ({
          templates: state.templates.filter(t => t.id !== templateId)
        }))
        return { ok: true }
      },

      applyTemplate: async (templateId) => {
        const state = get()
        const template = state.templates.find(t => t.id === templateId)
        if (!template) return { ok: false, error: 'Template not found' }

        const { currentProjectId, projects } = state
        if (!currentProjectId) return { ok: false, error: 'No active project' }

        // Style-only apply. Filter template.data through TEMPLATE_STYLE_KEYS so
        // the client record (detective), tasks, directions and moodItems are
        // never overwritten — including by templates saved before this rule.
        const styleData = {}
        for (const key of TEMPLATE_STYLE_KEYS) {
          if (key in template.data) styleData[key] = template.data[key]
        }

        set(state => ({
          projects: state.projects.map(project =>
            project.id === currentProjectId
              ? {
                  ...project,
                  ...styleData,
                  // Increment version when applying template
                  designVersion: `v${parseInt(project.designVersion.replace('v', '')) + 1}`
                }
              : project
          )
        }))

        // Create a version when applying template
        await versionService.autoVersion('template-applied')

        return { ok: true }
      },
    }),
    {
      name: 'creative-companion-storage',
      /* Wrapped so a full localStorage cannot fail silently. The store
         persists as ONE blob, so a write that throws QuotaExceededError does
         not just lose the pin that overflowed it — the brief, the tasks and
         every project stop saving too, with no error anywhere and no sign
         until a reload shows the work gone. Images are the only realistic way
         to fill it (see MAX_STORED_IMAGE_DIM), so the message names them. */
      storage: {
        getItem: (key) => {
          try {
            const value = localStorage.getItem(key)
            return value ? JSON.parse(value) : null
          } catch {
            return null
          }
        },
        setItem: (key, value) => {
          // Coalesce the per-keystroke storm into one trailing write. The
          // actual stringify + localStorage.setItem (and its quota handling)
          // happen in _writePersistNow, flushed on tab-hide/unload. Issue #6.
          _persistPending = { key, value }
          if (_persistTimer) clearTimeout(_persistTimer)
          _persistTimer = setTimeout(_writePersistNow, PERSIST_DEBOUNCE_MS)
        },
        removeItem: (key) => {
          // Cancel any pending debounced write first, so a stale trailing
          // write can't resurrect data we're clearing.
          _persistPending = null
          if (_persistTimer) {
            clearTimeout(_persistTimer)
            _persistTimer = null
          }
          try {
            localStorage.removeItem(key)
          } catch {
            /* nothing to remove */
          }
        },
      },
      version: 9,
      migrate: (persisted, fromVersion) => {
        // Keep real user data; only normalize missing arrays
        if (!persisted || typeof persisted !== 'object') {
          return blankWorkspaceState()
        }
        const blank = blankWorkspaceState()
        let moodItems = Array.isArray(persisted.moodItems)
          ? persisted.moodItems
          : []
        // v4: ensure boardOrder for stable board drag (old pins lacked it)
        if (fromVersion < 4 && moodItems.length) {
          const byProject = new Map()
          moodItems.forEach((m) => {
            const pid = m.projectId ?? '_none'
            if (!byProject.has(pid)) byProject.set(pid, [])
            byProject.get(pid).push(m)
          })
          const next = []
          byProject.forEach((list) => {
            list.forEach((m, i) => {
              next.push({
                ...m,
                boardOrder: m.boardOrder != null ? m.boardOrder : i,
              })
            })
          })
          moodItems = next
        }
        /* v6: `inPack` was one boolean meaning both "I like this" and "show
           this to the client". A pin already on the shortlist was liked, so it
           becomes a favorite too. Nothing is removed and `inPack` keeps its
           exact meaning — the 51 readers of it are untouched. Idempotent: a
           pin that already carries the flag is left alone. */
        if (fromVersion < 6 && moodItems.length) {
          moodItems = moodItems.map((m) =>
            m && m.favorite === undefined ? { ...m, favorite: !!m.inPack } : m
          )
        }
        return {
          ...blank,
          ...persisted,
          // Deep-merge so prefs added after the workspace was first persisted
          // (helperQuiet, hideTips, toastMode...) keep their intended defaults
          prefs: { ...blank.prefs, ...(persisted.prefs || {}) },
          tasks: Array.isArray(persisted.tasks) ? persisted.tasks : [],
          moodItems,
          breakKit: Array.isArray(persisted.breakKit)
            ? persisted.breakKit
            : [],
          /* v9: additive. A workspace that predates tombstones has deleted
             nothing THAT WE KNOW OF — absent means no record, which is []. It
             does not mean "no deletions ever happened", and nothing here
             pretends otherwise: an empty list simply blocks nothing. */
          deletedProjects: Array.isArray(persisted.deletedProjects)
            ? persisted.deletedProjects
            : [],
          /* Empty is valid here too: a migration may add what an old record
             lacks, it may not decide that "no projects" is damage. */
          projects:
            Array.isArray(persisted.projects)
              ? persisted.projects.map((p) => ({
                  ...p,
                  /* v5: the work clock used to write into `timeLog`, the
                     array the invoice bills from. Lift those measured rows
                     out into the private `workLog` where they belong — an
                     invoice should contain only what was entered by hand. */
                  timeLog: (Array.isArray(p.timeLog) ? p.timeLog : []).filter(
                    (e) => !e?.auto
                  ),
                  workLog: [
                    ...(Array.isArray(p.workLog) ? p.workLog : []),
                    ...(Array.isArray(p.timeLog) ? p.timeLog : []).filter(
                      (e) => e?.auto
                    ),
                  ],
                  decisionLog: Array.isArray(p.decisionLog) ? p.decisionLog : [],
                  /* v6: additive. An older project has no artifacts and no
                     designer-added surfaces; both are empty, never absent, so
                     no reader needs a null branch. */
                  artifacts:
                    p.artifacts && typeof p.artifacts === 'object'
                      ? p.artifacts
                      : {},
                  designerSurfaces: Array.isArray(p.designerSurfaces)
                    ? p.designerSurfaces
                    : [],
                  /* v7: additive. An older project has no discovery log; empty
                     rather than absent, so no reader needs a null branch. */
                  visualDiscovery:
                    p.visualDiscovery && Array.isArray(p.visualDiscovery.choices)
                      ? p.visualDiscovery
                      : { choices: [], verdict: null },
                  /* A migration is one-time compatibility, not a runtime
                     normalizer. It may add what an old record lacks; it may
                     not decide that fewer than three directions is damage. An
                     array of two is a deletion, and this used to replace all
                     three. */
                  directions: (Array.isArray(p.directions)
                    ? p.directions
                    : blankDirections()
                  /* v8: every record that has one gains an empty `refs`. A
                     direction that was only ever a title keeps being only a
                     title, and a slot with no record STAYS empty — the
                     backfill runs over what is there, never over the gaps. */
                  ).map((d) => (d?.refs ? d : { ...d, refs: {} })),
                }))
              : blank.projects,
        }
      },
      partialize: (state) => pickPersisted(state),
      onRehydrateStorage: () => (state) => {
        try {
          if (!state) return
          const onboardFlag = localStorage.getItem('cc-onboarded')
          if (onboardFlag === '1') state.onboarded = true
          if (!state.portalSeen || typeof state.portalSeen !== 'object') state.portalSeen = {}
          if (!Array.isArray(state.tasks)) state.tasks = []
          /* An invoice must never contain a row nobody typed. The v5 migration
             lifts measured rows out of `timeLog`, but a migration runs once —
             it cannot hold an invariant, only establish it. Any auto row that
             appears in `timeLog` afterwards (a stale tab still running the old
             writer, a synced payload from an older client) would sit there
             permanently, billable. So this is checked on every load. */
          /* Applied with setState rather than by assigning to `state`, so it
             both takes effect and is written back to storage. Mutating the
             rehydrated draft leaves the stored copy untouched: the row comes
             back on the next load, and any later write persists it again. */
          queueMicrotask(() => {
            const cur = useAppStore.getState().projects
            if (!Array.isArray(cur)) return
            const next = liftMeasuredRows(cur)
            if (next !== cur) useAppStore.setState({ projects: next })
          })
          if (!Array.isArray(state.moodItems)) state.moodItems = []
          if (!Array.isArray(state.breakKit)) state.breakKit = []
          /* Only a missing list is filled in. A tombstone list that is there
             is never touched on load — a reload is not a restore. */
          if (!Array.isArray(state.deletedProjects)) state.deletedProjects = []
          // Normalize boardOrder for pins that predate board drag
          if (state.moodItems?.length) {
            const byProject = new Map()
            state.moodItems.forEach((m) => {
              const pid = m.projectId ?? '_none'
              if (!byProject.has(pid)) byProject.set(pid, [])
              byProject.get(pid).push(m)
            })
            const next = []
            byProject.forEach((list) => {
              list.forEach((m, i) => {
                next.push({
                  ...m,
                  boardOrder: m.boardOrder != null ? m.boardOrder : i,
                })
              })
            })
            state.moodItems = next
          }
          /* EMPTY IS VALID DATA — the same rule the direction slots follow.
             A zero-length array is a designer who deleted their last project,
             not a malformed workspace, and reseeding it put a blank "My
             project" on the desk they had just cleared. Only an ABSENT or
             non-array value is repaired. */
          if (!Array.isArray(state.projects)) {
            const blank = blankWorkspaceState()
            state.projects = blank.projects
            state.currentProjectId = blank.currentProjectId
          }
          // Legacy bridge from earlier cc-desk shape (real user data only).
          // One-time: never clobber projects the new store already has.
          const legacy = localStorage.getItem('cc-desk')
          if (!legacy) return
          const data = JSON.parse(legacy)
          if (Array.isArray(data.tasks) && data.tasks.length && !state.tasks?.length) {
            state.tasks = data.tasks
          }
          if (Array.isArray(data.moodItems) && data.moodItems.length && !state.moodItems?.length) {
            state.moodItems = data.moodItems
          }
          /* Same question `isStarterProject` answers, asked the same way, so
             the migration and the UI label can never disagree about whether a
             workspace has been touched. */
          const hasRealProjects = (state.projects || []).some(
            (p) => (p.name && !isStarterProject(p)) || String(p.brief || '').trim()
          )
          if (
            Array.isArray(data.projects) &&
            data.projects.length &&
            !hasRealProjects
          ) {
            state.projects = data.projects.map((p) => ({
              logoDirection: '',
              ...brandIdentityDefaults(),
              ...p,
            }))
            if (data.activeProjectId) state.currentProjectId = data.activeProjectId
          }
        } catch {
          /* ignore */
        }
      },
    }
  )
)

export default useAppStore
