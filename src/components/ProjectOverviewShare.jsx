/**
 * Project overview — export / send / import panel. Three paths:
 *   1. Export a formatted PDF of the filled-in overview.
 *   2. Send a client dashboard link (they see pushed steps, approve or
 *      request changes, chat, and fill the overview form themselves).
 *   3. Print a blank PDF, have the client fill it by hand, scan it back
 *      in — OCR proposes answers, you review before anything saves.
 */
import { useEffect, useState } from 'react'
import { JOURNEY_STEPS } from '../lib/journey'
import { DETECTIVE_CHAPTERS } from '../lib/detectiveBrief'
import { downloadProjectOverviewPdf } from '../lib/exportFiles'
import { ocrOverviewForm } from '../lib/overviewOcr'
import {
  clientPortalUrl,
  createClientPortal,
  fetchPortalStudioView,
  fetchStudioMessages,
  postStudioMessage,
  setPortalDetectiveAnswers,
  setPortalStepVisibility,
} from '../lib/clientPortal'

const ALL_FIELDS = DETECTIVE_CHAPTERS.flatMap((c) => c.fields)
const fieldLabel = (id) => ALL_FIELDS.find((f) => f.id === id)?.label || id

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

  useEffect(() => {
    if (open) setMode('menu')
  }, [open])

  if (!open) return null

  return (
    <div
      className="export-overlay overview-share-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="overview-share-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="export-panel overview-share-panel">
        <div className="export-panel-header">
          <h3 id="overview-share-title" style={{ margin: 0 }}>
            Share project overview
          </h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ×
          </button>
        </div>

        {mode === 'menu' && (
          <div className="discovery-brief-menu">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                const r = await downloadProjectOverviewPdf(project, { blank: false })
                if (!r.ok) flashToast?.(r.error || 'Couldn’t export the PDF')
                else flashMicro?.('Overview PDF downloaded')
              }}
            >
              Export a PDF of this page
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setMode('portal')}>
              Send a client dashboard link
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setMode('paper')}>
              Print blank / scan a filled form back in
            </button>
          </div>
        )}

        {mode === 'portal' && (
          <PortalMode
            project={project}
            portalId={portalId}
            onSetPortalId={onSetPortalId}
            onApplyAnswers={onApplyAnswers}
            onBack={() => setMode('menu')}
            flashToast={flashToast}
            flashMicro={flashMicro}
          />
        )}

        {mode === 'paper' && (
          <PaperMode
            project={project}
            onApplyAnswers={onApplyAnswers}
            onBack={() => setMode('menu')}
            flashToast={flashToast}
            flashMicro={flashMicro}
          />
        )}
      </div>
    </div>
  )
}

function PortalMode({
  project,
  portalId,
  onSetPortalId,
  onApplyAnswers,
  onBack,
  flashToast,
  flashMicro,
}) {
  const [creating, setCreating] = useState(false)
  const [portal, setPortal] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    if (!portalId) return
    setLoading(true)
    const r = await fetchPortalStudioView(portalId)
    const m = await fetchStudioMessages(portalId)
    setLoading(false)
    if (r.ok) setPortal(r.portal)
    if (m.ok) setMessages(m.messages)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalId])

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
    navigator.clipboard?.writeText(clientPortalUrl(r.portalId))
    flashToast?.('Client dashboard created and link copied')
  }

  const toggleStep = async (stepId) => {
    const next = {
      ...(portal?.step_visibility || {}),
      [stepId]: !portal?.step_visibility?.[stepId],
    }
    setPortal((p) => (p ? { ...p, step_visibility: next } : p))
    const r = await setPortalStepVisibility(portalId, next)
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t update')
      refresh()
    }
  }

  const sendForm = async () => {
    const r = await setPortalDetectiveAnswers(portalId, project?.detective || {})
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
    if (!body) return
    const r = await postStudioMessage(portalId, body)
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t send')
      return
    }
    setChatInput('')
    refresh()
  }

  const pullClientAnswers = () => {
    const submitted = portal?.submitted_answers
    if (!submitted) {
      flashToast?.('Client hasn’t submitted the form yet')
      return
    }
    onApplyAnswers?.(submitted)
    flashMicro?.('Client’s answers merged in')
  }

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
      ) : (
        <>
          <div className="discovery-brief-share-row">
            <input
              className="field-input"
              readOnly
              value={clientPortalUrl(portalId)}
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(clientPortalUrl(portalId))
                flashToast?.('Link copied')
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

          <p className="field-label" style={{ marginTop: '1rem' }}>
            What the client can see
          </p>
          <div className="overview-share-steps">
            {JOURNEY_STEPS.map((step) => {
              const on = !!portal?.step_visibility?.[step.id]
              const status = portal?.step_status?.[step.id]?.status
              return (
                <label key={step.id} className="overview-share-step">
                  <input type="checkbox" checked={on} onChange={() => toggleStep(step.id)} />
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
              <p className="field-label">Client notes</p>
              {JOURNEY_STEPS.filter((s) => portal?.step_status?.[s.id]?.note).map((s) => (
                <p key={s.id} className="discovery-brief-hint">
                  <strong>{s.label}:</strong> {portal.step_status[s.id].note}
                </p>
              ))}
            </div>
          )}

          <p className="field-label" style={{ marginTop: '1rem' }}>
            Project overview form
          </p>
          <div className="discovery-brief-handoff-actions">
            <button type="button" className="btn btn-secondary" onClick={sendForm}>
              {portal?.form_status === 'not_sent' ? 'Ask client to fill it out' : 'Re-send form'}
            </button>
            {portal?.form_status === 'submitted' && (
              <button type="button" className="btn btn-primary" onClick={pullClientAnswers}>
                Use client’s answers
              </button>
            )}
          </div>
          <p className="discovery-brief-hint">
            {portal?.form_status === 'submitted'
              ? 'Client submitted their answers.'
              : portal?.form_status === 'pending'
                ? 'Sent — waiting on the client.'
                : 'Not sent yet.'}
          </p>

          <p className="field-label" style={{ marginTop: '1rem' }}>
            Messages
          </p>
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
            <button type="submit" className="btn btn-secondary">
              Send
            </button>
          </form>
          <button type="button" className="btn btn-ghost btn-sm" disabled={loading} onClick={refresh}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </>
      )}
    </div>
  )
}

function PaperMode({ project, onApplyAnswers, onBack, flashToast, flashMicro }) {
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [proposed, setProposed] = useState(null)

  const handleScan = async (file) => {
    if (!file) return
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
    setProposed(r.answers)
  }

  if (proposed) {
    return (
      <div className="overview-share-review">
        <button
          type="button"
          className="btn btn-ghost btn-sm discovery-brief-back"
          onClick={() => setProposed(null)}
        >
          ← Back
        </button>
        <p className="discovery-brief-hint">
          Scanned handwriting is often misread — check each line before saving. Edit anything
          that's wrong, or clear a box to skip that field.
        </p>
        {Object.entries(proposed).map(([fieldId, value]) => (
          <div className="field-block" key={fieldId}>
            <label className="field-label" htmlFor={`ocr-${fieldId}`}>
              {fieldLabel(fieldId)}
            </label>
            <textarea
              id={`ocr-${fieldId}`}
              className="field-input"
              rows={2}
              value={value}
              onChange={(e) =>
                setProposed((p) => ({ ...p, [fieldId]: e.target.value }))
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const cleaned = Object.fromEntries(
              Object.entries(proposed).filter(([, v]) => String(v || '').trim())
            )
            onApplyAnswers?.(cleaned)
            setProposed(null)
            flashMicro?.('Answers saved to the project')
          }}
        >
          Save these answers
        </button>
      </div>
    )
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
          onClick={async () => {
            const r = await downloadProjectOverviewPdf(project, { blank: true })
            if (!r.ok) flashToast?.(r.error || 'Couldn’t export the PDF')
            else flashMicro?.('Blank form downloaded')
          }}
        >
          Download blank form (PDF)
        </button>
      </div>

      <div className="discovery-brief-handoff-block">
        <p className="discovery-brief-hint">
          Scan or photograph the completed form and upload it here. You'll get a chance to
          review and fix every line before anything is saved.
        </p>
        {scanning ? (
          <p className="discovery-brief-hint">
            Reading… {Math.round(progress * 100)}%
          </p>
        ) : (
          <label className="btn btn-secondary discovery-brief-attach">
            Upload completed form
            <input
              type="file"
              accept="image/*"
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
