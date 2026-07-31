import { describe, expect, it, beforeEach } from 'vitest'
import useAppStore, {
  blankWorkspaceState,
  createBlankProject,
  brandIdentityDefaults,
} from './useAppStore'
import {
  FOCUS_MASK_MIN_PCT,
  FOCUS_MASK_MAX_PCT,
  clampFocusMaskPct,
} from '../lib/uiPrefs'

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
    // The default must sit inside the legibility bounds, not on a fixed
    // number — it was 25, a value the app clamped away and never applied,
    // so the slider displayed one intensity while the screen showed another.
    expect(prefs.focusMaskPct).toBe(FOCUS_MASK_MIN_PCT)
    expect(clampFocusMaskPct(prefs.focusMaskPct)).toBe(prefs.focusMaskPct)
  })

  it('focus-mask bounds keep masked answers above the 4.5:1 contrast floor', () => {
    // Masked fields are the user's own answers, kept legible as
    // working-memory scaffolding. Composite of --text-primary over the
    // canvas at the floor: 7.5:1 dark, 5.22:1 light. At 40% it was
    // 3.59/2.48 and at 60% still 4.44 in light — both under the floor.
    expect(FOCUS_MASK_MIN_PCT).toBeGreaterThanOrEqual(65)
    expect(FOCUS_MASK_MAX_PCT).toBeGreaterThan(FOCUS_MASK_MIN_PCT)
    // Anything the user can store is pulled back inside the bounds.
    expect(clampFocusMaskPct(0)).toBe(FOCUS_MASK_MIN_PCT)
    expect(clampFocusMaskPct(25)).toBe(FOCUS_MASK_MIN_PCT)
    expect(clampFocusMaskPct(999)).toBe(FOCUS_MASK_MAX_PCT)
    expect(clampFocusMaskPct(undefined)).toBe(FOCUS_MASK_MIN_PCT)
  })

  it('brandIdentityDefaults returns fresh nested objects per call', () => {
    const a = brandIdentityDefaults()
    const b = brandIdentityDefaults()
    expect(a.detective).not.toBe(b.detective)
    expect(a.colorRoleWhy).not.toBe(b.colorRoleWhy)
    expect(a.pathReached).not.toBe(b.pathReached)
    expect(a.deliverWordsChecked).not.toBe(b.deliverWordsChecked)
  })
})
