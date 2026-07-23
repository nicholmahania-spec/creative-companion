/**
 * Feedback → checklist translation (scaffold, not wired to a provider).
 *
 * Deliberately NOT a direct client-side call to an LLM provider: this
 * is a static SPA (GitHub Pages), so any API key placed in a Vite
 * `VITE_*` env var ships in the built JS bundle and is readable by
 * anyone — that's fine for a public anon key (Supabase's model, which
 * relies on server-side RLS) but not for a provider key that bills
 * per-request. This module expects a small server-side proxy endpoint
 * that holds the real key and forwards requests, matching the pattern
 * already used for the AI helper's local dev proxy (see the /api/xai
 * rewrite in vite.config.js) rather than inventing a new pattern.
 *
 * To wire this up for real:
 *  1. Stand up a proxy endpoint (Vercel/Cloudflare Function, a
 *     Supabase Edge Function, etc.) that holds the provider key
 *     server-side and forwards { text } -> { tasks, ambiguous }.
 *  2. Set VITE_FEEDBACK_AI_ENDPOINT to that URL.
 *  3. Nothing else changes — ReviewFocusView already calls
 *     translateFeedback() and handles all three states (not
 *     configured / loading / result).
 */

const ENDPOINT = (import.meta.env.VITE_FEEDBACK_AI_ENDPOINT || '').trim()

export function isFeedbackAiConfigured() {
  return Boolean(ENDPOINT)
}

/**
 * @param {string} text - one raw feedback line/comment
 * @returns {Promise<{ ok: true, tasks: string[], ambiguous: boolean } | { ok: false, error: string }>}
 */
export async function translateFeedback(text) {
  if (!isFeedbackAiConfigured()) {
    return { ok: false, error: 'not-configured' }
  }
  const trimmed = String(text || '').trim()
  if (!trimmed) return { ok: false, error: 'empty' }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed }),
    })
    if (!res.ok) return { ok: false, error: `http-${res.status}` }
    const data = await res.json()
    const tasks = Array.isArray(data?.tasks)
      ? data.tasks.map((t) => String(t)).filter(Boolean).slice(0, 5)
      : []
    return { ok: true, tasks, ambiguous: !!data?.ambiguous }
  } catch {
    return { ok: false, error: 'network' }
  }
}
