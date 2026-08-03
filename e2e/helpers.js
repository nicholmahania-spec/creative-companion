import { JOURNEY_STEPS } from '../src/lib/journey/journey.js'
import { DETECTIVE_CHAPTERS } from '../src/lib/brief/detectiveBrief.js'

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
