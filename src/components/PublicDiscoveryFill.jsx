/**
 * Public, no-login page for a client to fill in a discovery brief a
 * studio user sent them a link to. Rendered standalone (bypasses the
 * whole authenticated app shell) — see the /f/:id check in App.jsx.
 */
import { useEffect, useState } from 'react'
import { DETECTIVE_CHAPTERS } from '../lib/detectiveBrief'
import ClientBriefFields from './ClientBriefFields'
import { fetchDiscoveryShare, submitDiscoveryShare } from '../lib/discoveryShare'

export default function PublicDiscoveryFill({ shareId }) {
  const [loadState, setLoadState] = useState('loading') // loading | ready | notfound | submitted
  const [clientName, setClientName] = useState('')
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchDiscoveryShare(shareId).then((r) => {
      if (cancelled) return
      if (!r.ok) {
        setError(r.error)
        setLoadState('notfound')
        return
      }
      if (r.status === 'submitted') {
        setLoadState('submitted')
        return
      }
      setClientName(r.clientName || '')
      setAnswers(r.answers || {})
      setLoadState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [shareId])

  const updateField = (fieldId, value) =>
    setAnswers((a) => ({ ...a, [fieldId]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const r = await submitDiscoveryShare(shareId, answers)
    setSubmitting(false)
    if (!r.ok) {
      setError(r.error)
      return
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
          <p className="public-fill-status">Loading…</p>
        )}

        {loadState === 'notfound' && (
          <p className="public-fill-status">
            {error || 'This link isn’t valid — ask your contact to send a fresh one.'}
          </p>
        )}

        {loadState === 'submitted' && (
          <p className="public-fill-status">
            Thanks — this has already been submitted. If you need to change an answer,
            ask your contact to send you a fresh link.
          </p>
        )}

        {loadState === 'ready' && (
          <form onSubmit={handleSubmit}>
            <ClientBriefFields
              answers={answers}
              onChange={updateField}
              idPrefix="pf"
            />

            {error && <p className="public-fill-error">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
