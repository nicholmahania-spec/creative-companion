import { test, expect } from '@playwright/test'
import { skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * Discovery notes live on the Brief, only when there is something to read,
 * and the dialog must survive the Workroom hiding #root.
 */
async function openBrief(page) {
  await expect(page.locator('.cc-stage').first()).toBeVisible({
    timeout: 15_000,
  })
  const stop = page.locator('.cc-stage-path .cc-stage-stop', {
    hasText: /^Brief$/,
  })
  if (await stop.count()) await stop.first().click()
  await expect(page.locator('.cc-stage--define')).toBeVisible({
    timeout: 10_000,
  })
}

async function seedHistoricalAnswers(page) {
  /* Persist writes are debounced 400ms and flushed on beforeunload/pagehide.
     Patching the blob and then reload() lets that flush write the in-memory
     store (no answers) back over the seed. Capture the patched blob, re-apply
     it in an init script that runs before app JS, then goto so hydrate reads
     the answers rather than the empty in-memory snapshot. */
  await page.waitForTimeout(500)
  const seeded = await page.evaluate(() => {
    const key = 'creative-companion-storage'
    const raw = JSON.parse(localStorage.getItem(key) || '{}')
    const wrapped = raw && raw.state && Array.isArray(raw.state.projects)
    const st = wrapped ? raw.state : raw
    const id = st.currentProjectId
    const projects = (st.projects || []).map((p) =>
      String(p.id) === String(id)
        ? { ...p, discoveryAnswers: { projectTitle: 'Harbor historical' } }
        : p
    )
    const nextState = { ...st, projects }
    const blob = JSON.stringify(
      wrapped ? { ...raw, state: nextState } : nextState
    )
    localStorage.setItem(key, blob)
    return {
      blob,
      id,
      count: projects.length,
      hasTitle: projects.some(
        (p) => p.discoveryAnswers && p.discoveryAnswers.projectTitle
      ),
    }
  })
  expect(seeded.count, 'seed found no projects').toBeGreaterThan(0)
  expect(seeded.hasTitle, 'seed did not land on the current project').toBe(true)

  await page.addInitScript((blob) => {
    try {
      localStorage.setItem('creative-companion-storage', blob)
    } catch {
      /* quota — the hydrate assertion below will fail loudly */
    }
  }, seeded.blob)

  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const survived = await page.evaluate(() => {
    const raw = JSON.parse(
      localStorage.getItem('creative-companion-storage') || '{}'
    )
    const st = raw && raw.state && Array.isArray(raw.state.projects) ? raw.state : raw
    return (st.projects || []).some(
      (p) => p.discoveryAnswers && p.discoveryAnswers.projectTitle === 'Harbor historical'
    )
  })
  expect(survived, 'historical answers did not survive hydrate').toBe(true)
}

test.describe('Discovery notes on the Brief', () => {
  test('is absent when the project has no historical answers', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 860 })
    const gate = await unlockAndOnboard(page, {
      name: 'Empty Notes',
      testerName: 'T',
      expectOnboardDialog: true,
    })
    skipIfCloud(test, gate)
    await openBrief(page)
    await expect(
      page.getByRole('button', { name: 'Discovery notes' })
    ).toHaveCount(0)
  })

  test('opens from the Brief and stays visible above the inert root', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 860 })
    const gate = await unlockAndOnboard(page, {
      name: 'Notes Project',
      testerName: 'T',
      expectOnboardDialog: true,
    })
    skipIfCloud(test, gate)
    await seedHistoricalAnswers(page)
    await openBrief(page)

    await page.getByRole('button', { name: 'Discovery notes' }).click()
    const dialog = page.getByRole('dialog', { name: 'Discovery notes' })
    await expect(dialog).toBeVisible({ timeout: 8000 })

    const inHiddenRoot = await dialog.evaluate((el) => {
      const root = document.getElementById('root')
      return !!(root && root.contains(el) && root.hasAttribute('inert'))
    })
    expect(inHiddenRoot, 'notes dialog is trapped in the inert Workroom root').toBe(
      false
    )

    await expect(dialog.locator('input, textarea')).toHaveCount(0)
    await expect(
      dialog.getByRole('button', { name: /Read the answers/ })
    ).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: /Email to client/ })
    ).toBeVisible()
  })
})
