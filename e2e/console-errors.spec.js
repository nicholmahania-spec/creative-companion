import { test, expect } from '@playwright/test'
import { seedProject, skipIfNoSeed } from './seed.js'
import {
  PRIMARY_STOPS,
  landsInRoom,
  roomFor,
  pressStopKey,
} from './workroom-contract.js'
import { getNextJourney } from '../src/lib/journey/journey.js'

/**
 * Walk the six primary stops with the console open.
 *
 * Two specs already collect `pageerror` (`no-dead-timer`, `phase-surfaces`),
 * but each only for its own narrow flow. Nothing watched the path itself, so a
 * component that started throwing on mount at one stop — the classic outcome
 * of a layout refactor — produced a screen that still rendered something and a
 * suite that stayed green.
 *
 * WHAT IS DELIBERATELY NOT FAILED ON, because a noisy error spec gets muted
 * and then it guards nothing:
 *
 *   - The service worker and its precache. `main.jsx` registers a worker; in
 *     `vite preview` its fetches can 404 harmlessly, and that says nothing
 *     about the path.
 *   - Supabase and Sentry. The e2e build runs with empty Supabase env on
 *     purpose (playwright.config.js), so cloud calls are expected to fail —
 *     that IS the local-desk configuration under test, not a defect.
 *   - Font and analytics hosts. Third-party origins are not the app. In a
 *     sandboxed runner `fonts.googleapis.com` is reset outright, which is a
 *     property of the network the test runs on.
 *   - `net::ERR_ABORTED` on our own chunks. Every stop change here reloads, and
 *     a reload cancels the module fetches the previous page had in flight. An
 *     abort is a cancellation, not a failure — verified by URL: they are all
 *     `/assets/*.js|css` for the view being left.
 *   - The bare `Failed to load resource: …` console line. It is emitted
 *     ALONGSIDE the request events above and carries no URL, so it cannot be
 *     attributed to anything — while the `requestfailed`/`response` handlers
 *     see the same event WITH the URL. Failing on the console copy would mean
 *     failing on evidence the test cannot read.
 *
 * Everything else is reported with its stop, its URL and its status, so a real
 * failure arrives already diagnosed rather than as "something went wrong".
 */

/** Origins and paths whose failure is a property of the test rig, not the app. */
const EXPECTED_FAILURE = [
  /supabase/i,
  /sentry/i,
  /ingest\./i,
  /fonts\.(googleapis|gstatic)\.com/i,
  /vercel-insights|speed-insights|vitals/i,
  /\/sw\.js(\?|$)/i,
  /workbox/i,
]

/** Console noise that is not an application error. */
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /Service ?Worker/i,
  /favicon/i,
  /* URL-less duplicate of a request event — see the header. */
  /^Failed to load resource/i,
  ...EXPECTED_FAILURE,
]

function ignored(text, patterns) {
  return patterns.some((re) => re.test(text))
}

test('the primary path walks without console errors or broken targets', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []
  let stop = 'bootstrap'

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (ignored(text, IGNORED_CONSOLE)) return
    consoleErrors.push({ stop, text: text.slice(0, 300) })
  })
  page.on('pageerror', (err) => {
    pageErrors.push({ stop, text: String(err?.message || err).slice(0, 300) })
  })
  page.on('requestfailed', (req) => {
    const url = req.url()
    if (ignored(url, EXPECTED_FAILURE)) return
    const why = req.failure()?.errorText || 'failed'
    /* A navigation cancelled it. Not a failure of the app — see the header. */
    if (why === 'net::ERR_ABORTED') return
    failedRequests.push({ stop, url: url.slice(0, 200), why })
  })
  page.on('response', (res) => {
    if (res.status() < 400) return
    const url = res.url()
    if (ignored(url, EXPECTED_FAILURE)) return
    /* Same-origin only. A third-party 4xx is not this app's failure, and
       treating it as one is how an error spec earns its mute. */
    if (!url.startsWith('http://127.0.0.1:4173')) return
    failedRequests.push({ stop, url: url.slice(0, 200), why: `HTTP ${res.status()}` })
  })

  const seeded = await seedProject(page, 'project')
  skipIfNoSeed(test, seeded)

  const missingTargets = []

  for (const step of PRIMARY_STOPS) {
    stop = step.label
    await seedProject(page, step.view)
    await page.waitForTimeout(900)

    /* Missing DOM targets: the stop must actually render its own region, and
       must offer the navigation it claims to. */
    const scope = landsInRoom(step.view)
      ? `${roomFor(step.view)}:not(.is-suspended)`
      : '#main-content'
    if ((await page.locator(scope).count()) === 0) {
      missingTargets.push(`${step.label}: "${scope}" is absent`)
    }
    if ((await page.locator('.header-back').count()) === 0) {
      missingTargets.push(`${step.label}: no back affordance`)
    }

    // broken navigation: the shell must agree about where it is
    const landed = await page.evaluate(
      () =>
        [...document.querySelector('.app').classList].find((c) =>
          c.startsWith('view-')
        ) || null
    )
    if (landed !== `view-${step.view}`) {
      missingTargets.push(
        `${step.label}: asked for view-${step.view}, shell reports ${landed}`
      )
    }

    /* And forward must still resolve — a stop whose declared next stop cannot
       be reached from it is broken navigation, whatever it renders. */
    const next = getNextJourney(step.view)
    if (next) {
      await pressStopKey(page, step.view, next.num)
      try {
        await page
          .locator(`.app.view-${next.view}`)
          .waitFor({ state: 'attached', timeout: 10_000 })
      } catch {
        missingTargets.push(
          `${step.label}: cannot reach ${next.label} (key ${next.num})`
        )
      }
    }
  }

  expect(pageErrors, `uncaught exceptions:\n${JSON.stringify(pageErrors, null, 2)}`)
    .toEqual([])
  expect(
    consoleErrors,
    `console errors:\n${JSON.stringify(consoleErrors, null, 2)}`
  ).toEqual([])
  expect(
    failedRequests,
    `failed same-origin requests:\n${JSON.stringify(failedRequests, null, 2)}`
  ).toEqual([])
  expect(
    missingTargets,
    `broken navigation / missing targets:\n${missingTargets.join('\n')}`
  ).toEqual([])
})
