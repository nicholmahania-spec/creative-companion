/**
 * Itemized invoice PDF.
 *
 * Text-based (not a DOM capture) since an invoice is a document, not a brand
 * artifact — no palette or logo styling needed.
 *
 * It used to print five things: Invoice, Date, Note, Hours, Amount. No
 * invoice number, no due date, no payment method, no contact details for the
 * person being paid. A client who wanted to pay it had to email and ask —
 * which is the exact friction an invoice exists to remove — and an unnumbered
 * invoice is unreconcilable at either end come tax time.
 *
 * Lines may be hourly (hours x rate) or a flat amount. The old shape could
 * only express hours, so a fixed-price project had to be invented into hours
 * that multiplied out to the agreed number.
 */
import { downloadBlob } from './exportFiles'

function safeFilename(filename) {
  return String(filename || 'invoice').replace(/[/\\?%*:|"<>]/g, '-')
}

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`

/** A line's value: flat amount if it has one, otherwise hours x rate. */
export function lineAmount(entry, rate) {
  const amt = Number(entry?.amount)
  if (Number.isFinite(amt) && amt > 0) return amt
  return (Number(entry?.hours) || 0) * (Number(rate) || 0)
}

/** Totals for a set of lines, so the panel and the PDF can never disagree. */
export function invoiceTotals(entries = [], rate = 0, taxPercent = 0) {
  const subtotal = (entries || []).reduce((s, e) => s + lineAmount(e, rate), 0)
  const pct = Number(taxPercent) || 0
  const tax = subtotal * (pct / 100)
  return { subtotal, tax, total: subtotal + tax }
}

/** `terms` days after the invoice date, as a local date string. */
export function dueDateFrom(issued, terms) {
  const days = Number(terms)
  if (!Number.isFinite(days) || days <= 0) return ''
  const d = new Date(issued)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString()
}

/**
 * @param {{
 *   orgName: string,
 *   billTo?: string,
 *   rate: number,
 *   entries: { date: string, hours?: number, amount?: number, note?: string }[],
 *   invoiceNumber?: string,
 *   from?: string,
 *   paymentMethods?: string,
 *   terms?: number,
 *   notes?: string,
 *   taxLabel?: string,
 *   taxPercent?: number,
 * }} opts
 */
export async function downloadInvoicePdf({
  orgName,
  billTo = '',
  rate,
  entries,
  invoiceNumber = '',
  from = '',
  paymentMethods = '',
  terms = 0,
  notes = '',
  taxLabel = '',
  taxPercent = 0,
}) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 54
  let y = margin
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const rightEdge = pageW - margin

  const issued = new Date()
  const issuedStr = issued.toLocaleDateString()
  const dueStr = dueDateFrom(issued, terms)

  const room = (need) => {
    if (y + need > pageH - margin - 40) {
      pdf.addPage()
      y = margin
    }
  }

  // ── Header: title left, number and dates right ──────────────────────
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.text('Invoice', margin, y)

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  const meta = [
    invoiceNumber ? `Invoice no. ${invoiceNumber}` : '',
    `Issued ${issuedStr}`,
    dueStr ? `Due ${dueStr}` : '',
  ].filter(Boolean)
  meta.forEach((line, i) => {
    pdf.text(line, rightEdge, y - 8 + i * 14, { align: 'right' })
  })
  y += Math.max(26, meta.length * 14)

  // ── From / Bill to ──────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(100, 100, 100)
  pdf.text('FROM', margin, y)
  if (billTo) pdf.text('BILL TO', pageW / 2, y)
  y += 13

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(20, 20, 20)
  const fromLines = String(from || orgName || '')
    .split('\n')
    .filter(Boolean)
  const toLines = String(billTo || '')
    .split('\n')
    .filter(Boolean)
  const blockRows = Math.max(fromLines.length, toLines.length)
  for (let i = 0; i < blockRows; i += 1) {
    if (fromLines[i]) pdf.text(fromLines[i], margin, y + i * 13)
    if (toLines[i]) pdf.text(toLines[i], pageW / 2, y + i * 13)
  }
  y += blockRows * 13 + 20

  // ── Line items ──────────────────────────────────────────────────────
  const colQty = rightEdge - 190
  const colRate = rightEdge - 120
  const colAmt = rightEdge

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(100, 100, 100)
  pdf.text('DATE', margin, y)
  pdf.text('DESCRIPTION', margin + 74, y)
  pdf.text('QTY', colQty, y, { align: 'right' })
  pdf.text('RATE', colRate, y, { align: 'right' })
  pdf.text('AMOUNT', colAmt, y, { align: 'right' })
  y += 6
  pdf.setDrawColor(190)
  pdf.line(margin, y, rightEdge, y)
  y += 15

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(20, 20, 20)
  ;(entries || []).forEach((e) => {
    room(20)
    const isFlat = Number.isFinite(Number(e.amount)) && Number(e.amount) > 0
    pdf.text(String(e.date || ''), margin, y)
    pdf.text(String(e.note || '').slice(0, 42), margin + 74, y)
    /* A flat line shows no qty or rate rather than a misleading "1 x total".
       The number was agreed for the work, not for an hour of it. */
    pdf.text(isFlat ? '—' : (Number(e.hours) || 0).toFixed(2), colQty, y, {
      align: 'right',
    })
    pdf.text(isFlat ? 'Fixed' : money(rate), colRate, y, { align: 'right' })
    pdf.text(money(lineAmount(e, rate)), colAmt, y, { align: 'right' })
    y += 16
  })

  y += 8
  pdf.line(margin, y, rightEdge, y)
  y += 18

  // ── Totals ──────────────────────────────────────────────────────────
  const { subtotal, tax, total } = invoiceTotals(entries, rate, taxPercent)
  const showTax = (Number(taxPercent) || 0) > 0

  pdf.setFontSize(10)
  if (showTax) {
    pdf.text('Subtotal', colRate, y, { align: 'right' })
    pdf.text(money(subtotal), colAmt, y, { align: 'right' })
    y += 15
    const label = taxLabel
      ? `${taxLabel} (${taxPercent}%)`
      : `Tax (${taxPercent}%)`
    pdf.text(label, colRate, y, { align: 'right' })
    pdf.text(money(tax), colAmt, y, { align: 'right' })
    y += 15
  }
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text('Total due', colRate, y, { align: 'right' })
  pdf.text(money(total), colAmt, y, { align: 'right' })
  y += 30

  // ── How to pay, and anything else ───────────────────────────────────
  const tail = [
    ['HOW TO PAY', paymentMethods],
    ['NOTES', notes],
  ].filter(([, v]) => String(v || '').trim())

  tail.forEach(([label, value]) => {
    room(50)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(100, 100, 100)
    pdf.text(label, margin, y)
    y += 13
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(20, 20, 20)
    const lines = pdf.splitTextToSize(String(value), rightEdge - margin)
    pdf.text(lines, margin, y)
    y += lines.length * 13 + 14
  })

  let blob
  try {
    blob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' })
  } catch {
    blob = pdf.output('blob')
  }
  const name = invoiceNumber
    ? `${orgName || 'invoice'}-invoice-${invoiceNumber}.pdf`
    : `${orgName || 'invoice'}-invoice.pdf`
  return downloadBlob(blob, safeFilename(name))
}
