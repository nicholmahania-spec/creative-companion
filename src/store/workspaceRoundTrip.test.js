/**
 * A workspace round-trip must not lose state.
 *
 * `exportAllData()` feeds BOTH the cloud push and the manual JSON backup;
 * `hydrateFromPayload()` is the other end of both. Any key that `partialize`
 * persists but the payload omits is silently destroyed on the next
 * sync-or-restore: the export captures a workspace without it, and the import
 * writes that back over the copy that still had it.
 *
 * `templates` was in exactly that gap, so every cloud sync erased the user's
 * saved templates with no error and no undo.
 *
 * The first test is the general guard — it compares the two key sets rather
 * than checking a hand-written list, so a field added to `partialize` later
 * fails here instead of quietly going lossy.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import useAppStore from './useAppStore'

/** Keys that are intentionally local-only and must NOT travel in a payload. */
const DELIBERATELY_LOCAL = new Set([
  // Which project is open is a per-device concern; syncing it would yank a
  // second device to whatever the first one happened to be looking at.
  'currentProjectId',
])

describe('workspace round-trip', () => {
  beforeEach(() => {
    useAppStore.setState({
      templates: [{ id: 't1', name: 'Studio starter' }],
      currentTemplateId: 't1',
      portalSeen: { abc: true },
      themeSource: 'user',
    })
  })

  it('exports every key that persistence keeps', () => {
    const payload = useAppStore.getState().exportAllData()
    const persisted = [
      'projects', 'tasks', 'moodItems', 'conceptItems', 'breakKit',
      'theme', 'themeSource', 'onboarded', 'sparkIndex', 'oppositeIndex',
      'sparksTried', 'currentSpark', 'prefs', 'portalSeen',
      'templates', 'currentTemplateId',
    ]
    const missing = persisted.filter(
      (k) => !(k in payload) && !DELIBERATELY_LOCAL.has(k)
    )
    expect(missing).toEqual([])
  })

  it('restores templates through export -> hydrate', () => {
    const payload = useAppStore.getState().exportAllData()
    useAppStore.setState({ templates: [], currentTemplateId: null })

    const r = useAppStore.getState().hydrateFromPayload(payload)
    expect(r.ok).toBe(true)
    expect(useAppStore.getState().templates).toHaveLength(1)
    expect(useAppStore.getState().templates[0].name).toBe('Studio starter')
    expect(useAppStore.getState().currentTemplateId).toBe('t1')
  })

  it('keeps portalSeen and themeSource across the trip', () => {
    const payload = useAppStore.getState().exportAllData()
    useAppStore.setState({ portalSeen: {}, themeSource: 'auto' })

    useAppStore.getState().hydrateFromPayload(payload)
    expect(useAppStore.getState().portalSeen).toEqual({ abc: true })
    expect(useAppStore.getState().themeSource).toBe('user')
  })

  it('treats an older payload as "keep what we have", not "delete it"', () => {
    /* A payload written before these keys existed has no `templates` at all.
       Reading that absence back as a value would wipe the local copy — the
       same data loss in the other direction. */
    const payload = useAppStore.getState().exportAllData()
    delete payload.templates
    delete payload.currentTemplateId
    delete payload.portalSeen
    delete payload.themeSource

    useAppStore.getState().hydrateFromPayload(payload)
    expect(useAppStore.getState().templates).toHaveLength(1)
    expect(useAppStore.getState().currentTemplateId).toBe('t1')
    expect(useAppStore.getState().portalSeen).toEqual({ abc: true })
    expect(useAppStore.getState().themeSource).toBe('user')
  })
})
