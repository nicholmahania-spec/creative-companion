/**
 * Feedback discipline — an action that can fail must report failing.
 *
 * Micro-interactions break down as trigger → rules → feedback → loop. The
 * failure this guards is the third step lying: a FAILED export that still
 * rendered "PDF saved · 3:15pm". Trigger fired, rules ran, feedback lied.
 *
 * Why this matters more here than in most apps: the owner has stated they
 * have no concept of time and that numbers mean nothing. A timestamp in a
 * success message carries no verification signal for them at all — it reads
 * as proof precisely because it looks specific. Someone who tracks time well
 * might notice the mismatch; this user structurally cannot. So the guarantee
 * has to be held by tests rather than by anyone noticing.
 *
 * Deliberately no UI. There is no operations log, no retry history, no status
 * panel — the value is entirely in the guarantee being invisible and always
 * true, and a screen showing operation history would be a new place to look
 * and a new thing to interpret in exchange for information that should never
 * need surfacing.
 *
 * Two layers here:
 *   1. the real download path returns `{ ok: false }` rather than throwing or
 *      falsely reporting success, and the exports that wrap it propagate that
 *   2. a source scan proving no success message sits after an `await` without
 *      the result being checked — with the detector itself tested against a
 *      known-bad sample, so this file cannot quietly become a test that only
 *      ever passes
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { downloadBlob } from './exportFiles'
import { downloadInvoicePdf } from './invoice'

// ── Layer 1: the real path reports its own failure ───────────────────────

describe('the download path reports failure', () => {
  it('refuses an empty blob rather than claiming success', () => {
    const r = downloadBlob(null, 'x.pdf')
    expect(r.ok).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('reports failure when there is no browser to download into', () => {
    // vitest runs in the node environment: `document` genuinely is undefined,
    // so this exercises the real branch rather than a mock of it.
    expect(typeof document).toBe('undefined')
    const r = downloadBlob(new Blob(['x']), 'x.pdf')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/browser/i)
  })

  it('never returns ok without saying how it saved', () => {
    // An `ok` with no method is the shape a stubbed-out success takes.
    const r = downloadBlob(null, 'x.pdf')
    expect(r.ok === true && !r.method).toBe(false)
  })
})

describe('exports propagate the failure instead of swallowing it', () => {
  it('the invoice reports failure when the download cannot happen', async () => {
    const r = await downloadInvoicePdf({
      orgName: 'Studio',
      rate: 80,
      entries: [{ date: '2026-07-01', hours: 2, note: 'Work' }],
    })
    // The PDF itself builds fine; the download is what fails in node. The
    // caller must hear about that — this is exactly the seam where the
    // original bug lived.
    expect(r.ok).toBe(false)
  })
})

// ── Layer 2: no success message after an unchecked await ─────────────────

/** Success-sounding words a toast should only ever say if it really happened. */
const SUCCESS_WORDS =
  /(saved|downloaded|copied|sent|exported|added to the invoice|is in)\b/i

/**
 * Find success reports that follow an `await` without the result being
 * checked, inside the same statement block.
 *
 * Walks upward from each success toast to the start of its enclosing block
 * (an arrow function, `try {`, or a blank line) and asks: did anything in
 * here await, and was anything checked? An awaited call whose result is never
 * consulted, followed by "…saved", is the bug.
 *
 * Returns [{ line, text }] — empty means clean.
 */
export function findUngatedSuccessReports(source) {
  const lines = String(source || '').split('\n')
  const found = []

  lines.forEach((line, i) => {
    const isSuccessReport =
      /flash(Toast|Micro)\??\(/.test(line) && SUCCESS_WORDS.test(line)
    if (!isSuccessReport) return
    // A ternary or `r.ok ?` on the same line is itself the check.
    if (/\bok\b/.test(line)) return

    let awaited = false
    let checked = false
    for (let j = i - 1; j >= 0 && i - j <= 14; j -= 1) {
      const prev = lines[j]
      if (/^\s*$/.test(prev)) break
      if (/\bawait\b/.test(prev)) awaited = true
      if (
        /\.ok\b/.test(prev) ||
        /\bcatch\b/.test(prev) ||
        /\bif\s*\(\s*!?\w+\s*\)/.test(prev)
      ) {
        checked = true
      }
      /* An enclosing `try` counts, and has to be looked for going UP even
         though the `catch` that proves it is below: a rejected await jumps
         straight to the catch, so the success line genuinely cannot run.
         Missing this was the detector's own first bug — it flagged the
         clipboard copy in DeliverView, which is correctly handled. */
      if (/^\s*try\s*\{\s*$/.test(prev)) checked = true
      // Stop at the start of the enclosing function.
      if (/=>\s*\{\s*$/.test(prev) || /\bfunction\b/.test(prev)) break
    }

    if (awaited && !checked) found.push({ line: i + 1, text: line.trim() })
  })

  return found
}

describe('findUngatedSuccessReports', () => {
  it('catches the bug it exists for — the export that lied', () => {
    /* This is the real shape of the original defect: the export is awaited,
       its result is thrown away, and the toast announces success regardless. */
    const bad = `
      const run = async () => {
        const md = build()
        await downloadPdf(md)
        flashToast('PDF saved')
      }
    `
    const hits = findUngatedSuccessReports(bad)
    expect(hits).toHaveLength(1)
    expect(hits[0].text).toMatch(/PDF saved/)
  })

  it('passes the same code once the result is actually checked', () => {
    const good = `
      const run = async () => {
        const r = await downloadPdf(md)
        if (r.ok) flashToast('PDF saved')
        else flashToast(r.error)
      }
    `
    expect(findUngatedSuccessReports(good)).toEqual([])
  })

  it('accepts a ternary on the reporting line itself', () => {
    const good = `
      const run = async () => {
        const r = await save()
        flashToast(r.ok ? 'Desk saved to the cloud' : r.error)
      }
    `
    expect(findUngatedSuccessReports(good)).toEqual([])
  })

  it('accepts a try/catch as the check', () => {
    const good = `
      const run = async () => {
        try {
          await navigator.clipboard.writeText(md)
          flashToast('Client brief copied')
        } catch {
          flashToast('Could not copy')
        }
      }
    `
    expect(findUngatedSuccessReports(good)).toEqual([])
  })

  it('leaves synchronous local changes alone', () => {
    // renameProject cannot fail asynchronously; there is nothing to check.
    const sync = `
      const save = () => {
        renameProject(id, next)
        flashMicro('Name saved')
      }
    `
    expect(findUngatedSuccessReports(sync)).toEqual([])
  })
})

describe('the app itself', () => {
  /* Scoped to the surfaces the user can actually trigger today — export,
     cloud sync, copy, and the panels that write logs — rather than a general
     framework nobody maintains. */
  const FILES = [
    'src/App.jsx',
    'src/views/DeliverView.jsx',
    'src/views/SettingsView.jsx',
    'src/views/ReviewView.jsx',
    'src/features/billing/HoursInvoice.jsx',
    'src/components/CaseStudyExport.jsx',
    'src/features/client-portal/ProjectOverviewShare.jsx',
    'src/components/RevisionRounds.jsx',
  ]

  for (const rel of FILES) {
    it(`reports failure honestly in ${rel}`, () => {
      const src = readFileSync(join(process.cwd(), rel), 'utf8')
      const hits = findUngatedSuccessReports(src)
      expect(
        hits,
        hits.map((h) => `${rel}:${h.line}  ${h.text}`).join('\n')
      ).toEqual([])
    })
  }
})
