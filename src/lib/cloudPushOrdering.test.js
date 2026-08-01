import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * A push you have given up on must not still land.
 *
 * pushWorkspace writes a WHOLE ROW (upsert onConflict: 'user_id'), so ordering
 * is not a nicety here — a late reply replaces the entire workspace payload.
 * Three things made that reachable:
 *
 *  - The debounce cleared the TIMER, but once it fired the upsert ran for up
 *    to 25s while the user kept typing, so the next debounce could start a
 *    second push underneath the first. Completion order is not guaranteed, so
 *    an older snapshot could resolve last and overwrite everything newer.
 *    Last-response-wins, on exactly the flaky-mobile case the timeouts were
 *    sized for.
 *  - withTimeout raced a deadline but never cancelled the request, so a push
 *    already reported to the user as failed could still land afterwards.
 *  - Three separate buttons called pushWorkspace directly (auto-push, the
 *    footer retry, Settings' Sync), each able to race the others.
 *
 * These are source-level assertions because the behaviour lives in App.jsx,
 * which nothing in this suite renders — the same blind spot that let an
 * unbound prop ship a render-time ReferenceError once before. A guard that
 * only exists where the tests already look is not a guard.
 */
const read = (rel) =>
  readFileSync(new URL(rel, import.meta.url).pathname, 'utf8')

const app = read('../App.jsx')
const cloudSync = read('./cloudSync.js')
const settings = read('../views/SettingsView.jsx')

describe('cloud push ordering', () => {
  it('serialises pushes behind an in-flight flag', () => {
    expect(app).toMatch(/pushInFlightRef/)
    // Re-entry while one is running must queue, not start a second.
    expect(app).toMatch(/if \(pushInFlightRef\.current\)[\s\S]{0,120}pushQueuedRef\.current = true/)
  })

  it('coalesces a burst into one trailing push rather than dropping it', () => {
    /* Queueing without a trailing run is its own bug: the last edits before a
       burst ends would never be sent. */
    expect(app).toMatch(/while \(pushQueuedRef\.current\)/)
  })

  it('ignores the reply from a superseded push', () => {
    expect(app).toMatch(/pushGenRef/)
    expect(app).toMatch(/gen !== pushGenRef\.current/)
  })

  it('cancels the request when its deadline passes', () => {
    // The controller must be wired into the query, not just constructed.
    expect(cloudSync).toMatch(/new AbortController\(\)/)
    expect(cloudSync).toMatch(/\.abortSignal\(controller\.signal\)/)
    expect(cloudSync).toMatch(/controller\?\.abort\(\)/)
  })

  /* Every entry point must share the one path, or the guard only covers the
     route that happened to be fixed. */
  it('leaves no button calling pushWorkspace directly', () => {
    for (const [name, src] of [
      ['SettingsView', settings],
    ]) {
      expect(src, `${name} should not push directly`).not.toMatch(
        /pushWorkspace\(/
      )
    }
    /* App.jsx keeps exactly two direct calls, both legitimate:
       - the one INSIDE runCloudPush, which is the single serialised path
       - the one-shot seed during hydration, which runs before
         cloudSyncReady is set and so cannot overlap the debounced push
       A third would mean a new caller has gone around the guard. */
    const direct = (app.match(/await pushWorkspace\(/g) || []).length
    expect(direct).toBe(2)

    const pusher = /const runCloudPush = useCallback\([\s\S]*?\n  \}, \[/.exec(app)?.[0] || ''
    expect(pusher, 'runCloudPush must be the one that pushes').toMatch(
      /await pushWorkspace\(/
    )
  })

  /**
   * Declaration order, checked deliberately.
   *
   * runCloudPush is named in the debounced effect's dependency array, which is
   * evaluated at render time — so declaring it after that effect is a temporal
   * dead zone ReferenceError, not a style question. It happened while writing this
   * change and the build did not catch it, because a TDZ error is valid syntax.
   */
  it('declares runCloudPush before anything references it', () => {
    const declared = app.search(/const runCloudPush = useCallback/)
    const usedInEffect = app.search(/void runCloudPush\(\)/)
    const usedInDeps = app.search(/^\s+runCloudPush,$/m)
    expect(declared).toBeGreaterThan(-1)
    expect(usedInEffect).toBeGreaterThan(declared)
    expect(usedInDeps).toBeGreaterThan(declared)
  })
})
