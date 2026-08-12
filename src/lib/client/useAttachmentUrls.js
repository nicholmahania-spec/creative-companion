/**
 * Resolve a screen's client attachments to signed URLs, in one hook.
 *
 * `client-uploads` is private (20260812123000), so a URL now has to be minted
 * per object and it expires. That makes attachment rendering asynchronous,
 * which is why this exists rather than a plain accessor.
 *
 * ONE HOOK PER SCREEN, NOT PER FIELD. Attachments live in `${id}Files` arrays
 * scattered across an answers document, and the Rules of Hooks forbid a hook
 * per array. Callers flatten with `allAttachments()` first — memoised, so the
 * list is referentially stable — and look results up by `attachmentKey`.
 *
 * Returns a plain map of key → URL. A key that is absent or null means "there
 * is a file here and this viewer cannot see it": failed validation, an object
 * whose portal the viewer does not own, no cloud configured, or a signing
 * error. All four render the same way, and all four render the file's NAME
 * rather than nothing — a file that vanishes without trace is the failure this
 * audience least recovers from.
 */
import { useEffect, useState } from 'react'
import { attachmentKey } from './attachmentUrl'
import { clientAttachments } from './attachmentAccess'

/** Stable identity, so an attachment-free screen never re-renders on this. */
const EMPTY = Object.freeze({})

const sameMap = (a, b) => {
  const keys = Object.keys(b)
  if (Object.keys(a).length !== keys.length) return false
  return keys.every((k) => a[k] === b[k])
}

/**
 * @param {Array<object>} files flattened attachment entries, memoised by the caller
 * @param {string} [targetId] share/portal id, where the screen knows it
 * @param {object} [access] injectable, for tests
 */
export function useAttachmentUrls(files, targetId, access = clientAttachments) {
  const [urls, setUrls] = useState({})

  useEffect(() => {
    const list = Array.isArray(files) ? files : []
    /* No synchronous setState here for the empty case — that is a cascading
       render, and the screens using this rebuild `files` on every keystroke.
       The empty result is derived on the way out instead, which also keeps a
       stale map from being returned after the last attachment is removed. */
    if (!list.length) return undefined

    let alive = true
    Promise.all(
      list.map(async (file) => [
        attachmentKey(file),
        await access.url(file, targetId),
      ])
    ).then((pairs) => {
      if (!alive) return
      const next = Object.fromEntries(pairs)
      /* Identity is preserved when nothing changed. Without this, a screen
         whose source document is rebuilt on every keystroke — the Define sheet
         is — would set state on every one of them and re-render for no reason.
         The signed-URL cache already prevents the network cost; this prevents
         the render cost. */
      setUrls((prev) => (sameMap(prev, next) ? prev : next))
    })

    return () => {
      alive = false
    }
  }, [files, targetId, access])

  /* Derived, not stored: with no attachments the answer is the empty map
     whatever state still holds from a previous render. */
  return Array.isArray(files) && files.length ? urls : EMPTY
}
