/**
 * A template is a house STYLE, not a project — and it must actually run.
 *
 * Two bugs are guarded here:
 *  1. The six template actions (saveAsTemplate…applyTemplate) were defined
 *     inside the persist CONFIG object, not the store, so `getState()` never
 *     exposed them — clicking Apply threw `not a function` and the Templates
 *     modal was UI in front of nothing. This test would fail at import-time if
 *     they slid back out of the store.
 *  2. `applyTemplate` used to spread the whole of `template.data`, which
 *     included a clone of the source project's `detective` (Chapter 01 IS the
 *     client record), `tasks` and `directions`. So Apply against a live
 *     project silently overwrote that client's brief with a different
 *     client's data. It now filters through TEMPLATE_STYLE_KEYS.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import useAppStore, { createBlankProject } from './useAppStore'

describe('template feature is wired to the store', () => {
  it('exposes the template actions on getState (not stranded in persist config)', () => {
    const s = useAppStore.getState()
    expect(typeof s.saveAsTemplate).toBe('function')
    expect(typeof s.getTemplates).toBe('function')
    expect(typeof s.applyTemplate).toBe('function')
  })
})

describe('applyTemplate is style-only', () => {
  beforeEach(() => {
    const project = createBlankProject('Acme rebrand', '')
    project.detective = {
      ...project.detective,
      clientName: 'Acme Coffee Co.',
      email: 'owner@acme.example',
    }
    project.tasks = [{ id: 'task-1', label: 'Call Acme', done: false }]
    useAppStore.setState({
      projects: [project],
      currentProjectId: project.id,
      // A template carrying a DIFFERENT client's record, as pre-fix templates do.
      templates: [{
        id: 'tpl-1',
        name: 'House style',
        data: {
          // style — should transfer
          typeHeading: 'Fraunces',
          palette: ['#111111', '#eeeeee'],
          // hostile working data — must NOT transfer
          detective: { clientName: 'Some Other Client', email: 'other@x.example' },
          tasks: [{ id: 'foreign', label: 'Not my task', done: true }],
          directions: [{ id: 'd-foreign', label: 'foreign direction' }],
        },
      }],
    })
  })

  it('applies style fields onto the current project', async () => {
    await useAppStore.getState().applyTemplate('tpl-1')
    const p = useAppStore.getState().projects[0]
    expect(p.typeHeading).toBe('Fraunces')
    expect(p.palette).toEqual(['#111111', '#eeeeee'])
  })

  it('never overwrites the client record, tasks, or directions', async () => {
    const before = useAppStore.getState().projects[0]
    const tasksBefore = before.tasks
    const directionsBefore = before.directions

    await useAppStore.getState().applyTemplate('tpl-1')

    const p = useAppStore.getState().projects[0]
    expect(p.detective.clientName).toBe('Acme Coffee Co.')
    expect(p.detective.email).toBe('owner@acme.example')
    expect(p.tasks).toEqual(tasksBefore)
    expect(p.directions).toEqual(directionsBefore)
  })

  it('an empty template logoImage cannot clear the chosen mark', async () => {
    const s = useAppStore.getState()
    const id = s.addLogoConcept('data:image/png;base64,KEEP')
    s.chooseLogoConcept(id)
    expect(useAppStore.getState().projects[0].logoImage).toBe(
      'data:image/png;base64,KEEP'
    )

    useAppStore.setState((state) => ({
      templates: [
        ...state.templates,
        {
          id: 'tpl-empty-mark',
          name: 'Empty mark house style',
          data: {
            typeHeading: 'Source Serif',
            logoImage: '',
          },
        },
      ],
    }))

    await useAppStore.getState().applyTemplate('tpl-empty-mark')
    const p = useAppStore.getState().projects[0]
    expect(p.typeHeading).toBe('Source Serif')
    expect(p.logoImage).toBe('data:image/png;base64,KEEP')
    expect(p.logoConcepts.find((c) => c.chosen)?.id).toBe(id)
    expect(p.logoConcepts.find((c) => c.chosen)?.image).toBe(
      'data:image/png;base64,KEEP'
    )
  })

  it('a sentinel template logoImage cannot clear the chosen mark', async () => {
    const s = useAppStore.getState()
    const id = s.addLogoConcept('data:image/png;base64,KEEP')
    s.chooseLogoConcept(id)

    useAppStore.setState((state) => ({
      templates: [
        ...state.templates,
        {
          id: 'tpl-omitted-mark',
          name: 'Omitted mark',
          data: { logoImage: '[image-omitted]' },
        },
      ],
    }))

    await useAppStore.getState().applyTemplate('tpl-omitted-mark')
    const p = useAppStore.getState().projects[0]
    expect(p.logoImage).toBe('data:image/png;base64,KEEP')
    expect(p.logoConcepts.find((c) => c.chosen)?.id).toBe(id)
  })

  it('saveAsTemplate never captures the client record, tasks, or directions', () => {
    useAppStore.getState().saveAsTemplate('My house style', 'desc')
    const saved = useAppStore.getState().getTemplates().find(t => t.name === 'My house style')
    expect(saved.data).not.toHaveProperty('detective')
    expect(saved.data).not.toHaveProperty('tasks')
    expect(saved.data).not.toHaveProperty('directions')
    expect(saved.data).not.toHaveProperty('moodItems')
  })
})
