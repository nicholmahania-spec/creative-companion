/**
 * Project overview — export / send / import panel. Three paths:
 *   1. Export a formatted PDF of the filled-in overview.
 *   2. Send a client dashboard link (they see pushed steps, approve or
 *      request changes, chat, and fill the overview form themselves).
 *   3. Print a blank PDF, have the client fill it by hand, scan it back
 *      in — OCR proposes answers, you review before anything saves.
 *
 * Nothing here writes to the project without an explicit review step, and
 * an in-progress review survives the panel being closed — losing a
 * half-checked scan to a stray backdrop click is the abandonment case.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { JOURNEY_STEPS } from '../lib/journey'
import { DETECTIVE_CHAPTERS } from '../lib/detectiveBrief'
import { downloadProjectOverviewPdf } from '../lib/exportFiles'
import { ocrOverviewForm, ocrOverviewPdf, readOverviewPdfForm } from '../lib/overviewOcr'
import {
  clientPortalUrl,
  createClientPortal,
  fetchPortalStudioView,
  fetchStudioMessages,
  postStudioMessage,
  setPortalDetectiveAnswers,
  setPortalStepVisibility,
} from '../lib/clientPortal'
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
  flashToast,
  flashMicro,
}) {
  const [mode, setMode] = useState('menu')
  /** Lives at panel level, not inside PaperMode, so closing the panel does
   *  not unmount a review the user is halfway through. */
  const [draft, setDraft] = useState(null)
  const panelRef = useRef(null)
  const restoreFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return
    // A draft outranks the menu: reopening returns you to where you were.
    if (draft) setMode(draft.source === 'portal' ? 'portal' : 'paper')
    // Existing state answers "which of the three?" — don't ask again.
    else setMode(portalId ? 'portal' : 'menu')
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
              onApplyAnswers?.(cleaned)
              setDraft(null)
              flashMicro?.('Answers saved to the project')
            }}
          />
        ) : (
          <>
            {mode === 'menu' && (
              <MenuMode
                project={project}
                portalId={portalId}
                onPick={setMode}
                flashToast={flashToast}
                flashMicro={flashMicro}
              />
            )}

            {mode === 'portal' && (
              <PortalMode
                project={project}
                portalId={portalId}
                onSetPortalId={onSetPortalId}
                onReview={setDraft}
                onBack={() => setMode('menu')}
                flashToast={flashToast}
                flashMicro={flashMicro}
              />
            )}

            {mode === 'paper' && (
              <PaperMode
                project={project}
                onReview={setDraft}
                onBack={() => setMode('menu')}
                flashToast={flashToast}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MenuMode({ project, portalId, onPick, flashToast, flashMicro }) {
  const [exporting, setExporting] = useState(false)

  return (
    <div className="discovery-brief-menu">
      <button
        type="button"
        className="btn btn-primary"
        disabled={exporting}
        onClick={async () => {
          setExporting(true)
          const r = await downloadProjectOverviewPdf(project, { blank: false })
          setExporting(false)
          if (!r.ok) flashToast?.(r.error || 'Couldn’t export the PDF')
          else flashMicro?.('Overview PDF downloaded')
        }}
      >
        {exporting ? 'Making the PDF…' : 'Download a PDF of this page'}
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => onPick('portal')}>
        {portalId ? 'Open the client dashboard' : 'Send the client a dashboard link'}
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => onPick('paper')}>
        Print a blank form for a client
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => onPick('paper')}>
        Scan a filled-in paper form back in
      </button>
    </div>
  )
}

function PortalMode({
  project,
  portalId,
  onSetPortalId,
  onReview,
  onBack,
  flashToast,
  flashMicro,
}) {
  const [creating, setCreating] = useState(false)
  const [portal, setPortal] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [busyStep, setBusyStep] = useState(null)
  const [sendingForm, setSendingForm] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

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
    setCreating(true)
    const r = await createClientPortal({
      projectLocalId: project?.id,
      clientName: project?.detective?.clientName || project?.name || '',
      detectiveAnswers: project?.detective || {},
    })
    setCreating(false)
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t create the dashboard')
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

  const formStatusText =
    portal?.form_status === 'submitted'
      ? 'Client submitted their answers.'
      : portal?.form_status === 'pending'
        ? 'Sent — waiting on the client.'
        : 'Not sent yet.'

  return (
    <div className="overview-share-portal">
      <button type="button" className="btn btn-ghost btn-sm discovery-brief-back" onClick={onBack}>
        ← Back
      </button>

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

          <p className="client-portal-subhead">What the client can see</p>
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

          <p className="client-portal-subhead">Messages</p>
          <div className="client-portal-chat-log">
            {messages.length === 0 ? (
              <p className="discovery-brief-hint">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`client-portal-chat-msg is-${m.sender}`}>
                  <span className="client-portal-chat-sender">
                    {m.sender === 'studio' ? 'You' : 'Client'}
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
    </div>
  )
}

/** Shared review step for anything that would otherwise write to the project
 *  behind the user's back — OCR guesses and client submissions alike. */
function ReviewAnswers({ draft, onChange, onCancel, onApply }) {
  const { answers, current = {}, source } = draft
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
