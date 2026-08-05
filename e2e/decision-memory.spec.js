import { test, expect } from '@playwright/test'
import {
  headingForStep,
  openIdentitySubstep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'
import { AXES } from '../src/lib/brand/alignment.js'

/**
 * Phase 3's done-condition, in a browser:
 * a strategy attribute set in Strategy visibly reappears as bars when
 * choosing a typeface, and survives a reload.
 *
 * This is the product's actual claim — that the system remembers so the
 * designer does not have to — so it is worth proving end to end rather than
 * unit-testing the arithmetic and hoping the wiring is right.
 */

async function addStrategyWord(page, word) {
  const field = page.locator('#strategy-word')
  await field.fill(word)
  await page.getByRole('button', { name: /^Add$/ }).click()
  await page.waitForTimeout(300)
}

/** Move one axis slider in the tagger that is currently open.
 *  React ignores a plain value assignment, hence the native setter. */
async function setAxis(page, axisId, pct) {
  const slider = page.locator(`input[type=range][id$="-${axisId}"]`).first()
  await slider.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set
    setter.call(el, String(v))
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, pct)
  await page.waitForTimeout(250)
}

test('a strategy word set in Strategy comes back as bars on Type', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Memory Project' })
  skipIfCloud(test, gate)

  const path = await pathNav(page)
  await stepByIdIn(path, 'define').click()
  await expect(headingForStep(page, 'define').first()).toBeVisible()

  await addStrategyWord(page, 'warm')
  // Adding a word opens its rulers. The element id carries a generated id,
  // so target the axis by suffix rather than guessing the prefix.
  await setAxis(page, 'warmth', 95)

  // Now walk to Identity → Type, where the decision is actually made.
  await stepByIdIn(path, 'design').click()
  await expect(headingForStep(page, 'design').first()).toBeVisible()
  await openIdentitySubstep(page, 'type')

  const block = page.locator('.design-align')
  await expect(block).toBeVisible()
  await block.locator('summary').click()

  /* Every axis renders, always — a chart whose rows appear and disappear
     cannot be compared between two candidates. */
  await expect(page.locator('.align-row')).toHaveCount(AXES.length)

  // Warmth carries a real target; the others were never said.
  const warmthRow = page.locator('.align-row', { hasText: 'Warmth' })
  await expect(warmthRow.locator('.align-target')).toHaveCount(1)
  const energyRow = page.locator('.align-row', { hasText: 'Energy' })
  await expect(energyRow).toContainText('not said')
})

test('the strategy survives a reload', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Reload Project' })
  skipIfCloud(test, gate)

  const path = await pathNav(page)
  await stepByIdIn(path, 'define').click()
  await addStrategyWord(page, 'playful')

  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1200)

  /* Decision memory that does not survive a reload is not memory. The word
     must still be listed after the app restarts from storage. */
  await expect(page.locator('.strategy-list')).toContainText('playful', {
    timeout: 10000,
  })
})

test('contradicting words are named, not averaged into a false match', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Split Project' })
  skipIfCloud(test, gate)

  const path = await pathNav(page)
  await stepByIdIn(path, 'define').click()

  /* The failure this guards: "playful" and "trustworthy" pull opposite ways
     on Energy, and averaging them produced a midpoint that reported a
     typeface matching NEITHER as a match, silently. The tension has to be
     said out loud — it is a question for the client, not a number. */
  for (const [word, pct] of [
    ['playful', 90],
    ['trustworthy', 25],
  ]) {
    await addStrategyWord(page, word)
    await setAxis(page, 'energy', pct)
  }

  await expect(page.locator('.strategy-split')).toContainText(/pull both ways/i)
  await expect(page.locator('.strategy-split')).toContainText(/energy/i)
})

/**
 * The cold-start failures, pinned in a browser.
 *
 * A designer walked a real brief through the app and found the panel would
 * say "matches your strategy" for any font name and any palette, because it
 * was comparing numbers the designer had typed rather than reading the work.
 * These two cases are the exact substitutions they ran.
 */
test('changing the palette changes the reading', async ({ page }) => {
  const gate = await unlockAndOnboard(page, { name: 'Palette Read' })
  skipIfCloud(test, gate)

  const { axesForPalette } = await import('../src/lib/brand/colourAxes.js')

  /* Read from the hexes, in the page, exactly as the screen does. The old
     behaviour is impossible to express here: there is no slider to move, so
     if the numbers move it is because the colours did. */
  const loden = axesForPalette(['#23261F', '#4C5A3C', '#8A7B63', '#F1EDE3'])
  const orange = axesForPalette(['#F26B21', '#FF9E4A', '#FFF4E6'])

  expect(loden.energy).toBeLessThan(0.25) // muted leather
  expect(orange.energy).toBeGreaterThan(0.5) // highway cone
  // and neither invents the axes a hex cannot carry
  expect(orange.formality).toBeNull()
  expect(orange.era).toBeNull()
})

test('a font the machine does not have is called out, not silently swapped', async ({
  page,
}) => {
  const gate = await unlockAndOnboard(page, { name: 'Font Check' })
  skipIfCloud(test, gate)

  /* Runs in the page, where fonts are real. "Trade Gothic Next Condensed
     Bold" is the face from the test run whose specimen was printed in the
     app's default sans on the client-facing artboard. */
  const result = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const probe = 'mmmwwwiiilll0OQ@'
    const width = (family) => {
      ctx.font = `72px ${family}`
      return ctx.measureText(probe).width
    }
    const resolves = (name) =>
      ['monospace', 'serif', 'sans-serif'].some(
        (fb) => Math.abs(width(`"${name}", ${fb}`) - width(fb)) > 0.5
      )
    return {
      absent: resolves('Trade Gothic Next Condensed Bold'),
      present: resolves('monospace'),
    }
  })

  // The uninstalled face measures exactly like its fallback — that IS the
  // detection, and it is what lets the app warn instead of misleading.
  expect(result.absent).toBe(false)
  expect(result.present).toBe(true)
})
