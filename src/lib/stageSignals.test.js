import { describe, expect, it } from 'vitest'
import { stageSignalLines } from './stageSignals'

/**
 * The stage hides the shell, so these two lines are the only way a stop can
 * report that someone is waiting or that you left yourself something. The
 * rules worth pinning are the ones about SILENCE — a signal that cries wolf
 * at zero is one the designer learns to stop reading, and this edge sits in
 * front of them for the whole of every stop.
 */
describe('stage edge signals', () => {
  it('says nothing when nothing is providing them', () => {
    /* Not the same fact as an empty inbox: outside the shell there is no
       inbox to be empty. Both are silent; only one could have spoken. */
    expect(stageSignalLines(null)).toEqual([])
    expect(stageSignalLines(undefined)).toEqual([])
  })

  it('never prints a zero', () => {
    /* "To-do · 0" is a scoreboard of nothing — the read the header pill
       already refuses. */
    expect(stageSignalLines({ unreadClient: false, todoCount: 0 })).toEqual([])
    expect(stageSignalLines({})).toEqual([])
  })

  it('reports each signal on its own, in words not codes', () => {
    expect(stageSignalLines({ todoCount: 3 })).toEqual(['To-do · 3'])
    expect(stageSignalLines({ unreadClient: true })).toEqual(['Client · unread'])
  })

  it('puts the client first when both are live', () => {
    /* Someone is waiting at the other end of one of these and not the other. */
    expect(stageSignalLines({ unreadClient: true, todoCount: 2 })).toEqual([
      'Client · unread',
      'To-do · 2',
    ])
  })

  it('survives a count that is not a number', () => {
    expect(stageSignalLines({ todoCount: undefined })).toEqual([])
    expect(stageSignalLines({ todoCount: 'many' })).toEqual([])
  })
})
