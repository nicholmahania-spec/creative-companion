import { describe, expect, it } from 'vitest'
import {
  blankWorkspaceState,
  createBlankProject,
} from '../../store/useAppStore'
import {
  buildBrandPackSnapshot,
  downloadWorkspaceBackup,
  packReadiness,
  selectPackPins,
} from './exportFiles'

describe('backup / pack smoke (logic)', () => {
  it('blank workspace serializes and restores shape', () => {
    const a = blankWorkspaceState()
    const json = JSON.stringify({
      projects: a.projects,
      tasks: a.tasks,
      moodItems: a.moodItems,
      prefs: a.prefs,
    })
    const b = JSON.parse(json)
    expect(b.projects).toHaveLength(1)
    expect(b.tasks).toEqual([])
    expect(b.moodItems).toEqual([])
  })

  it('selectPackPins ignores unstarred pins', () => {
    const { pins } = selectPackPins([
      { id: 1, inPack: false, note: 'no' },
      { id: 2, inPack: true, note: 'yes', packOrder: 0 },
    ])
    expect(pins).toHaveLength(1)
    expect(pins[0].note).toBe('yes')
  })

  it('packReadiness deep-links missing tagline to Design essentials', () => {
    const pack = buildBrandPackSnapshot({
      project: createBlankProject('Demo', 'Brief here'),
      tasks: [],
      moodItems: [],
    })
    const r = packReadiness(pack)
    const tag = r.checks.find((c) => c.id === 'tagline')
    expect(tag.ok).toBe(false)
    expect(tag.view).toBe('brand')
    expect(tag.section).toBe('essentials')
    // Brief fills detective + positioning; still missing pins/tagline/voice
    expect(r.checks.find((c) => c.id === 'detective')?.ok).toBe(true)
    expect(r.checks.find((c) => c.id === 'pins')?.ok).toBe(false)
    expect(r.checks.find((c) => c.id === 'handoff')?.view).toBe('finish')
  })
})

/**
 * The backup shipped a 0-byte file.
 *
 * `runExport` captures a File System Access handle for every export kind.
 * Chrome creates the file the moment the Save dialog is confirmed, so a writer
 * that ignores the handle leaves the picker's empty placeholder on disk — and
 * the anchor fallback still returns ok, so the app said "Backup saved" over
 * nothing. Confirmed in the wild as a 0-byte
 * creative-companion-backup-2026-08-06.json.
 *
 * These assert the two halves that were wrong: the handle is used when given,
 * and `ok` is never true unless bytes were actually written.
 */
describe('workspace backup writes real bytes', () => {
  const workspace = () => ({
    version: 1,
    projects: [createBlankProject('Demo', 'Brief here')],
    tasks: [],
    moodItems: [],
  })

  /** A File System Access handle that records what it was asked to write. */
  function fakeHandle() {
    const chunks = []
    let closed = false
    return {
      chunks,
      get closed() {
        return closed
      },
      createWritable: async () => ({
        write: async (b) => chunks.push(b),
        close: async () => {
          closed = true
        },
      }),
    }
  }

  it('writes the workspace through the save handle, not around it', async () => {
    const handle = fakeHandle()
    const result = await downloadWorkspaceBackup(workspace(), Promise.resolve(handle))

    expect(result.ok).toBe(true)
    expect(result.method).toBe('file-picker')
    expect(handle.closed).toBe(true)
    expect(handle.chunks).toHaveLength(1)

    // The bug in one assertion: the file must not be empty.
    const written = await handle.chunks[0].text()
    expect(written.length).toBeGreaterThan(0)

    const parsed = JSON.parse(written)
    expect(parsed.projects).toHaveLength(1)
    expect(parsed.exportedAt).toBeTruthy()
  })

  it('reports a dismissed dialog as cancelled, never as saved', async () => {
    const abort = Object.assign(new Error('The user aborted a request.'), {
      name: 'AbortError',
    })
    const result = await downloadWorkspaceBackup(
      workspace(),
      Promise.reject(abort)
    )
    expect(result.ok).toBe(false)
    expect(result.cancelled).toBe(true)
  })

  it('refuses a workspace with no projects rather than writing an empty backup', async () => {
    const handle = fakeHandle()
    const result = await downloadWorkspaceBackup(
      { version: 1, projects: [], tasks: [] },
      Promise.resolve(handle)
    )
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/no projects/i)
    expect(handle.chunks).toHaveLength(0)
  })
})
