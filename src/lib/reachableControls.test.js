import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * Guards for controls that exist in the markup but cannot be reached.
 *
 * This is its own failure class, distinct from a broken control: nothing
 * throws, no test fails, the element is in the DOM and passes every query a
 * test can write. It is only invisible on screen. Both bugs below shipped and
 * survived review for exactly that reason, so both are asserted against the
 * source text rather than a rendered tree — a jsdom render has no layout, so
 * it cannot tell a 0px-wide button from a 40px one, which is precisely the
 * distinction that matters here.
 */

const here = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(resolve(here, '..', p), 'utf8')

/**
 * Source with block and line comments removed.
 *
 * The "must not contain" assertions below need this. Several of them name the
 * exact string that was removed, and the comment explaining WHY it was removed
 * quotes it — so a plain read matches the explanation and reports the bug as
 * still present. Recording the reasoning next to the code is the house style
 * here, so the test has to read code rather than ask the comments to stay
 * vague.
 */
const readCode = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

describe('a switch is never invisible', () => {
  it('gives .pref-switch an explicit width', () => {
    /* The bug: `.pref-switch` set a height and no width. Its knob is
       `position: absolute` and its state text is `.sr-only`, so it has no
       content to be sized by and collapsed to 0px — a labelled row with
       nothing beside it. Break lock on the Timer screen was unreachable this
       way, and Settings' switches only looked fine because
       `.settings-studio .pref-switch` supplied its own width, hiding the base
       defect rather than fixing it.

       Asserted on the base rule specifically. A width that only arrives from
       an ancestor class is the bug, not the fix. */
    const css = read('styles/shell.css')
    const base = /(^|\n)\.pref-switch\s*\{([\s\S]*?)\n\}/.exec(css)
    expect(base, '.pref-switch base rule not found in shell.css').toBeTruthy()
    expect(base[2]).toMatch(/(^|\s)width:/)
  })
})

describe('a crash shows a screen, not a white page', () => {
  const rendered = (src) => /<ErrorBoundary[\s>]/.test(src)

  it('renders the boundary, rather than only importing it', () => {
    /* The bug: ErrorBoundary was imported into App.jsx and used zero times, so
       every render crash the app ever had produced a blank page. An import is
       not a mount, and nothing else in the suite could tell the difference. */
    expect(rendered(read('main.jsx')), 'main.jsx imports but never renders ErrorBoundary').toBe(true)
    expect(rendered(read('App.jsx')), 'App.jsx imports but never renders ErrorBoundary').toBe(true)
  })

  it('keys the inner boundary so navigating away clears it', () => {
    /* Without the key the boundary stays broken after you leave the screen
       that threw, which is a worse trap than the white page because it looks
       deliberate. */
    expect(read('App.jsx')).toMatch(/<ErrorBoundary[\s\S]{0,200}key=\{activeView\}/)
  })

  it('promises only what the store can actually keep', () => {
    /* A quota failure is swallowed to a console error, so the app can be in a
       not-saving state at the moment it crashes. Past tense stays true there;
       "your work is saved" would be a lie discovered later. */
    const src = readCode('components/error/ErrorBoundary.jsx')
    expect(src).not.toMatch(/your work is saved/i)
    expect(src).toMatch(/still here/i)
  })

  it('claims no support channel that does not exist', () => {
    // Single-user app. "Our team has been notified" was never true.
    const src = readCode('components/error/ErrorBoundary.jsx')
    expect(src).not.toMatch(/team has been notified|contact support/i)
  })
})

describe('Settings has exactly one door, in the sidebar Studio band', () => {
  const app = read('App.jsx')

  it('reaches Settings from the Studio band', () => {
    /* History, so the next rewrite keeps the invariant rather than the
       markup: Settings' door has moved twice — out of a Tools menu that
       clipped its own bottom rows, onto a header button (desktop) plus a
       mobile-only Tools-menu mirror, and now into the sidebar's Studio band,
       which the ☰ drawer reaches on mobile. ONE door, the same door, at
       every width — the two-door split existed only because the old header
       row had no room on phones.

       Matches the label being DERIVED, not spelled. This asserted the
       literal word "Settings" once, and a correct change turned it red —
       tests have to derive too. */
    expect(app).toMatch(
      /journey-goto-row[\s\S]{0,300}setActiveView\('settings'\)[\s\S]{0,260}toolsLabelForView\('settings'\)/
    )
  })

  it('has no second door left behind', () => {
    /* The old desktop header button and the mobile-only Tools-menu mirror
       must stay gone — two doors to one place is a which-one fork, and a
       header-icon-btn would be invisible on phones anyway. */
    expect(app).not.toMatch(/header-icon-btn/)
    expect(app).not.toMatch(/more-menu-item-mobile-only/)
  })

  it('keeps theme and sign-out on the Settings page, not in two places', () => {
    const settings = read('views/SettingsView.jsx')
    expect(settings).toMatch(/toggleTheme\(\)/)
    expect(settings).toMatch(/handleSignOut/)
    expect(settings).toMatch(/Keyboard shortcuts/)
  })
})

describe('first-run no longer gates on a New project modal', () => {
  const app = readCode('App.jsx')

  it('does not mount the onboard New project dialog', () => {
    /* Creation is Home → create intake (or sidebar +), not a blocking modal. */
    expect(app).not.toMatch(/onboard-overlay/)
    expect(app).not.toMatch(/finishOnboarding/)
    expect(app).not.toMatch(/setShowOnboarding\(true\)/)
  })

  it('invents no starter task seed for a blank first step', () => {
    expect(app).not.toMatch(/Write one design step you can finish/)
  })
})
