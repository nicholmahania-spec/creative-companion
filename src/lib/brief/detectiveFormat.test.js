import { describe, expect, it } from 'vitest'
import {
  formatDetectiveAnswer,
  filledDetectiveChapters,
} from './detectiveBrief'

describe('formatDetectiveAnswer', () => {
  it('maps spectrum tokens to pole labels', () => {
    const field = {
      type: 'spectrum',
      poles: ['Playful', 'Professional'],
    }
    expect(formatDetectiveAnswer(field, 'mostly-a')).toBe('Mostly playful')
    expect(formatDetectiveAnswer(field, 'balanced')).toBe('Both equally')
    expect(formatDetectiveAnswer(field, 'b')).toBe('Professional')
  })

  it('maps checklist ids to labels', () => {
    const field = {
      type: 'checklist',
      options: [
        { id: 'logo', label: 'Logo' },
        { id: 'web', label: 'Website' },
      ],
    }
    expect(formatDetectiveAnswer(field, ['logo', 'web'])).toBe(
      'Logo, Website'
    )
  })

  it('does not leave raw tokens when chapter is filled', () => {
    const chapters = filledDetectiveChapters({
      spectrumPlayfulProfessional: 'mostly-a',
      deliverablesPicked: ['logo'],
    })
    const flat = chapters.flatMap((c) => c.rows.map((r) => r.answer)).join(' ')
    expect(flat).not.toMatch(/mostly-a/)
    expect(flat.toLowerCase()).toMatch(/playful|logo/)
  })
})

describe('values that must never reach a client page', () => {
  const spectrum = { type: 'spectrum', poles: ['Modern', 'Traditional'] }

  /* A real brand book printed "42", "55", "48" and "68" as brief answers,
     left over from when these were 0-100 sliders. One landed alone at the top
     of a page, split from its question by a page break, with no key anywhere
     in the document saying which end 42 was near. */
  it('reads a legacy 0-100 slider value as words', () => {
    expect(formatDetectiveAnswer(spectrum, '0')).toBe('Modern')
    expect(formatDetectiveAnswer(spectrum, '42')).toBe('Both equally')
    expect(formatDetectiveAnswer(spectrum, '68')).toBe('Mostly traditional')
    expect(formatDetectiveAnswer(spectrum, '100')).toBe('Traditional')
  })

  it('prints nothing at all for a spectrum value it cannot read', () => {
    expect(formatDetectiveAnswer(spectrum, 'wat')).toBe('')
    expect(formatDetectiveAnswer(spectrum, '900')).toBe('')
    expect(formatDetectiveAnswer(spectrum, '-4')).toBe('')
  })

  it('keeps the client’s contact details and budget out of the brief', () => {
    const rows = filledDetectiveChapters({
      clientName: 'Harbor & Hearth Co.',
      clientEmail: 'maya@harborandhearth.example',
      clientPhone: '(555) 014-2200',
      budgetRange: '$8k-$12k brand system',
    })
    const text = JSON.stringify(rows)
    expect(text).toContain('Harbor & Hearth Co.')
    expect(text).not.toContain('maya@harborandhearth.example')
    expect(text).not.toContain('555')
    expect(text).not.toContain('$8k')
  })

  it('hands the whole brief over only when asked outright', () => {
    const rows = filledDetectiveChapters(
      { budgetRange: '$8k-$12k brand system' },
      { includePrivate: true }
    )
    expect(JSON.stringify(rows)).toContain('$8k')
  })
})
