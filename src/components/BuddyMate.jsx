import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  activityTip,
  buddyMood,
  confirmLine,
  describeActivity,
  formatClock,
  formatDuration,
  greetingLine,
  hyperfocusLevel,
  hyperfocusLine,
  idleLineWithActivity,
  loadSessionStart,
  loadWellness,
  markBreak,
  markWellness,
  minutesAtDesk,
  minutesSinceBreak,
  overdueKinds,
  pickBuddySpot,
  progressLine,
  spotStyle,
  timeBlindLine,
  wellnessLine,
  whatTimeLine,
} from '../lib/buddy'

/**
 * Interactive body-double buddy (rule-based, not AI chat).
 * Tracks current page + step for helpful tips; body care; time/hyperfocus.
 */
export default function BuddyMate({
  onClose,
  isFocusRunning = false,
  focusLeft = 0,
  completedCount = 0,
  nextTaskTitle = '',
  reduceMotion = false,
  pulseWin = 0,
  activity = {},
}) {
  const activityLive = useMemo(
    () => ({
      ...activity,
      isFocusRunning,
      nextTaskTitle: activity.nextTaskTitle || nextTaskTitle,
      doneCount: activity.doneCount ?? completedCount,
    }),
    [activity, isFocusRunning, nextTaskTitle, completedCount]
  )

  const [sessionStart] = useState(() => loadSessionStart())
  const [now, setNow] = useState(() => Date.now())
  const [wellness, setWellness] = useState(() => loadWellness())
  const [messages, setMessages] = useState(() => [
    {
      id: 1,
      from: 'buddy',
      text: `${greetingLine()} It's ${formatClock()} right now.`,
    },
  ])
  const [expanded, setExpanded] = useState(true)
  const [mood, setMood] = useState('idle')
  const [recentWin, setRecentWin] = useState(false)
  const [spot, setSpot] = useState(() => pickBuddySpot())
  const [hop, setHop] = useState(0)
  const listRef = useRef(null)
  const msgId = useRef(2)
  const lastCompleted = useRef(completedCount)
  const lastFocus = useRef(isFocusRunning)
  const lastTimePing = useRef(Date.now())
  const lastHyperLevel = useRef(null)
  const lastView = useRef(null)
  const lastStepKey = useRef('')
  const spotIdRef = useRef(spot?.id)
  const activityRef = useRef(activityLive)
  activityRef.current = activityLive

  const overdue = useMemo(() => overdueKinds(wellness), [wellness])
  const deskMs = now - sessionStart
  const sinceBreak = minutesSinceBreak(wellness, sessionStart, now)
  const hyper = hyperfocusLevel(sinceBreak)

  const repark = useCallback((forceExpand = false) => {
    setSpot((prev) => {
      const next = pickBuddySpot(prev?.id || spotIdRef.current)
      spotIdRef.current = next.id
      return next
    })
    setHop((n) => n + 1)
    if (forceExpand) setExpanded(true)
  }, [])

  const pushBuddy = useCallback(
    (text, { move = true, expand = false } = {}) => {
      if (!text) return
      if (move) repark(expand)
      else if (expand) setExpanded(true)
      const id = msgId.current++
      setMessages((m) => [...m.slice(-14), { id, from: 'buddy', text }])
    },
    [repark]
  )

  const pushYou = useCallback((text) => {
    const id = msgId.current++
    setMessages((m) => [...m.slice(-14), { id, from: 'you', text }])
  }, [])

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

  // New page → tip about what you're doing
  useEffect(() => {
    const view = activityLive.view
    if (!view) return
    if (lastView.current === null) {
      lastView.current = view
      // After greeting, soft intro tip
      const t = window.setTimeout(() => {
        pushBuddy(
          `${describeActivity(activityRef.current)} ${activityTip(activityRef.current)}`,
          { move: false }
        )
      }, 1400)
      return () => window.clearTimeout(t)
    }
    if (lastView.current === view) return
    lastView.current = view
    const t = window.setTimeout(() => {
      pushBuddy(activityTip(activityRef.current), { move: true, expand: true })
    }, 600)
    return () => window.clearTimeout(t)
  }, [activityLive.view, pushBuddy])

  // Current step changed → acknowledge + tip
  useEffect(() => {
    const key = `${activityLive.nextTaskTitle || ''}|${activityLive.view || ''}`
    if (!activityLive.nextTaskTitle) {
      lastStepKey.current = key
      return
    }
    if (lastStepKey.current === key) return
    const isFirst = lastStepKey.current === ''
    lastStepKey.current = key
    if (isFirst) return
    const t = window.setTimeout(() => {
      const a = activityRef.current
      pushBuddy(
        `Okay, new focus: "${String(a.nextTaskTitle).slice(0, 50)}${
          String(a.nextTaskTitle).length > 50 ? '…' : ''
        }". ${activityTip(a)}`,
        { move: true }
      )
    }, 500)
    return () => window.clearTimeout(t)
  }, [activityLive.nextTaskTitle, activityLive.view, pushBuddy])

  useEffect(() => {
    if (completedCount > lastCompleted.current) {
      lastCompleted.current = completedCount
      setRecentWin(true)
      const a = activityRef.current
      const follow =
        a.nextTaskTitle
          ? ` Next up looks like: "${String(a.nextTaskTitle).slice(0, 40)}…". One at a time.`
          : ' Desk is clear for a second — nice. Add something if you want.'
      pushBuddy(`${progressLine('step')}${follow}`, {
        move: true,
        expand: true,
      })
      const t = window.setTimeout(() => setRecentWin(false), 4000)
      return () => window.clearTimeout(t)
    }
    lastCompleted.current = completedCount
  }, [completedCount, pushBuddy])

  useEffect(() => {
    if (!pulseWin) return
    setRecentWin(true)
    pushBuddy(progressLine('step'), { move: true, expand: true })
    const t = window.setTimeout(() => setRecentWin(false), 4000)
    return () => window.clearTimeout(t)
  }, [pulseWin, pushBuddy])

  useEffect(() => {
    if (isFocusRunning && !lastFocus.current) {
      const a = activityRef.current
      pushBuddy(
        a.nextTaskTitle
          ? `${progressLine('timer')} You're on: "${String(a.nextTaskTitle).slice(0, 42)}".`
          : progressLine('timer'),
        { move: true }
      )
    }
    if (!isFocusRunning && lastFocus.current && focusLeft === 0) {
      pushBuddy(
        "Timer's done. Stretch, sip water, or hit the bathroom — then pick up whatever is next when you're ready.",
        { move: true, expand: true }
      )
    }
    lastFocus.current = isFocusRunning
  }, [isFocusRunning, focusLeft, pushBuddy])

  // Periodic: wellness / hyperfocus / activity-aware idle
  useEffect(() => {
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const w = loadWellness()
      setWellness(w)
      const breakMins = minutesSinceBreak(w, sessionStart, t)
      const level = hyperfocusLevel(breakMins)
      const od = overdueKinds(w)
      const act = activityRef.current

      if (level && level !== lastHyperLevel.current) {
        lastHyperLevel.current = level
        pushBuddy(hyperfocusLine(breakMins), { move: true, expand: true })
        return
      }
      if (!level) lastHyperLevel.current = null

      if (t - lastTimePing.current >= 12 * 60 * 1000) {
        lastTimePing.current = t
        const timeBit = timeBlindLine(sessionStart, t)
        const tip = activityTip(act)
        pushBuddy(`${timeBit} ${tip}`, { move: true, expand: true })
        return
      }

      if (od.length) {
        pushBuddy(wellnessLine(od[0]), { move: true, expand: true })
      } else if (level === 'soft' || level === 'strong') {
        pushBuddy(hyperfocusLine(breakMins), { move: true, expand: true })
      } else {
        pushBuddy(idleLineWithActivity(act), { move: true })
      }
    }

    const interval = window.setInterval(tick, 3 * 60 * 1000)
    const first = window.setTimeout(() => {
      pushBuddy(timeBlindLine(sessionStart), { move: true, expand: true })
    }, 2 * 60 * 1000)
    const well = window.setTimeout(() => {
      const od = overdueKinds(loadWellness())
      if (od.length)
        pushBuddy(wellnessLine(od[0]), { move: true, expand: true })
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
    pushYou("I'm taking a break")
    const next = markBreak()
    setWellness(next)
    lastHyperLevel.current = null
    pushBuddy(confirmLine('break'))
  }

  const reply = (key) => {
    const a = activityRef.current
    if (key === 'stuck') {
      pushYou("I'm stuck")
      pushBuddy(
        `${progressLine('stuck')} ${
          a.nextTaskTitle
            ? `Your step is "${String(a.nextTaskTitle).slice(0, 40)}". Make it smaller or walk away for two minutes.`
            : ''
        }`.trim()
      )
      return
    }
    if (key === 'tip') {
      pushYou('Give me a tip')
      pushBuddy(
        `${describeActivity(a)} ${activityTip(a)}`,
        { move: true }
      )
      return
    }
    if (key === 'time') {
      pushYou('What time is it?')
      pushBuddy(
        `${whatTimeLine(sessionStart)} ${describeActivity(a)}`
      )
      return
    }
    if (key === 'ok') {
      pushYou("I'm okay for now")
      pushBuddy(activityTip(a))
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
          describeActivity(a),
          `You've been here about ${desk}, roughly ${br} minutes since a real break.`,
          completedCount > 0
            ? `You finished ${completedCount} step${completedCount === 1 ? '' : 's'}. That's not nothing.`
            : "You haven't checked anything off yet — and showing up still counts.",
          activityTip(a),
        ].join(' ')
      )
    }
  }

  const focusLabel =
    isFocusRunning && focusLeft > 0
      ? `${Math.floor(focusLeft / 60)}:${String(focusLeft % 60).padStart(2, '0')} left`
      : null

  const trackingLabel = useMemo(() => {
    const a = activityLive
    const place =
      {
        flow: 'Work',
        studio: 'Board',
        project: 'Projects',
        brand: 'Brand',
        spark: 'Spark',
        insights: 'Timer',
        calendar: 'Deadlines',
        settings: 'Settings',
      }[a.view] || 'App'
    if (a.nextTaskTitle) {
      const t = String(a.nextTaskTitle)
      return `${place} · ${t.length > 28 ? `${t.slice(0, 28)}…` : t}`
    }
    return place
  }, [activityLive])

  const posStyle = spotStyle(spot)

  if (!expanded) {
    return (
      <button
        type="button"
        className={`buddy-fab buddy-float${
          hyper === 'hard' || hyper === 'strong' ? ' is-alert' : ''
        }${hop > 0 && !reduceMotion ? ' buddy-hop-in' : ''}`}
        style={posStyle}
        key={`fab-${spot?.id}-${hop}`}
        onClick={() => {
          repark(false)
          setExpanded(true)
        }}
        aria-label="Open desk buddy"
        title="I move around so you notice me"
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
      className={`buddy-panel buddy-float${isFocusRunning ? ' is-focus' : ''}${
        hyper === 'hard' || hyper === 'strong' ? ' is-hyper' : ''
      }${hop > 0 && !reduceMotion ? ' buddy-hop-in' : ''}`}
      style={posStyle}
      key={`panel-${spot?.id}-${hop}`}
      role="complementary"
      aria-label="Desk buddy tracking what you are doing"
    >
      <div className="buddy-panel-top">
        <div className="buddy-identity">
          <BuddyFace mood={mood} reduceMotion={reduceMotion} />
          <div>
            <strong className="buddy-name">Your buddy</strong>
            <span className="buddy-status">
              {isFocusRunning
                ? `Timer on${focusLabel ? ` · ${focusLabel}` : ''} · with you`
                : trackingLabel}
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

      <div className="buddy-tracking" title="What I'm paying attention to">
        <span className="buddy-tracking-label">I see you on</span>
        <strong className="buddy-tracking-value">{trackingLabel}</strong>
      </div>

      <div className="buddy-time-strip" aria-live="polite">
        <div className="buddy-time-block">
          <span className="buddy-time-label">Time now</span>
          <strong className="buddy-time-value">
            {formatClock(new Date(now))}
          </strong>
        </div>
        <div className="buddy-time-block">
          <span className="buddy-time-label">Been here</span>
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
            ? "You've been at this a long time — a break is okay"
            : hyper === 'strong'
              ? "Deep in it · your body might want a minute"
              : 'About 25+ minutes in · stretch when you can'}
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
        <p className="buddy-wellness-label">Tell me you did this</p>
        <div className="buddy-wellness-row">
          <button
            type="button"
            className={`buddy-check${overdue.includes('water') ? ' is-due' : ''}`}
            onClick={() => logWellness('water', 'I drank some water')}
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
          I took a real break
        </button>
      </div>

      <div className="buddy-quick">
        <button
          type="button"
          className="buddy-quick-btn buddy-quick-tip"
          onClick={() => reply('tip')}
        >
          Tip for this
        </button>
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
          I need a break
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
