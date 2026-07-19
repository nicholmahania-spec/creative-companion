import { useState } from 'react'
import { breakReasonCopy, formatBreakClock } from '../lib/forcedBreak'

/**
 * Full-screen lock until forced break countdown completes.
 * Parent owns the timer; emergency unlock requires typing a phrase.
 */
export default function ForcedBreakOverlay({
  totalSeconds,
  leftSeconds,
  workMinutes,
  breakMinutes,
  onEmergencyUnlock,
}) {
  const [showEmergency, setShowEmergency] = useState(false)
  const [emergencyText, setEmergencyText] = useState('')
  const copy = breakReasonCopy(workMinutes, breakMinutes)
  const progress =
    totalSeconds > 0
      ? Math.min(100, ((totalSeconds - leftSeconds) / totalSeconds) * 100)
      : 0

  const tryEmergency = () => {
    if (emergencyText.trim().toLowerCase() === 'end break now') {
      onEmergencyUnlock?.()
      setEmergencyText('')
      setShowEmergency(false)
    }
  }

  return (
    <div
      className="forced-break-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="forced-break-title"
      aria-describedby="forced-break-body"
    >
      <div className="forced-break-card">
        <p className="forced-break-eyebrow">Required break · Pomodoro</p>
        <h2 id="forced-break-title" className="forced-break-title">
          {copy.title}
        </h2>
        <p id="forced-break-body" className="forced-break-body">
          {copy.body}
        </p>
        <p className="forced-break-tip">{copy.tip}</p>

        <div className="forced-break-clock" aria-live="polite">
          {formatBreakClock(leftSeconds)}
        </div>
        <div className="forced-break-bar" aria-hidden="true">
          <div
            className="forced-break-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="forced-break-hint">
          {leftSeconds > 0
            ? 'Walk · water · stretch · look away from the screen'
            : 'Break complete — unlocking…'}
        </p>

        <ul className="forced-break-checklist">
          <li>Stand up if you can</li>
          <li>Drink water</li>
          <li>Bathroom if you need it</li>
          <li>Rest your eyes (look far away)</li>
        </ul>

        {!showEmergency ? (
          <button
            type="button"
            className="text-link forced-break-emergency-link"
            onClick={() => setShowEmergency(true)}
          >
            Emergency only — unlock early
          </button>
        ) : (
          <div className="forced-break-emergency">
            <p className="panel-hint">
              Type exactly: <strong>end break now</strong>
            </p>
            <div className="capture-row">
              <input
                className="field-input"
                value={emergencyText}
                onChange={(e) => setEmergencyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && tryEmergency()}
                placeholder="end break now"
                aria-label="Emergency unlock phrase"
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={tryEmergency}
              >
                Unlock
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
