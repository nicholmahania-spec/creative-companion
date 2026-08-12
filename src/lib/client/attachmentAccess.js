/**
 * Reading a client attachment now that `client-uploads` is private.
 *
 * The owner decided (2026-08-12) that attachment confidentiality must survive
 * revocation, so the bucket lost its public flag in migration 20260812123000.
 * Objects are no longer served from a permanent URL; they are reached with a
 * short-lived signed URL, and signing runs as the caller, so the
 * `client-uploads owner read` policy decides who gets one.
 *
 * TWO THINGS THIS DELIBERATELY REUSES RATHER THAN REINVENTS:
 *
 *   `createSignedUrlCache` (lib/assets/signedUrls.js), built for the private
 *   `brand-assets` bucket and until now unused by any screen. Its docstring
 *   already worked out the two failure modes that matter here — a cold CDN if
 *   you sign per mount, and a silently blank `<img>` if you cache a URL until
 *   it actually expires — and it collapses concurrent callers for one path
 *   onto a single request, which is exactly the shape of a brief with six
 *   attachments rendering at once. Writing a second cache would mean getting
 *   both of those wrong again somewhere else.
 *
 *   `attachmentObjectName` (attachmentUrl.js) for validation, unchanged. The
 *   key handed to the signer is still only ever one this app has vouched for.
 *
 * THIS IS AN AUTHENTICATED PATH ONLY. There is no anonymous equivalent and
 * adding one is not a small change: it needs a service-role signer behind an
 * edge function, because an anon SELECT policy would hand out a directory of
 * every live share and portal id. /f/ and /c/ do not read this bucket.
 *
 * WHAT A SIGNED URL DOES AND DOES NOT PROMISE. A minted URL is a token the
 * storage service checks against its own signature and expiry — it does not
 * re-consult RLS, ownership or `revoked_at` per request. So revoking a client
 * link does NOT kill URLs already handed out; it cannot, and nothing here
 * claims it does. What revocation achieves for attachments is upstream of
 * that: no anonymous party can obtain a URL at all, so a leaked or forwarded
 * link yields nothing. The bounded residual is an owner-minted URL leaking,
 * and its window is SIGNED_TTL_SECONDS — one hour. See the matching note in
 * migration 20260812123000.
 */
import { supabase, isSupabaseConfigured } from '../supabase'
import { createSignedUrlCache, SIGNED_TTL_SECONDS } from '../assets/signedUrls'
import { CLIENT_UPLOAD_BUCKET, attachmentObjectName } from './attachmentUrl'

/**
 * @param {object|null} client a Supabase client, or null when cloud is off
 * @param {{ cache?: object }} [deps] injectable cache, for tests
 */
export function createClientAttachmentAccess(client, { cache } = {}) {
  const signer =
    cache ||
    createSignedUrlCache({
      sign: async (path) => {
        if (!client) return null
        const { data, error } = await client.storage
          .from(CLIENT_UPLOAD_BUCKET)
          .createSignedUrl(path, SIGNED_TTL_SECONDS)
        /* A signing failure is not distinguishable here from "you do not own
           this", and both mean the same thing to the caller: render nothing.
           The cache deliberately does not memoise a null, so an expired
           session that is then refreshed recovers without a reload. */
        return error ? null : data?.signedUrl || null
      },
    })

  return {
    /**
     * A usable URL for one attachment entry, or null.
     *
     * Null covers every refusal: an entry that fails validation, a bucket the
     * caller does not own, no cloud configured, a signing error. The caller
     * renders a name instead of an image in all of them, which is the honest
     * output for "there is a file here and you cannot see it".
     */
    async url(file, targetId) {
      const name = attachmentObjectName(file, targetId)
      if (!name) return null
      return signer.get(name)
    },

    /** After a re-upload to the same key, where the bytes changed under it. */
    forget: (path) => signer.forget(path),

    /** Sign-out, or a switch of account. */
    clear: () => signer.clear(),
  }
}

/** The app-wide instance. Tests build their own with an injected cache. */
export const clientAttachments = createClientAttachmentAccess(
  isSupabaseConfigured() ? supabase : null
)
