import { describe, expect, it } from 'vitest'
import { idleLine, activityTip, wellnessLine } from './helper/buddy'

/**
 * Toast copy — was routed through the i18n catalog (single 'en' locale);
 * now these are plain literals in App.jsx. Checked here directly since the
 * catalog that used to hold them is gone.
 */
const TOAST_COPY = {
  pdfFailed: 'Could not finish that PDF — try again?',
  stepComplete: 'Step done',
  queueClear: 'All done here',
  syncedOk: 'Desk saved to the cloud',
}

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
    expect(TOAST_COPY.pdfFailed).toMatch(/try again|Couldn/i)
    expect(TOAST_COPY.stepComplete).toMatch(/nice|done/i)
    expect(TOAST_COPY.queueClear).not.toBe('Queue clear')
    expect(TOAST_COPY.syncedOk).toMatch(/sync|cloud|saved/i)
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
