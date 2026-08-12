import { unlockAndOnboard } from './helpers.js'
import { BRAND_SURFACE_OPTIONS } from '../src/lib/brief/detectiveBrief.js'

/**
 * ONE realistic project, loaded once, replayed into every page.
 *
 * The regression suite this serves is about navigation, workroom lifecycle
 * and state preservation — none of which can be observed on the empty project
 * `unlockAndOnboard` leaves behind. An empty Directions has no routes to keep
 * open, an empty Research has no pins to preserve, and "did state survive the
 * trip" is unanswerable when there was no state.
 *
 * NOTHING NEW IS INVENTED HERE. The seed is the Soft Signal demo the product
 * already ships (`public/demos/soft-signal-workspace.json`), loaded the way a
 * designer loads it — Settings → Soft Signal → confirm — so it goes through
 * `importAllData` and gets the same normalisation a real import gets. Writing
 * the workspace blob straight into localStorage would skip that and quietly
 * test a shape the app never produces.
 *
 * It is loaded ONCE PER WORKER and then replayed, because that click-through
 * costs ~8s and the suite needs a clean project on a dozen pages. The replay
 * is a verbatim copy of both storages — no hand-built subset, so a key the
 * app starts writing tomorrow is carried without an edit here.
 *
 * Soft Signal declares no `projectType`, so it resolves to the default
 * `identity` and every stop is on. That is what makes it the right fixture
 * for a suite about the primary path: a `logo` project would legitimately be
 * missing Directions, Touchpoints and Brand book, and a suite that seeded one
 * would report those absences as dead ends.
 */

/** Storage snapshot, captured once per worker process. */
let cached = null

/** Both storages, verbatim. */
async function readStorages(page) {
  return page.evaluate(() => {
    const dump = (store) => {
      const out = {}
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i)
        if (key != null) out[key] = store.getItem(key)
      }
      return out
    }
    return { local: dump(localStorage), session: dump(sessionStorage) }
  })
}

/**
 * Walk the demo import once and keep the resulting storages.
 * Returns null when the build is pointed at cloud auth, where the local desk
 * gate — and therefore this whole fixture — does not apply.
 */
async function captureSeed(page) {
  /* CAPTURE AT DESKTOP, WHATEVER THE CALLER IS MEASURING.
   *
   * The demo is loaded by clicking Settings, and below 768px that button is
   * behind the collapsed menu — so a capture that inherited a 390px viewport
   * waited five minutes on a control no click could reach. Not hypothetical:
   * Playwright restarts its worker after a failure, which drops the cache
   * below and re-runs this from whichever test comes next, at whatever width
   * that test had set. The capture is a fixture, not a measurement, so it
   * pins its own width and hands the caller's back untouched. */
  const callerViewport = page.viewportSize()
  await page.setViewportSize({ width: 1440, height: 900 })

  const gate = await unlockAndOnboard(page, { name: 'Seed Bootstrap' })
  if (gate.skipped) {
    if (callerViewport) await page.setViewportSize(callerViewport)
    return { skipped: true, reason: gate.reason }
  }

  await page.getByRole('button', { name: /^Settings$/ }).first().click()
  await page
    .getByRole('heading', { name: /Settings/i })
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })

  await page.getByRole('button', { name: /^Soft Signal$/i }).click()
  const banner = page.locator('.desk-confirm-banner')
  await banner.waitFor({ state: 'visible', timeout: 10_000 })
  await banner.getByRole('button', { name: /Continue|Continuar/i }).click()

  /* Import lands on Brief. Waiting for the view class rather than a timeout
     keeps this honest: if the import failed, this throws here instead of
     handing every downstream spec an empty workspace to misread. */
  await page
    .locator('.app.view-project')
    .waitFor({ state: 'attached', timeout: 60_000 })

  /* The store coalesces writes into one trailing localStorage write
     (useAppStore's setItem). Snapshotting before it fires captures the
     PREVIOUS workspace, which is the empty one — so wait for the demo's own
     project name to appear in the persisted blob rather than guessing a
     delay. */
  await page.waitForFunction(
    () => (localStorage.getItem('creative-companion-storage') || '')
      .includes('Soft Signal'),
    undefined,
    { timeout: 20_000 }
  )

  /* ANSWER "Where will this be used?" BEFORE SNAPSHOTTING.
   *
   * Soft Signal predates the brief's `brandSurfaces` field, so the shipped
   * fixture leaves it empty — and Touchpoints derives its whole surface list
   * from that answer (SketchView reads `allBrandSurfaces` ∪ deliverables). The
   * result is a Touchpoints room with nothing in it, which cannot exercise
   * surface switching, the accepted stamp, or anything else this suite is
   * meant to protect. That is a gap in the fixture, not in the app.
   *
   * Closed by TICKING THE BOXES, in the brief, the way a designer would. No
   * new field, no direct write to storage, no shape the app does not already
   * produce — the answer flows through the same store path as a real one and
   * Touchpoints picks it up on its own.
   */
  await pickBrandSurfaces(page, ['website', 'print'])

  const storages = await readStorages(page)
  if (callerViewport) await page.setViewportSize(callerViewport)
  return { skipped: false, storages }
}

/**
 * Tick surfaces on the brief's "Where will this be used?" checklist.
 *
 * SCOPED TO THE FIELD, NOT THE CHAPTER, and that is not fussiness. The chapter
 * that holds `brandSurfaces` also holds `deliverablesPicked`, whose options
 * include "Website design" and "Brochures or print material" — so a
 * chapter-wide `hasText: 'Website'` ticks the deliverable and leaves the
 * surface empty. It still produced touchpoints, because `touchpointsFor` maps
 * deliverables too, and that is exactly the kind of accident that makes a
 * fixture look right while seeding something else.
 *
 * `#detective-field-<id>` is the wrapper DetectiveSheet gives every field
 * (DetectiveSheet.jsx:268), so this can only reach the intended checklist. No
 * chapter has to be opened first: the sheet used to be an accordion and is not
 * one now — every chapter renders `is-open`.
 *
 * Options are matched on an EXACT label from BRAND_SURFACE_OPTIONS rather than
 * a typed string, so a copy edit moves this with it instead of breaking it.
 */
async function pickBrandSurfaces(page, ids) {
  const field = page.locator('#detective-field-brandSurfaces')
  await field.waitFor({ state: 'visible', timeout: 15_000 })

  for (const id of ids) {
    const option = BRAND_SURFACE_OPTIONS.find((o) => o.id === id)
    if (!option) throw new Error(`no brand surface option "${id}"`)
    const row = field
      .locator('.define-check-row')
      .filter({ hasText: option.label })
      .first()
    await row.waitFor({ state: 'visible', timeout: 15_000 })
    const box = row.locator('input[type="checkbox"]')
    if (!(await box.isChecked())) await box.check()
  }

  /* Wait for the ticks to reach the persisted blob, not merely the DOM — the
     snapshot is taken from storage and the store batches its writes. */
  await page.waitForFunction(
    (expected) => {
      const raw = localStorage.getItem('creative-companion-storage') || ''
      try {
        const parsed = JSON.parse(raw)
        const projects = parsed?.state?.projects || parsed?.projects || []
        return projects.some(
          (p) => (p?.detective?.brandSurfaces || []).length >= expected
        )
      } catch {
        return false
      }
    },
    ids.length,
    { timeout: 15_000 }
  )
}

/**
 * A page holding the seeded workspace, landed on `view`.
 *
 * `view` uses the same session-restore key `gotoView` uses, for the same
 * reason: it is viewport-independent and needs no visible chrome. Arrival is
 * asserted on `.app.view-<id>` — App silently rewrites an id it does not
 * accept to `home`, so without the check a typo reads as a pass on Home.
 */
export async function seedProject(page, view = 'project') {
  if (!cached) cached = await captureSeed(page)
  if (cached.skipped) return cached

  /* The priming visit only needs an origin to write storage against, so it
     stops at `commit` rather than waiting for the app to boot. Booting twice
     per seed doubled the slowest step in the suite for no benefit. */
  await page.goto('/', { waitUntil: 'commit' })
  await page.evaluate(
    ({ storages, view: v }) => {
      localStorage.clear()
      sessionStorage.clear()
      for (const [k, val] of Object.entries(storages.local)) {
        localStorage.setItem(k, val)
      }
      for (const [k, val] of Object.entries(storages.session)) {
        sessionStorage.setItem(k, val)
      }
      localStorage.setItem('cc-active-view', v)
    },
    { storages: cached.storages, view }
  )
  await page.goto('/')
  /* ARRIVAL IS THE VIEW CLASS, NOT `networkidle`.
   *
   * Waiting for the network to go quiet is the wrong signal here twice over:
   * the app registers a service worker and requests Google Fonts, and in a
   * sandboxed runner the font host is reset rather than answered — so "idle"
   * arrives late or not at all, for reasons that have nothing to do with
   * whether the stop rendered. `.app.view-<id>` is written from `activeView`
   * and is the shell's own answer to "where am I".
   *
   * The budget is generous on purpose. This seed runs once per test across a
   * ~60-test suite, and a 20s ceiling turned ordinary machine load into two
   * failures that read exactly like product breakage. A slow arrival is not
   * the defect this suite is looking for. */
  await page
    .locator(`.app.view-${view}`)
    .waitFor({ state: 'attached', timeout: 60_000 })
  return { skipped: false }
}

/** Skip the spec when the build is on cloud auth. */
export function skipIfNoSeed(test, seeded) {
  if (seeded?.skipped) test.skip(true, seeded.reason || 'Cloud auth')
}
