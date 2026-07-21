import { describe, expect, it, beforeEach } from 'vitest'
import useAppStore, {
  blankWorkspaceState,
  createBlankProject,
  brandIdentityDefaults,
} from './useAppStore'

describe('prefs defaults survive hydration from older payloads', () => {
  beforeEach(() => {
    useAppStore.setState(blankWorkspaceState())
  })

  it('hydrateFromPayload keeps newer pref defaults when payload predates them', () => {
    const project = createBlankProject('Older backup', 'brief')
    const result = useAppStore.getState().hydrateFromPayload({
      projects: [project],
      tasks: [],
      // Old-build prefs: no helperQuiet / hideTips / toastMode keys at all
      prefs: { soundEnabled: false, queueCollapsed: false },
    })
    expect(result.ok).toBe(true)
    const prefs = useAppStore.getState().prefs
    // Explicit old values kept
    expect(prefs.soundEnabled).toBe(false)
    expect(prefs.queueCollapsed).toBe(false)
    // Newer prefs fall back to their intended defaults, not undefined
    expect(prefs.helperQuiet).toBe(true)
    expect(prefs.hideTips).toBe(true)
    expect(prefs.toastMode).toBe('quiet')
    expect(prefs.focusMaskPct).toBe(25)
  })

  it('brandIdentityDefaults returns fresh nested objects per call', () => {
    const a = brandIdentityDefaults()
    const b = brandIdentityDefaults()
    expect(a.detective).not.toBe(b.detective)
    expect(a.conceptPackage).not.toBe(b.conceptPackage)
    expect(a.colorRoleWhy).not.toBe(b.colorRoleWhy)
    expect(a.deliverWordsChecked).not.toBe(b.deliverWordsChecked)
  })
})
