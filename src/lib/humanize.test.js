import { describe, expect, it } from 'vitest'
import { idleLine, activityTip, wellnessLine } from './buddy'
import { t } from './i18n'

describe('humanize — no legacy 4-step or Figma in Helper voice', () => {
  it('idle and tips avoid Clarify/Structure/Visual/Refine process names', () => {
    // Sample many picks (random)
    const samples = []
    for (let i = 0; i < 40; i++) {
      samples.push(idleLine())
      samples.push(
        activityTip({ view: 'flow', nextTaskTitle: 'Draft cover' })
      )
    }
    const blob = samples.join(' ')
    expect(blob).not.toMatch(/Clarify\s*\/|Structure\s*\/|Visual\s*\/|Refine—/)
    expect(blob).not.toMatch(/\bFigma\b/)
  })

  it('wellness bathroom line never mentions Figma', () => {
    for (let i = 0; i < 20; i++) {
      expect(wellnessLine('bathroom')).not.toMatch(/Figma/i)
    }
  })

  it('toast keys are human (not bare failed)', () => {
    expect(t('en', 'ui.pdfFailed')).toMatch(/try again|Couldn/i)
    expect(t('en', 'ui.stepComplete')).toMatch(/nice|done/i)
    expect(t('en', 'ui.queueClear')).not.toBe('Queue clear')
    expect(t('en', 'ui.syncedOk')).toMatch(/sync|cloud|saved/i)
    expect(t('es', 'ui.pdfFailed')).toMatch(/otra vez|No se/i)
    expect(t('es', 'ui.stepComplete')).toMatch(/bien|listo/i)
  })

  it('buddy queue-empty tip avoids stiff “Queue clear” opener', () => {
    const tip = activityTip({
      view: 'flow',
      nextTaskTitle: '',
      doneCount: 2,
      projectName: 'Demo',
    })
    expect(tip).not.toMatch(/^Queue clear\b/)
    expect(tip).toMatch(/Queue empty|No step/i)
  })
})
