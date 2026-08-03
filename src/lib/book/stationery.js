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
 * Render an off-DOM (or hidden) element to a print-accurate PDF and
 * trigger a download.
 * @param {HTMLElement} el
 * @param {{ widthIn: number, heightIn: number, filename: string }} opts
 */
export async function elementToPdf(el, { widthIn, heightIn, filename }) {
  if (!el) return { ok: false, error: 'Nothing to render' }
  const [jsPdfMod, html2canvasMod] = await loadEngines()
  const { jsPDF } = jsPdfMod
  const html2canvas = html2canvasMod.default || html2canvasMod

  const canvas = await html2canvas(el, {
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
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
  return downloadBlob(blob, safeFilename(filename))
}

/** Render an off-DOM element to a downloadable PNG (email signature). */
export async function elementToPng(el, filename) {
  if (!el) return { ok: false, error: 'Nothing to render' }
  const [, html2canvasMod] = await loadEngines()
  const html2canvas = html2canvasMod.default || html2canvasMod
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  })
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(downloadBlob(blob, safeFilename(filename)))
    }, 'image/png')
  })
}
