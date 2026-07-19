# Creative Companion

A local creative work desk for ADHD brains: capture ideas, break projects into micro-steps, do one next step, collect visual refs, manage deadlines, and export a brand identity pack.

Not a chatbot. Data stays in the browser (`localStorage` via Zustand).

## Run locally

```bash
npm install
npm run dev
```

```bash
npm run build    # → dist/
npm run preview
```

## What’s in the app

| Area | Purpose |
|------|---------|
| **Work** | Capture → current step → complete → queue + done list |
| **Micro-step breakdown** | Guided ADHD wizard (5 / 8 / 12 steps) onto the desk |
| **Help tools** | Body double, spark, focus timer, “I’m stuck” |
| **Board** | Mood board: upload / URL / note pins with captions |
| **Projects** | Multiple lanes, brief, project deadline |
| **Deadlines** | Month calendar for project + step due dates |
| **Brand identity template** | Tagline, voice, do/don’t, palette builder, contrast checker, type, logo notes, export |

## Stack

- React 19 + Vite 7  
- Zustand (persist)  
- Plain CSS design system  

## Project layout

```
src/
  main.jsx
  App.jsx              # UI shell + views
  index.css            # styles
  store/useAppStore.js # persisted state
  lib/color.js         # palette / WCAG contrast
  lib/microsteps.js    # project breakdown templates
  lib/dates.js         # deadlines + calendar helpers
```

## Deploy (Vercel or Netlify)

Configs are already in the repo (`vercel.json`, `netlify.toml`). SPA rewrites send all routes to `index.html`.

### Vercel (recommended)

1. Sign in at [vercel.com](https://vercel.com) with **GitHub**.
2. **Add New… → Project** → import **`nicholmahania-spec/creative-companion`**.
3. If the repo is **private**, grant Vercel access to private repos when prompted.
4. Framework: **Vite** (auto-detected). Build: `npm run build` · Output: `dist`.
5. Deploy. Every push to `main` redeploys.

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
