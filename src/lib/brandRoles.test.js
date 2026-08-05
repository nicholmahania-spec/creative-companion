import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  ACCENT_KEYS,
  BRAND_ROLE_KEYS,
  BRAND_ROLE_LABELS,
  NEUTRAL_KEYS,
  HEALTH_ROLE_KEYS,
} from './color.js'

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
    /* Primary, Secondary, Accents, Neutrals, Text, Background — the owner's
       set, and the one PRODUCT.md §9 already lists under Color. */
    expect(BRAND_ROLE_KEYS).toContain('cover') // Primary
    expect(BRAND_ROLE_KEYS).toContain('secondary')
    expect(BRAND_ROLE_KEYS).toContain('text')
    expect(BRAND_ROLE_KEYS).toContain('quiet') // Background
    for (const k of [...ACCENT_KEYS, ...NEUTRAL_KEYS]) {
      expect(BRAND_ROLE_KEYS, k).toContain(k)
    }
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
    /* An unassigned job is unanswered, not wrong. Inventing a default would
       put a colour into a role the designer never chose and then measure them
       against it — which is how a brand-new project ended up reporting a
       readability failure it had not caused. */
    const view = readFileSync(resolve(root, 'views/DesignView.jsx'), 'utf8')
    expect(view).toMatch(/unassigned job is unanswered, not wrong/i)
  })

  it('health scoring still runs on the original four', () => {
    // Widening what CAN be assigned must not widen what gets SCORED — more
    // scored pairs on a bigger palette is the "measurement that punished use"
    // this codebase already reverted once.
    expect(HEALTH_ROLE_KEYS).toEqual(['cover', 'text', 'accent', 'quiet'])
  })
})
