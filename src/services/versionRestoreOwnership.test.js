import { beforeEach, describe, expect, it, vi } from 'vitest'
import useAppStore from '../store/useAppStore'
import versionService from './versionService'

/**
 * Phase 4A — a Project Version is an Identity recovery overlay.
 *
 * Restore may only write fields the snapshot represents. Brief, deadline,
 * detective, Directions, tasks and published Identity snapshots are never
 * written — including when a legacy record still carries them.
 *
 * `logoImage` is read only as a legacy compatibility path. New Versions store
 * `chosenMarkConceptId` instead of image bytes.
 *
 * The first test greps restore for `data.<key>` so a future unsnapshotted
 * write fails here. `logoImage` is the one allowed exception.
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

    const unbacked = [...new Set(read)]
      .filter((k) => !snapshotKeys.has(k) && k !== 'logoImage')
      .sort()
    expect(
      unbacked,
      `restoreVersion writes from data.${unbacked.join(', data.')} but ` +
        'createVersionSnapshot never stores those keys, so a restore blanks them'
    ).toEqual([])
  })

  it('new versions do not capture Brief, Directions or tasks', async () => {
    const s = () => useAppStore.getState()
    s().updateDetective('clientName', 'Harbor & Hearth')
    s().updateDetective('goal', 'Look established')
    expect(current().brief).toContain('Harbor & Hearth')

    const version = await snapshot()
    expect(version.data).not.toHaveProperty('detective')
    expect(version.data).not.toHaveProperty('brief')
    expect(version.data).not.toHaveProperty('deadline')
    expect(version.data).not.toHaveProperty('directions')
    expect(version.data).not.toHaveProperty('tasks')
    expect(version.data).not.toHaveProperty('logoImage')
  })

  it('does not roll the Brief backward', async () => {
    const s = () => useAppStore.getState()
    s().updateDetective('clientName', 'Harbor & Hearth')
    s().updateDetective('goal', 'Look established')
    const version = await snapshot()

    s().updateDetective('goal', 'Something else entirely')
    expect(current().brief).toContain('Something else entirely')

    expect((await restore(version)).ok).toBe(true)
    expect(current().detective.goal).toBe('Something else entirely')
    expect(current().brief).toContain('Something else entirely')
    expect(current().brief).toContain('Harbor & Hearth')
  })

  it('cannot silently blank the brief', async () => {
    const s = () => useAppStore.getState()
    s().updateDetective('clientName', 'Harbor & Hearth')
    const version = await snapshot()

    expect((await restore(version)).ok).toBe(true)
    expect(current().brief.trim()).not.toBe('')
    expect(current().brief).toContain('Harbor & Hearth')
  })

  it('cannot silently blank the deadline, and does not roll a schedule back', async () => {
    const s = () => useAppStore.getState()
    s().setProjectDeadline('2027-02-19')
    const version = await snapshot()

    // The date moves after the snapshot is taken.
    s().setProjectDeadline('2027-04-01')

    expect((await restore(version)).ok).toBe(true)
    /* Restoring the DESIGN to an earlier version must not move the project's
       due date — and above all must not clear it, which is what it used to do. */
    expect(current().deadline).toBe('2027-04-01')
    expect(current().detective.projectDeadline).toBe('2027-04-01')
  })

  it('leaves the deadline alone even when the project never had one', async () => {
    const version = await snapshot()
    expect((await restore(version)).ok).toBe(true)
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

    expect((await restore(version)).ok).toBe(true)
    const p = current()
    expect(p.tagline).toBe('Made on the date')
    expect(p.positioning).toBe('For makers who ship')
    expect(p.typeHeading).toBe('Fraunces SemiBold')
    expect(p.palette).toEqual(['#1B4C7E', '#F5EFE6'])
    expect(p.logoDirection).toBe('survives a 12mm stamp')
  })

  it('does not restore Directions', async () => {
    const s = () => useAppStore.getState()
    const slot = s().addDirection()
    s().updateDirection(slot, { title: 'Quiet serif', note: 'First take' })
    const version = await snapshot()

    s().updateDirection(slot, { title: 'Warm editorial', note: 'Later' })
    expect((await restore(version)).ok).toBe(true)
    const dir = current().directions.find((d) => d.id === slot)
    expect(dir.title).toBe('Warm editorial')
    expect(dir.note).toBe('Later')
    expect(dir.recordId).toBeTruthy()
  })

  it('does not restore tasks', async () => {
    const s = () => useAppStore.getState()
    s().addTask({ id: 'task-live', title: 'Call the client', completed: false })
    const version = await snapshot()
    expect(version.data).not.toHaveProperty('tasks')

    s().addTask({ id: 'task-later', title: 'Send first draft', completed: false })
    expect((await restore(version)).ok).toBe(true)
    const titles = useAppStore.getState().tasks.map((t) => t.title)
    expect(titles).toContain('Call the client')
    expect(titles).toContain('Send first draft')
  })

  it('does not modify published Identity snapshots', async () => {
    const { buildIdentitySnapshot } = await import('../lib/artifacts/identitySnapshot')
    const s = () => useAppStore.getState()
    s().updateBrandField('tagline', 'First send')
    s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
    const published = buildIdentitySnapshot(current())
    s().recordPublishedIdentity(published)
    const version = await snapshot()

    s().updateBrandField('tagline', 'Later work')
    s().setProjectPalette(['#111111', '#EEEEEE'])
    const before = JSON.parse(JSON.stringify(current().identitySnapshots))

    expect((await restore(version)).ok).toBe(true)
    expect(current().identitySnapshots).toEqual(before)
    expect(current().identitySnapshots[0].snapshotId).toBe(published.snapshotId)
    expect(current().tagline).toBe('First send')
  })

  it('keeps the Version record unchanged after live edits', async () => {
    const s = () => useAppStore.getState()
    s().updateBrandField('tagline', 'Saved line')
    s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
    const version = await snapshot()
    const frozen = JSON.parse(JSON.stringify(version.data))

    s().updateBrandField('tagline', 'Changed later')
    s().setProjectPalette(['#000000', '#FFFFFF'])
    version.data.tagline = 'mutated caller copy'

    expect(frozen.tagline).toBe('Saved line')
    expect(frozen.palette).toEqual(['#1B4C7E', '#FAFAF9'])
    expect(current().tagline).toBe('Changed later')
  })

  it('restores palette through the canonical writer', async () => {
    const { resolveRef } = await import('../lib/artifacts/artifactRef')
    const s = () => useAppStore.getState()
    s().setProjectPalette(['#1B4C7E', '#FAFAF9'])
    const firstRef = current().currentPaletteRef.id
    const version = await snapshot()

    s().setProjectPalette(['#111111', '#EEEEEE'])
    expect(current().currentPaletteRef.id).not.toBe(firstRef)

    expect((await restore(version)).ok).toBe(true)
    expect(current().palette).toEqual(['#1B4C7E', '#FAFAF9'])
    expect(current().currentPaletteRef.id).toBe(firstRef)
    expect(resolveRef(current(), current().currentPaletteRef).hexes).toEqual([
      '#1B4C7E',
      '#FAFAF9',
    ])
  })

  it('does not invent Plus Jakarta Sans when type faces are missing', async () => {
    const s = () => useAppStore.getState()
    s().updateBrandField('typeHeading', 'Fraunces SemiBold')
    s().updateBrandField('typeBody', 'Inter Regular')
    const version = await snapshot()
    delete version.data.typeHeading
    delete version.data.typeBody

    expect((await restore(version)).ok).toBe(true)
    expect(current().typeHeading).toBe('Fraunces SemiBold')
    expect(current().typeBody).toBe('Inter Regular')
    expect(current().typeHeading).not.toMatch(/Plus Jakarta/)
    expect(current().typeBody).not.toMatch(/Plus Jakarta/)
  })

  it('restores a chosen mark concept that still exists, without image bytes', async () => {
    const s = () => useAppStore.getState()
    const a = s().addLogoConcept('data:image/png;base64,AAAA')
    const b = s().addLogoConcept('data:image/png;base64,BBBB')
    s().chooseLogoConcept(a)
    s().setLogoDirection('survives a 12mm stamp')
    const version = await snapshot()
    expect(version.data.chosenMarkConceptId).toBe(a)
    expect(version.data).not.toHaveProperty('logoImage')
    expect(JSON.stringify(version.data)).not.toMatch(/data:image/)

    s().chooseLogoConcept(b)
    s().setLogoDirection('different sentence')
    const result = await restore(version)
    expect(result.ok).toBe(true)
    expect(result.missingMarkConcept).toBe(false)
    const chosen = current().logoConcepts.find((c) => c.chosen)
    expect(chosen.id).toBe(a)
    expect(current().logoImage).toBe('data:image/png;base64,AAAA')
    expect(current().logoDirection).toBe('survives a 12mm stamp')
  })

  it('does not erase the live mark when the saved concept is gone', async () => {
    const s = () => useAppStore.getState()
    const a = s().addLogoConcept('data:image/png;base64,AAAA')
    const b = s().addLogoConcept('data:image/png;base64,BBBB')
    s().chooseLogoConcept(a)
    const version = await snapshot()

    s().chooseLogoConcept(b)
    s().removeLogoConcept(a)
    expect(current().logoImage).toBe('data:image/png;base64,BBBB')

    const result = await restore(version)
    expect(result.ok).toBe(true)
    expect(result.missingMarkConcept).toBe(true)
    expect(current().logoImage).toBe('data:image/png;base64,BBBB')
    expect(current().logoConcepts.find((c) => c.chosen)?.id).toBe(b)
  })

  it('legacy records with detective, directions and omitted images do not crash', async () => {
    const s = () => useAppStore.getState()
    s().updateDetective('goal', 'Stay put')
    s().updateBrandField('tagline', 'Live tagline')
    const slot = s().addDirection()
    s().updateDirection(slot, { title: 'Live route' })
    s().addLogoConcept('data:image/png;base64,LIVE')

    const legacy = {
      id: 'legacy-v1',
      projectId: current().id,
      data: {
        tagline: 'Old tagline',
        detective: { goal: 'Should not return', clientName: 'Ghost' },
        directions: [{ id: slot, title: 'Ghost route', note: '', chosen: true }],
        tasks: [{ id: 'ghost', title: 'Ghost task', completed: true }],
        logoImage: '[image-omitted]',
        brief: 'Ghost brief',
        deadline: '1999-01-01',
      },
    }

    const result = await restore(legacy)
    expect(result.ok).toBe(true)
    expect(current().tagline).toBe('Old tagline')
    expect(current().detective.goal).toBe('Stay put')
    expect(current().brief).toContain('Stay put')
    expect(current().directions.find((d) => d.id === slot).title).toBe('Live route')
    expect(current().logoImage).toBe('data:image/png;base64,LIVE')
  })
})
