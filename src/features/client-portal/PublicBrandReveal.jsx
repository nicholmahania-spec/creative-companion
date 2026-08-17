/**
 * The reveal (/d/:portalId) — where a client meets their finished brand.
 *
 * A third public, no-login surface alongside /f/ and /c/, and deliberately not
 * a tab inside the portal. The portal is a working screen: steps, approvals, a
 * chat thread, a form someone still has to fill in. Opening the finished brand
 * there would put it in the same frame as the admin, on the same page as the
 * thing they were nagged about last week. This page has one job and nothing
 * else on it.
 *
 * Three things happen here, in this order:
 *   1. a short curtain, so the book is arrived at rather than scrolled into
 *   2. the designer's note, then the actual brand book
 *   3. one open question — "anything you want to tell them?"
 *
 * And one thing happens invisibly: the studio is told, once, that this was
 * opened. That is the whole point of the notification — a reveal that nobody
 * witnesses is a file transfer.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { labelForStepId } from '../../lib/journey/journey'
import { clientFacingError } from '../../lib/client/clientFacingError'
import { bestTextOn, DEFAULT_PALETTE } from '../../lib/color'
import {
  fetchBrandDelivery,
  markBrandDeliveryViewed,
  submitBrandDeliveryReaction,
} from '../../lib/client/brandDelivery'
import { downloadBrandPackVectorPdf } from '../../lib/book/exportFiles'
import { packForPublishedIdentity } from '../../lib/artifacts/identitySnapshot'
import '../../styles/lazy-reveal.css'

const BrandBookPreview = lazy(() => import('../../components/BrandBookPreview'))

/** How long the curtain holds before it lifts. */
const CURTAIN_MS = 1600

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export default function PublicBrandReveal({ portalId }) {
  const [loadState, setLoadState] = useState('loading') // loading | ready | notfound
  const [delivery, setDelivery] = useState(null)
  const [error, setError] = useState('')
  const [curtainUp, setCurtainUp] = useState(() => prefersReducedMotion())
  const [reaction, setReaction] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const viewMarked = useRef(false)

  /* Same reasoning as the other two public surfaces: everything typed here
     lives in component state, the send is single-use server-side, and this is
     a stranger on a phone who may be interrupted mid-sentence. See
     publicSurfaceParity.test.js — one of these three getting a protection the
     others miss is the exact drift that test exists to catch. */
  const draftKey = `cc-reveal-draft-${portalId}`
  const draftRestored = useRef(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const r = await fetchBrandDelivery(portalId)
      if (!alive) return
      if (!r.ok) {
        setError(clientFacingError(r.error))
        setLoadState('notfound')
        return
      }
      setDelivery(r)
      if (!r.reaction) {
        try {
          setReaction(localStorage.getItem(draftKey) || '')
        } catch {
          /* private mode — the page still works, the draft just won't survive */
        }
      }
      draftRestored.current = true
      setLoadState('ready')

      /* Told once, and never in a way the client has to care about. A failure
         here is silent on purpose: "couldn't record your visit" is an error
         message about someone else's feature. */
      if (!viewMarked.current) {
        viewMarked.current = true
        void markBrandDeliveryViewed(portalId)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalId])

  useEffect(() => {
    if (!draftRestored.current || sent) return
    try {
      localStorage.setItem(draftKey, reaction)
    } catch {
      /* private mode / quota */
    }
  }, [reaction, sent, draftKey])

  useEffect(() => {
    if (curtainUp || loadState !== 'ready') return undefined
    const t = setTimeout(() => setCurtainUp(true), CURTAIN_MS)
    return () => clearTimeout(t)
  }, [curtainUp, loadState])

  const pack = useMemo(
    () => packForPublishedIdentity(delivery?.pack || null, delivery?.identity),
    [delivery]
  )
  const palette = useMemo(() => {
    const p = Array.isArray(pack?.palette) ? pack.palette.filter(Boolean) : []
    return p.length ? p : DEFAULT_PALETTE
  }, [pack])
  const coverBg = palette[0]
  const coverInk = bestTextOn(coverBg)

  const sendReaction = async (e) => {
    e.preventDefault()
    const body = reaction.trim()
    if (!body) return
    setError('')
    setSending(true)
    const r = await submitBrandDeliveryReaction(portalId, body)
    setSending(false)
    if (!r.ok) {
      setError(clientFacingError(r.error))
      return
    }
    setSent(true)
    try {
      localStorage.removeItem(draftKey)
    } catch {
      /* private mode */
    }
  }

  const downloadPdf = async () => {
    if (!pack || downloading) return
    setDownloading(true)
    try {
      /* No filename option — the generator names the file from the pack's own
         project name, so the client's copy and the designer's are the same
         file with the same name. */
      const res = await downloadBrandPackVectorPdf(pack, null, {
        book: delivery?.book,
      })
      if (!res?.ok) setError('That didn’t download. Try again, or ask your designer to email it.')
    } catch {
      setError('That didn’t download. Try again, or ask your designer to email it.')
    }
    setDownloading(false)
  }

  if (loadState === 'loading') {
    return (
      <div className="reveal-page">
        <div className="reveal-notice">
          <p className="reveal-status" role="status">
            Loading…
          </p>
        </div>
      </div>
    )
  }

  if (loadState === 'notfound') {
    return (
      <div className="reveal-page">
        <div className="reveal-notice">
          <p className="reveal-status" role="alert">
            {error || 'This link isn’t ready yet — your designer will send it when it is.'}
          </p>
        </div>
      </div>
    )
  }

  const title = pack?.projectName || delivery?.clientName || 'Your brand'

  return (
    <div className="reveal-page reveal-page-live">
      {/* Decorative, and gone in under two seconds. aria-hidden throughout:
          the same words are the page's real <h1> underneath, so a screen
          reader gets them once, immediately, rather than twice on a delay. */}
      <div
        className={`reveal-curtain${curtainUp ? ' is-up' : ''}`}
        style={{ background: coverBg, color: coverInk }}
        aria-hidden="true"
      >
        <span className="reveal-curtain-text">{title}</span>
      </div>

      <main className="reveal-main">
        <header className="reveal-head" style={{ borderColor: coverBg }}>
          <p className="reveal-eyebrow">Your brand</p>
          <h1 className="reveal-title">{title}</h1>
          {delivery?.note ? (
            <p className="reveal-note">{delivery.note}</p>
          ) : null}
        </header>

        <section className="reveal-book" aria-label={labelForStepId('book')}>
          {pack ? (
            <Suspense
              fallback={
                <p className="reveal-status" role="status">
                  Opening your brand book…
                </p>
              }
            >
              <BrandBookPreview
                pack={pack}
                book={delivery?.book}
              />
            </Suspense>
          ) : (
            <p className="reveal-status" role="status">
              Your designer sent a note but no book yet — they'll follow up.
            </p>
          )}
        </section>

        {pack ? (
          <div className="reveal-download">
            <button
              type="button"
              className="btn btn-primary"
              onClick={downloadPdf}
              disabled={downloading}
            >
              {downloading ? 'Getting it ready…' : 'Download the PDF'}
            </button>
            <p className="reveal-download-hint">
              This is the brand book — yours to keep. Logo files, colour
              tokens, and any produced applications come separately from your
              designer if they were made.
            </p>
          </div>
        ) : null}

        <section className="reveal-reaction" aria-label="Reply to your designer">
          {sent || delivery?.reaction ? (
            <p className="reveal-status" role="status">
              Thanks — they'll see that.
            </p>
          ) : (
            <form onSubmit={sendReaction}>
              <label className="reveal-reaction-label" htmlFor="reveal-reaction">
                Anything you'd like to tell your designer?
              </label>
              <textarea
                id="reveal-reaction"
                className="field-input reveal-reaction-input"
                rows={3}
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
                placeholder="However you'd put it"
              />
              {error ? (
                <p className="reveal-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={sending || !reaction.trim()}
              >
                {sending ? 'Sending…' : 'Send it'}
              </button>
            </form>
          )}
          {/* Errors from the download have no form of their own to sit in. */}
          {error && (sent || delivery?.reaction) ? (
            <p className="reveal-error" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  )
}
