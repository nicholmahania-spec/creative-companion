import { describe, it, expect } from 'vitest'
import { labelForStepId } from '../journey/journey'
import { buildInboxRows, portalSeenSnapshot } from './clientInbox'

const projects = [{ id: 7, name: 'Acme rebrand' }]

const portal = {
  id: 'p1',
  project_local_id: '7',
  client_name: 'Acme',
  step_status: { define: { status: 'approved', note: '' } },
  form_status: 'not_sent',
  updated_at: '2026-07-01T00:00:00Z',
}

const msg = (id, sender, body, at) => ({
  id,
  portal_id: 'p1',
  sender,
  body,
  created_at: at,
})

describe('buildInboxRows', () => {
  it('resolves the project name onto every row', () => {
    const { rows } = buildInboxRows([portal], [], {}, projects)
    expect(rows.every((r) => r.projectName === 'Acme rebrand')).toBe(true)
  })

  it('uses neutral, non-verdict wording for change requests', () => {
    const p = {
      ...portal,
      step_status: { design: { status: 'changes_requested', note: 'Try navy?' } },
    }
    const { rows } = buildInboxRows([p], [], {}, projects)
    /* Reads the stop's name from the journey rather than restating it. As the
       literal 'Design' this asserted a label the app had renamed, so a correct
       rename failed here — the same stale-copy trap the source had. */
    expect(rows[0].title).toBe(`Notes from Acme on ${labelForStepId('design')}`)
    expect(rows[0].title).not.toMatch(/reject|changes requested/i)
    // The client's actual words are on the row, not hidden behind an open.
    expect(rows[0].preview).toBe('Try navy?')
  })

  it('marks everything unread when nothing has been seen', () => {
    const { rows, hasUnread } = buildInboxRows([portal], [], {}, projects)
    expect(hasUnread).toBe(true)
    expect(rows[0].unread).toBe(true)
  })

  it('marks a step read once its exact status+note has been seen', () => {
    const seen = { p1: portalSeenSnapshot(portal, []) }
    const { rows, hasUnread } = buildInboxRows([portal], [], seen, projects)
    expect(hasUnread).toBe(false)
    expect(rows[0].unread).toBe(false)
  })

  it('re-flags a step when the client edits their note', () => {
    const seen = { p1: portalSeenSnapshot(portal, []) }
    const changed = {
      ...portal,
      step_status: { define: { status: 'changes_requested', note: 'Actually, hold on' } },
    }
    const { rows } = buildInboxRows([changed], [], seen, projects)
    expect(rows[0].unread).toBe(true)
  })

  it('does not let new activity re-flag an already-seen approval', () => {
    // The whole reason unread is a content diff and not a timestamp: a fresh
    // message must not drag an old, already-read approval back into "new".
    const messages = [msg('m1', 'client', 'Hello', '2026-07-02T00:00:00Z')]
    const seen = { p1: portalSeenSnapshot(portal, messages) }
    const withNewMsg = [...messages, msg('m2', 'client', 'One more thing', '2026-07-03T00:00:00Z')]
    const { rows } = buildInboxRows([portal], withNewMsg, seen, projects)

    const approval = rows.find((r) => r.kind === 'approval')
    const newest = rows.find((r) => r.id === 'p1:msg:m2')
    expect(approval.unread).toBe(false)
    expect(newest.unread).toBe(true)
  })

  it('ignores studio messages — the inbox is client activity only', () => {
    const messages = [msg('m1', 'studio', 'Sent you the files', '2026-07-02T00:00:00Z')]
    const { rows } = buildInboxRows([portal], messages, {}, projects)
    expect(rows.some((r) => r.kind === 'message')).toBe(false)
  })

  it('only flags the newest message on a first-ever open', () => {
    const messages = [
      msg('m1', 'client', 'One', '2026-07-01T00:00:00Z'),
      msg('m2', 'client', 'Two', '2026-07-02T00:00:00Z'),
    ]
    const { rows } = buildInboxRows([portal], messages, {}, projects)
    expect(rows.find((r) => r.id === 'p1:msg:m1').unread).toBe(false)
    expect(rows.find((r) => r.id === 'p1:msg:m2').unread).toBe(true)
  })

  it('adds a form row once submitted, and clears it when seen', () => {
    const submitted = { ...portal, form_status: 'submitted' }
    const first = buildInboxRows([submitted], [], {}, projects)
    expect(first.rows.find((r) => r.kind === 'form').unread).toBe(true)

    const seen = { p1: portalSeenSnapshot(submitted, []) }
    const after = buildInboxRows([submitted], [], seen, projects)
    expect(after.rows.find((r) => r.kind === 'form').unread).toBe(false)
  })

  it('sorts unread first', () => {
    const p = {
      ...portal,
      step_status: {
        define: { status: 'approved', note: '' },
        design: { status: 'changes_requested', note: 'New' },
      },
    }
    const seen = { p1: { steps: { define: 'approved::' }, formStatus: 'not_sent' } }
    const { rows } = buildInboxRows([p], [], seen, projects)
    expect(rows[0].unread).toBe(true)
    expect(rows[rows.length - 1].unread).toBe(false)
  })

  it('never leaks a count or timestamp into what the row displays', () => {
    const { rows } = buildInboxRows([portal], [], {}, projects)
    const shown = [rows[0].title, rows[0].preview, rows[0].projectName].join(' ')
    expect(shown).not.toMatch(/\d{4}-\d{2}-\d{2}|\d+\s*(ago|unread|new)/i)
  })

  it('falls back gracefully when the project is gone locally', () => {
    const { rows } = buildInboxRows([portal], [], {}, [])
    expect(rows[0].projectName).toBe('Another project')
  })
})

/**
 * The desk rendered `sortAt` as a visible age, against this module's own note
 * that it is "approximate only ... never shown to the user". For a step row
 * that is the portal's row-level `updated_at`, so several different approvals
 * all showed one age, and that age moved whenever anything else on the portal
 * changed. `at` exists to be the displayable time, and only where a real
 * per-event timestamp does.
 */
describe('displayable timestamps', () => {
  it('gives message rows an `at` equal to the message created_at', () => {
    const { rows } = buildInboxRows(
      [portal],
      [msg('m1', 'client', 'hello', '2026-07-04T09:00:00Z')],
      {},
      projects
    )
    const message = rows.find((r) => r.kind === 'message')
    expect(message).toBeTruthy()
    expect(message.at).toBe('2026-07-04T09:00:00Z')
  })

  it('gives step rows no `at` at all, so no view can render a fake age', () => {
    const { rows } = buildInboxRows([portal], [], {}, projects)
    const steps = rows.filter((r) => r.kind !== 'message')
    expect(steps.length).toBeGreaterThan(0)
    for (const r of steps) expect(r.at).toBeUndefined()
  })

  it('never lets a step row inherit the portal updated_at as a display time', () => {
    const { rows } = buildInboxRows([portal], [], {}, projects)
    for (const r of rows.filter((x) => x.kind !== 'message')) {
      expect(r.at).not.toBe(portal.updated_at)
    }
  })
})

/**
 * The delivery moment's two events.
 *
 * "They opened it" is the only row in this inbox that nobody typed. It earns
 * its place because it is the fact a designer most wants at the end of a job
 * and has no other way to get — the alternative is asking the client whether
 * they looked at it, which nobody does.
 */
describe('delivery rows', () => {
  const delivered = {
    ...portal,
    step_status: {},
    delivery_status: 'delivered',
    delivery_viewed_at: '2026-08-06T09:00:00Z',
  }

  it('adds a row when the client opens the brand book', () => {
    const { rows } = buildInboxRows([delivered], [], {}, projects)
    const row = rows.find((r) => r.kind === 'delivery')
    expect(row).toBeTruthy()
    expect(row.title).toBe('Acme opened the brand book')
    expect(row.unread).toBe(true)
  })

  /* Unlike a step row, this one has a real per-event timestamp, so it is
     allowed to say when — see "displayable timestamps" above. */
  it('carries the real view time as a displayable `at`', () => {
    const { rows } = buildInboxRows([delivered], [], {}, projects)
    const row = rows.find((r) => r.kind === 'delivery')
    expect(row.at).toBe('2026-08-06T09:00:00Z')
  })

  it('goes quiet once seen, and does not come back', () => {
    const seen = { p1: portalSeenSnapshot(delivered, []) }
    const { rows } = buildInboxRows([delivered], [], seen, projects)
    expect(rows.find((r) => r.kind === 'delivery').unread).toBe(false)
  })

  it('surfaces what the client wrote back, and quotes their words', () => {
    const replied = {
      ...delivered,
      delivery_reaction: 'Honestly? I teared up a bit.',
      delivery_reaction_at: '2026-08-06T09:05:00Z',
    }
    const { rows } = buildInboxRows([replied], [], {}, projects)
    const row = rows.find((r) => r.kind === 'reaction')
    expect(row.preview).toBe('Honestly? I teared up a bit.')
    expect(row.body).toBe('Honestly? I teared up a bit.')
    expect(row.unread).toBe(true)
  })

  /* The detail panel's fallback action renders "Go to {stepLabel}". A row
     without one offers "Go to undefined". */
  it('names a real destination for both rows', () => {
    const replied = {
      ...delivered,
      delivery_reaction: 'Lovely.',
      delivery_reaction_at: '2026-08-06T09:05:00Z',
    }
    const { rows } = buildInboxRows([replied], [], {}, projects)
    for (const kind of ['delivery', 'reaction']) {
      const row = rows.find((r) => r.kind === kind)
      expect(row.targetView).toBeTruthy()
      expect(row.stepLabel).toBe(labelForStepId('deliver'))
    }
  })

  it('adds nothing at all until something has actually been delivered', () => {
    const { rows } = buildInboxRows([{ ...portal, step_status: {} }], [], {}, projects)
    expect(rows.filter((r) => ['delivery', 'reaction'].includes(r.kind))).toEqual([])
  })
})
