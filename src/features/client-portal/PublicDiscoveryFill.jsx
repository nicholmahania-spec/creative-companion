/**
 * Public, no-login page for a client to fill in a discovery brief a
 * studio user sent them a link to. Rendered standalone (bypasses the
 * whole authenticated app shell) — see the /f/:id check in App.jsx.
 */
import { useEffect, useState } from 'react'
import { clientFacingError } from '../../lib/clientFacingError'
import { DETECTIVE_CHAPTERS } from '../../lib/detectiveBrief'
import ClientBriefFields from '../brief/ClientBriefFields'
import { fetchDiscoveryShare, submitDiscoveryShare } from '../../lib/discoveryShare'
import '../../styles/lazy-define.css'
import '../../styles/lazy-clients.css'

export default function PublicDiscoveryFill({ shareId }) {
  const [loadState, setLoadState] = useState('loading') // loading | ready | notfound | submitted
  const [clientName, setClientName] = useState('')
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  /* Answers live only in component state until Submit, and the link is
     single-use — so a client who closes the tab, is called away, or has a
     phone evict the page loses twenty answers with no way back and no
     acknowledgement that anything happened. Draft to localStorage on every
     keystroke and restore it on load. */
  const draftKey = `cc-fill-draft-${shareId}`

  useEffect(() => {
    let cancelled = false
    fetchDiscoveryShare(shareId).then((r) => {
      if (cancelled) return
      if (!r.ok) {
        setError(clientFacingError(r.error))
        setLoadState('notfound')
        return
      }
      if (r.status === 'submitted') {
        setLoadState('submitted')
        return
      }
      setClientName(r.clientName || '')
      // Server answers first, then anything typed locally and never sent —
      // the local draft is strictly newer than what the server has.
      let restored = r.answers || {}
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey) || 'null')
        if (draft && typeof draft === 'object') restored = { ...restored, ...draft }
      } catch {
        /* unparseable draft is not worth blocking the form over */
      }
      setAnswers(restored)
      setLoadState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [shareId, draftKey])

  const updateField = (fieldId, value) =>
    setAnswers((a) => {
      const next = { ...a, [fieldId]: value }
      try {
        localStorage.setItem(draftKey, JSON.stringify(next))
      } catch {
        /* private mode / quota — the form still works, it just won't survive */
      }
      return next
    })

  /* An all-blank submit permanently burns a single-use link, merges nothing,
     and leaves both sides in a dead end that needs a new link and an awkward
     email. Blocking only the all-blank case keeps the "leave anything blank"
     promise intact for every partial answer. */
  const hasAnyAnswer = Object.values(answers).some((v) =>
    Array.isArray(v) ? v.length > 0 : String(v || '').trim().length > 0
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validate on tap, not by greying the button — an unexplained disabled
    // control is a silent wall (#7). The reason arrives at the moment and place
    // of the action.
    if (!hasAnyAnswer) {
      setError('Answer at least one question before sending.')
      return
    }
    setSubmitting(true)
    setError('')
    const r = await submitDiscoveryShare(shareId, answers)
    setSubmitting(false)
    if (!r.ok) {
      setError(clientFacingError(r.error))
      return
    }
    try {
      localStorage.removeItem(draftKey)
    } catch {
      /* nothing to clean up */
    }
    setLoadState('submitted')
  }

  return (
    <div className="public-fill-page">
      <div className="public-fill-card">
        <h1 className="public-fill-title">
          Brand discovery questionnaire{clientName ? ` — ${clientName}` : ''}
        </h1>

        {/* The invite email promises "about 10 minutes" and says blanks are
            fine; the page it lands on said neither. An unbounded form with
            no stated end is a bounce — say how long it is and give explicit
            permission to skip, before the first question. */}
        {loadState === 'ready' && (
          <p className="public-fill-lede">
            About 10 minutes · {DETECTIVE_CHAPTERS.length} short sections ·
            leave anything blank if you’re not sure yet.
          </p>
        )}

        {loadState === 'loading' && (
          <p className="public-fill-status" role="status">Loading…</p>
        )}

        {loadState === 'notfound' && (
          <p className="public-fill-status" role="alert">
            {error || 'This link isn’t valid — ask your contact to send a fresh one.'}
          </p>
        )}

        {/* Success was rendered in the same grey one-liner as a broken link.
            After ten minutes of work, the form vanishing and being replaced
            by the page's quietest treatment reads as failure at a glance. */}
        {loadState === 'submitted' && (
          <div className="public-fill-done" role="status">
            <h2 className="public-fill-done-title">Thanks — that’s sent</h2>
            <p className="public-fill-status">
              Your designer has your answers and will be in touch. This link
              only works once, so it won’t reopen — ask them for a fresh one if
              you need to change something.
            </p>
          </div>
        )}

        {loadState === 'ready' && (
          <form onSubmit={handleSubmit}>
            <ClientBriefFields
              answers={answers}
              onChange={updateField}
              idPrefix="pf"
              targetId={shareId}
            />

            {error && (
              <p className="public-fill-error" role="alert">
                {error}
              </p>
            )}

            {/* Said before the button, not after the fact. The lede invites a
                partial answer; without this the one-shot submit is a trap
                sprung on someone who did as they were told. Hidden while an
                error shows so the client reconciles one message, not two. */}
            {!error && (
              <p className="public-fill-submit-note">
                You can send this once — take your time.
              </p>
            )}

            {/* Enabled except mid-submit; the all-blank case is caught on tap
                with an inline reason rather than a dead greyed button (#7). */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
