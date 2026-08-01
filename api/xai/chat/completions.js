/**
 * Vercel serverless xAI proxy — POST /api/xai/chat/completions
 * Set XAI_API_KEY (+ XAI_PROXY_SECRET in production) in Vercel env.
 * Shared guards live in server/xaiProxyCore.mjs
 */

import {
  clientIpFromHeaders,
  handleXaiProxy,
} from '../../../server/xaiProxyCore.mjs'

/**
 * Read the request body as text.
 *
 * Three shapes have to be handled because Vercel does not guarantee any one
 * of them: a string (already raw), an object (the platform parsed it), or
 * NOTHING — the parser is not always applied, and then `req.body` is
 * undefined and the bytes are still sitting on the stream.
 *
 * That last case is what broke this in production. The handler treated a
 * missing body as an empty one, so every Helper request arrived with no
 * messages and was rejected as a malformed request — a 400 that looked like
 * the client had sent rubbish, when the body had simply never been read.
 */
async function readBody(req) {
  if (typeof req.body === 'string') return req.body
  if (req.body != null && typeof req.body === 'object') {
    try {
      return JSON.stringify(req.body)
    } catch {
      return ''
    }
  }
  // Not parsed by the platform — drain the stream ourselves.
  try {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    return Buffer.concat(chunks).toString('utf8')
  } catch {
    return ''
  }
}

export default async function handler(req, res) {
  const headers = req.headers || {}
  const body = await readBody(req)

  const result = await handleXaiProxy({
    method: req.method || 'GET',
    headers,
    body,
    ip: clientIpFromHeaders(headers),
  })

  for (const [key, value] of Object.entries(result.headers || {})) {
    res.setHeader(key, value)
  }
  res.status(result.statusCode)
  if (result.statusCode === 204 || result.body === '') {
    res.end()
    return
  }
  res.send(result.body)
}
