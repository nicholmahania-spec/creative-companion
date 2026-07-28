/**
 * Invoice arithmetic and terms.
 *
 * The panel and the PDF each used to compute their own total. These helpers
 * exist so there is exactly one answer to "what is owed", and these tests pin
 * the two things that made the old shape wrong: a fixed-price line could not
 * be expressed at all, and there was no due date to express.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

/* Capture the blob instead of writing a file — the PDF is the thing under
   test, not the download. */
const written = []
vi.mock('./exportFiles', () => ({
  downloadBlob: (blob, filename) => {
    written.push({ blob, filename })
    return { ok: true, filename }
  },
}))

const {
  lineAmount,
  invoiceTotals,
  dueDateFrom,
  downloadInvoicePdf,
} = await import('./invoice')

async function pdfText(blob) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const buf = new Uint8Array(await blob.arrayBuffer())
  const doc = await pdfjs.getDocument({ data: buf }).promise
  let out = ''
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    out += content.items.map((it) => it.str).join(' ') + '\n'
  }
  return out
}

describe('lineAmount', () => {
  it('bills hours at the project rate', () => {
    expect(lineAmount({ hours: 2.5 }, 80)).toBe(200)
  })

  it('bills a flat amount as itself, ignoring the rate', () => {
    expect(lineAmount({ amount: 1200 }, 80)).toBe(1200)
  })

  it('prefers the flat amount when a line somehow carries both', () => {
    expect(lineAmount({ hours: 2, amount: 1200 }, 80)).toBe(1200)
  })

  it('is zero for a line with neither', () => {
    expect(lineAmount({}, 80)).toBe(0)
    expect(lineAmount(null, 80)).toBe(0)
  })
})

describe('invoiceTotals', () => {
  it('sums mixed hourly and fixed lines', () => {
    const { subtotal, tax, total } = invoiceTotals(
      [{ hours: 2 }, { amount: 500 }, { hours: 1.5 }],
      100
    )
    expect(subtotal).toBe(850)
    expect(tax).toBe(0)
    expect(total).toBe(850)
  })

  it('applies tax to the subtotal, not to each line', () => {
    const { subtotal, tax, total } = invoiceTotals(
      [{ hours: 1 }, { hours: 1 }],
      100,
      20
    )
    expect(subtotal).toBe(200)
    expect(tax).toBeCloseTo(40, 10)
    expect(total).toBeCloseTo(240, 10)
  })

  it('handles an empty log without producing NaN', () => {
    expect(invoiceTotals([], 100, 20)).toEqual({
      subtotal: 0,
      tax: 0,
      total: 0,
    })
    expect(invoiceTotals(undefined, undefined, undefined).total).toBe(0)
  })
})

describe('dueDateFrom', () => {
  it('adds the terms in days', () => {
    const due = dueDateFrom(new Date(2026, 6, 1), 14)
    expect(due).toBe(new Date(2026, 6, 15).toLocaleDateString())
  })

  it('rolls over a month boundary', () => {
    const due = dueDateFrom(new Date(2026, 0, 25), 14)
    expect(due).toBe(new Date(2026, 1, 8).toLocaleDateString())
  })

  it('does not mutate the date it was given', () => {
    const issued = new Date(2026, 6, 1)
    dueDateFrom(issued, 30)
    expect(issued.getDate()).toBe(1)
  })

  it('is empty when there are no terms — no due date beats a wrong one', () => {
    expect(dueDateFrom(new Date(), 0)).toBe('')
    expect(dueDateFrom(new Date(), undefined)).toBe('')
    expect(dueDateFrom(new Date(), 'soon')).toBe('')
  })
})

describe('downloadInvoicePdf', () => {
  beforeEach(() => {
    written.length = 0
  })

  const base = {
    orgName: 'Nichol Studio',
    billTo: 'Sparrow’s Promise\n12 Vine St',
    rate: 80,
    entries: [
      { date: '2026-07-20', hours: 3, note: 'Palette pass' },
      { date: '2026-07-22', amount: 1200, note: 'Logo package' },
    ],
    invoiceNumber: '2026-7',
    from: 'Nichol Studio\nnichol@example.com',
    paymentMethods: 'Bank transfer — 00-00-00 / 12345678',
    terms: 14,
    notes: 'Thanks!',
    taxLabel: 'VAT',
    taxPercent: 20,
  }

  it('prints everything a client needs in order to pay it', async () => {
    const r = await downloadInvoicePdf(base)
    expect(r.ok).toBe(true)
    const text = await pdfText(written[0].blob)

    // The four things the old invoice omitted entirely.
    expect(text).toMatch(/Invoice no\. 2026-7/)
    expect(text).toMatch(/Due /)
    expect(text).toMatch(/HOW TO PAY/)
    expect(text).toMatch(/nichol@example\.com/)

    // Both line shapes, and a fixed line that does not pretend to be an hour.
    expect(text).toMatch(/Palette pass/)
    expect(text).toMatch(/Logo package/)
    expect(text).toMatch(/Fixed/)

    // 3h x 80 + 1200 = 1440, +20% VAT = 1728.
    expect(text).toMatch(/\$1440\.00/)
    expect(text).toMatch(/\$1728\.00/)
    expect(text).toMatch(/VAT \(20%\)/)
  })

  it('names the file by invoice number so two exports never collide', async () => {
    await downloadInvoicePdf(base)
    expect(written[0].filename).toBe('Nichol Studio-invoice-2026-7.pdf')

    await downloadInvoicePdf({ ...base, invoiceNumber: '' })
    expect(written[1].filename).toBe('Nichol Studio-invoice.pdf')
  })

  it('omits the tax row entirely when no tax is charged', async () => {
    await downloadInvoicePdf({ ...base, taxPercent: 0, taxLabel: '' })
    const text = await pdfText(written[0].blob)
    expect(text).not.toMatch(/Subtotal/)
    expect(text).not.toMatch(/VAT/)
    expect(text).toMatch(/\$1440\.00/)
  })
})
