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
import { clientFacingError } from '../../lib/client/clientFacingError'
import { portalPushableSteps } from '../../lib/journey/journey'
import { collectsFor } from '../../lib/client/reviewArtifact'
import ClientBriefFields from '../brief/ClientBriefFields'
import {
  fetchClientPortal,
  fetchClientPortalMessages,
  postClientPortalMessage,
  respondToPortalStep,
  submitClientPortalForm,
  submitClientPortalSurvey,
} from '../../lib/client/clientPortal'
import { brandRevealUrl } from '../../lib/client/brandDelivery'
import { SURVEY_SCALE } from '../../lib/client/clientSurvey'
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

/**
 * The thing being approved, on screen, above the buttons.
 *
 * READ-ONLY BY CONSTRUCTION. It renders from the artifact the studio stamped
 * and holds no controls that write anything back — the portal must never edit
 * studio-owned design data, and the client's only inputs on this card remain
 * the note and the two buttons underneath.
 *
 * Nothing here is derived from live project state, because none reaches this
 * page: the payload is exactly what was shown at push time, so what the client
 * approves and what the studio recorded them approving are the same object.
 */
function ReviewArtifact({ artifact }) {
  const payload = artifact?.payload || null
  if (!payload) return null
  const { mark, palette, type } = payload
  return (
    <div className="client-portal-artifact">
      {mark?.image ? (
        <img
          className="client-portal-artifact-mark"
          src={mark.image}
          alt="The logo, as your designer has it now"
        />
      ) : null}
      {palette?.hexes?.length ? (
        <ul className="client-portal-artifact-swatches">
          {palette.hexes.map((hex) => (
            <li key={hex}>
              <span
                className="client-portal-artifact-swatch"
                style={{ background: hex }}
                aria-hidden="true"
              />
              {/* The value, not only the colour — a swatch alone is invisible
                  to a screen reader and unnameable on the phone. */}
              <span className="client-portal-artifact-hex">{hex}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {type?.heading || type?.body ? (
        <p className="client-portal-artifact-type">
          {[type.heading, type.body].filter(Boolean).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

/**
 * THE FROZEN PRESENTATION, ON SCREEN.
 *
 * Same rule as ReviewArtifact above and it matters more here: everything
 * rendered came out of the Presentation Document Version the studio froze at
 * Send, by way of the artifact stamped at Show. Live Directions are not read,
 * cannot be read, and do not reach this page — so a title the designer edits
 * this afternoon does not silently change what the client is answering about.
 *
 * WHAT IS DELIBERATELY ABSENT: rejected or unselected Directions, the
 * designer's notes and rationale, evidence, storage paths, package internals,
 * and any control that writes. The projection is the boundary — this component
 * could not show those things if it wanted to, because they were never put in
 * the payload.
 *
 * `sourceId` travels but is never rendered. It is the Direction's durable
 * recordId, and it has to make the round trip so the client's "this one" can be
 * checked server-side against what was actually sent.
 */
function PresentationArtifact({ artifact, chosenRef, onChoose, disabled }) {
  const items = artifact?.payload?.items || []
  if (!items.length) return null
  return (
    <ul className="client-portal-directions">
      {items.map((item, i) => {
        /* Numbered rather than lettered. A/B/C are studio slot names and mean
           nothing to the person reading this page. */
        const name = item.label || `Option ${i + 1}`
        return (
          <li key={item.itemId} className="client-portal-direction">
            {item.mark?.image ? (
              <img
                className="client-portal-artifact-mark"
                src={item.mark.image}
                alt={`${name} — the logo`}
              />
            ) : null}
            <p className="client-portal-direction-name">{name}</p>
            {item.palette?.hexes?.length ? (
              <ul className="client-portal-artifact-swatches">
                {item.palette.hexes.map((hex) => (
                  <li key={hex}>
                    <span
                      className="client-portal-artifact-swatch"
                      style={{ background: hex }}
                      aria-hidden="true"
                    />
                    <span className="client-portal-artifact-hex">{hex}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {item.type?.heading || item.type?.body ? (
              <p className="client-portal-artifact-type">
                {[item.type.heading, item.type.body].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            {/* Optional, and said as a leaning rather than a decision — the
                designer chooses, and a client who feels they have just signed
                something will hedge instead of telling you what they think. */}
            <label className="client-portal-direction-pick">
              <input
                type="radio"
                name={`prefer-${artifact?.fingerprint || 'presentation'}`}
                checked={chosenRef === item.sourceId}
                disabled={disabled}
                onChange={() => onChoose(item.sourceId)}
              />
              <span>I'm drawn to this one</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
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
  /* Which option the client leaned toward, before they press send. Kept in the
     same shape as the note drafts and cleared the same way. */
  const [preferDrafts, setPreferDrafts] = useState({})

  const respondStep = async (stepId, status) => {
    if (pendingStepId) return
    setError('')
    setPendingStepId(stepId)
    const note = noteDrafts[stepId] || ''
    const r = await respondToPortalStep(
      portalId,
      stepId,
      status,
      note,
      preferDrafts[stepId] || ''
    )
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
    setPreferDrafts((d) => {
      const next = { ...d }
      delete next[stepId]
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

  /* Pushable stops only, then visibility. Belt and braces on purpose: a
     studio row saved before this filter existed could carry visibility for a
     stop the portal must not offer, and the client is the one person who
     cannot be told "ignore that button". */
  /* Pushable, visible, AND carrying something to look at. The third condition
     is the R4 rule at the render layer: no artifact, no approval controls,
     because a client cannot approve what they were not shown. The RPC refuses
     the same case, so this is the honest screen for a state that could not have
     been submitted anyway. */
  const visibleSteps = portalPushableSteps().filter(
    (s) => portal.stepVisibility?.[s.id] && portal.reviewArtifacts?.[s.id]
  )

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

        {/* The finished brand book, once it has been sent. First thing on the
            page, because it is the thing they came back for — and a link out
            to /d/ rather than the book inline: the reveal is its own page, and
            burying it under the approval admin is what that page exists to
            avoid. */}
        {portal.deliveryStatus === 'delivered' && (
          <div className="client-portal-delivery">
            <h2 className="client-portal-subhead">Your brand book is ready</h2>
            <a className="btn btn-primary" href={brandRevealUrl(portalId)}>
              Open it
            </a>
          </div>
        )}

        {visibleSteps.length === 0 ? (
          <p className="public-fill-status">
            Nothing has been shared with you yet — check back once your designer pushes an
            update.
          </p>
        ) : (
          <div className="client-portal-steps">
            {visibleSteps.map((step) => {
              const status = portal.stepStatus?.[step.id]?.status || 'pending'
              const artifact = portal.reviewArtifacts?.[step.id]
              /* APPROVAL OR FEEDBACK — the one branch that decides what this
                 card offers. `design` is the identity, and approving it is a
                 commitment. `ideate` is a set of options to react to, and there
                 is no Approve button on it because approving a shortlist is not
                 a thing a person can meaningfully do. The RPC refuses it too;
                 this is the half the client can see. */
              const collects = collectsFor(step.id)
              const canApprove = collects === 'approval'
              return (
                <div key={step.id} className="client-portal-step">
                  <div className="client-portal-step-head">
                    <span className="client-portal-step-label">{step.label}</span>
                    <span className={`client-portal-step-badge is-${status}`}>
                      {status === 'approved'
                        ? 'Approved'
                        : status === 'changes_requested'
                          ? canApprove
                            ? 'Changes requested'
                            : 'Thanks — sent'
                          : 'Waiting on you'}
                    </span>
                  </div>
                  {/* The artifact FIRST, then the question about it. A
                      decision asked before the thing is on screen is the
                      defect this whole change exists to remove. */}
                  {canApprove ? (
                    <ReviewArtifact artifact={artifact} />
                  ) : (
                    <PresentationArtifact
                      artifact={artifact}
                      chosenRef={preferDrafts[step.id] || ''}
                      onChoose={(ref) =>
                        setPreferDrafts((d) => ({ ...d, [step.id]: ref }))
                      }
                      disabled={pendingStepId === step.id}
                    />
                  )}
                  {status !== 'approved' ? (
                    <div className="client-portal-step-actions">
                      <textarea
                        className="field-input"
                        rows={2}
                        placeholder={
                          canApprove
                            ? "Optional note about what you'd like changed"
                            : 'What do you like, and what would you change?'
                        }
                        value={noteDrafts[step.id] || ''}
                        onChange={(e) =>
                          setNoteDrafts((d) => ({ ...d, [step.id]: e.target.value }))
                        }
                      />
                      <div className="client-portal-step-buttons">
                        {canApprove ? (
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
                        ) : null}
                        <button
                          type="button"
                          className={`btn btn-sm ${canApprove ? 'btn-secondary' : 'btn-primary'}`}
                          disabled={pendingStepId === step.id}
                          onClick={() => respondStep(step.id, 'changes_requested')}
                        >
                          {/* On a presentation this is the only button, so it
                              says what it does there: send the reaction. */}
                          {canApprove ? 'Request changes' : 'Send my thoughts'}
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
