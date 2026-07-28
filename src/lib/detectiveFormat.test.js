import { describe, expect, it } from 'vitest'
import {
  formatDetectiveAnswer,
  filledDetectiveChapters,
  briefHighlightsForPack,
  spectrumTokenFromNumeric,
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

  it('maps legacy numeric spectrum (0–100) to worded poles', () => {
    const field = {
      type: 'spectrum',
      poles: ['Modern', 'Traditional'],
    }
    expect(formatDetectiveAnswer(field, 42)).toBe('Both equally')
    expect(formatDetectiveAnswer(field, 10)).toBe('Modern')
    expect(formatDetectiveAnswer(field, 90)).toBe('Traditional')
    expect(formatDetectiveAnswer(field, 55)).toBe('Both equally')
    expect(formatDetectiveAnswer(field, 68)).toBe('Mostly traditional')
    // Never dump the raw number into client leave-behinds
    expect(formatDetectiveAnswer(field, 48)).not.toBe('48')
  })

  it('spectrumTokenFromNumeric covers edges', () => {
    expect(spectrumTokenFromNumeric(0)).toBe('a')
    expect(spectrumTokenFromNumeric(50)).toBe('balanced')
    expect(spectrumTokenFromNumeric(100)).toBe('b')
    expect(spectrumTokenFromNumeric(0.5)).toBe('balanced')
    expect(spectrumTokenFromNumeric('nope')).toBe(null)
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

  it('brief highlights prefer strategy over contact + format spectrum', () => {
    const rows = briefHighlightsForPack({
      clientName: 'Harbor & Hearth Co.',
      clientEmail: 'maya@example.com',
      clientPhone: '555',
      goal: 'Look like a neighborhood staple',
      audience: 'Adults who cook at home',
      spectrumModernTraditional: 42,
      spectrumBoldMinimalist: 68,
    })
    const text = rows.map((r) => `${r.label}: ${r.answer}`).join('\n')
    expect(text).toMatch(/neighborhood staple/)
    expect(text).not.toMatch(/maya@example/)
    expect(text).not.toMatch(/\b42\b/)
    expect(text).not.toMatch(/\b68\b/)
    expect(text.toLowerCase()).toMatch(/both equally|minimal/)
  })
})
