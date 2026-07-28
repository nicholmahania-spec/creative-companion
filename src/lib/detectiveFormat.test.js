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
