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
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Server (no `VITE_`) | Preferred gate | Proxy verifies the caller's real session against `/auth/v1/user` |
| `XAI_PROXY_SECRET` | Server | Fallback only | Used **only** when the two above are unset |
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

# Cross-origin preflight from the Pages mirror — expect 204 and the mirror echoed back
curl -i -X OPTIONS 'https://creative-companion-ten.vercel.app/api/xai/chat/completions' \
  -H 'Origin: https://nicholmahania-spec.github.io'

# With a real session token (copy from the signed-in browser's Supabase session)
curl -i -X POST 'https://creative-companion-ten.vercel.app/api/xai/chat/completions' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://creative-companion-ten.vercel.app' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN' \
  -d '{"model":"grok-4.5","messages":[{"role":"user","content":"ping"}],"max_tokens":16}'
```

Note the first call returning 401 proves nothing about the API key: auth is
checked **before** the key, so a missing `XAI_API_KEY` and a missing session
look identical from outside. Only a signed-in request distinguishes them.

## Netlify — retired

`creativecompanion.netlify.app` last deployed successfully on 2026-07-19 and
now 404s. `netlify.toml` and `netlify/functions/xai-proxy.mjs` are kept because
they share `server/xaiProxyCore.mjs` and cost nothing, **not** because this is
a live target. If it is ever revived, it needs `XAI_API_KEY` plus server-side
`SUPABASE_URL` / `SUPABASE_ANON_KEY` — never a `VITE_*` secret — and its entry
in `src/lib/deploy/deployTargets.js` moved off `role: 'retired'`.

## GitHub Pages — the mirror has a live Helper

**Corrects an earlier note in this file that said the Helper could not work here.**

GitHub Pages is static, so it cannot serve a function *of its own*. That was
read as "no live Helper on Pages", and it cost most of an evening on
2026-08-01 chasing a bug that did not exist. It is a weaker fact than it looks:
the Helper does not need a function on **this** origin, it needs one **somewhere**
holding `XAI_API_KEY`.

So the mirror calls the primary's proxy cross-origin:

```
https://nicholmahania-spec.github.io   →   https://creative-companion-ten.vercel.app/api/xai
```

No build flag is involved. `src/lib/deploy/deployTargets.js` records that the
mirror borrows the primary, and `currentHelperProxyBase()` resolves it at
runtime from `location.hostname`.

Why this is not a hole:

- The proxy authenticates the **caller's Supabase session**, not the page that
  loaded the script. A request from the mirror is gated exactly as one from
  production. GitHub Pages [cannot set response headers at
  all](https://github.com/orgs/community/discussions/54257), so nothing about
  this could have depended on the mirror's own security headers anyway.
- The mirror's origin is in the proxy allowlist because it is listed in the
  deploy registry — first-party by definition. Everything else is still 403.
  The match is exact; `github.io.attacker.test` does not qualify.
- No key reaches the browser on any copy.

If you ever need to point the mirror somewhere else, set `VITE_XAI_BASE_URL`
at build time — it still wins over the registry.

## Runtime injection

Host page can set:

```js
window.__CC_XAI_BASE__ = 'https://your-proxy.example/v1'
window.__CC_XAI_API_KEY__ = '…' // only if proxy expects client auth
```
