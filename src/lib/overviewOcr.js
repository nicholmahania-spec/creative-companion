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
