import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  IDENTITY_FIELDS,
  IDENTITY_WRITER_ACTIONS,
  identityStamp,
  identityStampLabel,
  identityStampState,
} from './identityStamp'
import useAppStore from '../store/useAppStore'

const iso = (ms) => new Date(ms).toISOString()

describe('identityStampState', () => {
  it('reads none when no identity work has happened', () => {
    expect(identityStampState({})).toBe('none')
    expect(identityStampState({ identitySavedAt: iso(1000) })).toBe('none')
  })

  it('reads unsaved when edited but never saved', () => {
    expect(identityStampState({ identityEditedAt: iso(1000) })).toBe('unsaved')
  })

  it('reads unsaved when the edit is newer than the save', () => {
    expect(
      identityStampState({
        identitySavedAt: iso(1000),
        identityEditedAt: iso(2000),
      })
    ).toBe('unsaved')
  })

  it('reads saved when the save is newer than the edit', () => {
    expect(
      identityStampState({
        identityEditedAt: iso(1000),
        identitySavedAt: iso(2000),
      })
    ).toBe('saved')
  })

  it('reads saved when both land in the same millisecond', () => {
    // A bump writes identitySavedAt in the same tick an edit may have landed
    // in. Treating equal timestamps as unsaved would leave the stamp stuck on
    // "edits since" immediately after saving.
    expect(
      identityStampState({
        identityEditedAt: iso(1000),
        identitySavedAt: iso(1000),
      })
    ).toBe('saved')
  })

  it('degrades to none on an unparseable stamp rather than throwing', () => {
    expect(identityStampState({ identityEditedAt: 'not a date' })).toBe('none')
  })

  it('survives a null project', () => {
    expect(identityStampState(undefined)).toBe('none')
    expect(identityStamp(undefined).label).toBe('No identity work yet')
  })
})

describe('identityStampLabel — words only', () => {
  const labels = ['none', 'unsaved', 'saved'].map(identityStampLabel)

  it('never shows a digit', () => {
    // The owner has no concept of time and numbers do not register. A version
    // number or a clock time on screen is the thing this stamp exists to avoid.
    for (const label of labels) {
      expect(label).not.toMatch(/\d/)
    }
  })

  it('never uses shame-coded or verdict wording', () => {
    for (const label of labels) {
      expect(label.toLowerCase()).not.toMatch(
        /\bstale\b|\bout of date\b|\bunsynced\b|\bpending\b|\bbehind\b|\byou\b/
      )
    }
  })

  it('gives each state its own sentence', () => {
    expect(new Set(labels).size).toBe(3)
  })
})

describe('the store stamps every identity writer action', () => {
  const freshProject = () => {
    const store = useAppStore.getState()
    store.clearToEmpty()
    const p = useAppStore.getState().createNewProject('Stamp test')
    return p
  }

  const editedAt = () => {
    const st = useAppStore.getState()
    return st.projects.find((p) => p.id === st.currentProjectId)?.identityEditedAt
  }

  /** Each writer, exercised through the real store action. */
  const writers = {
    updateBrandField: (s) => s.updateBrandField('tagline', 'Made to last'),
    setProjectPalette: (s) => s.setProjectPalette(['#111111', '#222222']),
    setPaletteTokens: (s) =>
      s.setPaletteTokens([
        { id: 'a', name: 'Ink', hex: '#111111' },
        { id: 'b', name: 'Paper', hex: '#EEEEEE' },
      ]),
    updatePaletteColor: (s) => s.updatePaletteColor(0, '#333333'),
    addPaletteColor: (s) => s.addPaletteColor('#444444'),
    removePaletteColor: (s) => s.removePaletteColor(0),
    setColorRole: (s) => s.setColorRole('accent', '#555555'),
    setLogoImage: (s) => s.setLogoImage('data:image/png;base64,AAAA'),
    setLogoDirection: (s) => s.setLogoDirection('Geometric, low contrast'),
  }

  it('covers exactly the documented writer list', () => {
    expect(Object.keys(writers).sort()).toEqual(
      [...IDENTITY_WRITER_ACTIONS].sort()
    )
  })

  for (const [name, run] of Object.entries(writers)) {
    it(`${name} records an identity edit`, () => {
      freshProject()
      expect(editedAt()).toBeFalsy()
      run(useAppStore.getState())
      const stamped = editedAt()
      expect(stamped, `${name} did not stamp identityEditedAt`).toBeTruthy()
      expect(Number.isNaN(Date.parse(stamped))).toBe(false)
      expect(identityStampState({ identityEditedAt: stamped })).toBe('unsaved')
    })
  }

  it('does not stamp for a non-identity brand field', () => {
    // updateBrandField also writes org contact details and print notes. A new
    // phone number is not a change to the identity, and stamping it would put
    // the chip into "edits since" for something the client never sees.
    freshProject()
    useAppStore.getState().updateBrandField('orgPhone', '0100 000 000')
    expect(editedAt()).toBeFalsy()
    expect(IDENTITY_FIELDS).not.toContain('orgPhone')
  })

  it('bumpDesignVersion marks the identity saved', () => {
    freshProject()
    useAppStore.getState().updateBrandField('tagline', 'Made to last')
    const st = useAppStore.getState()
    const before = st.projects.find((p) => p.id === st.currentProjectId)
    expect(identityStampState(before)).toBe('unsaved')

    useAppStore.getState().bumpDesignVersion()
    const after = useAppStore
      .getState()
      .projects.find((p) => p.id === useAppStore.getState().currentProjectId)
    expect(identityStampState(after)).toBe('saved')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('an edit after a save reads unsaved again', () => {
    /* The clock is driven explicitly here. Run at real speed, the bump and the
       edit after it land in the same millisecond, `edited > saved` is false,
       and this reads 'saved' — a flaky pass that depends on how fast the
       machine is. A real user cannot type inside a millisecond, so the
       equal-timestamps tie-break stays as it is (a bump writes both stamps in
       one `set`, and must not immediately read as unsaved); it is the test
       that has to stop racing. */
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-02T10:00:00.000Z'))
    freshProject()
    useAppStore.getState().updateBrandField('tagline', 'One')

    vi.setSystemTime(new Date('2026-08-02T10:05:00.000Z'))
    useAppStore.getState().bumpDesignVersion()

    vi.setSystemTime(new Date('2026-08-02T10:10:00.000Z'))
    useAppStore.getState().updateBrandField('voice', 'Warm, plain')

    const st = useAppStore.getState()
    const p = st.projects.find((x) => x.id === st.currentProjectId)
    expect(identityStampState(p)).toBe('unsaved')
  })
})
