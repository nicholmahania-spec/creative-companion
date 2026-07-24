/**
 * Asset audit — inventory of existing brand files (logos, signage art,
 * old templates…), each tagged usable / outdated / missing. Distinct
 * from the mood board (inspiration) and the running to-do list (tasks).
 */
import { useState } from 'react'

const STATUSES = [
  { id: 'usable', label: 'Usable' },
  { id: 'outdated', label: 'Outdated' },
  { id: 'missing', label: 'Missing' },
]

const MAX_FILE_BYTES = 5 * 1024 * 1024

export default function AssetAudit({ items = [], onAdd, onUpdate, onRemove, flashToast }) {
  const [name, setName] = useState('')
  const [status, setStatus] = useState('usable')
  const [note, setNote] = useState('')
  const [fileDataUrl, setFileDataUrl] = useState('')
  const [fileName, setFileName] = useState('')

  const handleFile = (file) => {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      flashToast?.(`${file.name} is over 5MB — attach a smaller reference or just log it by name`)
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFileDataUrl(String(ev.target?.result || ''))
      setFileName(file.name || '')
      if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ''))
    }
    reader.onerror = () => flashToast?.(`Couldn't read ${file.name}`)
    reader.readAsDataURL(file)
  }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd({ name: trimmed, note, status, fileDataUrl })
    setName('')
    setNote('')
    setStatus('usable')
    setFileDataUrl('')
    setFileName('')
  }

  const counts = STATUSES.reduce((acc, s) => {
    acc[s.id] = items.filter((it) => it.status === s.id).length
    return acc
  }, {})

  return (
    <div className="asset-audit">
      {items.length > 0 && (
        <div className="asset-audit-counts">
          {STATUSES.map((s) => (
            <span key={s.id} className={`asset-audit-count is-${s.id}`}>
              {counts[s.id] || 0} {s.label}
            </span>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="asset-audit-empty">
          List each existing logo/brand file here and mark whether it's usable,
          outdated, or missing.
        </p>
      ) : (
        <ul className="asset-audit-list">
          {items.map((it) => (
            <li key={it.id} className="asset-audit-row">
              {it.fileDataUrl && it.fileDataUrl.startsWith('data:image') ? (
                <img className="asset-audit-thumb" src={it.fileDataUrl} alt="" />
              ) : (
                <span className="asset-audit-thumb asset-audit-thumb-empty" aria-hidden="true">
                  {it.fileDataUrl ? '📄' : ''}
                </span>
              )}
              <div className="asset-audit-row-main">
                <span className="asset-audit-row-name">{it.name}</span>
                {it.note ? <span className="asset-audit-row-note">{it.note}</span> : null}
              </div>
              <select
                className="asset-audit-status-select"
                value={it.status}
                onChange={(e) => onUpdate(it.id, { status: e.target.value })}
                aria-label={`Status for ${it.name}`}
              >
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="asset-audit-remove"
                aria-label={`Remove ${it.name}`}
                onClick={() => onRemove(it.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="asset-audit-form">
        <input
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="File or asset name (e.g. Primary logo, vector)"
          aria-label="Asset name"
        />
        <div className="asset-audit-form-row">
          <select
            className="asset-audit-status-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Status"
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <label className="btn btn-ghost btn-sm asset-audit-attach">
            {fileName ? `Attached: ${fileName}` : 'Attach file'}
            <input
              type="file"
              className="sr-only"
              onChange={(e) => {
                handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <input
          className="field-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional) — e.g. low-res, missing transparent version"
          aria-label="Note"
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={submit}
          disabled={!name.trim()}
        >
          Add to audit
        </button>
      </div>
    </div>
  )
}
