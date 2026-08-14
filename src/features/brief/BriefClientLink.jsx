/**
 * The client's link to the Brief — create, copy, check, revoke.
 *
 * WHY IT LIVES HERE NOW. These controls sat inside the studio Discovery
 * modal, which is being retired as an intake surface. `createDiscoveryShare`
 * already had a second home on the new-project intake, but
 * `revokeDiscoveryShare` had exactly one call site — inside that modal — so
 * retiring it without moving this would have left a live client link with no
 * way to kill it. The Brief owns the thing being shared, so the Brief owns the
 * link to it.
 *
 * NOTHING ABOUT THE SHARE SYSTEM CHANGES. Same `discoveryShare` functions,
 * same share ids, same persisted `discoveryShareId` / `discoveryShareStatus`,
 * same `/f/:shareId` route, same `mergeDiscoveryAnswers` on submission. This
 * file is a new home for existing controls, not a new mechanism.
 *
 * THE SEED IS EMPTY, AND THAT IS THE EXISTING BEHAVIOUR, NOT A NEW CHOICE.
 * `createDiscoveryShare` takes an `answers` seed for what the client sees
 * pre-filled. The retired modal passed its own 30-field `discoveryAnswers`,
 * which the public route — rendering `DETECTIVE_CHAPTERS` — could only
 * partly read anyway. The other existing caller, `NewProjectIntake`, passes
 * `{}`. This matches that one: it is the canonical path's established
 * behaviour, it carries nothing from the schema being retired, and it does
 * not put designer-authored words in front of a client as though they had
 * answered them.
 */
import { useState } from 'react'
import {
  createDiscoveryShare,
  discoveryShareUrl,
  fetchDiscoveryShare,
  revokeDiscoveryShare,
} from '../../lib/client/discoveryShare'

export default function BriefClientLink({
  projectId = null,
  clientName = '',
  shareId = null,
  shareStatus = null,
  onSetShare,
  onMergeAnswers,
  flashToast,
}) {
  const [busy, setBusy] = useState('')
  /* Revoke arms before it fires. It kills a link a client may be part-way
     through, and the studio has no way to warn them — so the second click is
     the confirmation, exactly as the retired modal did it. */
  const [revokeArmed, setRevokeArmed] = useState(false)
  const [revoked, setRevoked] = useState(false)

  const live = !!shareId && !revoked

  const create = async () => {
    setBusy('create')
    const r = await createDiscoveryShare({
      projectLocalId: projectId,
      clientName,
      answers: {},
    })
    setBusy('')
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t create the link')
      return
    }
    onSetShare?.(r.shareId, 'pending')
    try {
      await navigator.clipboard?.writeText(discoveryShareUrl(r.shareId))
    } catch {
      /* Clipboard blocked — the link still lives on the brief. */
    }
    flashToast?.('Client link created and copied')
  }

  const check = async () => {
    if (!shareId) return
    setBusy('check')
    const r = await fetchDiscoveryShare(shareId)
    setBusy('')
    if (!r.ok) {
      flashToast?.(r.error || 'Couldn’t check the link')
      return
    }
    if (r.status !== 'submitted') {
      flashToast?.('Not sent back yet')
      return
    }
    /* The same merge the client's own submission runs: fills blanks in
       `detective`, never overwrites what the studio already wrote. */
    onMergeAnswers?.(projectId, r.answers || {})
    onSetShare?.(shareId, 'submitted')
    flashToast?.('Answers pulled into the brief')
  }

  const revoke = async () => {
    if (!revokeArmed) {
      setRevokeArmed(true)
      return
    }
    setBusy('revoke')
    const r = await revokeDiscoveryShare(shareId)
    setBusy('')
    setRevokeArmed(false)
    if (r.ok) {
      setRevoked(true)
      flashToast?.('Link revoked — the old link no longer opens')
    } else {
      flashToast?.(r.error || 'Couldn’t revoke the link')
    }
  }

  return (
    <div className="brief-client-link" role="group" aria-label="Client link">
      {!live ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy === 'create'}
          onClick={create}
        >
          {busy === 'create' ? 'Creating…' : 'Create client link'}
        </button>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              navigator.clipboard?.writeText(discoveryShareUrl(shareId))
              flashToast?.('Client link copied')
            }}
          >
            Copy link
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy === 'check'}
            onClick={check}
          >
            {busy === 'check' ? 'Checking…' : 'Check for answers'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm brief-client-link-revoke"
            disabled={busy === 'revoke'}
            onClick={revoke}
          >
            {revokeArmed ? 'Revoke — sure?' : 'Revoke link'}
          </button>
          {shareStatus ? (
            <span className="brief-client-link-state">{shareStatus}</span>
          ) : null}
        </>
      )}
    </div>
  )
}
