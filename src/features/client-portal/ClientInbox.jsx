/**
 * Client inbox — one place for everything every client did, across all
 * projects.
 *
 * Design constraints this file is deliberately built around (see CLAUDE.md):
 * - No counts, no timestamps in the list. Unread is a filled dot; recency is
 *   sort order plus one "Seen before this" divider. Numbers don't register
 *   for this user, so state has to be perceptual.
 * - One merged stream. No tabs, no filters — an item type in an unvisited tab
 *   is an item that gets silently missed.
 * - Neutral titles. "Notes from Acme on Design", never "Changes requested".
 *   The dread is caused by ambiguity, so the client's actual words are on the
 *   row, readable without an act of courage.
 * - Read is marked only on explicit open, never on poll or hover.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchOwnerPortals, fetchMessagesForPortals, postStudioMessage } from '../../lib/client/clientPortal'
import { buildInboxRows, portalSeenSnapshot } from '../../lib/client/clientInbox'

const KIND_GLYPH = {
  approval: '✓',
  notes: '✎',
  message: '💬',
  form: '📋',
}

/**
 * Load portals + messages for the signed-in user.
 * Exposed as a hook so the header chip and the panel share one fetch.
 */
export function useClientInbox({ enabled, projects, seen }) {
  const [state, setState] = useState({ status: 'idle', portals: [], messages: [], error: '' })

  const load = useCallback(async () => {
    setState((s) => (s.status === 'idle' ? { ...s, status: 'loading' } : s))
    const p = await fetchOwnerPortals()
    if (!p.ok) {
      setState({
        status: p.signedOut ? 'signed-out' : 'error',
        portals: [],
        messages: [],
        error: p.error || '',
      })
      return
    }
    const m = await fetchMessagesForPortals(p.portals.map((x) => x.id))
    setState({
      status: 'ready',
      portals: p.portals,
      messages: m.ok ? m.messages : [],
      error: m.ok ? '' : m.error || '',
    })
  }, [])

  useEffect(() => {
    // Without cloud sync there is nothing to poll — but the chip still
    // renders, and the panel says why it's empty. A control that vanishes
    // when it can't work is indistinguishable from one that doesn't exist.
    if (!enabled) {
      setState({ status: 'not-configured', portals: [], messages: [], error: '' })
      return undefined
    }
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [enabled, load])

  const { rows, hasUnread } = useMemo(
    () => buildInboxRows(state.portals, state.messages, seen, projects),
    [state.portals, state.messages, seen, projects]
  )

  return { ...state, rows, hasUnread, reload: load }
}

/**
 * The always-visible entry point. Same chip, same place, whether or not the
 * project has a portal yet — one target to learn, no branch, no second door.
 */
export function ClientInboxChip({ hasUnread, onOpen }) {
  return (
    <button
      type="button"
      className={`client-inbox-chip${hasUnread ? ' has-new' : ''}`}
      onClick={onOpen}
      aria-label={hasUnread ? 'Client — new activity' : 'Client'}
    >
      <span className="client-inbox-chip-dot" aria-hidden="true" />
      <span>Client</span>
    </button>
  )
}

export function ClientInboxPanel({
  open,
  onClose,
  inbox,
  seen,
  onMarkSeen,
  onGoToView,
  onOpenPortal,
  flashToast,
  flashMicro,
}) {
  const [openRow, setOpenRow] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const panelRef = useRef(null)
  const restoreFocusRef = useRef(null)
  const replyRef = useRef(null)

  useEffect(() => {
    if (open) return
    setOpenRow(null)
    setReply('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    restoreFocusRef.current = document.activeElement
    const node = panelRef.current
    const focusables = () =>
      Array.from(
        node?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      )
    focusables()[0]?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      const prev = restoreFocusRef.current
      if (prev && typeof prev.focus === 'function') prev.focus()
    }
  }, [open, onClose])

  /** Explicit open is the only thing that marks a portal seen. */
  const openItem = useCallback(
    (row) => {
      setOpenRow(row)
      setReply('')
      const portal = inbox.portals.find((p) => p.id === row.portalId)
      if (portal) onMarkSeen?.(portal.id, portalSeenSnapshot(portal, inbox.messages))
      if (row.kind === 'message') {
        requestAnimationFrame(() => replyRef.current?.focus())
      }
    },
    [inbox.portals, inbox.messages, onMarkSeen]
  )

  const sendReply = async () => {
    const body = reply.trim()
    if (!body || !openRow) return
    setSending(true)
    const r = await postStudioMessage(openRow.portalId, body)
    setSending(false)
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t send that')
      return
    }
    setReply('')
    flashMicro?.('Sent')
    inbox.reload?.()
  }

  if (!open) return null

  const { rows, status } = inbox
  const newRows = rows.filter((r) => r.unread)
  const oldRows = rows.filter((r) => !r.unread)

  return (
    <div
      className="export-overlay client-inbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-inbox-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="export-panel client-inbox-panel" ref={panelRef}>
        <div className="export-panel-header">
          <h3 id="client-inbox-title" className="client-inbox-title">
            {openRow ? openRow.title : 'Client'}
          </h3>
          <button
            type="button"
            className="btn btn-ghost client-inbox-close"
            onClick={openRow ? () => setOpenRow(null) : onClose}
            aria-label={openRow ? 'Back to list' : 'Close'}
          >
            <span aria-hidden="true">{openRow ? '‹' : '×'}</span>
          </button>
        </div>

        {openRow ? (
          <div className="client-inbox-detail">
            <p className="client-inbox-detail-where">
              {openRow.projectName}
              {openRow.stepLabel ? ` · ${openRow.stepLabel}` : ''}
            </p>

            {openRow.body ? (
              <p className="client-inbox-detail-body">{openRow.body}</p>
            ) : (
              <p className="client-inbox-detail-body is-empty">{openRow.preview}</p>
            )}

            {/* Exactly one primary action, and it carries the context
                forward so nothing has to be held in working memory. */}
            {openRow.kind === 'message' ? (
              <div className="client-inbox-reply">
                <textarea
                  ref={replyRef}
                  className="field-textarea"
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write back…"
                  aria-label="Reply to your client"
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            ) : openRow.kind === 'form' ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onOpenPortal?.(openRow)
                  onClose?.()
                }}
              >
                Open their answers
              </button>
            ) : openRow.targetView ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onGoToView?.(openRow)
                  onClose?.()
                }}
              >
                Go to {openRow.stepLabel}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="client-inbox-body">
            {status === 'signed-out' && (
              <div className="client-inbox-empty">
                <p>Sign in to see what your clients have sent.</p>
              </div>
            )}

            {status === 'not-configured' && (
              <div className="client-inbox-empty">
                <p>Client links need a cloud account. Open Settings and sign in, then come back.</p>
              </div>
            )}

            {status === 'loading' && <p className="client-inbox-note">Checking…</p>}

            {status === 'error' && (
              <div className="client-inbox-empty">
                <p>Couldn’t reach your client links.</p>
                <button type="button" className="btn btn-secondary" onClick={inbox.reload}>
                  Try again
                </button>
              </div>
            )}

            {status === 'ready' && !rows.length && (
              <div className="client-inbox-empty">
                <p>Nothing from your clients yet.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onOpenPortal?.(null)
                    onClose?.()
                  }}
                >
                  Create a client link
                </button>
              </div>
            )}

            {newRows.map((row) => (
              <InboxRow key={row.id} row={row} onOpen={openItem} />
            ))}

            {!!newRows.length && !!oldRows.length && (
              <p className="client-inbox-divider">Seen before this</p>
            )}

            {oldRows.map((row) => (
              <InboxRow key={row.id} row={row} onOpen={openItem} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InboxRow({ row, onOpen }) {
  return (
    <button
      type="button"
      className={`client-inbox-row${row.unread ? ' is-new' : ''}`}
      onClick={() => onOpen(row)}
    >
      <span className="client-inbox-row-glyph" aria-hidden="true">
        {KIND_GLYPH[row.kind] || '•'}
      </span>
      <span className="client-inbox-row-main">
        <span className="client-inbox-row-title">{row.title}</span>
        {row.preview && <span className="client-inbox-row-preview">{row.preview}</span>}
        <span className="client-inbox-row-project">{row.projectName}</span>
      </span>
      {row.unread && <span className="client-inbox-row-dot" aria-label="New" />}
    </button>
  )
}
