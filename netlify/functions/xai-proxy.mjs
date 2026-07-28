/**
 * Same-origin xAI proxy for Creative Companion Helper.
 * Set XAI_API_KEY in Netlify env. Client calls /.netlify/functions/xai-proxy
 * with the OpenAI-compatible chat/completions body (no browser key required).
 *
 * Guards (cost abuse):
 * - POST only
 * - Optional shared secret: XAI_PROXY_SECRET (client may send Authorization: Bearer <secret>
 *   or X-CC-Proxy-Key). When unset, proxy still works but rate-limits harder.
 * - Origin allowlist: XAI_PROXY_ORIGINS (comma-separated); empty = same-site only via
 *   requiring Origin/Referer to include the site host when present.
 * - In-memory rate limit per IP (best-effort on Netlify — not a full WAF).
 * - Caps max_tokens and rejects empty/oversized messages.
 */

const XAI_URL = 'https://api.x.ai/v1/chat/completions'
const MAX_TOKENS_CAP = 512
const MAX_MESSAGES = 24
const MAX_BODY_CHARS = 48_000
const RATE_WINDOW_MS = 60_000
const RATE_MAX_DEFAULT = 20
const RATE_MAX_OPEN = 8 // when no proxy secret configured

/** @type {Map<string, { count: number, resetAt: number }>} */
const rateBuckets = new Map()

function clientIp(event) {
  const h = event.headers || {}
  const fwd = h['x-forwarded-for'] || h['X-Forwarded-For'] || ''
  return String(fwd).split(',')[0].trim() || h['client-ip'] || 'unknown'
}

function rateLimit(ip, max) {
  const now = Date.now()
  let b = rateBuckets.get(ip)
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + RATE_WINDOW_MS }
    rateBuckets.set(ip, b)
  }
  b.count += 1
  // opportunistic prune
  if (rateBuckets.size > 2000) {
    for (const [k, v] of rateBuckets) {
      if (now >= v.resetAt) rateBuckets.delete(k)
    }
  }
  return b.count <= max
}

function corsHeaders(origin) {
  const allow =
    origin && isOriginAllowed(origin) ? origin : process.env.URL || '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-CC-Proxy-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function isOriginAllowed(origin) {
  const raw = (process.env.XAI_PROXY_ORIGINS || '').trim()
  if (!raw) {
    // Default: allow same deploy host + localhost for local Netlify
    try {
      const site = process.env.URL || process.env.DEPLOY_PRIME_URL || ''
      if (site && origin.startsWith(site.replace(/\/$/, ''))) return true
    } catch {
      /* ignore */
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true
    // No allowlist configured and no site URL — reject browser cross-origin
    // with no shared secret (server-side tools can still POST without Origin).
    return !origin
  }
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return list.some((o) => origin === o || origin.startsWith(o.replace(/\/$/, '')))
}

function proxySecretOk(event) {
  const secret = (process.env.XAI_PROXY_SECRET || '').trim()
  if (!secret) return { required: false, ok: true }
  const h = event.headers || {}
  const auth = h.authorization || h.Authorization || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const headerKey = h['x-cc-proxy-key'] || h['X-CC-Proxy-Key'] || ''
  const ok = bearer === secret || headerKey === secret
  return { required: true, ok }
}

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin || ''
  const cors = corsHeaders(origin)

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'POST only' }),
    }
  }

  if (origin && !isOriginAllowed(origin)) {
    return {
      statusCode: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Origin not allowed' }),
    }
  }

  const secretCheck = proxySecretOk(event)
  if (secretCheck.required && !secretCheck.ok) {
    return {
      statusCode: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' }),
    }
  }

  const ip = clientIp(event)
  const max = secretCheck.required ? RATE_MAX_DEFAULT : RATE_MAX_OPEN
  if (!rateLimit(ip, max)) {
    return {
      statusCode: 429,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
      body: JSON.stringify({ error: 'Rate limit exceeded' }),
    }
  }

  const key = (process.env.XAI_API_KEY || process.env.VITE_XAI_API_KEY || '').trim()
  if (!key) {
    return {
      statusCode: 503,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'XAI_API_KEY not configured on server',
      }),
    }
  }

  if ((event.body || '').length > MAX_BODY_CHARS) {
    return {
      statusCode: 413,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Body too large' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(0, MAX_MESSAGES) : []
  if (!messages.length) {
    return {
      statusCode: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'messages required' }),
    }
  }

  const maxTokens = Math.min(
    Math.max(1, Number(body.max_tokens) || 320),
    MAX_TOKENS_CAP
  )

  try {
    const res = await fetch(XAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: body.model || 'grok-4.5',
        temperature: body.temperature ?? 0.55,
        max_tokens: maxTokens,
        messages,
      }),
    })
    const text = await res.text()
    return {
      statusCode: res.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: text,
    }
  } catch (e) {
    return {
      statusCode: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e?.message || 'Proxy failed' }),
    }
  }
}
