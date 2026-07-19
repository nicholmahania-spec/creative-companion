import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buddyMood,
  confirmLine,
  formatClock,
  formatDuration,
  greetingLine,
  hyperfocusLevel,
  hyperfocusLine,
  idleLine,
  loadSessionStart,
  loadWellness,
  markBreak,
  markWellness,
  minutesAtDesk,
  minutesSinceBreak,
  overdueKinds,
  progressLine,
  timeBlindLine,
  wellnessLine,
  whatTimeLine,
} from '../lib/buddy'

/**
 * Interactive body-double buddy (rule-based, not AI chat).
 * Body care + progress + time blindness + hyperfocus breaks.
 */
export default function BuddyMate({
  onClose,
  isFocusRunning = false,
  focusLeft = 0,
  completedCount = 0,
  nextTaskTitle = '',
  reduceMotion = false,
  pulseWin = 0,
}) {
  const [sessionStart] = useState(() => loadSessionStart())
  const [now, setNow] = useState(() => Date.now())
  const [wellness, setWellness] = useState(() => loadWellness())
  const [messages, setMessages] = useState(() => [
    {
      id: 1,
      from: 'buddy',
      text: `${greetingLine()} It is ${formatClock()}.`,
    },
  ])
  const [expanded, setExpanded] = useState(true)
  const [mood, setMood] = useState('idle')
  const [recentWin, setRecentWin] = useState(false)
  const listRef = useRef(null)
  const msgId = useRef(2)
  const lastCompleted = useRef(completedCount)
  const lastFocus = useRef(isFocusRunning)
  const lastTimePing = useRef(Date.now())
  const lastHyperLevel = useRef(null)

  const overdue = useMemo(() => overdueKinds(wellness), [wellness])
  const deskMs = now - sessionStart
  const deskMins = minutesAtDesk(sessionStart, now)
  const sinceBreak = minutesSinceBreak(wellness, sessionStart, now)
  const hyper = hyperfocusLevel(sinceBreak)

  const pushBuddy = useCallback((text) => {
    if (!text) return
    const id = msgId.current++
    setMessages((m) => [...m.slice(-14), { id, from: 'buddy', text }])
  }, [])

  const pushYou = useCallback((text) => {
    const id = msgId.current++
    setMessages((m) => [...m.slice(-14), { id, from: 'you', text }])
  }, [])

  // Live clock (time blindness surface)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, expanded])

  useEffect(() => {
    setMood(
      buddyMood({
        overdue,
        isFocusRunning,
        recentWin,
        hyperfocus: hyper,
      })
    )
  }, [overdue, isFocusRunning, recentWin, hyper])

  // Step completed
  useEffect(() => {
    if (completedCount > lastCompleted.current) {
      lastCompleted.current = completedCount
      setRecentWin(true)
      pushBuddy(progressLine('step'))
      const t = window.setTimeout(() => setRecentWin(false), 4000)
      return () => window.clearTimeout(t)
    }
    lastCompleted.current = completedCount
  }, [completedCount, pushBuddy])

  useEffect(() => {
    if (!pulseWin) return
    setRecentWin(true)
    pushBuddy(progressLine('step'))
    const t = window.setTimeout(() => setRecentWin(false), 4000)
    return () => window.clearTimeout(t)
  }, [pulseWin, pushBuddy])

  // Timer started / stopped
  useEffect(() => {
    if (isFocusRunning && !lastFocus.current) {
      pushBuddy(progressLine('timer'))
    }
    if (!isFocusRunning && lastFocus.current && focusLeft === 0) {
      pushBuddy(
        'Focus pocket ended. Stretch, water, or bathroom — then pick the next open step.'
      )
    }
    lastFocus.current = isFocusRunning
  }, [isFocusRunning, focusLeft, pushBuddy])

  // Time blindness pings + hyperfocus escalation + wellness
  useEffect(() => {
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const w = loadWellness()
      setWellness(w)
      const breakMins = minutesSinceBreak(w, sessionStart, t)
      const level = hyperfocusLevel(breakMins)
      const od = overdueKinds(w)

      // Escalate hyperfocus when crossing thresholds
      if (level && level !== lastHyperLevel.current) {
        lastHyperLevel.current = level
        pushBuddy(hyperfocusLine(breakMins))
        return
      }
      if (!level) lastHyperLevel.current = null

      // Soft time-blindness every ~12 min
      if (t - lastTimePing.current >= 12 * 60 * 1000) {
        lastTimePing.current = t
        pushBuddy(timeBlindLine(sessionStart, t))
        return
      }

      // Wellness or idle
      if (od.length) {
        pushBuddy(wellnessLine(od[0]))
      } else if (level === 'soft' || level === 'strong') {
        pushBuddy(hyperfocusLine(breakMins))
      } else {
        pushBuddy(idleLine())
      }
    }

    const interval = window.setInterval(tick, 3 * 60 * 1000)

    // First orientation after 2 min
    const first = window.setTimeout(() => {
      pushBuddy(timeBlindLine(sessionStart))
    }, 2 * 60 * 1000)

    // First wellness if overdue at 90s
    const well = window.setTimeout(() => {
      const od = overdueKinds(loadWellness())
      if (od.length) pushBuddy(wellnessLine(od[0]))
    }, 90 * 1000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(first)
      window.clearTimeout(well)
    }
  }, [pushBuddy, sessionStart])

  const logWellness = (kind, label) => {
    pushYou(label)
    const next = markWellness(kind)
    setWellness(next)
    pushBuddy(confirmLine(kind))
  }

  const logBreak = () => {
    pushYou('Taking a break')
    const next = markBreak()
    setWellness(next)
    lastHyperLevel.current = null
    pushBuddy(confirmLine('break'))
  }

  const reply = (key) => {
    if (key === 'stuck') {
      pushYou("I'm stuck")
      pushBuddy(progressLine('stuck'))
      return
    }
    if (key === 'time') {
      pushYou('What time is it?')
      pushBuddy(whatTimeLine(sessionStart))
      return
    }
    if (key === 'ok') {
      pushYou("I'm okay for now")
      pushBuddy(
        nextTaskTitle
          ? `Cool. It is ${formatClock()}. Current step: "${nextTaskTitle.slice(0, 56)}${
              nextTaskTitle.length > 56 ? '…' : ''
            }". One action only.`
          : `Cool. It is ${formatClock()}. Dump one idea on Work or run micro-steps.`
      )
      return
    }
    if (key === 'break') {
      logBreak()
      return
    }
    if (key === 'progress') {
      pushYou('How am I doing?')
      const desk = formatDuration(Date.now() - sessionStart)
      const br = minutesSinceBreak(loadWellness(), sessionStart)
      pushBuddy(
        [
          `Desk session ~${desk}. About ${br} min since last break log.`,
          completedCount > 0
            ? `Completed ${completedCount} step${completedCount === 1 ? '' : 's'}.`
            : 'No completes yet — still counts as showing up.',
          nextTaskTitle
            ? `Current step: "${nextTaskTitle.slice(0, 48)}${
                nextTaskTitle.length > 48 ? '…' : ''
              }".`
            : 'No open step — capture or breakdown.',
          hyper
            ? 'Hyperfocus watch is on — breaks are allowed.'
            : 'Pace looks sustainable right now.',
        ].join(' ')
      )
    }
  }

  const focusLabel =
    isFocusRunning && focusLeft > 0
      ? `${Math.floor(focusLeft / 60)}:${String(focusLeft % 60).padStart(2, '0')} left`
      : null

  if (!expanded) {
    return (
      <button
        type="button"
        className={`buddy-fab${hyper === 'hard' || hyper === 'strong' ? ' is-alert' : ''}`}
        onClick={() => setExpanded(true)}
        aria-label="Open desk buddy"
      >
        <BuddyFace mood={mood} reduceMotion={reduceMotion} compact />
        {(overdue.length > 0 || hyper === 'hard' || hyper === 'strong') && (
          <span className="buddy-fab-dot" aria-hidden="true" />
        )}
      </button>
    )
  }

  return (
    <div
      className={`buddy-panel${isFocusRunning ? ' is-focus' : ''}${
        hyper === 'hard' || hyper === 'strong' ? ' is-hyper' : ''
      }`}
      role="complementary"
      aria-label="Desk buddy for time blindness and body double"
    >
      <div className="buddy-panel-top">
        <div className="buddy-identity">
          <BuddyFace mood={mood} reduceMotion={reduceMotion} />
          <div>
            <strong className="buddy-name">Desk Buddy</strong>
            <span className="buddy-status">
              {isFocusRunning
                ? `Focus · ${focusLabel || 'running'} · holding time`
                : hyper
                  ? `Hyperfocus watch · ${sinceBreak} min since break`
                  : 'Time + body double · not AI chat'}
            </span>
          </div>
        </div>
        <div className="buddy-top-actions">
          <button
            type="button"
            className="buddy-icon-btn"
            onClick={() => setExpanded(false)}
            aria-label="Minimize buddy"
          >
            –
          </button>
          <button
            type="button"
            className="buddy-icon-btn"
            onClick={onClose}
            aria-label="Turn off body double"
          >
            ×
          </button>
        </div>
      </div>

      {/* Time blindness strip — always visible */}
      <div className="buddy-time-strip" aria-live="polite">
        <div className="buddy-time-block">
          <span className="buddy-time-label">Clock</span>
          <strong className="buddy-time-value">{formatClock(new Date(now))}</strong>
        </div>
        <div className="buddy-time-block">
          <span className="buddy-time-label">At desk</span>
          <strong className="buddy-time-value">{formatDuration(deskMs)}</strong>
        </div>
        <div className="buddy-time-block">
          <span className="buddy-time-label">Since break</span>
          <strong
            className={`buddy-time-value${
              hyper === 'hard' || hyper === 'strong' ? ' is-warn' : ''
            }`}
          >
            {sinceBreak}m
          </strong>
        </div>
      </div>

      {(hyper === 'soft' || hyper === 'strong' || hyper === 'hard') && (
        <div className={`buddy-hyper-banner level-${hyper}`}>
          {hyper === 'hard'
            ? 'Long stretch — break is productive'
            : hyper === 'strong'
              ? 'Deep focus · body may need a minute'
              : '25+ min in · soft stretch soon'}
        </div>
      )}

      <div className="buddy-chat" ref={listRef}>
        {messages.map((m) => (
          <div key={m.id} className={`buddy-bubble buddy-bubble-${m.from}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="buddy-wellness">
        <p className="buddy-wellness-label">Body check-ins</p>
        <div className="buddy-wellness-row">
          <button
            type="button"
            className={`buddy-check${overdue.includes('water') ? ' is-due' : ''}`}
            onClick={() => logWellness('water', 'I drank water')}
          >
            Water
          </button>
          <button
            type="button"
            className={`buddy-check${overdue.includes('food') ? ' is-due' : ''}`}
            onClick={() => logWellness('food', 'I ate something')}
          >
            Food
          </button>
          <button
            type="button"
            className={`buddy-check${
              overdue.includes('bathroom') ? ' is-due' : ''
            }`}
            onClick={() => logWellness('bathroom', 'I went to the bathroom')}
          >
            Bathroom
          </button>
        </div>
        <button type="button" className="buddy-break-btn" onClick={logBreak}>
          I took a break · reset hyperfocus clock
        </button>
      </div>

      <div className="buddy-quick">
        <button
          type="button"
          className="buddy-quick-btn"
          onClick={() => reply('time')}
        >
          What time is it?
        </button>
        <button
          type="button"
          className="buddy-quick-btn"
          onClick={() => reply('progress')}
        >
          How am I doing?
        </button>
        <button
          type="button"
          className="buddy-quick-btn"
          onClick={() => reply('stuck')}
        >
          I&apos;m stuck
        </button>
        <button
          type="button"
          className="buddy-quick-btn"
          onClick={() => reply('break')}
        >
          Need a break
        </button>
        <button
          type="button"
          className="buddy-quick-btn"
          onClick={() => reply('ok')}
        >
          I&apos;m okay
        </button>
      </div>
    </div>
  )
}

function BuddyFace({ mood = 'idle', reduceMotion = false, compact = false }) {
  return (
    <div
      className={`buddy-face mood-${mood}${compact ? ' is-compact' : ''}${
        reduceMotion ? ' no-motion' : ''
      }`}
      aria-hidden="true"
    >
      <span className="buddy-antenna" />
      <span className="buddy-eye buddy-eye-l" />
      <span className="buddy-eye buddy-eye-r" />
      <span className="buddy-mouth" />
      <span className="buddy-blush buddy-blush-l" />
      <span className="buddy-blush buddy-blush-r" />
    </div>
  )
}
