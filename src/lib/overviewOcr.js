/**
 * OCR import for a printed, hand-filled Project overview form.
 *
 * Deliberately never writes straight into the project: OCR of handwriting
 * is unreliable, so this only ever *proposes* answers that the studio user
 * reviews and corrects before anything is saved (see the review step in
 * ProjectOverviewShare.jsx). Silent auto-fill of wrong answers would be
 * worse than no import at all.
 */
import { DETECTIVE_CHAPTERS } from './detectiveBrief'

const ALL_FIELDS = DETECTIVE_CHAPTERS.flatMap((c) => c.fields)

/** Normalize a label for loose matching against a noisy OCR line. */
function normalizeLabel(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Split raw OCR text into { fieldId: value } guesses by finding each
 * known field label in the text and taking what follows it, up to the
 * next recognized label.
 * @param {string} rawText
 * @returns {Record<string, string>}
 */
export function parseOverviewOcrText(rawText) {
  const text = String(rawText || '')
  if (!text.trim()) return {}

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  // Find which line index each field's label appears on (first match wins).
  const hits = []
  ALL_FIELDS.forEach((f) => {
    const target = normalizeLabel(f.label)
    if (!target) return
    const idx = lines.findIndex((l) => normalizeLabel(l).includes(target))
    if (idx >= 0) hits.push({ fieldId: f.id, lineIndex: idx, label: f.label })
  })

  hits.sort((a, b) => a.lineIndex - b.lineIndex)

  const out = {}
  hits.forEach((hit, i) => {
    const startLine = lines[hit.lineIndex]
    const labelNorm = normalizeLabel(hit.label)
    // Value may trail the label on the same line ("Client name: Acme Co")
    const sameLineRest = normalizeLabel(startLine).replace(labelNorm, '').trim()
    const endIndex = i + 1 < hits.length ? hits[i + 1].lineIndex : lines.length

    const parts = []
    if (sameLineRest) {
      // Recover original casing from the tail of the raw line
      const raw = startLine.slice(Math.max(0, startLine.length - sameLineRest.length))
      parts.push(raw.replace(/^[:\-–\s]+/, '').trim())
    }
    for (let j = hit.lineIndex + 1; j < endIndex; j += 1) parts.push(lines[j])

    const value = parts.join(' ').replace(/\s+/g, ' ').trim()
    if (value) out[hit.fieldId] = value
  })

  return out
}

/** Prefix for AcroForm field names in the blank overview PDF. Namespaced so
 *  a PDF that merely happens to have form fields isn't mistaken for ours. */
export const OVERVIEW_FIELD_PREFIX = 'cc.overview.'

/**
 * Read a digitally-filled copy of our blank overview PDF.
 *
 * This is the exact path: the client typed into real form fields, so the
 * values come back as typed — no OCR, nothing to misread, nothing to
 * correct line by line. Falls through (ok:false, `needsOcr`) when the PDF
 * has no fields of ours, which is the scanned-paper case.
 *
 * @param {File|Blob} file
 * @returns {Promise<{ ok: true, answers: Record<string,string> } | { ok: false, error: string, needsOcr?: boolean }>}
 */
export async function readOverviewPdfForm(file) {
  if (!file) return { ok: false, error: 'No file provided' }
  try {
    const { PDFDocument } = await import('pdf-lib')
    const bytes = await file.arrayBuffer()
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })

    let fields = []
    try {
      fields = doc.getForm().getFields()
    } catch {
      fields = []
    }

    const answers = {}
    fields.forEach((field) => {
      const name = field.getName?.() || ''
      if (!name.startsWith(OVERVIEW_FIELD_PREFIX)) return
      if (typeof field.getText !== 'function') return
      const value = String(field.getText() || '').trim()
      if (value) answers[name.slice(OVERVIEW_FIELD_PREFIX.length)] = value
    })

    if (!Object.keys(answers).length) {
      return {
        ok: false,
        needsOcr: true,
        error: 'That PDF has no filled-in form fields.',
      }
    }
    return { ok: true, answers }
  } catch (e) {
    return {
      ok: false,
      needsOcr: true,
      error: e?.message || 'Couldn’t read that PDF',
    }
  }
}

/** Cap on pages we rasterize. The overview form is 2–3 pages; beyond that the
 *  user almost certainly uploaded the wrong document, and OCRing 40 pages
 *  would look like a hang. */
const MAX_OCR_PAGES = 4

/**
 * Rasterize a scanned PDF to page images so Tesseract can read it.
 *
 * Tesseract cannot open PDFs at all — it takes images. This is the genuine
 * paper path: client printed the form, wrote on it, scanned it back to PDF.
 * Only reached after `readOverviewPdfForm` finds no real form fields.
 *
 * @param {File|Blob} file
 * @param {(progress: number) => void} [onProgress] 0..1 across all pages
 * @returns {Promise<{ ok: true, answers: Record<string,string>, rawText: string } | { ok: false, error: string }>}
 */
export async function ocrOverviewPdf(file, onProgress) {
  if (!file) return { ok: false, error: 'No file provided' }
  try {
    const pdfjs = await import('pdfjs-dist')
    // Vite resolves this to a hashed asset URL; without it pdf.js tries to
    // fetch a worker path that doesn't exist in the built bundle.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()

    const data = new Uint8Array(await file.arrayBuffer())
    const doc = await pdfjs.getDocument({ data }).promise
    const pageCount = Math.min(doc.numPages, MAX_OCR_PAGES)
    if (!pageCount) return { ok: false, error: 'That PDF has no pages.' }

    const { default: Tesseract } = await import('tesseract.js')
    const texts = []

    for (let p = 1; p <= pageCount; p += 1) {
      const page = await doc.getPage(p)
      // 2x for legibility — handwriting at 1x scans too coarse to OCR.
      const viewport = page.getViewport({ scale: 2 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const canvasContext = canvas.getContext('2d')
      await page.render({ canvasContext, viewport, canvas }).promise

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      const base = (p - 1) / pageCount
      const result = await Tesseract.recognize(blob, 'eng', {
        logger: (m) => {
          if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
            onProgress?.(base + m.progress / pageCount)
          }
        },
      })
      texts.push(result?.data?.text || '')
      canvas.width = 0
      canvas.height = 0
    }

    const rawText = texts.join('\n')
    return { ok: true, answers: parseOverviewOcrText(rawText), rawText }
  } catch (e) {
    return { ok: false, error: e?.message || 'Couldn’t read that PDF' }
  }
}

/**
 * Run OCR on an image/PDF-page file and return proposed field answers.
 * Loads tesseract.js lazily so the main bundle isn't paying for it.
 * @param {File|Blob} file
 * @param {(progress: number) => void} [onProgress] 0..1
 * @returns {Promise<{ ok: true, answers: Record<string,string>, rawText: string } | { ok: false, error: string }>}
 */
export async function ocrOverviewForm(file, onProgress) {
  if (!file) return { ok: false, error: 'No file provided' }
  try {
    const { default: Tesseract } = await import('tesseract.js')
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
          onProgress?.(m.progress)
        }
      },
    })
    const rawText = result?.data?.text || ''
    return { ok: true, answers: parseOverviewOcrText(rawText), rawText }
  } catch (e) {
    return { ok: false, error: e?.message || 'Couldn’t read that file' }
  }
}
