import { JOURNEY_STEPS } from '../src/lib/journey/journey.js'
import { DETECTIVE_CHAPTERS } from '../src/lib/brief/detectiveBrief.js'
import { IDENTITY_SUBSTEPS } from '../src/lib/journey/identitySubsteps.js'
import { RESTORABLE_VIEWS } from '../src/app/viewRegistry.js'

/**
 * Shared Playwright unlock + onboard for local desk gate.
 * @param {import('@playwright/test').Page} page
 * @param {{ name?: string, step?: string, testerName?: string, expectOnboardDialog?: boolean }} [opts]
 */
export async function unlockAndOnboard(
  page,
  {
    name = 'E2E Project',
    step = 'First draft step',
    testerName = 'E2E Tester',
    expectOnboardDialog = false,
  } = {}
) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const body = await page.locator('body').innerText()
  if (body.includes('Sign in') && body.includes('Email')) {
    return { skipped: true, reason: 'Cloud auth configured' }
  }

  const onLogin =
    body.includes('Create an access password') ||
    body.includes('access password') ||
    body.includes('Protect this desk') ||
    body.includes('Unlock desk') ||
    body.includes('Create access')

  if (onLogin || (await page.locator('.login-form, .login-page').count())) {
    const inputs = page.locator('.login-form input, .login-page input, input')
    const n = await inputs.count()
    if (n >= 3) {
      await inputs.nth(0).fill(testerName)
      await inputs.nth(1).fill('testpass123')
      await inputs.nth(2).fill('testpass123')
    } else if (n >= 2) {
      await inputs.nth(0).fill('testpass123')
      await inputs.nth(1).fill('testpass123')
    } else if (n >= 1) {
      await inputs.nth(0).fill('testpass123')
    }
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(900)
  }

  const onboardPrimary = page.locator(
    '.onboard-primary, .onboard-panel .btn-primary'
  )
  if (await onboardPrimary.count()) {
    if (expectOnboardDialog) {
      const { expect } = await import('@playwright/test')
      await expect(
        page.getByRole('dialog', { name: /New project|One project|project/i })
      ).toBeVisible()
    }
    const nameEl = page
      .locator('#onboard-name, .onboard-panel input, .onboard-input')
      .first()
    if (await nameEl.count()) {
      await nameEl.fill(name)
      const stepEl = page
        .locator('#onboard-step, .onboard-panel input, .onboard-input')
        .nth(1)
      if (await stepEl.count()) await stepEl.fill(step)
    }
    await onboardPrimary.first().click()
    await page.waitForTimeout(500)
  }

  /* Land INSIDE a project, not on Home.
   *
   * Onboarding creates the project and then leaves you on HomeView, which has
   * no `.step-rail` — so `pathNav()` could never match, and the 8 specs that
   * call it all failed on a working app. That was the single cause of most of
   * a 17-red suite, and it was invisible for a while because the e2e job gates
   * on `unit`, which was also red, so e2e was SKIPPED rather than failing.
   *
   * `.home-dash-primary` is Home's own "carry on with this project" action, so
   * this is the route a real user takes rather than a test-only shortcut. For
   * a freshly created project it resolves to switchProjectAndContinue — the
   * client-inbox and pack-ready branches need state a new project does not
   * have yet.
   *
   * Best-effort on purpose: a caller that genuinely wants to stay on Home
   * still gets a working app, and specs that never touch the path are
   * unaffected. Waiting on the rail rather than a fixed timeout keeps this
   * honest — if the project did not open, the spec fails on its own assertion
   * instead of on a helper that silently swallowed it.
   */
  const enterProject = page.locator('.home-dash-primary').first()
  if (await enterProject.count()) {
    await enterProject.click()
    await page
      .locator('.step-rail')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {})
  }

  return { skipped: false }
}

/**
 * The step navigation.
 *
 * This used to point at the left sidebar ("Your path in Creative Companion").
 * The sidebar now collapses its step list under the project row, so those
 * buttons are in the DOM but not visible, and every click against them hung
 * until the test timed out — a second, quieter cause of the same red suite.
 * The step rail is the nav that actually answers "where am I" on screen, and
 * its buttons carry the same "Step N: Label" names.
 */
export async function pathNav(page) {
  return page.getByRole('navigation', { name: /Process position/i })
}

/** The left sidebar, for the few tests that are about the sidebar itself. */
export async function sidebarNav(page) {
  return page.getByRole('navigation', { name: /Your (path|\d+ steps)/i })
}

/**
 * Step locators derived from JOURNEY_STEPS, never typed out.
 *
 * These specs each kept their own copy of the path — "Step 1: Define",
 * "Step 3: Ideate", "Step 7: Deliver" — so the v1.53.6 rename to five stops
 * turned nine of them red at once while the app was correct. CLAUDE.md names
 * this as the dominant defect in the codebase and says tests must derive
 * too; `journeySingleSource.test.js` already greps src for restated labels,
 * and this is the same rule reaching e2e.
 *
 * Address a step by its STABLE id (define/research/design/sketch/deliver),
 * not by number or label: ids survive both renames and reordering, which is
 * exactly what broke here. The sidebar's accessible name runs on past the
 * label ("Step 2: Research. Gather refs... Press 2 to open."), so match the
 * head of it rather than the whole string.
 */
export function stepByIdIn(nav, id) {
  const step = JOURNEY_STEPS.find((s) => s.id === id)
  if (!step) throw new Error(`No journey step with id "${id}"`)
  /* Two renderers, one rule. The shell rail names a stop "Step 2: Research.
     Gather refs…"; the stage's path edge names it "Research", bare — and on
     a path stop the rail is inside the inert `#root`, so the nav a spec gets
     from `pathNav()` is the stage one. Match the head of either form, so the
     same helper drives whichever renderer owns the viewport. */
  return nav.getByRole('button', {
    name: new RegExp(`^(Step ${step.num}: )?${step.label}\\b`, 'i'),
  })
}

/** The heading the given step's view renders, also derived. */
export function headingForStep(page, id) {
  const step = JOURNEY_STEPS.find((s) => s.id === id)
  if (!step) throw new Error(`No journey step with id "${id}"`)
  return page.getByRole('heading', { name: step.label, exact: true })
}

export { JOURNEY_STEPS }

/** Skip test if unlock returned cloud-auth skip */
export function skipIfCloud(test, gate) {
  if (gate?.skipped) test.skip(true, gate.reason || 'Cloud auth')
}

/** A step's user-facing label, by stable id. */
export function labelForStep(id) {
  const step = JOURNEY_STEPS.find((s) => s.id === id)
  if (!step) throw new Error(`No journey step with id "${id}"`)
  return step.label
}

/**
 * Open an off-path destination that used to live in the Tools overlay.
 *
 * Review is still off-path — it acts on the client relationship rather than
 * producing a stage artifact. Timer is a Studio destination. Neither is a
 * JOURNEY_STEPS stop.
 */
export async function openTool(page, name) {
  /* Timer is a Studio row; Review is a This-project row beside Desk. Both
     are shell chrome, so a stage makes them inert — stand in the shell
     first. */
  await toShell(page)
  await page.getByRole('button', { name }).first().click()
  await page.waitForTimeout(300)
}

/**
 * Reveal a brief field by opening the chapter that owns it.
 *
 * The Define sheet is an accordion: only one chapter is open at a time, and
 * chapter 01 is the one open on arrival. `#detective-goal` lives in a later
 * chapter, so two specs asserted it was visible the moment they landed and
 * timed out waiting — the field renders, it is just inside a closed chapter.
 * Not a rename; a different failure that the rename was masking.
 *
 * The chapter is looked up from DETECTIVE_CHAPTERS rather than named, so
 * moving a field between chapters does not break the caller.
 */
export async function openBriefFieldChapter(page, fieldId) {
  const chapter = DETECTIVE_CHAPTERS.find((ch) =>
    (ch.fields || []).some((f) => f.id === fieldId)
  )
  if (!chapter) throw new Error(`No brief chapter holds field "${fieldId}"`)
  const toggle = page.locator(
    `[data-chapter="${chapter.id}"] .define-chapter-toggle`
  )
  if ((await toggle.count()) && (await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click()
    await page.waitForTimeout(250)
  }
  return page.locator(`#detective-${fieldId}`)
}

/**
 * Open one of Design's Identity tool screens: Mark · Color · Type · Handover.
 *
 * Each is mounted only while open, so a field that lives on one is absent
 * until it is selected.
 *
 * THE ARTBOARD IS NOT ONE OF THEM. Tagline, positioning, voice, promise,
 * proof, personality and do/don't are edited on the direction sheet, which
 * renders on every screen — reaching for `Tagline` needs no navigation at
 * all. That is the point of the 2026-08-08 rework, and a spec that opens a
 * tab to find those fields is describing an app that no longer exists.
 *
 * Labels come from IDENTITY_SUBSTEPS rather than being typed, so a rename
 * moves the callers with it instead of breaking them — the same single-source
 * rule `stepByIdIn` applies to the path.
 */
export async function openIdentitySubstep(page, id) {
  const label = IDENTITY_SUBSTEPS.find((s) => s.id === id)?.label
  if (!label) throw new Error(`No Identity substep with id "${id}"`)
  /* The dock is labelled "Identity tools". It was matched as "Identity
     screens" here, which stopped matching when the dock was rebuilt — and
     because the click was guarded by `if (count)`, this helper then did
     NOTHING and returned success. Six specs went on to look for fields that
     live on an unopened screen and failed one assertion later, naming the
     field rather than the navigation that never happened. A helper whose job
     is to arrive somewhere must fail when it does not. */
  const tab = page
    .getByRole('navigation', { name: /Identity tools/i })
    .getByRole('button', { name: label, exact: true })
  if (!(await tab.count())) {
    throw new Error(
      `Identity tools dock has no "${label}" screen — the dock or its label moved`
    )
  }
  await tab.first().click()
  await page.waitForTimeout(400)
}

/**
 * Leave the stage and stand in the shell.
 *
 * Shell chrome — the Tools menu, the account menu, the step rail, the work
 * clock — lives inside `#root`, and an open Workroom sets `#root` inert,
 * `aria-hidden` and `visibility: hidden` (see `src/components/Workroom.jsx`).
 * So every one of those controls is still in the DOM and still queryable
 * while being unreachable and invisible, which is exactly the failure a
 * dozen specs were reporting: "resolved to <div id=tools-menu> … unexpected
 * value hidden".
 *
 * `unlockAndOnboard` now lands INSIDE the Brief stage, because Home's "carry
 * on with this project" opens the next stop — that is the product's answer to
 * "what happens next", not a test artifact. A spec that wants the shell has
 * to walk back out to it, which is what a designer does: the stage exit at
 * the head of the path is the desk.
 *
 * Exits repeatedly because stops co-mount (Directions under Identity under
 * Touchpoints), so one exit can reveal another stage rather than the shell.
 */
export async function toShell(page) {
  const open = page.locator('.cc-stage:not(.is-suspended)')
  /* Two clean reads in a row, not one. A stage mounts a beat after the
     navigation that opens it, so a single "is anything open?" check taken too
     early answers no about a stage that is on its way — and then the spec
     opens the Tools menu into a shell that goes inert underneath it. Requiring
     the shell to still be the shell after a pause is what makes this a wait
     rather than a guess. */
  let clean = 0
  for (let i = 0; i < 16 && clean < 2; i += 1) {
    if (await open.count()) {
      clean = 0
      await open.locator('.cc-stage-exit').first().click()
      await page.waitForTimeout(350)
    } else {
      clean += 1
      await page.waitForTimeout(300)
    }
  }
  if (await open.count()) {
    throw new Error('still on a stage after 16 tries — the shell is unreachable')
  }
}

/**
 * The stops the path shows, whichever renderer owns the viewport.
 *
 * Two navs answer to "Process position": the shell's `.step-rail`, whose
 * stops are `.step-rail-step`, and the stage's own path edge (Workroom.jsx),
 * whose stops are `.cc-stage-stop`. A spec standing inside a stage sees only
 * the second one, so counting `.step-rail-step` there returns 0 on a path
 * that is perfectly correct.
 */
export function pathStopsIn(nav) {
  return nav.locator('.step-rail-step, .cc-stage-stop')
}

/**
 * Open the Touchpoints card grid.
 *
 * The surfaces list is behind a `<details class="touchpoints-engine-hold">`
 * — SketchView calls it "Existing engine — collapsed until Steps 4–6 restage
 * accept/make/check", so this is a deliberate holding pattern, not a bug. A
 * CLOSED `<details>` gives its contents `content-visibility: hidden`, which
 * keeps them in the DOM with a real box while Playwright (correctly) reports
 * them as not visible. That is why nine specs failed on "resolved to
 * <li class=touchpoints-card> … unexpected value hidden" while the card was
 * sitting there at 560x304.
 *
 * Idempotent: `<details>` stays open, so calling this twice does not close it.
 */
export async function openTouchpointEngine(page) {
  const hold = page.locator('.touchpoints-engine-hold')
  if (!(await hold.count())) return
  if (await hold.first().evaluate((el) => el.open)) return
  await hold.first().locator('summary').first().click()
  await page.waitForTimeout(250)
}

/**
 * Open the Deliver disclosure that CONTAINS a given control.
 *
 * Specs used to click `.deliver-advanced summary` filtered by "More formats".
 * That disclosure is now "Extras · print, ZIP, backup", so the click waited on
 * a summary that does not exist while the control behind it worked fine.
 *
 * Deliver has four `.deliver-advanced` disclosures and their labels are
 * ordinary product copy, free to change. What is NOT free to change is that
 * Print lives behind a disclosure — that is the behaviour under test. So find
 * the section by what it holds, not by what it is called.
 *
 * `label` must be matched with a DOM locator, NOT `getByRole`. Role queries
 * resolve against the accessibility tree, and a CLOSED <details> hides its
 * children from that tree — so a role-based filter matches nothing here and
 * the click waits forever on a section that is right there. The children are
 * still in the DOM, which is why a plain `button` locator finds them.
 */
export async function openDeliverSectionWith(page, label) {
  const control = page.locator('button', { hasText: label })
  const section = page.locator('.deliver-advanced').filter({ has: control })
  await section.first().locator('summary').first().click()
}

/**
 * Open ANY view, at ANY viewport, without clicking a visible label.
 *
 * Every click-based route into a view goes through chrome that changes shape
 * with the viewport: the sidebar collapses behind `.header-menu-toggle` below
 * 768px, the step rail only renders on path stops, and Ideate/Review live
 * behind the Tools menu. A sweep that walks the UI therefore reaches the five
 * path stops on a phone and none of the other eleven — the buttons are in the
 * DOM but not visible, so `getByRole('button', { name: 'Calendar' })` resolves
 * and then hangs until the test times out. That is exactly how a mobile
 * measurement pass ends up with zero coverage of Home, Desk, Calendar,
 * Clients, Settings, Ideate and Review.
 *
 * There is no router in this app — `activeView` is React state in App.jsx and
 * nothing reads `location.hash` (checked). But the state is MIRRORED to
 * localStorage under `cc-active-view` so a reload does not lose your place
 * (App.jsx:347-385), and App re-reads it on mount against `RESTORABLE_VIEWS`.
 * So the deep link already exists; it is just spelled "write the key, reload".
 * `e2e/no-horizontal-overflow.spec.js` was already doing this by hand for the
 * five journey stages. This is the same move, named, list-checked and — the
 * part that was missing — asserted on arrival.
 *
 * Arrival is checked against `.app.view-<id>`, the class the shell already
 * writes from `activeView` (App.jsx:3157). That matters: a view id App does
 * not accept is silently replaced with `home`, so without the check a typo or
 * a removed view reads as a pass on the wrong screen. It is also viewport- and
 * label-independent, which is the whole point.
 *
 * Production behaviour is untouched — this writes the key the app itself
 * writes, and takes the path a user takes by refreshing the tab.
 *
 * `clientRecord` is intentionally not restorable (it renders one specific
 * client and cannot say which), so it is not reachable this way and this
 * helper says so rather than quietly landing you on Home. Open it from the
 * Clients list.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} view a `RESTORABLE_VIEWS` id
 */
export async function gotoView(page, view) {
  if (!RESTORABLE_VIEWS.includes(view)) {
    throw new Error(
      `"${view}" is not a restorable view. Reload cannot land on it, so nor ` +
        `can this helper. Restorable: ${RESTORABLE_VIEWS.join(', ')}`
    )
  }
  await page.evaluate((v) => localStorage.setItem('cc-active-view', v), view)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page
    .locator(`.app.view-${view}`)
    .waitFor({ state: 'attached', timeout: 15_000 })
  return page.locator('#main-content')
}

export { RESTORABLE_VIEWS }

/**
 * Jump to a path stop by its keyboard shortcut.
 *
 * The step rail only renders on path views, so once a spec has opened a Tool
 * (Ideate, Review) the rail is gone and `stepByIdIn` has nothing to click.
 * Keys 1-N are bound app-wide and are how the app itself expects you to get
 * back. Uses the step's own `num`, so the binding follows the path.
 */
export async function goToStepByKey(page, id) {
  const step = JOURNEY_STEPS.find((s) => s.id === id)
  if (!step) throw new Error(`No journey step with id "${id}"`)
  /* Blur first. With focus still in a text field the digit is typed into it
     and the shortcut never fires — the app is right to ignore it there, and
     it looks exactly like a navigation that silently did nothing. */
  await page.evaluate(() => document.activeElement?.blur?.())
  await page.keyboard.press(step.num)
  await page.waitForTimeout(500)
}
