import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The accessibility floor the project already commits to, pinned so it can't
 * quietly slip back.
 *
 * Each of these was live when Phase 9 started, and each hits the surface with
 * the least margin for error — a dialog a keyboard user is trapped against, a
 * 20px delete button on a stranger's phone, an error a screen reader never
 * hears. None of it is visible in a screenshot, which is why it needs a test
 * rather than review.
 */
const read = (rel) =>
  readFileSync(new URL(`../${rel}`, import.meta.url).pathname, 'utf8')

describe('dialogs that claim aria-modal actually manage focus', () => {
  /* aria-modal="true" tells assistive tech the rest of the page is
     unavailable. Without a trap, Tab walks straight out into the page it just
     declared unavailable — the worst combination, not a missing nicety. These
     four declared the attribute and implemented none of it. */
  const DIALOGS = [
    'features/billing/WorkLogPanel.jsx',
    'features/billing/HoursInvoice.jsx',
  ]

  for (const rel of DIALOGS) {
    it(`${rel} traps focus via useModalFocus`, () => {
      const src = read(rel)
      expect(src, `${rel} declares aria-modal`).toMatch(/aria-modal/)
      expect(src, `${rel} must use the shared focus hook`).toMatch(
        /useModalFocus\(/
      )
      // onClose is what wires Escape inside the hook — a trap with no keyboard
      // way out is the wrong half of the pattern.
      expect(src).toMatch(/useModalFocus\(open,[\s\S]{0,120}onClose/)
    })
  }

  it('RunningTodoAddModal traps focus (Escape stays with its safe-close handler)', () => {
    const src = read('features/billing/RunningTodo.jsx')
    expect(src).toMatch(/useModalFocus\(open,/)
    // Deliberately NOT onClose here: the component's own Escape handler does a
    // safe close that captures half-typed text, which the hook's plain onClose
    // would discard. Trap and restore only.
    expect(src).toMatch(/if \(e\.key === 'Escape'\)/)
  })

})

describe('touch targets reach the 44px floor', () => {
  const css = read('styles/shell.css')

  /* --tap-min (44px) was defined and unused. Each of these expanded the hit
     area to it without moving the visual, via a centred pseudo-element. */
  const EXPANDED = ['.brief-attach-remove', '.done-undo', '.journey-projects-add']

  for (const sel of EXPANDED) {
    it(`${sel} expands its hit area to --tap-min`, () => {
      const escaped = sel.replace('.', '\\.')
      const re = new RegExp(
        `${escaped}::after\\s*\\{[^}]*width:\\s*var\\(--tap-min\\)[^}]*height:\\s*var\\(--tap-min\\)`
      )
      expect(css, `${sel} should have a --tap-min hit area`).toMatch(re)
    })
  }

  it('--tap-min is 44px', () => {
    expect(css).toMatch(/--tap-min:\s*44px/)
  })
})

describe('client-facing failures reach a screen reader', () => {
  it('the client portal announces its errors', () => {
    const src = read('features/client-portal/PublicClientPortal.jsx')
    // Every public-fill-error line must carry role="alert" — an error a
    // stranger on a phone cannot hear is an error they will not act on.
    const errorLines = src.match(/className="public-fill-error"[^>]*>/g) || []
    expect(errorLines.length).toBeGreaterThan(0)
    for (const line of errorLines) {
      expect(line, `error line missing role=alert: ${line}`).toMatch(
        /role="alert"/
      )
    }
  })

  it('a failed brief upload is announced, not just shown', () => {
    const src = read('features/brief/BriefAttach.jsx')
    expect(src).toMatch(/failedCount/)
    expect(src).toMatch(/role="alert"/)
  })

  it('the brief tip is associated with its field', () => {
    const src = read('features/brief/ClientBriefFields.jsx')
    expect(src).toMatch(/const tipId =/)
    expect(src).toMatch(/aria-describedby=\{tipId\}/)
    // And the label no longer points at a non-existent id for group fields.
    expect(src).toMatch(/htmlFor=\{singleControl \? fieldId : undefined\}/)
  })
})

describe('single-key shortcuts are focus-scoped (WCAG 2.1.4)', () => {
  it('the flow-key handler goes quiet when focus is on another control', () => {
    const src = read('App.jsx')
    // The gate: fire only in the workspace resting state (in #main-content or
    // the document body), never while focus sits on another control.
    expect(src).toMatch(/getElementById\('main-content'\)/)
    expect(src).toMatch(/const inWorkspace =/)
    expect(src).toMatch(/if \(!inWorkspace\) return/)
  })
})

describe('the running to-do panel is a drawer, not a false modal', () => {
  const src = read('features/billing/RunningTodo.jsx')

  it('the browsing panel is a complementary landmark, not aria-modal', () => {
    // The <aside> panel had role="dialog" + aria-modal="true" with no focus
    // trap — a lie to assistive tech (page announced inert; Tab walks out).
    // CLAUDE.md calls it a drawer; it must read as one.
    expect(src).toMatch(/className="running-todo-panel"/)
    expect(src).toMatch(/role="complementary"/)
    // The one true modal in the file — the centered "Anything to add?" prompt —
    // keeps aria-modal; the drawer must not reintroduce it.
    const modals = src.match(/aria-modal="true"/g) || []
    expect(modals.length, 'only the add-prompt is a modal').toBe(1)
  })

  it('opening the drawer moves focus in and restores it on close', () => {
    // Object permanence / interruption recovery: land on the list you opened,
    // return to the trigger when it closes. No trap — tabbing out is expected.
    expect(src).toMatch(/const panelRef =/)
    expect(src).toMatch(/panelRef\.current\?\.focus\?\.\(\)/)
    expect(src).toMatch(/restoreRef\.current\?\.focus\?\.\(\)/)
  })
})

/* The progress HUD this guarded is deleted, along with the XP ledger behind
   it — PRODUCT.md §21 bans XP, levels and streaks by name. Replaced with a
   guard against the whole thing coming back rather than dropped silently:
   the mechanic was reachable through the Helper's chat pings even while the
   HUD itself sat behind a flag nothing could set, so "it is off by default"
   was not the protection it looked like. */
describe('the XP ledger stays gone', () => {
  const roots = ['App.jsx', 'features/helper/BuddyMate.jsx']

  it('no source awards points, levels, badges or a day streak', () => {
    for (const rel of roots) {
      const src = read(rel)
      expect(src).not.toMatch(/awardAndBroadcast|buddyGame|dayStreak|DAILY_XP_GOAL/)
    }
  })
})
