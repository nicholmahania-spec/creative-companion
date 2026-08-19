/**
 * Primary path — the stops using brand-identity process language
 * (Wheeler / Logo Design Love), ordered for ADHD: brief first, then research.
 *
 *   Brief → Research → Directions → Identity → Touchpoints → Brand book → Delivery
 *
 * Step ids stay stable for pathStepHasContent + detective history; labels are
 * user-facing. IDS ARE DATA AND LABELS ARE UI — the same rule detectiveBrief.js
 * states at the top, and the reason four of these ids no longer read like their
 * label:
 *
 *   define   → "Brief"        (was "Strategy"; owner, 2026-08-09)
 *   ideate   → "Directions"   (was a Tool called "Ideate")
 *   sketch   → "Touchpoints"
 *   deliver  → "Delivery"     (was "Assets"; owner, 2026-08-09)
 *
 * Renaming an id orphans `pathDone` / `pathReached` verdicts on every saved
 * project, the `decisions.stage` values in `20260805140000`, and the SQL
 * allowlist in `20260728021200`. Do not "fix" an id toward its label.
 *
 * WHY DIRECTIONS AND BRAND BOOK ARE STOPS NOW (owner, 2026-08-09). Both screens
 * already existed and were reachable only from the Tools overlay — the Brand
 * Book Builder from exactly one call site in the whole app. Neither is a new
 * view; this declaration is the whole of their promotion, and `projectTypes.js`
 * decides which projects see them, so a logo job still walks four stops.
 * `projectTypes.js`'s own header asked for exactly this ("the finer stages are
 * the next one").
 *
 * Review stays a Tool. It operates on the client relationship rather than
 * producing a stage artifact, and it has no place in the production sequence.
 */

import { APPROVAL_CAPABLE_STEP_IDS } from '../client/reviewArtifact'

export const JOURNEY_STEPS = [
  {
    id: 'define',
    view: 'project',
    num: '1',
    label: 'Brief',
    process: 'Clarifying strategy',
    plain:
      'Who is this for, and what should the brand do? Client brief — one clear goal is enough to continue.',
    enough: 'Enough: client name, goal, audience, and what you are making.',
    nextView: 'studio',
    nextLabel: 'Go to Research',
  },
  {
    id: 'research',
    view: 'studio',
    num: '2',
    label: 'Research',
    process: 'Conducting research',
    plain:
      'Gather refs and notes. Star up to 6 for the export shortlist — a shortlist is not a design direction.',
    enough: 'Enough for the path: a few pins, or starred pins that each say why.',
    nextView: 'spark',
    nextLabel: 'Go to Directions',
  },
  {
    /* Was the Tools view `spark`, labelled "Ideate". The id is unchanged
       because it is already stored: `pathDone.ideate` on saved projects,
       `runningTodoStages`, `processGuide`, `journeyProgress`'s condition, and
       the SQL allowlist in 20260728021200 all key off it. Only the label and
       its position in this list are new. */
    id: 'ideate',
    view: 'spark',
    num: '3',
    label: 'Directions',
    process: 'Exploring directions',
    plain:
      'Name two or three routes. Rough list first, then the ones worth drawing.',
    enough: 'Enough: one titled route. Three is the point, one is a start.',
    nextView: 'brand',
    nextLabel: 'Go to Identity',
  },
  {
    id: 'design',
    view: 'brand',
    num: '4',
    label: 'Identity',
    process: 'Designing identity',
    plain:
      'Mark, words, color, type — then preview. One screen at a time.',
    enough:
      'Enough for the path: a mark or wordmark, plus words or colour. Not a finished identity system by itself.',
    nextView: 'flow',
    nextLabel: 'Go to Touchpoints',
  },
  {
    id: 'sketch',
    view: 'flow',
    num: '5',
    label: 'Touchpoints',
    process: 'Creating touchpoints',
    plain:
      'Where the brand shows up — schematic mocks and optional evidence, not finished artwork.',
    enough:
      'Enough for the path: evidence on one surface (note, mock accepted, or colour sample). Not finished applications.',
    nextView: 'book',
    nextLabel: 'Go to Brand book',
  },
  {
    /* The Brand Book Builder, which had one entry point in the entire app
       (the Tools overlay) while Assets exported its PDF without ever offering
       the screen that shapes it. New id, and the only one here that is new —
       nothing had ever stored a `book` step, so nothing is orphaned by it.

       IT IS DELIBERATELY NOT PUSHABLE TO A CLIENT YET. `book` is absent from
       the SQL allowlist in 20260728021200, so `respond_client_portal_step`
       would reject an approval on it and the client would be told their link
       is invalid. Adding it there is a migration, and this phase makes none —
       see PORTAL_PUSHABLE_STEP_IDS below, which is what the portal reads. */
    id: 'book',
    view: 'book',
    num: '6',
    label: 'Brand book',
    process: 'Documenting the system',
    plain: 'Lay out the book from what the project already holds — including schematic application proofs.',
    enough:
      'Enough for the path: open the builder. That is not the same as a finished client book.',
    nextView: 'finish',
    nextLabel: 'Go to Delivery',
  },
  {
    id: 'deliver',
    view: 'finish',
    num: '7',
    label: 'Delivery',
    process: 'Delivering the brand',
    plain: 'Preview the pack, write a handoff note, download. A note is not delivery.',
    enough:
      'Enough for the path: a handoff or learnings note. Not “handed off” or “delivered”.',
    nextView: null,
    nextLabel: null,
  },
]

/**
 * The stops a studio may push to a client for approval.
 *
 * NOT simply "every stop", and the difference is load-bearing in two ways.
 *
 * 1. THE DATABASE. `respond_client_portal_step` validates the incoming step
 *    against a hardcoded list (`20260728021200_harden_portal_rpcs.sql`). A stop
 *    the path declares but the RPC rejects means the client clicks Approve and
 *    is told "This link isn't valid" — a failure that points nowhere near its
 *    cause. `book` is not on that list, and adding it is a migration.
 *
 * 2. THE PRODUCT RULE. Approval attaches to a showable artifact, never to a
 *    bare stage name (DESIGN_GRAMMAR G10.5). The portal today renders a label
 *    and two buttons with nothing to look at; promoting two more stops into
 *    that would have doubled down on the defect rather than routing around it.
 *    Directions and Brand book earn their place here when the portal can show
 *    the composition and the book — which is the next phase's work, not this
 *    one's.
 *
 * Derived from the ids rather than written out, so a stop removed from the
 * path cannot linger here.
 */
/* R4, owner decision 2026-08-12: a stop may be pushed to a client only when
   the portal can SHOW its artifact. `APPROVAL_UNITS` in
   `lib/client/reviewArtifact.js` is where that list is decided and argued —
   this set is its complement, so the two cannot drift.

   The reduction is deliberate and is the fix, not a regression. Five stops
   used to be pushable with nothing behind them but their own label:

     research  private working space, by explicit product statement
     sketch    its only real artifacts are packageAssets, which are private
     review    a Tool, whose subject is the identity approved under `design`
     deliver   delivery_pack stays gated on delivery_status='delivered'
     define    the brief is the client's OWN work; `form_status` already
               records that they submitted it

   Restoring one means building its artifact first. That is the point. */
const NOT_PUSHABLE = new Set(
  JOURNEY_STEPS.map((s) => s.id).filter((id) => !APPROVAL_CAPABLE_STEP_IDS.includes(id))
)
export const PORTAL_PUSHABLE_STEP_IDS = Object.freeze(
  JOURNEY_STEPS.map((s) => s.id).filter((id) => !NOT_PUSHABLE.has(id))
)

/** The steps a studio may push, in path order. */
export function portalPushableSteps() {
  return JOURNEY_STEPS.filter((s) => PORTAL_PUSHABLE_STEP_IDS.includes(s.id))
}

/** One-line job + enough for path page status (never restate labels elsewhere). */
export function pathJobLines(stepId) {
  const s = JOURNEY_STEPS.find((x) => x.id === stepId)
  if (!s) return { plain: '', enough: '' }
  return { plain: s.plain || '', enough: s.enough || '' }
}

/** Path view ids only (for work clock, keyboard 1–5, etc.) */
export const PATH_VIEWS = JOURNEY_STEPS.map((s) => s.view)

/**
 * Map a path view to its journey step id. Tools return null.
 *
 * Derived from JOURNEY_STEPS rather than a switch listing the same pairs
 * again. The switch that used to live here was a second copy of the
 * view/id mapping declared above, and copies of a declared list are the
 * dominant defect in this codebase — they fail on correct changes (a
 * reorder) and stay silent on wrong ones (a stop that never got added).
 */
const VIEW_TO_ID = Object.fromEntries(JOURNEY_STEPS.map((s) => [s.view, s.id]))

export function journeyIdForView(view) {
  return VIEW_TO_ID[view] ?? null
}

/** Label for off-path Tools pages */
export function toolsLabelForView(view) {
  switch (view) {
    case 'home':
      return 'Home'
    /* `spark` and `book` are path stops now — labelForView finds them in
       JOURNEY_STEPS before it ever reaches here, so cases for them would be
       unreachable copies of a label declared above. */
    case 'review':
      return 'Review'
    case 'presentation':
      return 'Presentation'
    case 'insights':
      return 'Timer'
    case 'calendar':
      return 'Calendar'
    case 'clients':
      return 'Clients'
    case 'assets':
      /* "Library", not "Asset library".
         Path stop 5 is labelled **Assets** (view `finish`), and this Tool is
         view `assets` — so the nav carried two entries a word apart while
         their view ids were the exact opposite way round. A designer reading
         "Assets" in the rail and "Asset library" in the Tools menu has no way
         to know which one holds the file they are looking for. The stop's
         label is settled (DESIGN_GRAMMAR G1) and client-facing, so the Tool
         is the one that moves. It shares no word with the stop now. */
      return 'Library'
    case 'settings':
      return 'Settings'
    case 'concept':
      return 'Sketches (frozen)'
    default:
      return 'Tools'
  }
}

/**
 * Views that live under Tools (not Studio destinations / path / desk).
 * The sidebar "Tools · …" pill must only show here — never "Tools · Home".
 */
export const TOOLS_MENU_VIEWS = [
  'review',
  'presentation',
  'insights',
  /* A Tool, deliberately not a path stop. Every stop carries a completion
     tick, and a library is never finished — a tick on it would be a permanent
     open loop in the one place a designer stores finished work. It is also a
     reference surface entered with a question rather than a stage you pass
     through, and it is the mid-project return point, so it must be reachable
     from anywhere rather than sitting at the end.

     It is no longer in the Tools *menu* either: Library is cross-project, like
     Home and Clients, so it sits in the sidebar's Studio band beside them. It
     stays in this list because this list answers "is this view off-path",
     which it still is — the sidebar pill and the return-to-path chrome both
     read it. */
  'assets',
  'concept',
]

export function isToolsMenuView(view) {
  return TOOLS_MENU_VIEWS.includes(view)
}

/**
 * Accessible name for the shell `.step-rail`.
 *
 * On the Desk and on a production stop the rail reports where you are, so it
 * keeps "Process position". Library, Timer and Review are off-path: the same
 * rail is still the map of stops, but there is no active process step, so
 * that name would be a lie. "Path stops" uses the two settled words for the
 * list without claiming current position. Not "Go to a stop": the sidebar
 * already owns "Go to" for studio destinations.
 */
export function stepRailAriaLabel(view) {
  return isToolsMenuView(view) ? 'Path stops' : 'Process position'
}

export function getJourneyStep(view) {
  const id = journeyIdForView(view)
  return JOURNEY_STEPS.find((s) => s.id === id) || null
}

export function getNextJourney(view) {
  const step = getJourneyStep(view)
  if (!step?.nextView) return null
  return JOURNEY_STEPS.find((s) => s.view === step.nextView) || null
}

/**
 * The stop before this view on the path, or null on the first stop and on
 * Tools views. Derived from array order, not a `prevView` field — a second
 * hand-written chain would be one more copy to forget when a stop moves.
 * Used by the header's back affordance.
 */
export function getPrevJourney(view) {
  const idx = JOURNEY_STEPS.findIndex((s) => s.view === view)
  if (idx <= 0) return null
  return JOURNEY_STEPS[idx - 1]
}

/**
 * How many stops the path has.
 *
 * Exported so nothing has to restate it. The completion gates and the "N/M"
 * readouts each hard-coded 7 — the count from before Ideate and Review moved
 * under Tools — while the rows they counted came from JOURNEY_STEPS, which
 * has five. `doneCount` could therefore never reach the threshold: a fully
 * finished project reported 5/7, "Path full" and "Ready" were unreachable
 * states, and the app could only ever tell you what was still missing.
 */
export const PATH_STEP_COUNT = JOURNEY_STEPS.length

/**
 * The label to show for any view — path stop or Tools page.
 *
 * This is the single place a view becomes a word. Six separate modules
 * (the Helper status line, the resume banner, the to-do stage headings,
 * the client inbox, the badge list, the work log) each kept their own
 * copy of this mapping, and the v1.53.6 rename updated exactly one of
 * them. Everything else went on saying Sketch, Design, Deliver and
 * Project overview — names the app no longer uses anywhere else.
 */
export function labelForView(view) {
  const step = JOURNEY_STEPS.find((s) => s.view === view)
  if (step) return step.label
  return toolsLabelForView(view)
}

/**
 * The label for a journey step id (`design` -> `Identity`), falling back to
 * the id itself so an unknown or off-path id degrades to something readable
 * rather than to a specific stop's name.
 */
export function labelForStepId(id) {
  const step = JOURNEY_STEPS.find((s) => s.id === id)
  if (step) return step.label
  /* `ideate` is a path stop now, so the lookup above resolves it and an entry
     here would be an unreachable second name for it. */
  const TOOL_IDS = { review: 'Review' }
  return TOOL_IDS[id] || id || 'Work'
}
