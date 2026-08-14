import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'
import {
  openTouchpointEngine,
  headingForStep,
  pathNav,
  skipIfCloud,
  stepByIdIn,
  unlockAndOnboard,
} from './helpers.js'
import { colourPdf } from './makePdf.js'
import { packageFiles } from '../src/lib/deliver/packageFiles.js'
import { packagePlan } from '../src/lib/deliver/packagePlan.js'

/**
 * Production contract: email Touchpoint can produce a REAL application
 * artifact (PNG bytes in packageAssets), not mock/metadata theatre.
 *
 * CRITICAL negatives:
 *   - "This mock is good" alone must NOT create packageAssets
 *   - ApplicationCheck alone must NOT create packageAssets
 *   - Note alone must NOT create packageAssets
 *   - Re-produce updates the same row (no duplicates)
 */

const STORAGE_KEY = 'creative-companion-storage'
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47] /* \x89PNG */

async function readProject(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    const projects = data?.state?.projects || []
    const id = data?.state?.currentProjectId
    return projects.find((p) => p.id === id) || projects[0] || null
  }, STORAGE_KEY)
}

async function waitForProject(page, pred, { timeout = 10000 } = {}) {
  await expect
    .poll(async () => {
      const p = await readProject(page)
      try {
        return pred(p) ? p : null
      } catch {
        return null
      }
    }, { timeout })
    .toBeTruthy()
  return readProject(page)
}

function isPngBytes(buf) {
  if (!buf || buf.length < 8) return false
  return (
    buf[0] === PNG_SIG[0] &&
    buf[1] === PNG_SIG[1] &&
    buf[2] === PNG_SIG[2] &&
    buf[3] === PNG_SIG[3]
  )
}

/**
 * Contact enriches the signature face (StationeryKit uses contact when set).
 * Seed via Delivery · Stationery so persist does not race evaluate().
 */
async function seedContactAndIdentity(page) {
  await stepByIdIn(await pathNav(page), 'design').click()
  await expect(headingForStep(page, 'design').first()).toBeVisible({
    timeout: 10000,
  })
  const wordmark = page
    .locator('#logo-wordmark, input[name="logoWordmark"], [data-field="logoWordmark"]')
    .first()
  if (await wordmark.count()) {
    await wordmark.fill('Harbor Hearth')
  } else {
    const wm = page.getByLabel(/wordmark/i).first()
    if (await wm.count()) await wm.fill('Harbor Hearth')
  }

  await stepByIdIn(await pathNav(page), 'deliver').click()
  await expect(headingForStep(page, 'deliver').first()).toBeVisible({
    timeout: 10000,
  })
  const stationery = page.locator(
    'details.assets-stationery, details.deliver-advanced.assets-stationery'
  )
  await expect(stationery.first()).toBeVisible({ timeout: 8000 })
  await stationery.first().locator('summary').click()
  await page.getByRole('button', { name: /^\+?\s*Add contact$/i }).click()
  const row = page.locator('.stationery-contact-row').last()
  await expect(row).toBeVisible({ timeout: 5000 })
  const inputs = row.locator('input')
  await inputs.nth(0).fill('Alex River')
  await inputs.nth(1).fill('Founder')
  await inputs.nth(2).fill('555-0100')
  await inputs.nth(3).fill('alex@harbor.test')

  await waitForProject(
    page,
    (p) =>
      Array.isArray(p?.contacts) &&
      p.contacts.some((c) => c?.name === 'Alex River'),
    { timeout: 12000 }
  )
}

async function openEmailCard(page) {
  const pathNavEl = await pathNav(page)
  await stepByIdIn(pathNavEl, 'sketch').click()
  await expect(headingForStep(page, 'sketch').first()).toBeVisible({
    timeout: 10000,
  })

  const existing = page.locator('.touchpoints-card[data-touchpoint="email"]')
  if ((await existing.count()) === 0) {
    /* Email is not on QUICK_SURFACES. Seed brandSurfaces + designerSurfaces
       in localStorage. The store debounces persist and flushes on pagehide,
       which would overwrite a bare seed on reload — so block setItem for the
       storage key until navigation completes. */
    await page.waitForTimeout(500)
    const seeded = await page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      if (!raw) return false
      const data = JSON.parse(raw)
      const projects = data?.state?.projects || []
      const id = data?.state?.currentProjectId
      const p = projects.find((x) => x.id === id) || projects[0]
      if (!p) return false
      const mine = Array.isArray(p.designerSurfaces) ? p.designerSurfaces : []
      if (!mine.includes('email')) {
        p.designerSurfaces = [...mine, 'email']
      }
      const det = p.detective && typeof p.detective === 'object' ? p.detective : {}
      const brief = Array.isArray(det.brandSurfaces) ? det.brandSurfaces : []
      if (!brief.includes('email')) {
        p.detective = { ...det, brandSurfaces: [...brief, 'email'] }
      }
      localStorage.setItem(key, JSON.stringify(data))
      const orig = Storage.prototype.setItem
      Storage.prototype.setItem = function patchedSetItem(k, v) {
        if (k === key) return
        return orig.call(this, k, v)
      }
      return true
    }, STORAGE_KEY)
    expect(seeded, 'could not seed email surface into storage').toBe(true)
    await page.reload()
    await page.waitForLoadState('networkidle')
    const enter = page.locator('.home-dash-primary').first()
    if (await enter.count()) {
      await enter.click()
      await page.locator('.step-rail').first().waitFor({ timeout: 15000 })
    }
    await stepByIdIn(await pathNav(page), 'sketch').click()
    await expect(headingForStep(page, 'sketch').first()).toBeVisible({
      timeout: 10000,
    })
  }
  await openTouchpointEngine(page)
  const card = page.locator('.touchpoints-card[data-touchpoint="email"]').first()
  await expect(card).toBeVisible({ timeout: 8000 })
  return card
}

function packageAssetsFromProject(project) {
  return Array.isArray(project?.packageAssets) ? project.packageAssets : []
}

function emailSignatureArtifacts(project) {
  return packageAssetsFromProject(project).filter(
    (a) =>
      a &&
      a.deliverable === 'emailSignature' &&
      a.group === 'application' &&
      /^data:image\/png/i.test(String(a.dataUrl || ''))
  )
}

test.describe('email signature real application artifact', () => {
  test('mock / check / note do not produce; Produce creates package PNG that ships', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000)
    const gate = await unlockAndOnboard(page, { name: 'Email Artifact' })
    skipIfCloud(test, gate)

    await seedContactAndIdentity(page)
    const card = await openEmailCard(page)

    /* ── A. Before production ───────────────────────────────────────── */
    await expect(card.locator('.tp-mock')).toBeVisible()
    await expect(card.getByTestId('email-signature-produce-status')).toHaveText(
      /Application not produced yet/i
    )
    await expect(card).toHaveAttribute('data-application-produced', 'false')

    let project = await readProject(page)
    expect(emailSignatureArtifacts(project)).toHaveLength(0)

    const shotDir = testInfo.outputDir
    await fs.promises.mkdir(shotDir, { recursive: true })
    await card.screenshot({
      path: path.join(shotDir, 'email-signature-before-produce.png'),
    })

    await expect(card.getByTestId('email-signature-produce-btn')).toBeEnabled()

    /* ── Negative: mock good alone ──────────────────────────────────── */
    await card.getByRole('button', { name: /This mock is good/i }).click()
    await expect(card.getByRole('button', { name: /Mock is good/i })).toBeVisible()
    project = await waitForProject(
      page,
      (p) => p?.touchpointApps?.email?.done === true
    )
    expect(emailSignatureArtifacts(project)).toHaveLength(0)
    await expect(card.getByTestId('email-signature-produce-status')).toHaveText(
      /Application not produced yet/i
    )

    /* ── Negative: note alone ───────────────────────────────────────── */
    await card.locator('textarea').first().fill('Header mark, 48px')
    project = await waitForProject(
      page,
      (p) => String(p?.touchpointApps?.email?.note || '').includes('Header mark')
    )
    expect(emailSignatureArtifacts(project)).toHaveLength(0)

    /* ── Negative: ApplicationCheck alone ───────────────────────────── */
    const checkInput = card.locator('.app-check input[type="file"]')
    if (await checkInput.count()) {
      await checkInput.setInputFiles({
        name: 'sample-sig.pdf',
        mimeType: 'application/pdf',
        buffer: colourPdf([{ hex: '#1B4C7E' }]),
      })
      await expect(card.locator('.app-check-line')).toBeVisible({ timeout: 15000 })
    }
    await page.waitForTimeout(500)
    project = await readProject(page)
    expect(emailSignatureArtifacts(project)).toHaveLength(0)
    if (project?.touchpointApps?.email?.check) {
      expect(project.touchpointApps.email.check.dataUrl).toBeUndefined()
      expect(project.touchpointApps.email.check.fileName).toBeTruthy()
    }

    /* ── B. Explicit produce ────────────────────────────────────────── */
    await card.getByTestId('email-signature-produce-btn').click()
    await expect(card.getByTestId('email-signature-produce-status')).toHaveText(
      /Application produced/i,
      { timeout: 30000 }
    )
    await expect(card).toHaveAttribute('data-application-produced', 'true')
    await expect(card.locator('.touchpoints-proof-line')).toContainText(
      /Application produced/i
    )

    project = await waitForProject(
      page,
      (p) => emailSignatureArtifacts(p).length >= 1
    )
    let arts = emailSignatureArtifacts(project)
    expect(arts.length).toBe(1)
    const art = arts[0]
    expect(art.group).toBe('application')
    expect(art.deliverable).toBe('emailSignature')
    expect(art.item || 'emailSignature').toBe('emailSignature')
    expect(art.rights || 'clientOwned').toBe('clientOwned')
    expect(art.dataUrl).toMatch(/^data:image\/png/i)

    const b64 = art.dataUrl.split(',')[1] || ''
    const pngBuf = Buffer.from(b64, 'base64')
    expect(isPngBytes(pngBuf), 'dataUrl must decode to PNG signature bytes').toBe(
      true
    )
    expect(pngBuf.length).toBeGreaterThan(50)
    const firstId = art.id

    await card.screenshot({
      path: path.join(shotDir, 'email-signature-after-produce.png'),
    })

    /* ── Re-produce: same row, not a second asset ───────────────────── */
    await card.getByTestId('email-signature-produce-btn').click()
    await expect(card.getByTestId('email-signature-produce-status')).toHaveText(
      /Application produced/i,
      { timeout: 30000 }
    )
    project = await waitForProject(
      page,
      (p) => {
        const list = emailSignatureArtifacts(p)
        return list.length === 1 && list[0]?.id === firstId && !!list[0]?.dataUrl
      },
      { timeout: 15000 }
    )
    arts = emailSignatureArtifacts(project)
    expect(arts.length).toBe(1)
    expect(arts[0].id).toBe(firstId)
    expect(isPngBytes(Buffer.from(arts[0].dataUrl.split(',')[1] || '', 'base64'))).toBe(
      true
    )

    /* ── C. Delivery · client package shows the asset ───────────────── */
    await stepByIdIn(await pathNav(page), 'deliver').click()
    await expect(headingForStep(page, 'deliver').first()).toBeVisible({
      timeout: 10000,
    })
    const packagePanel = page.locator('.package-panel')
    await expect(packagePanel).toBeVisible()
    await expect(packagePanel.locator('.package-asset-name').first()).toContainText(
      /email signature/i
    )
    await packagePanel.screenshot({
      path: path.join(shotDir, 'email-signature-package-asset.png'),
    })

    /* ── D. Package plan + files include the PNG bytes ──────────────── */
    project = await waitForProject(
      page,
      (p) => emailSignatureArtifacts(p).length === 1
    )
    const packForPlan = {
      projectName: project.name || project.logoWordmark || 'Brand',
      logoImage: project.logoImage || '',
      palette: project.palette || [],
      colorRoles: project.colorRoles || {},
      typeHeading: project.typeHeading,
      typeBody: project.typeBody,
      packageAssets: project.packageAssets || [],
      detective: project.detective || {},
    }
    const plan = packagePlan(packForPlan, {
      assets: packForPlan.packageAssets,
      includeBook: false,
    })
    const appFolder = plan.folders.find((f) => f.id === 'applications')
    expect(appFolder, 'packagePlan must open applications folder').toBeTruthy()
    expect(
      appFolder.files.some(
        (f) => f.kind === 'asset' && f.deliverable === 'emailSignature'
      )
    ).toBe(true)

    const { files: plannedFiles } = packageFiles(packForPlan, {
      assets: packForPlan.packageAssets,
      includeBook: false,
    })
    const plannedSig = plannedFiles.find(
      (f) =>
        f.base64 &&
        /\.png$/i.test(f.path) &&
        /APPLICATION|EmailSignature|email/i.test(f.path) &&
        f.content
    )
    expect(
      plannedSig,
      `planned files: ${plannedFiles.map((f) => f.path).join(', ')}`
    ).toBeTruthy()
    const plannedBuf = Buffer.from(plannedSig.content, 'base64')
    expect(isPngBytes(plannedBuf)).toBe(true)
    expect(plannedBuf.length).toBeGreaterThan(50)

    /* Real browser zip */
    await page.evaluate(() => {
      try {
        delete window.showSaveFilePicker
      } catch {
        window.showSaveFilePicker = undefined
      }
    })
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120000 }),
      packagePanel.getByRole('button', { name: /Build the client package/i }).click(),
    ])
    const dlPath = await download.path()
    expect(dlPath).toBeTruthy()
    const zipBuf = fs.readFileSync(dlPath)
    const zip = await JSZip.loadAsync(zipBuf)
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
    const shipped = names.filter((n) => {
      if (!/\.png$/i.test(n)) return false
      return (
        /APPLICATION/i.test(n) ||
        /EmailSignature|Email.?Signature|email.?signature/i.test(n)
      )
    })
    expect(
      shipped.length,
      `expected email-signature PNG in zip; files: ${names.join(', ')}`
    ).toBeGreaterThanOrEqual(1)

    const sigEntry = shipped[0]
    const sigBytes = await zip.files[sigEntry].async('uint8array')
    expect(isPngBytes(sigBytes)).toBe(true)
    expect(sigBytes.length).toBeGreaterThan(50)

    /* ── E. Persistence: leave and return ───────────────────────────── */
    await stepByIdIn(await pathNav(page), 'sketch').click()
    await expect(headingForStep(page, 'sketch').first()).toBeVisible({
      timeout: 10000,
    })
    /* Leaving and returning re-closes the engine disclosure, so the return
       trip has to open it too — the persistence claim is about the card's
       state, not about the disclosure remembering it. */
    await openTouchpointEngine(page)
    const cardAgain = page.locator('.touchpoints-card[data-touchpoint="email"]')
    await expect(cardAgain).toBeVisible()
    await expect(cardAgain).toHaveAttribute('data-application-produced', 'true')
    await expect(
      cardAgain.getByTestId('email-signature-produce-status')
    ).toHaveText(/Application produced/i)
    project = await readProject(page)
    expect(emailSignatureArtifacts(project).length).toBe(1)
    expect(emailSignatureArtifacts(project)[0].id).toBe(firstId)
  })
})
