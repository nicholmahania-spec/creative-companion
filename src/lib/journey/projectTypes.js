/**
 * Project types — the workflow adapts to what is being built.
 *
 * A £500 logo must not walk through a path designed for a full identity.
 * Starting a project asks "what are we building?", and the answer switches
 * on a sensible set of stages. The designer can still change them: the type
 * sets DEFAULTS, never a cage (PRODUCT.md §06/§07).
 *
 * Resolves PRODUCT.md §26.1. The earlier decision was a fixed ten-stage
 * spine; the owner chose modular on 2026-08-05, and modular subsumes it —
 * the full stage set simply becomes the Brand Identity default.
 *
 * HONEST LIMIT, stated rather than papered over: the path today has five
 * coarse stops (Strategy, Research, Identity, Touchpoints, Assets), so
 * several types below resolve to the SAME set. Logo Package, Brand
 * Identity, Refresh and Rebrand differ in the spec at a finer grain
 * (exploration vs design vs documentation, and an audit step for the two
 * that start from an existing brand) and those stages do not exist yet.
 * The mechanism is what this phase delivers; the finer stages are the next
 * one. Faking a distinction by removing a stop a type genuinely needs
 * would be worse than admitting the sets currently coincide.
 */
import { JOURNEY_STEPS } from './journey.js'

/** Every stage id the path knows, in canonical order. */
export const ALL_STEP_IDS = JOURNEY_STEPS.map((s) => s.id)

export const PROJECT_TYPES = [
  {
    id: 'logo',
    label: 'Logo design',
    plain: 'A mark, and what it needs to work. No wider system.',
    stepIds: ['define', 'research', 'design', 'deliver'],
  },
  {
    id: 'logo-package',
    label: 'Logo package',
    plain: 'A mark plus variations, basic colour and type, and where it goes.',
    stepIds: ALL_STEP_IDS,
  },
  {
    id: 'identity',
    label: 'Brand identity',
    plain: 'The complete system, start to finish.',
    stepIds: ALL_STEP_IDS,
  },
  {
    id: 'refresh',
    label: 'Brand refresh',
    plain: 'Evolve an identity that already exists.',
    stepIds: ALL_STEP_IDS,
    startsFromExisting: true,
  },
  {
    id: 'rebrand',
    label: 'Rebrand',
    plain: 'A substantial change, with equity worth keeping.',
    stepIds: ALL_STEP_IDS,
    startsFromExisting: true,
  },
  {
    id: 'expansion',
    label: 'Brand expansion',
    plain: 'An established brand, new applications.',
    stepIds: ['define', 'sketch', 'deliver'],
  },
  {
    id: 'custom',
    label: 'Custom',
    plain: 'Pick the stages yourself.',
    stepIds: ALL_STEP_IDS,
  },
]

/** The type used when a project does not say — every project made before
 *  types existed is a full identity, which is what the app did. */
export const DEFAULT_PROJECT_TYPE = 'identity'

export function projectType(id) {
  return (
    PROJECT_TYPES.find((t) => t.id === id) ||
    PROJECT_TYPES.find((t) => t.id === DEFAULT_PROJECT_TYPE)
  )
}

/**
 * The stage ids active for a project.
 *
 * `stepsOn` is the designer's own override and wins over the type's
 * defaults — the type is a starting point, not a constraint. Unknown ids
 * are dropped and canonical order is enforced, so a stored list cannot
 * reorder the path or resurrect a stage that no longer exists.
 */
export function activeStepIds(project) {
  const override = project?.stepsOn
  const chosen = Array.isArray(override)
    ? override
    : projectType(project?.projectType).stepIds
  const set = new Set(chosen)
  const kept = ALL_STEP_IDS.filter((id) => set.has(id))
  // A project with nothing switched on has no path at all, which is a dead
  // end rather than a preference. Fall back to the type's defaults.
  return kept.length ? kept : projectType(project?.projectType).stepIds
}

/**
 * The journey steps for a project, renumbered for what is actually on.
 *
 * `num` is recomputed rather than carried through, because it is not
 * decoration — it is the keyboard shortcut and the rail's position label.
 * A four-stage project whose stops read 1, 2, 3, 5 would be lying about
 * both. Everything else on the step is passed through untouched, so
 * `journey.js` stays the single source for labels and copy.
 */
export function stepsForProject(project) {
  const on = new Set(activeStepIds(project))
  return JOURNEY_STEPS.filter((s) => on.has(s.id)).map((s, i) => ({
    ...s,
    num: String(i + 1),
  }))
}

/**
 * Turning a stage on or off for one project.
 *
 * Returns the next `stepsOn` list. Switching a stage off never deletes the
 * work inside it — a stage is a view onto the project document, and the
 * document is untouched — so this is reversible, which is why it needs no
 * confirmation.
 */
export function toggleStep(project, stepId) {
  const on = new Set(activeStepIds(project))
  if (on.has(stepId)) on.delete(stepId)
  else on.add(stepId)
  const next = ALL_STEP_IDS.filter((id) => on.has(id))
  return next.length ? next : activeStepIds(project)
}

/**
 * Work out the type from what intake already asked.
 *
 * The new-project screen does NOT ask "what are we building?" — it already
 * asks engagement and deliverables, and a fourth decision at task
 * initiation is the friction the intake was explicitly designed to remove.
 * Ruled by adhd-executive-function-advisor, 2026-08-05: derive, don't ask.
 *
 * ORDER MATTERS, and this is the bug that ruling caught before it shipped.
 * Checking engagement first meant "adding to a brand that already works"
 * plus logo-only deliverables resolved to `expansion` — whose stages are
 * define/sketch/deliver, with NO Identity stop. A logo job with nowhere to
 * draw the logo. And because stepsForProject renumbers, the path would
 * have read 1-2-3 with no gap to notice: the stage would simply be absent,
 * and absence is invisible. Scope is therefore checked FIRST.
 *
 * NOT EVERY TYPE IS REACHABLE THIS WAY, and that is recorded rather than
 * hidden (devil's advocate, 2026-08-05):
 *   - `logo-package` — isLogoOnlyScope is strict (mark deliverables only),
 *     so ticking a colour palette lands on `identity` and skips the tier.
 *   - `refresh` — intake offers new/rebrand/extend, so a refresh derives as
 *     `rebrand`. Their stage sets are identical today; they differ only in
 *     `startsFromExisting`, which nothing reads yet.
 *   - `custom` — by definition; it means "the designer picked the stages",
 *     which is what toggling a stage already produces.
 * Each stays in the catalogue because it is the right model for when the
 * finer stages land. Unreachable-by-derivation is not unreachable-forever;
 * changing type is additive and always available.
 *
 * One deliberate collision: a rebrand of just the mark derives `logo`, not
 * `rebrand`, because scope is checked first. That is the right answer — it
 * is a logo job — and it keeps the Identity stop, which the alternative
 * ordering would have dropped.
 *
 * @param {{engagementType?: string, logoOnly?: boolean}} intake
 */
export function typeFromIntake({ engagementType, logoOnly } = {}) {
  if (logoOnly) return 'logo'
  if (engagementType === 'extend') return 'expansion'
  if (engagementType === 'rebrand') return 'rebrand'
  return DEFAULT_PROJECT_TYPE
}

/**
 * Grow a project into a bigger type without starting over.
 *
 * Logo → Logo package → Brand identity. The new type's stages are UNIONED
 * with whatever is already on, never replaced: a designer who switched an
 * extra stage on keeps it, and nothing already in progress disappears.
 */
export function expandProject(project, nextTypeId) {
  const on = new Set([
    ...activeStepIds(project),
    ...projectType(nextTypeId).stepIds,
  ])
  return {
    projectType: nextTypeId,
    stepsOn: ALL_STEP_IDS.filter((id) => on.has(id)),
  }
}
