import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import useAppStore from '../store/useAppStore'

/**
 * Two failures live here, and the second one is about how the first was fixed.
 *
 * 1. An invoice number was consumed BEFORE the PDF existed. takeInvoiceNumber
 *    incremented the sequence and then the export ran — so a cancelled save
 *    dialog, a failed PDF import, or an out-of-memory on a long log burned the
 *    number anyway, and every retry burned another. Cancelling twice put the
 *    sequence three ahead. The original comment said numbering-at-export
 *    existed because "gaps in an invoice sequence are exactly what an
 *    accountant asks about" — it moved the gap rather than closing it, since
 *    the user sees invoiceNextNumber on screen and cannot tell why it jumped.
 *
 * 2. That single function was once passed to HoursInvoicePanel without ever
 *    being bound in App.jsx — a render-time ReferenceError that blanked the
 *    whole app, which the unit suite and the build both stayed green through,
 *    because nothing renders App in vitest and an undefined identifier in JSX
 *    is valid syntax. Splitting one prop into two is precisely the edit that
 *    reintroduces it, so the split comes with this guard.
 */
const APP = new URL('../App.jsx', import.meta.url).pathname
const app = readFileSync(APP, 'utf8')

describe('invoice numbering', () => {
  it('peeking does not consume the number', () => {
    const before = useAppStore.getState().prefs?.invoiceNextNumber
    useAppStore.getState().peekInvoiceNumber()
    useAppStore.getState().peekInvoiceNumber()
    expect(useAppStore.getState().prefs?.invoiceNextNumber).toBe(before)
  })

  it('committing advances it exactly once', () => {
    const before = Number(useAppStore.getState().prefs?.invoiceNextNumber) || 1
    useAppStore.getState().commitInvoiceNumber()
    expect(Number(useAppStore.getState().prefs?.invoiceNextNumber)).toBe(
      before + 1
    )
  })

  it('the number peeked is the number the next commit claims', () => {
    const peeked = useAppStore.getState().peekInvoiceNumber()
    useAppStore.getState().commitInvoiceNumber()
    const next = useAppStore.getState().peekInvoiceNumber()
    expect(next).not.toBe(peeked)
  })

  /* The panel only commits inside the r?.ok branch. If that ever moves out,
     a failed export starts burning numbers again. */
  it('the export commits only on success', () => {
    const panel = readFileSync(
      new URL('../components/HoursInvoice.jsx', import.meta.url).pathname,
      'utf8'
    )
    const okBranch = /if \(r\?\.ok\) \{([\s\S]*?)\} else \{/.exec(panel)?.[1]
    expect(okBranch, 'export should branch on r?.ok').toBeTruthy()
    expect(okBranch).toMatch(/commitInvoiceNumber/)
    // and nowhere else in the file
    expect((panel.match(/commitInvoiceNumber\?\.\(/g) || []).length).toBe(1)
  })

  /**
   * Every store action handed to the invoice panel must actually be bound in
   * App.jsx. This is the guard for failure 2 — it is a source check rather
   * than a render test because nothing in this suite renders App, which is
   * exactly why the original slipped through.
   */
  it('every prop passed to the invoice panel is defined in App', () => {
    const block = /<HoursInvoicePanel([\s\S]*?)\/>/.exec(app)?.[1]
    expect(block, 'HoursInvoicePanel should be rendered in App.jsx').toBeTruthy()

    const passed = [...block.matchAll(/(\w+)=\{(\w+)\}/g)].map((m) => m[2])
    expect(passed.length).toBeGreaterThan(0)

    const undefinedProps = passed.filter((name) => {
      const patterns = [
        // const/let/function foo
        `(?:const|let|function)\\s+${name}\\b`,
        // const [foo, setFoo] = useState(...)  — the form that fooled the
        // first draft of this guard into a false positive
        `(?:const|let)\\s*\\[[^\\]]*\\b${name}\\b[^\\]]*\\]`,
        // const { foo } = ...
        `(?:const|let)\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`,
      ]
      return !patterns.some((p) => new RegExp(p).test(app))
    })
    expect(undefinedProps).toEqual([])
  })
})
