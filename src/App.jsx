import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from 'react'
import useAppStore from './store/useAppStore'
import {
  DEFAULT_PALETTE,
  normalizeHex,
  buildPairChecks,
  bestTextOn,
  formatRatio,
  mapPaletteRoles,
  fontFamilyFromLabel,
  TYPE_PAIRS,
  typePairIdFromLabels,
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
const LoginPage = lazy(() => import('./components/LoginPage'))
const BuddyMate = lazy(() => import('./components/BuddyMate'))
const ForcedBreakOverlay = lazy(() => import('./components/ForcedBreakOverlay'))
const BrandArtboard = lazy(() => import('./components/BrandArtboard'))
const GameHUD = lazy(() => import('./components/GameHUD'))
const InsightsView = lazy(() => import('./views/InsightsView'))
const CalendarView = lazy(() => import('./views/CalendarView'))
const SettingsView = lazy(() => import('./views/SettingsView'))
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
  toolsLabelForView,
} from './lib/journey'
import { PROCESS_PHASES, getProcessPhase } from './lib/processGuide'
import {
  buildBrandPackSnapshot,
  captureSaveHandle,
  downloadBrandPackHtml,
  downloadBrandPackMarkdown,
  downloadBrandPackJson,
  downloadBrandPackPdf,
  downloadWorkspaceBackup,
  packReadiness,
  preloadPdfEngine,
  printElementById,
  slugifyFilename,
} from './lib/exportFiles'
import {
  pinFaceStyle,
  pinImageUrl,
  readImageFilesAsPins,
} from './lib/moodPins'
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
  const toggleMoodPinInPack = useAppStore((s) => s.toggleMoodPinInPack)
  const movePackPin = useAppStore((s) => s.movePackPin)
  const reorderBoardPins = useAppStore((s) => s.reorderBoardPins)
  const setPackHeroPin = useAppStore((s) => s.setPackHeroPin)
  const setColorRole = useAppStore((s) => s.setColorRole)
  const setLogoImage = useAppStore((s) => s.setLogoImage)
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
  const archiveProject = useAppStore((s) => s.archiveProject)
  const unarchiveProject = useAppStore((s) => s.unarchiveProject)
  const breakKit = useAppStore((s) => s.breakKit)
  const completeBreakKitItem = useAppStore((s) => s.completeBreakKitItem)
  const breakKitRef = useRef(breakKit)
  breakKitRef.current = breakKit

  // ——— Ephemeral UI ———
  // activeView is restored from localStorage so refresh does not always dump on Work (path 2)
  const [activeView, setActiveViewRaw] = useState(() => {
    try {
      const raw = localStorage.getItem('cc-active-view')
      const allowed = new Set([
        'flow',
        'project',
        'studio',
        'brand',
        'finish',
        'concept',
        'spark',
        'insights',
        'calendar',
        'settings',
      ])
      if (raw && allowed.has(raw)) return raw
    } catch {
      /* private mode */
    }
    // First visit: Project (path 1), not Work
    return 'project'
  })
  const setActiveView = useCallback((view) => {
    setActiveViewRaw(view)
    try {
      if (view) localStorage.setItem('cc-active-view', String(view))
    } catch {
      /* ignore */
    }
  }, [])

  const goSystemSection = useCallback(
    (section) => {
      if (section) setBrandEditSection(section)
      setActiveView('brand')
    },
    [setActiveView]
  )
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
  const [processOpen, setProcessOpen] = useState(false)
  const [brandEditSection, setBrandEditSection] = useState('essentials')
  const [brandRoleAssign, setBrandRoleAssign] = useState('cover')
  const [recentUndo, setRecentUndo] = useState(null)
  const [exportPanel, setExportPanel] = useState(null)
  const [lastExportNote, setLastExportNote] = useState('')
  const [boardLightbox, setBoardLightbox] = useState(null)
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
  const [boardSelectIds, setBoardSelectIds] = useState(() => new Set())
  const [boardDragId, setBoardDragId] = useState(null)
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
  const showProgress = !!prefs.showProgress
  const hidePackWatermark = !!prefs.hidePackWatermark
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
  const deskMood = (moodItems || [])
    .filter((m) => m.projectId == null || m.projectId === activeProjectId)
    .slice()
    .sort((a, b) => (a.boardOrder ?? 0) - (b.boardOrder ?? 0))
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

  const paletteRoles = useMemo(
    () => mapPaletteRoles(projectPalette),
    [projectPalette]
  )

  const checkBg =
    projectPalette[checkBgIndex] ||
    paletteRoles.background ||
    projectPalette[0] ||
    '#FFFFFF'

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

  /** Award XP in background; only surface XP text when Progress bar is on */
  const notifyAction = (baseMsg, action, meta = {}) => {
    let g = null
    if (action) {
      try {
        g = awardAndBroadcast(action, meta)
      } catch {
        g = null
      }
    }
    if (showProgress && g?.levelUp) {
      flashToast(`${baseMsg} · Level ${g.newLevel}!`)
    } else if (showProgress && g?.gained) {
      flashToast(`${baseMsg} · +${g.gained} XP`)
    } else {
      flashToast(baseMsg)
    }
    return g
  }


  const completeCurrentStep = () => {
    if (!nextTask) return
    const doneId = nextTask.id
    const doneTitle = nextTask.title
    toggleTask(doneId)
    setStepDueOpen(false)
    setBuddyWinPulse((n) => n + 1)
    // Quiet complete: award silently if progress bar on; never lead with XP
    if (showProgress) {
      awardAndBroadcast('step_complete', { label: 'Step done' })
    }
    setRecentUndo({ id: doneId, title: doneTitle, at: Date.now() })
    flashToast('Step complete')
    setStepFocusKey((k) => k + 1)
  }

  const undoLastComplete = () => {
    if (!recentUndo?.id) return
    toggleTask(recentUndo.id)
    flashToast('Undone')
    setRecentUndo(null)
    setStepFocusKey((k) => k + 1)
  }

  // Auto-clear undo window
  useEffect(() => {
    if (!recentUndo) return undefined
    const t = window.setTimeout(() => setRecentUndo(null), 6000)
    return () => window.clearTimeout(t)
  }, [recentUndo])

  const activeProjects = (projects || []).filter((p) => !p.archived)
  const archivedProjects = (projects || []).filter((p) => p.archived)

  const projectPills = (
    <div className="project-pills" role="tablist" aria-label="Project">
      {activeProjects.map((p) => (
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

  // Keyboard: ⌘K spark · Esc dismiss overlays (priority: topmost first)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault()
        setActiveView('spark')
        setMoreOpen(false)
        return
      }
      if (e.key !== 'Escape') return
      // Topmost dialogs first
      if (boardLightbox) {
        e.preventDefault()
        setBoardLightbox(null)
        return
      }
      if (exportPanel) {
        e.preventDefault()
        setExportPanel(null)
        return
      }
      if (showBreakdown) {
        e.preventDefault()
        setShowBreakdown(false)
        return
      }
      if (showOnboarding) {
        // Onboarding is required first-run — do not Esc-dismiss
        return
      }
      setMoreOpen(false)
      setAccountOpen(false)
      setShowCreativeReset(false)
      // Ask Helper to tuck if expanded
      window.dispatchEvent(new CustomEvent('cc-helper-minimize'))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [
    boardLightbox,
    exportPanel,
    showBreakdown,
    showOnboarding,
  ])

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

    // First lockout: short explainer once, then consent
    if (!prefs.forceBreaksConsented) {
      const ok = window.confirm(
        [
          'Forced break (one-time notice)',
          '',
          'After a focus block the desk locks for 5–10 minutes so you rest.',
          'Emergency unlock exists if you type the phrase on the overlay.',
          'Turn this off anytime in Settings → Force break lockouts.',
          '',
          'Start this break now?',
        ].join('\n')
      )
      setPref('forceBreaksExplained', true)
      if (!ok) {
        setPref('forceBreaksEnabled', false)
        setIsFocusRunning(false)
        setSessionComplete(true)
        setPomodoroWorkStartedAt(null)
        markBreak()
        flashToast('Forced lockouts off — re-enable in Settings')
        return
      }
      setPref('forceBreaksConsented', true)
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

  // Focus trap for modal overlays (export, breakdown, lightbox)
  useEffect(() => {
    const overlay =
      document.querySelector('.board-lightbox-overlay') ||
      (exportPanel && document.querySelector('.export-overlay.portfolio-export, .export-overlay')) ||
      (showBreakdown && document.querySelector('.export-overlay .breakdown-panel')?.closest('.export-overlay')) ||
      null
    // Prefer most specific overlay currently open
    let root = null
    if (boardLightbox) root = document.querySelector('.board-lightbox-overlay')
    else if (exportPanel) root = document.querySelector('.export-overlay.no-print-hide, .export-overlay')
    else if (showBreakdown) root = document.querySelector('.export-overlay')
    if (!root) return undefined

    const prevFocus = document.activeElement
    const focusableSel =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const getFocusable = () =>
      [...root.querySelectorAll(focusableSel)].filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      )
    const closeBtn = root.querySelector(
      '.board-lightbox-close, .export-panel-header button, button'
    )
    window.requestAnimationFrame(() => closeBtn?.focus?.())

    const onKey = (e) => {
      if (e.key !== 'Tab') return
      const focusable = getFocusable()
      if (focusable.length < 1) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (prevFocus && typeof prevFocus.focus === 'function') {
        try {
          prevFocus.focus()
        } catch {
          /* ignore */
        }
      }
    }
  }, [exportPanel, showBreakdown, boardLightbox])

  // Lightbox: ← → between board pins
  useEffect(() => {
    if (!boardLightbox) return undefined
    const pins = deskMood || []
    if (pins.length < 2) return undefined
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const idx = pins.findIndex(
        (p) => String(p.id) === String(boardLightbox.id)
      )
      if (idx < 0) return
      const next =
        e.key === 'ArrowRight'
          ? pins[(idx + 1) % pins.length]
          : pins[(idx - 1 + pins.length) % pins.length]
      setBoardLightbox(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [boardLightbox, deskMood])

  // Warm PDF engine on Pack (no XP for merely opening the page)
  useEffect(() => {
    if (activeView === 'finish' && unlocked) {
      void preloadPdfEngine().catch(() => {})
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
    notifyAction('Captured', 'task_capture', {
      label: quickInput.trim().slice(0, 40),
    })
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
      notifyAction('Focus on', 'focus_start', { label: 'Focus' })
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
    const slug = slugifyFilename(pack.projectName, 'brand-pack')
    const finishOk = (label) => {
      const g = awardAndBroadcast('export_pack', { label })
      const when = new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
      if (kind !== 'backup') {
        setLastExportNote(
          kind === 'pdf'
            ? `PDF saved · ${when}`
            : `${label || kind.toUpperCase()} saved · ${when}`
        )
      }
      if (showProgress && g?.gained) {
        flashToast(
          kind === 'backup'
            ? `Backup saved · +${g.gained} XP`
            : `Pack downloaded · +${g.gained} XP`
        )
      } else {
        flashToast(kind === 'backup' ? 'Backup saved' : 'Pack downloaded')
      }
    }

    // Capture File System Access handle WHILE we still have the user-gesture.
    // Critical for PDF (async jsPDF load) and helps Chrome when anchor download is blocked.
    const saveName =
      kind === 'pdf'
        ? `${slug}-brand-direction.pdf`
        : kind === 'html'
          ? `${slug}-brand-direction.html`
          : kind === 'md'
            ? `${slug}-brand-direction.md`
            : kind === 'json'
              ? `${slug}-brand-pack.json`
              : kind === 'backup'
                ? `creative-companion-backup-${new Date().toISOString().slice(0, 10)}.json`
                : null
    const handlePromise = saveName
      ? captureSaveHandle(saveName, 'Creative Companion export')
      : null

    if (kind === 'pdf') {
      // Prefer live System artboard; else open export panel BrandArtboard
      const hasSystem = document.getElementById('system-artboard')
      if (!hasSystem && !exportPanel) openExportPanel()
      void preloadPdfEngine()
      flashToast('Capturing pack preview as PDF…')
      void (async () => {
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r))
        )
        if (
          !document.getElementById('system-artboard') &&
          !document.getElementById('direction-sheet')
        ) {
          await new Promise((r) => setTimeout(r, 100))
        }
        const live =
          document.getElementById('system-artboard') ||
          document.getElementById('direction-sheet') ||
          document.getElementById('pack-preview-artboard')
        const result = await downloadBrandPackPdf(pack, handlePromise, {
          element: live || null,
        })
        if (result.ok) finishOk('Brand PDF')
        else if (result.cancelled) flashToast('Save cancelled')
        else flashToast(result.error || 'PDF failed')
      })()
      return
    }

    if (kind === 'html') {
      void Promise.resolve(downloadBrandPackHtml(pack, handlePromise)).then(
        (result) => {
          if (result.ok) finishOk('Brand HTML')
          else if (result.cancelled) flashToast('Save cancelled')
          else flashToast(result.error || 'Download failed')
        }
      )
      return
    }
    if (kind === 'md') {
      void Promise.resolve(downloadBrandPackMarkdown(pack, handlePromise)).then(
        (result) => {
          if (result.ok) finishOk('Brand Markdown')
          else if (result.cancelled) flashToast('Save cancelled')
          else flashToast(result.error || 'Download failed')
        }
      )
      return
    }
    if (kind === 'json') {
      void Promise.resolve(downloadBrandPackJson(pack, handlePromise)).then(
        (result) => {
          if (result.ok) finishOk('Brand JSON')
          else if (result.cancelled) flashToast('Save cancelled')
          else flashToast(result.error || 'Download failed')
        }
      )
      return
    }
    if (kind === 'backup') {
      const result = downloadWorkspaceBackup(exportAllData())
      if (result.ok) finishOk('Workspace backup')
      else flashToast(result.error || 'Download failed')
      return
    }
    if (kind === 'print') {
      if (!exportPanel) openExportPanel()
      window.setTimeout(() => {
        const el =
          document.getElementById('direction-sheet') ||
          document.getElementById('system-artboard') ||
          document.getElementById('pack-preview-artboard')
        const r = el
          ? printElementById(el.id, { hideWatermark: hidePackWatermark })
          : { ok: false, error: 'Nothing to print' }
        if (r.ok) {
          awardAndBroadcast('export_pack', { label: 'Print / PDF' })
          const when = new Date().toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })
          setLastExportNote(`Print dialog · ${when} — Save as PDF if you want a file`)
          flashToast('Print dialog open — choose Save as PDF if you want a file')
        } else flashToast(r.error || 'Print failed')
      }, exportPanel ? 50 : 180)
      return
    }
    flashToast('Unknown export')
  }

  const uploadMoodFiles = (fileList) => {
    const list = Array.from(fileList || [])
    if (!list.length) return
    void readImageFilesAsPins(list).then(({ pins, skipped }) => {
      if (!pins.length) {
        flashToast(
          skipped.length
            ? `No images added · ${skipped[0]}${
                skipped.length > 1 ? ` (+${skipped.length - 1} more)` : ''
              }`
            : 'No images found — use PNG, JPG, WEBP, or GIF under 3.5MB'
        )
        return
      }
      pins.forEach((pin) => addMoodPin(pin))
      if (skipped.length) {
        flashToast(
          `Added ${pins.length} · skipped ${skipped.length} (size/type)`
        )
      }
      notifyAction(
        pins.length > 1
          ? `${pins.length} images pinned${skipped.length ? ` · ${skipped.length} skipped` : ''}`
          : `Image pinned${skipped.length ? ` · ${skipped.length} skipped` : ''}`,
        'mood_pin',
        { label: `${pins.length} image${pins.length > 1 ? 's' : ''}` }
      )
    })
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
      if (
        !window.confirm(
          'Load Soft Signal as a demo project? This merges demo content into this browser workspace — export a backup first if you care about current work.'
        )
      ) {
        return
      }
      const res = await fetch(
        `${import.meta.env.BASE_URL}demos/soft-signal-workspace.json`
      )
      if (!res.ok) throw new Error('Demo file missing')
      const data = await res.json()
      const result = importAllData(data)
      if (result.ok) {
        setBodyDoubling(true)
        setActiveView('project')
        notifyAction(
          'Soft Signal demo loaded · walk Project → Pack',
          'project_create',
          { label: 'Soft Signal demo' }
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
    notifyAction('Pin added', 'mood_pin', { label: 'URL pin' })
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
    notifyAction('Pin added', 'mood_pin', { label: 'Note pin' })
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
        <Suspense fallback={null}>
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
        </Suspense>
      )}
      <header className="header header-redesign">
        <div className="header-content header-content-simple">
          <div className="brand-block">
            <div className="logo">
              <span className="logo-mark" aria-hidden="true" />
              Creative Companion
            </div>
          </div>
          <div className="header-actions">
            {activeProjects.length > 1 && (
              <select
                className="header-project-select"
                value={activeProjectId || ''}
                onChange={(e) => selectProject(Number(e.target.value) || e.target.value)}
                aria-label="Project"
              >
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
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
            <div className="more-wrap" ref={moreWrapRef}>
              <button
                type="button"
                className="btn btn-secondary header-more"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-controls="tools-menu"
                id="tools-menu-button"
                onClick={() => {
                  setMoreOpen(!moreOpen)
                  setAccountOpen(false)
                }}
              >
                Tools
              </button>
              {moreOpen && (
                <div className="more-menu" role="menu" id="tools-menu" aria-labelledby="tools-menu-button">
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
                    <span>Focus for the current step</span>
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
                    <strong>Calendar</strong>
                    <span>Deadlines</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      const next = !bodyDoubling
                      toggleBodyDoubling()
                      if (next) {
                        awardAndBroadcast('helper_on', { label: 'Helper' })
                        flashToast('Helper on')
                      } else {
                        flashToast('Helper off')
                      }
                      setMoreOpen(false)
                    }}
                  >
                    <strong>
                      {bodyDoubling ? 'Turn Helper off' : 'Turn Helper on'}
                    </strong>
                    <span>Coach · Critique · Break</span>
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
                id="account-menu-button"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-controls="account-menu"
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
                <div className="account-menu" role="menu" id="account-menu" aria-labelledby="account-menu-button">
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
                    {theme === 'warm' ? 'Dark' : 'Light'}
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

        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {showProgress && (
          <Suspense fallback={null}>
            <GameHUD />
          </Suspense>
        )}
        <nav
          className={`journey-bar${journeyActive ? '' : ' is-tools'}`}
          aria-label="Your path through Creative Companion"
        >
          <ol className="journey-bar-list">
            {JOURNEY_STEPS.map((step) => {
              const active = journeyActive === step.id
              return (
                <li key={step.id} className="journey-bar-item">
                  <button
                    type="button"
                    className={`journey-step${active ? ' is-active' : ''}`}
                    onClick={() => setActiveView(step.view)}
                    aria-current={active ? 'step' : undefined}
                    aria-label={`Step ${step.num}: ${step.label}. ${step.plain}`}
                    title={step.plain}
                  >
                    <span className="journey-num" aria-hidden="true">
                      {step.num}
                    </span>
                    <span className="journey-label">{step.label}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          {!journeyActive && (
            <span className="journey-tools-pill" role="status" aria-live="polite">
              Tools · {toolsLabelForView(activeView)}
            </span>
          )}
        </nav>
      </header>

      <main className="main" id="main-content" tabIndex={-1}>
        {/* ===== WORK — one step owns the fold ===== */}
        {activeView === 'flow' && (
          <div className="flow-view surface-desk">
            <div className="flow-top flow-top-compact">
              <div>
                <p className="work-context-line">
                  <strong>{activeProject?.name || 'Project'}</strong>
                  {projectDeadline
                    ? ` · due ${formatShortDate(projectDeadline)}`
                    : ''}
                  <span className="work-context-progress">
                    {' '}
                    · {completedCount}/{deskTasks.length || 0} done
                  </span>
                </p>
              </div>
            </div>

            {/* Current step owns the fold */}
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
                <div className="empty-state empty-state-craft">
                  <div className="empty-craft empty-craft-desk" aria-hidden="true">
                    <span className="empty-craft-line" />
                    <span className="empty-craft-line is-short" />
                    <span className="empty-craft-dot" />
                  </div>
                  <p className="empty-state-title">
                    {doneTasks.length > 0
                      ? 'Queue clear'
                      : 'No step yet'}
                  </p>
                  <p className="empty-state-body">
                    {doneTasks.length > 0
                      ? 'Capture the next shippable outcome below — or break a big project into micro-steps.'
                      : 'Capture one shippable step below, or break the project into micro-steps.'}
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
                    <details className="step-more-details">
                      <summary>More</summary>
                      <div className="step-more-panel">
                        {!nextTask.parentId && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              breakIntoSteps(nextTask.id)
                              notifyAction('Split into 3', 'micro_steps', {
                                label: 'Split step',
                              })
                              setStepFocusKey((k) => k + 1)
                            }}
                          >
                            Split if too big
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            setProcessOpen((o) => !o)
                            if (!processPhase) setProcessPhase('clarify')
                          }}
                          aria-expanded={processOpen}
                        >
                          Design checklist
                        </button>
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
                    </details>
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

            {/* Optional design mode (process checklist) — below the fold */}
            {processOpen && (
              <section className="process-rail process-rail-optional" aria-label="Design mode">
                <div className="process-rail-chips">
                  {PROCESS_PHASES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`process-chip${
                        processPhase === p.id ? ' is-active' : ''
                      }`}
                      onClick={() => setProcessPhase(p.id)}
                      aria-pressed={processPhase === p.id}
                    >
                      {p.short}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      setProcessOpen(false)
                      setProcessPhase(null)
                    }}
                  >
                    Close
                  </button>
                </div>
                {processPhase && getProcessPhase(processPhase) && (
                  <div className="process-guide-panel">
                    <strong>{getProcessPhase(processPhase).title}</strong>
                    <p className="process-guide-prompt">
                      {nextTask
                        ? `For “${String(nextTask.title).slice(0, 60)}”: ${
                            getProcessPhase(processPhase).prompt
                          }`
                        : getProcessPhase(processPhase).prompt}
                    </p>
                    <ul className="process-guide-checks">
                      {getProcessPhase(processPhase).checks.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {showHowItWorks && (
              <section className="product-card product-card-quiet" aria-label="How this desk works">
                <div className="product-card-top">
                  <p className="product-card-eyebrow">Desk</p>
                  <button
                    type="button"
                    className="product-card-dismiss"
                    onClick={hideHowItWorks}
                  >
                    Got it
                  </button>
                </div>
                <p className="product-card-title" style={{ marginBottom: 0 }}>
                  One step owns the screen. Complete it. Board → System → Pack.
                </p>
              </section>
            )}

            <p className="work-below-tools">
              <button
                type="button"
                className="text-link"
                onClick={openBreakdown}
              >
                Break project down
              </button>
            </p>

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

        {/* ===== BOARD — path step 3 ===== */}
        {activeView === 'studio' && (
          <div className="studio-view surface-wall">
            <div className="flow-top">
              <div>
                <h1 className="page-title">Board</h1>
                <p className="page-sub">
                  Upload refs. Star up to 6 for System + Pack.
                  {deskMood.filter((m) => m.inPack).length > 0
                    ? ` · ${deskMood.filter((m) => m.inPack).length}/6 in pack`
                    : ''}
                </p>
              </div>
              <span className="panel-count">{deskMood.length} pins</span>
            </div>

            <section className="panel brand-section">
              <div className="brand-section-label">Add</div>
              <div className="mood-add-layout">
                <label className="mood-add-hero btn-like">
                  <strong>Upload real images</strong>
                  <span>
                    From your device — PNG, JPG, WEBP, GIF (screenshots, comps,
                    photos). Drag onto the board below too.
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/*"
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
                Tip: drag image files onto the board, or drag pins to reorder.
              </p>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">
                Board · {deskMood.length}
              </div>
              {deskMood.length > 0 && (
                <div className="board-pack-bar">
                  <span className="panel-hint" style={{ margin: 0 }}>
                    Pack {deskMood.filter((m) => m.inPack).length}/6
                    {deskMood.filter((m) => m.inPack).length >= 6
                      ? ' · full'
                      : ''}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const open = deskMood.filter((m) => !m.inPack)
                      let added = 0
                      for (const p of open) {
                        if (deskMood.filter((m) => m.inPack).length + added >= 6)
                          break
                        const r = toggleMoodPinInPack(p.id)
                        if (r.ok && r.inPack) added++
                      }
                      flashToast(
                        added
                          ? `Starred ${added} for pack`
                          : deskMood.filter((m) => m.inPack).length >= 6
                            ? 'Pack full (6 max)'
                            : 'Nothing to star'
                      )
                    }}
                  >
                    Star next unpinned
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const starred = deskMood.filter((m) => m.inPack)
                      starred.forEach((p) => toggleMoodPinInPack(p.id))
                      flashToast('Cleared pack stars')
                    }}
                  >
                    Clear stars
                  </button>
                </div>
              )}
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
                  const pinId = e.dataTransfer.getData('text/cc-pin-id')
                  if (pinId) {
                    const target = e.target.closest('[data-pin-id]')
                    const targetId = target?.getAttribute('data-pin-id')
                    if (targetId && targetId !== pinId) {
                      const ids = deskMood.map((m) => m.id)
                      const from = ids.findIndex(
                        (id) => String(id) === String(pinId)
                      )
                      const to = ids.findIndex(
                        (id) => String(id) === String(targetId)
                      )
                      if (from >= 0 && to >= 0) {
                        const next = [...ids]
                        const [moved] = next.splice(from, 1)
                        next.splice(to, 0, moved)
                        reorderBoardPins(next, activeProjectId)
                        // Keep pack order aligned when both are starred
                        const packIds = next.filter((id) =>
                          deskMood.find(
                            (m) => String(m.id) === String(id) && m.inPack
                          )
                        )
                        if (packIds.length > 1) {
                          useAppStore.getState().reorderPackPins(packIds)
                        }
                        flashToast('Board order updated')
                      }
                    }
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
                    notifyAction('Pin added', 'mood_pin', {
                      label: 'Dropped pin',
                    })
                  }
                }}
              >
                {deskMood.length === 0 ? (
                  <div className="empty-state empty-state-craft">
                    <div className="empty-craft empty-craft-board" aria-hidden="true">
                      <span /><span /><span />
                    </div>
                    <p className="empty-state-title">No pins yet</p>
                    <p className="empty-state-body">
                      Upload images (or drag them here), then star{' '}
                      <strong>2–6</strong> with ★ Pack so they appear on System
                      and Pack. Drag pins to reorder.
                    </p>
                  </div>
                ) : (
                  deskMood.map((item, index) => {
                    const isHero = index === 0
                    const face = pinFaceStyle(item)
                    const isImageFace = Boolean(face.backgroundImage?.includes('url('))
                    const isQuote =
                      !isImageFace ||
                      item.type === 'quote' ||
                      item.type === 'color' ||
                      item.type === 'note'
                    return (
                      <article
                        key={item.id || index}
                        data-pin-id={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'text/cc-pin-id',
                            String(item.id)
                          )
                          e.dataTransfer.effectAllowed = 'move'
                          setBoardDragId(item.id)
                        }}
                        onDragEnd={() => setBoardDragId(null)}
                        className={`mood-card${isQuote && !isImageFace ? ' is-quote' : ''}${
                          index === 0 ? ' is-hero' : ''
                        }${item.inPack ? ' is-pack-pin' : ''}${
                          boardDragId === item.id ? ' is-dragging' : ''
                        }${item.packHero ? ' is-pack-hero' : ''}`}
                      >
                        {isImageFace ? (
                          <button
                            type="button"
                            className="mood-pin-media mood-pin-media-btn"
                            style={
                              pinImageUrl(item)
                                ? { backgroundColor: '#E8E4F8' }
                                : face
                            }
                            aria-label={`View pin${item.note ? `: ${item.note}` : ''}`}
                            onClick={() => setBoardLightbox(item)}
                          >
                            {pinImageUrl(item) ? (
                              <img
                                className="mood-pin-img"
                                src={pinImageUrl(item)}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                              />
                            ) : null}
                          </button>
                        ) : (
                          <div
                            className="mood-pin-face"
                            style={face}
                          >
                            <p className="mood-pin-caption">
                              {item.note || 'Note'}
                            </p>
                          </div>
                        )}
                        <div className="mood-pin-tools">
                          <button
                            type="button"
                            className={`mood-pin-star${item.inPack ? ' is-on' : ''}${item.packHero ? ' is-hero' : ''}`}
                            title={
                              item.inPack
                                ? 'Remove from pack'
                                : 'Include in pack (max 6)'
                            }
                            aria-pressed={!!item.inPack}
                            onClick={() => {
                              const r = toggleMoodPinInPack(item.id)
                              if (!r.ok)
                                flashToast(
                                  r.error || 'Pack full (6 pins max)'
                                )
                              else
                                flashToast(
                                  r.inPack
                                    ? `In pack (${deskMood.filter((m) => m.inPack).length + (r.inPack && !item.inPack ? 1 : 0)}/6)`
                                    : 'Removed from pack'
                                )
                            }}
                          >
                            {item.inPack ? '★ Pack' : '☆ Pack'}
                          </button>
                          {item.inPack && (
                            <span className="mood-pack-order-tools">
                              <button
                                type="button"
                                className="btn btn-ghost mood-pin-order"
                                title="Move earlier in pack"
                                aria-label="Move pin earlier in pack"
                                onClick={() => movePackPin(item.id, 'up')}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost mood-pin-order"
                                title="Move later in pack"
                                aria-label="Move pin later in pack"
                                onClick={() => movePackPin(item.id, 'down')}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className={`btn btn-ghost mood-pin-order${item.packHero ? ' is-on' : ''}`}
                                title="Hero pin (first in pack)"
                                aria-label="Set as hero pin"
                                aria-pressed={!!item.packHero}
                                onClick={() => {
                                  const r = setPackHeroPin(item.id)
                                  if (r.ok) flashToast('Hero pin set')
                                  else flashToast(r.error || 'Could not set hero')
                                }}
                              >
                                Hero
                              </button>
                            </span>
                          )}
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

            <p className="work-below-tools">
              <button
                type="button"
                className="text-link"
                onClick={() => setActiveView('flow')}
              >
                Work
              </button>
              <span aria-hidden="true"> · </span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginLeft: '0.35rem' }}
                onClick={() => setActiveView('brand')}
              >
                Go to System
              </button>
            </p>
          </div>
        )}


        {boardLightbox && (
          <div
            className="board-lightbox-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Pin preview"
            onClick={(e) => {
              if (e.target === e.currentTarget) setBoardLightbox(null)
            }}
          >
            <div className="board-lightbox-card">
              <button
                type="button"
                className="btn btn-ghost board-lightbox-close"
                onClick={() => setBoardLightbox(null)}
              >
                Close
              </button>
              {pinImageUrl(boardLightbox) ? (
                <img
                  className="board-lightbox-visual board-lightbox-img"
                  src={pinImageUrl(boardLightbox)}
                  alt={boardLightbox.note || 'Board pin'}
                  decoding="async"
                />
              ) : (
                <div
                  className="board-lightbox-visual"
                  style={pinFaceStyle(boardLightbox)}
                />
              )}
              {boardLightbox.note ? (
                <p className="board-lightbox-note">{boardLightbox.note}</p>
              ) : null}
              <p className="board-lightbox-meta">
                {(() => {
                  const i = deskMood.findIndex(
                    (p) => String(p.id) === String(boardLightbox.id)
                  )
                  return i >= 0
                    ? `${i + 1} / ${deskMood.length} · ← → to move · Esc to close`
                    : 'Esc to close'
                })()}
              </p>
              <div className="board-lightbox-actions">
                {deskMood.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        const pins = deskMood
                        const idx = pins.findIndex(
                          (p) => String(p.id) === String(boardLightbox.id)
                        )
                        if (idx < 0) return
                        setBoardLightbox(
                          pins[(idx - 1 + pins.length) % pins.length]
                        )
                      }}
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        const pins = deskMood
                        const idx = pins.findIndex(
                          (p) => String(p.id) === String(boardLightbox.id)
                        )
                        if (idx < 0) return
                        setBoardLightbox(pins[(idx + 1) % pins.length])
                      }}
                    >
                      Next →
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={`btn btn-secondary${boardLightbox.inPack ? ' is-on' : ''}`}
                  onClick={() => {
                    const r = toggleMoodPinInPack(boardLightbox.id)
                    if (!r.ok) flashToast(r.error || 'Pack full')
                    else {
                      setBoardLightbox((p) =>
                        p ? { ...p, inPack: r.inPack } : null
                      )
                      flashToast(r.inPack ? 'In pack' : 'Removed from pack')
                    }
                  }}
                >
                  {boardLightbox.inPack ? '★ In pack' : '☆ Add to pack'}
                </button>
              </div>
            </div>
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
                    notifyAction('Pinned', 'mood_pin', { label: 'Spark pin' })
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

        {/* ===== FOCUS (lazy) ===== */}
        {activeView === 'insights' && (
          <Suspense fallback={<div className="panel panel-hint" style={{ margin: '1rem' }}>Loading timer…</div>}>
            <InsightsView
              setActiveView={setActiveView}
              nextTask={nextTask}
              focusMinutes={focusMinutes}
              focusSeconds={focusSeconds}
              forcedBreak={forcedBreak}
              startOrPauseFocus={startOrPauseFocus}
              resetFocus={resetFocus}
              isFocusRunning={isFocusRunning}
              focusLeft={focusLeft}
              POMODORO_WORK_MIN={POMODORO_WORK_MIN}
              forceBreaksEnabled={forceBreaksEnabled}
              setPref={setPref}
              bodyDoubling={bodyDoubling}
              toggleBodyDoubling={toggleBodyDoubling}
              flashToast={flashToast}
              endForcedBreak={endForcedBreak}
              sessionComplete={sessionComplete}
              toggleTask={toggleTask}
              completedCount={completedCount}
              deskTasks={deskTasks}
              prefs={prefs}
            />
          </Suspense>

        )}
        {/* ===== CALENDAR (lazy) ===== */}
        {activeView === 'calendar' && (
          <Suspense fallback={<div className="panel panel-hint" style={{ margin: '1rem' }}>Loading calendar…</div>}>
            <CalendarView
              setActiveView={setActiveView}
              calCursor={calCursor}
              setCalCursor={setCalCursor}
              buildMonthGrid={buildMonthGrid}
              formatMonthYear={formatMonthYear}
              formatShortDate={formatShortDate}
              urgencyLabel={urgencyLabel}
              deadlineUrgency={deadlineUrgency}
              daysUntil={daysUntil}
              toISODate={toISODate}
              calendarEvents={calendarEvents}
              selectProject={selectProject}
              projectDeadline={projectDeadline}
              setProjectDeadline={setProjectDeadline}
              activeProject={activeProject}
              upcomingDeadlines={upcomingDeadlines}
            />
          </Suspense>
        )}

        {/* Concept pipeline removed from UI — Board + System only */}

        {/* ===== BRAND IDENTITY TEMPLATE ===== */}
        {activeView === 'brand' && (
          <div className="brand-layout surface-document system-view">
            <div className="brand-template-top">
              <div>
                <h1 className="page-title">System</h1>
                <p className="page-sub">
                  Live artboard for{' '}
                  <strong>{activeProject?.name || 'this project'}</strong>
                  {' · '}
                  pack pins {deskMood.filter((m) => m.inPack).length}/6
                </p>
              </div>
              <div className="brand-template-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveView('studio')}
                >
                  Board
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveView('finish')}
                >
                  Download pack
                </button>
              </div>
            </div>

            {/* ARTBOARD — shared pack source of truth */}
            <Suspense fallback={<div className="panel-hint">Loading artboard…</div>}>
            <BrandArtboard
              id="system-artboard"
              project={activeProject || {}}
              palette={projectPalette}
              pins={deskMood.filter((m) => m.inPack)}
              editable={false}
              hideWatermark={hidePackWatermark}
            />
            </Suspense>

            <p className="system-edit-label">Edit fields (artboard above is live preview)</p>
            <div className="system-accordion-nav" role="tablist">
              {[
                ['essentials', 'Tagline'],
                ['voice', 'Voice'],
                ['colors', 'Colors'],
                ['type', 'Type'],
                ['logo', 'Logo'],
                ['pins', 'Pins'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={brandEditSection === id}
                  className={`system-acc-tab${
                    brandEditSection === id ? ' is-active' : ''
                  }`}
                  onClick={() =>
                    setBrandEditSection((cur) => (cur === id ? null : id))
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 01 Essentials */}
            <section
              className={`panel brand-section${
                brandEditSection && brandEditSection !== 'essentials'
                  ? ' is-collapsed-edit'
                  : ''
              }`}
              hidden={brandEditSection !== 'essentials'}
            >
              <div className="brand-section-label">Tagline &amp; positioning</div>
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
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'voice'}
            >
              <div className="brand-section-label">Voice · do / don&apos;t</div>
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
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'colors'}
            >
              <div className="brand-section-label">Colors</div>
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


              <div className="palette-roles-editor" style={{ marginTop: '1rem' }}>
                <p className="field-label" style={{ marginBottom: '0.45rem' }}>
                  Pack roles — pick a role, then a swatch
                </p>
                <div className="system-role-assign">
                  {['cover', 'text', 'accent', 'quiet'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`role-pick-chip${brandRoleAssign === role ? ' is-active' : ''}`}
                      onClick={() => setBrandRoleAssign(role)}
                    >
                      {role[0].toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="direction-palette is-clickable" style={{ marginTop: '0.55rem' }}>
                  {projectPalette.map((c, i) => (
                    <button
                      key={`${c}-role-${i}`}
                      type="button"
                      className="palette-swatch-btn"
                      style={{ background: c }}
                      title={`Set as ${brandRoleAssign}`}
                      onClick={() => {
                        const n = normalizeHex(c) || c
                        setColorRole(brandRoleAssign, n)
                        flashToast(`${brandRoleAssign} → ${n}`)
                      }}
                    ></button>
                  ))}
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
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'type'}
            >
              <div className="brand-section-label">Type</div>
              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="type-pair">
                  Type pair
                </label>
                <select
                  id="type-pair"
                  className="field-input"
                  value={
                    typePairIdFromLabels(
                      activeProject?.typeHeading,
                      activeProject?.typeBody
                    ) || 'custom'
                  }
                  onChange={(e) => {
                    const id = e.target.value
                    if (id === 'custom') return
                    const pair = TYPE_PAIRS.find((p) => p.id === id)
                    if (!pair) return
                    updateBrandField('typeHeading', pair.heading)
                    updateBrandField('typeBody', pair.body)
                    flashToast(`Type · ${pair.label}`)
                  }}
                >
                  {TYPE_PAIRS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                  <option value="custom">Custom labels…</option>
                </select>
              </div>
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
                    style={{
                      marginTop: '0.65rem',
                      fontFamily: fontFamilyFromLabel(
                        activeProject?.typeHeading || 'Plus Jakarta Sans Bold'
                      ),
                    }}
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
                    style={{
                      marginTop: '0.65rem',
                      fontFamily: fontFamilyFromLabel(
                        activeProject?.typeBody || 'Plus Jakarta Sans Regular'
                      ),
                    }}
                  >
                    {activeProject?.typeBody || 'Plus Jakarta Sans Regular'} —
                    The quick brown fox keeps the brief honest.
                  </div>
                </div>
              </div>
            </section>

            {/* 05 Logo direction */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'logo'}
            >
              <div className="brand-section-label">Logo</div>
              <p className="panel-hint" style={{ marginBottom: '0.75rem' }}>
                Direction notes + optional mark image for the pack cover.
              </p>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-custom">
                  Logo direction
                </label>
                <input
                  id="logo-custom"
                  className="field-input"
                  value={activeProject?.logoDirection || ''}
                  onChange={(e) => setLogoDirection(e.target.value)}
                  placeholder="e.g. Soft monoline bird mark · no drop shadows"
                />
              </div>
              <div className="finish-secondary-row">
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  {activeProject?.logoImage ? 'Replace mark image' : 'Upload mark image'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      if (file.size > 2.5 * 1024 * 1024) {
                        flashToast('Mark image must be under 2.5MB')
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = () => {
                        setLogoImage(reader.result)
                        flashToast('Mark image added')
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
                {activeProject?.logoImage ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setLogoImage('')
                      flashToast('Mark removed')
                    }}
                  >
                    Remove mark
                  </button>
                ) : null}
              </div>
            </section>

            {/* 06 Mood from board — starred pack pins only */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'pins'}
            >
              <div className="brand-section-label">Pack pins (starred on Board)</div>
              {(() => {
                const packPins = deskMood.filter((m) => m.inPack)
                if (packPins.length === 0) {
                  return (
                <div className="brand-mood-empty">
                  <p className="empty-state-body" style={{ margin: 0 }}>
                    Star pins on the Board with ★ Pack (max 6). Only starred
                    pins appear here and in your brand pack.
                  </p>
                  <div className="finish-secondary-row" style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setActiveView('studio')}
                    >
                      Open Board
                    </button>
                  </div>
                </div>
                  )
                }
                return (
                <div className="brand-mood-row">
                  {packPins.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="brand-mood-thumb"
                      style={pinFaceStyle(p)}
                      title={p.note}
                    />
                  ))}
                </div>
                )
              })()}
            </section>

            <div className="brand-export-bar">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveView('studio')}
              >
                Board
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveView('finish')}
              >
                Go to Pack
              </button>
            </div>
          </div>
        )}

        {/* ===== PACK — end of path ===== */}
        {activeView === 'finish' && (
          <div className="finish-view surface-document pack-view">
            <div className="flow-top">
              <div>
                <h1 className="page-title page-title-display">Pack</h1>
                <p className="page-sub">
                  {activeProject?.name || 'Your project'} · preview &amp; download
                </p>
              </div>
            </div>

            <section className="panel brand-section finish-hero-panel pack-hero">
              <div className="pack-layout">
                <div className="pack-preview-thumb pack-preview-artboard">
                  <Suspense fallback={<div className="panel-hint">Loading artboard…</div>}>
            <BrandArtboard
                    id="pack-preview-artboard"
                    project={activeProject || {}}
                    palette={projectPalette}
                    pins={deskMood.filter((m) => m.inPack)}
                    compact
                    editable={false}
                    hideWatermark={hidePackWatermark}
                  />
            </Suspense>
                </div>
                <div className="pack-meta">
                  {(() => {
                    const packSnap = buildCurrentBrandPack()
                    const ready = packReadiness(packSnap)
                    return (
                      <>
                        <div className="brand-section-label">Ready</div>
                        <ul className="pack-ready-list">
                          {ready.checks.map((c) => (
                            <li
                              key={c.id}
                              className={c.ok ? 'is-ok' : 'is-miss'}
                            >
                              {c.ok ? (
                                <span>
                                  ✓ {c.label}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="pack-ready-fix"
                                  onClick={() => {
                                    if (c.view === 'studio') setActiveView('studio')
                                    else if (c.view === 'brand')
                                      goSystemSection(c.section || 'essentials')
                                    else if (c.view) setActiveView(c.view)
                                  }}
                                >
                                  ○ {c.label} — fix
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                        <p className="panel-hint">
                          Steps {completedCount}
                          {deskTasks.length ? `/${deskTasks.length}` : ''} · Pins{' '}
                          {packSnap.pins?.length || 0}
                          {packSnap.pinsUsedFallback
                            ? ' (star pins on Board to curate)'
                            : ''}
                        </p>
                        {ready.thin && (
                          <p className="pack-thin-warning" role="status">
                            Thin pack — add a tagline, palette, or ★ Pack pins
                            on Board before client handoff.
                          </p>
                        )}
                      </>
                    )
                  })()}
                  <div className="finish-actions pack-primary-stack">
                    <button
                      type="button"
                      className="btn btn-primary pack-download-btn"
                      onClick={() => {
                        const packSnap = buildCurrentBrandPack()
                        const ready = packReadiness(packSnap)
                        if (ready.thin) {
                          const go = window.confirm(
                            'This pack looks thin (missing tagline, palette, or pins). Download anyway?'
                          )
                          if (!go) return
                        }
                        runExport('pdf')
                      }}
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary pack-print-btn"
                      onClick={() => {
                        const packSnap = buildCurrentBrandPack()
                        const ready = packReadiness(packSnap)
                        if (ready.thin) {
                          const go = window.confirm(
                            'This pack looks thin (missing tagline, palette, or pins). Print anyway?'
                          )
                          if (!go) return
                        }
                        runExport('print')
                      }}
                    >
                      Print / Save as PDF
                    </button>
                    <p className="pack-export-hint">
                      <strong>Download</strong> matches on-screen preview (raster).{' '}
                      <strong>Print</strong> uses paper CSS — often sharper type;
                      choose “Save as PDF” in the print dialog.
                    </p>
                    {lastExportNote ? (
                      <p className="pack-export-confirm" role="status">
                        {lastExportNote}
                      </p>
                    ) : null}
                    <label className="pack-watermark-toggle">
                      <input
                        type="checkbox"
                        checked={hidePackWatermark}
                        onChange={(e) =>
                          setPref('hidePackWatermark', e.target.checked)
                        }
                      />
                      <span>Hide tool watermark (client handoff)</span>
                    </label>
                    <div className="finish-secondary-row">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={openExportPanel}
                      >
                        Preview full
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setActiveView('brand')}
                      >
                        Edit system
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setActiveView('flow')}
                      >
                        Work
                      </button>
                    </div>
                    <details className="finish-more-formats">
                      <summary>More formats &amp; backup</summary>
                      <div className="finish-more-formats-list">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => runExport('html')}
                        >
                          HTML
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => runExport('md')}
                        >
                          Markdown
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => runExport('json')}
                        >
                          Pack JSON
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={downloadDataBackup}
                        >
                          Full workspace backup
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">Start over or leave</div>
              <div className="finish-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    createNewProject()
                    notifyAction('New project', 'project_create', {
                      label: 'New project',
                    })
                    setActiveView('project')
                  }}
                >
                  New project
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
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

            <section className="panel panel-compact pack-path-map">
              <p className="list-heading">Your path</p>
              <ol className="finish-map">
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('project')}>
                    1 Project
                  </button>
                  {' — '}name the work
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('flow')}>
                    2 Work
                  </button>
                  {' — '}one step at a time
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('studio')}>
                    3 Board
                  </button>
                  {' — '}refs · star up to 6
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('brand')}>
                    4 System
                  </button>
                  {' — '}artboard · voice · type
                </li>
                <li>
                  <strong>5 Pack</strong>
                  {' — '}you are here · download
                </li>
              </ol>
            </section>
          </div>
        )}

        {/* ===== SETTINGS (lazy) ===== */}
        {activeView === 'settings' && (
          <Suspense fallback={<div className="panel panel-hint" style={{ margin: '1rem' }}>Loading settings…</div>}>
            <SettingsView
              setActiveView={setActiveView}
              CLOUD={CLOUD}
              accessName={accessName}
              syncState={syncState}
              syncError={syncError}
              pushWorkspace={pushWorkspace}
              exportAllData={exportAllData}
              setSyncState={setSyncState}
              setSyncError={setSyncError}
              handleSignOut={handleSignOut}
              theme={theme}
              toggleTheme={toggleTheme}
              reduceMotion={reduceMotion}
              soundEnabled={soundEnabled}
              showHowItWorks={showHowItWorks}
              showProgress={showProgress}
              queueCollapsed={queueCollapsed}
              forceBreaksEnabled={forceBreaksEnabled}
              setPref={setPref}
              bodyDoubling={bodyDoubling}
              toggleBodyDoubling={toggleBodyDoubling}
              flashToast={flashToast}
              forcedBreak={forcedBreak}
              endForcedBreak={endForcedBreak}
              prefs={prefs}
              pwCurrent={pwCurrent}
              setPwCurrent={setPwCurrent}
              pwNext={pwNext}
              setPwNext={setPwNext}
              changeAccessPassword={changeAccessPassword}
              downloadDataBackup={downloadDataBackup}
              handleImportBackup={handleImportBackup}
              importFileRef={importFileRef}
              clearToEmpty={clearToEmpty}
              clearAllData={clearAllData}
              setShowOnboarding={setShowOnboarding}
              loadSoftSignalDemo={loadSoftSignalDemo}
              versionLabel={versionLabel}
              APP_BUILD={APP_BUILD}
              APP_BUILD_DATE={APP_BUILD_DATE}
              STORAGE_EXPLAIN={STORAGE_EXPLAIN}
              notifyAction={notifyAction}
              createNewProject={createNewProject}
            />
          </Suspense>
        )}

{/* ===== PROJECTS ===== */}
        {activeView === 'project' && (
          <div className="project-view surface-desk">
            <div className="flow-top">
              <div>
                <h1 className="page-title">Project</h1>
                <p className="page-sub">
                  Name the work. Check readiness. Then open Work or Pack.
                </p>
              </div>
              <div className="finish-secondary-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveView('flow')}
                >
                  Open Work
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setActiveView('finish')}
                >
                  Open Pack
                </button>
              </div>
            </div>
            <section className="panel brand-section">
              <div className="brand-section-label">Readiness</div>
              {(() => {
                const checks = [
                  deskTasks.some((t) => !t.completed),
                  deskMood.some((m) => m.inPack),
                  !!activeProject?.tagline?.trim(),
                  (projectPalette || []).length >= 2,
                  !!activeProject?.brief?.trim(),
                ]
                const pct = Math.round(
                  (checks.filter(Boolean).length / checks.length) * 100
                )
                return (
                  <>
                    <div className="project-pack-meter" aria-label={`Pack readiness ${pct}%`}>
                      <div className="project-pack-meter-top">
                        <span>Pack readiness</span>
                        <strong>{pct}%</strong>
                      </div>
                      <div className="project-pack-meter-bar">
                        <div
                          className="project-pack-meter-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <ul className="pack-ready-list project-ready-list">
                      <li className={checks[0] ? 'is-ok' : 'is-miss'}>
                        {checks[0] ? (
                          <span>✓ Open Work step</span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() => setActiveView('flow')}
                          >
                            ○ Open Work step — fix
                          </button>
                        )}
                      </li>
                      <li className={checks[1] ? 'is-ok' : 'is-miss'}>
                        {checks[1] ? (
                          <span>
                            ✓ Starred pack pins (
                            {deskMood.filter((m) => m.inPack).length}/6)
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() => setActiveView('studio')}
                          >
                            ○ Star pack pins on Board — fix
                          </button>
                        )}
                      </li>
                      <li className={checks[2] ? 'is-ok' : 'is-miss'}>
                        {checks[2] ? (
                          <span>✓ Tagline</span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() => goSystemSection('essentials')}
                          >
                            ○ Tagline — fix
                          </button>
                        )}
                      </li>
                      <li className={checks[3] ? 'is-ok' : 'is-miss'}>
                        {checks[3] ? (
                          <span>✓ Palette</span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() => goSystemSection('colors')}
                          >
                            ○ Palette — fix
                          </button>
                        )}
                      </li>
                      <li className={checks[4] ? 'is-ok' : 'is-miss'}>
                        {checks[4] ? (
                          <span>✓ Brief / positioning</span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() => goSystemSection('essentials')}
                          >
                            ○ Brief / positioning — fix
                          </button>
                        )}
                      </li>
                    </ul>
                    <p className="panel-hint" style={{ marginBottom: '0.85rem' }}>
                      {completedCount}/{deskTasks.length || 0} steps done · brief
                      feeds System positioning.
                    </p>
                  </>
                )
              })()}
              {projectPills}
            </section>
            <section className="panel brand-section">
              <div className="brand-section-label">Active project</div>
              <div className="panel-head" style={{ marginBottom: '0.85rem' }}>
                <div>
                  <p className="panel-hint" style={{ marginBottom: '0.35rem' }}>
                    {deskTasks.filter((t) => !t.completed).length} open on desk
                  </p>
                </div>
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
                <label className="field-label">Brief / positioning</label>
                <p className="project-brief-readonly">
                  {activeProject?.brief?.trim()
                    ? activeProject.brief
                    : 'No brief yet — write it on System (Tagline tab).'}
                </p>
                <button
                  type="button"
                  className="text-link"
                  style={{ marginTop: '0.35rem' }}
                  onClick={() => goSystemSection('essentials')}
                >
                  Edit on System
                </button>
              </div>

              <div className="project-actions-row" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!activeProject || activeProjects.length < 2}
                  onClick={() => {
                    if (!activeProject) return
                    const r = archiveProject(activeProject.id)
                    if (r.ok) flashToast('Project archived')
                    else flashToast(r.error || 'Could not archive')
                  }}
                >
                  Archive project
                </button>
                {archivedProjects.length > 0 && (
                  <select
                    className="header-project-select"
                    defaultValue=""
                    onChange={(e) => {
                      const id = e.target.value
                      if (!id) return
                      unarchiveProject(Number(id) || id)
                      selectProject(Number(id) || id)
                      flashToast('Project restored')
                      e.target.value = ''
                    }}
                    aria-label="Restore archived project"
                  >
                    <option value="">Restore archived…</option>
                    {archivedProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
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

              <details className="project-quick-add" style={{ marginBottom: '1.15rem' }}>
                <summary className="text-link">Quick add to desk</summary>
                <div className="capture-row" style={{ marginTop: '0.5rem' }}>
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
              </details>

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
                  onClick={() => setActiveView('studio')}
                >
                  <span className="link-row-label">3 · Board</span>
                  <span className="link-row-meta">
                    {deskMood.filter((m) => m.inPack).length} pack pins
                  </span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('brand')}
                >
                  <span className="link-row-label">4 · System</span>
                  <span className="link-row-meta">Artboard &amp; roles</span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('finish')}
                >
                  <span className="link-row-label">5 · Pack</span>
                  <span className="link-row-meta">Preview &amp; download</span>
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
          className="export-overlay onboard-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboard-title"
          aria-describedby="onboard-desc"
        >
          <div className="export-panel onboard-panel">
            <div className="onboard-layout">
              <div className="onboard-copy">
                <p className="onboard-eyebrow">
                  {CLOUD ? 'Signed in · cloud desk' : 'Saved on this device'}
                </p>
                <h2 id="onboard-title" className="onboard-title">
                  One project. One step. Ship a pack.
                </h2>
                <p id="onboard-desc" className="view-lede onboard-lede">
                  Name the work and <strong>one shippable step</strong> for the
                  next 25 minutes. You leave with a brand pack PDF.
                </p>
                <ol className="onboard-path" aria-label="Your path">
                  {JOURNEY_STEPS.map((s) => (
                    <li key={s.id}>
                      <span className="onboard-path-num" aria-hidden="true">
                        {s.num}
                      </span>
                      <span className="onboard-path-label">{s.label}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="onboard-specimen" aria-hidden="true">
                <div className="login-pack-specimen onboard-pack-mini">
                  <div className="login-pack-cover">
                    <span className="login-pack-kicker">Brand pack</span>
                    <strong className="login-pack-name">Your project</strong>
                    <p className="login-pack-tagline">Direction you can ship</p>
                  </div>
                  <div className="login-pack-swatches">
                    <i style={{ background: '#1C1917' }} />
                    <i style={{ background: '#0F766E' }} />
                    <i style={{ background: '#D6D3D1' }} />
                    <i style={{ background: '#FAFAF9' }} />
                  </div>
                  <p className="login-pack-foot">PDF · end of the path</p>
                </div>
              </div>
            </div>
            <label className="onboard-label" htmlFor="onboard-name">
              Project name
              <input
                id="onboard-name"
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                placeholder="e.g. Soft Signal covers"
                className="onboard-input"
                autoFocus
                autoComplete="off"
              />
            </label>
            <label className="onboard-label" htmlFor="onboard-step">
              First step (do this now)
              <input
                id="onboard-step"
                value={onboardFirstStep}
                onChange={(e) => setOnboardFirstStep(e.target.value)}
                placeholder="e.g. Write 3 cover rules in one pass"
                className="onboard-input"
                autoComplete="off"
              />
            </label>
            <label className="onboard-label" htmlFor="onboard-brief">
              Brief <span className="onboard-optional">(optional)</span>
              <textarea
                id="onboard-brief"
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
        <div className="action-toast" role="status" aria-live="polite">
          {actionToast}
        </div>
      )}

      {recentUndo && (
        <button
          type="button"
          className="undo-chip"
          onClick={undoLastComplete}
        >
          Undo complete · {String(recentUndo.title || '').slice(0, 28)}
          {String(recentUndo.title || '').length > 28 ? '…' : ''}
        </button>
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

            <div className="export-artboard-wrap">
              <Suspense fallback={<div className="panel-hint">Loading artboard…</div>}>
            <BrandArtboard
                id="direction-sheet"
                project={{
                  name: exportPanel.projectName,
                  tagline: exportPanel.tagline,
                  brief: exportPanel.brief,
                  voice: exportPanel.voice,
                  typeHeading: exportPanel.typeHeading,
                  typeBody: exportPanel.typeBody,
                  logoDirection: exportPanel.logoDirection,
                  doUse: exportPanel.doUse,
                  dontUse: exportPanel.dontUse,
                  colorRoles: activeProject?.colorRoles,
                  logoImage: activeProject?.logoImage,
                }}
                palette={exportPanel.palette || projectPalette}
                pins={exportPanel.pins || []}
                editable={false}
              />
            </Suspense>
              <div className="export-open-work">
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
              </div>
            </div>

            <div className="export-panel-actions no-print">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => runExport('pdf')}
              >
                Download PDF
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setExportPanel(null)}
              >
                Close
              </button>
            </div>
            <details className="export-more-formats no-print">
              <summary>Other formats</summary>
              <div className="finish-more-formats-list">
                <button type="button" className="btn btn-secondary" onClick={() => runExport('html')}>HTML</button>
                <button type="button" className="btn btn-secondary" onClick={() => runExport('md')}>Markdown</button>
                <button type="button" className="btn btn-secondary" onClick={() => runExport('json')}>JSON</button>
                <button type="button" className="btn btn-secondary" onClick={() => runExport('print')}>Print</button>
              </div>
              <p className="panel-hint" style={{ marginTop: '0.5rem' }}>
                PDF is a raster preview export (matches on-screen pack).
              </p>
            </details>
          </div>
        </div>
      )}

      {/* Helper — presence coach, not a freeform chatbot */}
      {bodyDoubling && (
        <Suspense fallback={null}>
        <BuddyMate
          onClose={() => setBodyDoubling(false)}
          isFocusRunning={isFocusRunning}
          focusLeft={focusLeft}
          completedCount={completedCount}
          nextTaskTitle={nextTask?.title || ''}
          reduceMotion={reduceMotion}
          pulseWin={buddyWinPulse}
          showProgress={showProgress}
          helperQuiet={!!prefs.helperQuiet}
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
        </Suspense>
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
