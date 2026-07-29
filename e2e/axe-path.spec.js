import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { unlockAndOnboard, pathNav, skipIfCloud, stepByIdIn, JOURNEY_STEPS } from './helpers.js'

/**
 * axe-core serious/critical on primary path views after local unlock.
 */
async function expectNoCriticalAxe(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .disableRules([
      // Color contrast can false-positive on gradient/cover samples in brand UI
      'color-contrast',
    ])
    .analyze()
  const serious = results.violations.filter((v) =>
    ['critical', 'serious'].includes(v.impact)
  )
  if (serious.length) {
    const detail = serious
      .map(
        (v) =>
          `${v.id} (${v.impact}): ${v.nodes
            .slice(0, 3)
            .map((n) => n.target.join(' '))
            .join('; ')}`
      )
      .join('\n')
    expect(serious, `${label}\n${detail}`).toEqual([])
  }
}

test.describe('axe path', () => {
  test('primary path views have no serious axe violations', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const gate = await unlockAndOnboard(page, {
      name: 'Axe Project',
      step: 'Check a11y',
      testerName: 'Axe Tester',
    })
    skipIfCloud(test, gate)

    const path = await pathNav(page)
    await expect(path).toBeVisible()

    /* Derived from JOURNEY_STEPS: the frozen seven named Ideate and Review,
       which are Tools now rather than path stops. */
    for (const step of JOURNEY_STEPS) {
      const label = step.label
      await stepByIdIn(path, step.id).click()
      await page.waitForTimeout(350)
      await expectNoCriticalAxe(page, label)
    }
  })
})
