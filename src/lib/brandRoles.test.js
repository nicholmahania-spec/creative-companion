import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  ACCENT_KEYS,
  BRAND_ROLE_KEYS,
  BRAND_ROLE_LABELS,
  NEUTRAL_KEYS,
  HEALTH_ROLE_KEYS,
  mapPaletteRoles,
} from './color.js'
import useAppStore from '../store/useAppStore.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The jobs a colour can hold, declared once.
 *
 * These existed as three separate copies: a display list in DesignView, a
 * whitelist in the store's `setColorRole`, and the health keys here. That is
 * the shape of a specific bug — a role offered as a chip in the UI and
 * silently rejected on save, with the click appearing to do nothing. The
 * codebase has been bitten by exactly this pattern before, which is why
 * `journeySingleSource.test.js` exists for the journey stops.
 */
describe('the role vocabulary has one home', () => {
  it('covers the jobs a brand actually has', () => {
    /* Pinned as a LITERAL LIST, not derived from the same file it verifies.
       The first version looped `[...ACCENT_KEYS, ...NEUTRAL_KEYS]` and asserted
       each was present — but both arrays live in the module under test, so
       shrinking them made the loop iterate fewer times instead of failing.
       An audit proved it by mutation: cutting accent2/accent3/neutral/neutral2
       from BRAND_ROLE_KEYS *and* from those two arrays produced a byte-identical
       999/999 pass. A test that moves with the code it guards is not a guard.

       Primary, Secondary, Accents, Neutrals, Text, Background — the owner's
       set, and the one PRODUCT.md §9 lists under Color. */
    expect(BRAND_ROLE_KEYS).toEqual([
      'cover',
      'secondary',
      'accent',
      'accent2',
      'accent3',
      'neutral',
      'neutral2',
      'text',
      'quiet',
    ])
    expect(ACCENT_KEYS).toEqual(['accent', 'accent2', 'accent3'])
    expect(NEUTRAL_KEYS).toEqual(['neutral', 'neutral2'])
  })

  it('names every job it offers', () => {
    // A chip with no label would render blank; a label with no key would be a
    // job the store rejects.
    for (const k of BRAND_ROLE_KEYS) {
      expect(BRAND_ROLE_LABELS[k], k).toBeTruthy()
    }
    for (const k of Object.keys(BRAND_ROLE_LABELS)) {
      expect(BRAND_ROLE_KEYS, k).toContain(k)
    }
  })

  it('keeps the stored keys the app already has on disk', () => {
    /* The rename is display-only. `cover` and `quiet` are what every existing
       project carries and what the brand book and exports read; renaming them
       would have meant a migration for what is really a labelling change. */
    for (const k of HEALTH_ROLE_KEYS) {
      expect(BRAND_ROLE_KEYS, k).toContain(k)
    }
  })

  it('the store accepts every job the UI can offer', () => {
    /* The bug this prevents: a role assignable as a chip and rejected by
       `setColorRole`, so clicking it appears to do nothing at all. The store
       reads BRAND_ROLE_KEYS rather than re-typing the list. */
    const store = readFileSync(resolve(root, 'store/useAppStore.js'), 'utf8')
    expect(store).toMatch(/BRAND_ROLE_KEYS\.includes\(key\)/)
    expect(
      store,
      'the store must not carry its own copy of the role list'
    ).not.toMatch(/\['cover',\s*'text',\s*'accent',\s*'quiet'\]/)
  })

  it('the view does not carry a private copy of the labels', () => {
    const view = readFileSync(resolve(root, 'views/DesignView.jsx'), 'utf8')
    expect(view).toMatch(/const ROLE_LABELS = BRAND_ROLE_LABELS/)
    expect(view).toMatch(/BRAND_ROLE_KEYS\.map/)
  })
})

describe('the extra jobs are optional, not empty failures', () => {
  it('adds no default for Secondary, Accents 2-3 or Neutrals', () => {
    /* This asserted that a COMMENT existed. An audit appended real defaults to
       `effectiveRoles`, left the comment untouched, and the suite stayed green
       — a test named for behaviour that checked prose. It is the same vacuous
       shape as the one two tests up, and I wrote both in the same sitting.

       Behaviour now. `mapPaletteRoles` is what the view falls back to, so if it
       invents values for the new jobs then every project gets colours in roles
       nobody chose. An unassigned job is unanswered, not wrong — and inventing
       an answer is how a brand-new project ended up reporting a readability
       failure it had not caused. */
    const derived = mapPaletteRoles(['#1C1917', '#FAFAF9', '#0F766E', '#A8A29E'])
    for (const k of ['secondary', 'accent2', 'accent3', 'neutral', 'neutral2']) {
      expect(derived[k], `${k} must not be invented`).toBeFalsy()
    }
  })

  it('health scoring still runs on the original four', () => {
    // Widening what CAN be assigned must not widen what gets SCORED — more
    // scored pairs on a bigger palette is the "measurement that punished use"
    // this codebase already reverted once.
    expect(HEALTH_ROLE_KEYS).toEqual(['cover', 'text', 'accent', 'quiet'])
  })
})

describe('the store really accepts and keeps every job', () => {
  /* The gap an audit proved by mutation: it made `setColorRole` silently drop
     the five new keys while still reporting success, and the whole suite
     stayed 999/999. Every assertion in this file was either a constant or a
     regex over source text — nothing ever called the store. That is exactly
     the bug the file claims to prevent: a chip offered in the UI and rejected
     on save, with the click appearing to do nothing. */
  beforeEach(() => {
    useAppStore.setState({
      projects: [{ id: 'p1', name: 'T', colorRoles: {} }],
      currentProjectId: 'p1',
    })
  })

  for (const role of ['secondary', 'accent2', 'accent3', 'neutral', 'neutral2']) {
    it(`accepts and persists ${role}`, () => {
      const res = useAppStore.getState().setColorRole(role, '#7C3AED')
      expect(res?.ok, `${role} was rejected`).not.toBe(false)
      const saved = useAppStore.getState().projects[0].colorRoles
      expect(saved[role], `${role} did not persist`).toBe('#7C3AED')
    })
  }

  it('still rejects a job that does not exist', () => {
    // The whitelist must widen, not disappear.
    const res = useAppStore.getState().setColorRole('sparkle', '#7C3AED')
    expect(res.ok).toBe(false)
  })

  it('keeps the original four working', () => {
    for (const role of HEALTH_ROLE_KEYS) {
      useAppStore.getState().setColorRole(role, '#0F766E')
    }
    const saved = useAppStore.getState().projects[0].colorRoles
    for (const role of HEALTH_ROLE_KEYS) expect(saved[role]).toBe('#0F766E')
  })
})
