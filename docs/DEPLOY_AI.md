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

## Netlify

1. Site settings → Environment → `XAI_API_KEY` (**not** `VITE_*`)
2. Deploy — `netlify/functions/xai-proxy.mjs` handles  
   `/api/xai/chat/completions` (see `netlify.toml` redirect)
3. Client uses `/api/xai` when no browser key is set

## GitHub Pages

Static only — **cannot** run the Netlify function. Options:

- Host the app on Netlify/Vercel with the proxy, or  
- Set a temporary `VITE_XAI_API_KEY` for demos (key is public in the bundle)

## Runtime injection

Host page can set:

```js
window.__CC_XAI_BASE__ = 'https://your-proxy.example/v1'
window.__CC_XAI_API_KEY__ = '…' // only if proxy expects client auth
```
