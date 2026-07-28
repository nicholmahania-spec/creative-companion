/**
 * Same-origin xAI proxy for Creative Companion Helper.
 * Set XAI_API_KEY in Netlify env. Client calls /.netlify/functions/xai-proxy
 * with the OpenAI-compatible chat/completions body (no browser API key).
 *
 * Guards (cost abuse):
 * - POST only
 * - Production requires XAI_PROXY_SECRET (Bearer or X-CC-Proxy-Key)
 * - Origin allowlist: XAI_PROXY_ORIGINS; no-Origin only allowed with valid secret
 * - Model allowlist (no client free-choice expensive models)
 * - In-memory rate limit per IP (best-effort on Netlify)
 * - Caps max_tokens and rejects empty/oversized messages
 */

const XAI_URL = 'https://api.x.ai/v1/chat/completions'
const MAX_TOKENS_CAP = 512
const MAX_MESSAGES = 24
const MAX_BODY_CHARS = 48_000
const RATE_WINDOW_MS = 60_000
const RATE_MAX_DEFAULT = 20
const RATE_MAX_OPEN = 8
/** Only these models may be requested — no client free-choice spend. */
const ALLOWED_MODELS = new Set([
  'grok-4.5',
  'grok-4',
  'grok-3',
  'grok-3-mini',
  'grok-2',
  'grok-2-latest',
])

/** @type {Map<string, { count: number, resetAt: number }>} */
const rateBuckets = new Map()

function isProductionDeploy() {
  const ctx = String(process.env.CONTEXT || '').toLowerCase()
  if (ctx === 'production') return true
  if (String(process.env.XAI_PROXY_REQUIRE_SECRET || '').trim() === 'true')
    return true
  // Netlify branch deploys set CONTEXT=deploy-preview / branch-deploy — open
  // only when secret is also unset is still risky; require secret whenever
  // an API key is present and REQUIRE is not explicitly "false".
  if (
    process.env.XAI_API_KEY &&
    String(process.env.XAI_PROXY_REQUIRE_SECRET || '').toLowerCase() !== 'false' &&
    (ctx === 'deploy-preview' || ctx === 'branch-deploy' || ctx === 'production')
  ) {
    return true
  }
  return false
}

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
  if (rateBuckets.size > 2000) {
    for (const [k, v] of rateBuckets) {
      if (now >= v.resetAt) rateBuckets.delete(k)
    }
  }
  return b.count <= max
}

function corsHeaders(origin) {
  const allow =
    origin && isOriginAllowed(origin)
      ? origin
      : process.env.URL || process.env.DEPLOY_PRIME_URL || ''
  return {
    'Access-Control-Allow-Origin': allow || 'null',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-CC-Proxy-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function isOriginAllowed(origin) {
  if (!origin) return false
  const raw = (process.env.XAI_PROXY_ORIGINS || '').trim()
  if (!raw) {
    try {
      const site = process.env.URL || process.env.DEPLOY_PRIME_URL || ''
      if (site && origin.startsWith(site.replace(/\/$/, ''))) return true
    } catch {
      /* ignore */
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true
    return false
  }
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return list.some((o) => origin === o || origin.startsWith(o.replace(/\/$/, '')))
}

function proxySecretOk(event) {
  const secret = (process.env.XAI_PROXY_SECRET || '').trim()
  const requireSecret = isProductionDeploy() || Boolean(secret)
  if (!secret) {
    // Local/open only when not production
    return { required: requireSecret, ok: !requireSecret }
  }
  const h = event.headers || {}
  const auth = h.authorization || h.Authorization || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const headerKey = h['x-cc-proxy-key'] || h['X-CC-Proxy-Key'] || ''
  const ok = bearer === secret || headerKey === secret
  return { required: true, ok }
}

function pickModel(requested) {
  const m = String(requested || 'grok-4.5').trim()
  if (ALLOWED_MODELS.has(m)) return m
  return 'grok-4.5'
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

  const secretCheck = proxySecretOk(event)
  if (secretCheck.required && !secretCheck.ok) {
    return {
      statusCode: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: secretCheck.required && !(process.env.XAI_PROXY_SECRET || '').trim()
          ? 'XAI_PROXY_SECRET required in production'
          : 'Unauthorized',
      }),
    }
  }

  // Browser requests must present an allowed Origin. No-Origin POSTs only
  // with a valid shared secret (server-side tooling), never open.
  if (!origin) {
    if (!secretCheck.required || !secretCheck.ok) {
      return {
        statusCode: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Origin required (or proxy secret)' }),
      }
    }
  } else if (!isOriginAllowed(origin)) {
    return {
      statusCode: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Origin not allowed' }),
    }
  }

  const ip = clientIp(event)
  const max = secretCheck.required && secretCheck.ok ? RATE_MAX_DEFAULT : RATE_MAX_OPEN
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

  // Never fall back to VITE_XAI_API_KEY (client-bundled)
  const key = (process.env.XAI_API_KEY || '').trim()
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

  const messages = Array.isArray(body.messages)
    ? body.messages.slice(0, MAX_MESSAGES)
    : []
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
  const model = pickModel(body.model)

  try {
    const res = await fetch(XAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
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
