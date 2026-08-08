/**
 * Whose name goes on the client's copy.
 *
 * THE DEFECT, found by driving the built app. `project.name` is the
 * designer's internal job name — the label they picked to find the thing in a
 * list. On the walkthrough project it was "My project", and that is what the
 * brand pack put in the running footer of every page, on the cover, in the
 * markdown heading and in the downloaded filename. The artboard on screen had
 * already been fixed to show the client's name, so the preview and the export
 * disagreed with each other as well as with the client.
 *
 * `detective.clientName` is the client's own answer to "Client / company
 * name". One resolver, so a third copy of `clientName || name` cannot drift
 * away from the other two.
 */

import { describe, expect, it } from 'vitest'
import { clientFacingName } from './clientRecord'
import { buildBrandPackSnapshot } from '../book/exportFiles'

const pack = (project) =>
  buildBrandPackSnapshot({ project, tasks: [], moodItems: [] })

describe('clientFacingName', () => {
  it('prefers the client’s own answer over the internal job name', () => {
    expect(
      clientFacingName({
        name: 'My project',
        detective: { clientName: 'Ember & Oak' },
      })
    ).toBe('Ember & Oak')
  })

  it('falls back to the job name while the brief is empty', () => {
    // An internal name on the cover beats no name on the cover.
    expect(clientFacingName({ name: 'My project' })).toBe('My project')
    expect(clientFacingName({ name: 'My project', detective: {} })).toBe(
      'My project'
    )
  })

  it('ignores whitespace-only answers', () => {
    expect(
      clientFacingName({ name: 'My project', detective: { clientName: '   ' } })
    ).toBe('My project')
  })

  it('has a last resort rather than an empty cover', () => {
    expect(clientFacingName({})).toBe('Untitled project')
    expect(clientFacingName(null)).toBe('Untitled project')
  })
})

describe('the pack the client receives', () => {
  it('is named for the client, not for the job', () => {
    const p = pack({
      name: 'My project',
      detective: { clientName: 'Ember & Oak' },
    })
    expect(p.projectName).toBe('Ember & Oak')
  })

  it('still has a name when the brief has not been started', () => {
    expect(pack({ name: 'My project', detective: {} }).projectName).toBe(
      'My project'
    )
  })

  /* `projectName` is the single field the cover, the footer, the markdown
     heading and every export filename read. Fixing it in the snapshot is what
     makes one edit reach all of them; a second resolver downstream would put
     the drift straight back. */
  it('leaves the internal project name alone', () => {
    const project = {
      name: 'My project',
      detective: { clientName: 'Ember & Oak' },
    }
    pack(project)
    expect(project.name).toBe('My project')
  })
})
