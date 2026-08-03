/**
 * File attachments a client adds while filling the brief on a public route
 * (/f/:shareId, /c/:portalId). They have no account, so this cannot reuse
 * cloudSync's workspace-images path, which keys uploads to auth.uid().
 *
 * Server side: the `client-uploads` bucket is public-read (same model as
 * workspace-images — one rule for images across the app) with an anon
 * INSERT policy gated by is_client_upload_target(), a SECURITY DEFINER
 * function that only allows writes into a folder named after a share or
 * portal id that actually exists. See the client_uploads_bucket migration.
 *
 * Answers keep their existing shape (a string). Files live in a sibling
 * `${fieldId}Files` array of { name, url } so a field already answered in
 * text on a live project is never silently retyped as an array — see the
 * NOTE in detectiveBrief.js on why field shapes don't change after ship.
 */
import { supabase, isSupabaseConfigured } from '../supabase'

const BUCKET = 'client-uploads'
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

/**
 * Upload one file into a target's folder.
 * @param {string} targetId - the share or portal id (also the RLS folder)
 * @param {File} file
 * @returns {Promise<{ ok: true, name: string, url: string } | { ok: false, error: string }>}
 */
export async function uploadClientFile(targetId, file) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Cloud sync isn’t configured' }
  }
  if (!file || !file.type?.startsWith('image/')) {
    return { ok: false, error: 'Only images can be attached' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'Over 8MB — try a smaller image' }
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 8)
  const key = `${targetId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, { contentType: file.type, upsert: false })
  if (error) {
    // Log the driver's message, show the human one — this string is
    // rendered to clients on the public routes.
    console.warn('Client upload failed', error)
    return { ok: false, error: 'Didn’t send. Try again' }
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key)
  if (!data?.publicUrl) return { ok: false, error: 'Didn’t send. Try again' }
  return { ok: true, name: file.name || 'image', url: data.publicUrl }
}
