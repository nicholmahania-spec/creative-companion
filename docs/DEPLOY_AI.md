# Helper AI proxy (no browser API key)

## Local dev

```bash
export XAI_API_KEY=your_key_from_console.x.ai
npm run dev
```

Vite proxies `/api/xai/*` → `https://api.x.ai/v1/*` and injects `Authorization`.

Optional `.env.local`:

```
VITE_XAI_USE_PROXY=true
# or explicit:
# VITE_XAI_BASE_URL=/api/xai
```

## Vercel (production homepage)

Shared core: `server/xaiProxyCore.mjs`  
Route: `api/xai/chat/completions.js` → `POST /api/xai/chat/completions`

### Environment variables

| Variable | Scope | Required | Notes |
|----------|--------|----------|--------|
| `XAI_API_KEY` | Server (Production / Preview) | Yes for live Helper | From [console.x.ai](https://console.x.ai) — **never** `VITE_*` |
| `XAI_PROXY_SECRET` | Server | Yes in production | Long random string (`openssl rand -hex 32`) |
| `VITE_XAI_PROXY_SECRET` | Build | Same value as server secret | Client sends `X-CC-Proxy-Key` (visible in JS; cost gate + Origin) |
| `VITE_XAI_USE_PROXY` | Build | Optional | Default on for prod `base=/`; set `false` to force scripted |
| `XAI_PROXY_ORIGINS` | Server | Optional | Comma list; defaults include `VERCEL_URL` / production URL |
| `XAI_PROXY_REQUIRE_SECRET` | Server | Optional | `true` forces secret; `false` only for local experiments |

After setting **build** vars (`VITE_*`), trigger a **redeploy**.

### Smoke

```bash
# Expect 401/403 without secret
curl -i -X POST 'https://creative-companion-ten.vercel.app/api/xai/chat/completions' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://creative-companion-ten.vercel.app' \
  -d '{"messages":[{"role":"user","content":"hi"}]}'

# With secret (after env is set)
curl -i -X POST 'https://creative-companion-ten.vercel.app/api/xai/chat/completions' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://creative-companion-ten.vercel.app' \
  -H 'X-CC-Proxy-Key: YOUR_PROXY_SECRET' \
  -d '{"model":"grok-4.5","messages":[{"role":"user","content":"ping"}],"max_tokens":16}'
```

## Netlify

1. Environment → `XAI_API_KEY`, `XAI_PROXY_SECRET`, `VITE_XAI_PROXY_SECRET` (same secret)  
2. Deploy — `netlify/functions/xai-proxy.mjs` via redirect  
   `/api/xai/chat/completions` (see `netlify.toml`)  
3. Production builds with `base=/` use the proxy automatically  

## GitHub Pages

Static only — **no** serverless proxy. Options:

- Use Vercel/Netlify as the live host (recommended), or  
- Temporary `VITE_XAI_API_KEY` for demos (key is public in the bundle)

## Runtime injection

Host page can set:

```js
window.__CC_XAI_BASE__ = 'https://your-proxy.example/v1'
window.__CC_XAI_API_KEY__ = '…' // only if proxy expects client auth
```
