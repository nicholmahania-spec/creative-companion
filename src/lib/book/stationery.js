/**
 * Brand-recognition-product templates — letterhead, business card,
 * envelope, email signature. Real, exportable files filled with the
 * project's actual brand + contact info, at correct physical page
 * sizes (not the app's usual A4 direction-sheet PDF).
 */
import { downloadBlob } from './exportFiles'

function safeFilename(filename) {
  return String(filename || 'download').replace(/[/\\?%*:|"<>]/g, '-')
}

export const PAGE_SIZES = {
  letterhead: { widthIn: 8.5, heightIn: 11 },
  businessCard: { widthIn: 3.5, heightIn: 2 },
  envelope: { widthIn: 9.5, heightIn: 4.125 },
}

let jsPdfPromise = null
let html2canvasPromise = null

function loadEngines() {
  if (!jsPdfPromise) jsPdfPromise = import('jspdf')
  if (!html2canvasPromise) html2canvasPromise = import('html2canvas')
  return Promise.all([jsPdfPromise, html2canvasPromise])
}

/**
 * Render an off-DOM (or hidden) element to a print-accurate PDF.
 *
 * Same engine path StationeryKit already uses. By default the browser
 * downloads the file. Pass `returnBlobOnly: true` when a caller needs the
 * bytes (e.g. Touchpoints → packageAssets) without a second PDF generator.
 *
 * @param {HTMLElement} el
 * @param {{ widthIn: number, heightIn: number, filename: string, dpi?: number, returnBlobOnly?: boolean }} opts
 * @returns {Promise<{ ok: boolean, error?: string, blob?: Blob, filename?: string, method?: string }>}
 */
export async function elementToPdf(
  el,
  { widthIn, heightIn, filename, dpi = 300, returnBlobOnly = false } = {}
) {
  if (!el) return { ok: false, error: 'Nothing to render' }
  const [jsPdfMod, html2canvasMod] = await loadEngines()
  const { jsPDF } = jsPdfMod
  const html2canvas = html2canvasMod.default || html2canvasMod

  /* Scale for PRINT resolution, derived from the element's real on-screen
     width rather than assumed.
     A fixed `scale: 3` produced whatever the preview happened to be times
     three — a 220px card preview gave a 660px image on an 8.5in page, about
     78dpi. A cold-start tester measured it and said plainly they could not
     send it to a printer. 300dpi is the floor for anything that gets
     printed, and deriving it means a preview resized later cannot silently
     drop the export back to a blur. */
  const cssWidth = el.getBoundingClientRect().width || el.offsetWidth || 1
  const targetPx = widthIn * dpi
  const scale = Math.max(1, Math.min(12, targetPx / cssWidth))

  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    /* Placeholder text must never reach a file. The card rendered the
       literal words "Name" and "Title" when a contact had none, and the
       letterhead printed "Address · Phone · Email · Website" — inside a real
       PDF that looks finished. A designer could send that to a printer or a
       client. On screen a placeholder is a helpful hint; in an export it is
       a defect, so it is stripped at capture time and the preview keeps it. */
    onclone: (doc) => {
      doc.querySelectorAll('[data-placeholder="true"]').forEach((node) => {
        node.textContent = ''
      })
    },
  })

  const pdf = new jsPDF({
    unit: 'in',
    format: [widthIn, heightIn],
    orientation: widthIn >= heightIn ? 'landscape' : 'portrait',
  })
  const imgData = canvas.toDataURL('image/jpeg', 0.95)
  pdf.addImage(imgData, 'JPEG', 0, 0, widthIn, heightIn)

  let blob
  try {
    blob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' })
  } catch {
    blob = pdf.output('blob')
  }
  const name = safeFilename(filename)
  if (returnBlobOnly) {
    return { ok: true, blob, filename: name }
  }
  return downloadBlob(blob, name)
}

/**
 * Render an off-DOM element to a PNG.
 *
 * Same engine path StationeryKit uses for the email signature. Pass a
 * filename string for the classic download, or an options object with
 * `returnBlobOnly: true` when Touchpoints needs packageAssets bytes
 * (same contract as elementToPdf).
 *
 * @param {HTMLElement} el
 * @param {string|{ filename?: string, returnBlobOnly?: boolean }} [filenameOrOpts]
 * @returns {Promise<{ ok: boolean, error?: string, blob?: Blob, filename?: string, method?: string }>}
 */
export async function elementToPng(el, filenameOrOpts = {}) {
  if (!el) return { ok: false, error: 'Nothing to render' }
  const opts =
    typeof filenameOrOpts === 'string'
      ? { filename: filenameOrOpts, returnBlobOnly: false }
      : filenameOrOpts || {}
  const { filename = 'export.png', returnBlobOnly = false } = opts
  const [, html2canvasMod] = await loadEngines()
  const html2canvas = html2canvasMod.default || html2canvasMod
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  })
  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png')
  })
  if (!blob) return { ok: false, error: 'Could not render PNG' }
  const name = safeFilename(filename)
  if (returnBlobOnly) {
    return { ok: true, blob, filename: name }
  }
  return downloadBlob(blob, name)
}
