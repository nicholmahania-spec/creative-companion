/**
 * Lightweight hours/invoice tracker — per-project time log (date, hours,
 * note) against an hourly rate, with a simple itemized invoice export.
 * Business-ops utility, separate from the creative workflow.
 */
import { useState } from 'react'
import { downloadInvoicePdf } from '../lib/invoice'

export function HoursInvoicePanel({
  open,
  onClose,
  orgName,
  hourlyRate,
  timeLog = [],
  onSetRate,
  onAddEntry,
  onRemoveEntry,
  flashToast,
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')
  const [billTo, setBillTo] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const rate = Number(hourlyRate) || 0
  const totalHours = timeLog.reduce((sum, e) => sum + (Number(e.hours) || 0), 0)
  const totalAmount = totalHours * rate

  const submit = () => {
    const h = Number(hours)
    if (!date || !Number.isFinite(h) || h <= 0) return
    onAddEntry({ date, hours: h, note })
    setHours('')
    setNote('')
  }

  const exportInvoice = async () => {
    if (!timeLog.length) return
    setBusy(true)
    try {
      const r = await downloadInvoicePdf({
        orgName,
        billTo,
        rate,
        entries: timeLog,
      })
      if (r?.ok) flashToast?.('Invoice downloaded')
      else flashToast?.(r?.error || 'Could not export invoice')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="running-todo-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="running-todo-panel hours-invoice-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Hours and invoice"
      >
        <div className="running-todo-panel-head">
          <span className="journey-projects-heading">Hours &amp; invoice</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="field-block">
          <label className="field-label" htmlFor="hourly-rate">Hourly rate ($)</label>
          <input
            id="hourly-rate"
            className="field-input"
            type="number"
            min="0"
            step="0.01"
            value={hourlyRate || ''}
            onChange={(e) => onSetRate(e.target.value)}
            placeholder="18.46"
          />
        </div>

        {timeLog.length === 0 ? (
          <p className="running-todo-empty">
            No billable hours yet. These are entered by hand — your work clock
            keeps its own record under Timer, and never bills from it.
          </p>
        ) : (
          <ul className="hours-log-list">
            {timeLog.map((e) => (
              <li key={e.id} className="hours-log-row">
                <span className="hours-log-date">{e.date}</span>
                <span className="hours-log-note">{e.note}</span>
                <span className="hours-log-hours">{Number(e.hours).toFixed(2)}h</span>
                <button
                  type="button"
                  className="running-todo-remove"
                  aria-label={`Remove entry from ${e.date}`}
                  onClick={() => onRemoveEntry(e.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="hours-entry-form">
          <div className="hours-entry-row">
            <input
              type="date"
              className="field-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Date"
            />
            <input
              type="number"
              min="0"
              step="0.25"
              className="field-input"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Hours"
              aria-label="Hours"
            />
          </div>
          <input
            className="field-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            aria-label="Note"
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={submit}
            disabled={!date || !hours}
          >
            Log hours
          </button>
        </div>

        <div className="hours-invoice-totals">
          <span>{totalHours.toFixed(2)}h logged</span>
          <span>${totalAmount.toFixed(2)} total</span>
        </div>

        <input
          className="field-input"
          value={billTo}
          onChange={(e) => setBillTo(e.target.value)}
          placeholder="Bill to (optional)"
          aria-label="Bill to"
        />

        <div className="running-todo-panel-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportInvoice}
            disabled={!timeLog.length || busy}
          >
            {busy ? 'Exporting…' : 'Download invoice'}
          </button>
        </div>
      </aside>
    </>
  )
}
