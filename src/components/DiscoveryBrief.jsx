/**
 * Discovery Brief — merged brand-identity project brief + client
 * questionnaire. Three ways to use it: fill it out yourself, run it
 * as a live one-question-at-a-time call script, or hand it off to the
 * client (email draft + downloadable fillable markdown, or accept a
 * completed file back).
 */
import { useState, useRef } from 'react'
import { useModalFocus } from '../lib/useModalFocus'
import { downscaleDataUrl } from '../lib/moodPins'
import {
  DISCOVERY_SECTIONS,
  DISCOVERY_FIELDS,
  discoveryBriefToMarkdown,
  discoveryBriefToPlainText,
  countAnswered,
} from '../lib/discoveryBrief'
import {
  createDiscoveryShare,
  discoveryShareUrl,
  fetchDiscoveryShare,
  revokeDiscoveryShare,
} from '../lib/discoveryShare'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function DiscoveryBriefPanel({
  open,
  onClose,
  answers = {},
  onUpdateField,
  clientName = '',
  upload = null,
  onSetUpload,
  flashToast,
  projectId = null,
  shareId = null,
  shareStatus = null,
  onSetShare,
  onMergeAnswers,
}) {
  const [mode, setMode] = useState('menu')
  const [callIndex, setCallIndex] = useState(0)

  /* Focus trap, focus restore, and Escape — this dialog had none of them.
     It set aria-modal="true", which tells assistive tech the rest of the page
     is inert, while Tab walked straight out into the page behind it. */
  const panelRef = useRef(null)
  useModalFocus(open, () => panelRef.current, { onClose })

  if (!open) return null

  const answeredCount = countAnswered(answers)
  const totalCount = DISCOVERY_FIELDS.length

  const backToMenu = () => setMode('menu')

  return (
    <div
      ref={panelRef}
      className="export-overlay discovery-brief-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discovery-brief-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="export-panel discovery-brief-panel">
        <div className="export-panel-header">
          <h3 id="discovery-brief-title" style={{ margin: 0 }}>
            Discovery brief
          </h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close discovery brief"
          >
            ×
          </button>
        </div>

        {/* Just the floor, no ratio — the same call the rail and the project
            sidebar already made, for the same reason: "24/30" is a number to
            decode that produces no next action, and a low first number reads
            as a scoreboard of nothing done. What's left is the whole message.
            The full count stays available to screen readers. */}
        <p className="discovery-brief-progress">
          <span aria-hidden="true">
            {totalCount - answeredCount > 0
              ? `${totalCount - answeredCount} left`
              : 'All answered'}
          </span>
          <span className="sr-only">
            {answeredCount} of {totalCount} answered
          </span>
        </p>

        {mode === 'menu' && (
          <div className="discovery-brief-menu">
            <button type="button" className="btn btn-secondary" onClick={() => setMode('fill')}>
              Fill it out myself
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setCallIndex(0)
                setMode('call')
              }}
            >
              Run as a call script
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setMode('handoff')}>
              Email to client / upload a completed form
            </button>
          </div>
        )}

        {mode === 'fill' && (
          <FillMode answers={answers} onUpdateField={onUpdateField} onBack={backToMenu} />
        )}

        {mode === 'call' && (
          <CallMode
            answers={answers}
            onUpdateField={onUpdateField}
            index={callIndex}
            setIndex={setCallIndex}
            onBack={backToMenu}
          />
        )}

        {mode === 'handoff' && (
          <HandoffMode
            answers={answers}
            clientName={clientName}
            upload={upload}
            onSetUpload={onSetUpload}
            onBack={backToMenu}
            flashToast={flashToast}
            projectId={projectId}
            shareId={shareId}
            shareStatus={shareStatus}
            onSetShare={onSetShare}
            onMergeAnswers={onMergeAnswers}
          />
        )}
      </div>
    </div>
  )
}

function FillMode({ answers, onUpdateField, onBack }) {
  return (
    <div className="discovery-brief-fill">
      <button type="button" className="btn btn-ghost btn-sm discovery-brief-back" onClick={onBack}>
        ← Back
      </button>
      {DISCOVERY_SECTIONS.map((section) => (
        <details key={section.id} className="discovery-brief-section" open>
          <summary>{section.label}</summary>
          {section.fields.map((f) => (
            <div className="field-block" key={f.id}>
              <label className="field-label" htmlFor={`discovery-${f.id}`}>
                {f.label}
              </label>
              {f.prompt && <p className="discovery-brief-hint">{f.prompt}</p>}
              {f.type === 'textarea' ? (
                <textarea
                  id={`discovery-${f.id}`}
                  className="field-input"
                  rows={2}
                  value={answers[f.id] || ''}
                  onChange={(e) => onUpdateField(f.id, e.target.value)}
                />
              ) : (
                <input
                  id={`discovery-${f.id}`}
                  className="field-input"
                  value={answers[f.id] || ''}
                  onChange={(e) => onUpdateField(f.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </details>
      ))}
    </div>
  )
}

function CallMode({ answers, onUpdateField, index, setIndex, onBack }) {
  const field = DISCOVERY_FIELDS[index]
  const section = DISCOVERY_SECTIONS.find((s) => s.fields.some((f) => f.id === field.id))

  return (
    <div className="discovery-brief-call">
      <button type="button" className="btn btn-ghost btn-sm discovery-brief-back" onClick={onBack}>
        ← Back
      </button>
      <p className="discovery-brief-call-progress">
        Question {index + 1} of {DISCOVERY_FIELDS.length} · {section?.label}
      </p>
      <p className="discovery-brief-call-question">{field.label}</p>
      {field.prompt && <p className="discovery-brief-hint">{field.prompt}</p>}
      <textarea
        autoFocus
        className="field-input discovery-brief-call-input"
        rows={4}
        value={answers[field.id] || ''}
        onChange={(e) => onUpdateField(field.id, e.target.value)}
        placeholder="Type the client's answer as they talk…"
      />
      <div className="discovery-brief-call-nav">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Previous
        </button>
        {/* The script ends with a way out, not with the primary button going
            grey. A finished run that offers no next action reads as an
            unfinished one, and the only route back was the small ghost
            "← Back" at the top of the panel. */}
        {index >= DISCOVERY_FIELDS.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={onBack}>
            Done — back to brief
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIndex((i) => Math.min(DISCOVERY_FIELDS.length - 1, i + 1))}
          >
            Next question
          </button>
        )}
      </div>
    </div>
  )
}

function HandoffMode({
  answers,
  clientName,
  upload,
  onSetUpload,
  onBack,
  flashToast,
  projectId,
  shareId,
  shareStatus,
  onSetShare,
  onMergeAnswers,
}) {
  const [creatingLink, setCreatingLink] = useState(false)
  const [checkingLink, setCheckingLink] = useState(false)
  // Two-tap confirm for revoke — destructive/outbound, so a word + inline
  // confirm, no modal. `revoked` reflects the kill locally (this surface
  // doesn't re-fetch the share's revoked_at).
  const [revoked, setRevoked] = useState(false)
  const [revokeArmed, setRevokeArmed] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const handleRevokeShare = async () => {
    if (!revokeArmed) {
      setRevokeArmed(true)
      return
    }
    setRevoking(true)
    const r = await revokeDiscoveryShare(shareId)
    setRevoking(false)
    setRevokeArmed(false)
    if (r.ok) {
      setRevoked(true)
      flashToast?.('Link revoked — the old link no longer opens')
    } else {
      flashToast?.(r.error || 'Couldn’t revoke the link')
    }
  }

  const handleCreateLink = async () => {
    setCreatingLink(true)
    const r = await createDiscoveryShare({ projectLocalId: projectId, clientName, answers })
    setCreatingLink(false)
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t create the link')
      return
    }
    onSetShare?.(r.shareId, 'pending')
    navigator.clipboard?.writeText(discoveryShareUrl(r.shareId))
    flashToast?.('Client link created and copied')
  }

  const handleCheckSubmission = async () => {
    if (!shareId) return
    setCheckingLink(true)
    const r = await fetchDiscoveryShare(shareId)
    setCheckingLink(false)
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t check the link')
      return
    }
    if (r.status !== 'submitted') {
      flashToast?.('Client hasn’t submitted yet')
      return
    }
    // Pass the project this check was started for, not whatever is current
    // when the fetch resolves — the user can switch projects mid-request,
    // and the merge only fills blanks, so landing on the wrong client would
    // be silent.
    onMergeAnswers?.(projectId, r.answers)
    flashToast?.('Client’s answers merged in')
  }

  const handleUpload = (file) => {
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      flashToast?.(`${file.name} is over 8MB — try a smaller file`)
      return
    }
    const reader = new FileReader()
    reader.onload = async (ev) => {
      /* An 8MB upload becomes ~10.6MB of base64 — more than the whole
         localStorage budget for the origin. Images get downscaled; a PDF
         passes through untouched, since downscaleDataUrl only acts on
         `data:image` and returns its input on any failure. */
      const dataUrl = await downscaleDataUrl(
        String(ev.target?.result || ''),
        file.type
      )
      onSetUpload({ name: file.name, dataUrl, mime: file.type })
      flashToast?.('Completed form attached')
    }
    reader.onerror = () => flashToast?.(`Couldn't read ${file.name}`)
    reader.readAsDataURL(file)
  }

  const mailtoHref = () => {
    const subject = encodeURIComponent(`Quick brand questionnaire${clientName ? ` — ${clientName}` : ''}`)
    const bodyText =
      "Hi — before we start, could you fill out the attached brand discovery questionnaire? " +
      "(Downloaded separately below — please attach it to your reply.)\n\n" +
      discoveryBriefToPlainText(answers, { clientName })
    // mailto bodies have practical length limits in most clients; keep this
    // as a convenience starting point, not the only path.
    const body = encodeURIComponent(bodyText.slice(0, 1800))
    return `mailto:?subject=${subject}&body=${body}`
  }

  const linkMailtoHref = () => {
    const subject = encodeURIComponent(`Quick brand questionnaire${clientName ? ` — ${clientName}` : ''}`)
    const body = encodeURIComponent(
      `Hi — before we start, could you fill out this quick brand questionnaire?\n\n${discoveryShareUrl(shareId)}\n\nTakes about 10 minutes, and you can leave anything blank if you're not sure yet.`
    )
    return `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <div className="discovery-brief-handoff">
      <button type="button" className="btn btn-ghost btn-sm discovery-brief-back" onClick={onBack}>
        ← Back
      </button>

      <div className="discovery-brief-handoff-block">
        <p className="discovery-brief-hint">
          Send a link the client fills out themselves — no account needed. Their answers
          come back into this project once submitted.
        </p>
        {!shareId ? (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={creatingLink}
            onClick={handleCreateLink}
          >
            {creatingLink ? 'Creating link…' : 'Create client link'}
          </button>
        ) : revoked ? (
          <p className="client-portal-revoked-note">
            Link revoked — the old link no longer opens. Anything the client
            already submitted is kept. Create a new link to share again.
          </p>
        ) : (
          <>
            <div className="discovery-brief-share-row">
              <input
                className="field-input"
                readOnly
                value={discoveryShareUrl(shareId)}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  navigator.clipboard?.writeText(discoveryShareUrl(shareId))
                  flashToast?.('Link copied')
                }}
              >
                Copy
              </button>
            </div>
            <div className="discovery-brief-handoff-actions">
              <a className="btn btn-secondary" href={linkMailtoHref()}>
                Email link to client
              </a>
              {shareStatus === 'submitted' ? (
                <span className="discovery-brief-hint">Client submitted — merged in.</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={checkingLink}
                  onClick={handleCheckSubmission}
                >
                  {checkingLink ? 'Checking…' : 'Check for client’s answers'}
                </button>
              )}
            </div>
            <div className="client-portal-revoke-row">
              <button
                type="button"
                className="btn btn-ghost btn-sm client-portal-revoke-btn"
                onClick={handleRevokeShare}
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
                  Kills this link for anyone holding it. Submitted answers are
                  kept.
                </span>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="discovery-brief-handoff-block">
        <p className="discovery-brief-hint">
          Download the fillable form and attach it to an email yourself — browsers can't attach
          files to a mailto link automatically.
        </p>
        <div className="discovery-brief-handoff-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              downloadText(
                discoveryBriefToMarkdown(answers, { clientName }),
                `${clientName || 'discovery'}-brief.md`,
                'text/markdown'
              )
            }
          >
            Download fillable form (.md)
          </button>
          <a className="btn btn-secondary" href={mailtoHref()}>
            Open email draft
          </a>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              navigator.clipboard?.writeText(discoveryBriefToPlainText(answers, { clientName }))
              flashToast?.('Questionnaire copied')
            }}
          >
            Copy as text
          </button>
        </div>
      </div>

      <div className="discovery-brief-handoff-block">
        <p className="field-label">Client sent a completed form back?</p>
        <p className="discovery-brief-hint">
          Attach it here for reference — this doesn't auto-read the answers into the fields
          above, but keeps it with the project so you can transcribe from it.
        </p>
        {upload ? (
          <div className="discovery-brief-upload-row">
            <span>{upload.name}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSetUpload(null)}>
              Remove
            </button>
          </div>
        ) : (
          <label className="btn btn-secondary discovery-brief-attach">
            Upload completed form
            <input
              type="file"
              className="sr-only"
              onChange={(e) => {
                handleUpload(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>
    </div>
  )
}
