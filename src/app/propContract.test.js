/**
 * Every prop a view declares must actually be delivered to it.
 *
 * This exists because a whole screen was silently blank and nothing caught it.
 * `SketchView` (the Flow view) reads its entire contents from props — it never
 * touches the store for tasks — and declared 56 of them. `MainOutlet` passed
 * SIX. So `deskTasks`, `nextTask`, `doneTasks` and `queueTasks` all fell back
 * to their empty defaults, and the view rendered with no task list, no
 * next-step card and no capture box. The app did not crash. The build was
 * clean. All 872 unit tests passed. Nothing in vitest renders these views, so
 * nothing noticed.
 *
 * The same audit immediately found five more views in the same state, which is
 * the real argument for a test over a fix: this is not one mistake, it is a
 * drift that recurs. A default value is exactly what makes it silent — an
 * undeclared default turns "you forgot to wire this" into "this feature is
 * off", and those look identical from the outside.
 *
 * WHAT THIS CHECKS. For each view rendered in `MainOutlet`, every name in its
 * destructured props list appears as a prop at its JSX call site. It is
 * deliberately dumb: no rendering, no types, just "declared" against
 * "delivered". That is enough, because every instance of this bug so far has
 * been a name that was simply never passed.
 *
 * WHAT IT DOES NOT CHECK: whether the value is correct, or whether an unused
 * prop is still declared. Dead declarations are the mirror-image mess (five
 * views carried twelve orphaned timer props each after their chrome was
 * removed) but they are harmless where this is not, so they are not failed on.
 *
 * HOW TO SATISFY THIS TEST when it fails on you: pass the prop. If the view no
 * longer needs it, delete it from the destructure — do not add it to the
 * exemptions below. Exemptions are for props with a genuine in-component
 * fallback, and each one has to say what the fallback is.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outlet = readFileSync(join(root, 'app/MainOutlet.jsx'), 'utf8')

/**
 * Props a view may declare without MainOutlet passing them, with the reason.
 * Anything here must degrade to a real behaviour, not to a blank screen.
 */
const EXEMPT = {
  // SketchView:131 — `const captureStep = handleCapture || addQuickTask`.
  // A caller may override how capture is handled; the default path is wired.
  SketchView: { handleCapture: 'falls back to addQuickTask' },
}

/** Views MainOutlet renders, by component name. */
const VIEWS = [
  'HomeView',
  'DefineView',
  'ResearchView',
  'DesignView',
  'SketchView',
  'DeliverView',
  'SparkView',
  'InsightsView',
  'CalendarView',
  'ClientsView',
  'ClientRecordView',
  'DeskView',
  'ReviewView',
  'SettingsView',
]

/** The names a component destructures out of its props. */
function declaredProps(comp) {
  const path = join(root, `views/${comp}.jsx`)
  if (!existsSync(path)) return null
  const src = readFileSync(path, 'utf8')
  const m =
    new RegExp(
      `function ${comp}\\(props\\)\\s*\\{\\s*const \\{([\\s\\S]*?)\\n\\s*\\} = props`
    ).exec(src) ||
    new RegExp(`function ${comp}\\(\\{([\\s\\S]*?)\\n\\}\\)`).exec(src)
  if (!m) return null
  return m[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//') && !l.startsWith('*'))
    .map((l) => l.split(/[=:]/)[0].trim())
    .filter((n) => /^[A-Za-z_$][\w$]*$/.test(n))
}

/** The props MainOutlet actually hands that view at its call site. */
function deliveredProps(comp) {
  const open = outlet.indexOf(`<${comp}`)
  if (open === -1) return null
  const close = outlet.indexOf('/>', open)
  return new Set(
    [...outlet.slice(open, close).matchAll(/(\w+)=\{/g)].map((m) => m[1])
  )
}

describe('every view is handed the props it destructures', () => {
  it('finds the views it claims to check, so it cannot pass vacuously', () => {
    // The failure mode this guards: a rename makes every lookup return null,
    // every loop body skips, and the suite reports green while checking zero.
    const found = VIEWS.filter((v) => declaredProps(v) && deliveredProps(v))
    expect(found.length).toBeGreaterThanOrEqual(10)
  })

  for (const comp of VIEWS) {
    it(`${comp} receives everything it reads`, () => {
      const declared = declaredProps(comp)
      const delivered = deliveredProps(comp)
      if (!declared || !delivered) return // not rendered by MainOutlet

      const exempt = EXEMPT[comp] || {}
      const missing = declared.filter((n) => !delivered.has(n) && !exempt[n])

      expect(
        missing,
        `${comp} destructures ${missing.length} prop(s) MainOutlet never passes, ` +
          `so they silently take their default value: ${missing.join(', ')}`
      ).toEqual([])
    })
  }
})
