import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useAppStore from './useAppStore'

/**
 * No client-supplied attachment reaches the Research wall.
 *
 * THIS TEST CHANGED MEANING, and the reason is the point of it.
 *
 * It used to assert that a *verified* client attachment was pinned and a
 * hostile one was not — the P2-1 contract, where the danger was a stranger's
 * host ending up in the designer's exports. That contract is now subsumed by a
 * stricter one. On the owner's confidentiality ruling (2026-08-12)
 * `client-uploads` is private (20260812123000), so there is no longer any such
 * thing as a durable URL for one of these files — reads are signed, and a
 * signed URL lives an hour.
 *
 * A pin's `visual` is stored verbatim and read back for months — by the wall,
 * `buildBrandPackSnapshot`, the delivered pack and the PDF. A signed URL lives
 * an hour. Pinning one would fill the board with images that work until they
 * quietly do not, which is worse than not pinning: an empty board is a thing
 * you can act on, a board of dead thumbnails is a thing you distrust.
 *
 * So the invariant is now absolute and easy to check: NOTHING from a client
 * submission becomes a mood pin. The attachment is not lost — it is on the
 * brief, where the client put it, and the Define sheet renders it signed.
 *
 * Restoring the wall placement means teaching pins to hold an object reference
 * instead of a URL. That is a change to Research and the brand pack, and it is
 * recorded for that pass rather than guessed at here.
 */

const HOST = 'https://shzkqbtoepqqdkjgupry.supabase.co'
const PORTAL = '11111111-1111-4111-8111-111111111111'
const GOOD = `${HOST}/storage/v1/object/public/client-uploads/${PORTAL}/1754870000000-1.png`
const EVIL = `https://evil.test/storage/v1/object/public/client-uploads/${PORTAL}/1754870000000-1.png`

const PROJECT = 'project-a'

const blank = (id) => ({
  id,
  name: id,
  detective: {},
  discoveryAnswers: {},
  palette: [],
  directions: [],
  tasks: [],
})

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', HOST)
  useAppStore.setState({
    projects: [blank(PROJECT)],
    currentProjectId: PROJECT,
    moodItems: [],
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const pins = () => useAppStore.getState().moodItems
const project = () => useAppStore.getState().projects[0]

describe('mergeDiscoveryAnswers', () => {
  it('pins nothing, even for a perfectly valid client upload', () => {
    useAppStore.getState().mergeDiscoveryAnswers(PROJECT, {
      inspirationLinksFiles: [{ name: 'mood.png', url: GOOD }],
    })
    expect(pins()).toHaveLength(0)
  })

  it('pins nothing for a hostile URL either', () => {
    useAppStore.getState().mergeDiscoveryAnswers(PROJECT, {
      inspirationLinksFiles: [{ name: 'mood.png', url: EVIL }],
    })
    expect(pins()).toHaveLength(0)
  })

  it('pins nothing for a database-stamped path', () => {
    /* The one shape that carries a real proof still does not get pinned — the
       objection is durability, not trust. */
    useAppStore.getState().mergeDiscoveryAnswers(PROJECT, {
      inspirationLinksFiles: [
        { name: 'ok', url: GOOD, path: `${PORTAL}/1754870000000-1.png` },
      ],
    })
    expect(pins()).toHaveLength(0)
  })

  it('still records the answers and the attachment on the brief', () => {
    /* Not pinning must not mean not KEEPING. The client's typed answers cost
       them twenty minutes, and the attachment is the evidence behind one of
       them. Both survive; only the wall placement does not. */
    useAppStore.getState().mergeDiscoveryAnswers(PROJECT, {
      goal: 'Launch the harbour brand',
      inspirationLinksFiles: [{ name: 'mood.png', url: GOOD }],
    })
    expect(project().discoveryAnswers.goal).toBe('Launch the harbour brand')
    expect(project().detective.inspirationLinksFiles).toEqual([
      { name: 'mood.png', url: GOOD },
    ])
    expect(pins()).toHaveLength(0)
  })
})

describe('mergeDetectiveAnswers', () => {
  it('pins nothing', () => {
    useAppStore.getState().mergeDetectiveAnswers(
      { inspirationLinksFiles: [{ name: 'mood.png', url: GOOD }] },
      PROJECT
    )
    expect(pins()).toHaveLength(0)
  })

  it('still merges the attachment into the brief additively', () => {
    useAppStore.setState({
      projects: [
        {
          ...blank(PROJECT),
          detective: { inspirationLinksFiles: [{ name: 'mine', url: 'local' }] },
        },
      ],
      currentProjectId: PROJECT,
      moodItems: [],
    })
    useAppStore.getState().mergeDetectiveAnswers(
      { inspirationLinksFiles: [{ name: 'theirs', url: GOOD }] },
      PROJECT
    )
    expect(project().detective.inspirationLinksFiles.map((f) => f.name)).toEqual([
      'mine',
      'theirs',
    ])
    expect(pins()).toHaveLength(0)
  })
})

describe('the store does not reach the storage layer at all', () => {
  it('imports no Supabase client and no attachment signing path', async () => {
    /* Structural, not behavioural: the merge actions cannot leak a storage URL
       onto the wall if the store has no way to produce one. Also keeps the
       SDK out of the store's bundle, which was the original reason
       attachmentUrl.js reads the env directly. */
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(process.cwd(), 'src/store/useAppStore.js'), 'utf8')
    expect(src).not.toContain('attachmentAccess')
    expect(src).not.toContain("from '../lib/supabase'")
  })
})
