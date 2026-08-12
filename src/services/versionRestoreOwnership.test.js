import { beforeEach, describe, expect, it, vi } from 'vitest'
import useAppStore from '../store/useAppStore'
import versionService from './versionService'

/**
 * A RESTORE MAY ONLY WRITE WHAT THE SNAPSHOT HOLDS.
 *
 * THE BUG THESE PIN (audit F2). `restoreVersion` called
 * `updateProjectBrief(data.brief || '')` and `setProjectDeadline(data.deadline
 * || '')`, and `createVersionSnapshot` writes neither key. Both reads were
 * therefore always `undefined`, both setters always received `''`, and every
 * restore silently blanked the project's brief and its deadline.
 *
 * Neither field was added to the snapshot, because neither belongs in one:
 * `brief` is derived from `detective` (which IS snapshotted), and `deadline` is
 * a schedule rather than design work. So the invariant is enforced from the
 * other side — restore stopped writing them.
 *
 * The first test is the general form and is the one that matters: it derives
 * both sides from the code rather than from a list someone has to remember to
 * update, so a future restore line for an unsnapshotted field fails here.
 */

const fresh = (name = 'Restore test') => {
  useAppStore.getState().clearToEmpty()
  return useAppStore.getState().createNewProject(name)
}

const current = () => {
  const s = useAppStore.getState()
  return s.projects.find((p) => p.id === s.currentProjectId)
}

/** Snapshot the current project without touching stored version history. */
const snapshot = () => versionService.createVersionSnapshot({ changeType: 'test' })

/** Restore a snapshot object directly, bypassing storage. */
const restore = async (version) => {
  const spy = vi
    .spyOn(versionService, 'getVersionById')
    .mockResolvedValue(version)
  try {
    return await versionService.restoreVersion(version.id)
  } finally {
    spy.mockRestore()
  }
}

describe('the restore/snapshot contract', () => {
  beforeEach(() => {
    fresh()
  })

  it('never restores a field the snapshot does not store', async () => {
    const version = await snapshot()
    const snapshotKeys = new Set(Object.keys(version.data))

    /* Read the restore body and collect every `data.<key>` it touches. A grep
       rather than a behavioural probe, because the failure mode is a NEW line
       being added for a field nobody remembered to snapshot — which is exactly
       how `brief` and `deadline` got here. */
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const src = readFileSync(fileURLToPath(new URL('./versionService.js', import.meta.url)), 'utf8')
    const body = src.slice(
      src.indexOf('async restoreVersion(versionId)'),
      src.indexOf('Export version history as JSON')
    )
    const code = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    const read = [...code.matchAll(/\bdata\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1])

    const unbacked = [...new Set(read)].filter((k) => !snapshotKeys.has(k)).sort()
    expect(
      unbacked,
      `restoreVersion writes from data.${unbacked.join(', data.')} but ` +
        'createVersionSnapshot never stores those keys, so a restore blanks them'
    ).toEqual([])
  })

  it('snapshots the detective answers a brief is composed from', async () => {
    const s = () => useAppStore.getState()
    s().updateDetective('clientName', 'Harbor & Hearth')
    s().updateDetective('goal', 'Look established')
    expect(current().brief).toContain('Harbor & Hearth')

    const version = await snapshot()
    expect(version.data.detective.clientName).toBe('Harbor & Hearth')
    expect(version.data.detective.goal).toBe('Look established')
    /* The composed summary is deliberately NOT a snapshot key — it would be a
       second copy of the same answers, able to disagree with them. */
    expect(version.data).not.toHaveProperty('brief')
    expect(version.data).not.toHaveProperty('deadline')
  })

  it('reproduces the brief from the snapshotted answers', async () => {
    const s = () => useAppStore.getState()
    s().updateDetective('clientName', 'Harbor & Hearth')
    s().updateDetective('goal', 'Look established')
    const version = await snapshot()

    // Move on, then go back.
    s().updateDetective('goal', 'Something else entirely')
    expect(current().brief).toContain('Something else entirely')

    expect(await restore(version)).toBe(true)
    expect(current().detective.goal).toBe('Look established')
    expect(current().brief).toContain('Look established')
    expect(current().brief).toContain('Harbor & Hearth')
    expect(current().brief).not.toContain('Something else entirely')
  })

  it('cannot silently blank the brief', async () => {
    const s = () => useAppStore.getState()
    s().updateDetective('clientName', 'Harbor & Hearth')
    const version = await snapshot()

    expect(await restore(version)).toBe(true)
    expect(current().brief.trim()).not.toBe('')
    expect(current().brief).toContain('Harbor & Hearth')
  })

  it('cannot silently blank the deadline, and does not roll a schedule back', async () => {
    const s = () => useAppStore.getState()
    s().setProjectDeadline('2027-02-19')
    const version = await snapshot()

    // The date moves after the snapshot is taken.
    s().setProjectDeadline('2027-04-01')

    expect(await restore(version)).toBe(true)
    /* Restoring the DESIGN to an earlier version must not move the project's
       due date — and above all must not clear it, which is what it used to do. */
    expect(current().deadline).toBe('2027-04-01')
    expect(current().detective.projectDeadline).toBe('2027-04-01')
  })

  it('leaves the deadline alone even when the project never had one', async () => {
    const version = await snapshot()
    expect(await restore(version)).toBe(true)
    expect(current().deadline).toBe('')
  })

  it('still restores every other snapshotted field', async () => {
    const s = () => useAppStore.getState()
    s().updateBrandField('tagline', 'Made on the date')
    s().updateBrandField('positioning', 'For makers who ship')
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().setProjectPalette(['#1B4C7E', '#F5EFE6'])
    s().setLogoDirection('survives a 12mm stamp')
    const version = await snapshot()

    s().updateBrandField('tagline', 'Something else')
    s().updateBrandField('positioning', 'Drifted')
    s().updateBrandField('typeHeading', 'Inter Bold')
    s().setProjectPalette(['#000000'])
    s().setLogoDirection('drifted too')

    expect(await restore(version)).toBe(true)
    const p = current()
    expect(p.tagline).toBe('Made on the date')
    expect(p.positioning).toBe('For makers who ship')
    expect(p.typeHeading).toBe('Fraunces SemiBold')
    expect(p.palette).toEqual(['#1B4C7E', '#F5EFE6'])
    expect(p.logoDirection).toBe('survives a 12mm stamp')
  })
})
