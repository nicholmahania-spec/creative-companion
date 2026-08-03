import { describe, expect, it, beforeEach } from 'vitest'
import useAppStore, {
  blankWorkspaceState,
  createBlankProject,
} from './useAppStore'
import { DETECTIVE_CHAPTERS } from '../lib/brief/detectiveBrief'
import { DISCOVERY_FIELDS } from '../lib/client/discoveryBrief'

/**
 * The two questionnaires are separate schemas under separate project keys:
 * the Define sheet reads `detective`, the public share form writes
 * `discoveryAnswers`. Without a bridge a client can fill /f/:shareId and the
 * designer never sees a word of it. These cover the bridge, not the schemas.
 */

const seed = () => {
  const project = createBlankProject('Bridge test', '')
  useAppStore.setState({
    ...blankWorkspaceState(),
    projects: [project],
    currentProjectId: project.id,
  })
  return project.id
}

const sharedIds = (() => {
  const det = new Set(
    DETECTIVE_CHAPTERS.flatMap((c) => (c.fields || []).map((f) => f.id))
  )
  return DISCOVERY_FIELDS.filter((f) => det.has(f.id)).map((f) => f.id)
})()

const currentId = () => useAppStore.getState().currentProjectId

const current = () => {
  const s = useAppStore.getState()
  return s.projects.find((p) => p.id === s.currentProjectId)
}

describe('discovery -> detective bridge', () => {
  beforeEach(seed)

  it('the two schemas really do share field ids', () => {
    // If this ever hits zero the bridge is silently doing nothing.
    expect(sharedIds.length).toBeGreaterThan(0)
    expect(sharedIds).toContain('clientName')
  })

  it('client answers on shared ids reach the Define sheet', () => {
    useAppStore.getState().mergeDiscoveryAnswers(currentId(), {
      clientName: 'Blackbird Coffee',
      story: 'Started in a garage in 2019.',
    })
    const p = current()
    expect(p.discoveryAnswers.clientName).toBe('Blackbird Coffee')
    expect(p.detective.clientName).toBe('Blackbird Coffee')
    expect(p.detective.story).toBe('Started in a garage in 2019.')
    expect(p.discoveryShareStatus).toBe('submitted')
  })

  it("never overwrites an answer the studio user already entered", () => {
    const id = useAppStore.getState().currentProjectId
    useAppStore.setState((s) => ({
      projects: s.projects.map((p) =>
        p.id === id
          ? { ...p, detective: { ...p.detective, clientName: 'Designer wins' } }
          : p
      ),
    }))
    useAppStore.getState().mergeDiscoveryAnswers(currentId(), { clientName: 'Client loses' })
    const p = current()
    expect(p.detective.clientName).toBe('Designer wins')
    // still recorded on its own schema
    expect(p.discoveryAnswers.clientName).toBe('Client loses')
  })

  it('ignores blank and whitespace-only client answers', () => {
    const id = useAppStore.getState().currentProjectId
    useAppStore.setState((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, detective: { ...p.detective, story: '' } } : p
      ),
    }))
    useAppStore.getState().mergeDiscoveryAnswers(currentId(), { story: '   ', usp: '' })
    const p = current()
    expect(String(p.detective.story || '')).toBe('')
    expect(String(p.detective.usp || '')).toBe('')
  })

  it('does not invent detective keys for discovery-only fields', () => {
    // projectTitle exists only on the discovery schema.
    expect(sharedIds).not.toContain('projectTitle')
    useAppStore.getState().mergeDiscoveryAnswers(currentId(), { projectTitle: 'Rebrand' })
    const p = current()
    expect(p.discoveryAnswers.projectTitle).toBe('Rebrand')
    expect(p.detective.projectTitle).toBeUndefined()
  })

  it('mirrors detective-only ids too, not just the shared ones', () => {
    // Both public routes now send the detective schema, so a client answers
    // ids like `goal` that never existed on the discovery schema. Mirroring
    // only the intersection would silently drop them.
    expect(sharedIds).not.toContain('goal')
    useAppStore.getState().mergeDiscoveryAnswers(currentId(), { goal: 'Look established' })
    expect(current().detective.goal).toBe('Look established')
  })

  it('mirrors checklist answers, which arrive as arrays', () => {
    useAppStore
      .getState()
      .mergeDiscoveryAnswers(currentId(), { deliverablesPicked: ['logoPrimary', 'typography'] })
    expect(current().detective.deliverablesPicked).toEqual([
      'logoPrimary',
      'typography',
    ])
  })

  it('treats an empty array as unanswered, not as an answer', () => {
    const id = useAppStore.getState().currentProjectId
    useAppStore.setState((s) => ({
      projects: s.projects.map((p) =>
        p.id === id
          ? { ...p, detective: { ...p.detective, deliverablesPicked: ['logoPrimary'] } }
          : p
      ),
    }))
    useAppStore.getState().mergeDiscoveryAnswers(currentId(), { deliverablesPicked: [] })
    // the designer's existing picks survive an empty client submission
    expect(current().detective.deliverablesPicked).toEqual(['logoPrimary'])
  })

  it('merges into the project the check started for, not whichever is current', () => {
    // The studio user opens the panel for client A, presses "check
    // submission", then switches to client B while the fetch is in flight.
    // Resolving against currentProjectId would put A's answers on B's brief,
    // and because the merge only fills blanks it would be silent.
    const clientA = currentId()
    const clientB = createBlankProject('Client B', '')
    useAppStore.setState((s) => ({
      projects: [...s.projects, clientB],
      currentProjectId: clientB.id, // user switched mid-request
    }))
    useAppStore.getState().mergeDiscoveryAnswers(clientA, {
      clientName: 'Belongs to A',
    })
    const a = useAppStore.getState().projects.find((p) => p.id === clientA)
    const b = useAppStore.getState().projects.find((p) => p.id === clientB.id)
    expect(a.detective.clientName).toBe('Belongs to A')
    expect(b.detective.clientName || '').toBe('')
    expect(b.discoveryShareStatus).not.toBe('submitted')
  })

  it('leaves other projects untouched', () => {
    const other = createBlankProject('Untouched', '')
    useAppStore.setState((s) => ({ projects: [...s.projects, other] }))
    useAppStore.getState().mergeDiscoveryAnswers(currentId(), { clientName: 'Only mine' })
    const p = useAppStore.getState().projects.find((x) => x.id === other.id)
    expect(p.detective.clientName || '').toBe('')
    expect(p.discoveryShareStatus).not.toBe('submitted')
  })
})
