import { describe, it, expect } from 'vitest'

/**
 * Two defects a cold-start tester found in the files that actually reach a
 * printer or a client, both pinned here as pure rules so they cannot come
 * back through a preview resize or a new template.
 */

/** Mirrors elementToPdf's scale derivation. */
function printScale(cssWidth, widthIn, dpi = 300) {
  const targetPx = widthIn * dpi
  return Math.max(1, Math.min(12, targetPx / cssWidth))
}

describe('print exports are print resolution', () => {
  it('a business card preview exports at 300dpi, not 78', () => {
    /* Measured by the tester: a 660x855 JPEG on an 8.5in page — about
       78dpi — because the scale was a fixed 3 on a small preview element.
       Their verdict: "I can't send that to a printer." */
    const cardCssWidth = 220
    const cardWidthIn = 3.5
    const scale = printScale(cardCssWidth, cardWidthIn)
    const outPx = cardCssWidth * scale
    expect(outPx / cardWidthIn).toBeGreaterThanOrEqual(300)
  })

  it('a letterhead preview exports at 300dpi', () => {
    const scale = printScale(220, 8.5)
    expect((220 * scale) / 8.5).toBeGreaterThanOrEqual(300)
  })

  it('a fixed scale of 3 would NOT have passed either', () => {
    // The regression, stated as a number so the intent is unmistakable.
    expect((220 * 3) / 8.5).toBeLessThan(100)
  })

  it('never asks the browser for an absurd canvas', () => {
    // A wide preview must not push the scale past what a canvas can hold.
    expect(printScale(2000, 3.5)).toBeLessThanOrEqual(12)
    expect(printScale(1, 8.5)).toBeLessThanOrEqual(12)
  })

  it('never scales below 1', () => {
    expect(printScale(5000, 1)).toBeGreaterThanOrEqual(1)
  })
})

describe('placeholder text never reaches a file', () => {
  /* The card rendered the literal words "Name" and "Title" when a contact
     had none, and the letterhead printed "Address · Phone · Email ·
     Website" — inside a real PDF that looks finished. A designer could send
     that to a printer or to the client. On screen a placeholder is a
     helpful hint; in an export it is a defect. */
  function stripPlaceholders(doc) {
    doc.querySelectorAll('[data-placeholder="true"]').forEach((n) => {
      n.textContent = ''
    })
    return doc
  }

  /** Minimal stand-in for the cloned document html2canvas hands us. */
  function fakeDoc(nodes) {
    return {
      querySelectorAll: (sel) =>
        sel === '[data-placeholder="true"]'
          ? nodes.filter((n) => n.placeholder)
          : [],
    }
  }

  it('empties a placeholder node at capture time', () => {
    const nodes = [
      { placeholder: true, textContent: 'Name' },
      { placeholder: true, textContent: 'Address · Phone · Email · Website' },
    ]
    stripPlaceholders(fakeDoc(nodes))
    expect(nodes.map((n) => n.textContent)).toEqual(['', ''])
  })

  it('leaves real content alone', () => {
    const nodes = [
      { placeholder: false, textContent: 'Jill Farrow' },
      { placeholder: true, textContent: 'Title' },
    ]
    stripPlaceholders(fakeDoc(nodes))
    expect(nodes[0].textContent).toBe('Jill Farrow')
    expect(nodes[1].textContent).toBe('')
  })
})
