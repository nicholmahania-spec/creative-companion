/**
 * DISCOVERY NOTES — read-only. This is no longer an intake.
 *
 * It was: a second 30-question brief with its own `discoveryAnswers` store,
 * fillable here, runnable as a call script, and hand-offable to the client.
 * That made it a competing source of client/strategic truth — the designer
 * filled one schema while the client filled another at /f/:shareId, and the
 * Define sheet, which reads `detective`, never showed a word of the second.
 *
 * Both of its capture modes are gone and both have canonical replacements:
 *
 *   fill it out myself   → the Brief itself
 *   run as a call script → the Brief's Call mode, on DETECTIVE_CHAPTERS
 *
 * WHAT SURVIVES, AND WHY THIS FILE STILL EXISTS. Projects already hold
 * `discoveryAnswers` from before the retirement, and the markdown /
 * plain-text hand-off is written against that schema. Deleting the surface
 * would take real user answers off the screen and take the hand-off with it.
 * So the questions and answers remain VISIBLE and remain EXPORTABLE, and are
 * no longer editable. `DISCOVERY_FIELDS` stays for exactly that reason: it is
 * what the historical values are keyed by and what the exporters read.
 *
 * Nothing here reinterprets a stored value. The four free-text spectrum
 * answers in particular are displayed as they were typed and are never
 * mapped onto `detective`'s five-token scale.
 */
import { useState, useRef } from 'react'
import { useModalFocus } from '../../lib/useModalFocus'
import { downscaleDataUrl } from '../../lib/moodPins'
import {
  DISCOVERY_SECTIONS,
  DISCOVERY_FIELDS,
  discoveryBriefToMarkdown,
  discoveryBriefToPlainText,
  countAnswered,
} from '../../lib/client/discoveryBrief'
import {
  createDiscoveryShare,
  discoveryShareUrl,
  fetchDiscoveryShare,
  revokeDiscoveryShare,
} from '../../lib/client/discoveryShare'

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
            Discovery notes
          </h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close discovery notes"
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
            {/* "Fill it out myself" and "Run as a call script" were here.
                Both are capture, and capture belongs to the Brief now — the
                sheet itself, and its Call mode, which walks the SAME
                canonical questions the client answers at /f/:shareId. */}
            <button type="button" className="btn btn-secondary" onClick={() => setMode('notes')}>
              Read the answers
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setMode('handoff')}>
              Email to client / upload a completed form
            </button>
          </div>
        )}

        {mode === 'notes' && <NotesMode answers={answers} onBack={backToMenu} />}

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

/**
 * The historical answers, as they were stored.
 *
 * Read-only by construction, not by a `readOnly` attribute: there is no input
 * here to disable. A greyed-out field still reads as "you may edit this once
 * something unlocks", which is the wrong promise — these answers belong to a
 * retired schema and the place to change what the client said is the Brief.
 *
 * Values are printed verbatim. The four free-text spectrum answers are the
 * reason that matters: `detective` stores a spectrum as one of five tokens,
 * and anything typed into the old free-text version cannot become one of
 * those without inventing a position the client never gave.
 */
function NotesMode({ answers, onBack }) {
  const filled = DISCOVERY_SECTIONS.map((section) => ({
    section,
    rows: section.fields.filter((f) => String(answers?.[f.id] ?? '').trim()),
  })).filter((g) => g.rows.length)

  return (
    <div className="discovery-brief-fill">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
        ← Back
      </button>
      <p className="discovery-brief-hint">
        Answers from the earlier discovery form, kept as they were written.
        The brief is where client answers are edited now.
      </p>
      {!filled.length ? (
        <p className="discovery-brief-hint">Nothing was answered here.</p>
      ) : (
        filled.map(({ section, rows }) => (
          <details key={section.id} className="discovery-brief-section" open>
            <summary>{section.label}</summary>
            {rows.map((f) => (
              <div className="field-block" key={f.id}>
                <p className="field-label">{f.label}</p>
                <p className="discovery-brief-answer">{answers[f.id]}</p>
              </div>
            ))}
          </details>
        ))
      )}
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
