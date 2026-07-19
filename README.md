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

## License

Private prototype — update this file if you open-source it.
