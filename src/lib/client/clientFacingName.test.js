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
import { clientFacingName, wordmarkName } from './clientRecord'
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

/**
 * WHOSE NAME GOES ON A WORDMARK LOCKUP.
 *
 * The four lockups on the direction sheet read `logoWordmark || project.name`
 * and consulted `detective.clientName` nowhere, so the sheet's own heading
 * said the client's name while the four lockups directly under it said the
 * designer's internal job label — on a sheet the client receives.
 */
describe('wordmarkName', () => {
  it('uses the client’s own answer when there is one', () => {
    expect(
      wordmarkName({
        name: 'My project',
        logoWordmark: 'EMBER',
        detective: { clientName: 'Ember & Oak' },
      })
    ).toBe('Ember & Oak')
  })

  it('uses the typed wordmark when the brief has no client name', () => {
    expect(
      wordmarkName({ name: 'My project', logoWordmark: 'EMBER', detective: {} })
    ).toBe('EMBER')
  })

  it('falls back to the job name when neither exists', () => {
    // Not ideal, but an empty lockup is worse than an internal one.
    expect(wordmarkName({ name: 'My project' })).toBe('My project')
  })

  it('has a last resort, and it can be overridden', () => {
    expect(wordmarkName({})).toBe('Wordmark')
    expect(wordmarkName({}, '')).toBe('')
  })

  it('ignores whitespace-only values at every step', () => {
    expect(
      wordmarkName({
        name: 'My project',
        logoWordmark: '  ',
        detective: { clientName: '   ' },
      })
    ).toBe('My project')
  })

  /* The heading and the lockups sit inches apart on one sheet. They resolve
     through different helpers because a wordmark is a decision of its own,
     so this pins the case where they must still agree. */
  it('agrees with the sheet heading when no wordmark was typed', () => {
    const project = { name: 'My project', detective: { clientName: 'Ember & Oak' } }
    expect(wordmarkName(project)).toBe(clientFacingName(project))
  })
})
