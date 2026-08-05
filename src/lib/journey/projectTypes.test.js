import { describe, it, expect } from 'vitest'
import { JOURNEY_STEPS } from './journey.js'
import {
  ALL_STEP_IDS,
  DEFAULT_PROJECT_TYPE,
  PROJECT_TYPES,
  activeStepIds,
  expandProject,
  projectType,
  stepsForProject,
  toggleStep,
  typeFromIntake,
} from './projectTypes.js'

describe('the type catalogue is derived, not restated', () => {
  it('every type only names stages the path actually has', () => {
    // The dominant defect in this codebase is a second copy of a declared
    // list. A type naming a stage that no longer exists would silently
    // shorten that type's path instead of failing.
    PROJECT_TYPES.forEach((t) => {
      t.stepIds.forEach((id) => {
        expect(ALL_STEP_IDS, `type "${t.id}" names unknown stage "${id}"`).toContain(id)
      })
    })
  })

  it('ALL_STEP_IDS tracks journey.js rather than repeating it', () => {
    expect(ALL_STEP_IDS).toEqual(JOURNEY_STEPS.map((s) => s.id))
  })

  it('no type is empty, and the default type exists', () => {
    PROJECT_TYPES.forEach((t) => expect(t.stepIds.length).toBeGreaterThan(0))
    expect(PROJECT_TYPES.map((t) => t.id)).toContain(DEFAULT_PROJECT_TYPE)
  })

  it('an unknown type falls back rather than blowing up', () => {
    expect(projectType('nonsense').id).toBe(DEFAULT_PROJECT_TYPE)
    expect(projectType(undefined).id).toBe(DEFAULT_PROJECT_TYPE)
  })
})

describe('activeStepIds', () => {
  it('a project made before types existed keeps the full path', () => {
    // The app had one fixed path; every existing project is a full identity.
    expect(activeStepIds({})).toEqual(ALL_STEP_IDS)
    expect(activeStepIds(undefined)).toEqual(ALL_STEP_IDS)
  })

  it('a logo job skips Touchpoints', () => {
    const ids = activeStepIds({ projectType: 'logo' })
    expect(ids).not.toContain('sketch')
    expect(ids).toContain('design')
  })

  it("the designer's own choice beats the type's defaults", () => {
    const ids = activeStepIds({ projectType: 'logo', stepsOn: ['define', 'sketch'] })
    expect(ids).toEqual(['define', 'sketch'])
  })

  it('a stored list cannot reorder the path or revive a dead stage', () => {
    const ids = activeStepIds({ stepsOn: ['deliver', 'define', 'ghost-stage'] })
    expect(ids).toEqual(['define', 'deliver']) // canonical order, unknown dropped
  })

  it('switching everything off falls back instead of leaving no path', () => {
    expect(activeStepIds({ projectType: 'logo', stepsOn: [] })).toEqual(
      projectType('logo').stepIds
    )
  })
})

describe('stepsForProject renumbers', () => {
  it('numbers run 1..N with no gaps when a stage is off', () => {
    // num is the keyboard shortcut and the rail position, not decoration:
    // a four-stage path reading 1,2,3,5 lies about both.
    const steps = stepsForProject({ projectType: 'logo' })
    expect(steps.map((s) => s.num)).toEqual(['1', '2', '3', '4'])
    expect(steps.map((s) => s.id)).toEqual(['define', 'research', 'design', 'deliver'])
  })

  it('passes labels and copy through untouched — journey.js stays the source', () => {
    const steps = stepsForProject({ projectType: 'identity' })
    steps.forEach((s) => {
      const src = JOURNEY_STEPS.find((x) => x.id === s.id)
      expect(s.label).toBe(src.label)
      expect(s.plain).toBe(src.plain)
      expect(s.view).toBe(src.view)
    })
  })

  it('a full identity is the whole path, unchanged', () => {
    expect(stepsForProject({ projectType: 'identity' }).map((s) => s.num)).toEqual(
      JOURNEY_STEPS.map((s) => s.num)
    )
  })
})

describe('toggleStep', () => {
  it('turns a stage off and back on', () => {
    const p = { projectType: 'identity' }
    const off = toggleStep(p, 'sketch')
    expect(off).not.toContain('sketch')
    const on = toggleStep({ ...p, stepsOn: off }, 'sketch')
    expect(on).toContain('sketch')
    expect(on).toEqual(ALL_STEP_IDS)
  })

  it('refuses to leave a project with no stages at all', () => {
    let p = { projectType: 'logo', stepsOn: ['define'] }
    expect(toggleStep(p, 'define')).toEqual(['define'])
  })
})

describe('expandProject', () => {
  it('grows Logo into Brand identity without losing anything', () => {
    const before = { projectType: 'logo' }
    const after = expandProject(before, 'identity')
    expect(after.projectType).toBe('identity')
    expect(after.stepsOn).toEqual(ALL_STEP_IDS)
    // everything that was on before is still on
    activeStepIds(before).forEach((id) => expect(after.stepsOn).toContain(id))
  })

  it('keeps a stage the designer switched on that the new type would not include', () => {
    // Expanding must never take away a deliberate choice.
    const before = { projectType: 'expansion', stepsOn: ['define', 'research', 'sketch'] }
    const after = expandProject(before, 'logo')
    expect(after.stepsOn).toContain('sketch') // not in the logo defaults
    expect(after.stepsOn).toContain('design') // added by the logo defaults
  })
})

describe('typeFromIntake — derived, and in the order that matters', () => {
  it('a logo-only job is a logo job even when adding to an existing brand', () => {
    /* The bug this pins, caught in review before it shipped: checking
       engagement first sent extend + logo-only to `expansion`, whose stages
       are define/sketch/deliver — no Identity stop. A logo job with nowhere
       to draw the logo, and because stepsForProject renumbers, the path
       would read 1-2-3 with no gap to notice. */
    const t = typeFromIntake({ engagementType: 'extend', logoOnly: true })
    expect(t).toBe('logo')
    expect(activeStepIds({ projectType: t })).toContain('design')
  })

  it('every derivable type keeps the Identity stop except a pure expansion', () => {
    const cases = [
      { engagementType: 'new' },
      { engagementType: 'rebrand' },
      { engagementType: 'new', logoOnly: true },
    ]
    cases.forEach((c) => {
      const ids = activeStepIds({ projectType: typeFromIntake(c) })
      expect(ids, JSON.stringify(c)).toContain('design')
    })
  })

  it('maps the plain cases', () => {
    expect(typeFromIntake({ engagementType: 'new' })).toBe('identity')
    expect(typeFromIntake({ engagementType: 'rebrand' })).toBe('rebrand')
    expect(typeFromIntake({ engagementType: 'extend' })).toBe('expansion')
    expect(typeFromIntake({})).toBe(DEFAULT_PROJECT_TYPE)
    expect(typeFromIntake()).toBe(DEFAULT_PROJECT_TYPE)
  })
})
