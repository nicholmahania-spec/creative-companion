/**
 * Project overview — the client-link panel. One body, no mode menu (the
 * old four-way MenuMode was a fork billed on every open): the portal link,
 * per-stop visibility toggles, the overview form, the survey, and — as
 * plain rows at the bottom — the PDF export and the print/scan paper path.
 *
 * Nothing here writes to the project without an explicit review step, and
 * an in-progress review survives the panel being closed — losing a
 * half-checked scan to a stray backdrop click is the abandonment case.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { JOURNEY_STEPS } from '../lib/journey'
import { DETECTIVE_CHAPTERS, coerceScannedAnswers } from '../lib/detectiveBrief'
import { downloadProjectOverviewPdf } from '../lib/exportFiles'
import { ocrOverviewForm, ocrOverviewPdf, readOverviewPdfForm } from '../lib/overviewOcr'
import {
  clientPortalUrl,
  createClientPortal,
  revokeClientPortal,
  fetchPortalStudioView,
  sendPortalSurvey,
  fetchStudioMessages,
  postStudioMessage,
  setPortalDetectiveAnswers,
  setPortalStepVisibility,
} from '../lib/clientPortal'
import {
  SURVEY_KINDS,
  surveyQuestions,
  surveyLine,
  surveyKindLabel,
  groupAnswers,
} from '../lib/clientSurvey'
import '../styles/lazy-define.css'
import '../styles/lazy-clients.css'

const ALL_FIELDS = DETECTIVE_CHAPTERS.flatMap((c) => c.fields)
const fieldLabel = (id) => ALL_FIELDS.find((f) => f.id === id)?.label || id

/** Clipboard writes fail silently in non-secure contexts and on permission
 *  denial. Reporting "copied" when nothing was copied is worse than saying
 *  nothing — the user pastes stale content into a client email. */
async function copyText(text) {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function ProjectOverviewSharePanel({
  open,
  onClose,
  project,
  portalId,
  onSetPortalId,
  onApplyAnswers,
  autoOpenReview,
  onAutoOpenReviewHandled,
  flashToast,
  flashMicro,
}) {
  const [mode, setMode] = useState('menu')
  /** Lives at panel level, not inside PaperMode, so closing the panel does
   *  not unmount a review the user is halfway through. */
  const [draft, setDraft] = useState(null)
  /* Every draft carries the project it belongs to. A review can sit open
     indefinitely — the panel is deliberately built so closing it does not
     discard one — so by the time Apply is pressed the active project may be
     a different one entirely. */
  const beginReview = useCallback(
    (d) => {
      /* Scanned and PDF-form answers arrive as plain text for EVERY field,
         because the blank form has no checkbox, radio or scale to offer. Put
         them into the shape their field declares before anything is rendered
         or saved — a raw string in a checklist field is invisible everywhere
         downstream and silently changes what the client's brand book prints.
         Whatever cannot be matched is carried alongside as text so the review
         screen can show it rather than dropping the client's words. */
      const { answers, unmatched } = coerceScannedAnswers(d?.answers || {})
      setDraft({
        ...d,
        answers,
        unmatched,
        ownerProjectId: d?.ownerProjectId ?? project?.id,
      })
    },
    [project?.id]
  )
  const panelRef = useRef(null)
  const restoreFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return
    // A draft outranks everything: reopening returns you to where you were.
    if (draft) setMode(draft.source === 'portal' ? 'portal' : 'paper')
    // No menu anymore (advisor ruling): the panel opens straight to the
    // portal body. The old MenuMode was a four-way fork billed on every
    // visit, two of whose labels went to the same place; without a portal
    // the body is one create action, which asks nothing.
    else setMode('portal')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const requestClose = useCallback(() => {
    if (draft) {
      flashToast?.('Your reviewed answers are kept — reopen to finish.')
    }
    onClose?.()
  }, [draft, flashToast, onClose])

  /** Held in a ref so the trap effect below depends only on `open` — keying
   *  it on requestClose would re-run (and re-steal focus) on every keystroke
   *  in the review form. */
  const requestCloseRef = useRef(requestClose)
  requestCloseRef.current = requestClose

  /** Escape, initial focus, focus return, and a tab loop. The dialog already
   *  claimed aria-modal="true" without implementing any of it. */
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
        requestCloseRef.current()
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
  }, [open])

  if (!open) return null

  return (
    <div
      className="export-overlay overview-share-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="overview-share-title"
      onClick={(e) => {
        // Never let a stray outside click destroy a review in progress.
        if (e.target === e.currentTarget && !draft) onClose()
      }}
    >
      <div className="export-panel overview-share-panel" ref={panelRef}>
        <div className="export-panel-header">
          <h3 id="overview-share-title" className="overview-share-title">
            Share project overview
          </h3>
          <button
            type="button"
            className="btn btn-ghost overview-share-close"
            onClick={requestClose}
            aria-label="Close"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {draft ? (
          <ReviewAnswers
            draft={draft}
            onChange={setDraft}
            onCancel={() => setDraft(null)}
            onApply={(cleaned) => {
              onApplyAnswers?.(cleaned, draft.ownerProjectId)
              setDraft(null)
              flashMicro?.('Answers saved to the project')
            }}
          />
        ) : (
          <>
            {mode === 'portal' && (
              <PortalMode
                project={project}
                portalId={portalId}
                onSetPortalId={onSetPortalId}
                onReview={beginReview}
                onPaper={() => setMode('paper')}
                autoOpenReview={autoOpenReview}
                onAutoOpenReviewHandled={onAutoOpenReviewHandled}
                flashToast={flashToast}
                flashMicro={flashMicro}
              />
            )}

            {mode === 'paper' && (
              <PaperMode
                project={project}
                onReview={beginReview}
                onBack={() => setMode('portal')}
                flashToast={flashToast}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* MenuMode is gone (advisor ruling): it was a four-way fork billed on every
   open, two of whose labels went to the same place. The PDF download and the
   paper path live as plain rows at the bottom of PortalMode now — zero
   decisions when unused, one click when needed. */

function PortalMode({
  project,
  portalId,
  onSetPortalId,
  onReview,
  onPaper,
  autoOpenReview,
  onAutoOpenReviewHandled,
  flashToast,
  flashMicro,
}) {
  const [creating, setCreating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const downloadOverviewPdf = async () => {
    setExportingPdf(true)
    const r = await downloadProjectOverviewPdf(project, { blank: false })
    setExportingPdf(false)
    if (!r.ok) flashToast?.(r.error || 'Couldn’t export the PDF')
    else flashMicro?.('Overview PDF downloaded')
  }
  /* Kept beside the button as well as toasted. A toast is a glance you can
     miss — the owner's own note is that anything at the bottom of the screen
     does not get seen — and this one was invisible outright until the toast
     was lifted above the dialog backdrop. The reason a client link could not
     be made belongs next to the control that could not make it. */
  const [createError, setCreateError] = useState('')
  const [portal, setPortal] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [busyStep, setBusyStep] = useState(null)
  const [sendingForm, setSendingForm] = useState(false)
  const [sendingSurvey, setSendingSurvey] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  // Two-tap confirm for revoke — a destructive, outbound action (it kills a
  // link the client is holding), so it carries a word and asks once, inline,
  // rather than firing on a single tap. No modal (keeps it in place).
  const [revokeArmed, setRevokeArmed] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const refresh = useCallback(async () => {
    if (!portalId) return
    setLoading(true)
    const r = await fetchPortalStudioView(portalId)
    const m = await fetchStudioMessages(portalId)
    setLoading(false)
    setLoaded(true)
    setLoadError(!r.ok)
    if (r.ok) setPortal(r.portal)
    if (m.ok) setMessages(m.messages)
  }, [portalId])

  useEffect(() => {
    refresh()
  }, [refresh])

  /** A message thread that only updates when you remember to press Refresh
   *  is a message thread that gets missed. */
  useEffect(() => {
    if (!portalId) return undefined
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [portalId, refresh])

  const handleCreate = async () => {
    setCreateError('')
    setCreating(true)
    const r = await createClientPortal({
      projectLocalId: project?.id,
      clientName: project?.detective?.clientName || project?.name || '',
      detectiveAnswers: project?.detective || {},
    })
    setCreating(false)
    if (!r.ok) {
      const message = r.error || 'Couldn’t create the dashboard'
      setCreateError(message)
      flashToast?.(message)
      return
    }
    onSetPortalId?.(r.portalId)
    const copied = await copyText(clientPortalUrl(r.portalId))
    flashToast?.(
      copied
        ? 'Client dashboard created and link copied'
        : 'Client dashboard created — use Copy to grab the link'
    )
  }

  const handleRevoke = async () => {
    if (!revokeArmed) {
      setRevokeArmed(true)
      return
    }
    setRevoking(true)
    const r = await revokeClientPortal(portalId)
    setRevoking(false)
    setRevokeArmed(false)
    if (r.ok) {
      // The client's answers/chat/approvals are kept — only the link dies.
      setPortal((p) => (p ? { ...p, revoked_at: new Date().toISOString() } : p))
      flashToast?.('Link revoked — the old link no longer opens')
    } else {
      flashToast?.(r.error || 'Couldn’t revoke the link')
    }
  }

  const toggleStep = async (stepId, stepLabel) => {
    const next = {
      ...(portal?.step_visibility || {}),
      [stepId]: !portal?.step_visibility?.[stepId],
    }
    setBusyStep(stepId)
    setPortal((p) => (p ? { ...p, step_visibility: next } : p))
    const r = await setPortalStepVisibility(portalId, next)
    setBusyStep(null)
    if (!r.ok) {
      flashToast?.(r.error || `Couldn’t change “${stepLabel}” — put back as it was`)
      refresh()
    }
  }

  const sendForm = async () => {
    setSendingForm(true)
    const r = await setPortalDetectiveAnswers(portalId, project?.detective || {})
    setSendingForm(false)
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t send the form')
      return
    }
    flashMicro?.('Form sent to client')
    refresh()
  }

  const sendSurvey = async (kind) => {
    setSendingSurvey(true)
    const r = await sendPortalSurvey(portalId, kind, surveyQuestions(kind))
    setSendingSurvey(false)
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t send the survey')
      return
    }
    flashMicro?.('Survey sent to client')
    refresh()
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    const body = chatInput.trim()
    if (!body || sendingMessage) return
    setSendingMessage(true)
    const r = await postStudioMessage(portalId, body)
    setSendingMessage(false)
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t send')
      return
    }
    setChatInput('')
    refresh()
  }

  /** Routed through the same review screen the paper scan uses. Merging
   *  overwrites whatever you already wrote, so it needs to be seen first. */
  const reviewClientAnswers = () => {
    const submitted = portal?.submitted_answers
    if (!submitted || !Object.keys(submitted).length) {
      flashToast?.('Client hasn’t submitted the form yet')
      return
    }
    onReview?.({
      source: 'portal',
      answers: { ...submitted },
      current: project?.detective || {},
    })
  }

  /** The Client Inbox's "Open their answers" button used to only land here
   *  (step toggles, chat log) with the actual answers a second, buried
   *  button away — the button's label promised something this screen alone
   *  didn't deliver. Once the portal data has actually loaded, open the
   *  review screen the same click implied. Runs once per inbox click, not
   *  on every render — the flag is consumed and reset immediately. */
  useEffect(() => {
    if (!autoOpenReview || !loaded) return
    onAutoOpenReviewHandled?.()
    if (portal?.submitted_answers && Object.keys(portal.submitted_answers).length) {
      reviewClientAnswers()
    } else {
      flashToast?.('Client hasn’t submitted the form yet')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenReview, loaded])

  const formStatusText =
    portal?.form_status === 'submitted'
      ? 'Client submitted their answers.'
      : portal?.form_status === 'pending'
        ? 'Sent — waiting on the client.'
        : 'Not sent yet.'

  return (
    <div className="overview-share-portal">
      {!portalId ? (
        <>
          <p className="discovery-brief-hint">
            Creates a private dashboard your client can open with just a link — no account.
            They see only the steps you push to them.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={creating}
            onClick={handleCreate}
          >
            {creating ? 'Creating…' : 'Create client dashboard'}
          </button>
          {createError && (
            <p className="discovery-brief-hint" role="alert">
              {createError}
            </p>
          )}
        </>
      ) : !loaded ? (
        <p className="discovery-brief-hint">Loading the dashboard…</p>
      ) : loadError ? (
        <>
          <p className="discovery-brief-hint">
            Couldn’t load the dashboard just now. Nothing has changed on the client’s side.
          </p>
          <button type="button" className="btn btn-secondary" onClick={refresh} disabled={loading}>
            {loading ? 'Trying again…' : 'Try again'}
          </button>
        </>
      ) : (
        <>
          {/* Status first. Bottom-of-panel is a documented blind spot. */}
          <div className="overview-share-status">
            <p className="discovery-brief-hint">{formStatusText}</p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={loading}
              onClick={refresh}
            >
              {loading ? 'Checking…' : 'Check for updates'}
            </button>
          </div>

          {portal?.revoked_at ? (
            <div className="discovery-brief-share-row">
              <p className="client-portal-revoked-note">
                Link revoked — the old link no longer opens. The client’s
                answers, messages and approvals are kept. Send a new dashboard
                link if you need to share again.
              </p>
            </div>
          ) : (
            <>
              <div className="discovery-brief-share-row">
                <input
                  className="field-input"
                  readOnly
                  aria-label="Client dashboard link"
                  value={clientPortalUrl(portalId)}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    const copied = await copyText(clientPortalUrl(portalId))
                    flashToast?.(copied ? 'Link copied' : 'Couldn’t copy — select the link and copy it')
                  }}
                >
                  Copy
                </button>
              </div>
              <a
                className="btn btn-secondary"
                href={`mailto:?subject=${encodeURIComponent(
                  `Your project dashboard${project?.name ? ` — ${project.name}` : ''}`
                )}&body=${encodeURIComponent(
                  `Hi — here's your project dashboard. You can see progress, approve work, leave notes, and message me here:\n\n${clientPortalUrl(portalId)}`
                )}`}
              >
                Email link to client
              </a>
              <div className="client-portal-revoke-row">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm client-portal-revoke-btn"
                  onClick={handleRevoke}
                  onBlur={() => setRevokeArmed(false)}
                  disabled={revoking}
                >
                  {revoking
                    ? 'Revoking…'
                    : revokeArmed
                      ? 'Tap again to revoke'
                      : 'Revoke link'}
                </button>
                {revokeArmed && !revoking ? (
                  <span className="client-portal-revoke-hint">
                    Kills this link for anyone holding it. The client’s answers
                    are kept.
                  </span>
                ) : null}
              </div>
            </>
          )}

          {/* OFF must read as timing, never as loss — an unchecked box next
              to a stop full of real work can land as "deleted" (rejection
              sensitivity + object permanence), so the line says where the
              work IS and the helper frames off as not-yet-worth-showing. */}
          <p className="client-portal-subhead">
            What the client can see (everything else stays private to you)
          </p>
          <p className="discovery-brief-hint">
            Turn a stop on when there is something on it worth looking at.
          </p>
          <div className="overview-share-steps">
            {JOURNEY_STEPS.map((step) => {
              const on = !!portal?.step_visibility?.[step.id]
              const status = portal?.step_status?.[step.id]?.status
              return (
                <label key={step.id} className="overview-share-step">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={busyStep === step.id}
                    onChange={() => toggleStep(step.id, step.label)}
                  />
                  <span>{step.label}</span>
                  {status ? (
                    <span className={`client-portal-step-badge is-${status}`}>
                      {status === 'approved' ? 'Approved' : 'Changes requested'}
                    </span>
                  ) : null}
                </label>
              )
            })}
          </div>
          {JOURNEY_STEPS.some((s) => portal?.step_status?.[s.id]?.note) && (
            <div className="overview-share-notes">
              <p className="client-portal-subhead">Client notes</p>
              {JOURNEY_STEPS.filter((s) => portal?.step_status?.[s.id]?.note).map((s) => (
                <p key={s.id} className="discovery-brief-hint">
                  <strong>{s.label}:</strong> {portal.step_status[s.id].note}
                </p>
              ))}
            </div>
          )}

          <p className="client-portal-subhead">Project overview form</p>
          <div className="discovery-brief-handoff-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={sendingForm}
              onClick={sendForm}
            >
              {sendingForm
                ? 'Sending…'
                : portal?.form_status === 'not_sent'
                  ? 'Ask client to fill it out'
                  : 'Re-send form'}
            </button>
            {portal?.form_status === 'submitted' && (
              <button type="button" className="btn btn-primary" onClick={reviewClientAnswers}>
                Review client’s answers
              </button>
            )}
          </div>

          {/* Survey — same portal, one gesture. Picking the moment picks the
              questions and sends them; there is no draft step and no question
              editor, because a blank survey builder is the blank canvas every
              other feature here was scoped down to avoid. */}
          <p className="client-portal-subhead">{surveyLine(portal?.survey_status)}</p>
          {portal?.survey_status === 'submitted' ? (
            <div className="survey-answers">
              <p className="discovery-brief-hint">
                {surveyKindLabel(portal?.survey_kind)} — grouped by what each
                answer is about. One complaint is a preference; the same theme
                twice is a process gap.
              </p>
              {groupAnswers(portal?.survey_kind, portal?.survey_answers || {}).map(
                (g) => (
                  <div key={g.theme} className="survey-theme">
                    <span className="define-field-label">{g.theme}</span>
                    {g.items.map((it) => (
                      <p key={it.id} className="survey-answer-row">
                        <span className="survey-answer-q">{it.text}</span>
                        <span className="survey-answer-a">{it.answer}</span>
                      </p>
                    ))}
                  </div>
                )
              )}
            </div>
          ) : null}
          <div className="discovery-brief-handoff-actions">
            {SURVEY_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={sendingSurvey}
                title={k.blurb}
                onClick={() => sendSurvey(k.id)}
              >
                {portal?.survey_status === 'not_sent' ? k.label : `Send ${k.label.toLowerCase()}`}
              </button>
            ))}
          </div>

          <p className="client-portal-subhead">Messages</p>
          <div className="client-portal-chat-log">
            {messages.length === 0 ? (
              <p className="discovery-brief-hint">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`client-portal-chat-msg is-${m.sender}`}>
                  <span className="client-portal-chat-sender">
                    {m.sender === 'studio'
                      ? 'You'
                      : project?.detective?.clientName || 'Client'}
                  </span>
                  <p>{m.body}</p>
                </div>
              ))
            )}
          </div>
          <form className="client-portal-chat-form" onSubmit={sendMessage}>
            <input
              className="field-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message your client…"
              aria-label="Message"
            />
            <button type="submit" className="btn btn-secondary" disabled={sendingMessage}>
              {sendingMessage ? 'Sending…' : 'Send'}
            </button>
          </form>
        </>
      )}

      {/* The rare paths, as plain rows at the bottom — not a mode picker.
          A rare path that costs a choice on the common path is the worst
          trade this panel can make; as rows they cost zero decisions when
          unused and one click when needed. */}
      <p className="client-portal-subhead">On paper</p>
      <div className="discovery-brief-handoff-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={exportingPdf}
          onClick={downloadOverviewPdf}
        >
          {exportingPdf ? 'Making the PDF…' : 'Download a PDF of this page'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onPaper}>
          Print a blank brief / scan one back in
        </button>
      </div>
    </div>
  )
}

/** Shared review step for anything that would otherwise write to the project
 *  behind the user's back — OCR guesses and client submissions alike. */
function ReviewAnswers({ draft, onChange, onCancel, onApply }) {
  const { answers, current = {}, source, unmatched = {} } = draft
  const missed = ALL_FIELDS.filter((f) => !(f.id in answers))

  return (
    <div className="overview-share-review">
      <button type="button" className="btn btn-ghost btn-sm discovery-brief-back" onClick={onCancel}>
        ← Back
      </button>
      <p className="discovery-brief-hint">
        {source === 'portal'
          ? 'These are your client’s answers. Anything you keep here replaces what’s currently on the project — clear a box to keep what you already wrote.'
          : source === 'pdfform'
            ? 'Read straight from the filled-in PDF, exactly as typed — no guesswork. Anything you keep here replaces what’s currently on the project.'
            : 'Scanned handwriting is often misread — check each line before saving. Edit anything that’s wrong, or clear a box to skip that field.'}
      </p>
      {Object.entries(answers).map(([fieldId, value]) => {
        // Client image attachments arrive as a sibling `${id}Files` array of
        // {name,url} — not text. A plain <textarea value={array}> renders
        // "[object Object]" and, if the user edits that garbled box thinking
        // it's wrong, silently overwrites the client's uploaded images with
        // whatever string they typed. Read-only thumbnails instead: nothing
        // to accidentally corrupt, and it shows what's actually there.
        /* Attachments ONLY. This used to test Array.isArray(value), which is
           true of the checklist fields too — deliverablesPicked and
           brandSurfaces are arrays of option ids, not {name,url} pairs. They
           fell in here and rendered as <a href={undefined}><img
           src={undefined}>: a row of broken images labelled "What do you need
           made? — attached", read-only. That is the answer that decides what
           you are being paid for, on the screen whose whole promise is that
           you see every line before it is saved. */
        if (fieldId.endsWith('Files') && Array.isArray(value)) {
          const baseId = fieldId.slice(0, -5)
          return (
            <div className="field-block" key={fieldId}>
              <label className="field-label">{fieldLabel(baseId)} — attached</label>
              <div className="define-attach-thumbs">
                {value.map((f) => (
                  <a
                    key={f.url}
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="define-attach-thumb"
                    title={f.name || 'Attachment'}
                  >
                    <img src={f.url} alt={f.name || 'Attachment'} />
                  </a>
                ))}
              </div>
            </div>
          )
        }
        /* Real checkboxes, from the schema's own options, so the value stays
           an array of valid ids and nothing here can corrupt it by typing.
           Grouped the same way the client saw it — an extra is priced
           differently, and that distinction has to survive the round trip. */
        const field = ALL_FIELDS.find((f) => f.id === fieldId)
        if (field?.type === 'checklist') {
          const picked = Array.isArray(value) ? value : []
          const setPicked = (next) =>
            onChange({ ...draft, answers: { ...answers, [fieldId]: next } })
          return (
            <div className="field-block" key={fieldId}>
              <label className="field-label">{fieldLabel(fieldId)}</label>
              {unmatched[fieldId] && (
                <p className="discovery-brief-hint">
                  Couldn’t match to an option: “{unmatched[fieldId]}” — tick
                  what it meant.
                </p>
              )}
              <div className="define-checklist">
                {[
                  {
                    key: 'included',
                    label: 'Included',
                    items: (field.options || []).filter((o) => !o.extra),
                  },
                  {
                    key: 'extra',
                    label: 'Quoted separately',
                    items: (field.options || []).filter((o) => o.extra),
                  },
                ]
                  .filter((g) => g.items.length > 0)
                  .map((g) => (
                    <fieldset key={g.key} className="define-checklist-group">
                      <legend className="define-checklist-legend">
                        {g.label}
                      </legend>
                      {g.items.map((o) => {
                        const on = picked.includes(o.id)
                        return (
                          <label
                            key={o.id}
                            className={`define-check-row${on ? ' is-on' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() =>
                                setPicked(
                                  on
                                    ? picked.filter((x) => x !== o.id)
                                    : [...picked, o.id]
                                )
                              }
                            />
                            <span>{o.label}</span>
                          </label>
                        )
                      })}
                    </fieldset>
                  ))}
              </div>
            </div>
          )
        }

        const existing = String(current?.[fieldId] || '').trim()
        return (
          <div className="field-block" key={fieldId}>
            <label className="field-label" htmlFor={`review-${fieldId}`}>
              {fieldLabel(fieldId)}
            </label>
            {existing && existing !== String(value || '').trim() && (
              <p className="discovery-brief-hint">Replaces: “{existing}”</p>
            )}
            <textarea
              id={`review-${fieldId}`}
              className="field-textarea"
              rows={2}
              value={value}
              onChange={(e) =>
                onChange({ ...draft, answers: { ...answers, [fieldId]: e.target.value } })
              }
            />
          </div>
        )
      })}

      {missed.length > 0 && (
        <div className="overview-share-missed">
          <p className="field-label">
            {source === 'paper' ? 'Not found on the scan' : 'Not answered by the client'}
          </p>
          <ul>
            {missed.map((f) => (
              <li key={f.id}>{f.label}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={() =>
          onApply(
            Object.fromEntries(
              Object.entries(answers).filter(([, v]) => String(v || '').trim())
            )
          )
        }
      >
        Save these answers
      </button>
    </div>
  )
}

function PaperMode({ project, onReview, onBack, flashToast }) {
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [exporting, setExporting] = useState(false)

  const handleScan = async (file) => {
    if (!file) return
    /* Stamp the project the scan STARTED on. Reading it later would resolve
       to whatever is open when OCR finishes — and OCR of handwriting runs for
       seconds. Same reason ResearchView captures ownerProjectId before its
       upload read. */
    const ownerProjectId = project?.id
    const isPdf =
      file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')

    // A PDF the client filled in on screen reads back exactly. Try that
    // first — it beats OCR outright when it applies.
    if (isPdf) {
      setScanning(true)
      setProgress(0)
      const form = await readOverviewPdfForm(file)
      setScanning(false)
      if (form.ok) {
        onReview?.({
          source: 'pdfform',
          answers: form.answers,
          current: project?.detective || {},
          ownerProjectId,
        })
        return
      }
      // No form fields: it's a genuine paper scan. Fall through to OCR
      // rather than bouncing the file back — asking someone to re-photograph
      // a page they already scanned is a dead end, not a fix.
      setScanning(true)
      setProgress(0)
      const scan = await ocrOverviewPdf(file, setProgress)
      setScanning(false)
      if (!scan.ok) {
        flashToast?.(scan.error || 'Couldn’t read that PDF')
        return
      }
      if (!Object.keys(scan.answers).length) {
        flashToast?.(
          'Couldn’t find any answers in that scan — try a clearer scan or a photo of the page'
        )
        return
      }
      onReview?.({
        source: 'paper',
        answers: scan.answers,
        current: project?.detective || {},
        ownerProjectId,
      })
      return
    }

    setScanning(true)
    setProgress(0)
    const r = await ocrOverviewForm(file, setProgress)
    setScanning(false)
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t read that file')
      return
    }
    if (!Object.keys(r.answers).length) {
      flashToast?.('Couldn’t find any answers on that scan — try a clearer photo')
      return
    }
    onReview?.({
      source: 'paper',
      answers: r.answers,
      current: project?.detective || {},
      ownerProjectId,
    })
  }

  return (
    <div className="overview-share-paper">
      <button type="button" className="btn btn-ghost btn-sm discovery-brief-back" onClick={onBack}>
        ← Back
      </button>

      <div className="discovery-brief-handoff-block">
        <p className="discovery-brief-hint">
          Print a blank copy for a client to fill in by hand.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={exporting}
          onClick={async () => {
            setExporting(true)
            const r = await downloadProjectOverviewPdf(project, { blank: true })
            setExporting(false)
            if (!r.ok) flashToast?.(r.error || 'Couldn’t export the PDF')
            else flashToast?.('Blank form downloaded')
          }}
        >
          {exporting ? 'Making the PDF…' : 'Download blank form (PDF)'}
        </button>
      </div>

      <div className="discovery-brief-handoff-block">
        <p className="discovery-brief-hint">
          Upload the completed form here. If the client filled it in on screen, send the
          PDF back and it reads exactly as typed. If they filled it in by hand, photograph
          the page. Either way you review every line before anything is saved.
        </p>
        {scanning ? (
          <div role="status" aria-live="polite">
            <p className="discovery-brief-hint">Reading the form…</p>
            <div className="overview-share-progress">
              <div
                className="overview-share-progress-fill"
                style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
              />
            </div>
          </div>
        ) : (
          <label className="btn btn-secondary discovery-brief-attach">
            Upload completed form
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => {
                handleScan(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>
    </div>
  )
}

export default ProjectOverviewSharePanel
