/**
 * Per-field file attachments on the client-facing brief — see clientUploads.js
 * for why this exists as a sibling array rather than replacing the textarea.
 *
 * Three states per row, all in place (no toast, no modal — the failed file
 * stays exactly where it was, which is the point: retry costs nothing to
 * find):
 *   sending  — local object URL thumbnail, dimmed, "Sending…"
 *   done     — solid thumbnail, filename, × to remove
 *   failed   — thumbnail stays, dimmed, "Didn't send. Try again" button
 */
import { useRef, useState } from 'react'
import { uploadClientFile } from '../../lib/client/clientUploads'

export default function BriefAttach({ targetId, files = [], onChange, idPrefix, fieldId }) {
  const [pending, setPending] = useState([]) // { key, name, previewUrl, status }
  const inputRef = useRef(null)

  const anySending = pending.some((p) => p.status === 'sending')
  const failedCount = pending.filter((p) => p.status === 'failed').length

  function pickFiles(fileList) {
    const picked = Array.from(fileList || [])
    picked.forEach((file) => {
      const key = `${Date.now()}-${Math.random()}`
      const previewUrl = URL.createObjectURL(file)
      setPending((p) => [...p, { key, name: file.name, previewUrl, status: 'sending' }])
      uploadClientFile(targetId, file).then((res) => {
        if (res.ok) {
          setPending((p) => p.filter((row) => row.key !== key))
          onChange([...(files || []), { name: res.name, url: res.url }])
        } else {
          setPending((p) =>
            p.map((row) => (row.key === key ? { ...row, status: 'failed', file } : row))
          )
        }
      })
    })
  }

  function retry(key) {
    const row = pending.find((r) => r.key === key)
    if (!row?.file) return
    setPending((p) => p.map((r) => (r.key === key ? { ...r, status: 'sending' } : r)))
    uploadClientFile(targetId, row.file).then((res) => {
      if (res.ok) {
        setPending((p) => p.filter((r) => r.key !== key))
        onChange([...(files || []), { name: res.name, url: res.url }])
      } else {
        setPending((p) => p.map((r) => (r.key === key ? { ...r, status: 'failed' } : r)))
      }
    })
  }

  function removeSent(url) {
    onChange((files || []).filter((f) => f.url !== url))
  }

  return (
    <div className="brief-attach">
      <div className="brief-attach-row">
        {files.map((f) => (
          <div className="brief-attach-thumb" key={f.url}>
            <img src={f.url} alt={f.name || 'Attachment'} />
            <button
              type="button"
              className="brief-attach-remove"
              aria-label={`Remove ${f.name || 'attachment'}`}
              onClick={() => removeSent(f.url)}
            >
              ×
            </button>
          </div>
        ))}
        {pending.map((row) => (
          <div
            className={`brief-attach-thumb is-${row.status}`}
            key={row.key}
          >
            <img src={row.previewUrl} alt={row.name} />
            <span className="brief-attach-status">
              {row.status === 'sending' ? 'Sending…' : (
                <button type="button" onClick={() => retry(row.key)}>
                  Didn’t send. Try again
                </button>
              )}
            </span>
          </div>
        ))}
        <button
          type="button"
          className="brief-attach-add"
          onClick={() => inputRef.current?.click()}
        >
          + Attach image
        </button>
        <input
          ref={inputRef}
          id={`${idPrefix}-${fieldId}-attach`}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            pickFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {anySending && (
        <p className="brief-attach-note" aria-live="polite">
          {pending.filter((p) => p.status === 'sending').length}
          {pending.filter((p) => p.status === 'sending').length === 1
            ? ' file still sending'
            : ' files still sending'}
        </p>
      )}
      {/* A failed upload was announced to nobody — the only signal was the
          thumbnail dimming and a button appearing, both purely visual. This
          is assertive because it means an image the client thinks they
          attached did not send, on a form they may be about to submit. */}
      {failedCount > 0 && (
        <p className="sr-only" role="alert">
          {failedCount === 1
            ? "1 image didn't send. Use the Try again button on it."
            : `${failedCount} images didn't send. Use the Try again buttons on them.`}
        </p>
      )}
    </div>
  )
}
