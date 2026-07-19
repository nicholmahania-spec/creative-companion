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
import {
  BREAK_KINDS,
  isBreakItemOpen,
  kindMeta,
} from '../lib/breakKit'
import useAppStore from '../store/useAppStore'

/**
 * Design buddy — UI/UX & graphic design coach (scripted system persona).
 * Process: clarify → structure → visual → refine. Tracks craft context.
 * Break Kit: meds, todos, tasks packed into forced-break windows.
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
  const breakKit = useAppStore((s) => s.breakKit)
  const addBreakKitItem = useAppStore((s) => s.addBreakKitItem)
  const removeBreakKitItem = useAppStore((s) => s.removeBreakKitItem)
  const completeBreakKitItem = useAppStore((s) => s.completeBreakKitItem)
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
      text: `${greetingLine()} Clock says ${formatClock()}. Try not to lose track of reality.`,
    },
  ])
  const [expanded, setExpanded] = useState(true)
  const [showMore, setShowMore] = useState(false)
  const [kitTitle, setKitTitle] = useState('')
  const [kitKind, setKitKind] = useState('todo')
  const [kitMinutes, setKitMinutes] = useState(3)
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

  const openKit = useMemo(
    () => (breakKit || []).filter((i) => isBreakItemOpen(i)),
    [breakKit]
  )
  const needsCare =
    overdue.length > 0 || hyper === 'hard' || hyper === 'strong'
  const statusLine = isFocusRunning
    ? `Focus${focusLabel ? ` · ${focusLabel}` : ''} · ${trackingLabel}`
    : `${trackingLabel} · ${formatDuration(deskMs)} desk · ${sinceBreak}m break`

  const submitKitItem = () => {
    const res = addBreakKitItem({
      title: kitTitle,
      kind: kitKind,
      minutes: kitMinutes,
    })
    if (!res?.ok) {
      pushBuddy(
        res?.error ||
          'Give me a title for the kit — med name, to-do, whatever fits a break.',
        { move: false }
      )
      return
    }
    pushYou(`Break kit: ${res.item.title}`)
    pushBuddy(
      `Parked "${res.item.title}" (${kindMeta(res.item.kind).label}, ~${res.item.minutes}m). When a break locks, I'll pack items that fit the clock.`,
      { move: false }
    )
    setKitTitle('')
  }

  const markKitDone = (item) => {
    completeBreakKitItem(item.id)
    applyGameResult(
      awardAndBroadcast('break_kit', { label: item.title })
    )
    pushYou(`Done: ${item.title}`)
    pushBuddy(
      item.recurring
        ? `Logged "${item.title}" for today. It'll resurface tomorrow if it's a daily.`
        : `Crossed off "${item.title}". Nice use of a break.`,
      { move: false }
    )
  }

  return (
    <div
      className={`buddy-shell buddy-float${
        isFocusRunning ? ' is-focus' : ''
      }${hyper === 'hard' || hyper === 'strong' ? ' is-hyper' : ''}${
        levelBurst ? ' is-levelup' : ''
      }${hop > 0 && !reduceMotion ? ' buddy-hop-in' : ''}`}
      style={posStyle}
      key={`panel-${spot?.id}-${hop}`}
      role="complementary"
      aria-label="Little Helper design buddy"
    >
      {/* Floating chrome — not part of the character body */}
      <div className="buddy-shell-chrome">
        <span className="buddy-shell-lv" title={gameSummaryLine(game)}>
          Lv {xp.level}
        </span>
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

      {/* Character body IS the chatbox — head on top, chat on the belly */}
      <div
        className={`buddy-figure is-character mood-${mood}${
          reduceMotion ? ' no-motion' : ''
        }`}
      >
        <span className="bf-pencil" aria-hidden="true">
          <span className="bf-pencil-wood" />
          <span className="bf-pencil-tip" />
        </span>
        <span className="bf-beret" aria-hidden="true">
          <span className="bf-beret-stem" />
        </span>
        <div className="bf-head" aria-hidden="true">
          <span className="bf-visor">
            <span className="bf-eye bf-eye-l" />
            <span className="bf-eye bf-eye-r" />
            <span className="bf-mouth" />
            <span className="bf-blush bf-blush-l" />
            <span className="bf-blush bf-blush-r" />
          </span>
          {mood === 'cheer' && <span className="bf-spark bf-spark-1" />}
          {mood === 'cheer' && <span className="bf-spark bf-spark-2" />}
          {mood === 'nudge' && <span className="bf-bang">!</span>}
        </div>

        <span className="bf-neck" aria-hidden="true" />

        <span className="bf-arm bf-arm-l" aria-hidden="true">
          <span className="bf-hand" />
        </span>
        <span className="bf-arm bf-arm-r" aria-hidden="true">
          <span className="bf-hand" />
        </span>

        {/* Egg belly = chat surface (not a card) */}
        <div className="bf-belly">
          <div className="bf-belly-screen">
            <div className="bf-belly-meta">
              <strong className="bf-name">Little Helper</strong>
              <span className="bf-status" title={statusLine}>
                {statusLine}
              </span>
              <div
                className="bf-xp"
                aria-label={`${game.xp || 0} XP`}
                title={gameSummaryLine(game)}
              >
                <div className="buddy-xp-bar">
                  <div
                    className="buddy-xp-fill"
                    style={{ width: `${xp.percent}%` }}
                  />
                </div>
              </div>
            </div>

            {levelBurst && (
              <p className="buddy-levelup-banner bf-levelup" role="status">
                Level {xp.level}!
              </p>
            )}

            {(hyper === 'soft' || hyper === 'strong' || hyper === 'hard') && (
              <div className={`buddy-hyper-banner bf-hyper level-${hyper}`}>
                {hyper === 'hard'
                  ? 'Long stretch — break is okay'
                  : hyper === 'strong'
                    ? 'Deep focus · body might want a minute'
                    : '25+ min · stretch when you can'}
              </div>
            )}

            <div className="bf-chat" ref={listRef}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`bf-line bf-line-${m.from}`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <div className="bf-pockets" aria-label="Main actions">
              <button
                type="button"
                className="bf-pocket-btn is-accent"
                onClick={() => reply('recommend')}
              >
                Recommend
              </button>
              <button
                type="button"
                className="bf-pocket-btn is-accent"
                onClick={() => reply('critique')}
              >
                Critique
              </button>
              <button
                type="button"
                className="bf-pocket-btn"
                onClick={() => reply('stuck')}
              >
                Stuck
              </button>
              <button
                type="button"
                className="bf-pocket-btn"
                onClick={() => reply('break')}
              >
                Break
              </button>
            </div>
          </div>
        </div>

        <div className="bf-legs" aria-hidden="true">
          <span className="bf-leg bf-leg-l" />
          <span className="bf-leg bf-leg-r" />
        </div>
      </div>

      <button
        type="button"
        className={`buddy-more-toggle bf-more${
          (needsCare || openKit.length > 0) && !showMore ? ' has-nudge' : ''
        }${showMore ? ' is-open' : ''}`}
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
      >
        {showMore
          ? 'Less'
          : openKit.length > 0
            ? `More · kit ${openKit.length}`
            : needsCare
              ? 'More · care'
              : 'More'}
        <span className="buddy-more-chevron" aria-hidden="true">
          {showMore ? '▴' : '▾'}
        </span>
      </button>

      {showMore && (
        <div className="buddy-more bf-more-panel" id="buddy-more-panel">
          {/* Break Kit — primary life list for forced breaks */}
          <div className="buddy-kit" aria-label="Break kit">
            <p className="buddy-wellness-label">Break kit</p>
            <p className="buddy-kit-hint">
              Meds, to-dos, errands — I pack what fits when a break locks.
            </p>
            <div className="buddy-kit-add">
              <input
                className="buddy-kit-input"
                value={kitTitle}
                onChange={(e) => setKitTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitKitItem()
                  }
                }}
                placeholder="e.g. take ADHD meds, water plants…"
                aria-label="Break kit item title"
                maxLength={120}
              />
              <div className="buddy-kit-row">
                <select
                  className="buddy-kit-select"
                  value={kitKind}
                  onChange={(e) => {
                    const k = e.target.value
                    setKitKind(k)
                    const meta = kindMeta(k)
                    setKitMinutes(meta.defaultMinutes)
                  }}
                  aria-label="Item type"
                >
                  {BREAK_KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.icon} {k.label}
                    </option>
                  ))}
                </select>
                <select
                  className="buddy-kit-select buddy-kit-mins"
                  value={kitMinutes}
                  onChange={(e) => setKitMinutes(Number(e.target.value))}
                  aria-label="Minutes it takes"
                >
                  {[1, 2, 3, 5, 7, 10, 15].map((m) => (
                    <option key={m} value={m}>
                      ~{m}m
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="buddy-kit-add-btn"
                  onClick={submitKitItem}
                >
                  Add
                </button>
              </div>
            </div>
            {openKit.length === 0 ? (
              <p className="buddy-kit-empty">
                Kit empty — add something you can finish in a 5–10 min break.
              </p>
            ) : (
              <ul className="buddy-kit-list">
                {openKit.slice(0, 12).map((item) => {
                  const meta = kindMeta(item.kind)
                  return (
                    <li key={item.id} className="buddy-kit-item">
                      <button
                        type="button"
                        className="buddy-kit-done"
                        onClick={() => markKitDone(item)}
                        title="Mark done"
                        aria-label={`Done: ${item.title}`}
                      >
                        ○
                      </button>
                      <span className="buddy-kit-text">
                        <span className="buddy-kit-meta">
                          {meta.icon} {meta.label} · ~{item.minutes}m
                          {item.recurring ? ' · daily' : ''}
                        </span>
                        <strong>{item.title}</strong>
                      </span>
                      <button
                        type="button"
                        className="buddy-kit-remove"
                        onClick={() => removeBreakKitItem(item.id)}
                        aria-label={`Remove ${item.title}`}
                      >
                        ×
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="buddy-time-strip" aria-live="polite">
            <div className="buddy-time-block">
              <span className="buddy-time-label">Now</span>
              <strong className="buddy-time-value">
                {formatClock(new Date(now))}
              </strong>
            </div>
            <div className="buddy-time-block">
              <span className="buddy-time-label">Desk</span>
              <strong className="buddy-time-value">
                {formatDuration(deskMs)}
              </strong>
            </div>
            <div className="buddy-time-block">
              <span className="buddy-time-label">Break</span>
              <strong
                className={`buddy-time-value${
                  hyper === 'hard' || hyper === 'strong' ? ' is-warn' : ''
                }`}
              >
                {sinceBreak}m
              </strong>
            </div>
          </div>

          <div className="buddy-game-stats">
            <span>🔥 {game.dayStreak || 0}d</span>
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

          <div className="buddy-wellness">
            <p className="buddy-wellness-label">Body check</p>
            <div className="buddy-wellness-row">
              <button
                type="button"
                className={`buddy-check${
                  overdue.includes('water') ? ' is-due' : ''
                }`}
                onClick={() => logWellness('water', 'I drank some water')}
              >
                Water
              </button>
              <button
                type="button"
                className={`buddy-check${
                  overdue.includes('food') ? ' is-due' : ''
                }`}
                onClick={() => logWellness('food', 'I ate something')}
              >
                Food
              </button>
              <button
                type="button"
                className={`buddy-check${
                  overdue.includes('bathroom') ? ' is-due' : ''
                }`}
                onClick={() =>
                  logWellness('bathroom', 'I went to the bathroom')
                }
              >
                Bathroom
              </button>
            </div>
            <button
              type="button"
              className="buddy-break-btn"
              onClick={logBreak}
            >
              Logged a real break
            </button>
          </div>

          <div className="buddy-process" aria-label="Design process">
            <p className="buddy-wellness-label">Process</p>
            <div className="buddy-process-row">
              <button
                type="button"
                className="buddy-quick-btn"
                onClick={() => reply('clarify')}
              >
                Clarify
              </button>
              <button
                type="button"
                className="buddy-quick-btn"
                onClick={() => reply('structure')}
              >
                Structure
              </button>
              <button
                type="button"
                className="buddy-quick-btn"
                onClick={() => reply('visual')}
              >
                Visual
              </button>
              <button
                type="button"
                className="buddy-quick-btn"
                onClick={() => reply('refine')}
              >
                Refine
              </button>
            </div>
          </div>

          <div className="buddy-quick">
            <button
              type="button"
              className="buddy-quick-btn"
              onClick={() => reply('full')}
            >
              Full roast
            </button>
            <button
              type="button"
              className="buddy-quick-btn"
              onClick={() => reply('tip')}
            >
              Coach me
            </button>
            <button
              type="button"
              className="buddy-quick-btn"
              onClick={() => reply('time')}
            >
              Time
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
              onClick={() => reply('ok')}
            >
              I&apos;m good
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Little Helper — compact face for FAB (minimized).
 */
function BuddyFace({ mood = 'idle', reduceMotion = false, compact = false }) {
  return (
    <div
      className={`buddy-helper mood-${mood}${compact ? ' is-compact' : ''}${
        reduceMotion ? ' no-motion' : ''
      }`}
      aria-hidden="true"
    >
      <span className="bh-pencil">
        <span className="bh-pencil-wood" />
        <span className="bh-pencil-tip" />
      </span>
      <span className="bh-beret">
        <span className="bh-beret-stem" />
      </span>
      <span className="bh-head">
        <span className="bh-visor">
          <span className="bh-eye bh-eye-l" />
          <span className="bh-eye bh-eye-r" />
          <span className="bh-mouth" />
          <span className="bh-blush bh-blush-l" />
          <span className="bh-blush bh-blush-r" />
        </span>
      </span>
      <span className="bh-body">
        <span className="bh-pocket">
          <span className="bh-pen bh-pen-ink" />
          <span className="bh-pen bh-pen-g" />
          <span className="bh-pen bh-pen-p" />
        </span>
        <span className="bh-badge" title="Little Helper" />
      </span>
      <span className="bh-arm bh-arm-l" />
      <span className="bh-arm bh-arm-r" />
      {mood === 'cheer' && <span className="bh-spark bh-spark-1" />}
      {mood === 'cheer' && <span className="bh-spark bh-spark-2" />}
      {mood === 'nudge' && <span className="bh-bang">!</span>}
    </div>
  )
}
