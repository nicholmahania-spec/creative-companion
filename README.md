# Creative Companion

A creative work desk for ADHD brains: capture ideas, break projects into micro-steps, do one next step, collect visual refs, manage deadlines, and export a brand identity pack.

Not a chatbot. Works **local-only** by default, or with **Supabase** for real accounts + multi-device sync.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm run build    # → dist/
npm run preview
npm test         # smoke tests (export, process, blank defaults, Helper fallback)
```

### Optional: Supabase backend

1. Create a project at [supabase.com](https://supabase.com)  
2. Run `supabase/schema.sql` in the SQL Editor  
3. Copy `.env.example` → `.env.local` and set URL + anon key  
4. Full steps: **[docs/SUPABASE.md](docs/SUPABASE.md)**

Without env vars, the app uses a **local browser password gate** and saves only in `localStorage`.

### Optional: live Helper (SpaceXAI / xAI)

1. Create a key at [console.x.ai](https://console.x.ai)  
2. In `.env.local`: `VITE_XAI_API_KEY=...` (model: `grok-4.5`)  
3. Restart `npm run dev`

Without a key, Helper uses **built-in scripted coaching** (Recommend / Critique / process phases still work).  
**Note:** Vite exposes `VITE_*` keys in the browser bundle — fine for local demos; use a server proxy for production secrets.

## What’s in the app

**Path (5):** Strategy → Research → Identity → Touchpoints → Assets  
(Brief first, then research; Wheeler process language; view ids unchanged)  

| Area | Purpose |
|------|---------|
| **Project** | Brief / detective form (form-only) |
| **Work** | One current step → complete / capture |
| **Board** | Mood pins; star up to 6 for the pack |
| **System** | Live brand artboard + accordion editors |
| **Pack** | Preview + brand book PDF download |
| **Tools** | Ideate, Review, Timer, Calendar, Clients, Settings |
| **Helper** | Coach · Critique · Break (scripted or live via proxy) |

Product requirements: **[docs/PRD.md](docs/PRD.md)**

## Stack

- React 19 + Vite 8  
- Zustand (persist)  
- Plain CSS (`src/styles/shell.css` + lazy view CSS)  

## Agent / design rules

- **`AGENTS.md`** — always audit **dark mode** (`.app.deep`) on every color change  
- **`DESIGN_GRAMMAR.md`** — full UX/color grammar (see **G4.4**)  
- **Version bumps are manual** — `npm run bump` / `bump:minor` / `bump:major` then stage + commit (hooks are no-ops; see `CLAUDE.md`)  

## Project layout

```
src/
  main.jsx
  App.jsx                 # shell state + composition
  components/layout/      # AppHeader, AppSidebar, AppMain, AppFooter
  styles/shell.css        # always-on chrome
  styles/lazy-*.css       # loaded with route views
  store/useAppStore.js
  lib/journey.js          # five-stop path
```

## Deploy (GitHub Pages)

CI workflow: `.github/workflows/deploy-pages.yml` builds on every push to `main` and publishes to Pages.

**Live URL (after first successful run):**  
https://nicholmahania-spec.github.io/creative-companion/

> Private repos: GitHub Pages may require a **public** repo or a paid plan. If the workflow fails on “Pages is disabled,” make the repo public or use Vercel/Netlify instead.

## Deploy (Vercel or Netlify)

Configs are already in the repo (`vercel.json`, `netlify.toml`). SPA rewrites send all routes to `index.html`.

### Vercel (recommended)

1. Sign in at [vercel.com](https://vercel.com) with **GitHub**.
2. **Add New… → Project** → import **`nicholmahania-spec/creative-companion`**.
3. If the repo is **private**, grant Vercel access to private repos when prompted.
4. Framework: **Vite** (auto-detected). Build: `npm run build` · Output: `dist`.
5. **Helper AI (optional):** set `XAI_API_KEY` + `XAI_PROXY_SECRET` (server) and the same value as `VITE_XAI_PROXY_SECRET` (build). Route: `/api/xai/chat/completions` — see **[docs/DEPLOY_AI.md](docs/DEPLOY_AI.md)**.
6. Deploy. Every push to `main` redeploys.

CLI (after `npx vercel login`):

```bash
npx vercel link
npx vercel --prod
```

### Netlify

1. Sign in at [netlify.com](https://netlify.com) with **GitHub**.
2. **Add new site → Import an existing project** → pick **`creative-companion`**.
3. Build command: `npm run build` · Publish directory: `dist` (from `netlify.toml`).
4. Deploy. Pushes to `main` redeploy.

CLI (after `npx netlify login`):

```bash
npx netlify init
npx netlify deploy --prod
```

## License

Private prototype — update this file if you open-source it.

# Trigger rebuild for GitHub Pages
