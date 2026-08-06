import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import useAppStore from '../store/useAppStore.js'
import { JOURNEY_STEPS } from './journey/journey.js'

/**
 * Seconds → the chip's reading.
 *
 * Exported and pure so it is testable at all. Inline in App.jsx this was an
 * IIFE over component state, reachable only by rendering the whole app; the
 * suite runs in `node` with no DOM, so nothing could touch it. Splitting the
 * formatting from the ticking is what makes the rule — words under a minute,
 * then minutes, then hours — checkable without a browser.
 *
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatSessionLabel(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  if (m < 1) return 'just started'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h}h ${rem}m` : `${h}h`
}

/**
 * The work clock: a record of what you actually worked on, kept per stage and
 * per project.
 *
 * Lifted out of App.jsx unchanged. It was ~130 lines holding two pieces of
 * state, five refs and six effects among sixty-odd other useStates, and none
 * of it was App's business — nothing outside App read any of it, and the two
 * values the app does consume (`workRunning`, `sessionLabel`) are the header
 * chip's gate and its text. That is the whole interface, and it was the last
 * thing you could see while the clock was inline.
 *
 * @param {object} opts
 * @param {string} opts.activeView       current view id
 * @param {string|number|null} opts.activeProjectId
 * @param {object|null} opts.forcedBreak the break overlay, if one is up
 * @param {(msg: string) => void} [opts.flashToast]
 * @returns {{ workRunning: boolean, sessionLabel: string }}
 */
export function useWorkClock({
  activeView,
  activeProjectId,
  forcedBreak,
  flashToast,
}) {
  /* Seconds at the desk this sitting. Not the Pomodoro's countdown — this is
     a record of what you had done. It advances only while the clock is
     genuinely running: never during a forced break, and never across an idle
     pause. */
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const sessionLabel = formatSessionLabel(sessionSeconds)

  /* ── Idle handling ───────────────────────────────────────────────────────
     The timer counts time at the desk, not time working, so walking away
     bills you for the walk. Worse for the record than for the countdown:
     these sessions are meant to become a log of what was actually worked on,
     and a lunch break silently logged as Research makes the whole log
     untrustworthy.

     Idle can only be detected AFTER the fact — you cannot know someone
     stopped until they have been stopped a while. So by the time this fires,
     the timer has already counted the full idle window. Pausing alone would
     keep that mistake; the window is handed back on resume, which is what
     makes the recorded time honest rather than merely stopped. */
  const IDLE_MS = 10 * 60 * 1000
  const lastActivityRef = useRef(Date.now())
  const idlePausedRef = useRef(false)
  /** When the current stretch of actual work began. Reset on every pause and
   *  resume, so what gets logged is worked time, never wall-clock time. */
  const workSegmentStartRef = useRef(null)

  const logWorkedTime = useCallback(
    (...a) => useAppStore.getState().logWorkedTime(...a),
    []
  )

  /* ── The work clock is INDEPENDENT of the Pomodoro ──────────────────────
     They used to be one clock: `isFocusRunning` drove both, so the record of
     what you worked on stopped dead at 25 minutes and handed you a forced
     break. Two unrelated jobs — one quietly keeping a log, the other pacing
     you — and tying them together meant the log could only ever describe the
     first 25 minutes of anything.

     This clock runs whenever you are on a project stage and not idle. No
     target, no end, no forced break: it stops when you stop. The Pomodoro
     keeps its own countdown and is headed for Helper. */
  /* Derived from JOURNEY_STEPS, not written out by hand. This WAS a literal
     list — 'define', 'research', 'ideate', 'sketch', 'design', 'deliver' —
     and only two of those eight strings are real view ids. The clock was
     therefore silent on five of the seven stages: you could work an
     afternoon in Design and it would record nothing, because `activeView`
     there is 'brand'. A stage list that has to be kept in step with the
     journey by hand will drift again, so it reads from the journey. */
  const STAGE_VIEWS = useMemo(
    () => JOURNEY_STEPS.map((s) => s.view).filter(Boolean),
    []
  )

  const [workIdle, setWorkIdle] = useState(false)
  const workRunning =
    STAGE_VIEWS.includes(String(activeView || '')) && !workIdle && !forcedBreak

  /** Last path stage while the work clock was running (view id). */
  const workStageRef = useRef(
    STAGE_VIEWS.includes(String(activeView || '')) ? activeView : null
  )

  /** Bank the stretch that just ended. Called on idle, on stopping, stage
   *  change, and leaving — anywhere the clock stops for any reason.
   *  Tags the path page you were on — never sticky `timerFocusSource`
   *  (that is Timer return UX only) and never off-path tools views. */
  /** Project id for the open stretch — bank under this when switching projects. */
  const workProjectRef = useRef(activeProjectId)

  const bankWorkSegment = useCallback(
    (endedAt = Date.now(), stageOverride, projectOverride) => {
      const started = workSegmentStartRef.current
      workSegmentStartRef.current = null
      if (!started) return
      const stage = stageOverride ?? workStageRef.current ?? activeView
      if (!STAGE_VIEWS.includes(String(stage || ''))) return
      const projectId = projectOverride ?? workProjectRef.current ?? activeProjectId
      logWorkedTime?.(projectId, stage, endedAt - started)
    },
    [logWorkedTime, activeProjectId, activeView, STAGE_VIEWS]
  )

  /** Open a stretch when the clock starts, bank it when it stops. */
  useEffect(() => {
    if (workRunning) {
      if (!workSegmentStartRef.current) {
        workSegmentStartRef.current = Date.now()
        workStageRef.current = activeView
        workProjectRef.current = activeProjectId
      }
    } else {
      bankWorkSegment()
    }
  }, [workRunning, bankWorkSegment, activeView, activeProjectId])

  /** Split the bank when the user moves to another path stage while working. */
  useEffect(() => {
    if (!workRunning) return
    const prev = workStageRef.current
    if (prev && prev !== activeView && workSegmentStartRef.current) {
      bankWorkSegment(Date.now(), prev)
      workSegmentStartRef.current = Date.now()
    }
    workStageRef.current = activeView
  }, [activeView, workRunning, bankWorkSegment])

  /** Same, for switching project while the clock is running. */
  useEffect(() => {
    if (!workRunning) {
      workProjectRef.current = activeProjectId
      return
    }
    const prev = workProjectRef.current
    if (
      prev != null &&
      activeProjectId != null &&
      String(prev) !== String(activeProjectId) &&
      workSegmentStartRef.current
    ) {
      bankWorkSegment(Date.now(), workStageRef.current, prev)
      workSegmentStartRef.current = Date.now()
    }
    workProjectRef.current = activeProjectId
  }, [activeProjectId, workRunning, bankWorkSegment])

  /** One second per second, for as long as you are working. Its own interval,
   *  not the Pomodoro's — that one dies at zero and takes the record with it. */
  useEffect(() => {
    if (!workRunning) return undefined
    const id = window.setInterval(() => setSessionSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [workRunning])

  useEffect(() => {
    const mark = () => {
      lastActivityRef.current = Date.now()
      if (idlePausedRef.current) {
        idlePausedRef.current = false
        setWorkIdle(false)
        /* Hand back the window that was counted while nobody was here. Idle
           is only detectable after the fact — you cannot know someone stopped
           until they have been stopped a while — so by the time the check
           fires, the clock has already run through the whole window. Pausing
           alone would keep that mistake on the books. */
        setSessionSeconds((s) => Math.max(0, s - IDLE_MS / 1000))
        flashToast?.('Back — the last 10 minutes weren’t counted')
      }
    }
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart']
    events.forEach((n) => window.addEventListener(n, mark, { passive: true }))
    return () => events.forEach((n) => window.removeEventListener(n, mark))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!workRunning) return undefined
    const id = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current < IDLE_MS) return
      idlePausedRef.current = true
      // Bank only up to when activity actually stopped, not to now — the idle
      // window itself is never logged as work.
      bankWorkSegment(lastActivityRef.current)
      setWorkIdle(true)
    }, 15000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workRunning, bankWorkSegment])

  /* Bank on hide so a closed tab does not lose the stretch; restart on
     return so hours keep recording after the user comes back. */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        bankWorkSegment()
        return
      }
      if (
        document.visibilityState === 'visible' &&
        STAGE_VIEWS.includes(String(activeView || '')) &&
        !workIdle &&
        !forcedBreak &&
        !workSegmentStartRef.current
      ) {
        workSegmentStartRef.current = Date.now()
        workStageRef.current = activeView
        workProjectRef.current = activeProjectId
      }
    }
    const onPageHide = () => bankWorkSegment()
    window.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [bankWorkSegment, activeView, activeProjectId, workIdle, forcedBreak, STAGE_VIEWS])

  return { workRunning, sessionLabel }
}

export default useWorkClock
