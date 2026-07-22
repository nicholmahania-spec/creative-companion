import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Load the signed-in user's workspace from Supabase.
 * @returns {{ ok: true, payload: object|null, updatedAt?: string } | { ok: false, error: string }}
 */
/** Reject after ms so a stalled network request can't hang the UI forever. */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    ),
  ])
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

    const body = {
      user_id: user.id,
      payload: payload || {},
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
    return { ok: true }
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
