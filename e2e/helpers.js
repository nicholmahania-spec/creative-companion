import { JOURNEY_STEPS } from '../src/lib/journey/journey.js'
import { DETECTIVE_CHAPTERS } from '../src/lib/brief/detectiveBrief.js'
import { IDENTITY_SUBSTEPS } from '../src/lib/journey/identitySubsteps.js'

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
  return nav.getByRole('button', {
    name: new RegExp(`Step ${step.num}: ${step.label}\\b`, 'i'),
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
 * Open a view that lives on the Tools menu.
 *
 * Ideate and Review used to be path stops 3 and 6. They are Tools now, so
 * specs that walked to them through the step nav could not reach them at
 * all. Routing through Tools keeps that coverage instead of deleting it —
 * the screens still exist and still hold real fields.
 */
export async function openTool(page, name) {
  await page.getByRole('button', { name: 'Tools' }).first().click()
  await page
    .locator('#tools-menu, .more-menu')
    .getByRole('menuitem', { name })
    .first()
    .click()
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
 * Open one of Design's Identity sub-screens.
 *
 * Identity was split into Mark → Words → Colour → Type → Preview (20d21a1).
 * Each sub-screen is mounted only while it is open, so fields that used to sit
 * on one flat Design column — `#msg-promise`, `#brand-tagline`, `#img-style` —
 * are simply absent until the sub-screen holding them is selected. Specs that
 * reached straight for them died waiting on an element that had not been
 * rendered yet, on an app that was working.
 *
 * Labels come from IDENTITY_SUBSTEPS rather than being typed, so a rename
 * moves the callers with it instead of breaking them — the same single-source
 * rule `stepByIdIn` applies to the path.
 */
export async function openIdentitySubstep(page, id) {
  const label = IDENTITY_SUBSTEPS.find((s) => s.id === id)?.label
  if (!label) throw new Error(`No Identity substep with id "${id}"`)
  const tab = page
    .getByRole('navigation', { name: /Identity screens/i })
    .getByRole('button', { name: label, exact: true })
  if (await tab.count()) {
    await tab.first().click()
    await page.waitForTimeout(400)
  }
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
