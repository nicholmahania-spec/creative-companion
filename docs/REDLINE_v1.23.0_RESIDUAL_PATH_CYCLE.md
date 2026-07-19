# Redline v1.23.0 — residual path cycle (P0 + P1)

Follow-up to v1.22 UX mapping. Full residual audit → implement → micro audit.

## P0 fixed

1. Persist `review` view on refresh (`cc-active-view` allowlist)
2. Soft Signal demo tour: 7 dots, 7 views, “Open Deliver · done”
3. Onboard CTAs: Start on Define / Sketch later (no “Open Work”)
4. Locales: openWork / howDeskWorks / thinPack* → 7-step Research/Deliver language
5. Define top row: remove skip-to-Deliver ghost CTA

## P1 fixed

- Copy residue: Work/Board/System → Sketch/Research/Design across App, Settings, Insights, Buddy, buddy.js, BrandArtboard, export empty states
- Ideate: A/B/C direction cards (store `directions`, choose one)
- Sketch: draft option chips + “Queue all A/B/C drafts”
- PDF/MD: Ideate directions section on leave-behind
- Brand kits stay on Define (no force-jump to Design)
- Brief “fix” focuses `#project-brief`

## P2 left (product boundary)

- Multi-page brand book PDF
- Full logo lockup suite / Figma-class artboard

## Verify

Unit 45 · Playwright 8/8 · build:check · perf main under 420 KB
