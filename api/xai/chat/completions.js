/**
 * Vercel serverless xAI proxy — POST /api/xai/chat/completions
 * Set XAI_API_KEY (+ XAI_PROXY_SECRET in production) in Vercel env.
 * Shared guards live in server/xaiProxyCore.mjs
 */

import {
  clientIpFromHeaders,
  handleXaiProxy,
} from '../../../server/xaiProxyCore.mjs'

export default async function handler(req, res) {
  const headers = req.headers || {}
  let body = ''
  if (typeof req.body === 'string') {
    body = req.body
  } else if (req.body != null && typeof req.body === 'object') {
    try {
      body = JSON.stringify(req.body)
    } catch {
      body = ''
    }
  }

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
