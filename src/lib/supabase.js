import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

/** True when Vite env has Supabase URL + anon key */
export function isSupabaseConfigured() {
  return Boolean(url && anonKey && !url.includes('YOUR_PROJECT'))
}

export const supabase = isSupabaseConfigured()
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : null

export function getSupabaseUrl() {
  return url || ''
}
