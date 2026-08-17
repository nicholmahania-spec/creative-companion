/**
 * Send it to the client — the studio half of the delivery moment.
 *
 * Lives on Deliver, beside the download, because that is where a designer
 * already goes when a project is finished. Three states and one button each:
 *
 *   draft      one button: "Ready to send it"
 *   preview    the note, and exactly what the client will get. Nothing has
 *              been written to the server yet, so backing out costs nothing.
 *   delivered  the link, whether it has been opened, and what they wrote back
 *
 * The preview state is the whole design. Sending a brand book is outbound and
 * unrepeatable — you cannot un-send the email — so the last screen before it
 * happens shows the thing itself rather than asking "Are you sure?", which is
 * a decision without information.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  brandRevealUrl,
  defaultDeliveryNote,
  deliveryGaps,
  deliveryStage,
  deliveryStatusLine,
  publishDelivery,
  unpublishDelivery,
} from '../../lib/client/brandDelivery'
import { fetchPortalStudioView } from '../../lib/client/clientPortal'
import { copyText } from '../../lib/client/copyText'
import { buildIdentitySnapshot } from '../../lib/artifacts/identitySnapshot'
import useAppStore from '../../store/useAppStore'

export default function DeliverToClient({
  project = null,
  portalId = '',
  pack = null,
  book = null,
  cloud = false,
  onOpenPortalPanel,
  flashToast,
  offerUndo,
}) {
  const [portal, setPortal] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const clientName = project?.detective?.clientName || ''

  /* Nothing is set before the first await, deliberately: a synchronous
     setState inside the mount effect below is a cascading render, and the two
     no-op cases (no account, no client link) render from props alone anyway. */
  const refresh = useCallback(async () => {
    if (!portalId || !cloud) return
    const r = await fetchPortalStudioView(portalId)
    if (r.ok) setPortal(r.portal)
    setLoaded(true)
  }, [portalId, cloud])

  /* Awaited inside the effect rather than called from its body: a setState
     the linter can reach synchronously from an effect is a cascading render,
     and this one has a real fetch in front of it anyway. */
  useEffect(() => {
    void (async () => {
      await refresh()
    })()
  }, [refresh])

  /* Poll while it is out there, so "they opened it" arrives on its own. This
     is the notification the whole feature is for; making the designer press
     Refresh to find out whether their client looked at the work is the
     opposite of the point. Only while delivered and unopened — once both
     facts are known there is nothing left to learn. */
  useEffect(() => {
    if (!portalId || !cloud) return undefined
    if (portal?.delivery_status !== 'delivered') return undefined
    if (portal?.delivery_viewed_at && portal?.delivery_reaction) return undefined
    const id = setInterval(refresh, 30000)
    return () => clearInterval(id)
  }, [portalId, cloud, portal?.delivery_status, portal?.delivery_viewed_at, portal?.delivery_reaction, refresh])

  const stage = deliveryStage(portal, previewing)
  /* Derived from the delivered row, not remembered from the send. A designer
     who reloads still learns why their client's copy differs from the preview —
     the sentence used to live in component state and vanish. */
  const dropped = deliveryGaps(portal, pack)

  const startPreview = () => {
    setError('')
    setNote(
      portal?.delivery_note ||
        defaultDeliveryNote({
          clientName,
          projectName: project?.name || '',
        })
    )
    setPreviewing(true)
  }

  const send = async () => {
    setError('')
    setBusy(true)
    const identity = project ? buildIdentitySnapshot(project) : null
    const r = await publishDelivery(portalId, {
      note,
      pack,
      book,
      identity,
      /* Which project's book this is. `publishDelivery` scopes the write to the
         portal AND this id, so a link that belongs to another project of the
         same studio cannot receive it. */
      projectLocalId: project?.id,
    })
    setBusy(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    if (identity) {
      useAppStore.getState().recordPublishedIdentity(identity, project.id)
    }
    setPreviewing(false)
    await refresh()
    flashToast?.('Sent — they have the link', { important: true })
    /* Undo rather than a confirmation dialog, same as everywhere else. It is
       honest here: unpublishDelivery genuinely closes the link again. */
    offerUndo?.('Sent the brand book', async () => {
      await unpublishDelivery(portalId)
      await refresh()
    })
  }

  const takeBack = async () => {
    setError('')
    setBusy(true)
    const r = await unpublishDelivery(portalId)
    setBusy(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    await refresh()
    flashToast?.('Taken back — the link no longer opens')
  }

  const copyLink = async () => {
    const ok = await copyText(brandRevealUrl(portalId))
    flashToast?.(ok ? 'Link copied' : 'Couldn’t copy — select the link and copy it')
  }

  if (!cloud) {
    return (
      <section className="deliver-send" aria-label="Send to client">
        <h2 className="assets-secondary-title">Send it to your client</h2>
        <p className="panel-hint">
          Sending a link needs an account, so the client has somewhere to open it. You can
          still download the book and email it.
        </p>
      </section>
    )
  }

  if (!portalId) {
    return (
      <section className="deliver-send" aria-label="Send to client">
        <h2 className="assets-secondary-title">Send it to your client</h2>
        <p className="panel-hint">
          Your client needs a link first — the same one they use for approvals.
        </p>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onOpenPortalPanel?.()}
        >
          Set up their link
        </button>
      </section>
    )
  }

  if (!loaded) {
    /* Only reachable with an account AND a client link — both no-op cases
       returned above — so this is genuinely "still fetching". */
    return (
      <section className="deliver-send" aria-label="Send to client">
        <h2 className="assets-secondary-title">Send it to your client</h2>
        <p className="panel-hint">Loading…</p>
      </section>
    )
  }

  return (
    <section className="deliver-send" aria-label="Send to client">
      <h2 className="assets-secondary-title">Send it to your client</h2>

      {stage === 'draft' && (
        <>
          <p className="panel-hint">
            They get a page of their own with your note and the finished book — not an
            attachment in a thread.
          </p>
          <button type="button" className="btn btn-primary" onClick={startPreview}>
            Ready to send it
          </button>
        </>
      )}

      {stage === 'preview' && (
        <>
          <p className="panel-hint">
            Nothing has gone out yet. This is what {clientName || 'they'} will see.
          </p>
          <div className="field-block">
            <label className="field-label" htmlFor="delivery-note">
              Your note
            </label>
            <textarea
              id="delivery-note"
              className="field-textarea deliver-note"
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Say what you want to say — or clear it and send just the book"
            />
          </div>
          <p className="panel-hint">
            Then the brand book, exactly as it downloads, and one question asking what they
            think.
          </p>
          {error ? (
            <p className="public-fill-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="finish-secondary-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={send}
              disabled={busy}
            >
              {busy ? 'Sending…' : clientName ? `Send it to ${clientName}` : 'Send it'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setPreviewing(false)}
              disabled={busy}
            >
              Not yet
            </button>
          </div>
        </>
      )}

      {stage === 'delivered' && (
        <>
          {/* Deliberately flat, neutral wording — a client who hasn't opened it
              yet is not late, and this line must never suggest otherwise. */}
          <p className="assets-status" role="status">
            {deliveryStatusLine(portal)}
          </p>

          {dropped.length > 0 && (
            <p className="panel-hint">
              Too big to send whole, so their copy leaves out {dropped.join(' and ')}. The
              PDF you download still has everything.
            </p>
          )}

          <p className="panel-hint">
            <a href={brandRevealUrl(portalId)} target="_blank" rel="noreferrer">
              {brandRevealUrl(portalId)}
            </a>
          </p>

          {portal?.delivery_reaction ? (
            <blockquote className="deliver-reaction">
              <p>{portal.delivery_reaction}</p>
              <footer>— {clientName || 'your client'}</footer>
            </blockquote>
          ) : null}

          {error ? (
            <p className="public-fill-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="finish-secondary-row">
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyLink}>
              Copy the link
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={takeBack}
              disabled={busy}
            >
              Take it back
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={startPreview}
              disabled={busy}
            >
              Send it again
            </button>
          </div>
        </>
      )}
    </section>
  )
}
