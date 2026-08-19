import { test, expect } from '@playwright/test'
import { openTool, skipIfCloud, unlockAndOnboard } from './helpers.js'

/**
 * THE STUDIO HALF OF THE PHASE 6 LOOP, IN A REAL BROWSER.
 *
 * WHAT THIS FILE CAN PROVE, AND WHAT IT CANNOT. There is no Supabase in e2e —
 * `brief-client-link.spec.js` records the same limit — and the client portal is
 * cloud-only by construction: `respondToPortalStep` returns CLOUD_REQUIRED
 * before it reaches a network call. So the client's half of the round trip
 * (respond, supersede, round 2 opens, round 1 stays readable) is NOT driven
 * here. It is covered where it actually lives: the gates and the lifecycle in
 * `portalRpcGates.test.js` and `approvalRecordOwnership.test.js` against the SQL
 * that ships, and the projection in `presentationReviewArtifact.test.js`.
 *
 * Driving the client half would need a live Supabase project and anon key in
 * the e2e environment. Nothing here fakes it — a test that stubbed the RPC
 * would assert that the stub works.
 *
 * What a browser IS needed for is the half the unit tests cannot see: that the
 * Presentation workspace is reachable, that Send for Review actually writes an
 * immutable Version into the persisted blob, and that the frozen preview reads
 * from that Version rather than from live Directions. This repo has shipped a
 * whole stop whose store field had no writer anywhere in `src/` while every
 * check stayed green — see `touchpoints.spec.js`. That is the risk this covers.
 */

const STORE_KEY = 'creative-companion-storage'

const projectState = (page) =>
  page.evaluate((key) => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '{}')
      const projects = raw?.state?.projects || []
      const id = raw?.state?.currentProjectId
      return projects.find((p) => p.id === id) || projects[0] || null
    } catch {
      return null
    }
  }, STORE_KEY)

test('Send for Review freezes a Presentation Version that survives a live edit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const gate = await unlockAndOnboard(page, {
    name: 'Phase Six',
    testerName: 'T',
    expectOnboardDialog: true,
  })
  skipIfCloud(test, gate)
  await expect(page.locator('.cc-stage').first()).toBeVisible({ timeout: 15000 })

  /* A Direction to present. Seeded through the store rather than by clicking
     through Directions: this test is about the freeze, and reproducing the
     whole authoring flow here would make it fail for reasons that belong to
     another spec. The shape is exactly what `directionsWithSlot` writes.

     `addInitScript` rather than `evaluate`-then-reload, and the difference is
     not cosmetic: the first attempt wrote to localStorage while the app was
     running, and Zustand's persist wrote its own state straight back over it
     before the reload could read it. An init script runs before the page's own
     scripts, so the value is in place by the time the store hydrates. */
  await page.addInitScript(
    ({ key, dirs }) => {
      try {
        const raw = JSON.parse(localStorage.getItem(key) || '{}')
        if (!raw?.state?.projects?.length) return
        const id = raw.state.currentProjectId
        raw.state.projects = raw.state.projects.map((p) =>
          p.id === id ? { ...p, directions: dirs } : p
        )
        localStorage.setItem(key, JSON.stringify(raw))
      } catch {
        /* Nothing persisted yet — the assertions below will say so. */
      }
    },
    {
      key: STORE_KEY,
      dirs: [
        { recordId: 'dir_e2e_a', id: 'a', slot: 'a', title: 'Quiet Sans', refs: {} },
        { recordId: 'dir_e2e_b', id: 'b', slot: 'b', title: 'Loud Serif', refs: {} },
      ],
    }
  )
  await page.reload()
  await expect(page.locator('.cc-stage').first()).toBeVisible({ timeout: 15000 })

  await openTool(page, 'Presentation')
  const view = page.locator('.cc-stage, main').first()
  await expect(view).toBeVisible({ timeout: 10000 })

  /* Both Directions are offered to the presentation. If this fails the
     workspace is not reading `project.directions`, which no unit test sees. */
  await expect(page.getByText('Quiet Sans').first()).toBeVisible({ timeout: 10000 })

  /* Include one, then send. */
  await page.getByRole('button', { name: /^Include$/i }).first().click()

  const send = page.getByRole('button', { name: /send for review/i }).first()
  await expect(send).toBeEnabled({ timeout: 5000 })
  await send.click()

  /* The freeze landed, and it landed as the right kind of thing. */
  await expect
    .poll(
      async () => {
        const p = await projectState(page)
        return (p?.documentVersions || []).filter(
          (v) => v?.freezeEvent === 'sentForReview'
        ).length
      },
      { timeout: 10000, message: 'Send for Review wrote no Presentation Version' }
    )
    .toBe(1)

  const after = await projectState(page)
  const version = after.documentVersions.find((v) => v.freezeEvent === 'sentForReview')
  expect(version.identitySnapshotId, 'a Version with no snapshot to read').toBeTruthy()
  expect(version.templateId).toBe('dtpl_builtin_presentation')
  expect(version.composition.length).toBeGreaterThan(0)
  const frozenLabels = version.composition.map((c) => c.label)
  const frozenId = version.documentVersionId

  /* THE POINT OF THE WHOLE PHASE. Rename the Direction in live state and the
     frozen composition must not move — because that composition is what a
     client is looking at, and work cannot change under an answer in progress.

     Seeded through `addInitScript` again, for the same reason as the first
     one: a plain `evaluate` write races the store's own persist. */
  await page.addInitScript((key) => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '{}')
      if (!raw?.state?.projects?.length) return
      const id = raw.state.currentProjectId
      raw.state.projects = raw.state.projects.map((p) =>
        p.id === id
          ? {
              ...p,
              directions: (p.directions || []).map((d) => ({
                ...d,
                title: `RENAMED ${d.recordId}`,
              })),
            }
          : p
      )
      localStorage.setItem(key, JSON.stringify(raw))
    } catch {
      /* Nothing to rename — the assertions below will say so. */
    }
  }, STORE_KEY)
  await page.reload()
  /* Not `.cc-stage`: the reload restores the Presentation TOOL, which is not a
     stage. Waiting for the wrong shell element here is what the first run of
     this test actually failed on. */
  await expect(page.locator('.review-studio')).toBeVisible({ timeout: 15000 })

  /* The rename really did land in live state, so the assertion below is a
     genuine comparison rather than two copies of an unchanged project. */
  await expect
    .poll(async () => {
      const p = await projectState(page)
      return (p?.directions || []).every((d) => /^RENAMED /.test(d.title || ''))
    }, { timeout: 10000, message: 'the rename never reached live state' })
    .toBe(true)

  const reloaded = await projectState(page)
  const stillFrozen = reloaded.documentVersions.find(
    (v) => v.documentVersionId === frozenId
  )
  expect(stillFrozen, 'the Version was dropped by hydration').toBeTruthy()
  expect(
    stillFrozen.composition.map((c) => c.label),
    'a live rename reached the frozen composition'
  ).toEqual(frozenLabels)
  expect(JSON.stringify(stillFrozen)).not.toContain('RENAMED')
})
