import { useEffect, useRef, useState } from 'react'
import { downloadBrandPackVectorPdf } from '../lib/book/exportFiles'

/**
 * The brand book, previewed by rendering the actual PDF.
 *
 * Not a second drawing of the book — the real file is generated and its pages
 * are rasterised here, so what you see is what downloads, by construction
 * rather than by discipline. The previous preview was a different renderer
 * showing a single direction sheet while the download was a multi-page book;
 * the two could disagree indefinitely and nothing would catch it.
 *
 * Page names come back from the generator with the file. They are never
 * written out here: which pages exist depends on what the client filled in
 * (7 pages thin, 16+ full), so a hand-written list would be wrong for almost
 * every project.
 *
 * A column, not a grid — it keeps reading order. CSS caps each sheet so at
 * least one full page fits in the viewport (max-height ~68dvh); the raster
 * is sharp enough that scaling down stays clean.
 */

/** Wait this long after the last edit before re-rendering. */
const SETTLE_MS = 700
/**
 * Rasterised width per page, in CSS pixels. Sized for a viewport-fit sheet
 * (~28rem max), not full main width — oversize rasters only cost memory.
 */
const THUMB_W = 560

export default function BrandBookPreview({
  pack,
  book,
  /** Bump to force a rebuild even when nothing else changed. */
  refreshKey = 0,
}) {
  const [pages, setPages] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const runIdRef = useRef(0)

  /* Keyed on the content that actually changes the book rather than on the
     pack object, which is rebuilt on every render of the parent — without
     this the preview would regenerate on every keystroke in the notes beside
     it, and a preview that makes typing stutter is a preview that stops the
     writing getting done.
     `exportedAt` is stripped because the snapshot stamps it with the current
     time on every rebuild. Leaving it in made the key different on every
     single render, so each pass cancelled the previous debounce and the
     preview never got as far as drawing anything — permanently "Building…".
     Nothing on the page is rendered from it; the cover's date is taken from
     the clock inside the generator. */
  const { exportedAt: _ignored, ...packForKey } = pack || {}
  const signature = JSON.stringify([packForKey, book || null])

  useEffect(() => {
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    let cancelled = false
    setStatus((s) => (s === 'idle' ? 'loading' : 'refreshing'))

    const timer = setTimeout(async () => {
      try {
        const res = await downloadBrandPackVectorPdf(pack, null, {
          returnBlobOnly: true,
          book,
        })
        if (cancelled || runIdRef.current !== runId) return
        if (!res?.ok || !res.blob) throw new Error(res?.error || 'No file')

        /* The legacy build, deliberately. pdf.js 5.7's modern bundle calls
           Map.prototype.getOrInsertComputed, which only exists in browsers
           from around mid-2025 — on anything older the preview dies with
           "getOrInsertComputed is not a function" while the rest of the app
           works fine. This panel is the proof that the deliverable is right,
           so it has to render on whatever browser the user happens to have.
           The repo's own PDF tests already read through the legacy build. */
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
        // Vite resolves this to a hashed asset URL; without it pdf.js tries to
        // fetch a worker path that doesn't exist in the built bundle.
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()

        const data = new Uint8Array(await res.blob.arrayBuffer())
        const doc = await pdfjs.getDocument({ data }).promise
        if (cancelled || runIdRef.current !== runId) return

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const out = []
        for (let p = 1; p <= doc.numPages; p += 1) {
          const page = await doc.getPage(p)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({
            scale: (THUMB_W / base.width) * dpr,
          })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          const canvasContext = canvas.getContext('2d')
          await page.render({ canvasContext, viewport, canvas }).promise
          if (cancelled || runIdRef.current !== runId) return
          /* A data URL, not an object URL. The app's CSP allows `data:` for
             images but not `blob:` — on both deploy targets, not just here —
             so blob URLs render as broken images in production. Widening
             img-src across the deploy configs would be a security decision to
             make deliberately, not a side effect of a preview panel. */
          out.push({
            num: p,
            title: res.pageTitles?.[p - 1] || `Page ${p}`,
            src: canvas.toDataURL('image/png'),
            ratio: base.height / base.width,
          })
        }
        if (cancelled || runIdRef.current !== runId) return
        setPages(out)
        setError('')
        setStatus('ready')
      } catch (e) {
        if (cancelled || runIdRef.current !== runId) return
        setError(e?.message || 'Could not build the preview')
        setStatus('error')
      }
    }, SETTLE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, refreshKey])

  if (status === 'error') {
    return (
      <div className="book-preview-msg" role="status">
        <p>Preview didn&apos;t build. The download still works.</p>
        <p className="book-preview-msg-detail">{error}</p>
      </div>
    )
  }

  if (!pages.length) {
    return (
      <div className="book-preview-msg" role="status">
        Building your preview…
      </div>
    )
  }

  return (
    <div
      className={`book-preview${status === 'refreshing' ? ' is-refreshing' : ''}`}
    >
      {/* The count is read off the file rather than stated as a constant —
          it changes with the content, so any fixed number would be a lie. */}
      <p className="book-preview-count">
        {pages.length} {pages.length === 1 ? 'page' : 'pages'}
      </p>
      <ol className="book-preview-list">
        {pages.map((p) => (
          <li key={p.num} className="book-preview-page">
            <img
              className="book-preview-sheet"
              src={p.src}
              alt={`Page ${p.num}: ${p.title}`}
              loading="lazy"
              style={{ aspectRatio: `1 / ${p.ratio}` }}
            />
            <span className="book-preview-name">
              <span className="book-preview-num">{p.num}</span>
              {p.title}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
