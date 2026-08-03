/**
 * Public, no-login client dashboard (/c/:portalId) — bypasses the whole
 * authenticated app shell, same pattern as PublicDiscoveryFill.jsx.
 *
 * Shows the client: which of the journey steps the studio has pushed to
 * them, lets them approve/request changes per step with a note, a simple
 * chat thread with the studio, and (if the studio has asked) the Project
 * overview form to fill out and submit themselves.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { clientFacingError } from '../../lib/clientFacingError'
import { JOURNEY_STEPS } from '../../lib/journey'
import ClientBriefFields from '../../components/ClientBriefFields'
import {
  fetchClientPortal,
  fetchClientPortalMessages,
  postClientPortalMessage,
  respondToPortalStep,
  submitClientPortalForm,
  submitClientPortalSurvey,
} from '../../lib/clientPortal'
import { SURVEY_SCALE } from '../../lib/clientSurvey'
import '../../styles/lazy-clients.css'
import '../../styles/lazy-define.css'

/**
 * When a message was sent, for the CLIENT's eyes.
 *
 * Today's messages get the time alone; anything older carries the date too,
 * so a thread read a week later still says which day. Formatted with the
 * browser's own locale and time zone rather than the studio's — the client
 * may be in neither. Returns '' on a missing or unusable stamp so a message
 * renders without a time rather than with a wrong one.
 *
 * The studio side of this same thread deliberately does NOT use this — see
 * lib/messageDayLabel.js.
 */
function sentAtLabel(iso) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const d = new Date(t)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  try {
    return d.toLocaleString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      ...(sameDay ? {} : { day: 'numeric', month: 'short' }),
    })
  } catch {
    return ''
  }
}

export default function PublicClientPortal({ portalId }) {
  const [loadState, setLoadState] = useState('loading') // loading | ready | notfound
  const [portal, setPortal] = useState(null)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  // Which action an error belongs to, so one failure is announced once beside
  // its own control instead of by three role="alert" nodes at once (#11).
  const [errorScope, setErrorScope] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [formAnswers, setFormAnswers] = useState({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [noteDrafts, setNoteDrafts] = useState({})
  const [surveyAnswers, setSurveyAnswers] = useState({})
  const [surveySubmitting, setSurveySubmitting] = useState(false)
  const chatEndRef = useRef(null)

  /* Everything this client types lives in component state until they press a
     submit button, and the form and survey are both single-use server-side. So
     a client who closes the tab, is called away, or whose phone evicts the page
     loses the lot, with no acknowledgement that anything happened and no way
     back short of a new link and an awkward email.

     /f/ has drafted to localStorage since it was built, with that reasoning
     written down. This surface — the longer of the two, and the one a client
     returns to repeatedly — never got it. Same data shape, same failure, second
     copy missed, which is the drift this codebase keeps recording.

     Step notes are drafted too, not just the two forms: the note is where the
     client's actual change request lives ("the mark reads too corporate"),
     which is the single most expensive sentence on the page to lose, because
     it is the one that says what to redraw. */
  const draftKey = `cc-portal-draft-${portalId}`
  /* Nothing is persisted until the server load has been merged in. Without
     this the first render would write empty state straight over a saved
     draft — the restore would lose a race with its own save. */
  const draftRestored = useRef(false)

  const readDraft = () => {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) || 'null')
      return d && typeof d === 'object' ? d : {}
    } catch {
      /* an unparseable draft is not worth blocking the portal over */
      return {}
    }
  }

  const writeDraft = (patch) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ ...readDraft(), ...patch }))
    } catch {
      /* private mode / quota — the portal still works, it just won't survive */
    }
  }

  const load = async () => {
    const r = await fetchClientPortal(portalId)
    if (!r.ok) {
      setError(clientFacingError(r.error))
      setLoadState('notfound')
      return
    }
    setPortal(r)
    const draft = readDraft()
    setFormAnswers((prev) =>
      Object.keys(prev).length
        ? prev
        : { ...(r.detectiveAnswers || {}), ...(draft.form || {}) }
    )
    setSurveyAnswers((prev) =>
      Object.keys(prev).length ? prev : draft.survey || {}
    )
    setNoteDrafts((prev) => (Object.keys(prev).length ? prev : draft.notes || {}))
    draftRestored.current = true
    setLoadState('ready')
    const m = await fetchClientPortalMessages(portalId)
    if (m.ok) setMessages(m.messages)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalId])

  /* Scroll to the chat ONLY when this client just sent something.
     Two ways this goes wrong otherwise. On load `messages` goes [] -> fetched,
     and scrolling on that transition dropped the client at the chat block —
     well below the fold — without ever seeing the steps or the form they were
     sent for. And now that the thread refreshes on its own, an incoming reply
     would yank someone mid-sentence in the brief down to the chat. A page that
     moves under you while you are typing is worse than a message you see a
     moment later, so the scroll follows the client's own action and nothing
     else. */
  const scrollAfterNextMessages = useRef(false)
  useEffect(() => {
    if (!scrollAfterNextMessages.current) return
    scrollAfterNextMessages.current = false
    chatEndRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  /* One writer for all three, rather than wrapping every setter call site —
     fewer places for a future field to be added and silently not drafted. */
  useEffect(() => {
    if (!draftRestored.current) return
    writeDraft({ form: formAnswers, survey: surveyAnswers, notes: noteDrafts })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formAnswers, surveyAnswers, noteDrafts])

  const refreshMessages = useCallback(async () => {
    const m = await fetchClientPortalMessages(portalId)
    if (m.ok) setMessages(m.messages)
  }, [portalId])

  /* Keep the thread current without making the client remember to.
     The studio side of this same conversation has polled since it was built —
     "a message thread that only updates when you remember to press Refresh is
     a message thread that gets missed" — and this half, the one a stranger
     reads on a phone with no way to be told how it works, had only a button.

     Deliberately not the studio's flat 30s interval: this runs on someone
     else's phone. Refreshing when the tab becomes visible covers the case that
     actually happens (they come back to look), and the interval only ticks
     while the tab is visible, so a backgrounded page costs nothing. */
  useEffect(() => {
    if (!portalId) return undefined
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshMessages()
    }
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshMessages()
    }, 60000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(id)
    }
  }, [portalId, refreshMessages])

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
      setErrorScope('chat')
      return
    }
    setChatInput('')
    // The client asked for this one, so following it down to the thread is
    // wanted here and only here.
    scrollAfterNextMessages.current = true
    await refreshMessages()
  }

  /* Approve is the highest-stakes thing on this page and it was a bare click:
     two round-trips with both buttons live and unchanged, so on a slow
     connection a client sees nothing happen and presses again. */
  const [pendingStepId, setPendingStepId] = useState(null)
  // Two-tap confirm for Approve only — a client's approval is a commitment with
  // money attached, so a mis-tap shouldn't fire on one press. Request-changes
  // stays one tap (it's reversible). (#10)
  const [armedApproveStepId, setArmedApproveStepId] = useState(null)

  const respondStep = async (stepId, status) => {
    if (pendingStepId) return
    setError('')
    setPendingStepId(stepId)
    const note = noteDrafts[stepId] || ''
    const r = await respondToPortalStep(portalId, stepId, status, note)
    if (!r.ok) {
      setPendingStepId(null)
      setError(clientFacingError(r.error))
      setErrorScope('step')
      return
    }
    /* Only this step's note — the others are still unsent work. */
    setNoteDrafts((d) => {
      const next = { ...d }
      delete next[stepId]
      writeDraft({ notes: next })
      return next
    })
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
      setErrorScope('form')
      return
    }
    writeDraft({ form: {} })
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
      setErrorScope('survey')
      return
    }
    writeDraft({ survey: {} })
    await load()
  }

  if (loadState === 'loading') {
    return (
      <div className="public-fill-page">
        <div className="public-fill-card">
          <p className="public-fill-status" role="status">Loading…</p>
        </div>
      </div>
    )
  }

  if (loadState === 'notfound') {
    return (
      <div className="public-fill-page">
        <div className="public-fill-card">
          <p className="public-fill-status" role="alert">
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
                  {status !== 'approved' ? (
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
                          onClick={() => {
                            // Two-tap: first tap arms, second approves.
                            if (armedApproveStepId === step.id) {
                              setArmedApproveStepId(null)
                              respondStep(step.id, 'approved')
                            } else {
                              setArmedApproveStepId(step.id)
                            }
                          }}
                          onBlur={() =>
                            setArmedApproveStepId((id) =>
                              id === step.id ? null : id
                            )
                          }
                        >
                          {pendingStepId === step.id
                            ? 'Saving…'
                            : armedApproveStepId === step.id
                              ? 'Tap again to approve'
                              : 'Approve'}
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
                  ) : (
                    /* Approved no longer unmounts every control — a client who
                       changes their mind keeps a visible, labelled route back
                       (object permanence), via the already-reversible
                       changes_requested path. (#10) */
                    <div className="client-portal-step-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={pendingStepId === step.id}
                        onClick={() => respondStep(step.id, 'changes_requested')}
                      >
                        {pendingStepId === step.id
                          ? 'Saving…'
                          : 'Request changes instead'}
                      </button>
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
                {error && errorScope === 'form' && (
                  <p className="public-fill-error" role="alert">{error}</p>
                )}
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
              {error && errorScope === 'survey' && (
                <p className="public-fill-error" role="alert">{error}</p>
              )}
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
                    {/* A conventional timestamp, deliberately: the studio-side
                        view uses day labels instead (lib/messageDayLabel.js)
                        because the owner is time-blind, but a client is an
                        ordinary person judging whether their designer is
                        responsive, and this is what every other messaging
                        surface they use shows. Rendered in the CLIENT's own
                        locale and zone — they may not share the studio's. */}
                    {sentAtLabel(m.created_at) && (
                      <time
                        className="client-portal-chat-time"
                        dateTime={m.created_at}
                      >
                        {sentAtLabel(m.created_at)}
                      </time>
                    )}
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
          {/* Kept even though the thread now refreshes itself: pressing it is
              how someone confirms nothing is stuck, and it is an explicit ask
              to look at the thread, so this one does follow down to it. */}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              scrollAfterNextMessages.current = true
              void refreshMessages()
            }}
          >
            Refresh messages
          </button>
        </div>

        {/* Catch-all only for the actions without a local slot — step
            approvals and chat — so a single failure is announced once (#11). */}
        {error && (errorScope === 'step' || errorScope === 'chat') && (
          <p className="public-fill-error" role="alert">{error}</p>
        )}
      </div>
    </div>
  )
}
