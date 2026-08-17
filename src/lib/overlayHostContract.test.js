import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The transient layer keeps working while a stage owns the viewport.
 *
 * WHY A SOURCE SCAN RATHER THAN A RENDER TEST. Every part of this failed
 * silently and none of it fails in jsdom, which has no layout, no stacking
 * contexts and no `visibility` inheritance to speak of. The defect that
 * prompted this shipped as: a `role="dialog"` measuring 1280x720, rendered,
 * focused, aria-labelled — and invisible, because it was inside the subtree an
 * open Workroom sets to `visibility: hidden`. Nothing threw. The unit suite was
 * green. Only a browser could see it, and only if someone thought to look.
 *
 * So these assert the four structural facts that make the layer work, each of
 * which is a real failure that has already happened once.
 */

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

const html = read('index.html')
const hostCss = read('src/styles/overlay-host.css')
const stageCss = read('src/styles/workroom.css')
const app = read('src/App.jsx')

const zVar = (css, name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(\\d+)`))
  return m ? Number(m[1]) : null
}

describe('the overlay host contract', () => {
  it('is a sibling of #root, never a descendant', () => {
    /* The whole mechanism is this one relationship. Nest it and the stage
       hides it again, with no error and no visible difference in the diff. */
    const root = html.indexOf('<div id="root">')
    const host = html.indexOf('<div id="cc-overlay-root">')
    expect(root).toBeGreaterThan(-1)
    expect(host).toBeGreaterThan(-1)
    expect(host).toBeGreaterThan(root)
    const between = html.slice(root, host)
    expect(between).toContain('</div>')
  })

  it('sits above the stage, and both are declared together', () => {
    const stage = zVar(hostCss, 'z-stage')
    const overlay = zVar(hostCss, 'z-overlay')
    expect(stage).toBeTypeOf('number')
    expect(overlay).toBeGreaterThan(stage)
    /* The stage must read the shared token rather than carrying its own
       number, or the two drift apart and the loser is invisible. */
    expect(stageCss).toMatch(/z-index:\s*var\(--z-stage/)
  })

  it('keeps both z-indexes clear of the 32-bit clamp', () => {
    /* MEASURED, not theoretical. The stage was at 2147483647 and the host one
       tick above it; Chromium clamped BOTH to 2147480000, so "above the stage"
       was not a position that existed and the host lost every contest while
       the stylesheet looked correct. */
    const CLAMP_ZONE = 2_000_000_000
    expect(zVar(hostCss, 'z-stage')).toBeLessThan(CLAMP_ZONE)
    expect(zVar(hostCss, 'z-overlay')).toBeLessThan(CLAMP_ZONE)
  })

  it('does not become the containing block for its fixed children', () => {
    /* Any of these on the host collapses every position:fixed child into the
       host's own box. The children are dialogs; the symptom would be a dialog
       rendered at 0x0 with no error. */
    const hostRule = hostCss.slice(
      hostCss.indexOf('#cc-overlay-root {'),
      hostCss.indexOf('}', hostCss.indexOf('#cc-overlay-root {'))
    )
    for (const prop of ['transform', 'filter', 'perspective', 'contain', 'will-change']) {
      expect(hostRule).not.toMatch(new RegExp(`\\b${prop}\\s*:`))
    }
  })

  it('lets the pack paginate when printing', () => {
    /* Printing puts `.export-overlay` back in normal flow so the book runs to
       many pages. A fixed host would clip it to one viewport — a failure that
       only appears in a PDF, i.e. after delivery. */
    expect(hostCss).toMatch(/body\.cc-printing-pack\s+#cc-overlay-root/)
    expect(hostCss).toMatch(/body\.cc-printing-page\s+#cc-overlay-root/)
  })

  it('carries the theme, so the deep palette still matches', () => {
    /* The dark palette is declared on `.app.deep`, not on `:root`. A portal
       that dropped the `app` and theme classes would render light tokens on a
       dark canvas — and `display: contents` is what keeps that wrapper from
       becoming a box while it does the job. */
    const layer = read('src/components/OverlayLayer.jsx')
    expect(layer).toMatch(/`app cc-overlay-layer \$\{theme\}`/)
    expect(hostCss).toMatch(/\.app\.cc-overlay-layer\s*\{[^}]*display:\s*contents/)
  })
})

describe('what has to be in the layer', () => {
  /* The regions of App.jsx that render into the host. */
  const regions = []
  {
    let i = app.indexOf('<OverlayLayer')
    while (i !== -1) {
      const end = app.indexOf('</OverlayLayer>', i)
      regions.push(app.slice(i, end === -1 ? app.length : end))
      i = app.indexOf('<OverlayLayer', end === -1 ? app.length : end)
    }
  }
  const inLayer = (needle) => regions.some((r) => r.includes(needle))

  /* Each of these can be raised while a stage owns the viewport, and each was
     unreachable when it was not in the layer. The undo chip and the export
     overlay were measured hidden; the others share the mechanism exactly. */
  const MUST_BE_IN_THE_LAYER = [
    ['the undo chip', 'className="undo-chip"'],
    ['the action toast', 'className="action-toast"'],
    ['the export / preview dialog', 'className="export-overlay no-print-hide"'],
    ['the breakdown wizard', '<TaskBreakdown'],
    ['the brief share panel', '<ProjectOverviewSharePanel'],
    ['the discovery notes panel', '<DiscoveryBriefPanel'],
  ]

  it.each(MUST_BE_IN_THE_LAYER)('%s renders in the overlay layer', (_name, needle) => {
    expect(app).toContain(needle)
    expect(inLayer(needle)).toBe(true)
  })

  it('the layer is not empty and every region is closed', () => {
    expect(regions.length).toBeGreaterThan(0)
    expect(app.split('<OverlayLayer').length).toBe(
      app.split('</OverlayLayer>').length
    )
  })

  it('leaves launchers behind, deliberately', () => {
    /* A control that opens something inert is worse than no control — the
       reasoning `lib/stageSignals.js` records. The To-do pill is a launcher
       and is separately owner-deferred; if it ever moves up here it must be a
       decision, not a side effect of adding a dialog next to it. */
    expect(inLayer('className={`todo-fab')).toBe(false)
    expect(inLayer("className=\"todo-fab")).toBe(false)
  })
})
