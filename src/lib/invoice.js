/**
 * Simple itemized invoice PDF — hours logged x rate, one line per entry.
 * Text-based (not a DOM capture) since an invoice is a document, not a
 * brand artifact — no palette/logo styling needed.
 */
import { downloadBlob } from './exportFiles'

function safeFilename(filename) {
  return String(filename || 'invoice').replace(/[/\\?%*:|"<>]/g, '-')
}

/**
 * @param {{
 *   orgName: string,
 *   billTo?: string,
 *   rate: number,
 *   entries: { date: string, hours: number, note?: string }[],
 * }} opts
 */
export async function downloadInvoicePdf({ orgName, billTo = '', rate, entries }) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 54
  let y = margin
  const pageW = pdf.internal.pageSize.getWidth()

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('Invoice', margin, y)
  y += 22

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`From: ${orgName || ''}`, margin, y)
  y += 14
  if (billTo) {
    pdf.text(`Bill to: ${billTo}`, margin, y)
    y += 14
  }
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin, y)
  y += 24

  pdf.setFont('helvetica', 'bold')
  pdf.text('Date', margin, y)
  pdf.text('Note', margin + 80, y)
  pdf.text('Hours', pageW - margin - 120, y)
  pdf.text('Amount', pageW - margin - 60, y)
  y += 6
  pdf.setDrawColor(180)
  pdf.line(margin, y, pageW - margin, y)
  y += 14

  pdf.setFont('helvetica', 'normal')
  let totalHours = 0
  entries.forEach((e) => {
    totalHours += e.hours
    const amount = e.hours * rate
    pdf.text(String(e.date), margin, y)
    pdf.text(String(e.note || '').slice(0, 45), margin + 80, y)
    pdf.text(e.hours.toFixed(2), pageW - margin - 120, y)
    pdf.text(`$${amount.toFixed(2)}`, pageW - margin - 60, y)
    y += 16
    if (y > pdf.internal.pageSize.getHeight() - margin - 60) {
      pdf.addPage()
      y = margin
    }
  })

  y += 10
  pdf.line(margin, y, pageW - margin, y)
  y += 18
  const total = totalHours * rate
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Total hours: ${totalHours.toFixed(2)}  ·  Rate: $${Number(rate).toFixed(2)}/hr`, margin, y)
  y += 16
  pdf.setFontSize(13)
  pdf.text(`Total due: $${total.toFixed(2)}`, margin, y)

  let blob
  try {
    blob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' })
  } catch {
    blob = pdf.output('blob')
  }
  return downloadBlob(blob, safeFilename(`${orgName || 'invoice'}-invoice.pdf`))
}
