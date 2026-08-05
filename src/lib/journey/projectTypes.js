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
