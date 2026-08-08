import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { labelForView } from '../../lib/journey/journey'
import { applyProposal } from '../../lib/helper/helperActions'
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
} from '../../lib/helper/buddy'
import {
  BREAK_KINDS,
  isBreakItemOpen,
  kindMeta,
} from '../../lib/helper/breakKit'
import {
  askHelper,
  coachWithHelper,
  isHelperAiConfigured,
  helperAiStatus,
} from '../../lib/helper/helperAi'
import useAppStore from '../../store/useAppStore'
import HelperCharacterLottie from './HelperCharacterLottie'
import '../../styles/lazy-buddy.css'
import '../../styles/lazy-motion.css'

const BUDDY_BASE = `${import.meta.env.BASE_URL}buddy/`
/** Photoreal full-body Helper — Lottie asset + static fallback */
const BODY_SRC = `${BUDDY_BASE}helper-body.png`
/** Tight circular crop still useful if body fails mid-load */
const FAB_SRC = `${BUDDY_BASE}helper-fab.jpg`
const HELPER_FALLBACK = BODY_SRC || FAB_SRC

/**
 * Design buddy — UI/UX & graphic design coach (scripted system persona).
 * Process: Define → Research → Ideate → Sketch → Design → Review → Deliver.
 * Break Kit: meds, todos, tasks packed into forced-break windows.
 */
/** Map process phase ids → app views */
const PROCESS_VIEW = {
  define: 'project',
  research: 'studio',
  ideate: 'spark',
  sketch: 'flow',
  design: 'brand',
  review: 'review',
  deliver: 'finish',
}

/**
 * Says the words came from the offline script, not the model.
 *
 * Stated as a fact about the reply, not as an error about you: the Helper
 * is the surface you reach for when things are already going badly, and a
 * red failure banner there is the shame-coded error CLAUDE.md rules out.
 * It also does not offer a retry — the reply underneath is still usable, and
 * a button whose outcome you cannot predict is a decision billed at the worst
 * possible moment. The console carries the actual reason.
 */
function OfflineNote() {
  return (
    <span className="buddy-msg-offline"> · offline tip</span>
  )
}

export default function BuddyMate({
  onClose,
  isFocusRunning = false,
  focusLeft = 0,
  completedCount = 0,
  nextTaskTitle = '',
  reduceMotion = false,
  pulseWin = 0,
  activity = {},
  helperQuiet = false,
  onNavigate,
  /** When true, open Break care + a calm scripted line (Pomodoro ownership). */
  forceBreakCare = false,
  breakMinutes = 0,
}) {
  const breakKit = useAppStore((s) => s.breakKit)
  const addBreakKitItem = useAppStore((s) => s.addBreakKitItem)
  const removeBreakKitItem = useAppStore((s) => s.removeBreakKitItem)
  const completeBreakKitItem = useAppStore((s) => s.completeBreakKitItem)
  /* The only store writes the Helper can reach, and only ever behind a press
     — see lib/helperActions.js for what is excluded and why. */
  const addTask = useAppStore((s) => s.addTask)
  const breakIntoSteps = useAppStore((s) => s.breakIntoSteps)
  const storeTasks = useAppStore((s) => s.tasks)
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  /** Which proposals have been pressed, so a button cannot fire twice. */
  const [appliedIds, setAppliedIds] = useState({})
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
      text: `${greetingLine()} · ${formatClock()}`,
    },
  ])
  /* Mirrors `messages` so `askQuestion` can read the thread without listing
     it as a dependency — otherwise the callback is rebuilt on every reply,
     and an in-flight request is orphaned mid-answer. */
  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])
  /** What the user is typing. The Helper had no input before this. */
  const [askText, setAskText] = useState('')
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
  /* State, not a mount-time useMemo. The badge used to be computed once from
     configuration and never revisited, so it went on reading "Live" for the
     whole session while every reply came from the scripted table — the exact
     shape of failure that cost an evening on a copy with no live path.
     `refreshAiStatus` is called after every round trip, where the answer is
     known for real. */
  const [aiStatus, setAiStatus] = useState(() => helperAiStatus())
  const refreshAiStatus = useCallback(() => setAiStatus(helperAiStatus()), [])
  const deskMs = now - sessionStart
  const sinceBreak = minutesSinceBreak(wellness, sessionStart, now)
  const hyper = hyperfocusLevel(sinceBreak)

  const clearAutoMin = useCallback(() => {
    if (autoMinRef.current) {
      window.clearTimeout(autoMinRef.current)
      autoMinRef.current = null
    }
  }, [])

  // Pomodoro → Helper: system hands the break to the voice that already owns
  // Break kit, instead of only a hard overlay with no coaching surface.
  useEffect(() => {
    if (!forceBreakCare) return undefined
    clearAutoMin()
    setExpanded(true)
    setShowBreakCare(true)
    setShowMore(false)
    setHasUnread(true)
    const mins = Math.max(1, Number(breakMinutes) || 5)
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      const text = `You've been at this a while. Take about ${mins} minutes — stretch, water, or one kit item. The work is still here when you come back.`
      if (last?.from === 'buddy' && String(last.text).includes("You've been at this a while")) {
        return prev
      }
      return [
        ...prev,
        {
          id: msgId.current++,
          from: 'buddy',
          text,
        },
      ]
    })
    return undefined
  }, [forceBreakCare, breakMinutes, clearAutoMin])

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
      // Expanded panel always bottom-right so it never covers path Next
      const next = forceExpand
        ? defaultBuddySpot('panel')
        : pickBuddySpot(spotIdRef.current, 'fab')
      spotIdRef.current = next.id
      setSpot(next)
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
    const dock = defaultBuddySpot('panel')
    spotIdRef.current = dock.id
    setSpot(dock)
    setHop((n) => n + 1)
    setShowMore(false)
    setExpanded(true)
    setHasUnread(false)
  }, [clearAutoMin])

  const isThinkingText = (t) => t === '…' || t === 'One sec…'

  const pushBuddy = useCallback(
    (
      text,
      {
        move = true,
        expand = false,
        replaceThinking = false,
        offline = false,
        proposals = null,
      } = {}
    ) => {
      if (!text) return
      if (move) repark(expand)
      else if (expand) {
        setExpanded(true)
        setHasUnread(false)
        scheduleAutoMinimize(12000)
      } else if (!expanded) {
        // Message waiting — pulse FAB, don't cover the desk
        setHasUnread(true)
      }
      setMessages((m) => {
        if (replaceThinking) {
          const last = m[m.length - 1]
          if (last?.from === 'buddy' && isThinkingText(last.text)) {
            return [
              ...m.slice(0, -1),
              { ...last, text, offline, proposals },
            ].slice(-14)
          }
        }
        // Drop any leftover thinking bubble when a real reply lands
        const base = m.filter(
          (x) => !(x.from === 'buddy' && isThinkingText(x.text))
        )
        const id = msgId.current++
        return [...base.slice(-13), { id, from: 'buddy', text, offline, proposals }]
      })
    },
    [repark, scheduleAutoMinimize, expanded]
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
        recentWin,
        hyperfocus: hyper,
      })
    )
  }, [overdue, isFocusRunning, recentWin, hyper])

  // New page → FAB ping only (never hop/repark/expand). Skip when quiet.
  useEffect(() => {
    if (helperQuiet) return undefined
    const view = activityLive.view
    if (!view) return undefined
    if (lastView.current === null) {
      lastView.current = view
      return undefined
    }
    if (lastView.current === view) return undefined
    lastView.current = view
    const t = window.setTimeout(() => {
      const a = activityRef.current
      pushBuddy(describeActivity(a), { move: false, expand: false })
    }, 900)
    return () => window.clearTimeout(t)
  }, [activityLive.view, pushBuddy, helperQuiet])

  // Current step changed → FAB ping only. Skip when quiet.
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
      pushBuddy(`Now · ${title.slice(0, 36)}${title.length > 36 ? '…' : ''}`, {
        move: false,
        expand: false,
      })
    }, 700)
    return () => window.clearTimeout(t)
  }, [activityLive.nextTaskTitle, activityLive.view, pushBuddy, helperQuiet])

  useEffect(() => {
    if (completedCount > lastCompleted.current) {
      lastCompleted.current = completedCount
      setRecentWin(true)
      const a = activityRef.current
      const follow = a.nextTaskTitle
        ? ` · next: ${String(a.nextTaskTitle).slice(0, 24)}`
        : ''
      pushBuddy(`${progressLine('step')}${follow}`, {
        move: false,
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
    pushBuddy(progressLine('step'), { move: false, expand: false })
    const t = window.setTimeout(() => setRecentWin(false), 4000)
    return () => window.clearTimeout(t)
  }, [pulseWin, pushBuddy])

  useEffect(() => {
    if (isFocusRunning && !lastFocus.current) {
      const a = activityRef.current
      pushBuddy(
        a.nextTaskTitle
          ? `Timer · ${String(a.nextTaskTitle).slice(0, 32)}`
          : progressLine('timer'),
        { move: false, expand: false }
      )
    }
    if (!isFocusRunning && lastFocus.current && focusLeft === 0) {
      pushBuddy('Timer done · stretch', { move: false, expand: false })
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
        // Never auto-open panel — banner shows when user opens Helper
        pushBuddy(hyperfocusLine(breakMins), {
          move: false,
          expand: false,
        })
        return
      }
      if (!level) lastHyperLevel.current = null

      if (t - lastTimePing.current >= 15 * 60 * 1000) {
        lastTimePing.current = t
        pushBuddy(timeBlindLine(sessionStart, t), {
          move: false,
          expand: false,
        })
        return
      }

      // Soft wellness / idle — FAB unread only, never repark
      if (od.length) {
        pushBuddy(wellnessLine(od[0]), { move: false, expand: false })
      } else if (level === 'soft' || level === 'strong') {
        pushBuddy(hyperfocusLine(breakMins), { move: false, expand: false })
      }
      // Skip chatty idle pings — user opens Helper when they want Coach
    }

    if (helperQuiet) {
      return () => {}
    }

    const interval = window.setInterval(tick, 4 * 60 * 1000)
    const first = window.setTimeout(() => {
      pushBuddy(timeBlindLine(sessionStart), { move: false, expand: false })
    }, 4 * 60 * 1000)
    const well = window.setTimeout(() => {
      const od = overdueKinds(loadWellness())
      if (od.length)
        pushBuddy(wellnessLine(od[0]), { move: false, expand: false })
    }, 3 * 60 * 1000)

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
  }

  const logBreak = () => {
    pushYou("I'm taking a break")
    const next = markBreak()
    setWellness(next)
    lastHyperLevel.current = null
    pushBuddy(confirmLine('break'))
  }

  /** Live AI coach when VITE_XAI_API_KEY is set; scripted fallback otherwise. */
  const replyAi = useCallback(
    async (intent, youLabel, extra = {}) => {
      if (youLabel) pushYou(youLabel)
      const a = activityRef.current
      const req = ++aiReqRef.current
      setAiBusy(true)
      // Stay docked bottom-right; replace thinking line with one reply
      pushBuddy(isHelperAiConfigured() ? '…' : 'One sec…', {
        move: false,
        expand: true,
      })
      try {
        const result = await coachWithHelper(intent, a, extra)
        if (req !== aiReqRef.current) return
        /* `coachWithHelper` already reports whether the words came from the
           model or from the scripted fallback, and this dropped that on the
           floor — so a dead API key, a 503, or an expired session produced a
           plausible canned sentence that was indistinguishable from a real
           reply. The Helper looked like it was working while never reaching
           the model at all, which is the one failure you cannot debug from
           the outside because it never looks like a failure.

           `source === 'scripted'` WITH an error means the model was expected
           and did not answer. Without an error it is ordinary offline mode,
           which is honest already and needs no badge. */
        pushBuddy(result.text, {
          move: false,
          expand: true,
          replaceThinking: true,
          offline: result.source === 'scripted' && !!result.error,
        })
        if (result.source === 'scripted' && result.error) {
          console.warn('Helper AI unavailable, using scripted reply:', result.error)
        }
      } catch (e) {
        if (req !== aiReqRef.current) return
        console.warn('Helper AI threw, using scripted reply:', e)
        pushBuddy(activityTip(a), {
          move: false,
          expand: true,
          replaceThinking: true,
          offline: true,
        })
      } finally {
        if (req === aiReqRef.current) setAiBusy(false)
        refreshAiStatus()
      }
    },
    [pushBuddy, pushYou, refreshAiStatus]
  )

  /**
   * A typed question. The Helper had no input at all before this — twelve
   * canned intents and no way to say what you were actually stuck on.
   *
   * `messages` is the visible thread, so the history sent to the model is
   * exactly what is on screen. Deriving it from anything else would let the
   * two drift, and a coach answering a conversation you cannot see is worse
   * than one with no memory.
   */
  const askQuestion = useCallback(async () => {
    const q = askText.trim()
    if (!q || aiBusy) return
    setAskText('')
    pushYou(q)
    const a = activityRef.current
    const req = ++aiReqRef.current
    setAiBusy(true)
    pushBuddy(isHelperAiConfigured() ? '…' : 'One sec…', {
      move: false,
      expand: true,
    })
    const history = messagesRef.current
      .filter((m) => !isThinkingText(m.text))
      .map((m) => ({
        role: m.from === 'you' ? 'user' : 'assistant',
        content: m.text,
      }))
    try {
      const result = await askHelper(q, history, a)
      if (req !== aiReqRef.current) return
      if (result.source === 'scripted' && result.error) {
        console.warn('Helper AI unavailable, using scripted reply:', result.error)
      }
      pushBuddy(result.text, {
        move: false,
        expand: true,
        replaceThinking: true,
        offline: result.source === 'scripted' && !!result.error,
        proposals: result.proposals?.length ? result.proposals : null,
      })
    } catch (e) {
      if (req !== aiReqRef.current) return
      console.warn('Helper AI threw, using scripted reply:', e)
      pushBuddy(activityTip(a), {
        move: false,
        expand: true,
        replaceThinking: true,
        offline: true,
      })
    } finally {
      if (req === aiReqRef.current) setAiBusy(false)
      refreshAiStatus()
    }
  }, [askText, aiBusy, pushBuddy, pushYou, refreshAiStatus])

  /**
   * Run one proposal, because the user pressed it.
   *
   * Nothing calls this except a click. The model can only ever put a button
   * on screen; whether it does anything is the user's decision, every time.
   */
  const runProposal = useCallback(
    (msgId, index, proposal) => {
      const key = `${msgId}:${index}`
      if (appliedIds[key]) return
      const openTask = (storeTasks || []).find((t) => !t.completed)
      const res = applyProposal(proposal, {
        addTask,
        breakIntoSteps,
        nextTaskId: openTask?.id,
        projectId: currentProjectId,
      })
      setAppliedIds((m) => ({ ...m, [key]: res.ok ? 'done' : 'failed' }))
      /* Say what happened either way. A button that reports nothing leaves
         you checking the list to find out whether it worked, which is the
         cost this was supposed to remove. */
      pushBuddy(res.note, { move: false, expand: true })
    },
    [appliedIds, storeTasks, addTask, breakIntoSteps, currentProjectId, pushBuddy]
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
    if (
      key === 'define' ||
      key === 'research' ||
      key === 'ideate' ||
      key === 'sketch' ||
      key === 'design' ||
      key === 'review' ||
      key === 'deliver' ||
      /* legacy */
      key === 'clarify' ||
      key === 'structure' ||
      key === 'visual' ||
      key === 'refine'
    ) {
      const map = {
        clarify: 'define',
        structure: 'sketch',
        visual: 'design',
        refine: 'review',
      }
      const phase = map[key] || key
      const view = PROCESS_VIEW[phase]
      if (view && typeof onNavigate === 'function') {
        onNavigate(view)
      }
      void replyAi(phase, phase[0].toUpperCase() + phase.slice(1))
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
      /* Journey + Tools labels come from one place. Only 'Deadlines' is worded
         differently here than the Tools menu's 'Calendar'. This map used to
         restate all ten and went stale at the rename — while PROCESS_STEMS a
         few lines below was updated, so the same component showed old and new
         names at once. */
      ({ calendar: 'Deadlines' }[a.view] || labelForView(a.view) || 'App')
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
      pushBuddy(res?.error || 'Add a kit title', { move: false })
      return
    }
    pushYou(`Kit · ${res.item.title}`)
    pushBuddy(
      `+ ${res.item.title} · ~${res.item.minutes}m`,
      { move: false }
    )
    setKitTitle('')
  }

  const markKitDone = (item) => {
    completeBreakKitItem(item.id)
    pushYou(`Done · ${item.title}`)
    pushBuddy(`✓ ${item.title}`, { move: false })
  }

  const posStyle = spotStyle(spot) || spotStyle(defaultBuddySpot('fab'))
  const PROCESS_STEMS = [
    ['research', 'Res'],
    ['define', 'Str'],
    ['design', 'Id'],
    ['sketch', 'Tch'],
    ['deliver', 'Ast'],
  ]

  // ——— Minimized: corner FAB ———
  if (!expanded) {
    return (
      <button
        type="button"
        className={`buddy-fab buddy-float buddy-studio-fab${
          hyper === 'hard' || hyper === 'strong' || hasUnread ? ' is-alert' : ''
        }${
          hop > 0 && !reduceMotion ? ' buddy-hop-in' : ''
        }${hasUnread ? ' has-unread' : ''}`}
        style={posStyle}
        key={`fab-${spot?.id || 'br'}-${hop}`}
        onClick={(e) => {
          e.stopPropagation()
          openPanel()
        }}
        aria-label={`Open Helper${hasUnread ? ', new message' : ''}`}
        title={hasUnread ? 'New tip' : 'Helper'}
      >
        <HelperCharacterLottie
          className="buddy-fab-img"
          mood={mood}
          reduceMotion={reduceMotion}
          size={56}
          shape="circle"
          fallbackSrc={HELPER_FALLBACK}
        />
        {(overdue.length > 0 ||
          hyper === 'hard' ||
          hyper === 'strong' ||
          hasUnread) && (
          <span className="buddy-fab-dot" aria-hidden="true" />
        )}
      </button>
    )
  }

  const recentMsgs = messages.slice(-3)
  const latestBuddy = [...messages].reverse().find((m) => m.from === 'buddy')
  const panelMood =
    recentWin || mood === 'happy'
      ? 'happy'
      : hyper === 'hard' || hyper === 'strong'
        ? 'think'
        : mood === 'rest'
          ? 'rest'
          : 'idle'

  // ——— Expanded: coach card ———
  return (
    <div
      ref={shellRef}
      className={`buddy-shell buddy-float is-compact-dock buddy-studio${
        isFocusRunning ? ' is-focus' : ''
      }${hyper === 'hard' || hyper === 'strong' ? ' is-hyper' : ''}${
        hop > 0 && !reduceMotion ? ' buddy-hop-in' : ''
      }`}
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
              <HelperCharacterLottie
                className={`buddy-compact-face mood-${panelMood}${
                  reduceMotion ? ' no-motion' : ''
                }`}
                mood={panelMood}
                reduceMotion={reduceMotion}
                size={40}
                shape="circle"
                fallbackSrc={HELPER_FALLBACK}
              />
              <div className="buddy-compact-titles">
                <div className="buddy-compact-name-row">
                  <strong className="bf-name">Helper</strong>
                  <span
                    className={`helper-ai-badge is-${
                      aiStatus.observed === 'failing' ? 'degraded' : aiStatus.mode
                    }`}
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
                aria-label="Minimize"
                title="Minimize"
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

          {(hyper === 'strong' || hyper === 'hard') && (
            <div className={`buddy-hyper-banner bf-hyper level-${hyper}`}>
              {hyper === 'hard' ? 'Break ok' : 'Pause soon'}
            </div>
          )}

          <div className="buddy-compact-chat" ref={listRef}>
            {recentMsgs.length === 0 && latestBuddy && (
              <div className="buddy-msg buddy-msg-buddy">
                {latestBuddy.text}
                {latestBuddy.offline && <OfflineNote />}
              </div>
            )}
            {recentMsgs.map((m) => (
              <div
                key={m.id}
                className={`buddy-msg buddy-msg-${m.from}`}
              >
                {m.text}
                {m.offline && <OfflineNote />}
                {m.proposals?.length > 0 && (
                  <div className="buddy-proposals">
                    {/* Proposed, not done. The wording is deliberate: the
                        Helper has changed nothing at this point, and a label
                        implying otherwise would make the press feel like a
                        confirmation of something already true. */}
                    {m.proposals.map((p, i) => {
                      const state = appliedIds[`${m.id}:${i}`]
                      return (
                        <button
                          key={i}
                          type="button"
                          className="buddy-proposal"
                          disabled={!!state}
                          onClick={() => runProposal(m.id, i, p)}
                        >
                          {state === 'done' ? '✓ ' : state === 'failed' ? '· ' : '+ '}
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* The thing that was missing. Twelve canned intents and nowhere to
              say what you were actually stuck on — so the Helper could answer
              but could not be asked.

              Enter sends; the button is there because Enter-to-send is a
              convention you have to already know, and this is the surface you
              reach for when you are least able to guess at one. Disabled while
              a reply is in flight so a second question cannot orphan the
              first, which would leave you watching a "…" that answers
              something you no longer asked. */}
          <form
            className="buddy-ask"
            onSubmit={(e) => {
              e.preventDefault()
              void askQuestion()
            }}
          >
            <input
              className="buddy-ask-input"
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              placeholder="Ask anything"
              aria-label="Ask the Helper"
              maxLength={500}
              disabled={aiBusy}
            />
            <button
              type="submit"
              className="buddy-ask-send"
              disabled={aiBusy || !askText.trim()}
            >
              Ask
            </button>
          </form>

          {/* Redesign brief: three verbs only — Coach · Critique · Break */}
          <div
            className="buddy-compact-actions buddy-act-grid buddy-act-three"
            aria-label="Helper actions"
          >
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
                  if (next) setShowMore(false)
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
                <p className="buddy-wellness-label">Body</p>
                <div className="buddy-wellness-row">
                  <button
                    type="button"
                    className={`buddy-check${
                      overdue.includes('water') ? ' is-due' : ''
                    }`}
                    onClick={() => logWellness('water', 'Water')}
                  >
                    Water
                  </button>
                  <button
                    type="button"
                    className={`buddy-check${
                      overdue.includes('food') ? ' is-due' : ''
                    }`}
                    onClick={() => logWellness('food', 'Food')}
                  >
                    Food
                  </button>
                  <button
                    type="button"
                    className={`buddy-check${
                      overdue.includes('bathroom') ? ' is-due' : ''
                    }`}
                    onClick={() => logWellness('bathroom', 'Bathroom')}
                  >
              Bathroom
                  </button>
                </div>
                <button
                  type="button"
                  className="buddy-break-btn"
                  onClick={logBreak}
                >
                  Log break
                </button>
              </div>
              <div className="buddy-kit" aria-label="Break kit">
                <p className="buddy-wellness-label">Kit</p>
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
                    placeholder="Med / to-do"
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
                          {k.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="buddy-kit-add-btn"
                      onClick={submitKitItem}
                    >
              Add break task
                    </button>
                  </div>
                </div>
                {openKit.length > 0 && (
                  <ul className="buddy-kit-list">
                    {openKit.slice(0, 5).map((item) => {
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
            {showMore ? 'Less' : 'More'}
            <span className="buddy-more-chevron" aria-hidden="true">
              {showMore ? '▴' : '▾'}
            </span>
          </button>

          {showMore && (
            <div className="buddy-more bf-more-panel is-inline">
              <div className="buddy-process" aria-label="Process">
                <p className="buddy-wellness-label">Path</p>
                <div className="buddy-process-row">
                  {PROCESS_STEMS.map(([k, stem]) => (
                    <button
                      key={k}
                      type="button"
                      className="buddy-quick-btn"
                      onClick={() => reply(k)}
                      disabled={aiBusy}
                      title={k[0].toUpperCase() + k.slice(1)}
                    >
                      {stem}
                    </button>
                  ))}
                </div>
              </div>

              <div className="buddy-quick">
                <button
                  type="button"
                  className="buddy-quick-btn"
                  onClick={() => reply('stuck')}
                  disabled={aiBusy}
                >
              Help me get unstuck
                </button>
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
              Plan my time
                </button>
                <button
                  type="button"
                  className="buddy-quick-btn"
                  onClick={() => reply('progress')}
                  disabled={aiBusy}
                >
              Show my progress
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Compact CSS face kept as fallback if images fail to load elsewhere */
