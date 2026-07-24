import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Load the signed-in user's workspace from Supabase.
 * @returns {{ ok: true, payload: object|null, updatedAt?: string } | { ok: false, error: string }}
 */
/** Reject after ms so a stalled network request can't hang the UI forever. */
function withTimeout(promise, ms, label) {
  let timerId
  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timerId))
}

const IMAGE_BUCKET = 'workspace-images'

/** Parse a `data:` URL into raw bytes + a storage-friendly extension. */
function dataUrlToBlobInfo(dataUrl) {
  const match = /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,(.*)$/.exec(
    dataUrl || ''
  )
  if (!match) return null
  const mime = match[1] || 'image/png'
  const base64 = match[2]
  const ext = (mime.split('/')[1] || 'png').split('+')[0].replace('jpeg', 'jpg')
  try {
    const byteChars = atob(base64)
    const bytes = new Uint8Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
    return { blob: new Blob([bytes], { type: mime }), ext, mime }
  } catch {
    return null
  }
}

/**
 * Upload one embedded `data:` image to Storage and return its public URL.
 * Best-effort: returns null on any failure so the caller can fall back to
 * keeping the original data URL for that one item rather than failing sync.
 */
async function uploadWorkspaceImage(userId, dataUrl, path) {
  const info = dataUrlToBlobInfo(dataUrl)
  if (!info) return null
  try {
    const key = `${userId}/${path}.${info.ext}`
    const { error } = await withTimeout(
      supabase.storage
        .from(IMAGE_BUCKET)
        .upload(key, info.blob, { contentType: info.mime, upsert: true }),
      15000,
      'Image upload'
    )
    if (error) return null
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(key)
    return data?.publicUrl || null
  } catch {
    return null
  }
}

/**
 * Replace any embedded `data:` images in a workspace payload with Storage
 * URLs, uploading as needed. Returns a new payload (input is untouched) plus
 * the list of replacements actually made, so the caller can mirror them into
 * local state and avoid re-uploading the same bytes on every future sync.
 */
async function offloadPayloadImages(userId, payload) {
  const outgoing = { ...(payload || {}) }
  const replacements = []

  if (Array.isArray(outgoing.moodItems)) {
    outgoing.moodItems = await Promise.all(
      outgoing.moodItems.map(async (item) => {
        if (
          item?.type === 'image' &&
          typeof item.visual === 'string' &&
          item.visual.startsWith('data:')
        ) {
          const url = await uploadWorkspaceImage(userId, item.visual, `mood/${item.id}`)
          if (url) {
            replacements.push({ kind: 'mood', id: item.id, url })
            return { ...item, visual: url }
          }
        }
        return item
      })
    )
  }

  if (Array.isArray(outgoing.projects)) {
    outgoing.projects = await Promise.all(
      outgoing.projects.map(async (project) => {
        if (
          typeof project?.logoImage === 'string' &&
          project.logoImage.startsWith('data:')
        ) {
          const url = await uploadWorkspaceImage(userId, project.logoImage, `logo/${project.id}`)
          if (url) {
            replacements.push({ kind: 'logo', projectId: project.id, url })
            return { ...project, logoImage: url }
          }
        }
        return project
      })
    )
  }

  return { outgoing, replacements }
}

export async function pullWorkspace() {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' }
  }
  try {
    const {
      data: { user },
      error: userErr,
    } = await withTimeout(supabase.auth.getUser(), 6000, 'Sign-in check')
    if (userErr || !user) {
      return { ok: false, error: userErr?.message || 'Not signed in' }
    }

    // Workspace payloads can run several MB (mood-board images embedded as
    // data URLs) — a mobile connection genuinely needs more than a few
    // seconds to pull that much data, so this timeout is intentionally much
    // longer than the tiny getUser() check above.
    const { data, error } = await withTimeout(
      supabase
        .from('user_workspaces')
        .select('payload, updated_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      25000,
      'Cloud desk load'
    )

    if (error) {
      return { ok: false, error: error.message }
    }
    if (!data) {
      return { ok: true, payload: null }
    }
    return {
      ok: true,
      payload: data.payload || null,
      updatedAt: data.updated_at,
    }
  } catch (e) {
    return { ok: false, error: e?.message || 'Could not reach the cloud' }
  }
}

/**
 * Upsert full workspace payload for the signed-in user.
 */
export async function pushWorkspace(payload) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' }
  }
  try {
    const {
      data: { user },
      error: userErr,
    } = await withTimeout(supabase.auth.getUser(), 6000, 'Sign-in check')
    if (userErr || !user) {
      return { ok: false, error: userErr?.message || 'Not signed in' }
    }

    // Move embedded base64 images to Storage first so the JSON row we write
    // stays small — this is what makes sync fast and reliable on mobile
    // instead of a multi-MB payload timing out. Local state (and this
    // function's caller) still has the original data URLs; only the outgoing
    // copy and the Storage objects change here.
    const { outgoing, replacements } = await offloadPayloadImages(
      user.id,
      payload
    )

    const body = {
      user_id: user.id,
      payload: outgoing,
      updated_at: new Date().toISOString(),
    }

    // Same reasoning as pullWorkspace — uploading a multi-MB payload over
    // mobile data needs real headroom, not a few seconds.
    const { error } = await withTimeout(
      supabase.from('user_workspaces').upsert(body, {
        onConflict: 'user_id',
      }),
      25000,
      'Cloud desk save'
    )

    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true, replacements }
  } catch (e) {
    return { ok: false, error: e?.message || 'Could not reach the cloud' }
  }
}

export async function signUpWithEmail(email, password) {
  if (!supabase) return { ok: false, error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.signUp({
    email: String(email || '').trim(),
    password: String(password || ''),
  })
  if (error) return { ok: false, error: error.message }
  return {
    ok: true,
    session: data.session,
    user: data.user,
    needsEmailConfirm: !data.session && !!data.user,
  }
}

export async function signInWithEmail(email, password) {
  if (!supabase) return { ok: false, error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || '').trim(),
    password: String(password || ''),
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, session: data.session, user: data.user }
}

export async function signOutCloud() {
  if (!supabase) return { ok: true }
  const { error } = await supabase.auth.signOut()
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Send password reset email (Supabase Auth). */
export async function resetPasswordForEmail(email) {
  if (!supabase) return { ok: false, error: 'Supabase not configured' }
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined
  const { error } = await supabase.auth.resetPasswordForEmail(
    String(email || '').trim(),
    redirectTo ? { redirectTo } : undefined
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
