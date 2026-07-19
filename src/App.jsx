import { useState, useEffect, useMemo, useRef } from 'react'
import useAppStore from './store/useAppStore'
import {
  DEFAULT_PALETTE,
  normalizeHex,
  buildPairChecks,
  bestTextOn,
  formatRatio,
} from './lib/color'
import {
  BREAKDOWN_DEPTHS,
  generateProjectMicrosteps,
} from './lib/microsteps'
import {
  toISODate,
  buildMonthGrid,
  formatMonthYear,
  formatShortDate,
  urgencyLabel,
  deadlineUrgency,
  daysUntil,
} from './lib/dates'
import {
  APP_BUILD,
  APP_BUILD_DATE,
  versionLabel,
} from './lib/version'
import LoginPage from './components/LoginPage'
import BuddyMate from './components/BuddyMate'
import ConceptPipeline from './components/ConceptPipeline'
import ForcedBreakOverlay from './components/ForcedBreakOverlay'
import GameHUD from './components/GameHUD'
import {
  breakMinutesForWork,
  POMODORO_WORK_MIN,
} from './lib/forcedBreak'
import { pickBreakPlan } from './lib/breakKit'
import { markBreak, minutesSinceBreak, loadSessionStart, loadWellness } from './lib/buddy'
import { awardAndBroadcast } from './lib/buddyGame'
import {
  JOURNEY_STEPS,
  journeyIdForView,
  getJourneyStep,
  getNextJourney,
} from './lib/journey'
import { PROCESS_PHASES, getProcessPhase } from './lib/processGuide'
import {
  buildBrandPackSnapshot,
  downloadBrandPackHtml,
  downloadBrandPackMarkdown,
  downloadBrandPackJson,
  downloadWorkspaceBackup,
  printElementById,
} from './lib/exportFiles'
import {
  isSessionOpen,
  closeSession,
  getSession,
  changeAccessPassword,
  STORAGE_EXPLAIN,
} from './lib/auth'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  pullWorkspace,
  pushWorkspace,
  signOutCloud,
} from './lib/cloudSync'

const CLOUD = isSupabaseConfigured()

function App() {
  // ——— Zustand (persisted studio state) ———
  const projects = useAppStore((s) => s.projects)
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const tasks = useAppStore((s) => s.tasks)
  const moodItems = useAppStore((s) => s.moodItems)
  const theme = useAppStore((s) => s.theme)
  const bodyDoubling = useAppStore((s) => s.bodyDoubling)
  const onboarded = useAppStore((s) => s.onboarded)
  const currentSpark = useAppStore((s) => s.currentSpark)
  const addProject = useAppStore((s) => s.addProject)
  const setCurrentProject = useAppStore((s) => s.setCurrentProject)
  const updateProjectBrief = useAppStore((s) => s.updateProjectBrief)
  const setLogoDirection = useAppStore((s) => s.setLogoDirection)
  const updatePaletteColor = useAppStore((s) => s.updatePaletteColor)
  const addPaletteColor = useAppStore((s) => s.addPaletteColor)
  const removePaletteColor = useAppStore((s) => s.removePaletteColor)
  const setProjectPalette = useAppStore((s) => s.setProjectPalette)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const setBodyDoubling = useAppStore((s) => s.setBodyDoubling)
  const toggleBodyDoubling = useAppStore((s) => s.toggleBodyDoubling)
  const setOnboarded = useAppStore((s) => s.setOnboarded)
  const addTask = useAppStore((s) => s.addTask)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const updateTaskTitle = useAppStore((s) => s.updateTaskTitle)
  const removeTask = useAppStore((s) => s.removeTask)
  const breakIntoSteps = useAppStore((s) => s.breakIntoSteps)
  const addMoodPin = useAppStore((s) => s.addMoodPin)
  const updateMoodPinNote = useAppStore((s) => s.updateMoodPinNote)
  const removeMoodPin = useAppStore((s) => s.removeMoodPin)
  const nextSpark = useAppStore((s) => s.nextSpark)
  const createNewProject = useAppStore((s) => s.createNewProject)
  const addMicroStepsBatch = useAppStore((s) => s.addMicroStepsBatch)
  const setProjectDeadline = useAppStore((s) => s.setProjectDeadline)
  const setTaskDueDate = useAppStore((s) => s.setTaskDueDate)
  const prefs = useAppStore((s) => s.prefs) || {}
  const setPref = useAppStore((s) => s.setPref)
  const exportAllData = useAppStore((s) => s.exportAllData)
  const importAllData = useAppStore((s) => s.importAllData)
  const hydrateFromPayload = useAppStore((s) => s.hydrateFromPayload)
  const clearAllData = useAppStore((s) => s.clearAllData)
  const clearToEmpty = useAppStore((s) => s.clearToEmpty)
  const renameProject = useAppStore((s) => s.renameProject)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const breakKit = useAppStore((s) => s.breakKit)
  const completeBreakKitItem = useAppStore((s) => s.completeBreakKitItem)
  const breakKitRef = useRef(breakKit)
  breakKitRef.current = breakKit

  // ——— Ephemeral UI (not persisted) ———
  const [activeView, setActiveView] = useState('flow')
  const [quickInput, setQuickInput] = useState('')
  const [captureEnergy, setCaptureEnergy] = useState('med')
  const [focusLeft, setFocusLeft] = useState(POMODORO_WORK_MIN * 60)
  const [isFocusRunning, setIsFocusRunning] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [pomodoroWorkStartedAt, setPomodoroWorkStartedAt] = useState(null)
  /** @type {null | { totalSec: number, leftSec: number, workMinutes: number, breakMinutes: number, planItems: array, completedIds: string[] }} */
  const [forcedBreak, setForcedBreak] = useState(null)
  const focusMinutes = Math.floor(focusLeft / 60)
  const focusSeconds = focusLeft % 60
  const forcedBreakRef = useRef(null)
  forcedBreakRef.current = forcedBreak
  const [showCreativeReset, setShowCreativeReset] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardName, setOnboardName] = useState('')
  const [onboardBrief, setOnboardBrief] = useState('')
  const [onboardFirstStep, setOnboardFirstStep] = useState('')
  const [processPhase, setProcessPhase] = useState(null)
  const [exportPanel, setExportPanel] = useState(null)
  const [savePulse, setSavePulse] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [captureOptionsOpen, setCaptureOptionsOpen] = useState(false)
  const [checkBgIndex, setCheckBgIndex] = useState(0)
  const [hexDrafts, setHexDrafts] = useState({})
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [breakdownStep, setBreakdownStep] = useState(0)
  const [bdGoal, setBdGoal] = useState('')
  const [bdDone, setBdDone] = useState('')
  const [bdDepth, setBdDepth] = useState('standard')
  const [bdEnergy, setBdEnergy] = useState('low')
  const [bdSteps, setBdSteps] = useState([])
  const [breakdownAdded, setBreakdownAdded] = useState(0)
  const [captureDue, setCaptureDue] = useState('')
  const [calCursor, setCalCursor] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [boardUrl, setBoardUrl] = useState('')
  const [boardNote, setBoardNote] = useState('')
  const [boardAddMode, setBoardAddMode] = useState(null) // 'url' | 'note' | null
  const [queueOpen, setQueueOpen] = useState(false)
  const [doneOpen, setDoneOpen] = useState(false)
  const [actionToast, setActionToast] = useState('')
  const [stepFocusKey, setStepFocusKey] = useState(0)
  const [stepDueOpen, setStepDueOpen] = useState(false)
  const [projectNameDraft, setProjectNameDraft] = useState('')
  const [unlocked, setUnlocked] = useState(() =>
    CLOUD ? false : isSessionOpen()
  )
  const [accessName, setAccessName] = useState(() =>
    CLOUD ? '' : getSession()?.name || ''
  )
  const [cloudUser, setCloudUser] = useState(null)
  const [authReady, setAuthReady] = useState(!CLOUD)
  const [cloudHydrating, setCloudHydrating] = useState(false)
  const [syncState, setSyncState] = useState('idle') // idle | syncing | ok | error
  const [syncError, setSyncError] = useState('')
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNext, setPwNext] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [buddyWinPulse, setBuddyWinPulse] = useState(0)
  const moreWrapRef = useRef(null)
  const accountWrapRef = useRef(null)
  const importFileRef = useRef(null)
  const cloudSyncReady = useRef(false)
  const skipNextCloudPush = useRef(false)
  const lastSyncErrorToast = useRef('')

  const showHowItWorks = prefs.showHowItWorks !== false
  const queueCollapsed = prefs.queueCollapsed !== false
  const soundEnabled = prefs.soundEnabled !== false
  const reduceMotion = !!prefs.reduceMotion
  /** Pomodoro desk lock — default on; user can disable */
  const forceBreaksEnabled = prefs.forceBreaksEnabled !== false
  const forceBreaksEnabledRef = useRef(forceBreaksEnabled)
  forceBreaksEnabledRef.current = forceBreaksEnabled


  const activeProjectId = currentProjectId
  const activeProject = projects.find((p) => p.id === activeProjectId)
  const projectPalette =
    activeProject?.palette?.length > 0
      ? activeProject.palette
      : DEFAULT_PALETTE
  const deskTasks = (tasks || []).filter(
    (t) => t.projectId == null || t.projectId === activeProjectId
  )
  const openTasks = deskTasks.filter((t) => !t.completed)
  const doneTasks = deskTasks.filter((t) => t.completed)
  const nextTask = openTasks[0] || null
  const queueTasks = openTasks.slice(1)
  const deskMood = (moodItems || []).filter(
    (m) => m.projectId == null || m.projectId === activeProjectId
  )
  const completedCount = doneTasks.length
  const progressPercent =
    deskTasks.length > 0
      ? Math.round((completedCount / deskTasks.length) * 100)
      : 0

  const projectDeadline = activeProject?.deadline || ''
  const projectUrgency = projectDeadline
    ? deadlineUrgency(projectDeadline)
    : null

  const calendarEvents = useMemo(() => {
    const map = {}
    const add = (iso, item) => {
      if (!iso) return
      if (!map[iso]) map[iso] = []
      map[iso].push(item)
    }
    ;(projects || []).forEach((p) => {
      if (p.deadline) {
        add(p.deadline, {
          type: 'project',
          id: `p-${p.id}`,
          label: p.name,
          projectId: p.id,
        })
      }
    })
    ;(tasks || []).forEach((t) => {
      if (t.dueDate && !t.completed) {
        const proj = (projects || []).find((p) => p.id === t.projectId)
        add(t.dueDate, {
          type: 'task',
          id: `t-${t.id}`,
          label: t.title,
          projectId: t.projectId,
          projectName: proj?.name,
        })
      }
    })
    return map
  }, [projects, tasks])

  const upcomingDeadlines = useMemo(() => {
    const rows = []
    ;(projects || []).forEach((p) => {
      if (!p.deadline) return
      rows.push({
        kind: 'project',
        id: p.id,
        name: p.name,
        date: p.deadline,
        urgency: deadlineUrgency(p.deadline),
        days: daysUntil(p.deadline),
      })
    })
    ;(tasks || [])
      .filter((t) => t.dueDate && !t.completed)
      .forEach((t) => {
        rows.push({
          kind: 'task',
          id: t.id,
          name: t.title,
          date: t.dueDate,
          urgency: deadlineUrgency(t.dueDate),
          days: daysUntil(t.dueDate),
          projectId: t.projectId,
        })
      })
    return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [projects, tasks])

  const selectProject = (id) => setCurrentProject(id)

  // Keep checker bg valid when palette shrinks; seed missing project palettes
  useEffect(() => {
    if (!activeProject) return
    if (!activeProject.palette?.length) {
      setProjectPalette([...DEFAULT_PALETTE])
    }
  }, [activeProject?.id, activeProject?.palette, setProjectPalette])

  useEffect(() => {
    if (checkBgIndex >= projectPalette.length) {
      setCheckBgIndex(Math.max(0, projectPalette.length - 1))
    }
  }, [projectPalette.length, checkBgIndex])

  const checkBg =
    projectPalette[checkBgIndex] || projectPalette[0] || '#FFFFFF'

  const contrastPairs = useMemo(
    () => buildPairChecks(projectPalette, checkBg),
    [projectPalette, checkBg]
  )

  const handleHexChange = (index, raw) => {
    setHexDrafts((d) => ({ ...d, [index]: raw }))
    const n = normalizeHex(raw)
    if (n) updatePaletteColor(index, n)
  }

  const commitHex = (index) => {
    const draft = hexDrafts[index]
    if (draft == null) return
    const n = normalizeHex(draft)
    if (n) updatePaletteColor(index, n)
    setHexDrafts((d) => {
      const next = { ...d }
      delete next[index]
      return next
    })
  }

  const hideHowItWorks = () => setPref('showHowItWorks', false)
  const revealHowItWorks = () => setPref('showHowItWorks', true)

  const flashToast = (msg) => {
    setActionToast(msg)
    window.setTimeout(() => setActionToast(''), 3200)
  }

  const completeCurrentStep = () => {
    if (!nextTask) return
    toggleTask(nextTask.id)
    setStepDueOpen(false)
    setBuddyWinPulse((n) => n + 1)
    const g = awardAndBroadcast('step_complete', { label: 'Step done' })
    const comboBit = g.combo > 1 ? ` · ${g.combo}x combo` : ''
    flashToast(
      g.levelUp
        ? `Step complete · Level ${g.newLevel}!${comboBit}`
        : `Step complete · +${g.gained} XP${comboBit}`
    )
    setStepFocusKey((k) => k + 1)
  }

  const projectPills = (
    <div className="project-pills" role="tablist" aria-label="Project">
      {(projects || []).map((p) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={activeProjectId === p.id}
          onClick={() => selectProject(p.id)}
          className={
            activeProjectId === p.id ? 'project-pill is-active' : 'project-pill'
          }
        >
          {p.name}
        </button>
      ))}
    </div>
  )

  // Keyboard: ⌘K spark · Esc dismiss overlays
  useEffect(() => {
    const handleKey = (e) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault()
        setActiveView('spark')
        setMoreOpen(false)
        return
      }
      if (e.key === 'Escape') {
        setMoreOpen(false)
        setShowCreativeReset(false)
        setExportPanel(null)
        setShowBreakdown(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Click outside closes More menu
  useEffect(() => {
    if (!moreOpen) return undefined
    const onPointer = (e) => {
      const wrap = document.querySelector('.more-wrap')
      if (wrap && !wrap.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [moreOpen])

  const playBreakChime = () => {
    if (!soundEnabled) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 660
      gain.gain.value = 0.06
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      setTimeout(() => {
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)
        setTimeout(() => osc.stop(), 900)
      }, 200)
    } catch {
      /* ignore */
    }
  }

  const startForcedBreak = (workMinutes, reason = 'pomodoro') => {
    if (forcedBreakRef.current) return
    const workMin = Math.max(1, Number(workMinutes) || POMODORO_WORK_MIN)
    const breakMin = breakMinutesForWork(workMin)

    // User turned lockouts off — soft landing only
    if (!forceBreaksEnabledRef.current) {
      setIsFocusRunning(false)
      setSessionComplete(true)
      setPomodoroWorkStartedAt(null)
      markBreak()
      playBreakChime()
      flashToast(
        `Work block done (~${Math.round(workMin)} min). Forced lockouts are off — stretch if you can.`
      )
      return
    }

    const totalSec = breakMin * 60
    const plan = pickBreakPlan(breakKitRef.current || [], breakMin)
    const planItems =
      plan.empty && plan.fallback?.length
        ? plan.fallback
        : plan.items || []
    setIsFocusRunning(false)
    setSessionComplete(true)
    setPomodoroWorkStartedAt(null)
    setMoreOpen(false)
    setAccountOpen(false)
    setForcedBreak({
      totalSec,
      leftSec: totalSec,
      workMinutes: workMin,
      breakMinutes: breakMin,
      reason,
      planItems,
      completedIds: [],
    })
    playBreakChime()
    const kitN = planItems.length
    flashToast(
      kitN > 0
        ? `Break locked: ${breakMin} min · ${kitN} kit item${kitN === 1 ? '' : 's'} for this window`
        : `Break locked: ${breakMin} min (you worked ~${Math.round(workMin)} min)`
    )
  }

  const completeBreakPlanItem = (item) => {
    if (!item?.id) return
    const isFallback = String(item.id).startsWith('_')
    if (!isFallback) {
      completeBreakKitItem(item.id)
      awardAndBroadcast('break_kit', { label: item.title })
    } else {
      // Generic body fallbacks still count as tiny care XP
      if (item.id === '_water') {
        awardAndBroadcast('water', { label: 'Break water' })
      } else {
        awardAndBroadcast('break_kit', { label: item.title })
      }
    }
    setForcedBreak((fb) => {
      if (!fb) return null
      if (fb.completedIds?.includes(item.id)) return fb
      return {
        ...fb,
        completedIds: [...(fb.completedIds || []), item.id],
      }
    })
  }

  const endForcedBreak = (emergency = false) => {
    markBreak()
    setForcedBreak(null)
    setPomodoroWorkStartedAt(Date.now())
    setFocusLeft(POMODORO_WORK_MIN * 60)
    setSessionComplete(false)
    if (!emergency) {
      awardAndBroadcast('break_complete', { label: 'Pomodoro break' })
      awardAndBroadcast('pomodoro_work', { label: 'Focus cycle' })
    }
    flashToast(
      emergency
        ? 'Break ended early (emergency). Try to rest next cycle.'
        : 'Break done · XP earned. Welcome back.'
    )
  }

  // Focus countdown — when a Pomodoro ends, force a break
  useEffect(() => {
    if (!isFocusRunning || forcedBreak) return undefined
    const id = window.setInterval(() => {
      setFocusLeft((left) => {
        if (left <= 1) {
          setIsFocusRunning(false)
          setSessionComplete(true)
          const started =
            pomodoroWorkStartedAt ||
            Date.now() - POMODORO_WORK_MIN * 60 * 1000
          const workedMin = Math.max(
            1,
            Math.round((Date.now() - started) / 60000)
          )
          window.setTimeout(() => {
            startForcedBreak(Math.max(workedMin, 5), 'pomodoro')
          }, 80)
          return 0
        }
        return left - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocusRunning, forcedBreak, pomodoroWorkStartedAt])

  // Forced break countdown (blocks whole app)
  useEffect(() => {
    if (!forcedBreak) return undefined
    if (forcedBreak.leftSec <= 0) {
      endForcedBreak(false)
      return undefined
    }
    const id = window.setInterval(() => {
      setForcedBreak((fb) => {
        if (!fb) return null
        if (fb.leftSec <= 1) return { ...fb, leftSec: 0 }
        return { ...fb, leftSec: fb.leftSec - 1 }
      })
    }, 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedBreak?.totalSec, forcedBreak != null, forcedBreak?.leftSec === 0])

  // Auto-Pomodoro when helper (buddy) is on: 25+ min without break → lock
  useEffect(() => {
    if (!unlocked || !bodyDoubling || forcedBreak) return undefined
    const id = window.setInterval(() => {
      if (forcedBreakRef.current) return
      const wellness = loadWellness()
      const sessionStart = loadSessionStart()
      const mins = minutesSinceBreak(wellness, sessionStart)
      if (mins >= POMODORO_WORK_MIN) {
        startForcedBreak(mins, 'auto-pomodoro')
      }
    }, 12000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, bodyDoubling, forcedBreak])

  // XP when you reach Finish step
  useEffect(() => {
    if (activeView === 'finish' && unlocked) {
      awardAndBroadcast('journey_finish', { label: 'Finish step' })
    }
  }, [activeView, unlocked])

  // Respect reduce-motion preference on <html>
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion
      ? 'true'
      : 'false'
  }, [reduceMotion])

  // Close More / Account menus on outside click / Escape
  useEffect(() => {
    if (!moreOpen && !accountOpen) return
    const onPointer = (e) => {
      if (
        moreOpen &&
        moreWrapRef.current &&
        !moreWrapRef.current.contains(e.target)
      ) {
        setMoreOpen(false)
      }
      if (
        accountOpen &&
        accountWrapRef.current &&
        !accountWrapRef.current.contains(e.target)
      ) {
        setAccountOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMoreOpen(false)
        setAccountOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen, accountOpen])

  // Surface sync errors as action toast (not only footer)
  useEffect(() => {
    if (!CLOUD) return
    if (syncState === 'error' && syncError) {
      if (lastSyncErrorToast.current !== syncError) {
        lastSyncErrorToast.current = syncError
        setActionToast(`Sync failed — ${syncError}`)
        window.setTimeout(() => setActionToast(''), 4200)
      }
    }
    if (syncState === 'ok') lastSyncErrorToast.current = ''
  }, [CLOUD, syncState, syncError])

  // Supabase session bootstrap
  useEffect(() => {
    if (!CLOUD || !supabase) {
      setAuthReady(true)
      return
    }
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      const session = data.session
      if (session?.user) {
        setCloudUser(session.user)
        setAccessName(session.user.email || 'Account')
        setUnlocked(true)
      }
      setAuthReady(true)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return
      if (session?.user) {
        setCloudUser(session.user)
        setAccessName(session.user.email || 'Account')
        setUnlocked(true)
      } else {
        setCloudUser(null)
        setAccessName('')
        setUnlocked(false)
        cloudSyncReady.current = false
      }
    })
    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])

  // Pull cloud workspace after sign-in
  useEffect(() => {
    if (!CLOUD || !unlocked || !cloudUser) return
    let cancelled = false
    ;(async () => {
      setCloudHydrating(true)
      setSyncError('')
      const result = await pullWorkspace()
      if (cancelled) return
      if (!result.ok) {
        setSyncState('error')
        setSyncError(result.error || 'Could not load cloud desk')
        setCloudHydrating(false)
        cloudSyncReady.current = true
        return
      }
      if (result.payload && Array.isArray(result.payload.projects)) {
        skipNextCloudPush.current = true
        hydrateFromPayload(result.payload)
        setSyncState('ok')
      } else {
        // Cloud empty → seed from local cache if any real work exists
        const local = exportAllData()
        const hasLocal =
          Array.isArray(local.projects) &&
          local.projects.length > 0 &&
          (local.onboarded ||
            (local.tasks || []).some((t) => !t.seeded) ||
            local.projects.some((p) => !p.seeded))
        if (hasLocal && local.onboarded) {
          const push = await pushWorkspace(local)
          setSyncState(push.ok ? 'ok' : 'error')
          if (!push.ok) setSyncError(push.error || 'Upload failed')
        } else {
          setSyncState('ok')
        }
      }
      setCloudHydrating(false)
      cloudSyncReady.current = true
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on user change only
  }, [CLOUD, unlocked, cloudUser?.id])

  // Debounced push to Supabase when desk changes
  useEffect(() => {
    if (!CLOUD || !unlocked || !cloudUser || !cloudSyncReady.current) return
    if (skipNextCloudPush.current) {
      skipNextCloudPush.current = false
      return
    }
    if (cloudHydrating) return
    setSyncState('syncing')
    const t = window.setTimeout(async () => {
      const payload = exportAllData()
      const result = await pushWorkspace(payload)
      if (result.ok) {
        setSyncState('ok')
        setSyncError('')
      } else {
        setSyncState('error')
        setSyncError(result.error || 'Sync failed')
      }
    }, 1200)
    return () => window.clearTimeout(t)
  }, [
    CLOUD,
    unlocked,
    cloudUser?.id,
    cloudHydrating,
    projects,
    tasks,
    moodItems,
    theme,
    prefs,
    currentProjectId,
    onboarded,
    exportAllData,
  ])

  // First-run project gate (after access unlock)
  useEffect(() => {
    if (unlocked && !cloudHydrating && !onboarded) setShowOnboarding(true)
  }, [unlocked, onboarded, cloudHydrating])

  // Keep rename field in sync with active project
  useEffect(() => {
    setProjectNameDraft(activeProject?.name || '')
  }, [activeProject?.id, activeProject?.name])

  // Autosave pulse — skip first mount so load doesn’t flash “Saved”
  const savePulseReady = useRef(false)
  useEffect(() => {
    if (!savePulseReady.current) {
      savePulseReady.current = true
      return
    }
    setSavePulse(true)
    const t = window.setTimeout(() => setSavePulse(false), 1400)
    return () => window.clearTimeout(t)
  }, [tasks, moodItems, activeProjectId, projects, theme, prefs])

  const addQuickTask = () => {
    if (!quickInput.trim()) return
    addTask({
      id: Date.now(),
      title: quickInput.trim(),
      energy: captureEnergy,
      meta: `Just captured · ${captureEnergy} energy · ${activeProject?.name || 'desk'}`,
      completed: false,
      seeded: false,
      projectId: activeProjectId,
      dueDate: captureDue || '',
    })
    const g = awardAndBroadcast('task_capture', {
      label: quickInput.trim().slice(0, 40),
    })
    flashToast(`Captured · +${g.gained} XP`)
    setQuickInput('')
    setCaptureDue('')
    setActiveView('flow')
  }

  const resetFocus = (minutes = POMODORO_WORK_MIN) => {
    if (forcedBreak) return
    setIsFocusRunning(false)
    setFocusLeft(minutes * 60)
    setSessionComplete(false)
    setPomodoroWorkStartedAt(null)
  }

  const startOrPauseFocus = () => {
    if (forcedBreak) return
    setSessionComplete(false)
    if (focusLeft === 0) setFocusLeft(POMODORO_WORK_MIN * 60)
    if (!isFocusRunning) {
      setPomodoroWorkStartedAt(Date.now())
      setIsFocusRunning(true)
      const g = awardAndBroadcast('focus_start', { label: 'Focus' })
      flashToast(`Focus on · +${g.gained} XP`)
    } else {
      setIsFocusRunning(false)
    }
  }

  const chooseLogoDirection = (label, detail) => {
    setLogoDirection(`${label}: ${detail}`)
  }

  const finishOnboarding = (mode) => {
    if (mode === 'custom' && onboardName.trim()) {
      const project = createNewProject(
        onboardName.trim(),
        onboardBrief.trim() ||
          'Audience + outcome + constraint — fill as you go.'
      )
      awardAndBroadcast('project_create', { label: onboardName.trim() })
      const stepTitle =
        onboardFirstStep.trim() ||
        'Write the one shippable design step for the next 25 minutes'
      addTask({
        id: Date.now() + 1,
        title: stepTitle,
        energy: 'med',
        meta: 'First step · do this now',
        completed: false,
        seeded: false,
        projectId: project?.id || useAppStore.getState().currentProjectId,
        dueDate: '',
      })
      awardAndBroadcast('task_capture', { label: 'First step' })
      flashToast('Your desk is ready — complete the first step')
    } else {
      // Empty real desk — no sample clients
      clearToEmpty()
      if (onboardName.trim()) {
        renameProject(
          useAppStore.getState().currentProjectId,
          onboardName.trim()
        )
      }
      flashToast('Empty desk — capture your first real step')
    }
    setOnboarded(true)
    localStorage.setItem('cc-onboarded', '1')
    setShowOnboarding(false)
    setBodyDoubling(true)
    setActiveView('flow')
  }

  const buildCurrentBrandPack = () =>
    buildBrandPackSnapshot({
      project: activeProject,
      tasks: deskTasks,
      moodItems: deskMood,
      palette: projectPalette,
    })

  const openExportPanel = () => {
    const pack = buildCurrentBrandPack()
    setExportPanel({
      ...pack,
      // keep UI fields used by direction sheet
      openTasks: pack.openTasks.slice(0, 8),
      pins: pack.pins.slice(0, 8),
    })
  }

  const runExport = (kind) => {
    const pack = buildCurrentBrandPack()
    let result = { ok: false, error: 'Unknown export' }
    if (kind === 'html') result = downloadBrandPackHtml(pack)
    else if (kind === 'md') result = downloadBrandPackMarkdown(pack)
    else if (kind === 'json') result = downloadBrandPackJson(pack)
    else if (kind === 'backup') {
      result = downloadWorkspaceBackup(exportAllData())
    } else if (kind === 'print') {
      if (!exportPanel) openExportPanel()
      window.setTimeout(() => {
        const r = printElementById('direction-sheet')
        if (r.ok) {
          awardAndBroadcast('export_pack', { label: 'Print / PDF' })
          flashToast('Print dialog open — choose Save as PDF if you want a file')
        } else flashToast(r.error || 'Print failed')
      }, exportPanel ? 50 : 120)
      return
    }
    if (result.ok) {
      const g = awardAndBroadcast('export_pack', {
        label:
          kind === 'html'
            ? 'Brand HTML'
            : kind === 'md'
              ? 'Brand Markdown'
              : kind === 'json'
                ? 'Brand JSON'
                : 'Workspace backup',
      })
      flashToast(
        kind === 'backup'
          ? `Backup downloaded · +${g.gained} XP`
          : `Downloaded · +${g.gained} XP`
      )
    } else {
      flashToast(result.error || 'Download failed')
    }
  }

  const uploadMoodFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith('image/')
    )
    if (!files.length) return
    files.forEach((file, i) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        addMoodPin({
          id: Date.now() + i,
          type: 'image',
          note: file.name.replace(/\.[^.]+$/, '') || 'Upload',
          visual: ev.target?.result,
        })
      }
      reader.readAsDataURL(file)
    })
    const g = awardAndBroadcast('mood_pin', {
      label: `${files.length} image${files.length > 1 ? 's' : ''}`,
    })
    flashToast(
      files.length > 1
        ? `${files.length} images · +${g.gained} XP`
        : `Image pinned · +${g.gained} XP`
    )
  }

  const creativeResetItems = [
    {
      label: 'Break project into micro-steps',
      action: () => {
        setShowCreativeReset(false)
        openBreakdown()
      },
    },
    {
      label: 'Back to current step',
      action: () => {
        setActiveView('flow')
        setShowCreativeReset(false)
      },
    },
    {
      label: 'Split current step into 3',
      action: () => {
        if (nextTask && !nextTask.parentId) breakIntoSteps(nextTask.id)
        setActiveView('flow')
        setShowCreativeReset(false)
      },
    },
    {
      label: 'Get a spark',
      action: () => {
        setActiveView('spark')
        setShowCreativeReset(false)
      },
    },
    {
      label: 'Start a 2‑min focus',
      action: () => {
        resetFocus(2)
        setActiveView('insights')
        setShowCreativeReset(false)
      },
    },
    {
      label: 'Open mood board',
      action: () => {
        setActiveView('studio')
        setShowCreativeReset(false)
      },
    },
  ]

  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice is not supported in this browser.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.onresult = (e) => setQuickInput(e.results[0][0].transcript)
    recognition.onerror = () => {}
    recognition.start()
  }

  const openBreakdown = () => {
    setBdGoal(activeProject?.name || '')
    setBdDone(activeProject?.brief?.slice(0, 120) || '')
    setBdDepth('standard')
    setBdEnergy('low')
    setBdSteps([])
    setBreakdownStep(0)
    setBreakdownAdded(0)
    setShowBreakdown(true)
    setMoreOpen(false)
    setShowCreativeReset(false)
  }

  const buildBreakdownPreview = () => {
    const steps = generateProjectMicrosteps({
      goal: bdGoal || activeProject?.name || 'this project',
      doneLooksLike: bdDone,
      depth: bdDepth,
    })
    setBdSteps(steps)
    setBreakdownStep(3)
  }

  const updateBdStepLine = (index, value) => {
    setBdSteps((rows) => rows.map((r, i) => (i === index ? value : r)))
  }

  const removeBdStepLine = (index) => {
    setBdSteps((rows) => rows.filter((_, i) => i !== index))
  }

  const addBdStepLine = () => {
    setBdSteps((rows) => [...rows, 'New micro-step…'])
  }

  const commitBreakdown = () => {
    const n = addMicroStepsBatch({
      steps: bdSteps,
      energy: bdEnergy,
      goalLabel: bdGoal || activeProject?.name || 'Project',
    })
    setBreakdownAdded(n)
    setBreakdownStep(4)
    setPref('queueCollapsed', true)
    setQueueOpen(false)
    setDoneOpen(false)
    setActiveView('flow')
    setStepFocusKey((k) => k + 1)
    const g = awardAndBroadcast('breakdown', {
      label: `${n} micro-steps`,
    })
    flashToast(`${n} micro-steps ready · +${g.gained} XP — do #1 only`)
  }

  const finishBreakdownToStep = () => {
    setShowBreakdown(false)
    setActiveView('flow')
    window.setTimeout(() => {
      document
        .getElementById('current-step')
        ?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        })
    }, 60)
  }

  const downloadDataBackup = () => runExport('backup')

  /** Load the Soft Signal design-run demo (full path through the product). */
  const loadSoftSignalDemo = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}demos/soft-signal-workspace.json`
      )
      if (!res.ok) throw new Error('Demo file missing')
      const data = await res.json()
      const result = importAllData(data)
      if (result.ok) {
        setBodyDoubling(true)
        setActiveView('project')
        const g = awardAndBroadcast('project_create', {
          label: 'Soft Signal demo',
        })
        flashToast(
          `Soft Signal Studio loaded · walk Project → Finish · +${g.gained} XP`
        )
      } else {
        flashToast(result.error || 'Could not load demo')
      }
    } catch (e) {
      flashToast(e?.message || 'Could not load Soft Signal demo')
    }
  }

  const handleImportBackup = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = importAllData(String(reader.result || ''))
      if (result.ok) {
        setActiveView('flow')
        flashToast('Backup restored')
      } else {
        flashToast(result.error || 'Import failed')
      }
    }
    reader.onerror = () => flashToast('Could not read file')
    reader.readAsText(file)
  }

  const commitProjectRename = () => {
    if (!activeProject) return
    const next = projectNameDraft.trim()
    if (!next || next === activeProject.name) {
      setProjectNameDraft(activeProject.name || '')
      return
    }
    renameProject(activeProject.id, next)
    flashToast('Project renamed')
  }

  const handleDeleteProject = () => {
    if (!activeProject) return
    if (projects.length <= 1) {
      flashToast('Keep at least one project')
      return
    }
    if (
      !window.confirm(
        `Delete “${activeProject.name}” and its tasks & pins? This cannot be undone.`
      )
    ) {
      return
    }
    const result = deleteProject(activeProject.id)
    if (result.ok) {
      flashToast('Project deleted')
      setActiveView('project')
    } else {
      flashToast(result.error || 'Could not delete')
    }
  }

  const submitBoardUrl = () => {
    const url = boardUrl.trim()
    if (!url) return
    addMoodPin({
      type: 'image',
      note: 'Reference URL',
      visual: url,
    })
    setBoardUrl('')
    setBoardAddMode(null)
    const g = awardAndBroadcast('mood_pin', { label: 'URL pin' })
    flashToast(`Pin added · +${g.gained} XP`)
  }

  const submitBoardNote = () => {
    const note = boardNote.trim() || 'Direction note'
    addMoodPin({
      type: 'quote',
      note,
      visual:
        projectPalette[0] ||
        'linear-gradient(135deg, #4F46E5, #0D9488)',
    })
    setBoardNote('')
    setBoardAddMode(null)
    const g = awardAndBroadcast('mood_pin', { label: 'Note pin' })
    flashToast(`Pin added · +${g.gained} XP`)
  }

  const handleSignOut = async () => {
    if (CLOUD) {
      await signOutCloud()
      setCloudUser(null)
      setUnlocked(false)
      setAccessName('')
      cloudSyncReady.current = false
      flashToast('Signed out')
      return
    }
    closeSession()
    setUnlocked(false)
    setAccessName('')
    flashToast('Locked')
  }

  if (!authReady) {
    return (
      <div className={`app ${theme} login-shell`}>
        <div className="login-page">
          <div className="login-card">
            <p className="login-lede" style={{ margin: 0 }}>
              Loading…
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!unlocked) {
    return (
      <div className={`app ${theme} login-shell`}>
        <LoginPage
          cloud={CLOUD}
          onUnlocked={(result) => {
            if (result?.mode === 'cloud') {
              setCloudUser(result.user || null)
              setAccessName(result.name || result.user?.email || 'Account')
              setUnlocked(true)
              return
            }
            setAccessName(result?.name || '')
            setUnlocked(true)
          }}
        />
      </div>
    )
  }

  if (cloudHydrating) {
    return (
      <div className={`app ${theme} login-shell`}>
        <div className="login-page">
          <div className="login-card">
            <p className="login-lede" style={{ marginBottom: '0.5rem' }}>
              Loading your desk from the cloud…
            </p>
            <p className="login-fineprint" style={{ margin: 0 }}>
              Syncing projects, tasks, and pins
            </p>
          </div>
        </div>
      </div>
    )
  }

  const journeyActive = journeyIdForView(activeView)
  const journeyStep = getJourneyStep(activeView)
  const journeyNext = getNextJourney(activeView)

  return (
    <div
      className={`app ${theme} view-${activeView}${
        forcedBreak ? ' is-break-locked' : ''
      }`}
    >
      {forcedBreak && (
        <ForcedBreakOverlay
          totalSeconds={forcedBreak.totalSec}
          leftSeconds={forcedBreak.leftSec}
          workMinutes={forcedBreak.workMinutes}
          breakMinutes={forcedBreak.breakMinutes}
          planItems={forcedBreak.planItems || []}
          completedIds={forcedBreak.completedIds || []}
          onCompleteItem={completeBreakPlanItem}
          onEmergencyUnlock={() => endForcedBreak(true)}
        />
      )}
      <header className="header">
        <div className="header-content header-content-simple">
          <div className="brand-block">
            <div className="logo">
              <span className="logo-mark" aria-hidden="true" />
              Creative Companion
            </div>
            <p className="logo-sub">
              One next design step · a desk that stays with you · leave with a
              brand pack
            </p>
          </div>
          <div className="header-actions">
            {isFocusRunning && activeView !== 'insights' && (
              <button
                type="button"
                className="timer-running-chip"
                onClick={() => setActiveView('insights')}
                title="Timer running"
              >
                Timer {focusMinutes}:{String(focusSeconds).padStart(2, '0')}
              </button>
            )}
            {bodyDoubling && (
              <span className="mate-on-badge" aria-live="polite">
                Helper on
              </span>
            )}
            {CLOUD && syncState === 'error' && (
              <button
                type="button"
                className="sync-error-chip"
                onClick={async () => {
                  setSyncState('syncing')
                  const result = await pushWorkspace(exportAllData())
                  if (result.ok) {
                    setSyncState('ok')
                    setSyncError('')
                    flashToast('Synced')
                  } else {
                    setSyncState('error')
                    setSyncError(result.error || 'Sync failed')
                    flashToast(result.error || 'Sync failed')
                  }
                }}
              >
                Save failed · Retry
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost header-help"
              onClick={() => setShowCreativeReset(true)}
            >
              Need help?
            </button>
            <div className="more-wrap" ref={moreWrapRef}>
              <button
                type="button"
                className="btn btn-secondary header-more"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setMoreOpen(!moreOpen)
                  setAccountOpen(false)
                }}
              >
                Extra
              </button>
              {moreOpen && (
                <div className="more-menu" role="menu">
                  <p className="more-menu-group">If you get stuck</p>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      openBreakdown()
                      setMoreOpen(false)
                    }}
                  >
                    <strong>Break work into small steps</strong>
                    <span>When the project feels too big</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      const next = !bodyDoubling
                      toggleBodyDoubling()
                      if (next) {
                        const g = awardAndBroadcast('helper_on', {
                          label: 'Helper',
                        })
                        flashToast(`Helper on · +${g.gained} XP`)
                      }
                      setMoreOpen(false)
                    }}
                  >
                    <strong>
                      {bodyDoubling ? 'Turn helper off' : 'Turn helper on'}
                    </strong>
                    <span>Friendly coach + time reminders</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setActiveView('insights')
                      setMoreOpen(false)
                    }}
                  >
                    <strong>Timer</strong>
                    <span>2 or 25 minutes of focus</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setActiveView('spark')
                      setMoreOpen(false)
                    }}
                  >
                    <strong>Idea spark</strong>
                    <span>One prompt if you need inspiration</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setActiveView('studio')
                      setMoreOpen(false)
                    }}
                  >
                    <strong>Picture board</strong>
                    <span>Save photos and reference images</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setActiveView('calendar')
                      setMoreOpen(false)
                    }}
                  >
                    <strong>Dates</strong>
                    <span>Deadlines on a calendar</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      createNewProject()
                      const g = awardAndBroadcast('project_create', {
                        label: 'New project',
                      })
                      flashToast(`New project · +${g.gained} XP`)
                      setActiveView('project')
                      setMoreOpen(false)
                    }}
                  >
                    <strong>New project</strong>
                    <span>Start another project name</span>
                  </button>
                </div>
              )}
            </div>

            <div className="account-wrap" ref={accountWrapRef}>
              <button
                type="button"
                className={`account-chip${accountOpen ? ' is-open' : ''}${
                  activeView === 'settings' ? ' is-active' : ''
                }`}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setAccountOpen(!accountOpen)
                  setMoreOpen(false)
                }}
              >
                <span className="account-chip-avatar" aria-hidden="true">
                  {(accessName || 'U').charAt(0).toUpperCase()}
                </span>
                <span className="account-chip-label">
                  {accessName
                    ? accessName.includes('@')
                      ? accessName.split('@')[0]
                      : accessName
                    : 'You'}
                </span>
              </button>
              {accountOpen && (
                <div className="account-menu" role="menu">
                  <p className="account-menu-email">
                    {accessName || (CLOUD ? 'Signed in' : 'This device')}
                  </p>
                  {CLOUD && (
                    <p className="account-menu-sync">
                      {syncState === 'syncing'
                        ? 'Saving…'
                        : syncState === 'error'
                          ? 'Save error'
                          : 'Saved'}
                    </p>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="account-menu-item"
                    onClick={() => {
                      setActiveView('settings')
                      setAccountOpen(false)
                    }}
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="account-menu-item"
                    onClick={() => {
                      toggleTheme()
                      setAccountOpen(false)
                    }}
                  >
                    {theme === 'warm' ? 'Dark screen' : 'Light screen'}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="account-menu-item account-menu-danger"
                    onClick={() => {
                      setAccountOpen(false)
                      handleSignOut()
                    }}
                  >
                    {CLOUD ? 'Log out' : 'Log out / lock'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <GameHUD />

        {/* Numbered path — always visible */}
        <nav className="journey-bar" aria-label="Your path through the app">
          {JOURNEY_STEPS.map((step, i) => {
            const active = journeyActive === step.id
            const stepIndex = JOURNEY_STEPS.findIndex(
              (s) => s.id === journeyActive
            )
            const done = stepIndex > i
            return (
              <button
                key={step.id}
                type="button"
                className={`journey-step${active ? ' is-active' : ''}${
                  done ? ' is-done' : ''
                }`}
                onClick={() => setActiveView(step.view)}
                aria-current={active ? 'step' : undefined}
              >
                <span className="journey-num" aria-hidden="true">
                  {step.num}
                </span>
                <span className="journey-label">{step.label}</span>
              </button>
            )
          })}
        </nav>
      </header>

      <main className="main">
        {journeyStep && activeView !== 'settings' && (
          <div className="journey-guide" role="status">
            <div>
              <p className="journey-guide-you">
                You are on step {journeyStep.num}: <strong>{journeyStep.label}</strong>
              </p>
              <p className="journey-guide-plain">{journeyStep.plain}</p>
            </div>
            {journeyNext && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveView(journeyNext.view)}
              >
                {journeyStep.nextLabel}
              </button>
            )}
          </div>
        )}
        {/* ===== DESK = step-by-step work loop ===== */}
        {activeView === 'flow' && (
          <div className="flow-view surface-desk">
            <div className="flow-top">
              <div>
                <h1 className="page-title page-title-display">Work</h1>
                <p className="page-sub">
                  Project: {activeProject?.name || 'None'} — do one step, then
                  the next
                </p>
              </div>
              <div className="flow-top-actions">
                <div className="project-pills project-pills-top" role="tablist" aria-label="Project">
                  {(projects || []).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={activeProjectId === p.id}
                      onClick={() => selectProject(p.id)}
                      className={
                        activeProjectId === p.id
                          ? 'project-pill is-active'
                          : 'project-pill'
                      }
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="flow-progress">
                  <div className="flow-progress-bar" aria-hidden="true">
                    <div
                      className="flow-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="flow-progress-label">
                    {completedCount}/{deskTasks.length || 0} done
                    {deskTasks.length > 0 ? ` · ${progressPercent}%` : ''}
                  </span>
                </div>
              </div>
            </div>

            {projectDeadline && (
              <div
                className={`deadline-banner urgency-${projectUrgency || 'later'}`}
              >
                <div>
                  <strong>Deadline</strong>
                  <span>
                    {formatShortDate(projectDeadline)} ·{' '}
                    {urgencyLabel(projectDeadline)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setActiveView('calendar')}
                >
                  Calendar
                </button>
              </div>
            )}

            {showHowItWorks ? (
              <section className="product-card" aria-label="How this desk works">
                <div className="product-card-top">
                  <p className="product-card-eyebrow">What this desk is for</p>
                  <button
                    type="button"
                    className="product-card-dismiss"
                    onClick={hideHowItWorks}
                  >
                    Got it
                  </button>
                </div>
                <p className="product-card-title" style={{ marginBottom: '0.65rem' }}>
                  One design step owns the screen. Complete it. Next rises.
                </p>
                <ol className="product-steps">
                  <li>
                    <span className="product-step-num">1</span>
                    <span>
                      <strong>Do only the current step</strong>
                      <em>Not the whole project — just this card</em>
                    </span>
                  </li>
                  <li>
                    <span className="product-step-num">2</span>
                    <span>
                      <strong>Complete it</strong>
                      <em>Helper stays for presence; breaks protect your body</em>
                    </span>
                  </li>
                  <li>
                    <span className="product-step-num">3</span>
                    <span>
                      <strong>Ship a pack from Finish</strong>
                      <em>Ideas → Brand → export when the story holds</em>
                    </span>
                  </li>
                </ol>
              </section>
            ) : (
              <button
                type="button"
                className="how-it-works-link"
                onClick={revealHowItWorks}
              >
                What is this desk for?
              </button>
            )}

            {/* Process mode — changes the Work UI, not only Helper chat */}
            <section className="process-rail" aria-label="Design process">
              <p className="process-rail-label">Design process</p>
              <div className="process-rail-chips">
                {PROCESS_PHASES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`process-chip${
                      processPhase === p.id ? ' is-active' : ''
                    }`}
                    onClick={() =>
                      setProcessPhase((cur) => (cur === p.id ? null : p.id))
                    }
                    aria-pressed={processPhase === p.id}
                  >
                    {p.short}
                  </button>
                ))}
              </div>
              {processPhase && getProcessPhase(processPhase) && (
                <div className="process-guide-panel">
                  <div className="process-guide-head">
                    <strong>{getProcessPhase(processPhase).title}</strong>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setProcessPhase(null)}
                    >
                      Close
                    </button>
                  </div>
                  <p className="process-guide-prompt">
                    {nextTask
                      ? `For “${String(nextTask.title).slice(0, 60)}${
                          String(nextTask.title).length > 60 ? '…' : ''
                        }”: ${getProcessPhase(processPhase).prompt}`
                      : getProcessPhase(processPhase).prompt}
                  </p>
                  <ul className="process-guide-checks">
                    {getProcessPhase(processPhase).checks.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  {bodyDoubling && (
                    <p className="process-guide-hint">
                      Helper can coach this phase — open the corner bot → More →
                      Process, or ask Recommend.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Current step owns the fold */}
            <section
              className="panel step-focus-panel surface-desk-hero"
              key={stepFocusKey}
              id="current-step"
            >
              <div className="step-focus-head">
                <div className="brand-section-label" style={{ margin: 0 }}>
                  Current step
                </div>
              </div>
              {!nextTask ? (
                <div className="empty-state">
                  <p className="empty-state-title">
                    {doneTasks.length > 0
                      ? 'Queue clear — nice work'
                      : 'No current step yet'}
                  </p>
                  <p className="empty-state-body">
                    {doneTasks.length > 0
                      ? 'Dump another idea below, or break the project into micro-steps.'
                      : 'Empty? Break the project down, or dump one idea below.'}
                  </p>
                  <div className="step-focus-actions" style={{ marginTop: '0.85rem' }}>
                    {deskTasks.length === 0 && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={openBreakdown}
                      >
                        Break into micro-steps
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        document.getElementById('desk-capture')?.focus()
                      }
                    >
                      Dump an idea
                    </button>
                  </div>
                </div>
              ) : (
                <div className="step-focus">
                  <div className="step-focus-meta">
                    <span className="task-badge">Do this now</span>
                    <span className="task-meta">
                      {(nextTask.energy || 'med')} energy
                      {nextTask.parentId ? ' · micro-step' : ''}
                      {nextTask.dueDate
                        ? ` · ${urgencyLabel(nextTask.dueDate)}`
                        : ''}
                    </span>
                  </div>
                  <input
                    className="step-focus-title"
                    value={nextTask.title}
                    onChange={(e) =>
                      updateTaskTitle(nextTask.id, e.target.value)
                    }
                    aria-label="Edit current step"
                  />
                  <div className="step-focus-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={completeCurrentStep}
                    >
                      Complete step
                    </button>
                    {!nextTask.parentId && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          breakIntoSteps(nextTask.id)
                          {
                            const g = awardAndBroadcast('micro_steps', {
                              label: 'Split step',
                            })
                            flashToast(`Split into 3 · +${g.gained} XP`)
                          }
                          setStepFocusKey((k) => k + 1)
                        }}
                      >
                        Split ×3
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-link step-due-toggle"
                      onClick={() => setStepDueOpen((o) => !o)}
                      aria-expanded={stepDueOpen}
                    >
                      {stepDueOpen || nextTask.dueDate
                        ? stepDueOpen
                          ? 'Hide due date'
                          : `Due ${formatShortDate(nextTask.dueDate)}`
                        : 'Add due date'}
                    </button>
                  </div>
                  <div className="step-focus-secondary">
                    <button
                      type="button"
                      className="text-link step-remove-link"
                      onClick={() => {
                        if (
                          window.confirm(
                            'Remove this step from the desk? This cannot be undone.'
                          )
                        ) {
                          removeTask(nextTask.id)
                          flashToast('Step removed')
                        }
                      }}
                    >
                      Remove step
                    </button>
                  </div>
                  {stepDueOpen && (
                    <div className="step-due-row">
                      <label className="field-label" htmlFor="step-due">
                        Due date
                      </label>
                      <input
                        id="step-due"
                        type="date"
                        className="field-input step-due-input"
                        value={nextTask.dueDate || ''}
                        onChange={(e) =>
                          setTaskDueDate(nextTask.id, e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Compact capture — secondary to current step */}
            <section className="capture-strip" aria-label="Capture">
              <div className="capture-row capture-row-compact">
                <input
                  id="desk-capture"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addQuickTask()}
                  placeholder="Dump another idea…"
                  aria-label="Add to desk"
                />
                <button
                  type="button"
                  onClick={addQuickTask}
                  className="btn btn-secondary"
                >
                  Add
                </button>
              </div>
              <div className="capture-desk-meta">
                <button
                  type="button"
                  className="text-link capture-options-toggle"
                  onClick={() => setCaptureOptionsOpen((o) => !o)}
                  aria-expanded={captureOptionsOpen}
                >
                  {captureOptionsOpen ? 'Hide options' : 'Energy & voice'}
                </button>
                {captureOptionsOpen && (
                  <>
                    <select
                      className="capture-energy"
                      value={captureEnergy}
                      onChange={(e) => setCaptureEnergy(e.target.value)}
                      aria-label="Energy level"
                    >
                      <option value="high">High energy</option>
                      <option value="med">Med energy</option>
                      <option value="low">Low energy</option>
                    </select>
                    <label className="capture-due-label">
                      Due
                      <input
                        type="date"
                        className="capture-due-input"
                        value={captureDue}
                        onChange={(e) => setCaptureDue(e.target.value)}
                        aria-label="Optional due date"
                      />
                    </label>
                    <button
                      type="button"
                      className="voice-link"
                      onClick={startVoice}
                    >
                      Voice input
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* Help — demoted vs current-step hero */}
            <section className="help-panel help-panel-quiet">
              <div className="brand-section-label">Stuck?</div>
              <p className="panel-hint" style={{ marginBottom: '0.85rem' }}>
                Pick one tool, then come back here.
              </p>
              <div className="help-grid help-grid-3">
                <button
                  type="button"
                  className="help-card"
                  onClick={openBreakdown}
                >
                  <strong>Break project into micro-steps</strong>
                  <span>When the whole project feels too big</span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  disabled={!nextTask || !!nextTask.parentId}
                  onClick={() => {
                    if (!nextTask) return
                    breakIntoSteps(nextTask.id)
                    {
                      const g = awardAndBroadcast('micro_steps', {
                        label: 'Split step',
                      })
                      flashToast(`Split into 3 · +${g.gained} XP`)
                    }
                    setStepFocusKey((k) => k + 1)
                  }}
                >
                  <strong>Split this step</strong>
                  <span>3 smaller actions from current only</span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  onClick={() => setShowCreativeReset(true)}
                >
                  <strong>I&apos;m stuck</strong>
                  <span>Pick one small restart</span>
                </button>
              </div>
              <div className="help-secondary">
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('studio')}
                >
                  Board
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('spark')}
                >
                  Spark
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('insights')}
                >
                  Focus timer
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('calendar')}
                >
                  Deadlines
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('brand')}
                >
                  Brand
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => toggleBodyDoubling()}
                >
                  {bodyDoubling ? 'Design buddy off' : 'Design buddy'}
                </button>
              </div>
            </section>

            {/* Queue — collapsed by default when busy */}
            <section className="panel brand-section">
              <button
                type="button"
                className="section-toggle"
                onClick={() => setQueueOpen((o) => !o)}
                aria-expanded={
                  queueTasks.length === 0
                    ? false
                    : queueCollapsed
                      ? queueOpen
                      : true
                }
              >
                <span className="brand-section-label" style={{ margin: 0 }}>
                  Queue · {queueTasks.length} waiting
                </span>
                <span className="section-toggle-hint">
                  {queueTasks.length === 0
                    ? ''
                    : queueCollapsed && !queueOpen
                      ? 'Show'
                      : 'Hide'}
                </span>
              </button>
              {queueTasks.length === 0 ? (
                <p className="empty-state-body" style={{ margin: '0.65rem 0 0' }}>
                  Nothing waiting. Completing the current step promotes the next
                  entry automatically.
                </p>
              ) : (queueCollapsed ? queueOpen : true) ? (
                <div className="desk-list" style={{ marginTop: '0.75rem' }}>
                  {queueTasks.map((task, i) => (
                    <div key={task.id} className="task-row">
                      <label className="task-row-label">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => toggleTask(task.id)}
                        />
                        <span className="task-row-body">
                          <span className="task-step-num">Step {i + 2}</span>
                          <span className="task-title">{task.title}</span>
                          <span className="task-meta">
                            {(task.energy || 'med')} energy
                            {task.dueDate
                              ? ` · ${formatShortDate(task.dueDate)}`
                              : ''}
                          </span>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state-body" style={{ margin: '0.65rem 0 0' }}>
                  Queue hidden so you only see the current step. Show when ready.
                </p>
              )}
            </section>

            {/* Completed — collapsed by default */}
            <section className="panel brand-section">
              <button
                type="button"
                className="section-toggle"
                onClick={() => setDoneOpen((o) => !o)}
                aria-expanded={doneOpen}
              >
                <span className="brand-section-label" style={{ margin: 0 }}>
                  Done · {doneTasks.length}
                </span>
                <span className="section-toggle-hint">
                  {doneTasks.length === 0 ? '' : doneOpen ? 'Hide' : 'Show'}
                </span>
              </button>
              {doneTasks.length === 0 ? (
                <p className="empty-state-body" style={{ margin: '0.65rem 0 0' }}>
                  Finished steps land here — proof you moved.
                </p>
              ) : doneOpen ? (
                <ul className="done-list" style={{ marginTop: '0.75rem' }}>
                  {doneTasks.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="done-undo"
                        onClick={() => toggleTask(t.id)}
                        title="Mark incomplete"
                      >
                        ✓
                      </button>
                      <span className="done-title">{t.title}</span>
                      <button
                        type="button"
                        className="text-link"
                        style={{ marginTop: 0 }}
                        onClick={() => {
                          if (
                            window.confirm(
                              'Delete this completed step permanently?'
                            )
                          ) {
                            removeTask(t.id)
                          }
                        }}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>
        )}

        {/* ===== MOOD BOARD = visual collection template ===== */}
        {activeView === 'studio' && (
          <div className="studio-view surface-wall">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Work
            </button>

            <div className="flow-top">
              <div>
                <h1 className="page-title">Picture board</h1>
                <p className="page-sub">
                  Save photos and pictures that help your project. Then go back
                  to Work or Ideas.
                </p>
              </div>
              <span className="panel-count">{deskMood.length} pins</span>
            </div>

            <section className="panel brand-section">
              <div className="brand-section-label">Project</div>
              <div className="panel-head" style={{ marginBottom: 0 }}>
                <div>
                  <h2 className="panel-title">
                    {activeProject?.name || 'Project'}
                  </h2>
                  <p className="panel-hint">
                    {activeProject?.brief ||
                      'No brief yet — add one on Projects or Brand.'}
                  </p>
                </div>
                {projectPills}
              </div>
              {nextTask && (
                <div className="mood-linked-step">
                  <span className="task-badge">Linked to desk</span>
                  <p className="mood-linked-title">{nextTask.title}</p>
                  <p className="panel-hint" style={{ margin: 0 }}>
                    Pin refs that help this step, then mark it complete on the
                    desk.
                  </p>
                </div>
              )}
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">Add references</div>
              <div className="mood-add-layout">
                <label className="mood-add-hero btn-like">
                  <strong>Upload images</strong>
                  <span>Screenshots, photos, comps — primary way to pin</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      uploadMoodFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
                <div className="mood-add-secondary">
                  <button
                    type="button"
                    className={`mood-add-card${
                      boardAddMode === 'url' ? ' is-active' : ''
                    }`}
                    onClick={() =>
                      setBoardAddMode((m) => (m === 'url' ? null : 'url'))
                    }
                  >
                    <strong>Paste URL</strong>
                    <span>Image link</span>
                  </button>
                  <button
                    type="button"
                    className={`mood-add-card${
                      boardAddMode === 'note' ? ' is-active' : ''
                    }`}
                    onClick={() =>
                      setBoardAddMode((m) => (m === 'note' ? null : 'note'))
                    }
                  >
                    <strong>Color / note</strong>
                    <span>Text pin</span>
                  </button>
                  <button
                    type="button"
                    className="mood-add-card mood-add-tertiary"
                    onClick={() => setActiveView('spark')}
                  >
                    <strong>Spark</strong>
                    <span>Prompt → pin</span>
                  </button>
                </div>
              </div>
              {boardAddMode === 'url' && (
                <div className="board-inline-form">
                  <label className="field-label" htmlFor="board-url">
                    Image URL
                  </label>
                  <div className="capture-row">
                    <input
                      id="board-url"
                      className="field-input"
                      value={boardUrl}
                      onChange={(e) => setBoardUrl(e.target.value)}
                      placeholder="https://…"
                      onKeyDown={(e) =>
                        e.key === 'Enter' && submitBoardUrl()
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={submitBoardUrl}
                      disabled={!boardUrl.trim()}
                    >
                      Add pin
                    </button>
                  </div>
                </div>
              )}
              {boardAddMode === 'note' && (
                <div className="board-inline-form">
                  <label className="field-label" htmlFor="board-note">
                    Note / direction
                  </label>
                  <div className="capture-row">
                    <input
                      id="board-note"
                      className="field-input"
                      value={boardNote}
                      onChange={(e) => setBoardNote(e.target.value)}
                      placeholder="e.g. Soft twilight, no hard sell"
                      onKeyDown={(e) =>
                        e.key === 'Enter' && submitBoardNote()
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={submitBoardNote}
                    >
                      Add pin
                    </button>
                  </div>
                </div>
              )}
              <p className="panel-hint" style={{ marginTop: '0.75rem' }}>
                Tip: drag image files onto the board below.
              </p>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">
                Board · {deskMood.length}
              </div>
              <div
                className={`mood-board${deskMood.length ? ' has-pins' : ''}${
                  deskMood.length === 1 ? ' single-pin' : ''
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.length) {
                    uploadMoodFiles(e.dataTransfer.files)
                    return
                  }
                  const data =
                    e.dataTransfer.getData('text/uri-list') ||
                    e.dataTransfer.getData('text')
                  if (data?.trim()) {
                    addMoodPin({
                      type: 'image',
                      note: 'Dropped reference',
                      visual: data.trim(),
                    })
                    const g = awardAndBroadcast('mood_pin', {
                      label: 'Dropped pin',
                    })
                    flashToast(`Pin added · +${g.gained} XP`)
                  }
                }}
              >
                {deskMood.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-state-title">Board is empty</p>
                    <p className="empty-state-body">
                      Use step 02 to upload, paste a URL, or add a note pin.
                      Drag files here anytime.
                    </p>
                  </div>
                ) : (
                  deskMood.map((item, index) => {
                    const isHero = index === 0
                    const isGradient =
                      typeof item.visual === 'string' &&
                      item.visual.includes('gradient')
                    const isQuote = item.type === 'quote' || isGradient
                    return (
                      <article
                        key={item.id || index}
                        className={`mood-card${isQuote ? ' is-quote' : ''}${
                          isHero ? ' is-hero' : ''
                        }`}
                      >
                        {isQuote ? (
                          <div
                            className="mood-pin-face"
                            style={{
                              background: isGradient
                                ? item.visual
                                : undefined,
                              backgroundColor: !isGradient
                                ? item.visual || '#0F172A'
                                : undefined,
                            }}
                          >
                            <p className="mood-pin-caption">
                              {item.note || 'Note'}
                            </p>
                          </div>
                        ) : (
                          <div
                            className="mood-pin-media"
                            style={{
                              backgroundImage: `url(${item.visual})`,
                            }}
                          />
                        )}
                        <div className="mood-pin-tools">
                          <input
                            className="mood-pin-note-input"
                            value={item.note || ''}
                            onChange={(e) =>
                              updateMoodPinNote(item.id, e.target.value)
                            }
                            placeholder="Caption / why this pin…"
                            aria-label="Pin note"
                          />
                          <button
                            type="button"
                            className="btn btn-ghost mood-pin-remove"
                            onClick={() => removeMoodPin(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            </section>

            <section className="panel brand-section help-panel">
              <div className="brand-section-label">Next</div>
              <div className="help-grid help-grid-3">
                <button
                  type="button"
                  className="help-card"
                  onClick={() => setActiveView('flow')}
                >
                  <strong>Back to current step</strong>
                  <span>
                    {nextTask
                      ? nextTask.title.slice(0, 48)
                      : 'Open work loop'}
                  </span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  onClick={() => setActiveView('brand')}
                >
                  <strong>Brand template</strong>
                  <span>Use pins in identity pack</span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  onClick={() => openExportPanel()}
                >
                  <strong>Export pack</strong>
                  <span>Share direction</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===== SPARK (help tool) ===== */}
        {activeView === 'spark' && (
          <div className="spark-view">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Work
            </button>
            <div className="flow-top">
              <div>
                <h1 className="page-title">Spark</h1>
                <p className="page-sub">
                  One prompt · pin it · return to your current step
                </p>
              </div>
            </div>
            {nextTask && (
              <p className="mood-linked-step" style={{ marginBottom: '1rem' }}>
                <span className="task-badge">For</span>{' '}
                <span className="mood-linked-title">{nextTask.title}</span>
              </p>
            )}
            <section className="panel brand-section">
              <div className="brand-section-label">Prompt</div>
              <div className="spark-card">
                <p>{currentSpark}</p>
              </div>
              <div className="spark-actions">
                <button
                  type="button"
                  onClick={nextSpark}
                  className="btn btn-primary"
                >
                  Another spark
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    addMoodPin({
                      type: 'quote',
                      note: currentSpark,
                      visual: projectPalette[0] || '#4F46E5',
                    })
                    const g = awardAndBroadcast('mood_pin', {
                      label: 'Spark pin',
                    })
                    flashToast(`Pinned · +${g.gained} XP`)
                    setActiveView('studio')
                  }}
                >
                  Pin to mood board
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setActiveView('flow')}
                >
                  Done — back to step
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===== FOCUS (help tool) ===== */}
        {activeView === 'insights' && (
          <div className="insights-layout">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Work
            </button>
            <div className="flow-top">
              <div>
                <h1 className="page-title">Focus timer</h1>
                <p className="page-sub">
                  Hold attention · then complete the current step
                </p>
              </div>
            </div>
            {nextTask && (
              <div className="mood-linked-step" style={{ marginBottom: '1rem' }}>
                <span className="task-badge">Work on</span>
                <p className="mood-linked-title">{nextTask.title}</p>
              </div>
            )}
            <section className="panel focus-panel brand-section">
              <div className="brand-section-label">Timer</div>
              <div className="insights-timer">
                {focusMinutes}:{String(focusSeconds).padStart(2, '0')}
              </div>
              <div className="insights-focus-actions">
                <button
                  type="button"
                  onClick={startOrPauseFocus}
                  className="btn btn-primary"
                  disabled={!!forcedBreak || (focusLeft === 0 && !isFocusRunning)}
                >
                  {isFocusRunning
                    ? 'Pause'
                    : focusLeft > 0 && focusLeft < POMODORO_WORK_MIN * 60
                      ? 'Resume'
                      : focusLeft === 2 * 60
                        ? 'Start 2 min'
                        : 'Start 25 min (Pomodoro)'}
                </button>
                <button
                  type="button"
                  onClick={() => resetFocus(25)}
                  className="btn btn-secondary"
                  disabled={!!forcedBreak}
                >
                  25 min
                </button>
                <button
                  type="button"
                  onClick={() => resetFocus(2)}
                  className="btn btn-ghost"
                  disabled={!!forcedBreak}
                >
                  2 min
                </button>
              </div>
              {sessionComplete && !forcedBreak && (
                <p className="session-done">
                  {forceBreaksEnabled
                    ? 'Work block done — a required break lock should open. Rest, then continue.'
                    : 'Work block done. Forced lockouts are off — take a stretch if you want.'}
                </p>
              )}
              <div className="settings-row" style={{ marginTop: '0.85rem' }}>
                <div>
                  <strong>Force break lockouts</strong>
                  <span>
                    When on: desk locks 5–10 min after a Pomodoro (or 25+ min with
                    helper on)
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={forceBreaksEnabled}
                  className={`pref-switch${forceBreaksEnabled ? ' is-on' : ''}`}
                  onClick={() => {
                    const next = !forceBreaksEnabled
                    setPref('forceBreaksEnabled', next)
                    flashToast(
                      next
                        ? 'Forced breaks on — desk will lock after cycles'
                        : 'Forced breaks off — no lockout'
                    )
                  }}
                >
                  <span className="pref-switch-knob" />
                  <span className="sr-only">
                    {forceBreaksEnabled ? 'On' : 'Off'}
                  </span>
                </button>
              </div>
            </section>
            <section className="panel brand-section">
              <div className="brand-section-label">After</div>
              <div className="help-grid help-grid-3">
                <button
                  type="button"
                  className="help-card"
                  disabled={!nextTask}
                  onClick={() => {
                    if (nextTask) toggleTask(nextTask.id)
                    setActiveView('flow')
                  }}
                >
                  <strong>Mark step done</strong>
                  <span>Complete current desk step</span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  onClick={() => setActiveView('flow')}
                >
                  <strong>Back to loop</strong>
                  <span>
                    {completedCount}/{deskTasks.length || 0} done
                  </span>
                </button>
                <button
                  type="button"
                  className="help-card"
                  onClick={() => toggleBodyDoubling()}
                >
                  <strong>Body double</strong>
                  <span>{bodyDoubling ? 'On' : 'Turn on'}</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===== DEADLINE CALENDAR ===== */}
        {activeView === 'calendar' && (
          <div className="calendar-view">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Work
            </button>

            <div className="flow-top">
              <div>
                <h1 className="page-title">Deadlines</h1>
                <p className="page-sub">
                  Project due dates + step due dates. Simple calendar so time
                  stays visible.
                </p>
              </div>
            </div>

            <section className="panel brand-section">
              <div className="brand-section-label">Active project due</div>
              <p className="panel-hint" style={{ marginBottom: '0.55rem' }}>
                {activeProject?.name || 'No project'}
              </p>
              <label className="field-label" htmlFor="project-deadline">
                Project deadline
              </label>
              <div className="deadline-edit-row">
                <input
                  id="project-deadline"
                  type="date"
                  className="field-input"
                  value={projectDeadline}
                  onChange={(e) => setProjectDeadline(e.target.value)}
                />
                {projectDeadline && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setProjectDeadline('')}
                  >
                    Clear
                  </button>
                )}
              </div>
              {projectDeadline && (
                <p
                  className={`deadline-chip urgency-${projectUrgency || 'later'}`}
                >
                  {formatShortDate(projectDeadline)} ·{' '}
                  {urgencyLabel(projectDeadline)}
                </p>
              )}
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">Month</div>
              <div className="cal-nav">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setCalCursor((c) => {
                      const m = c.month - 1
                      if (m < 0) return { year: c.year - 1, month: 11 }
                      return { ...c, month: m }
                    })
                  }
                >
                  ←
                </button>
                <h2 className="cal-month-title">
                  {formatMonthYear(calCursor.year, calCursor.month)}
                </h2>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setCalCursor((c) => {
                      const m = c.month + 1
                      if (m > 11) return { year: c.year + 1, month: 0 }
                      return { ...c, month: m }
                    })
                  }
                >
                  →
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const n = new Date()
                    setCalCursor({
                      year: n.getFullYear(),
                      month: n.getMonth(),
                    })
                  }}
                >
                  Today
                </button>
              </div>
              <div className="cal-weekdays" aria-hidden="true">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="cal-grid">
                {buildMonthGrid(calCursor.year, calCursor.month).map(
                  (cell, i) => {
                    const events = cell.date
                      ? calendarEvents[cell.date] || []
                      : []
                    const isToday = cell.date === toISODate()
                    return (
                      <div
                        key={i}
                        className={`cal-cell${
                          cell.inMonth ? '' : ' is-pad'
                        }${isToday ? ' is-today' : ''}${
                          events.length ? ' has-events' : ''
                        }`}
                      >
                        {cell.day != null && (
                          <span className="cal-daynum">{cell.day}</span>
                        )}
                        {events.slice(0, 3).map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            className={`cal-event cal-event-${ev.type}`}
                            title={ev.label}
                            onClick={() => {
                              if (ev.projectId != null) {
                                selectProject(ev.projectId)
                              }
                              setActiveView(
                                ev.type === 'project' ? 'project' : 'flow'
                              )
                            }}
                          >
                            {ev.type === 'project' ? '◆ ' : '· '}
                            {ev.label.slice(0, 18)}
                            {ev.label.length > 18 ? '…' : ''}
                          </button>
                        ))}
                        {events.length > 3 && (
                          <span className="cal-more">
                            +{events.length - 3}
                          </span>
                        )}
                      </div>
                    )
                  }
                )}
              </div>
              <p className="panel-hint" style={{ marginTop: '0.75rem' }}>
                ◆ = project deadline · · = open step due date
              </p>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">Upcoming</div>
              {upcomingDeadlines.length === 0 ? (
                <p className="empty-state-body" style={{ margin: 0 }}>
                  No deadlines yet. Set a project deadline above, or add a due
                  date when capturing a step (Energy &amp; voice → Due).
                </p>
              ) : (
                <ul className="deadline-list">
                  {upcomingDeadlines.map((row) => (
                    <li
                      key={`${row.kind}-${row.id}`}
                      className={`deadline-list-item urgency-${row.urgency}`}
                    >
                      <div>
                        <strong>
                          {row.kind === 'project' ? 'Project' : 'Step'}:{' '}
                          {row.name}
                        </strong>
                        <span>
                          {formatShortDate(row.date)} ·{' '}
                          {urgencyLabel(row.date)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          if (row.kind === 'project') {
                            selectProject(row.id)
                            setActiveView('project')
                          } else if (row.projectId != null) {
                            selectProject(row.projectId)
                            setActiveView('flow')
                          }
                        }}
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* ===== CONCEPT PIPELINE ===== */}
        {activeView === 'concept' && (
          <ConceptPipeline
            projectPills={projectPills}
            openTasks={openTasks}
            flashToast={flashToast}
            onGoWork={() => setActiveView('flow')}
            onGoBrand={() => setActiveView('brand')}
          />
        )}

        {/* ===== BRAND IDENTITY TEMPLATE ===== */}
        {activeView === 'brand' && (
          <div className="brand-layout surface-document">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Work
            </button>

            <div className="brand-template-top">
              <div>
                <h1 className="page-title">Brand</h1>
                <p className="page-sub">
                  Colors, words, and look for{' '}
                  <strong>{activeProject?.name || 'this project'}</strong>.
                  Tip: fill Ideas first, then click “Fill Brand” there.
                </p>
              </div>
              <div className="brand-template-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveView('concept')}
                >
                  ← Ideas
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveView('finish')}
                >
                  Go to Finish
                </button>
              </div>
            </div>

            {/* Live identity cover */}
            <section
              className="brand-cover"
              style={{
                background:
                  projectPalette[0] || 'var(--accent-primary)',
                color: bestTextOn(projectPalette[0] || '#4F46E5'),
              }}
            >
              <p className="brand-cover-label">Brand identity</p>
              <h2 className="brand-cover-name">
                {activeProject?.name || 'Untitled project'}
              </h2>
              <p className="brand-cover-tagline">
                {activeProject?.tagline?.trim() ||
                  'Add a tagline below — one line people can remember.'}
              </p>
              <div className="brand-cover-strip">
                {projectPalette.map((c, i) => (
                  <div key={`${c}-c-${i}`} style={{ background: c }} />
                ))}
              </div>
            </section>

            {/* 01 Essentials */}
            <section className="panel brand-section">
              <div className="brand-section-label">01 · Essentials</div>
              <div className="field-block">
                <label className="field-label" htmlFor="brand-tagline">
                  Tagline
                </label>
                <input
                  id="brand-tagline"
                  className="field-input"
                  value={activeProject?.tagline || ''}
                  onChange={(e) =>
                    updateBrandField('tagline', e.target.value)
                  }
                  placeholder="One line. Memorable."
                />
              </div>
              <div className="field-block" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="brand-brief">
                  Positioning / brief
                </label>
                <textarea
                  id="brand-brief"
                  className="field-textarea"
                  value={activeProject?.brief || ''}
                  onChange={(e) => updateProjectBrief(e.target.value)}
                  placeholder="Who is this for? What should it feel like?"
                  rows={3}
                />
              </div>
            </section>

            {/* 02 Voice */}
            <section className="panel brand-section">
              <div className="brand-section-label">02 · Voice</div>
              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="brand-voice">
                  How we sound
                </label>
                <textarea
                  id="brand-voice"
                  className="field-textarea"
                  value={activeProject?.voice || ''}
                  onChange={(e) => updateBrandField('voice', e.target.value)}
                  placeholder="e.g. Warm, plain-spoken, hopeful — never corporate."
                  rows={2}
                />
              </div>
              <div className="brand-do-dont">
                <div className="field-block" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor="brand-do">
                    Do
                  </label>
                  <textarea
                    id="brand-do"
                    className="field-textarea"
                    value={activeProject?.doUse || ''}
                    onChange={(e) =>
                      updateBrandField('doUse', e.target.value)
                    }
                    placeholder="Behaviors, materials, tone that fit."
                    rows={3}
                  />
                </div>
                <div className="field-block" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor="brand-dont">
                    Don&apos;t
                  </label>
                  <textarea
                    id="brand-dont"
                    className="field-textarea"
                    value={activeProject?.dontUse || ''}
                    onChange={(e) =>
                      updateBrandField('dontUse', e.target.value)
                    }
                    placeholder="Clichés and traps to avoid."
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* 03 Palette + checker */}
            <section className="panel brand-section">
              <div className="brand-section-label">03 · Color</div>
              <div className="brand-palette-block" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                <div className="palette-section-head">
                  <p className="field-label" style={{ margin: 0 }}>
                    Palette builder
                  </p>
                  <span className="panel-hint" style={{ margin: 0 }}>
                    {projectPalette.length}/8 · saved on project
                  </span>
                </div>

                <div className="brand-palette-bleed">
                  {projectPalette.map((c, i) => (
                    <div
                      key={`${c}-${i}`}
                      style={{ flex: 1, background: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="direction-hex">
                  {projectPalette.join(' · ')}
                </div>

                <ul className="palette-editor">
                  {projectPalette.map((hex, index) => {
                    const display =
                      hexDrafts[index] != null ? hexDrafts[index] : hex
                    return (
                      <li key={index} className="palette-row">
                        <label
                          className="palette-swatch-wrap"
                          title="Pick color"
                        >
                          <input
                            type="color"
                            className="palette-color-input"
                            value={normalizeHex(hex) || '#888888'}
                            onChange={(e) => {
                              const n = normalizeHex(e.target.value)
                              if (n) {
                                updatePaletteColor(index, n)
                                setHexDrafts((d) => {
                                  const next = { ...d }
                                  delete next[index]
                                  return next
                                })
                              }
                            }}
                            aria-label={`Color ${index + 1} picker`}
                          />
                          <span
                            className="palette-swatch"
                            style={{
                              background: normalizeHex(hex) || hex,
                            }}
                          />
                        </label>
                        <input
                          type="text"
                          className="palette-hex-input"
                          value={display}
                          onChange={(e) =>
                            handleHexChange(index, e.target.value)
                          }
                          onBlur={() => commitHex(index)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          }}
                          spellCheck={false}
                          aria-label={`Color ${index + 1} hex`}
                        />
                        <span
                          className="palette-preview-chip"
                          style={{
                            background: normalizeHex(hex) || hex,
                            color: bestTextOn(hex),
                          }}
                        >
                          Aa
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost palette-remove"
                          disabled={projectPalette.length <= 2}
                          onClick={() => removePaletteColor(index)}
                          aria-label={`Remove color ${index + 1}`}
                        >
                          Remove
                        </button>
                      </li>
                    )
                  })}
                </ul>

                <div className="palette-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={projectPalette.length >= 8}
                    onClick={() => addPaletteColor('#888888')}
                  >
                    Add color
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setProjectPalette([...DEFAULT_PALETTE])}
                  >
                    Reset default
                  </button>
                </div>
              </div>

              <div className="palette-checker" style={{ marginTop: '1.15rem' }}>
                <div className="palette-section-head">
                  <p className="field-label" style={{ margin: 0 }}>
                    Contrast checker
                  </p>
                  <span className="panel-hint" style={{ margin: 0 }}>
                    WCAG 2.1 · AA ≥ 4.5:1 body · ≥ 3:1 large
                  </span>
                </div>
                <label className="field-label" htmlFor="check-bg">
                  Background color
                </label>
                <select
                  id="check-bg"
                  className="palette-bg-select"
                  value={checkBgIndex}
                  onChange={(e) => setCheckBgIndex(Number(e.target.value))}
                >
                  {projectPalette.map((c, i) => (
                    <option key={`${c}-bg-${i}`} value={i}>
                      {c}
                    </option>
                  ))}
                </select>
                <div
                  className="palette-check-preview"
                  style={{ background: checkBg }}
                >
                  <p
                    className="palette-check-preview-text"
                    style={{ color: bestTextOn(checkBg) }}
                  >
                    Sample text on this background
                  </p>
                </div>
                <ul className="palette-check-list">
                  {contrastPairs.length === 0 ? (
                    <li className="panel-hint">
                      Add at least two different colors to check contrast.
                    </li>
                  ) : (
                    contrastPairs.map((pair) => (
                      <li
                        key={`${pair.fg}-${pair.bg}`}
                        className="palette-check-row"
                      >
                        <span className="palette-check-pair">
                          <span
                            className="palette-check-fg"
                            style={{
                              background: pair.fg,
                              color: bestTextOn(pair.fg),
                            }}
                          >
                            Aa
                          </span>
                          <span className="palette-check-on">on</span>
                          <span
                            className="palette-check-bg-chip"
                            style={{ background: pair.bg }}
                          />
                        </span>
                        <span className="palette-check-ratio">
                          {formatRatio(pair.ratio)}
                        </span>
                        <span
                          className={`palette-check-badge ${pair.label.level}`}
                        >
                          {pair.label.text}
                        </span>
                        <span className="palette-check-detail">
                          {pair.grade.aaNormal
                            ? 'Body text OK'
                            : pair.grade.aaLarge
                              ? 'Large text only'
                              : 'Too low for text'}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </section>

            {/* 04 Type */}
            <section className="panel brand-section">
              <div className="brand-section-label">04 · Typography</div>
              <div className="brand-type-pair">
                <div className="field-block">
                  <label className="field-label" htmlFor="type-heading">
                    Heading face
                  </label>
                  <input
                    id="type-heading"
                    className="field-input"
                    value={
                      activeProject?.typeHeading || 'Plus Jakarta Sans Bold'
                    }
                    onChange={(e) =>
                      updateBrandField('typeHeading', e.target.value)
                    }
                  />
                  <div
                    className="brand-type-display"
                    style={{ marginTop: '0.65rem' }}
                  >
                    {activeProject?.typeHeading || 'Plus Jakarta Sans Bold'}
                  </div>
                </div>
                <div className="field-block" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor="type-body">
                    Body face
                  </label>
                  <input
                    id="type-body"
                    className="field-input"
                    value={
                      activeProject?.typeBody || 'Plus Jakarta Sans Regular'
                    }
                    onChange={(e) =>
                      updateBrandField('typeBody', e.target.value)
                    }
                  />
                  <div
                    className="brand-type-body"
                    style={{ marginTop: '0.65rem' }}
                  >
                    {activeProject?.typeBody || 'Plus Jakarta Sans Regular'} —
                    The quick brown fox keeps the brief honest.
                  </div>
                </div>
              </div>
            </section>

            {/* 05 Logo direction */}
            <section className="panel brand-section">
              <div className="brand-section-label">05 · Logo direction</div>
              <p className="panel-hint" style={{ marginBottom: '0.75rem' }}>
                Pick a direction note — not a fake logo generator.
              </p>
              <div className="link-list">
                <button
                  type="button"
                  className={`link-row${
                    activeProject?.logoDirection?.startsWith('Concept 1')
                      ? ' is-primary'
                      : ''
                  }`}
                  onClick={() =>
                    chooseLogoDirection(
                      'Concept 1',
                      'Abstract geometric mark with your initial'
                    )
                  }
                >
                  <span className="link-row-label">Concept 1</span>
                  <span className="link-row-meta">
                    {activeProject?.logoDirection?.startsWith('Concept 1')
                      ? 'Saved'
                      : 'Geometric mark'}
                  </span>
                </button>
                <button
                  type="button"
                  className={`link-row${
                    activeProject?.logoDirection?.startsWith('Concept 2')
                      ? ' is-primary'
                      : ''
                  }`}
                  onClick={() =>
                    chooseLogoDirection(
                      'Concept 2',
                      'Hand-drawn wordmark + icon'
                    )
                  }
                >
                  <span className="link-row-label">Concept 2</span>
                  <span className="link-row-meta">
                    {activeProject?.logoDirection?.startsWith('Concept 2')
                      ? 'Saved'
                      : 'Wordmark'}
                  </span>
                </button>
              </div>
              <div className="field-block" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
                <label className="field-label" htmlFor="logo-custom">
                  Or write your own direction
                </label>
                <input
                  id="logo-custom"
                  className="field-input"
                  value={activeProject?.logoDirection || ''}
                  onChange={(e) => setLogoDirection(e.target.value)}
                  placeholder="e.g. Soft monoline bird mark · no drop shadows"
                />
              </div>
            </section>

            {/* 06 Mood from board */}
            <section className="panel brand-section">
              <div className="brand-section-label">06 · Mood (from board)</div>
              {deskMood.length === 0 ? (
                <p className="empty-state-body" style={{ margin: 0 }}>
                  No pins yet.{' '}
                  <button
                    type="button"
                    className="text-link"
                    style={{ marginTop: 0 }}
                    onClick={() => setActiveView('studio')}
                  >
                    Open mood board
                  </button>
                </p>
              ) : (
                <div className="brand-mood-row">
                  {deskMood.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="brand-mood-thumb"
                      style={
                        p.type === 'image'
                          ? {
                              backgroundImage: `url(${p.visual})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : {
                              background:
                                typeof p.visual === 'string' &&
                                p.visual.includes('gradient')
                                  ? p.visual
                                  : p.visual || '#0B1220',
                            }
                      }
                      title={p.note}
                    />
                  ))}
                </div>
              )}
            </section>

            <div className="brand-export-bar">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveView('finish')}
              >
                Go to Finish
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={openExportPanel}
              >
                Save / print pack
              </button>
              <span className="panel-hint" style={{ margin: 0 }}>
                Or open Finish (step 5) for the full wrap-up
              </span>
            </div>
          </div>
        )}

        {/* ===== FINISH — end of path ===== */}
        {activeView === 'finish' && (
          <div className="finish-view surface-document">
            <div className="flow-top">
              <div>
                <h1 className="page-title page-title-display">Finish</h1>
                <p className="page-sub">
                  Step 5 — save your pack, start another project, or log out
                </p>
              </div>
            </div>

            <section className="panel brand-section finish-hero-panel">
              <div className="brand-section-label">Ship moment</div>
              <h2 className="panel-title" style={{ marginBottom: '0.5rem' }}>
                {activeProject?.name || 'Your project'}
              </h2>
              <p className="empty-state-body" style={{ marginBottom: '0.75rem' }}>
                You held one step still and walked the path. The thing only this
                desk gives you: a <strong>brand direction pack</strong> you can
                hand to a client, a teammate, or tomorrow-you.
              </p>
              <ul className="finish-ship-list">
                <li>
                  Steps closed this project:{' '}
                  <strong>{completedCount}</strong>
                  {deskTasks.length > 0
                    ? ` / ${deskTasks.length}`
                    : ''}
                </li>
                <li>
                  Pins: <strong>{deskMood.length}</strong>
                  {activeProject?.tagline
                    ? ` · Tagline: “${activeProject.tagline}”`
                    : ''}
                </li>
                <li>
                  Next: export the pack, then rest — or pick <em>one</em> next
                  Work step.
                </li>
              </ul>
              <div className="finish-actions finish-export-grid">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => runExport('html')}
                >
                  Download brand pack (HTML)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => runExport('md')}
                >
                  Download brand pack (Markdown)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => runExport('json')}
                >
                  Download brand pack (JSON)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    openExportPanel()
                    window.setTimeout(() => runExport('print'), 100)
                  }}
                >
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={downloadDataBackup}
                >
                  Full workspace backup (JSON)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={openExportPanel}
                >
                  Preview pack
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveView('flow')}
                >
                  One more Work step
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveView('brand')}
                >
                  Edit Brand
                </button>
              </div>
              <p className="panel-hint" style={{ marginTop: '0.75rem' }}>
                HTML opens offline and includes Print/PDF. Markdown is for docs
                and Notion. JSON is for backup/import. Use full workspace backup
                to restore everything later.
              </p>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">Start over or leave</div>
              <div className="finish-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    createNewProject()
                    const g = awardAndBroadcast('project_create', {
                      label: 'New project',
                    })
                    setActiveView('project')
                    flashToast(`New project · +${g.gained} XP`)
                  }}
                >
                  New project
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSignOut}
                >
                  {CLOUD ? 'Log out' : 'Log out / lock'}
                </button>
              </div>
              <p className="panel-hint" style={{ marginTop: '0.85rem' }}>
                Log out ends this session. Use download backup if you need a
                file on your computer.
              </p>
            </section>

            <section className="panel panel-compact">
              <p className="list-heading">Quick map (if you get lost)</p>
              <ol className="finish-map">
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('project')}>
                    1 Project
                  </button>
                  {' — '}name and pick the job
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('flow')}>
                    2 Work
                  </button>
                  {' — '}do one step at a time
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('concept')}>
                    3 Ideas
                  </button>
                  {' — '}sketches, lock plan, fill package
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('brand')}>
                    4 Brand
                  </button>
                  {' — '}colors and words
                </li>
                <li>
                  <strong>5 Finish</strong>
                  {' — '}you are here · save · log out
                </li>
              </ol>
            </section>
          </div>
        )}

        {/* ===== SETTINGS ===== */}
        {activeView === 'settings' && (
          <div className="settings-view">
            <button
              type="button"
              className="back-link"
              onClick={() => setActiveView('flow')}
            >
              ← Work
            </button>
            <div className="flow-top">
              <div>
                <h1 className="page-title">Settings</h1>
                <p className="page-sub">
                  Preferences and data. Local-only — no account, no cloud.
                </p>
              </div>
            </div>

            <section className="panel brand-section">
              <div className="brand-section-label">Appearance</div>
              <div className="settings-row">
                <div>
                  <strong>Theme</strong>
                  <span>Light or dark screen comfort</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => toggleTheme()}
                >
                  {theme === 'warm' ? 'Use dark' : 'Use light'}
                </button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Reduce motion</strong>
                  <span>Less animation</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={reduceMotion}
                  className={`pref-switch${reduceMotion ? ' is-on' : ''}`}
                  onClick={() => setPref('reduceMotion', !reduceMotion)}
                >
                  <span className="pref-switch-knob" />
                  <span className="sr-only">
                    {reduceMotion ? 'On' : 'Off'}
                  </span>
                </button>
              </div>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">Presence &amp; sound</div>
              <div className="settings-row">
                <div>
                  <strong>Design buddy</strong>
                  <span>
                    Coach + time tips. Forced lockouts are a separate switch
                    below (or on the Timer page)
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={bodyDoubling}
                  className={`pref-switch${bodyDoubling ? ' is-on' : ''}`}
                  onClick={() => toggleBodyDoubling()}
                >
                  <span className="pref-switch-knob" />
                  <span className="sr-only">
                    {bodyDoubling ? 'On' : 'Off'}
                  </span>
                </button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Timer sound</strong>
                  <span>Chime when a focus session ends</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  className={`pref-switch${soundEnabled ? ' is-on' : ''}`}
                  onClick={() => setPref('soundEnabled', !soundEnabled)}
                >
                  <span className="pref-switch-knob" />
                  <span className="sr-only">
                    {soundEnabled ? 'On' : 'Off'}
                  </span>
                </button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Force break lockouts</strong>
                  <span>
                    Lock the whole desk for 5–10 min after a Pomodoro (or after
                    25+ min with the helper on). Turn off if you only want soft
                    reminders.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={forceBreaksEnabled}
                  className={`pref-switch${forceBreaksEnabled ? ' is-on' : ''}`}
                  onClick={() => {
                    const next = !forceBreaksEnabled
                    setPref('forceBreaksEnabled', next)
                    if (!next && forcedBreak) {
                      endForcedBreak(true)
                    }
                    flashToast(
                      next ? 'Forced break lockouts on' : 'Forced break lockouts off'
                    )
                  }}
                >
                  <span className="pref-switch-knob" />
                  <span className="sr-only">
                    {forceBreaksEnabled ? 'On' : 'Off'}
                  </span>
                </button>
              </div>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">Work</div>
              <div className="settings-row">
                <div>
                  <strong>Collapse queue by default</strong>
                  <span>Only show the current step</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={queueCollapsed}
                  className={`pref-switch${queueCollapsed ? ' is-on' : ''}`}
                  onClick={() => setPref('queueCollapsed', !queueCollapsed)}
                >
                  <span className="pref-switch-knob" />
                  <span className="sr-only">
                    {queueCollapsed ? 'On' : 'Off'}
                  </span>
                </button>
              </div>
              <div className="settings-row">
                <div>
                  <strong>Show “How this works”</strong>
                  <span>Intro card on Work</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showHowItWorks}
                  className={`pref-switch${showHowItWorks ? ' is-on' : ''}`}
                  onClick={() => setPref('showHowItWorks', !showHowItWorks)}
                >
                  <span className="pref-switch-knob" />
                  <span className="sr-only">
                    {showHowItWorks ? 'On' : 'Off'}
                  </span>
                </button>
              </div>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">
                {CLOUD ? 'Account & sync' : 'Access'}
              </div>
              <p className="panel-hint" style={{ marginBottom: '0.65rem' }}>
                {accessName ? `Signed in as ${accessName}. ` : ''}
                {CLOUD
                  ? 'Your desk syncs to Supabase. This browser also keeps a local cache.'
                  : 'Local password unlocks this browser only. Add Supabase env vars for cloud accounts.'}
              </p>
              {CLOUD && (
                <p className="panel-hint" style={{ marginBottom: '0.85rem' }}>
                  Sync:{' '}
                  <strong>
                    {syncState === 'syncing'
                      ? 'Saving…'
                      : syncState === 'error'
                        ? 'Error'
                        : syncState === 'ok'
                          ? 'Up to date'
                          : 'Idle'}
                  </strong>
                  {syncError ? ` — ${syncError}` : ''}
                </p>
              )}
              <div className="settings-actions" style={{ marginBottom: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSignOut}
                >
                  {CLOUD ? 'Sign out' : 'Sign out / lock'}
                </button>
                {CLOUD && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={async () => {
                      setSyncState('syncing')
                      const result = await pushWorkspace(exportAllData())
                      if (result.ok) {
                        setSyncState('ok')
                        setSyncError('')
                        flashToast('Synced to cloud')
                      } else {
                        setSyncState('error')
                        setSyncError(result.error || 'Sync failed')
                        flashToast(result.error || 'Sync failed')
                      }
                    }}
                  >
                    Sync now
                  </button>
                )}
              </div>
              {!CLOUD && (
                <>
                  <div className="field-block" style={{ marginBottom: '0.65rem' }}>
                    <label className="field-label" htmlFor="pw-current">
                      Change local password
                    </label>
                    <input
                      id="pw-current"
                      type="password"
                      className="field-input"
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      placeholder="Current password"
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="capture-row" style={{ marginBottom: '0.5rem' }}>
                    <input
                      type="password"
                      className="field-input"
                      value={pwNext}
                      onChange={(e) => setPwNext(e.target.value)}
                      placeholder="New password (6+ chars)"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={!pwCurrent || pwNext.length < 6}
                      onClick={async () => {
                        const result = await changeAccessPassword(
                          pwCurrent,
                          pwNext
                        )
                        if (result.ok) {
                          setPwCurrent('')
                          setPwNext('')
                          flashToast('Password updated')
                        } else {
                          flashToast(result.error || 'Could not update')
                        }
                      }}
                    >
                      Update
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">Your data</div>
              <p className="panel-hint" style={{ marginBottom: '0.65rem' }}>
                {CLOUD
                  ? 'Cloud: Supabase workspace for your account. Cache: this browser’s localStorage for speed. JSON export is still the best portable backup.'
                  : STORAGE_EXPLAIN.summary}
              </p>
              <p className="panel-hint" style={{ marginBottom: '0.85rem' }}>
                Browser cache key:{' '}
                <code className="settings-code">
                  {STORAGE_EXPLAIN.workDataKey}
                </code>
                {CLOUD ? ' · Cloud table: user_workspaces' : ''}
              </p>
              <div className="settings-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={downloadDataBackup}
                >
                  Download JSON backup
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => importFileRef.current?.click()}
                >
                  Import JSON backup
                </button>
                <input
                  ref={importFileRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  aria-label="Import JSON backup file"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    if (
                      !window.confirm(
                        'Replace all data on this device with the backup? Current work will be overwritten.'
                      )
                    ) {
                      return
                    }
                    handleImportBackup(file)
                  }}
                />
              </div>
              <div className="settings-danger-zone">
                <p className="settings-danger-title">Danger zone</p>
                <p className="panel-hint" style={{ marginBottom: '0.65rem' }}>
                  These replace or wipe work. Download a backup first.
                </p>
                <div className="settings-actions">
                  <button
                    type="button"
                    className="btn btn-ghost settings-danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          'Wipe this desk and start empty (one blank project)? This cannot be undone unless you have a backup.'
                        )
                      ) {
                        clearToEmpty()
                        setActiveView('flow')
                        flashToast('Empty desk ready')
                      }
                    }}
                  >
                    Start empty desk
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost settings-danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          'Full reset: clear all data and show first-run setup again?'
                        )
                      ) {
                        clearAllData()
                        setShowOnboarding(true)
                        setActiveView('project')
                        flashToast('Reset — set up your real project')
                      }
                    }}
                  >
                    Full reset + setup
                  </button>
                </div>
              </div>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">Optional sample</div>
              <p className="panel-hint" style={{ marginBottom: '0.65rem' }}>
                Load a finished sample brand run to see the full path. It
                replaces your current workspace — export a backup first.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (
                    window.confirm(
                      'Replace your workspace with the Soft Signal sample project?'
                    )
                  ) {
                    loadSoftSignalDemo()
                  }
                }}
              >
                Load Soft Signal sample
              </button>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">About</div>
              <div className="settings-row">
                <div>
                  <strong>Version</strong>
                  <span>
                    {versionLabel()}
                    {APP_BUILD_DATE ? ` · ${APP_BUILD_DATE}` : ''}
                    {APP_BUILD ? ` · ${APP_BUILD}` : ''}
                  </span>
                </div>
              </div>
              <p className="panel-hint" style={{ margin: 0 }}>
                Creative Companion is a real desk for ADHD creative work: one
                step at a time, Helper presence, forced breaks, and brand pack
                export
                {CLOUD ? ' — with optional cloud sync when configured.' : '.'}
              </p>
            </section>
          </div>
        )}

        {/* ===== PROJECTS ===== */}
        {activeView === 'project' && (
          <div className="project-view surface-desk">
            <div className="flow-top">
              <div>
                <h1 className="page-title">Project</h1>
                <p className="page-sub">
                  Step 1 — pick or name your project, then go to Work
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveView('flow')}
              >
                Go to Work
              </button>
            </div>
            <section className="panel brand-section">
              <div className="brand-section-label">Active project</div>
              <div className="panel-head" style={{ marginBottom: '0.85rem' }}>
                <div>
                  <p className="panel-hint" style={{ marginBottom: '0.35rem' }}>
                    {deskTasks.filter((t) => !t.completed).length} open on desk
                  </p>
                </div>
                {projectPills}
              </div>

              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="project-name">
                  Name
                </label>
                <div className="capture-row">
                  <input
                    id="project-name"
                    className="field-input"
                    value={projectNameDraft}
                    onChange={(e) => setProjectNameDraft(e.target.value)}
                    onBlur={commitProjectRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commitProjectRename()
                        e.currentTarget.blur()
                      }
                    }}
                    placeholder="Project name"
                    aria-label="Project name"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={commitProjectRename}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="project-brief">
                  Brief
                </label>
                <textarea
                  id="project-brief"
                  className="field-textarea"
                  value={activeProject?.brief || ''}
                  onChange={(e) => updateProjectBrief(e.target.value)}
                  placeholder="Who is this for? What should it feel like?"
                  rows={3}
                />
              </div>

              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="proj-deadline-field">
                  Deadline
                </label>
                <div className="deadline-edit-row">
                  <input
                    id="proj-deadline-field"
                    type="date"
                    className="field-input"
                    value={projectDeadline}
                    onChange={(e) => setProjectDeadline(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setActiveView('calendar')}
                  >
                    Calendar
                  </button>
                </div>
              </div>

              <div className="capture-row" style={{ marginBottom: '1.15rem' }}>
                <input
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addQuickTask()}
                  placeholder="Quick add to this desk…"
                  aria-label="Add to desk"
                />
                <button
                  type="button"
                  onClick={addQuickTask}
                  className="btn btn-secondary"
                >
                  Add
                </button>
              </div>

              <p className="list-heading">Go to</p>
              <div className="link-list">
                <button
                  type="button"
                  className="link-row is-primary"
                  onClick={() => setActiveView('flow')}
                >
                  <span className="link-row-label">2 · Work</span>
                  <span className="link-row-meta">
                    {deskTasks.filter((t) => !t.completed).length} to do
                  </span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('concept')}
                >
                  <span className="link-row-label">3 · Ideas</span>
                  <span className="link-row-meta">Sketches &amp; plan</span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('brand')}
                >
                  <span className="link-row-label">4 · Brand</span>
                  <span className="link-row-meta">Colors &amp; words</span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('finish')}
                >
                  <span className="link-row-label">5 · Finish</span>
                  <span className="link-row-meta">Share &amp; log out</span>
                </button>
              </div>

              <div className="project-danger-zone">
                <button
                  type="button"
                  className="btn btn-ghost settings-danger"
                  disabled={projects.length <= 1}
                  onClick={handleDeleteProject}
                >
                  Delete this project
                </button>
                {projects.length <= 1 && (
                  <span className="panel-hint" style={{ margin: 0 }}>
                    Keep at least one project
                  </span>
                )}
              </div>
            </section>

            <section className="panel panel-compact">
              <p className="list-heading">On the desk</p>
              {deskTasks.length === 0 ? (
                <p className="empty-state-body" style={{ margin: 0 }}>
                  Nothing open. Add an idea above.
                </p>
              ) : (
                <ul className="desk-snapshot">
                  {deskTasks.slice(0, 5).map((t) => (
                    <li
                      key={t.id}
                      className={t.completed ? 'is-done' : undefined}
                    >
                      <span className="desk-snapshot-mark" aria-hidden="true">
                        {t.completed ? '✓' : '·'}
                      </span>
                      <span>{t.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="app-footer" role="contentinfo">
        <span className="app-footer-brand">Creative Companion</span>
        <span className="app-footer-sep" aria-hidden="true">
          ·
        </span>
        <span
          className="app-footer-version"
          title={`Build ${APP_BUILD}${APP_BUILD_DATE ? ` · ${APP_BUILD_DATE}` : ''}`}
        >
          {versionLabel()}
        </span>
        <span className="app-footer-sep" aria-hidden="true">
          ·
        </span>
        <span className="app-footer-meta">
          {accessName ? `${accessName} · ` : ''}
          {CLOUD
            ? syncState === 'syncing'
              ? 'Syncing…'
              : syncState === 'error'
                ? 'Sync error'
                : 'Cloud'
            : 'Local-only'}
        </span>
      </footer>

      {showOnboarding && (
        <div
          className="export-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboard-title"
        >
          <div className="export-panel onboard-panel">
            <p className="onboard-eyebrow">
              {CLOUD ? 'Signed in · cloud desk' : 'Saved on this device'}
            </p>
            <h2 id="onboard-title" style={{ marginTop: 0 }}>
              Start with one step
            </h2>
            <p className="view-lede">
              Name the project, then the <strong>one shippable step</strong> for
              the next 25 minutes. You&apos;ll land on Work with that step ready —
              not a blank board.
            </p>
            <label className="onboard-label">
              Project name
              <input
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                placeholder="e.g. Soft Signal covers"
                className="onboard-input"
                autoFocus
              />
            </label>
            <label className="onboard-label">
              First step (do this now)
              <input
                value={onboardFirstStep}
                onChange={(e) => setOnboardFirstStep(e.target.value)}
                placeholder="e.g. Write 3 cover rules in one pass"
                className="onboard-input"
              />
            </label>
            <label className="onboard-label">
              Brief <span className="onboard-optional">(optional)</span>
              <textarea
                value={onboardBrief}
                onChange={(e) => setOnboardBrief(e.target.value)}
                placeholder="Who is this for? Outcome? Constraint?"
                rows={2}
                className="onboard-input"
              />
            </label>
            <div className="onboard-actions">
              <button
                type="button"
                className="btn btn-primary onboard-primary"
                disabled={!onboardName.trim()}
                onClick={() => finishOnboarding('custom')}
              >
                Open Work with this step
              </button>
              <button
                type="button"
                className="text-link onboard-demo"
                onClick={() => finishOnboarding('empty')}
              >
                Skip — empty desk (no first step yet)
              </button>
            </div>
          </div>
        </div>
      )}

      {savePulse && (
        <div className="autosave-chip">✓ Saved on this device</div>
      )}

      {actionToast && (
        <div className="action-toast" role="status">
          {actionToast}
        </div>
      )}

      {exportPanel && (
        <div
          className="export-overlay no-print-hide"
          role="dialog"
          aria-modal="true"
          aria-label="Brand direction pack"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExportPanel(null)
          }}
        >
          <div className="export-panel portfolio-export">
            <div className="export-panel-header no-print">
              <div>
                <h3 style={{ margin: 0 }}>Export pack</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setExportPanel(null)}
              >
                Close
              </button>
            </div>

            <article className="direction-sheet" id="direction-sheet">
              <div
                className="export-identity-cover"
                style={{
                  background: exportPanel.palette[0] || '#4F46E5',
                  color: bestTextOn(exportPanel.palette[0] || '#4F46E5'),
                }}
              >
                <div className="kicker" style={{ color: 'inherit', opacity: 0.85 }}>
                  Brand identity template
                </div>
                <h1 className="direction-title" style={{ color: 'inherit' }}>
                  {exportPanel.projectName}
                </h1>
                <p className="direction-brief" style={{ color: 'inherit', opacity: 0.92 }}>
                  {exportPanel.tagline || 'Tagline TBD'}
                </p>
              </div>

              <div className="kicker">Positioning</div>
              <p className="direction-brief">
                {exportPanel.brief || 'No brief yet.'}
              </p>
              {exportPanel.voice && (
                <>
                  <div className="kicker">Voice</div>
                  <p className="direction-brief">{exportPanel.voice}</p>
                </>
              )}

              <div className="kicker">Palette</div>
              <div className="direction-palette">
                {exportPanel.palette.map((c, i) => (
                  <div key={`${c}-${i}`} style={{ background: c }} title={c} />
                ))}
              </div>
              <div className="direction-hex">
                {exportPanel.palette.join(' · ')}
              </div>

              <div className="kicker">Typography</div>
              <p className="direction-type">
                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {exportPanel.typeHeading}
                </span>
                <span className="surface-meta"> · {exportPanel.typeBody}</span>
              </p>

              {exportPanel.logoDirection && (
                <>
                  <div className="kicker">Logo direction</div>
                  <p className="direction-brief">{exportPanel.logoDirection}</p>
                </>
              )}

              <div className="export-do-dont">
                <div>
                  <div className="kicker">Do</div>
                  <p className="direction-brief">
                    {exportPanel.doUse || '—'}
                  </p>
                </div>
                <div>
                  <div className="kicker">Don&apos;t</div>
                  <p className="direction-brief">
                    {exportPanel.dontUse || '—'}
                  </p>
                </div>
              </div>

              <div className="kicker">Mood direction</div>
              {exportPanel.pins.length === 0 ? (
                <p className="surface-meta">No pins in this project yet.</p>
              ) : (
                <div className="direction-pins">
                  {exportPanel.pins.map((p) => (
                    <div key={p.id} className="direction-pin">
                      <div
                        className="direction-pin-visual"
                        style={{
                          backgroundImage:
                            p.type === 'image' ? `url(${p.visual})` : 'none',
                          backgroundColor:
                            p.type === 'quote' ? p.visual : '#EDE6FF',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <div className="direction-pin-note">{p.note}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="kicker">Open work</div>
              <ul className="direction-tasks">
                {exportPanel.openTasks.length === 0 ? (
                  <li>Desk clear for this project</li>
                ) : (
                  exportPanel.openTasks.map((t) => (
                    <li key={t.id}>{t.title}</li>
                  ))
                )}
              </ul>

              <footer className="direction-foot">
                Creative Companion · Brand identity ·{' '}
                {new Date().toLocaleDateString()}
              </footer>
            </article>

            <div className="export-panel-actions no-print">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => runExport('html')}
              >
                Download HTML
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => runExport('md')}
              >
                Download Markdown
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => runExport('json')}
              >
                Download JSON
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => runExport('print')}
              >
                Print / Save PDF
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setExportPanel(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Body double — presence only, NOT a chatbot */}
      {bodyDoubling && (
        <BuddyMate
          onClose={() => setBodyDoubling(false)}
          isFocusRunning={isFocusRunning}
          focusLeft={focusLeft}
          completedCount={completedCount}
          nextTaskTitle={nextTask?.title || ''}
          reduceMotion={reduceMotion}
          pulseWin={buddyWinPulse}
          activity={{
            view: activeView,
            projectName: activeProject?.name || '',
            projectDeadline: projectDeadline || '',
            nextTaskTitle: nextTask?.title || '',
            nextTaskEnergy: nextTask?.energy || 'med',
            isMicroStep: !!nextTask?.parentId,
            stepDueSoon: !!(
              nextTask?.dueDate &&
              ['overdue', 'today', 'soon'].includes(
                deadlineUrgency(nextTask.dueDate) || ''
              )
            ),
            queueCount: queueTasks.length,
            doneCount: doneTasks.length,
            openCount: openTasks.length,
            pinsCount: deskMood.length,
            isFocusRunning,
          }}
        />
      )}

      {showBreakdown && (
        <div
          className="export-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Break project into micro-steps"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBreakdown(false)
          }}
        >
          <div className="export-panel breakdown-panel">
            <div className="export-panel-header">
              <div>
                <p className="field-label" style={{ marginBottom: 4 }}>
                  ADHD project breakdown
                </p>
                <h3 style={{ margin: 0 }}>
                  Micro-steps for {activeProject?.name || 'this project'}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowBreakdown(false)}
              >
                Close
              </button>
            </div>

            <div className="breakdown-progress" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`breakdown-dot${
                    breakdownStep >= i ? ' is-on' : ''
                  }`}
                />
              ))}
            </div>

            {breakdownStep === 0 && (
              <div className="breakdown-step">
                <p className="breakdown-lead">
                  Overwhelm usually means the project is still one giant blob.
                  We&apos;ll turn it into tiny, doable desk steps you can check
                  off one at a time.
                </p>
                <ol className="breakdown-how">
                  <li>Name the goal</li>
                  <li>Write what “done” looks like</li>
                  <li>Pick how many steps (5 / 8 / 12)</li>
                  <li>Edit the list, then add to your Work queue</li>
                </ol>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setBreakdownStep(1)}
                >
                  Start breakdown
                </button>
              </div>
            )}

            {breakdownStep === 1 && (
              <div className="breakdown-step">
                <label className="field-label" htmlFor="bd-goal">
                  1 · What are we making?
                </label>
                <input
                  id="bd-goal"
                  className="field-input"
                  value={bdGoal}
                  onChange={(e) => setBdGoal(e.target.value)}
                  placeholder="e.g. Spring booklet cover directions"
                />
                <label
                  className="field-label"
                  htmlFor="bd-done"
                  style={{ marginTop: '0.85rem' }}
                >
                  2 · What does “done enough” look like?
                </label>
                <textarea
                  id="bd-done"
                  className="field-textarea"
                  rows={2}
                  value={bdDone}
                  onChange={(e) => setBdDone(e.target.value)}
                  placeholder="e.g. 3 cover options ready to show the client"
                />
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setBreakdownStep(0)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!bdGoal.trim()}
                    onClick={() => setBreakdownStep(2)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {breakdownStep === 2 && (
              <div className="breakdown-step">
                <p className="field-label">3 · How broken-down do you need?</p>
                <div className="breakdown-depth-list">
                  {BREAKDOWN_DEPTHS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`breakdown-depth${
                        bdDepth === d.id ? ' is-active' : ''
                      }`}
                      onClick={() => setBdDepth(d.id)}
                    >
                      <strong>{d.label}</strong>
                      <span>{d.hint}</span>
                    </button>
                  ))}
                </div>
                <label className="field-label" htmlFor="bd-energy">
                  Energy for these steps
                </label>
                <select
                  id="bd-energy"
                  className="palette-bg-select"
                  value={bdEnergy}
                  onChange={(e) => setBdEnergy(e.target.value)}
                >
                  <option value="low">Low — tiny actions only</option>
                  <option value="med">Med — normal creative work</option>
                  <option value="high">High — deep focus later</option>
                </select>
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setBreakdownStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={buildBreakdownPreview}
                  >
                    Generate micro-steps
                  </button>
                </div>
              </div>
            )}

            {breakdownStep === 3 && (
              <div className="breakdown-step">
                <p className="field-label">
                  4 · Edit anything · delete · add your own
                </p>
                <p className="panel-hint" style={{ marginBottom: '0.65rem' }}>
                  These become real desk entries. You only ever do the top open
                  one.
                </p>
                <ul className="breakdown-edit-list">
                  {bdSteps.map((line, i) => (
                    <li key={i}>
                      <span className="breakdown-edit-num">{i + 1}</span>
                      <input
                        className="field-input"
                        value={line}
                        onChange={(e) =>
                          updateBdStepLine(i, e.target.value)
                        }
                        aria-label={`Micro-step ${i + 1}`}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeBdStepLine(i)}
                        aria-label={`Remove step ${i + 1}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="text-link"
                  onClick={addBdStepLine}
                >
                  + Add another micro-step
                </button>
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setBreakdownStep(2)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!bdSteps.some((s) => s.trim())}
                    onClick={commitBreakdown}
                  >
                    Add {bdSteps.filter((s) => s.trim()).length} steps to Work
                  </button>
                </div>
              </div>
            )}

            {breakdownStep === 4 && (
              <div className="breakdown-step">
                <p className="session-done" style={{ marginTop: 0 }}>
                  Added {breakdownAdded} micro-steps. Queue is collapsed so you
                  only see step #1.
                </p>
                <p className="breakdown-lead">
                  Do <strong>only the current step</strong>. Mark complete when
                  finished — the next micro-step rises automatically.
                </p>
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={openBreakdown}
                  >
                    Break down more
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={finishBreakdownToStep}
                  >
                    Start current step
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreativeReset && (
        <div
          className="export-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Stuck? Pick one move"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreativeReset(false)
          }}
        >
          <div className="export-panel reset-panel">
            <h3 className="reset-title">Stuck? Pick one</h3>
            <p className="view-lede reset-lede">Esc to close.</p>
            <div className="reset-list">
              {creativeResetItems.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={item.action}
                  className="reset-row"
                >
                  <span className="reset-num" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="reset-label">{item.label}</span>
                  <span className="reset-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowCreativeReset(false)}
              className="text-link reset-dismiss"
            >
              Never mind
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
