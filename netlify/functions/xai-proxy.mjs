/**
 * Same-origin xAI proxy for Creative Companion Helper (Netlify).
 * Redirect: /api/xai/chat/completions → this function (netlify.toml).
 * Shared logic: server/xaiProxyCore.mjs
 */

import {
  clientIpFromHeaders,
  handleXaiProxy,
} from '../../server/xaiProxyCore.mjs'

export async function handler(event) {
  return handleXaiProxy({
    method: event.httpMethod || 'GET',
    headers: event.headers || {},
    body: event.body || '',
    ip: clientIpFromHeaders(event.headers || {}),
  })
}
