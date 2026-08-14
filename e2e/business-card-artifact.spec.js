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
 * Production contract: businessCard Touchpoint can produce a REAL application
 * artifact (PDF bytes in packageAssets), not mock/metadata theatre.
 *
 * CRITICAL negatives:
 *   - "This mock is good" alone must NOT create packageAssets
 *   - ApplicationCheck alone must NOT create packageAssets
 */

const STORAGE_KEY = 'creative-companion-storage'

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

/** Persist is debounced (~400ms); poll until the predicate holds. */
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

/**
 * Contact is required by the same Stationery path the generator reuses.
 * Set it through Delivery · Stationery UI so we never race the debounced
 * localStorage write that overwrites evaluate()-seeded fields.
 */
async function seedContactAndIdentity(page) {
  /* Identity: committed wordmark + non-factory type via Design fields if reachable.
     Minimum for production is contact + whatever Identity the project holds. */
  await stepByIdIn(await pathNav(page), 'design').click()
  await expect(headingForStep(page, 'design').first()).toBeVisible({
    timeout: 10000,
  })
  const wordmark = page.locator('#logo-wordmark, input[name="logoWordmark"], [data-field="logoWordmark"]').first()
  if (await wordmark.count()) {
    await wordmark.fill('Harbor Hearth')
  } else {
    /* Fall back: any visible wordmark/name field on Identity. */
    const wm = page.getByLabel(/wordmark/i).first()
    if (await wm.count()) await wm.fill('Harbor Hearth')
  }

  await stepByIdIn(await pathNav(page), 'deliver').click()
  await expect(headingForStep(page, 'deliver').first()).toBeVisible({
    timeout: 10000,
  })
  const stationery = page.locator('details.assets-stationery, details.deliver-advanced.assets-stationery')
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

async function openBusinessCardCard(page) {
  const pathNavEl = await pathNav(page)
  await stepByIdIn(pathNavEl, 'sketch').click()
  await expect(headingForStep(page, 'sketch').first()).toBeVisible({
    timeout: 10000,
  })

  /* Print surface maps to businessCard + print. Prefer adding if empty. */
  const existing = page.locator('.touchpoints-card[data-touchpoint="businessCard"]')
  if ((await existing.count()) === 0) {
    const printBtn = page.locator('.touchpoints-quick button').filter({ hasText: /Print/i })
    if (await printBtn.count()) {
      await printBtn.first().click()
    } else {
      /* Surfaces already present from brief — open first card if it's the card. */
      await page.locator('.touchpoints-quick button').first().click()
    }
  }
  await openTouchpointEngine(page)
  const card = page.locator('.touchpoints-card[data-touchpoint="businessCard"]').first()
  await expect(card).toBeVisible({ timeout: 8000 })
  return card
}

function packageAssetsFromProject(project) {
  return Array.isArray(project?.packageAssets) ? project.packageAssets : []
}

function businessCardArtifacts(project) {
  return packageAssetsFromProject(project).filter(
    (a) =>
      a &&
      a.deliverable === 'businessCard' &&
      a.group === 'application' &&
      /^data:application\/pdf/i.test(String(a.dataUrl || ''))
  )
}

test.describe('business card real application artifact', () => {
  test('mock / check do not produce; Produce creates package PDF that ships', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000)
    const gate = await unlockAndOnboard(page, { name: 'BC Artifact' })
    skipIfCloud(test, gate)

    await seedContactAndIdentity(page)
    const card = await openBusinessCardCard(page)

    /* ── A. Before production ───────────────────────────────────────── */
    await expect(card.locator('.tp-mock')).toBeVisible()
    await expect(card.getByTestId('business-card-produce-status')).toHaveText(
      /Application not produced yet/i
    )
    await expect(card).toHaveAttribute('data-application-produced', 'false')

    let project = await readProject(page)
    expect(businessCardArtifacts(project)).toHaveLength(0)

    const shotDir = testInfo.outputDir
    await fs.promises.mkdir(shotDir, { recursive: true })
    await card.screenshot({
      path: path.join(shotDir, 'business-card-before-produce.png'),
    })

    /* Produce must be available (contact seeded into committed Identity). */
    await expect(card.getByTestId('business-card-produce-btn')).toBeEnabled()

    /* ── F-negative: mock good alone ────────────────────────────────── */
    await card.getByRole('button', { name: /This mock is good/i }).click()
    await expect(card.getByRole('button', { name: /Mock is good/i })).toBeVisible()
    project = await waitForProject(
      page,
      (p) => p?.touchpointApps?.businessCard?.done === true
    )
    expect(businessCardArtifacts(project)).toHaveLength(0)
    await expect(card.getByTestId('business-card-produce-status')).toHaveText(
      /Application not produced yet/i
    )

    /* ── F-negative: ApplicationCheck alone ─────────────────────────── */
    const checkInput = card.locator('.app-check input[type="file"]')
    if (await checkInput.count()) {
      await checkInput.setInputFiles({
        name: 'sample-card.pdf',
        mimeType: 'application/pdf',
        buffer: colourPdf([{ hex: '#1B4C7E' }]),
      })
      await expect(card.locator('.app-check-line')).toBeVisible({ timeout: 15000 })
    }
    await page.waitForTimeout(500)
    project = await readProject(page)
    expect(businessCardArtifacts(project)).toHaveLength(0)
    /* Sample may exist as metadata only — never as package PDF. */
    if (project?.touchpointApps?.businessCard?.check) {
      expect(project.touchpointApps.businessCard.check.dataUrl).toBeUndefined()
      expect(project.touchpointApps.businessCard.check.fileName).toBeTruthy()
    }

    /* ── B. Explicit produce ────────────────────────────────────────── */
    await card.getByTestId('business-card-produce-btn').click()
    await expect(card.getByTestId('business-card-produce-status')).toHaveText(
      /Application produced/i,
      { timeout: 30000 }
    )
    await expect(card).toHaveAttribute('data-application-produced', 'true')
    await expect(card.locator('.touchpoints-proof-line')).toContainText(
      /Application produced/i
    )

    project = await waitForProject(
      page,
      (p) => businessCardArtifacts(p).length >= 1
    )
    const arts = businessCardArtifacts(project)
    expect(arts.length).toBeGreaterThanOrEqual(1)
    const art = arts[0]
    expect(art.group).toBe('application')
    expect(art.deliverable).toBe('businessCard')
    expect(art.rights || 'clientOwned').toBe('clientOwned')
    expect(art.dataUrl).toMatch(/^data:application\/pdf/i)

    const b64 = art.dataUrl.split(',')[1] || ''
    const pdfBuf = Buffer.from(b64, 'base64')
    expect(pdfBuf.slice(0, 4).toString()).toBe('%PDF')
    expect(pdfBuf.length).toBeGreaterThan(500)

    await card.screenshot({
      path: path.join(shotDir, 'business-card-after-produce.png'),
    })

    /* ── C. Delivery · client package shows the asset ───────────────── */
    await stepByIdIn(await pathNav(page), 'deliver').click()
    await expect(headingForStep(page, 'deliver').first()).toBeVisible({
      timeout: 10000,
    })
    const packagePanel = page.locator('.package-panel')
    await expect(packagePanel).toBeVisible()
    await expect(packagePanel.locator('.package-asset-name').first()).toContainText(
      /business card/i
    )
    await packagePanel.screenshot({
      path: path.join(shotDir, 'business-card-package-asset.png'),
    })

    /* ── D. Package plan + files include the PDF bytes ────────────────
       Same pure path downloadClientPackage uses before zipping. */
    project = await waitForProject(
      page,
      (p) => businessCardArtifacts(p).length >= 1
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
      appFolder.files.some((f) => f.kind === 'asset' && f.deliverable === 'businessCard')
    ).toBe(true)

    const { files: plannedFiles } = packageFiles(packForPlan, {
      assets: packForPlan.packageAssets,
      includeBook: false,
    })
    const plannedCard = plannedFiles.find(
      (f) =>
        f.base64 &&
        /APPLICATION|BusinessCard|business/i.test(f.path) &&
        f.content
    )
    expect(plannedCard, `planned files: ${plannedFiles.map((f) => f.path).join(', ')}`).toBeTruthy()
    const plannedBuf = Buffer.from(plannedCard.content, 'base64')
    expect(plannedBuf.slice(0, 4).toString()).toBe('%PDF')
    expect(plannedBuf.length).toBeGreaterThan(500)

    /* Real browser zip: disable File System Access so anchor download fires
       (cancelled picker returns early without a download). */
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
      if (!/\.pdf$/i.test(n)) return false
      return (
        /APPLICATION/i.test(n) ||
        /BusinessCard|Business.?Card|business.?card/i.test(n)
      )
    })
    expect(
      shipped.length,
      `expected business-card PDF in zip; files: ${names.join(', ')}`
    ).toBeGreaterThanOrEqual(1)

    const cardEntry = shipped[0]
    const cardBytes = await zip.files[cardEntry].async('uint8array')
    expect(String.fromCharCode(...cardBytes.slice(0, 4))).toBe('%PDF')
    expect(cardBytes.length).toBeGreaterThan(500)

    /* ── E. Persistence: leave and return ───────────────────────────── */
    await stepByIdIn(await pathNav(page), 'sketch').click()
    await expect(headingForStep(page, 'sketch').first()).toBeVisible({
      timeout: 10000,
    })
    /* Leaving and returning re-closes the engine disclosure, so the return
       trip has to open it too — the persistence claim is about the card's
       state, not about the disclosure remembering it. */
    await openTouchpointEngine(page)
    const cardAgain = page.locator('.touchpoints-card[data-touchpoint="businessCard"]')
    await expect(cardAgain).toBeVisible()
    await expect(cardAgain).toHaveAttribute('data-application-produced', 'true')
    await expect(cardAgain.getByTestId('business-card-produce-status')).toHaveText(
      /Application produced/i
    )
    project = await readProject(page)
    expect(businessCardArtifacts(project).length).toBeGreaterThanOrEqual(1)

  })
})
