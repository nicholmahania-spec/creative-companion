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

## Deploy — where this app actually lives

The single source of truth is **`src/lib/deploy/deployTargets.js`**, which the
app and the serverless proxy both read. Change a deploy there first; the rest
of the repo follows.

| Copy | URL | Role |
|---|---|---|
| **Vercel** | https://creative-companion-ten.vercel.app | **Production.** Serves `/api/xai` itself. |
| GitHub Pages | https://nicholmahania-spec.github.io/creative-companion/ | Mirror of `main`. Static; borrows the primary's `/api/xai` for the Helper. |
| Netlify | ~~creativecompanion.netlify.app~~ | **Retired** — last deploy errored 2026-07-19. Do not deploy here. |

Every non-production copy says so in the header (`src/components/DeployNotice.jsx`).
Production says nothing, which is how you know it is production.

### Deploying

**Merging to `main` is the deploy.** It triggers Vercel and the Pages workflow
(`.github/workflows/deploy-pages.yml`) together.

> **Never run `vercel deploy --prod` (or `vercel --prod`) from the CLI here.**
> It uploads the local working directory and overrides the Git build. On
> 2026-08-01 that silently shipped a pre-merge bundle to production three
> times, making an already-fixed bug look unfixed.

### Helper AI keys

Server-side only: `XAI_API_KEY` in Vercel, plus `SUPABASE_URL` /
`SUPABASE_ANON_KEY` (no `VITE_` prefix) so the proxy can verify the caller's
session. Never a `VITE_*` secret — Vite inlines those into the shipped bundle.
See **[docs/DEPLOY_AI.md](docs/DEPLOY_AI.md)**.

## License

Private prototype — update this file if you open-source it.

# Trigger rebuild for GitHub Pages

<!-- Testing Vercel CI/CD Tue Aug  4 12:19:00 CDT 2026 -->
