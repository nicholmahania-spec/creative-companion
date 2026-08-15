import { test, expect } from '@playwright/test'
import { gotoView, skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * Choosing a file through the Asset Library's picker actually files it.
 *
 * THE DEFECT. `AssetLibraryView`'s `onChange` held `e.target.files` — a LIVE
 * FileList bound to the input — and then cleared the input before consuming
 * it. Clearing empties the object the variable still points at, so `take()`
 * received an empty list, hit its `if (!list.length) return`, and the picker
 * did nothing whatsoever: no asset, no refusal row, no toast, no console
 * error. "Click Choose files, pick a file, nothing happens."
 *
 * WHY IT NEEDS A BROWSER. The whole defect lives in the liveness of a real
 * `FileList` against a real `<input type="file">`. The unit suite runs
 * `environment: 'node'` with no DOM at all, so nothing there can hold the
 * object that gets emptied. Measured in Chromium: a captured FileList goes
 * from length 1 to 0 the instant `value = ''` runs.
 *
 * WHY THE DROP PATH IS ASSERTED BESIDE IT. Drop passes
 * `e.dataTransfer.files`, which nobody clears, so it always worked — through
 * the same `take()`, the same `ingestFiles`, the same store. That is what
 * proved the pipeline healthy and localised the fault to the picker's four
 * lines. Keeping both here means the next change to either path has to keep
 * them agreeing, which is the property that was actually broken: two routes
 * to one outcome, only one of them arriving.
 */

/** A real 1x1 PNG. Built here rather than committed, so the spec carries no
 *  binary fixture and cannot drift from one. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

const shelfCount = (page) =>
  page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('creative-companion-storage') || '{}')
    const state = raw.state || raw
    return (state.assets || []).length
  })

test.describe('the Asset Library picker files what you choose', () => {
  test('a file chosen through the button is filed, and the same file can be chosen twice', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, { name: 'Asset Picker' })
    skipIfCloud(test, gate)

    await gotoView(page, 'assets')
    await page.waitForTimeout(600)

    const input = page.locator('.assets-lib-drop input[type="file"]')
    expect(await shelfCount(page), 'the shelf should start empty').toBe(0)

    await input.setInputFiles({ name: 'picked.png', mimeType: 'image/png', buffer: PNG })
    await page.waitForTimeout(1500)

    /* The assertion that flips: before the fix this was still 0, because the
       FileList had been emptied before `take()` saw it. */
    expect(
      await shelfCount(page),
      'choosing a file through the picker must file it'
    ).toBe(1)

    /* The clear has to survive the fix. Without `value = ''` the browser
       fires no `change` for the same filename twice running, so a designer
       who re-picks the file they just removed gets silence — which is the
       defect this spec exists for, arriving by the opposite route. */
    await input.setInputFiles({ name: 'picked.png', mimeType: 'image/png', buffer: PNG })
    await page.waitForTimeout(1500)
    expect(
      await shelfCount(page),
      'the input must still be cleared, so the same file can be chosen again'
    ).toBe(2)
  })

  test('the drop path still files, and lands in the same place as the picker', async ({
    page,
  }) => {
    const gate = await unlockAndOnboard(page, { name: 'Asset Drop' })
    skipIfCloud(test, gate)

    await gotoView(page, 'assets')
    await page.waitForTimeout(600)
    expect(await shelfCount(page)).toBe(0)

    await page.evaluate((b64) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const file = new File([bin], 'dropped.png', { type: 'image/png' })
      const dt = new DataTransfer()
      dt.items.add(file)
      const zone = document.querySelector('.assets-lib-drop')
      zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
      zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
    }, PNG.toString('base64'))
    await page.waitForTimeout(1500)

    expect(await shelfCount(page), 'the drop path must still file').toBe(1)
  })

  test('a refused file is still named rather than swallowed', async ({ page }) => {
    const gate = await unlockAndOnboard(page, { name: 'Asset Refusal' })
    skipIfCloud(test, gate)

    await gotoView(page, 'assets')
    await page.waitForTimeout(600)

    /* A type the library does not accept. Asserted because a picker that
       silently drops the wrong file is the same failure as a picker that
       silently drops the right one — and `ingestFiles` is explicit that
       "there is no path through this function where a file is neither
       accepted nor refused, named either way". */
    await page.locator('.assets-lib-drop input[type="file"]').setInputFiles({
      name: 'notes.xyz',
      mimeType: 'application/x-not-allowed',
      buffer: Buffer.from('nope'),
    })
    await page.waitForTimeout(1500)

    expect(await shelfCount(page), 'a refused file must not be filed').toBe(0)
    const refused = page.locator('.assets-lib-refused li')
    await expect(refused).toHaveCount(1)
    await expect(refused.first()).toContainText('notes.xyz')
  })
})
