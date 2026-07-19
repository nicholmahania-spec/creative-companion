import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Load the signed-in user's workspace from Supabase.
 * @returns {{ ok: true, payload: object|null, updatedAt?: string } | { ok: false, error: string }}
 */
export async function pullWorkspace() {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' }
  }
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return { ok: false, error: userErr?.message || 'Not signed in' }
  }

  const { data, error } = await supabase
    .from('user_workspaces')
    .select('payload, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

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
}

/**
 * Upsert full workspace payload for the signed-in user.
 */
export async function pushWorkspace(payload) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase not configured' }
  }
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return { ok: false, error: userErr?.message || 'Not signed in' }
  }

  const body = {
    user_id: user.id,
    payload: payload || {},
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('user_workspaces').upsert(body, {
    onConflict: 'user_id',
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
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
