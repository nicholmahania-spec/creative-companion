import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  activityTip,
  buddyMood,
  classifyTask,
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
  minutesSinceBreak,
  overdueKinds,
  defaultBuddySpot,
  pickBuddySpot,
  progressLine,
  recommendForTask,
  spotStyle,
  timeBlindLine,
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
import {
  coachWithHelper,
  isHelperAiConfigured,
  helperAiStatus,
} from '../lib/helperAi'
import useAppStore from '../store/useAppStore'
import HelperCharacterLottie from './HelperCharacterLottie'

const BUDDY_BASE = `${import.meta.env.BASE_URL}buddy/`
/** Photoreal full-body Helper — Lottie asset + static fallback */
const BODY_SRC = `${BUDDY_BASE}helper-body.png`
/** Tight circular crop still useful if body fails mid-load */
const FAB_SRC = `${BUDDY_BASE}helper-fab.jpg`
const HELPER_FALLBACK = BODY_SRC || FAB_SRC

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
  showProgress = false,
  helperQuiet = false,
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
  // Start minimized so work forms stay free
  const [expanded, setExpanded] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showBreakCare, setShowBreakCare] = useState(false)
  const [kitTitle, setKitTitle] = useState('')
  const [kitKind, setKitKind] = useState('todo')
  const [kitMinutes, setKitMinutes] = useState(3)
  const [mood, setMood] = useState('idle')
  const [recentWin, setRecentWin] = useState(false)
  const [spot, setSpot] = useState(() => defaultBuddySpot('fab'))
  const [hop, setHop] = useState(0)
  const [game, setGame] = useState(() => loadGame())
  const [levelBurst, setLevelBurst] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const listRef = useRef(null)
  const shellRef = useRef(null)
  const autoMinRef = useRef(null)
  const msgId = useRef(2)
  const aiReqRef = useRef(0)
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
  const aiStatus = useMemo(() => helperAiStatus(), [])
  const deskMs = now - sessionStart
  const sinceBreak = minutesSinceBreak(wellness, sessionStart, now)
  const hyper = hyperfocusLevel(sinceBreak)

  const clearAutoMin = useCallback(() => {
    if (autoMinRef.current) {
      window.clearTimeout(autoMinRef.current)
      autoMinRef.current = null
    }
  }, [])

  const minimize = useCallback(() => {
    clearAutoMin()
    setShowMore(false)
    setShowBreakCare(false)
    // Always dock FAB bottom-right so it doesn't vanish off-screen
    const dock = defaultBuddySpot('fab')
    spotIdRef.current = dock.id
    setSpot(dock)
    setExpanded(false)
  }, [clearAutoMin])

  /** System pop: show briefly, then tuck away so desk stays clear */
  const scheduleAutoMinimize = useCallback(
    (ms = 12000) => {
      clearAutoMin()
      autoMinRef.current = window.setTimeout(() => {
        setExpanded(false)
        setShowMore(false)
        autoMinRef.current = null
      }, ms)
    },
    [clearAutoMin]
  )

  const repark = useCallback(
    (forceExpand = false) => {
      setSpot((prev) => {
        const mode = forceExpand ? 'panel' : 'fab'
        const next = pickBuddySpot(prev?.id || spotIdRef.current, mode)
        spotIdRef.current = next.id
        return next
      })
      setHop((n) => n + 1)
      if (forceExpand) {
        setExpanded(true)
        setHasUnread(false)
        scheduleAutoMinimize(12000)
      }
    },
    [scheduleAutoMinimize]
  )

  const openPanel = useCallback(() => {
    clearAutoMin()
    // Expand from current corner — prefer bottom-right for forms
    const dock = defaultBuddySpot('panel')
    spotIdRef.current = dock.id
    setSpot(dock)
    setHop((n) => n + 1)
    setShowMore(false)
    setExpanded(true)
    setHasUnread(false)
  }, [clearAutoMin])

  const pushBuddy = useCallback(
    (text, { move = true, expand = false } = {}) => {
      if (!text) return
      if (move) repark(expand)
      else if (expand) {
        setExpanded(true)
        setHasUnread(false)
        scheduleAutoMinimize(12000)
      } else {
        // Message waiting — pulse FAB, don't cover the desk
        setHasUnread(true)
      }
      const id = msgId.current++
      setMessages((m) => [...m.slice(-14), { id, from: 'buddy', text }])
    },
    [repark, scheduleAutoMinimize]
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

  // Click outside expanded panel → tuck away
  useEffect(() => {
    if (!expanded) return undefined
    const onDown = (e) => {
      const root = shellRef.current
      if (!root) return
      if (root.contains(e.target)) return
      minimize()
    }
    // delay so the open click doesn't immediately close
    const t = window.setTimeout(() => {
      document.addEventListener('pointerdown', onDown, true)
    }, 80)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [expanded, minimize])

  // Esc (from app or local) → minimize expanded Helper
  useEffect(() => {
    if (!expanded) return undefined
    const onMin = () => minimize()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        minimize()
      }
    }
    window.addEventListener('cc-helper-minimize', onMin)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('cc-helper-minimize', onMin)
      window.removeEventListener('keydown', onKey)
    }
  }, [expanded, minimize])

  // Focusing a form field → minimize so typing isn't blocked
  useEffect(() => {
    const onFocusIn = (e) => {
      const t = e.target
      if (!t || !expanded) return
      const tag = (t.tagName || '').toLowerCase()
      const editable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        t.isContentEditable
      if (!editable) return
      if (shellRef.current?.contains(t)) return
      minimize()
    }
    document.addEventListener('focusin', onFocusIn, true)
    return () => document.removeEventListener('focusin', onFocusIn, true)
  }, [expanded, minimize])

  useEffect(() => () => clearAutoMin(), [clearAutoMin])

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

  // New page → tip (message only — don't cover desk). Skip when quiet.
  useEffect(() => {
    if (helperQuiet) return undefined
    const view = activityLive.view
    if (!view) return undefined
    if (lastView.current === null) {
      lastView.current = view
      const t = window.setTimeout(() => {
        const a = activityRef.current
        pushBuddy(`${describeActivity(a)} ${activityTip(a)}`, {
          move: false,
          expand: false,
        })
      }, 1400)
      return () => window.clearTimeout(t)
    }
    if (lastView.current === view) return undefined
    lastView.current = view
    const t = window.setTimeout(() => {
      const a = activityRef.current
      pushBuddy(
        `${describeActivity(a)} Open me for Coach or Critique.`,
        { move: true, expand: false }
      )
    }, 600)
    return () => window.clearTimeout(t)
  }, [activityLive.view, pushBuddy, helperQuiet])

  // Current step changed → short acknowledge. Skip when quiet.
  useEffect(() => {
    if (helperQuiet) return undefined
    const key = `${activityLive.nextTaskTitle || ''}|${activityLive.view || ''}`
    if (!activityLive.nextTaskTitle) {
      lastStepKey.current = key
      return undefined
    }
    if (lastStepKey.current === key) return undefined
    const isFirst = lastStepKey.current === ''
    lastStepKey.current = key
    if (isFirst) return undefined
    const t = window.setTimeout(() => {
      const a = activityRef.current
      const title = String(a.nextTaskTitle)
      pushBuddy(
        `New focus: "${title.slice(0, 48)}${title.length > 48 ? '…' : ''}". Open me for Coach.`,
        { move: true, expand: false }
      )
    }, 500)
    return () => window.clearTimeout(t)
  }, [activityLive.nextTaskTitle, activityLive.view, pushBuddy, helperQuiet])

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
        expand: false,
      })
      const t = window.setTimeout(() => setRecentWin(false), 4000)
      return () => window.clearTimeout(t)
    }
    lastCompleted.current = completedCount
  }, [completedCount, pushBuddy])

  useEffect(() => {
    if (!pulseWin) return
    setRecentWin(true)
    pushBuddy(progressLine('step'), { move: true, expand: false })
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
        { move: true, expand: false }
      )
    }
    if (!isFocusRunning && lastFocus.current && focusLeft === 0) {
      pushBuddy(
        "Timer's done. Stretch, sip water, or hit the bathroom — then pick up whatever is next when you're ready.",
        { move: true, expand: false }
      )
    }
    lastFocus.current = isFocusRunning
  }, [isFocusRunning, focusLeft, pushBuddy])

  // Periodic: wellness / hyperfocus / activity-aware idle
  // Only hard hyperfocus pops the panel (and auto-tucks). Everything else pings the FAB.
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

      if (helperQuiet) return

      if (level && level !== lastHyperLevel.current) {
        lastHyperLevel.current = level
        pushBuddy(hyperfocusLine(breakMins), {
          move: true,
          expand: level === 'hard',
        })
        return
      }
      if (!level) lastHyperLevel.current = null

      if (t - lastTimePing.current >= 12 * 60 * 1000) {
        lastTimePing.current = t
        const timeBit = timeBlindLine(sessionStart, t)
        const tip = activityTip(act)
        pushBuddy(`${timeBit} ${tip}`, { move: true, expand: false })
        return
      }

      if (od.length) {
        pushBuddy(wellnessLine(od[0]), { move: true, expand: false })
      } else if (level === 'soft' || level === 'strong') {
        pushBuddy(hyperfocusLine(breakMins), { move: true, expand: false })
      } else {
        pushBuddy(idleLineWithActivity(act), { move: true, expand: false })
      }
    }

    if (helperQuiet) {
      return () => {}
    }

    const interval = window.setInterval(tick, 3 * 60 * 1000)
    const first = window.setTimeout(() => {
      pushBuddy(timeBlindLine(sessionStart), { move: true, expand: false })
    }, 2 * 60 * 1000)
    const well = window.setTimeout(() => {
      const od = overdueKinds(loadWellness())
      if (od.length)
        pushBuddy(wellnessLine(od[0]), { move: true, expand: false })
    }, 90 * 1000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(first)
      window.clearTimeout(well)
    }
  }, [pushBuddy, sessionStart, helperQuiet])

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

  /** Live AI coach when VITE_XAI_API_KEY is set; scripted fallback otherwise. */
  const replyAi = useCallback(
    async (intent, youLabel, extra = {}) => {
      if (youLabel) pushYou(youLabel)
      const a = activityRef.current
      const req = ++aiReqRef.current
      setAiBusy(true)
      pushBuddy(
        isHelperAiConfigured()
          ? 'Thinking through this step…'
          : 'Scripted coach — one sec…',
        { move: true, expand: true }
      )
      try {
        const result = await coachWithHelper(intent, a, extra)
        if (req !== aiReqRef.current) return
        pushBuddy(result.text, { move: true, expand: true })
      } catch {
        if (req !== aiReqRef.current) return
        pushBuddy(activityTip(a), { move: true, expand: true })
      } finally {
        if (req === aiReqRef.current) setAiBusy(false)
      }
    },
    [pushBuddy, pushYou]
  )

  const reply = (key) => {
    const a = activityRef.current
    if (key === 'stuck') {
      void replyAi('stuck', "I'm stuck")
      return
    }
    if (key === 'tip') {
      void replyAi('tip', 'Coach me on this')
      return
    }
    if (key === 'recommend') {
      void replyAi('recommend', 'Recommend next moves')
      return
    }
    if (key === 'critique') {
      void replyAi('critique', 'Critique this task')
      return
    }
    if (key === 'full') {
      void replyAi('full', 'Full review')
      return
    }
    if (key === 'clarify') {
      void replyAi('clarify', 'Clarify')
      return
    }
    if (key === 'structure') {
      void replyAi('structure', 'Structure')
      return
    }
    if (key === 'visual') {
      void replyAi('visual', 'Visual')
      return
    }
    if (key === 'refine') {
      void replyAi('refine', 'Refine')
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
      const desk = formatDuration(Date.now() - sessionStart)
      const br = minutesSinceBreak(loadWellness(), sessionStart)
      void replyAi('progress', 'How am I doing?', {
        deskLabel: `Desk time ~${desk}`,
        breakLabel: `about ${br} min since a real break`,
        closedLabel:
          completedCount > 0
            ? `Closed ${completedCount} step${completedCount === 1 ? '' : 's'} this session.`
            : 'No steps closed yet — define one finishable step.',
      })
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
        project: 'Project',
        brand: 'System',
        finish: 'Pack',
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

  // Hooks MUST stay above any early return (minimize was crashing → blank screen)
  const openKit = useMemo(
    () => (breakKit || []).filter((i) => isBreakItemOpen(i)),
    [breakKit]
  )
  const needsCare =
    overdue.length > 0 || hyper === 'hard' || hyper === 'strong'
  const statusLine = isFocusRunning
    ? `Focus${focusLabel ? ` · ${focusLabel}` : ''} · ${trackingLabel}`
    : `${trackingLabel}`

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
      `Parked "${res.item.title}" (${kindMeta(res.item.kind).label}, ~${res.item.minutes}m).`,
      { move: false }
    )
    setKitTitle('')
  }

  const markKitDone = (item) => {
    completeBreakKitItem(item.id)
    applyGameResult(awardAndBroadcast('break_kit', { label: item.title }))
    pushYou(`Done: ${item.title}`)
    pushBuddy(
      item.recurring
        ? `Logged "${item.title}" for today.`
        : `Crossed off "${item.title}".`,
      { move: false }
    )
  }

  const posStyle = spotStyle(spot) || spotStyle(defaultBuddySpot('fab'))
  const xp = xpProgress(game.xp || 0)
  const badgeList = (game.badges || [])
    .map((id) => BADGES[id])
    .filter(Boolean)
    .slice(-6)

  // ——— Minimized: small corner FAB only ———
  if (!expanded) {
    return (
      <button
        type="button"
        className={`buddy-fab buddy-float is-cute${
          hyper === 'hard' || hyper === 'strong' || hasUnread ? ' is-alert' : ''
        }${levelBurst ? ' is-levelup' : ''}${
          hop > 0 && !reduceMotion ? ' buddy-hop-in' : ''
        }${hasUnread ? ' has-unread' : ''}`}
        style={posStyle}
        key={`fab-${spot?.id || 'br'}-${hop}`}
        onClick={(e) => {
          e.stopPropagation()
          openPanel()
        }}
        aria-label={`Open Helper${
          showProgress ? `, level ${xp.level}` : ''
        }${hasUnread ? ', new message' : ''}`}
        title={
          hasUnread
            ? 'New tip — click to open'
            : showProgress
              ? `Lv ${xp.level} · Helper`
              : 'Helper'
        }
      >
        <HelperCharacterLottie
          className="buddy-fab-img"
          mood={mood}
          reduceMotion={reduceMotion}
          size={64}
          shape="circle"
          fallbackSrc={HELPER_FALLBACK}
        />
        {showProgress && (
          <span className="buddy-fab-level">{xp.level}</span>
        )}
        {(overdue.length > 0 ||
          hyper === 'hard' ||
          hyper === 'strong' ||
          hasUnread) && (
          <span className="buddy-fab-dot" aria-hidden="true" />
        )}
      </button>
    )
  }

  const recentMsgs = messages.slice(-4)
  const latestBuddy = [...messages].reverse().find((m) => m.from === 'buddy')
  const panelMood =
    recentWin || mood === 'happy'
      ? 'happy'
      : hyper === 'hard' || hyper === 'strong'
        ? 'think'
        : mood === 'rest'
          ? 'rest'
          : 'idle'

  // ——— Expanded: refined compact coach card + full-body stage ———
  return (
    <div
      ref={shellRef}
      className={`buddy-shell buddy-float is-compact-dock${
        isFocusRunning ? ' is-focus' : ''
      }${hyper === 'hard' || hyper === 'strong' ? ' is-hyper' : ''}${
        levelBurst ? ' is-levelup' : ''
      }${hop > 0 && !reduceMotion ? ' buddy-hop-in' : ''}`}
      style={posStyle}
      key={`panel-${spot?.id || 'br'}-${hop}`}
      role="complementary"
      aria-label="Helper"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="buddy-compact">
        <div className="buddy-compact-card">
          <header className="buddy-compact-head">
            <div className="buddy-compact-identity">
              <div className="buddy-compact-titles">
                <div className="buddy-compact-name-row">
                  <strong className="bf-name">Helper</strong>
                  {showProgress && (
                    <span className="buddy-compact-lv">Lv {xp.level}</span>
                  )}
                  <span
                    className={`helper-ai-badge is-${aiStatus.mode}`}
                    title={aiStatus.detail}
                  >
                    {aiStatus.short}
                  </span>
                </div>
                <span className="bf-status" title={statusLine}>
                  {statusLine}
                </span>
              </div>
            </div>
            <div className="buddy-top-actions">
              <button
                type="button"
                className="buddy-icon-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  minimize()
                }}
                aria-label="Minimize buddy"
                title="Tuck away"
              >
                –
              </button>
              <button
                type="button"
                className="buddy-icon-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose?.()
                }}
                aria-label="Turn off helper"
              >
                ×
              </button>
            </div>
          </header>

          {/* Photoreal full-body Helper stage (not circle crop) */}
          <div
            className={`buddy-compact-hero mood-${panelMood}${
              reduceMotion ? ' no-motion' : ''
            }${recentWin || levelBurst ? ' is-cheer' : ''}`}
            aria-hidden="true"
          >
            <HelperCharacterLottie
              className="buddy-compact-body"
              mood={panelMood}
              reduceMotion={reduceMotion}
              height={96}
              shape="body"
              fallbackSrc={HELPER_FALLBACK}
            />
            <span className="buddy-compact-hero-ground" />
          </div>

          {showProgress && (
            <div
              className="buddy-compact-xp"
              aria-label={`${game.xp || 0} XP, level ${xp.level}`}
              title={gameSummaryLine(game)}
            >
              <div className="buddy-xp-bar">
                <div
                  className="buddy-xp-fill"
                  style={{ width: `${xp.percent}%` }}
                />
              </div>
            </div>
          )}

          {showProgress && levelBurst && (
            <p className="buddy-levelup-banner bf-levelup" role="status">
              Level {xp.level}!
            </p>
          )}

          {(hyper === 'strong' || hyper === 'hard') && (
            <div className={`buddy-hyper-banner bf-hyper level-${hyper}`}>
              {hyper === 'hard'
                ? 'Long stretch — break is okay'
                : 'Deep focus · take a minute soon'}
            </div>
          )}

          <div className="buddy-compact-chat" ref={listRef}>
            {recentMsgs.length === 0 && latestBuddy && (
              <div className="buddy-msg buddy-msg-buddy">{latestBuddy.text}</div>
            )}
            {recentMsgs.map((m) => (
              <div
                key={m.id}
                className={`buddy-msg buddy-msg-${m.from}`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="buddy-compact-actions buddy-act-three" aria-label="Helper actions">
            <button
              type="button"
              className="buddy-act buddy-act-primary"
              onClick={() => reply('recommend')}
              disabled={aiBusy}
            >
              Coach
            </button>
            <button
              type="button"
              className="buddy-act"
              onClick={() => reply('critique')}
              disabled={aiBusy}
            >
              Critique
            </button>
            <button
              type="button"
              className={`buddy-act${showBreakCare ? ' is-on' : ''}${
                needsCare ? ' has-nudge' : ''
              }`}
              onClick={() => {
                setShowBreakCare((v) => {
                  const next = !v
                  // Open care kit only — do not auto-log a break (that is explicit below)
                  if (next) {
                    setShowMore(false)
                    pushBuddy(
                      'Break care open — water, food, stretch, or log a real break when you take one.',
                      { move: false, expand: true }
                    )
                  }
                  return next
                })
              }}
              disabled={aiBusy}
              aria-expanded={showBreakCare}
            >
              Break
            </button>
          </div>

          {showBreakCare && (
            <div className="buddy-more bf-more-panel is-inline buddy-break-care">
              <div className="buddy-wellness">
                <p className="buddy-wellness-label">Body · break care</p>
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
              <div className="buddy-kit" aria-label="Break kit">
                <p className="buddy-wellness-label">Break kit</p>
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
                    placeholder="Add med / to-do for breaks…"
                    aria-label="Break kit item"
                    maxLength={120}
                  />
                  <div className="buddy-kit-row">
                    <select
                      className="buddy-kit-select"
                      value={kitKind}
                      onChange={(e) => {
                        const k = e.target.value
                        setKitKind(k)
                        setKitMinutes(kindMeta(k).defaultMinutes)
                      }}
                      aria-label="Type"
                    >
                      {BREAK_KINDS.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.icon} {k.label}
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
                {openKit.length > 0 && (
                  <ul className="buddy-kit-list">
                    {openKit.slice(0, 6).map((item) => {
                      const meta = kindMeta(item.kind)
                      return (
                        <li key={item.id} className="buddy-kit-item">
                          <button
                            type="button"
                            className="buddy-kit-done"
                            onClick={() => markKitDone(item)}
                            aria-label={`Done: ${item.title}`}
                          >
                            ○
                          </button>
                          <span className="buddy-kit-text">
                            <span className="buddy-kit-meta">
                              {meta.icon} ~{item.minutes}m
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
            </div>
          )}

          <button
            type="button"
            className={`buddy-more-toggle bf-more${
              showMore ? ' is-open' : ''
            }`}
            onClick={() => {
              setShowMore((v) => !v)
              setShowBreakCare(false)
            }}
            aria-expanded={showMore}
          >
            {showMore ? 'Show less' : 'Process & tools'}
            <span className="buddy-more-chevron" aria-hidden="true">
              {showMore ? '▴' : '▾'}
            </span>
          </button>

          {showMore && (
            <div className="buddy-more bf-more-panel is-inline">
              <div className="buddy-process" aria-label="Process">
                <p className="buddy-wellness-label">Process</p>
                <div className="buddy-process-row">
                  {['clarify', 'structure', 'visual', 'refine'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      className="buddy-quick-btn"
                      onClick={() => reply(k)}
                      disabled={aiBusy}
                    >
                      {k[0].toUpperCase() + k.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="buddy-quick">
                <button
                  type="button"
                  className="buddy-quick-btn"
                  onClick={() => reply('full')}
                  disabled={aiBusy}
                >
                  Full review
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
                  disabled={aiBusy}
                >
                  Progress
                </button>
              </div>

              {showProgress && badgeList.length > 0 && (
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Compact CSS face kept as fallback if images fail to load elsewhere */
