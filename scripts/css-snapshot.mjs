/**
 * Computed-style snapshot, for removing `!important` without guessing.
 *
 * WHY THIS EXISTS
 *
 * `shell.css` carries 463 `!important` declarations and CLAUDE.md has long
 * said to stop adding them. Actually removing any is the harder half: the
 * cascade they distort is invisible, and "it still looks fine" is not a
 * check anyone can perform across six viewports and a drawer state.
 *
 * So: snapshot every computed property that matters, make a change, snapshot
 * again, diff. A removal with zero diffs did not alter the rendered page.
 *
 * THE TRAP THIS TOOL EXISTS TO AVOID
 *
 * A zero-diff result is worthless if the element was never on screen. The
 * first real use of this harness "proved" that 19 `.journey-gap-strip-btn`
 * overrides were inert — and the selector had matched zero elements in all
 * six states. Green meant "not tested", not "unchanged". `--require` fails
 * the run when a selector under investigation never rendered, so that
 * result cannot be produced again.
 *
 * USAGE
 *
 *   node scripts/css-snapshot.mjs --out base.json --require .journey-bar-item
 *   # ...edit CSS...
 *   node scripts/css-snapshot.mjs --out after.json --require .journey-bar-item
 *   node scripts/css-snapshot.mjs --diff base.json after.json
 *
 * Needs the app running at http://127.0.0.1:4173 (`npm run build && npm run
 * preview -- --host 127.0.0.1 --port 4173`).
 *
 * MEASURED FINDING, so nobody repeats it: stripping `!important` from every
 * rule in the journey family (`journey-sidebar|bar-list|bar-item|step|label`,
 * 141 declarations) produces 336 computed-style diffs — the sidebar flips to
 * row, the drawer loses its width, every stage item resizes. Those overrides
 * are load-bearing. Reducing this file means small batches, each measured,
 * not a sweep.
 */
import { writeFileSync, readFileSync } from 'node:fs'

const SELECTORS = [
  '.header', '.header-content', '.header-todo-pill', '.header-tools-btn',
  '.journey-sidebar', '.journey-bar-list', '.journey-bar-item', '.journey-step',
  '.step-rail', '.step-rail-step', '.app-shell', '.main',
  '.journey-project-row', '.journey-gap-strip-btn', '.journey-label',
]
const PROPS = [
  'display','flexDirection','flexWrap','width','minWidth','maxWidth','height','minHeight',
  'paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginLeft',
  'gap','alignItems','justifyContent','position','top','left','right','bottom',
  'backgroundColor','color','fontSize','fontWeight','borderTopWidth','borderLeftWidth',
  'borderRadius','overflowX','overflowY','opacity','zIndex','whiteSpace','textAlign',
]
const STATES = [
  ['390', 390, false], ['390-open', 390, true], ['700', 700, false],
  ['800', 800, false], ['1280', 1280, false], ['1920', 1920, false],
]

const args = process.argv.slice(2)
const flag = (n) => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1] }

if (args[0] === '--diff') {
  const a = JSON.parse(readFileSync(args[1], 'utf8'))
  const b = JSON.parse(readFileSync(args[2], 'utf8'))
  const diffs = []
  for (const vp of Object.keys(a)) {
    for (const sel of Object.keys(a[vp])) {
      const A = a[vp][sel], B = b[vp]?.[sel] ?? []
      if (A.length !== B.length) { diffs.push(`${vp} ${sel}: count ${A.length} -> ${B.length}`); continue }
      A.forEach((ea, i) => {
        for (const k of Object.keys(ea)) {
          const va = JSON.stringify(ea[k]), vb = JSON.stringify(B[i]?.[k])
          if (va !== vb) diffs.push(`${vp} ${sel}[${i}].${k}: ${va} -> ${vb}`)
        }
      })
    }
  }
  console.log(diffs.length ? diffs.join('\n') : 'NO DIFFS')
  console.log(`\nTOTAL DIFFS: ${diffs.length}`)
  process.exit(diffs.length ? 1 : 0)
}

const { chromium } = await import('playwright')
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const page = await browser.newPage()
const { unlockAndOnboard } = await import('../e2e/helpers.js')
await page.goto('http://127.0.0.1:4173/')
await unlockAndOnboard(page, { name: 'CSS Snapshot' })

const snap = {}
for (const [label, w, open] of STATES) {
  await page.setViewportSize({ width: w, height: 900 })
  await page.waitForTimeout(350)
  if (open) {
    const t = page.locator('.header-menu-toggle').first()
    if (await t.count()) { await t.click(); await page.waitForTimeout(500) }
  }
  snap[label] = await page.evaluate(({ SELECTORS, PROPS }) => {
    const out = {}
    for (const sel of SELECTORS) {
      out[sel] = [...document.querySelectorAll(sel)].slice(0, 4).map((el) => {
        const cs = getComputedStyle(el)
        const o = {}
        for (const p of PROPS) o[p] = cs[p]
        const r = el.getBoundingClientRect()
        o._box = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]
        return o
      })
    }
    return out
  }, { SELECTORS, PROPS })
  if (open) await page.reload({ waitUntil: 'networkidle' })
}
await browser.close()

/* The safeguard. A selector that never rendered cannot testify to anything,
   and a diff of two empty arrays is a green light for a change nobody
   checked. Fail loudly rather than emit a snapshot that reads as evidence. */
const required = (flag('--require') || '').split(',').map((s) => s.trim()).filter(Boolean)
const silent = required.filter((sel) => STATES.every(([l]) => (snap[l]?.[sel] ?? []).length === 0))
if (silent.length) {
  console.error(
    `\nNOT MEASURED — these selectors matched no elements in any state:\n` +
    silent.map((s) => `  ${s}`).join('\n') +
    `\n\nA zero-diff result here would mean "never rendered", not "unchanged".\n` +
    `Drive the app to a state where they exist, or drop them from the batch.\n`
  )
  process.exit(2)
}

const out = flag('--out') || 'snapshot.json'
writeFileSync(out, JSON.stringify(snap, null, 1))
console.log(`wrote ${out}`)
