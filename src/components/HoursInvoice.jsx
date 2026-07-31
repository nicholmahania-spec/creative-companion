/**
 * Lightweight hours/invoice tracker — per-project time log (date, hours,
 * note) against an hourly rate, with a simple itemized invoice export.
 * Business-ops utility, separate from the creative workflow.
 */
import { useState } from 'react'
import { downloadInvoicePdf, invoiceTotals, dueDateFrom } from '../lib/invoice'

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
  prefs = {},
  setPref,
  peekInvoiceNumber,
  commitInvoiceNumber,
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [billTo, setBillTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  if (!open) return null

  const rate = Number(hourlyRate) || 0
  const totalHours = timeLog.reduce((sum, e) => sum + (Number(e.hours) || 0), 0)
  /* Totals come from the same helper the PDF uses, so the panel can never
     quote a number the document contradicts. */
  const { subtotal, tax, total } = invoiceTotals(
    timeLog,
    rate,
    prefs.invoiceTaxPercent
  )
  /* The persist migration only re-merges pref defaults for workspaces saved
     before v5, so a workspace already at v5 has no `invoiceTerms` key at all.
     Fall back rather than silently dropping the due date on exactly the
     people who have been using the app longest. */
  const terms = prefs.invoiceTerms ?? 14
  const dueStr = dueDateFrom(new Date(), terms)

  const submit = () => {
    const h = Number(hours)
    const a = Number(amount)
    const hasHours = Number.isFinite(h) && h > 0
    const hasAmount = Number.isFinite(a) && a > 0
    if (!date || (!hasHours && !hasAmount)) return
    onAddEntry({
      date,
      note,
      ...(hasHours ? { hours: h } : {}),
      ...(hasAmount ? { amount: a } : {}),
    })
    setHours('')
    setAmount('')
    setNote('')
  }

  const exportInvoice = async () => {
    if (!timeLog.length) return
    setBusy(true)
    try {
      /* Read the number, but do not consume it until the PDF exists.
         Numbering on open would burn one every time the panel was looked at,
         and gaps in an invoice sequence are exactly what an accountant asks
         about — but claiming it before the export could also fail burned one
         on every cancelled save dialog, which is the same hole one step
         later. */
      const invoiceNumber = peekInvoiceNumber ? peekInvoiceNumber() : ''
      const r = await downloadInvoicePdf({
        orgName,
        billTo,
        rate,
        entries: timeLog,
        invoiceNumber,
        from: prefs.invoiceFrom,
        paymentMethods: prefs.invoicePaymentMethods,
        terms,
        notes: prefs.invoiceNotes,
        taxLabel: prefs.invoiceTaxLabel,
        taxPercent: prefs.invoiceTaxPercent,
      })
      if (r?.ok) {
        commitInvoiceNumber?.()
        flashToast?.('Invoice downloaded')
      } else {
        flashToast?.(r?.error || 'Could not export invoice')
      }
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
            /* No specimen rate. "18.46" is precise enough to read as a real
               figure someone chose — an invented number in the one field
               that decides what a client is billed. The label already says
               what goes here. */
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
                <span className="hours-log-hours">
                  {Number(e.amount) > 0
                    ? `$${Number(e.amount).toFixed(2)}`
                    : `${(Number(e.hours) || 0).toFixed(2)}h`}
                </span>
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
          <div className="hours-entry-row hours-entry-row-3">
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
            <input
              type="number"
              min="0"
              step="0.01"
              className="field-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="or $ fixed"
              aria-label="Fixed amount"
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
            disabled={!date || (!hours && !amount)}
          >
            {amount && !hours ? 'Add fixed line' : 'Log hours'}
          </button>
        </div>

        <div className="hours-invoice-totals">
          <span>{totalHours.toFixed(2)}h logged</span>
          {(Number(prefs.invoiceTaxPercent) || 0) > 0 ? (
            <span>
              ${subtotal.toFixed(2)} + ${tax.toFixed(2)} tax
            </span>
          ) : null}
          <span>${total.toFixed(2)} total</span>
        </div>
        {dueStr ? (
          <p className="hours-invoice-due">Due {dueStr} if sent today</p>
        ) : null}

        <input
          className="field-input"
          value={billTo}
          onChange={(e) => setBillTo(e.target.value)}
          placeholder="Bill to (optional)"
          aria-label="Bill to"
        />

        {/* Studio details, collapsed. These are the same on every invoice you
            send, so they are set once and then stay out of the way — but the
            invoice cannot be paid without them, so the toggle says whether
            they are filled rather than hiding that fact. */}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowSettings((v) => !v)}
          aria-expanded={showSettings}
        >
          {showSettings ? 'Hide invoice details' : 'Invoice details'}
          {prefs.invoiceFrom && prefs.invoicePaymentMethods ? '' : ' · needed'}
        </button>

        {showSettings ? (
          <div className="hours-invoice-settings">
            <label className="field-label" htmlFor="inv-from">
              From — your name and contact
            </label>
            <textarea
              id="inv-from"
              className="field-input"
              rows={3}
              value={prefs.invoiceFrom || ''}
              onChange={(e) => setPref?.('invoiceFrom', e.target.value)}
              placeholder={'Your studio\nemail\nphone'}
            />
            <label className="field-label" htmlFor="inv-pay">
              How to pay
            </label>
            <textarea
              id="inv-pay"
              className="field-input"
              rows={2}
              value={prefs.invoicePaymentMethods || ''}
              onChange={(e) =>
                setPref?.('invoicePaymentMethods', e.target.value)
              }
              placeholder="Bank transfer, PayPal, Stripe link"
            />
            <div className="hours-entry-row">
              <div>
                <label className="field-label" htmlFor="inv-terms">
                  Due in (days)
                </label>
                <input
                  id="inv-terms"
                  type="number"
                  min="0"
                  className="field-input"
                  value={terms}
                  onChange={(e) =>
                    setPref?.('invoiceTerms', Number(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="inv-prefix">
                  Number prefix
                </label>
                <input
                  id="inv-prefix"
                  className="field-input"
                  value={prefs.invoicePrefix || ''}
                  onChange={(e) => setPref?.('invoicePrefix', e.target.value)}
                  placeholder="2026-"
                />
              </div>
            </div>
            <div className="hours-entry-row">
              <div>
                <label className="field-label" htmlFor="inv-taxlabel">
                  Tax label
                </label>
                <input
                  id="inv-taxlabel"
                  className="field-input"
                  value={prefs.invoiceTaxLabel || ''}
                  onChange={(e) => setPref?.('invoiceTaxLabel', e.target.value)}
                  placeholder="VAT / GST"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="inv-tax">
                  Tax %
                </label>
                <input
                  id="inv-tax"
                  type="number"
                  min="0"
                  step="0.1"
                  className="field-input"
                  value={prefs.invoiceTaxPercent ?? ''}
                  onChange={(e) =>
                    setPref?.('invoiceTaxPercent', Number(e.target.value) || 0)
                  }
                />
              </div>
            </div>
            <label className="field-label" htmlFor="inv-notes">
              Notes — late fees, thank you
            </label>
            <textarea
              id="inv-notes"
              className="field-input"
              rows={2}
              value={prefs.invoiceNotes || ''}
              onChange={(e) => setPref?.('invoiceNotes', e.target.value)}
              placeholder="Thanks! Late payments may incur 2% per month."
            />
            <p className="hours-invoice-due">
              Next invoice number:{' '}
              {(prefs.invoicePrefix || '') + (prefs.invoiceNextNumber ?? 1)}
            </p>
          </div>
        ) : null}

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
