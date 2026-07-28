/**
 * Public, no-login client dashboard (/c/:portalId) — bypasses the whole
 * authenticated app shell, same pattern as PublicDiscoveryFill.jsx.
 *
 * Shows the client: which of the 7 journey steps the studio has pushed to
 * them, lets them approve/request changes per step with a note, a simple
 * chat thread with the studio, and (if the studio has asked) the Project
 * overview form to fill out and submit themselves.
 */
import { useEffect, useRef, useState } from 'react'
import { clientFacingError } from '../lib/clientFacingError'
import { JOURNEY_STEPS } from '../lib/journey'
import ClientBriefFields from './ClientBriefFields'
import {
  fetchClientPortal,
  fetchClientPortalMessages,
  postClientPortalMessage,
  respondToPortalStep,
  submitClientPortalForm,
  submitClientPortalSurvey,
} from '../lib/clientPortal'
import { SURVEY_SCALE } from '../lib/clientSurvey'
import '../styles/lazy-clients.css'
import '../styles/lazy-define.css'

export default function PublicClientPortal({ portalId }) {
  const [loadState, setLoadState] = useState('loading') // loading | ready | notfound
  const [portal, setPortal] = useState(null)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [formAnswers, setFormAnswers] = useState({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [noteDrafts, setNoteDrafts] = useState({})
  const [surveyAnswers, setSurveyAnswers] = useState({})
  const [surveySubmitting, setSurveySubmitting] = useState(false)
  const chatEndRef = useRef(null)

  const load = async () => {
    const r = await fetchClientPortal(portalId)
    if (!r.ok) {
      setError(clientFacingError(r.error))
      setLoadState('notfound')
      return
    }
    setPortal(r)
    setFormAnswers((prev) => (Object.keys(prev).length ? prev : r.detectiveAnswers || {}))
    setLoadState('ready')
    const m = await fetchClientPortalMessages(portalId)
    if (m.ok) setMessages(m.messages)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalId])

  /* Skip the first run. On load `messages` goes [] -> fetched, and scrolling
     on that transition dropped the client at the chat block — well below the
     fold — without ever seeing the steps or the form they were sent for. */
  const didFirstScroll = useRef(false)
  useEffect(() => {
    if (!didFirstScroll.current) {
      didFirstScroll.current = true
      return
    }
    chatEndRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  const refreshMessages = async () => {
    const m = await fetchClientPortalMessages(portalId)
    if (m.ok) setMessages(m.messages)
  }

  /* Every handler clears `error` first. Without it one transient failure left
     a red line on the card for the rest of the session, including after
     everything afterwards succeeded. */
  const sendMessage = async (e) => {
    e.preventDefault()
    const body = chatInput.trim()
    if (!body) return
    setError('')
    setSending(true)
    const r = await postClientPortalMessage(portalId, body)
    setSending(false)
    if (!r.ok) {
      setError(clientFacingError(r.error))
      return
    }
    setChatInput('')
    await refreshMessages()
  }

  /* Approve is the highest-stakes thing on this page and it was a bare click:
     two round-trips with both buttons live and unchanged, so on a slow
     connection a client sees nothing happen and presses again. */
  const [pendingStepId, setPendingStepId] = useState(null)

  const respondStep = async (stepId, status) => {
    if (pendingStepId) return
    setError('')
    setPendingStepId(stepId)
    const note = noteDrafts[stepId] || ''
    const r = await respondToPortalStep(portalId, stepId, status, note)
    if (!r.ok) {
      setPendingStepId(null)
      setError(clientFacingError(r.error))
      return
    }
    await load()
    setPendingStepId(null)
  }

  const submitForm = async (e) => {
    e.preventDefault()
    setError('')
    setFormSubmitting(true)
    const r = await submitClientPortalForm(portalId, formAnswers)
    setFormSubmitting(false)
    if (!r.ok) {
      setError(clientFacingError(r.error))
      return
    }
    await load()
  }

  const submitSurvey = async (e) => {
    e.preventDefault()
    setError('')
    setSurveySubmitting(true)
    const r = await submitClientPortalSurvey(portalId, surveyAnswers)
    setSurveySubmitting(false)
    if (!r.ok) {
      setError(clientFacingError(r.error))
      return
    }
    await load()
  }

  if (loadState === 'loading') {
    return (
      <div className="public-fill-page">
        <div className="public-fill-card">
          <p className="public-fill-status">Loading…</p>
        </div>
      </div>
    )
  }

  if (loadState === 'notfound') {
    return (
      <div className="public-fill-page">
        <div className="public-fill-card">
          <p className="public-fill-status">
            {error || 'This link isn’t valid — ask your contact to send a fresh one.'}
          </p>
        </div>
      </div>
    )
  }

  const visibleSteps = JOURNEY_STEPS.filter((s) => portal.stepVisibility?.[s.id])

  return (
    <div className="public-fill-page">
      <div className="public-fill-card client-portal-card">
        <h1 className="public-fill-title">
          Project dashboard{portal.clientName ? ` — ${portal.clientName}` : ''}
        </h1>
        <p className="public-fill-lede">
          Here's what's ready for you to look at. Approve a step, or leave a note if you'd
          like something changed.
        </p>

        {visibleSteps.length === 0 ? (
          <p className="public-fill-status">
            Nothing has been shared with you yet — check back once your designer pushes an
            update.
          </p>
        ) : (
          <div className="client-portal-steps">
            {visibleSteps.map((step) => {
              const status = portal.stepStatus?.[step.id]?.status || 'pending'
              return (
                <div key={step.id} className="client-portal-step">
                  <div className="client-portal-step-head">
                    <span className="client-portal-step-label">{step.label}</span>
                    <span className={`client-portal-step-badge is-${status}`}>
                      {status === 'approved'
                        ? 'Approved'
                        : status === 'changes_requested'
                          ? 'Changes requested'
                          : 'Waiting on you'}
                    </span>
                  </div>
                  {status !== 'approved' && (
                    <div className="client-portal-step-actions">
                      <textarea
                        className="field-input"
                        rows={2}
                        placeholder="Optional note about what you'd like changed"
                        value={noteDrafts[step.id] || ''}
                        onChange={(e) =>
                          setNoteDrafts((d) => ({ ...d, [step.id]: e.target.value }))
                        }
                      />
                      <div className="client-portal-step-buttons">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={pendingStepId === step.id}
                          onClick={() => respondStep(step.id, 'approved')}
                        >
                          {pendingStepId === step.id ? 'Saving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={pendingStepId === step.id}
                          onClick={() => respondStep(step.id, 'changes_requested')}
                        >
                          Request changes
                        </button>
                      </div>
                    </div>
                  )}
                  {status === 'changes_requested' && portal.stepStatus?.[step.id]?.note ? (
                    <p className="discovery-brief-hint">
                      Your note: {portal.stepStatus[step.id].note}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        {portal.formStatus !== 'not_sent' && (
          <div className="client-portal-form-block">
            <h2 className="client-portal-subhead">Project overview form</h2>
            {portal.formStatus === 'submitted' ? (
              <p className="public-fill-status">
                Thanks — you've already submitted this. Ask your contact to send a fresh
                request if you need to change an answer.
              </p>
            ) : (
              <form onSubmit={submitForm}>
                <p className="public-fill-lede">
                  Fill in what you can — leave anything blank if you're not sure yet.
                </p>
                <ClientBriefFields
                  answers={formAnswers}
                  onChange={(id, value) =>
                    setFormAnswers((a) => ({ ...a, [id]: value }))
                  }
                  idPrefix="cp"
                  targetId={portalId}
                />
                {/* Beside the button that caused it. This used to render only
                    at the very bottom of the page, several screens below the
                    submit, so a failed submit looked like nothing happened. */}
                {error && <p className="public-fill-error">{error}</p>}
                <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Submitting…' : 'Submit'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Survey — the same portal, below the form. Not a separate link, not
            an email: the client already has this page bookmarked. */}
        {portal.surveyStatus === 'sent' && portal.surveyQuestions.length > 0 && (
          <div className="client-portal-form-block">
            <h2 className="client-portal-subhead">A few quick questions</h2>
            <form onSubmit={submitSurvey}>
              <p className="public-fill-lede">
                Honest answers help more than kind ones. Skip anything you'd
                rather not answer.
              </p>
              {portal.surveyQuestions.map((q) => (
                <div className="field-block" key={q.id}>
                  <label className="field-label" htmlFor={`sv-${q.id}`}>
                    {q.text}
                  </label>
                  {q.type === 'scale' ? (
                    <select
                      id={`sv-${q.id}`}
                      className="field-input"
                      value={surveyAnswers[q.id] || ''}
                      onChange={(e) =>
                        setSurveyAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                      }
                    >
                      <option value="">—</option>
                      {SURVEY_SCALE.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <textarea
                      id={`sv-${q.id}`}
                      className="field-input"
                      rows={2}
                      value={surveyAnswers[q.id] || ''}
                      onChange={(e) =>
                        setSurveyAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
              {error && <p className="public-fill-error">{error}</p>}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={surveySubmitting}
              >
                {surveySubmitting ? 'Sending…' : 'Send answers'}
              </button>
            </form>
          </div>
        )}

        {portal.surveyStatus === 'submitted' && (
          <div className="client-portal-form-block">
            <h2 className="client-portal-subhead">A few quick questions</h2>
            <p className="public-fill-status">
              Thanks — your answers are in.
            </p>
          </div>
        )}

        <div className="client-portal-chat-block">
          <h2 className="client-portal-subhead">Message your designer</h2>
          <div className="client-portal-chat-log">
            {messages.length === 0 ? (
              <p className="discovery-brief-hint">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`client-portal-chat-msg is-${m.sender}`}
                >
                  <span className="client-portal-chat-sender">
                    {m.sender === 'client' ? 'You' : 'Designer'}
                  </span>
                  <p>{m.body}</p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <form className="client-portal-chat-form" onSubmit={sendMessage}>
            <input
              className="field-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message…"
              aria-label="Message"
            />
            <button type="submit" className="btn btn-secondary" disabled={sending}>
              Send
            </button>
          </form>
          <button type="button" className="btn btn-ghost btn-sm" onClick={refreshMessages}>
            Refresh messages
          </button>
        </div>

        {error && <p className="public-fill-error">{error}</p>}
      </div>
    </div>
  )
}
