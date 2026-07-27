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
import { JOURNEY_STEPS } from '../lib/journey'
import { DETECTIVE_CHAPTERS } from '../lib/detectiveBrief'
import {
  fetchClientPortal,
  fetchClientPortalMessages,
  postClientPortalMessage,
  respondToPortalStep,
  submitClientPortalForm,
} from '../lib/clientPortal'

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
  const chatEndRef = useRef(null)

  const load = async () => {
    const r = await fetchClientPortal(portalId)
    if (!r.ok) {
      setError(r.error)
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  const refreshMessages = async () => {
    const m = await fetchClientPortalMessages(portalId)
    if (m.ok) setMessages(m.messages)
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    const body = chatInput.trim()
    if (!body) return
    setSending(true)
    const r = await postClientPortalMessage(portalId, body)
    setSending(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    setChatInput('')
    await refreshMessages()
  }

  const respondStep = async (stepId, status) => {
    const note = noteDrafts[stepId] || ''
    const r = await respondToPortalStep(portalId, stepId, status, note)
    if (!r.ok) {
      setError(r.error)
      return
    }
    await load()
  }

  const submitForm = async (e) => {
    e.preventDefault()
    setFormSubmitting(true)
    const r = await submitClientPortalForm(portalId, formAnswers)
    setFormSubmitting(false)
    if (!r.ok) {
      setError(r.error)
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
                          onClick={() => respondStep(step.id, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
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
                {DETECTIVE_CHAPTERS.map((chapter) => (
                  <fieldset key={chapter.id} className="public-fill-section">
                    <legend>{chapter.title}</legend>
                    {/* designerOnly fields (budget, file formats) are
                        unanswerable for a client and only invite a wrong or
                        embarrassed guess — the designer records them. */}
                    {chapter.fields.filter((f) => !f.designerOnly).map((f) => (
                      <div className="field-block" key={f.id}>
                        <label className="field-label" htmlFor={`cp-${f.id}`}>
                          {f.label}
                        </label>
                        {f.tip && <p className="discovery-brief-hint">{f.tip}</p>}
                        {f.type === 'checklist' ? (
                          <div className="define-checklist">
                            {[
                              { key: 'included', label: 'Included', items: f.options.filter((o) => !o.extra) },
                              { key: 'extra', label: 'Quoted separately', items: f.options.filter((o) => o.extra) },
                            ].map((g) => (
                              <fieldset key={g.key} className="define-checklist-group">
                                <legend className="define-checklist-legend">{g.label}</legend>
                                {g.items.map((o) => {
                                  const picked = Array.isArray(formAnswers[f.id]) ? formAnswers[f.id] : []
                                  const on = picked.includes(o.id)
                                  return (
                                    <label key={o.id} className={`define-check-row${on ? ' is-on' : ''}`}>
                                      <input
                                        type="checkbox"
                                        checked={on}
                                        onChange={() =>
                                          setFormAnswers((a) => ({
                                            ...a,
                                            [f.id]: on
                                              ? picked.filter((x) => x !== o.id)
                                              : [...picked, o.id],
                                          }))
                                        }
                                      />
                                      <span>{o.label}</span>
                                    </label>
                                  )
                                })}
                              </fieldset>
                            ))}
                          </div>
                        ) : f.area ? (
                          <textarea
                            id={`cp-${f.id}`}
                            className="field-input"
                            rows={3}
                            value={formAnswers[f.id] || ''}
                            onChange={(e) =>
                              setFormAnswers((a) => ({ ...a, [f.id]: e.target.value }))
                            }
                          />
                        ) : (
                          <input
                            id={`cp-${f.id}`}
                            className="field-input"
                            value={formAnswers[f.id] || ''}
                            onChange={(e) =>
                              setFormAnswers((a) => ({ ...a, [f.id]: e.target.value }))
                            }
                          />
                        )}
                      </div>
                    ))}
                  </fieldset>
                ))}
                <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Submitting…' : 'Submit'}
                </button>
              </form>
            )}
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
