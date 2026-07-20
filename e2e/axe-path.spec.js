import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { unlockAndOnboard, pathNav, skipIfCloud } from './helpers.js'

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
    const gate = await unlockAndOnboard(page, {
      name: 'Axe Project',
      step: 'Check a11y',
      testerName: 'Axe Tester',
    })
    skipIfCloud(test, gate)

    const path = await pathNav(page)
    await expect(path).toBeVisible()

    const steps = [
      [/Step 1: Define/i, 'Define'],
      [/Step 2: Research/i, 'Research'],
      [/Step 3: Ideate/i, 'Ideate'],
      [/Step 4: Sketch/i, 'Sketch'],
      [/Step 5: Design/i, 'Design'],
      [/Step 6: Review/i, 'Review'],
      [/Step 7: Deliver/i, 'Deliver'],
    ]

    for (const [nav, label] of steps) {
      await path.getByRole('button', { name: nav }).click()
      await page.waitForTimeout(350)
      await expectNoCriticalAxe(page, label)
    }
  })
})
