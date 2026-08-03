import { describe, it, expect } from 'vitest'
import { labelForStepId } from '../journey'
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
