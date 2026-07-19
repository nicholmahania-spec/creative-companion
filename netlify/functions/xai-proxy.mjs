/**
 * Same-origin xAI proxy for Creative Companion Helper.
 * Set XAI_API_KEY in Netlify env. Client calls /.netlify/functions/xai-proxy
 * with the OpenAI-compatible chat/completions body (no browser key required).
 */

const XAI_URL = 'https://api.x.ai/v1/chat/completions'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export async function handler(event) {
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
        max_tokens: body.max_tokens ?? 320,
        messages: body.messages || [],
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
