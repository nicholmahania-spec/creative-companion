import { useMemo, useState } from 'react'
import { breakReasonCopy, formatBreakClock } from '../lib/forcedBreak'
import { breakPlanCopy, kindMeta } from '../lib/breakKit'

/**
 * Full-screen lock until forced break countdown completes.
 * Shows Break Kit items that fit this window — check them off while you rest.
 */
export default function ForcedBreakOverlay({
  totalSeconds,
  leftSeconds,
  workMinutes,
  breakMinutes,
  planItems = [],
  completedIds = [],
  onCompleteItem,
  onEmergencyUnlock,
}) {
  const [showEmergency, setShowEmergency] = useState(false)
  const [emergencyText, setEmergencyText] = useState('')
  const copy = breakReasonCopy(workMinutes, breakMinutes)
  const planMeta = useMemo(
    () =>
      breakPlanCopy(
        {
          items: planItems,
          usedMinutes: planItems.reduce(
            (s, i) => s + (Number(i.minutes) || 0),
            0
          ),
          empty: planItems.length === 0,
        },
        breakMinutes
      ),
    [planItems, breakMinutes]
  )
  const progress =
    totalSeconds > 0
      ? Math.min(100, ((totalSeconds - leftSeconds) / totalSeconds) * 100)
      : 0

  const doneSet = useMemo(() => new Set(completedIds), [completedIds])
  const allDone =
    planItems.length > 0 && planItems.every((i) => doneSet.has(i.id))

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

        <div className="forced-break-clock" aria-live="polite">
          {formatBreakClock(leftSeconds)}
        </div>
        <div className="forced-break-bar" aria-hidden="true">
          <div
            className="forced-break-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="forced-break-kit">
          <p className="forced-break-kit-head">{planMeta.headline}</p>
          <p className="forced-break-kit-sub">{planMeta.sub}</p>

          {planItems.length > 0 ? (
            <ul className="forced-break-kit-list">
              {planItems.map((item) => {
                const meta = kindMeta(item.kind)
                const done = doneSet.has(item.id)
                const isFallback = String(item.id).startsWith('_')
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`forced-break-kit-item${
                        done ? ' is-done' : ''
                      }`}
                      onClick={() => {
                        if (done) return
                        onCompleteItem?.(item)
                      }}
                      disabled={done}
                      aria-pressed={done}
                    >
                      <span
                        className="forced-break-kit-check"
                        aria-hidden="true"
                      >
                        {done ? '✓' : '○'}
                      </span>
                      <span className="forced-break-kit-body">
                        <span className="forced-break-kit-kind">
                          {meta.icon} {meta.label}
                          {!isFallback && item.minutes
                            ? ` · ~${item.minutes}m`
                            : ''}
                        </span>
                        <strong className="forced-break-kit-title">
                          {item.title}
                        </strong>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <ul className="forced-break-checklist">
              <li>Stand up if you can</li>
              <li>Drink water</li>
              <li>Bathroom if you need it</li>
              <li>Rest your eyes (look far away)</li>
            </ul>
          )}

          {allDone && (
            <p className="forced-break-kit-done" role="status">
              Kit clear — keep resting until the timer ends.
            </p>
          )}
        </div>

        <p className="forced-break-hint">
          {leftSeconds > 0
            ? 'Screen stays locked until the clock hits zero'
            : 'Break complete — unlocking…'}
        </p>

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
