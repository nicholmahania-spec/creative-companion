import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  activityTip,
  buddyMood,
  classifyTask,
  coachOnTask,
  confirmLine,
  critiqueForTask,
  describeActivity,
  designProcessTip,
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
  minutesSinceBreak,
  overdueKinds,
  pickBuddySpot,
  progressLine,
  recommendForTask,
  spotStyle,
  timeBlindLine,
  twoDirectionsTip,
  wellnessLine,
  whatTimeLine,
} from '../lib/buddy'
import {
  awardAndBroadcast,
  BADGES,
  gameSummaryLine,
  loadGame,
  xpProgress,
} from '../lib/buddyGame'

/**
 * Design buddy — UI/UX & graphic design coach (scripted system persona).
 * Process: clarify → structure → visual → refine. Tracks craft context.
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
  const [game, setGame] = useState(() => loadGame())
  const [levelBurst, setLevelBurst] = useState(false)
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

  const applyGameResult = useCallback(
    (result) => {
      if (!result?.game) return
      setGame(result.game)
      if (result.levelUp) {
        setLevelBurst(true)
        setMood('cheer')
        window.setTimeout(() => setLevelBurst(false), 2800)
      }
      ;(result.messages || []).forEach((msg, i) => {
        window.setTimeout(() => {
          pushBuddy(msg, {
            move: i === 0 && result.levelUp,
            expand: result.levelUp || result.badgesUnlocked?.length > 0,
          })
        }, i * 200)
      })
    },
    [pushBuddy]
  )

  useEffect(() => {
    const onGame = (e) => applyGameResult(e.detail)
    window.addEventListener('cc-buddy-game', onGame)
    setGame(loadGame())
    return () => window.removeEventListener('cc-buddy-game', onGame)
  }, [applyGameResult])

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
        recentWin: recentWin || levelBurst,
        hyperfocus: hyper,
      })
    )
  }, [overdue, isFocusRunning, recentWin, hyper, levelBurst])

  // New page → tip about what you're doing
  useEffect(() => {
    const view = activityLive.view
    if (!view) return
    if (lastView.current === null) {
      lastView.current = view
      const t = window.setTimeout(() => {
        const a = activityRef.current
        pushBuddy(
          `${describeActivity(a)} ${activityTip(a)} ${recommendForTask(a)}`,
          { move: false }
        )
      }, 1400)
      return () => window.clearTimeout(t)
    }
    if (lastView.current === view) return
    lastView.current = view
    const t = window.setTimeout(() => {
      const a = activityRef.current
      pushBuddy(
        `${describeActivity(a)} ${activityTip(a)} Try Recommend or Critique for task-specific notes.`,
        { move: true, expand: true }
      )
    }, 600)
    return () => window.clearTimeout(t)
  }, [activityLive.view, pushBuddy])

  // Current step changed → acknowledge + task-fit recommend/critique
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
      const domain = classifyTask(a)
      pushBuddy(
        `New focus: "${String(a.nextTaskTitle).slice(0, 50)}${
          String(a.nextTaskTitle).length > 50 ? '…' : ''
        }". I am treating this as ${domain} work. ${recommendForTask(a)} ${critiqueForTask(a)}`,
        { move: true, expand: true }
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
    const action =
      kind === 'water' ? 'water' : kind === 'food' ? 'food' : 'bathroom'
    applyGameResult(awardAndBroadcast(action, { label }))
  }

  const logBreak = () => {
    pushYou("I'm taking a break")
    const next = markBreak()
    setWellness(next)
    lastHyperLevel.current = null
    pushBuddy(confirmLine('break'))
    applyGameResult(
      awardAndBroadcast('break_complete', { label: 'Self-logged break' })
    )
  }

  const reply = (key) => {
    const a = activityRef.current
    if (key === 'stuck') {
      pushYou("I'm stuck")
      pushBuddy(
        `${progressLine('stuck')} ${
          a.nextTaskTitle
            ? `Current step: "${String(a.nextTaskTitle).slice(0, 40)}".`
            : ''
        }`.trim()
      )
      return
    }
    if (key === 'tip') {
      pushYou('Coach me on this')
      pushBuddy(
        `${describeActivity(a)} ${activityTip(a)} ${recommendForTask(a)}`,
        { move: true }
      )
      return
    }
    if (key === 'recommend') {
      pushYou('Recommend next moves')
      pushBuddy(`${describeActivity(a)} ${recommendForTask(a)}`, {
        move: true,
      })
      return
    }
    if (key === 'critique') {
      pushYou('Critique this task')
      pushBuddy(`${describeActivity(a)} ${critiqueForTask(a)}`, {
        move: true,
      })
      return
    }
    if (key === 'full') {
      pushYou('Full review')
      pushBuddy(`${describeActivity(a)} ${coachOnTask(a)}`, { move: true })
      return
    }
    if (key === 'clarify') {
      pushYou('Clarify')
      pushBuddy(designProcessTip('clarify', a), { move: true })
      return
    }
    if (key === 'structure') {
      pushYou('Structure')
      pushBuddy(designProcessTip('structure', a), { move: true })
      return
    }
    if (key === 'visual') {
      pushYou('Visual')
      pushBuddy(designProcessTip('visual', a), { move: true })
      return
    }
    if (key === 'refine') {
      pushYou('Refine')
      pushBuddy(
        `${designProcessTip('refine', a)} ${twoDirectionsTip(a)}`,
        { move: true }
      )
      return
    }
    if (key === 'time') {
      pushYou('What time is it?')
      pushBuddy(`${whatTimeLine(sessionStart)} ${describeActivity(a)}`)
      return
    }
    if (key === 'ok') {
      pushYou('I am good for now')
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
          `Desk time ~${desk}; about ${br} min since a real break.`,
          completedCount > 0
            ? `Closed ${completedCount} step${completedCount === 1 ? '' : 's'} this session.`
            : 'No steps closed yet — define one shippable outcome.',
          activityTip(a),
          recommendForTask(a),
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
  const xp = xpProgress(game.xp || 0)
  const badgeList = (game.badges || [])
    .map((id) => BADGES[id])
    .filter(Boolean)
    .slice(-6)

  if (!expanded) {
    return (
      <button
        type="button"
        className={`buddy-fab buddy-float${
          hyper === 'hard' || hyper === 'strong' ? ' is-alert' : ''
        }${levelBurst ? ' is-levelup' : ''}${
          hop > 0 && !reduceMotion ? ' buddy-hop-in' : ''
        }`}
        style={posStyle}
        key={`fab-${spot?.id}-${hop}`}
        onClick={() => {
          repark(false)
          setExpanded(true)
        }}
        aria-label={`Open design buddy, level ${xp.level}`}
        title={`Level ${xp.level} · ${game.xp || 0} XP`}
      >
        <BuddyFace mood={mood} reduceMotion={reduceMotion} compact />
        <span className="buddy-fab-level">{xp.level}</span>
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
      }${levelBurst ? ' is-levelup' : ''}${
        hop > 0 && !reduceMotion ? ' buddy-hop-in' : ''
      }`}
      style={posStyle}
      key={`panel-${spot?.id}-${hop}`}
      role="complementary"
      aria-label="Design buddy with XP and badges"
    >
      <div className="buddy-panel-top">
        <div className="buddy-identity">
          <BuddyFace mood={mood} reduceMotion={reduceMotion} />
          <div>
            <strong className="buddy-name">
              Design buddy · Lv {xp.level}
            </strong>
            <span className="buddy-status">
              {isFocusRunning
                ? `Focus${focusLabel ? ` · ${focusLabel}` : ''} · +XP when done`
                : gameSummaryLine(game)}
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

      <div className="buddy-tracking" title="Craft context I am tracking">
        <span className="buddy-tracking-label">Tracking</span>
        <strong className="buddy-tracking-value">{trackingLabel}</strong>
      </div>

      {/* Gamification bar */}
      <div className="buddy-game" aria-label="Buddy progress">
        <div className="buddy-game-row">
          <span className="buddy-game-level">Lv {xp.level}</span>
          <div className="buddy-xp-bar" title={`${xp.into} / ${xp.span} XP this level`}>
            <div
              className="buddy-xp-fill"
              style={{ width: `${xp.percent}%` }}
            />
          </div>
          <span className="buddy-xp-label">{game.xp || 0} XP</span>
        </div>
        <div className="buddy-game-stats">
          <span>🔥 {game.dayStreak || 0}d streak</span>
          <span>✓ {game.totalSteps || 0} steps</span>
          <span>⏱ {game.totalBreaks || 0} breaks</span>
          <span>🎯 {game.totalPomodoros || 0} focus</span>
        </div>
        {badgeList.length > 0 && (
          <div className="buddy-badges" aria-label="Badges">
            {badgeList.map((b) => (
              <span
                key={b.id}
                className="buddy-badge"
                title={`${b.name}: ${b.desc}`}
              >
                {b.icon}
              </span>
            ))}
          </div>
        )}
        {levelBurst && (
          <p className="buddy-levelup-banner" role="status">
            Level up! You are level {xp.level}
          </p>
        )}
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

      <div className="buddy-process" aria-label="Task review">
        <p className="buddy-wellness-label">For this task</p>
        <div className="buddy-process-row">
          <button
            type="button"
            className="buddy-quick-btn buddy-quick-tip"
            onClick={() => reply('recommend')}
          >
            Recommend
          </button>
          <button
            type="button"
            className="buddy-quick-btn buddy-quick-tip"
            onClick={() => reply('critique')}
          >
            Critique
          </button>
          <button
            type="button"
            className="buddy-quick-btn buddy-quick-tip"
            onClick={() => reply('full')}
          >
            Full review
          </button>
          <button
            type="button"
            className="buddy-quick-btn"
            onClick={() => reply('tip')}
          >
            Coach me
          </button>
        </div>
      </div>

      <div className="buddy-process" aria-label="Design process">
        <p className="buddy-wellness-label">Design process</p>
        <div className="buddy-process-row">
          <button
            type="button"
            className="buddy-quick-btn"
            onClick={() => reply('clarify')}
          >
            1 Clarify
          </button>
          <button
            type="button"
            className="buddy-quick-btn"
            onClick={() => reply('structure')}
          >
            2 Structure
          </button>
          <button
            type="button"
            className="buddy-quick-btn"
            onClick={() => reply('visual')}
          >
            3 Visual
          </button>
          <button
            type="button"
            className="buddy-quick-btn"
            onClick={() => reply('refine')}
          >
            4 Refine
          </button>
        </div>
      </div>

      <div className="buddy-quick">
        <button
          type="button"
          className="buddy-quick-btn"
          onClick={() => reply('time')}
        >
          Time check
        </button>
        <button
          type="button"
          className="buddy-quick-btn"
          onClick={() => reply('progress')}
        >
          Progress
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
          I&apos;m good
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
