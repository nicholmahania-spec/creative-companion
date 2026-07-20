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
const SparkView = lazy(() => import('./views/SparkView'))
const DetectiveSheet = lazy(() => import('./views/DetectiveSheet'))
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
import {
  pathStepHasContent,
  pathProgressSummary,
  pathMissingLabels,
} from './lib/journeyProgress'
import PathProgressPanel from './components/PathProgressPanel'
import {
  PROCESS_PHASES,
  REVIEW_QUESTIONS,
  getProcessPhase,
  processPhaseForView,
} from './lib/processGuide'
import {
  buildBrandPackSnapshot,
  captureSaveHandle,
  downloadBrandPackHtml,
  downloadBrandPackMarkdown,
  downloadBrandPackJson,
  downloadBrandPackPdf,
  downloadBrandPackPdfRaster,
  downloadWorkspaceBackup,
  packReadiness,
  packBriefMarkdown,
  preloadPdfEngine,
  printElementById,
  slugifyFilename,
} from './lib/exportFiles'
import {
  pinFaceStyle,
  pinImageUrl,
  readImageFilesAsPins,
} from './lib/moodPins'
import LogoLockup from './components/LogoLockup'
import EmptyIllustration from './components/EmptyIllustration'
import {
  LOCALES,
  normalizeLocale,
  t as i18nT,
  pathLabel,
  pathPlain,
  localeDir,
  isRtl,
} from './lib/i18n'
import { useModalFocus } from './lib/useModalFocus'
import { BRAND_KITS, getBrandKit } from './lib/brandKits'
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
  const sparkIndex = useAppStore((s) => s.sparkIndex)
  const addProject = useAppStore((s) => s.addProject)
  const setCurrentProject = useAppStore((s) => s.setCurrentProject)
  const updateProjectBrief = useAppStore((s) => s.updateProjectBrief)
  const updateDetective = useAppStore((s) => s.updateDetective)
  const applyDetectiveToBrief = useAppStore((s) => s.applyDetectiveToBrief)
  const updateDirection = useAppStore((s) => s.updateDirection)
  const setLogoDirection = useAppStore((s) => s.setLogoDirection)
  const updatePaletteColor = useAppStore((s) => s.updatePaletteColor)
  const addPaletteColor = useAppStore((s) => s.addPaletteColor)
  const removePaletteColor = useAppStore((s) => s.removePaletteColor)
  const setProjectPalette = useAppStore((s) => s.setProjectPalette)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const bumpDesignVersion = useAppStore((s) => s.bumpDesignVersion)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const setBodyDoubling = useAppStore((s) => s.setBodyDoubling)
  const toggleBodyDoubling = useAppStore((s) => s.toggleBodyDoubling)
  const setOnboarded = useAppStore((s) => s.setOnboarded)
  const addTask = useAppStore((s) => s.addTask)
  const toggleTask = useAppStore((s) => s.toggleTask)
  const updateTaskTitle = useAppStore((s) => s.updateTaskTitle)
  const updateTaskMeta = useAppStore((s) => s.updateTaskMeta)
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
  const oppositeSpark = useAppStore((s) => s.oppositeSpark)
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
  // activeView is restored from localStorage so refresh does not always dump on Sketch
  const [activeView, setActiveViewRaw] = useState(() => {
    try {
      const raw = localStorage.getItem('cc-active-view')
      const allowed = new Set([
        'flow',
        'project',
        'studio',
        'brand',
        'review',
        'finish',
        'spark',
        'insights',
        'calendar',
        'settings',
      ])
      // Legacy concept pipeline removed — never blank main
      if (raw === 'concept') return 'flow'
      if (raw && allowed.has(raw)) return raw
    } catch {
      /* private mode */
    }
    // First visit: Define (path 1)
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
  /** @type {null | 'print' | 'pdf'} */
  const [thinPackPrompt, setThinPackPrompt] = useState(null)
  /** @type {null | { kind: string, label: string, onConfirm: () => void }} */
  const [deskConfirm, setDeskConfirm] = useState(null)
  const [forceBreakConsentOpen, setForceBreakConsentOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const commandInputRef = useRef(null)
  const [resumeBanner, setResumeBanner] = useState(null)
  const [boardLightbox, setBoardLightbox] = useState(null)
  const [demoTour, setDemoTour] = useState(null)
  const [navDir, setNavDir] = useState('none')
  const prevJourneyIdx = useRef(0)
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

  const showHowItWorks = !!prefs.showHowItWorks
  const queueCollapsed = prefs.queueCollapsed !== false
  const soundEnabled = prefs.soundEnabled !== false
  const [osReduceMotion, setOsReduceMotion] = useState(() => {
    try {
      return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      )
    } catch {
      return false
    }
  })
  /** Settings pref OR OS prefers-reduced-motion — drives Lottie + hop */
  const reduceMotion = !!prefs.reduceMotion || osReduceMotion
  /** Pomodoro desk lock — default on; user can disable */
  const forceBreaksEnabled = prefs.forceBreaksEnabled !== false
  const showProgress = !!prefs.showProgress
  const hidePackWatermark = !!prefs.hidePackWatermark
  const locale = normalizeLocale(prefs.locale || 'en')
  // toastMode read inside flashToast
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

  const toastMode = prefs.toastMode === 'all' ? 'all' : 'quiet'

  /** @param {string} msg @param {{ micro?: boolean, important?: boolean }} [opts] */
  const flashToast = (msg, opts = {}) => {
    if (!msg) return
    // Quiet (default): skip micro successes; always show important/errors
    if (toastMode === 'quiet' && opts.micro && !opts.important) return
    setActionToast(msg)
    window.setTimeout(() => setActionToast(''), 3200)
  }

  /** Micro feedback — only when user enables “All toasts” */
  const flashMicro = (msg) => flashToast(msg, { micro: true })

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
    flashToast('Step complete', { important: true })
    setStepFocusKey((k) => k + 1)
  }

  const undoLastComplete = () => {
    if (!recentUndo?.id) return
    toggleTask(recentUndo.id)
    flashToast('Undone')
    setRecentUndo(null)
    setStepFocusKey((k) => k + 1)
  }

  const bumpDesignVersionIfV1 = useAppStore((s) => s.bumpDesignVersionIfV1)

  const applyBrandKit = useCallback(
    (kitId) => {
      const kit = getBrandKit(kitId)
      if (!kit) return
      setProjectPalette([...kit.palette])
      updateBrandField('voice', kit.voice)
      updateBrandField('typeHeading', kit.typeHeading)
      updateBrandField('typeBody', kit.typeBody)
      updateBrandField('doUse', kit.doUse)
      updateBrandField('dontUse', kit.dontUse)
      const bump = bumpDesignVersionIfV1()
      flashToast(
        bump?.bumped
          ? `Direction kit: ${kit.name} · version ${bump.version}`
          : `Direction kit: ${kit.name} — continue Research or open Design`
      )
    },
    [setProjectPalette, updateBrandField, bumpDesignVersionIfV1]
  )

  const commandActions = useMemo(() => {
    const acts = [
      {
        id: 'complete',
        label: 'Complete current step',
        hint: 'C',
        run: () => completeCurrentStep(),
        when: () => !!nextTask,
      },
      {
        id: 'capture',
        label: 'New capture on Sketch',
        hint: 'N',
        run: () => {
          setActiveView('flow')
          window.setTimeout(
            () => document.getElementById('desk-capture')?.focus?.(),
            60
          )
        },
      },
      {
        id: 'define',
        label: '1 Define',
        hint: '1',
        run: () => setActiveView('project'),
      },
      {
        id: 'research',
        label: '2 Research',
        hint: '2',
        run: () => setActiveView('studio'),
      },
      {
        id: 'ideate',
        label: '3 Ideate',
        hint: '3',
        run: () => setActiveView('spark'),
      },
      {
        id: 'sketch',
        label: '4 Sketch',
        hint: '4',
        run: () => setActiveView('flow'),
      },
      {
        id: 'design',
        label: '5 Design',
        hint: '5',
        run: () => setActiveView('brand'),
      },
      {
        id: 'review',
        label: '6 Review',
        hint: '6',
        run: () => setActiveView('review'),
      },
      {
        id: 'deliver',
        label: '7 Deliver',
        hint: '7',
        run: () => setActiveView('finish'),
      },
      {
        id: 'timer',
        label: 'Open Focus timer',
        hint: '',
        run: () => setActiveView('insights'),
      },
      {
        id: 'helper',
        label: bodyDoubling ? 'Turn Helper off' : 'Turn Helper on',
        hint: '',
        run: () => toggleBodyDoubling(),
      },
      {
        id: 'keys',
        label: 'Keyboard shortcuts',
        hint: '?',
        run: () => setShortcutsOpen(true),
      },
      {
        id: 'settings',
        label: 'Open Settings',
        hint: '',
        run: () => setActiveView('settings'),
      },
      {
        id: 'detective',
        label: 'Open Design Detective Sheet',
        hint: '',
        run: () => {
          setActiveView('project')
          window.setTimeout(
            () => document.getElementById('detective-goal')?.focus?.(),
            120
          )
        },
      },
      {
        id: 'bump-version',
        label: 'Bump design version',
        hint: '',
        run: () => {
          const r = bumpDesignVersion()
          if (r?.ok) flashMicro(`Version ${r.version}`)
          setActiveView('brand')
        },
      },
      {
        id: 'research-timer',
        label: 'Start 20-min research timer',
        hint: '',
        run: () => {
          if (forcedBreak) {
            flashToast('Break lock is open — finish it first')
            return
          }
          setSessionComplete(false)
          setFocusLeft(20 * 60)
          setPomodoroWorkStartedAt(Date.now())
          setIsFocusRunning(true)
          setActiveView('insights')
          notifyAction('Focus on', 'focus_start', {
            label: 'Research timer',
          })
          flashToast('20-minute research timer — stop when it ends')
        },
      },
    ]
    return acts.filter((a) => (a.when ? a.when() : true))
  }, [
    nextTask,
    bodyDoubling,
    setActiveView,
    toggleBodyDoubling,
    bumpDesignVersion,
    forcedBreak,
  ])

  const commandFiltered = useMemo(() => {
    const q = commandQuery.trim().toLowerCase()
    if (!q) return commandActions
    return commandActions.filter((a) => a.label.toLowerCase().includes(q))
  }, [commandActions, commandQuery])

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

  // Keyboard: ⌘K command palette · Esc dismiss overlays (priority: topmost first)
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(true)
        setCommandQuery('')
        setMoreOpen(false)
        window.requestAnimationFrame(() => commandInputRef.current?.focus?.())
        return
      }
      if (e.key !== 'Escape') return
      // Topmost dialogs first
      if (commandOpen) {
        e.preventDefault()
        setCommandOpen(false)
        setCommandQuery('')
        return
      }
      if (shortcutsOpen) {
        e.preventDefault()
        setShortcutsOpen(false)
        return
      }
      if (demoTour) {
        e.preventDefault()
        setDemoTour(null)
        return
      }
      if (deskConfirm) {
        e.preventDefault()
        setDeskConfirm(null)
        return
      }
      if (forceBreakConsentOpen) {
        e.preventDefault()
        setForceBreakConsentOpen(false)
        return
      }
      if (thinPackPrompt) {
        e.preventDefault()
        setThinPackPrompt(null)
        return
      }
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
    commandOpen,
    shortcutsOpen,
    demoTour,
    deskConfirm,
    forceBreakConsentOpen,
    thinPackPrompt,
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

    // First lockout: inline consent (no window.confirm)
    if (!prefs.forceBreaksConsented) {
      setPref('forceBreaksExplained', true)
      setIsFocusRunning(false)
      setSessionComplete(true)
      setPomodoroWorkStartedAt(null)
      markBreak()
      playBreakChime()
      setForceBreakConsentOpen(true)
      flashToast('Review forced break lockouts before the next cycle')
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

  // Focus traps — lightbox / export / breakdown / onboard
  const getLightboxRoot = useCallback(
    () => document.querySelector('.board-lightbox-overlay'),
    []
  )
  const getExportRoot = useCallback(
    () => document.querySelector('.export-overlay.no-print-hide, .export-overlay.portfolio-export, .export-overlay:not(.onboard-overlay)'),
    []
  )
  const getBreakdownRoot = useCallback(
    () =>
      document
        .querySelector('.export-overlay .breakdown-panel')
        ?.closest('.export-overlay') || null,
    []
  )
  const getOnboardRoot = useCallback(
    () => document.querySelector('.onboard-overlay'),
    []
  )
  useModalFocus(!!boardLightbox, getLightboxRoot, {
    initialSelector: '.board-lightbox-close',
  })
  useModalFocus(!!exportPanel && !showBreakdown, getExportRoot, {
    initialSelector: '.export-panel-header button, button',
  })
  useModalFocus(!!showBreakdown, getBreakdownRoot, {
    initialSelector: '.export-panel-header button, button',
  })
  useModalFocus(!!showOnboarding, getOnboardRoot, {
    initialSelector: '#onboard-name',
  })

  // Flow keys (when not typing): 1–7 path · C complete · N capture · U undo · ? help
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      const tag = t?.tagName?.toLowerCase?.() || ''
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        t?.isContentEditable
      ) {
        return
      }
      if (
        boardLightbox ||
        exportPanel ||
        showBreakdown ||
        showOnboarding ||
        demoTour ||
        deskConfirm ||
        forceBreakConsentOpen ||
        thinPackPrompt ||
        commandOpen
      ) {
        return
      }
      if (shortcutsOpen) {
        if (e.key === 'Escape' || e.key === '?' || e.key === '/') {
          e.preventDefault()
          setShortcutsOpen(false)
        }
        return
      }
      // ? or Shift+/ → shortcuts
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }
      const k = e.key.toLowerCase()
      // C — complete current Sketch step
      if (k === 'c') {
        if (!nextTask) return
        e.preventDefault()
        completeCurrentStep()
        return
      }
      // N — jump Sketch + focus capture
      if (k === 'n') {
        e.preventDefault()
        setActiveView('flow')
        window.setTimeout(() => {
          document.getElementById('desk-capture')?.focus?.()
        }, 60)
        return
      }
      // U — undo last complete (within undo window)
      if (k === 'u') {
        if (!recentUndo) return
        e.preventDefault()
        undoLastComplete()
        return
      }
      const n = Number(e.key)
      if (n < 1 || n > 7) return
      const step = JOURNEY_STEPS[n - 1]
      if (!step?.view) return
      e.preventDefault()
      setActiveView(step.view)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    boardLightbox,
    exportPanel,
    showBreakdown,
    showOnboarding,
    demoTour,
    deskConfirm,
    forceBreakConsentOpen,
    thinPackPrompt,
    commandOpen,
    shortcutsOpen,
    nextTask,
    recentUndo,
    setActiveView,
  ])

  // Once per browser session: quiet resume strip → last path view when possible
  useEffect(() => {
    if (!unlocked || !onboarded || cloudHydrating) return undefined
    try {
      if (sessionStorage.getItem('cc-resume-shown') === '1') return undefined
      sessionStorage.setItem('cc-resume-shown', '1')
    } catch {
      /* ignore */
    }
    const name = activeProject?.name
    const step = nextTask?.title
    if (!name && !step) return undefined
    let resumeView = null
    try {
      const raw = localStorage.getItem('cc-active-view')
      const pathViews = new Set([
        'project',
        'studio',
        'spark',
        'flow',
        'brand',
        'review',
        'finish',
      ])
      if (raw && pathViews.has(raw)) resumeView = raw
    } catch {
      /* ignore */
    }
    const pathLabelFor = {
      project: 'Define',
      studio: 'Research',
      spark: 'Ideate',
      flow: 'Sketch',
      brand: 'Design',
      review: 'Review',
      finish: 'Deliver',
    }
    setResumeBanner({
      name: name || 'Project',
      step: step || '',
      view: resumeView || (step ? 'flow' : 'project'),
      viewLabel: pathLabelFor[resumeView] || (step ? 'Sketch' : 'Define'),
    })
    return undefined
  }, [unlocked, onboarded, cloudHydrating, activeProject?.name, nextTask?.title])

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

  // Track OS prefers-reduced-motion (OR'd with Settings in reduceMotion)
  useEffect(() => {
    let mq
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    } catch {
      return undefined
    }
    const onChange = () => setOsReduceMotion(!!mq.matches)
    onChange()
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else if (mq.addListener) mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else if (mq.removeListener) mq.removeListener(onChange)
    }
  }, [])

  // Respect reduce-motion (Settings + OS) on <html>
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion
      ? 'true'
      : 'false'
  }, [reduceMotion])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = localeDir(locale)
  }, [locale])

  // Directional page choreography (path order)
  useEffect(() => {
    const order = [
      'project',
      'studio',
      'spark',
      'flow',
      'brand',
      'review',
      'finish',
    ]
    const idx = order.indexOf(activeView)
    if (idx < 0) {
      setNavDir('none')
      return
    }
    const prev = prevJourneyIdx.current
    if (idx > prev) setNavDir('forward')
    else if (idx < prev) setNavDir('back')
    else setNavDir('none')
    prevJourneyIdx.current = idx
  }, [activeView])

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

  // Path view → process phase (7-step alignment)
  useEffect(() => {
    const p = processPhaseForView(activeView)
    if (p) setProcessPhase(p.id)
  }, [activeView])

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
        'Write one design step you can finish in about 25 minutes'
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
      flashToast('Your desk is ready — define the goal, then Research')
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
    // Quiet first session — Helper stays off until user opts in (Tools or Settings)
    setBodyDoubling(false)
    // Start at Define — path step 1
    setActiveView('project')
    // Land attention on name / brief (define the work first)
    window.setTimeout(() => {
      const el =
        document.getElementById('project-name') ||
        document.getElementById('project-brief') ||
        document.getElementById('desk-capture')
      try {
        el?.focus?.({ preventScroll: false })
        el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
      } catch {
        /* ignore */
      }
    }, 80)
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
        flashToast(
          kind === 'backup' ? 'Backup saved' : 'Pack downloaded',
          { important: true }
        )
      }
    }

    // Capture File System Access handle WHILE we still have the user-gesture.
    // Critical for PDF (async jsPDF load) and helps Chrome when anchor download is blocked.
    const saveName =
      kind === 'pdf' || kind === 'pdf-preview'
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
      // Vector direction pack (text + swatches as PDF primitives)
      void preloadPdfEngine()
      flashToast('Building multi-page brand book PDF…', { important: true })
      void (async () => {
        const result = await downloadBrandPackPdf(pack, handlePromise, {
          hideWatermark: hidePackWatermark,
          mode: 'vector',
        })
        if (result.ok) {
          setLastExportNote(
            `Brand book PDF saved${
              result.pages ? ` · ${result.pages}p` : ''
            } · ${new Date().toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}`
          )
          finishOk('Brand book PDF')
        } else if (result.cancelled) flashToast('Save cancelled')
        else flashToast(result.error || 'PDF failed')
      })()
      return
    }

    if (kind === 'pdf-preview') {
      // Raster snapshot matching on-screen artboard (optional)
      const hasSystem = document.getElementById('system-artboard')
      if (!hasSystem && !exportPanel) openExportPanel()
      void preloadPdfEngine()
      flashToast('Capturing preview PDF…', { important: true })
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
        const result = await downloadBrandPackPdfRaster(pack, handlePromise, {
          element: live || null,
        })
        if (result.ok) {
          setLastExportNote(
            `Preview PDF saved · ${new Date().toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}`
          )
          finishOk('Preview PDF')
        } else if (result.cancelled) flashToast('Save cancelled')
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
  const runSoftSignalImport = async () => {
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
        setDemoTour({ step: 0 })
        notifyAction(
          'Soft Signal demo loaded · short tour open',
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

  const loadSoftSignalDemo = () => {
    setDeskConfirm({
      kind: 'demo',
      label:
        'Load Soft Signal demo? Replaces this workspace (projects, steps, pins). Export a backup first if it matters.',
      onConfirm: () => {
        setDeskConfirm(null)
        void runSoftSignalImport()
      },
    })
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
    const id = activeProject.id
    const name = activeProject.name
    setDeskConfirm({
      kind: 'delete-project',
      label: `${i18nT(locale, 'ui.deleteProjectConfirm')} (“${name}”)`,
      onConfirm: () => {
        const result = deleteProject(id)
        if (result.ok) {
          flashToast('Project deleted')
          setActiveView('project')
        } else {
          flashToast(result.error || 'Could not delete')
        }
        setDeskConfirm(null)
      },
    })
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
        'linear-gradient(135deg, #1C1917, #0F766E)',
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
      <div className={`app ${theme}${activeView === 'finish' ? ' is-pack-view' : ''}`}>
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
      }${activeView === 'finish' ? ' is-pack-view' : ''}`}
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
            <LogoLockup className="logo" locale={locale} reduceMotion={reduceMotion} />
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
                {i18nT(locale, 'ui.tools')}
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
                    <strong>{i18nT(locale, 'ui.timer')}</strong>
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
                    <strong>{i18nT(locale, 'ui.calendar')}</strong>
                    <span>{i18nT(locale, 'ui.deadlines')}</span>
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
                    <strong>Spark</strong>
                    <span>{i18nT(locale, 'ui.sparkHint')}</span>
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
                        flashMicro('Helper on')
                      } else {
                        flashMicro('Helper off')
                      }
                      setMoreOpen(false)
                    }}
                  >
                    <strong>
                      {bodyDoubling
                        ? i18nT(locale, 'ui.helperOff')
                        : i18nT(locale, 'ui.helperOn')}
                    </strong>
                    <span>{i18nT(locale, 'ui.helperHint')}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setMoreOpen(false)
                      setShortcutsOpen(true)
                    }}
                  >
                    <strong>Keyboard</strong>
                    <span>C complete · N capture · 1–7 path · ?</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setMoreOpen(false)
                      setCommandOpen(true)
                      setCommandQuery('')
                      window.requestAnimationFrame(() =>
                        commandInputRef.current?.focus?.()
                      )
                    }}
                  >
                    <strong>Command palette</strong>
                    <span>⌘K · jump anywhere</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setActiveView('settings')
                      setMoreOpen(false)
                    }}
                  >
                    <strong>{i18nT(locale, 'ui.settings')}</strong>
                    <span>Demo, data, Helper AI, about</span>
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
                    {i18nT(locale, 'ui.settings')}
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
                    {theme === 'warm' ? 'Switch to dark' : 'Switch to light'}
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
          aria-label={i18nT(locale, 'pathAria')}
        >
          <ol className="journey-bar-list">
            {JOURNEY_STEPS.map((step) => {
              const active = journeyActive === step.id
              const label = pathLabel(locale, step.id) || step.label
              const plain = pathPlain(locale, step.id) || step.plain
              const hasContent = pathStepHasContent(step.id, {
                project: activeProject,
                moodItems: deskMood,
                tasks: deskTasks,
                sparkIndex,
                palette: projectPalette,
              })
              return (
                <li key={step.id} className="journey-bar-item">
                  <button
                    type="button"
                    className={`journey-step${active ? ' is-active' : ''}${
                      hasContent && !active ? ' is-done' : ''
                    }`}
                    onClick={() => setActiveView(step.view)}
                    aria-current={active ? 'step' : undefined}
                    aria-label={`Step ${step.num}: ${label}. ${plain}${
                      hasContent ? ' Has content.' : ''
                    } Press ${step.num} to open.`}
                    title={`${plain} · key ${step.num}`}
                  >
                    <span className="journey-num" aria-hidden="true">
                      {step.num}
                    </span>
                    <span className="journey-label">{label}</span>
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

      <main className="main" id="main-content" tabIndex={-1} data-nav-dir={navDir}>
        {/* ===== WORK — one step owns the fold ===== */}
        {activeView === 'flow' && (
          <div className="flow-view surface-desk view-enter" data-nav-dir={navDir}>
            <div className="flow-top flow-top-compact">
              <div>
                <h1 className="page-title work-page-title">
                  {i18nT(locale, 'path.sketch')}
                </h1>
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
                <p className="page-sub" style={{ marginTop: '0.35rem' }}>
                  2–3 drafts with a one-line why. Low polish. Aim under ~2 hours
                  total — then Design.
                </p>
              </div>
            </div>

            {/* Current step owns the fold */}
            <section
              className="panel step-focus-panel surface-desk-hero"
              key={stepFocusKey}
              id="current-step"
            >
              <div className="step-focus-head">
                <div className="brand-section-label" style={{ margin: 0 }}>
                  {i18nT(locale, 'ui.currentStep')}
                </div>
              </div>
              {!nextTask ? (
                <div className="empty-state empty-state-craft">
                  <EmptyIllustration variant="desk" />
                  <p className="empty-state-title">
                    {doneTasks.length > 0
                      ? i18nT(locale, 'ui.queueClear')
                      : i18nT(locale, 'ui.noStepYet')}
                  </p>
                  <p className="empty-state-body">
                    {doneTasks.length > 0
                      ? i18nT(locale, 'ui.emptyStepBodyDone')
                      : i18nT(locale, 'ui.emptyStepBody')}
                  </p>
                  <p className="work-pack-destination">
                    {i18nT(locale, 'ui.packDest')}
                  </p>
                  <div className="step-focus-actions step-focus-actions-empty">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        document.getElementById('desk-capture')?.focus()
                      }
                    >
                      {i18nT(locale, 'ui.dumpIdea')}
                    </button>
                    {deskTasks.length === 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={openBreakdown}
                      >
                        {i18nT(locale, 'ui.breakMicro')}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="step-focus">
                  <div className="step-focus-meta">
                    <span className="task-badge">
                      {i18nT(locale, 'ui.doThisNow')}
                    </span>
                    <span className="task-meta">
                      {({ high: 'High', med: 'Medium', low: 'Low' }[
                        nextTask.energy || 'med'
                      ] || 'Medium')}{' '}
                      energy
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
                  <label className="field-label" htmlFor="step-why" style={{ marginTop: '0.65rem' }}>
                    Why it fits the goal (one line)
                  </label>
                  <input
                    id="step-why"
                    className="field-input"
                    value={nextTask.meta || ''}
                    onChange={(e) =>
                      updateTaskMeta(nextTask.id, e.target.value)
                    }
                    placeholder="e.g. Quiet hierarchy matches the detective goal"
                    aria-label="Why this draft fits the goal"
                  />
                  <div className="step-focus-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={completeCurrentStep}
                    >
                      {i18nT(locale, 'ui.completeStep')}
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
                            if (!processPhase) setProcessPhase('sketch')
                          }}
                          aria-expanded={processOpen}
                        >
                          Process checklist
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
                        const id = nextTask.id
                        setDeskConfirm({
                          kind: 'remove-step',
                          label:
                            'Remove this step from the desk? Cannot be undone.',
                          onConfirm: () => {
                            removeTask(id)
                            flashToast('Step removed')
                            setDeskConfirm(null)
                          },
                        })
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

            {/* A/B/C draft options from Ideate */}
            {(activeProject?.directions || []).some((d) =>
              String(d.title || '').trim()
            ) && (
              <section className="panel brand-section sketch-directions-panel">
                <div className="brand-section-label">Draft options (from Ideate)</div>
                <div className="sketch-dir-chips">
                  {(activeProject.directions || [])
                    .filter((d) => String(d.title || '').trim())
                    .map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className={`sketch-dir-chip${d.chosen ? ' is-chosen' : ''}`}
                        onClick={() => {
                          addTask({
                            id: Date.now() + Math.random(),
                            title: `Draft ${d.label}: ${d.title}`,
                            energy: 'med',
                            meta: d.note || 'Direction option',
                            completed: false,
                            seeded: false,
                            projectId:
                              activeProject?.id ||
                              useAppStore.getState().currentProjectId,
                            dueDate: '',
                          })
                          flashToast(`Queued draft ${d.label}`)
                        }}
                      >
                        {d.label}
                        {d.chosen ? ' ★' : ''} · {d.title}
                      </button>
                    ))}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '0.65rem' }}
                  onClick={() => {
                    const filled = (activeProject?.directions || []).filter(
                      (d) => String(d.title || '').trim()
                    )
                    if (!filled.length) {
                      flashToast('Capture A/B/C titles on Ideate first')
                      return
                    }
                    const base = Date.now()
                    filled.forEach((d, i) => {
                      addTask({
                        id: base + i + 1,
                        title: `Draft ${d.label}: ${d.title}`,
                        energy: 'med',
                        meta: d.note || 'Direction option',
                        completed: false,
                        seeded: false,
                        projectId:
                          activeProject?.id ||
                          useAppStore.getState().currentProjectId,
                        dueDate: '',
                      })
                    })
                    flashToast(`Queued ${filled.length} draft options`)
                  }}
                >
                  Queue all A/B/C drafts
                </button>
              </section>
            )}

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
                      <option value="high">High</option>
                      <option value="med">Medium</option>
                      <option value="low">Low</option>
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

            {/* Sketch process checklist only — path bar owns navigation */}
            <section
              className="process-rail process-rail-optional"
              aria-label="Sketch process checklist"
            >
              {(() => {
                const phase = getProcessPhase('sketch')
                if (!phase) return null
                return (
                  <div className="process-guide-panel">
                    <strong>
                      {phase.label} · {phase.title}
                    </strong>
                    <p className="process-guide-prompt">
                      {nextTask
                        ? `For “${String(nextTask.title).slice(0, 60)}”: ${
                            phase.prompt
                          }`
                        : phase.prompt}
                    </p>
                    <ul className="process-guide-checks">
                      {phase.checks.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )
              })()}
            </section>

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
                  {i18nT(locale, 'ui.howDeskWorks')}
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
              {journeyNext && (
                <>
                  <span className="work-below-sep" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    className="text-link work-path-next"
                    onClick={() => setActiveView(journeyNext.view)}
                  >
                    {journeyStep?.nextLabel ||
                      i18nT(locale, 'ui.goToBoard') ||
                      `Go to ${journeyNext.label}`}
                  </button>
                </>
              )}
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
                            {({ high: 'High', med: 'Medium', low: 'Low' }[
                              task.energy || 'med'
                            ] || 'Medium')}{' '}
                            energy
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
                          const id = t.id
                          setDeskConfirm({
                            kind: 'delete-done',
                            label: 'Delete this completed step permanently?',
                            onConfirm: () => {
                              removeTask(id)
                              setDeskConfirm(null)
                            },
                          })
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
          <div className="studio-view surface-wall view-enter" data-nav-dir={navDir}>
            <div className="flow-top">
              <div>
                <h1 className="page-title">
                  {i18nT(locale, 'path.research')}
                </h1>
                <p className="page-sub">
                  {i18nT(locale, 'ui.boardSub')}
                  {deskMood.filter((m) => m.inPack).length > 0
                    ? ` · ${deskMood.filter((m) => m.inPack).length}/6 in pack`
                    : ''}
                </p>
              </div>
              <span className="panel-count">{deskMood.length} pins</span>
            </div>

            <section className="panel brand-section process-tip-panel">
              <div className="brand-section-label">Curious spy checklist</div>
              <p className="panel-hint" style={{ marginTop: 0 }}>
                {getProcessPhase('research')?.prompt}
              </p>
              <ul className="process-guide-checks" style={{ marginBottom: '0.75rem' }}>
                {(getProcessPhase('research')?.checks || []).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <div className="finish-secondary-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (forcedBreak) {
                      flashToast('Break lock is open — finish it first')
                      return
                    }
                    setSessionComplete(false)
                    setFocusLeft(20 * 60)
                    setPomodoroWorkStartedAt(Date.now())
                    setIsFocusRunning(true)
                    setActiveView('insights')
                    notifyAction('Focus on', 'focus_start', {
                      label: 'Research timer',
                    })
                    flashToast('20-minute research timer — stop when it ends')
                  }}
                >
                  Start 20-min research timer
                </button>
                <span className="panel-hint" style={{ margin: 0 }}>
                  Stop before the rabbit hole.
                </span>
              </div>
            </section>

            {/* Wall first — board is the stage */}
            <section className="panel brand-section board-wall-panel">
              <div className="board-wall-head">
                <div className="brand-section-label" style={{ margin: 0 }}>
                  Refs · {deskMood.length}
                </div>
                {deskMood.length > 0 && (
                  <span className="panel-hint board-pack-count" style={{ margin: 0 }}>
                    Leave-behind {deskMood.filter((m) => m.inPack).length}/6
                    {deskMood.filter((m) => m.inPack).length >= 6
                      ? ' · full'
                      : ''}
                  </span>
                )}
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
                        flashMicro('Ref order updated')
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
                    <EmptyIllustration variant="board" />
                    <p className="empty-state-title">
                      {i18nT(locale, 'ui.noPinsYet')}
                    </p>
                    <p className="empty-state-body">
                      {i18nT(locale, 'ui.emptyPinsBody')}
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
                                ? { backgroundColor: '#e7e5e4' }
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
                          <div className="mood-pin-tools-row">
                            <button
                              type="button"
                              className={`mood-pin-star${item.inPack ? ' is-on' : ''}${item.packHero ? ' is-hero' : ''}`}
                              title={
                                item.inPack
                                  ? 'Remove from leave-behind'
                                  : 'Include in leave-behind (max 6)'
                              }
                              aria-pressed={!!item.inPack}
                              onClick={() => {
                                const r = toggleMoodPinInPack(item.id)
                                if (!r.ok)
                                  flashToast(
                                    r.error || 'Leave-behind full (6 pins max)'
                                  )
                                else
                                  flashMicro(
                                    r.inPack
                                      ? 'On leave-behind'
                                      : 'Removed from leave-behind'
                                  )
                              }}
                            >
                              {item.inPack ? '★ Leave-behind' : '☆ Leave-behind'}
                            </button>
                            <details className="mood-pin-more">
                              <summary
                                className="mood-pin-more-sum"
                                aria-label="More pin actions"
                              >
                                ⋯
                              </summary>
                              <div className="mood-pin-more-menu">
                                {item.inPack && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-ghost mood-pin-order"
                                      onClick={() => movePackPin(item.id, 'up')}
                                    >
                                      ↑ Earlier in pack
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-ghost mood-pin-order"
                                      onClick={() =>
                                        movePackPin(item.id, 'down')
                                      }
                                    >
                                      ↓ Later in pack
                                    </button>
                                    <button
                                      type="button"
                                      className={`btn btn-ghost mood-pin-order${item.packHero ? ' is-on' : ''}`}
                                      onClick={() => {
                                        const r = setPackHeroPin(item.id)
                                        if (!r.ok)
                                          flashToast(
                                            r.error || 'Could not set hero'
                                          )
                                        else flashMicro('Hero pin set')
                                      }}
                                    >
                                      Hero pin
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-ghost mood-pin-remove"
                                  onClick={() => removeMoodPin(item.id)}
                                >
                                  Remove pin
                                </button>
                              </div>
                            </details>
                          </div>
                          <input
                            className="mood-pin-note-input"
                            value={item.note || ''}
                            onChange={(e) =>
                              updateMoodPinNote(item.id, e.target.value)
                            }
                            placeholder="Caption…"
                            aria-label="Pin note"
                          />
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
              <p className="panel-hint board-drop-hint">
                Drop images here · drag pins to reorder
              </p>
            </section>

            {/* Compact add — below the wall */}
            <section className="panel brand-section board-add-compact">
              <div className="board-add-toolbar">
                <label className="btn btn-primary board-upload-btn">
                  Upload images
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
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm${
                    boardAddMode === 'url' ? ' is-on' : ''
                  }`}
                  onClick={() =>
                    setBoardAddMode((m) => (m === 'url' ? null : 'url'))
                  }
                >
                  URL
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm${
                    boardAddMode === 'note' ? ' is-on' : ''
                  }`}
                  onClick={() =>
                    setBoardAddMode((m) => (m === 'note' ? null : 'note'))
                  }
                >
                  Note
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveView('spark')}
                >
                  Spark
                </button>
                {deskMood.length > 0 && (
                  <details className="board-pack-bulk">
                    <summary className="text-link">Leave-behind tools</summary>
                    <div className="board-pack-bulk-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          const open = deskMood.filter((m) => !m.inPack)
                          let added = 0
                          for (const p of open) {
                            if (
                              deskMood.filter((m) => m.inPack).length + added >=
                              6
                            )
                              break
                            const r = toggleMoodPinInPack(p.id)
                            if (r.ok && r.inPack) added++
                          }
                          if (!added) {
                            flashToast(
                              deskMood.filter((m) => m.inPack).length >= 6
                                ? 'Leave-behind full (6 max)'
                                : 'Nothing to star'
                            )
                          }
                        }}
                      >
                        Star next
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          deskMood
                            .filter((m) => m.inPack)
                            .forEach((p) => toggleMoodPinInPack(p.id))
                        }}
                      >
                        Clear stars
                      </button>
                    </div>
                  </details>
                )}
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
            </section>

            <p className="work-below-tools">
              <button
                type="button"
                className="text-link"
                onClick={() => setActiveView('project')}
              >
                ← Define
              </button>
              <span aria-hidden="true"> · </span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginLeft: '0.35rem' }}
                onClick={() => setActiveView('spark')}
              >
                {i18nT(locale, 'ui.openIdeate') || 'Go to Ideate'}
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
                autoFocus
                onClick={() => setBoardLightbox(null)}
              >
                Close
              </button>
              {pinImageUrl(boardLightbox) ? (
                <img
                  className="board-lightbox-visual board-lightbox-img"
                  src={pinImageUrl(boardLightbox)}
                  alt={boardLightbox.note || 'Research pin'}
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
                    if (!r.ok)
                      flashToast(r.error || 'Leave-behind full (6 max)')
                    else {
                      setBoardLightbox((p) =>
                        p ? { ...p, inPack: r.inPack } : null
                      )
                    }
                  }}
                >
                  {boardLightbox.inPack
                    ? '★ On leave-behind'
                    : '☆ Add to leave-behind'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== SPARK (lazy) ===== */}
        {activeView === 'spark' && (
          <Suspense fallback={<div className="panel panel-hint" style={{ margin: '1rem' }}>Loading…</div>}>
            <SparkView
              setActiveView={setActiveView}
              nextTask={nextTask}
              currentSpark={currentSpark}
              nextSpark={nextSpark}
              oppositeSpark={oppositeSpark}
              addMoodPin={addMoodPin}
              projectPalette={projectPalette}
              notifyAction={notifyAction}
              directions={activeProject?.directions}
              updateDirection={updateDirection}
              sparkIndex={sparkIndex || 0}
            />
          </Suspense>
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
              openForceBreakConsent={() => setForceBreakConsentOpen(true)}
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

        {/* Concept pipeline removed from UI — Research + Design path only */}

        {/* ===== BRAND IDENTITY TEMPLATE ===== */}
        {activeView === 'brand' && (
          <div className="brand-layout surface-document system-view view-enter" data-nav-dir={navDir}>
            <div className="brand-template-top">
              <div>
                <h1 className="page-title">
                  {i18nT(locale, 'path.design')}
                </h1>
                <p className="page-sub">
                  {i18nT(locale, 'ui.systemSub')}{' '}
                  <strong>{activeProject?.name || 'this project'}</strong>
                  {' · '}
                  pack pins {deskMood.filter((m) => m.inPack).length}/6
                </p>
              </div>
              <div className="brand-template-actions">
                <label className="field-label design-version-label" htmlFor="design-version">
                  Version
                  <input
                    id="design-version"
                    className="field-input design-version-input"
                    value={activeProject?.designVersion || 'v1'}
                    onChange={(e) =>
                      updateBrandField('designVersion', e.target.value)
                    }
                    aria-label="Design version"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title="Bump before a big change (v1 → v2)"
                  onClick={() => {
                    const r = bumpDesignVersion()
                    if (r?.ok) flashMicro(`Version ${r.version}`)
                  }}
                >
                  Bump
                </button>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('flow')}
                >
                  ← Sketch
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Encourage version discipline before review
                    const cur = String(
                      activeProject?.designVersion || 'v1'
                    ).trim()
                    if (/^v?1$/i.test(cur) || cur === '') {
                      updateBrandField('designVersion', 'v2')
                      flashToast('Version → v2 · heading to Review')
                    }
                    setActiveView('review')
                  }}
                >
                  {i18nT(locale, 'ui.openReview') || 'Go to Review'}
                </button>
              </div>
            </div>

            <section className="panel brand-section process-tip-panel">
              <div className="brand-section-label">Design checklist</div>
              <p className="panel-hint" style={{ marginTop: 0 }}>
                {getProcessPhase('design')?.prompt}
              </p>
              <ul className="process-guide-checks">
                {(getProcessPhase('design')?.checks || []).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="panel-hint" style={{ marginBottom: 0 }}>
                Bump version before big changes. Then Review with specific
                questions — not “do you like it?”
              </p>
            </section>

            {/* ARTBOARD — sticky preview on wide screens */}
            <div
              className="system-artboard-sticky"
              tabIndex={0}
              role="region"
              aria-label="Live pack artboard preview"
            >
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
            </div>

            <p className="system-edit-label">Edit</p>
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
                  onClick={() => setBrandEditSection(id)}
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
                        flashMicro(`${brandRoleAssign} → ${n}`)
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
                    const bump = bumpDesignVersionIfV1()
                    flashMicro(
                      bump?.bumped
                        ? `Type · ${pair.label} · ${bump.version}`
                        : `Type · ${pair.label}`
                    )
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

            {/* 05 Logo lockup suite */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'logo'}
            >
              <div className="brand-section-label">Logo lockups</div>
              <p className="panel-hint" style={{ marginBottom: '0.75rem' }}>
                Mark image, wordmark, clearspace — ships in the multi-page brand
                book PDF.
              </p>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-wordmark">
                  Wordmark text
                </label>
                <input
                  id="logo-wordmark"
                  className="field-input"
                  value={activeProject?.logoWordmark || ''}
                  onChange={(e) =>
                    updateBrandField('logoWordmark', e.target.value)
                  }
                  placeholder={
                    activeProject?.name
                      ? `Defaults to “${activeProject.name}”`
                      : 'Brand wordmark'
                  }
                />
              </div>
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
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-clearspace">
                  Clearspace &amp; min size
                </label>
                <textarea
                  id="logo-clearspace"
                  className="field-input"
                  rows={2}
                  value={activeProject?.logoClearspace || ''}
                  onChange={(e) =>
                    updateBrandField('logoClearspace', e.target.value)
                  }
                  placeholder="e.g. Clearspace = ½ mark height · min 24px digital / 0.5&quot; print"
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
                        const bump = bumpDesignVersionIfV1()
                        flashMicro(
                          bump?.bumped
                            ? `Mark image · ${bump.version}`
                            : 'Mark image added'
                        )
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
                      flashMicro('Mark removed')
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
              <div className="brand-section-label">
                Leave-behind pins (starred on Research)
              </div>
              {(() => {
                const packPins = deskMood.filter((m) => m.inPack)
                if (packPins.length === 0) {
                  return (
                <div className="brand-mood-empty">
                  <p className="empty-state-body" style={{ margin: 0 }}>
                    Star pins on Research with ★ (max 6). Only starred pins
                    appear here and in your leave-behind PDF.
                  </p>
                  <div className="finish-secondary-row" style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveView('studio')}
                    >
                      Open Research
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
                Research
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveView('review')}
              >
                {i18nT(locale, 'ui.openReview') || 'Go to Review'}
              </button>
            </div>
          </div>
        )}

        {/* ===== REVIEW — step 6 ===== */}
        {activeView === 'review' && (
          <div className="review-view surface-desk view-enter" data-nav-dir={navDir}>
            <div className="flow-top">
              <div>
                <h1 className="page-title">{i18nT(locale, 'path.review')}</h1>
                <p className="page-sub">
                  Show the work. Ask if it feels right. Revise for the goal — not
                  every opinion.
                </p>
              </div>
              <div className="finish-secondary-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveView('brand')}
                >
                  Back to Design
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveView('finish')}
                >
                  {i18nT(locale, 'ui.openPack') || 'Go to Deliver'}
                </button>
              </div>
            </div>
            {(() => {
              const ctx = {
                project: activeProject,
                moodItems: deskMood,
                tasks: deskTasks,
                sparkIndex,
                palette: projectPalette,
              }
              const rows = pathProgressSummary(JOURNEY_STEPS, ctx)
              const doneN = rows.filter((p) => p.done).length
              const missing = pathMissingLabels(JOURNEY_STEPS, ctx, (id) =>
                pathLabel(locale, id)
              )
              return (
                <PathProgressPanel
                  steps={JOURNEY_STEPS}
                  rows={rows}
                  doneN={doneN}
                  missing={missing}
                  onOpenStep={setActiveView}
                  labelForId={(id) => pathLabel(locale, id)}
                  hint="Review with content in earlier steps — then Deliver."
                />
              )
            })()}
            <section className="panel brand-section">
              <div className="brand-section-label">Leave-behind preview</div>
              <p className="panel-hint" style={{ marginTop: 0 }}>
                What a reviewer sees — same sheet as Deliver.
              </p>
              <div
                className="pack-preview-thumb pack-preview-artboard review-pack-preview"
                tabIndex={0}
                role="region"
                aria-label="Review pack preview — scroll for full sheet"
              >
                <Suspense fallback={<div className="panel-hint">Loading artboard…</div>}>
                  <BrandArtboard
                    id="review-preview-artboard"
                    project={activeProject || {}}
                    palette={projectPalette}
                    pins={deskMood.filter((m) => m.inPack)}
                    editable={false}
                    hideWatermark={hidePackWatermark}
                  />
                </Suspense>
                <p className="pack-preview-scroll-hint">Scroll preview for full sheet</p>
              </div>
            </section>
            <section className="panel brand-section">
              <div className="brand-section-label">Review checklist</div>
              <ul className="process-guide-checks review-checks">
                {(getProcessPhase('review')?.checks || []).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="process-guide-prompt">
                {getProcessPhase('review')?.prompt}
              </p>
            </section>
            <section className="panel brand-section">
              <div className="brand-section-label">Leave-behind readiness</div>
              {(() => {
                const packSnap = buildCurrentBrandPack()
                const ready = packReadiness(packSnap)
                return (
                  <>
                    <p className="panel-hint">
                      <strong>
                        {ready.okCount}/{ready.checks.length}
                      </strong>{' '}
                      ready
                      {ready.thin ? ' · still thin for client handoff' : ''}
                    </p>
                    <ul className="pack-ready-list">
                      {ready.checks.map((c) => (
                        <li
                          key={c.id}
                          className={c.ok ? 'is-ok' : 'is-miss'}
                        >
                          {c.ok ? (
                            <span>✓ {c.label}</span>
                          ) : (
                            <button
                              type="button"
                              className="pack-ready-fix"
                              onClick={() => {
                                if (c.view === 'studio') setActiveView('studio')
                                else if (c.view === 'brand')
                                  goSystemSection(c.section || 'essentials')
                                else if (c.view === 'project') {
                                  setActiveView('project')
                                  window.setTimeout(
                                    () =>
                                      document
                                        .getElementById('detective-goal')
                                        ?.focus(),
                                    100
                                  )
                                } else if (c.view) setActiveView(c.view)
                              }}
                            >
                              ○ {c.label} — fix
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )
              })()}
            </section>
            <section className="panel brand-section">
              <div className="brand-section-label">Ask for feedback</div>
              <p className="panel-hint" style={{ marginTop: 0 }}>
                Specific beats “do you like it?” Feedback is not failure — capture
                it, then keep only what serves the goal.
              </p>
              <div className="review-question-chips">
                {REVIEW_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(q)
                        flashToast('Question copied')
                      } catch {
                        flashMicro(q.slice(0, 40))
                      }
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="field-block" style={{ marginTop: '0.85rem' }}>
                <label className="field-label" htmlFor="feedback-notes">
                  Feedback notes
                </label>
                <textarea
                  id="feedback-notes"
                  className="field-input"
                  rows={4}
                  value={activeProject?.feedbackNotes || ''}
                  onChange={(e) =>
                    updateBrandField('feedbackNotes', e.target.value)
                  }
                  placeholder="What they said · what you’ll change · what you’ll ignore (taste noise)."
                />
              </div>
              <div className="finish-secondary-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (!bodyDoubling) toggleBodyDoubling()
                    flashToast('Helper on — open Critique')
                  }}
                >
                  Open Helper for Critique
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={async () => {
                    try {
                      const md = packBriefMarkdown(buildCurrentBrandPack())
                      await navigator.clipboard.writeText(md)
                      flashToast('Brief copied — send to a reviewer')
                    } catch {
                      flashToast('Could not copy brief')
                    }
                  }}
                >
                  Copy brief to share
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===== DELIVER — step 7 ===== */}
        {activeView === 'finish' && (
          <div className="finish-view surface-document pack-view view-enter" data-nav-dir={navDir}>
            <div className="flow-top">
              <div>
                <p className="pack-eyebrow">{i18nT(locale, 'ui.packEyebrow')}</p>
                <h1 className="page-title page-title-display">
                  {i18nT(locale, 'path.deliver')}
                </h1>
                <p className="page-sub">
                  {activeProject?.name || 'Your project'} · {i18nT(locale, 'ui.packSub')}
                </p>
              </div>
            </div>

            {(() => {
              const ctx = {
                project: activeProject,
                moodItems: deskMood,
                tasks: deskTasks,
                sparkIndex,
                palette: projectPalette,
              }
              const rows = pathProgressSummary(JOURNEY_STEPS, ctx)
              const doneN = rows.filter((p) => p.done).length
              const missing = pathMissingLabels(JOURNEY_STEPS, ctx, (id) =>
                pathLabel(locale, id)
              )
              return (
                <PathProgressPanel
                  steps={JOURNEY_STEPS}
                  rows={rows}
                  doneN={doneN}
                  missing={missing}
                  onOpenStep={setActiveView}
                  labelForId={(id) => pathLabel(locale, id)}
                  hint="Tap any step to fill gaps before the brand book PDF."
                />
              )
            })()}

            <section className="panel brand-section finish-hero-panel pack-hero">
              <div className="pack-layout">
                <div
                  className="pack-preview-thumb pack-preview-artboard"
                  tabIndex={0}
                  role="region"
                  aria-label="Leave-behind preview — scroll for full sheet"
                >
                  <Suspense fallback={<div className="panel-hint">Loading artboard…</div>}>
                    <BrandArtboard
                      id="pack-preview-artboard"
                      project={activeProject || {}}
                      palette={projectPalette}
                      pins={deskMood.filter((m) => m.inPack)}
                      editable={false}
                      hideWatermark={hidePackWatermark}
                    />
                  </Suspense>
                  <p className="pack-preview-scroll-hint">Scroll preview for full sheet</p>
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
                                    else if (c.view === 'project') {
                                      setActiveView('project')
                                      window.setTimeout(
                                        () =>
                                          document
                                            .getElementById('detective-goal')
                                            ?.focus(),
                                        100
                                      )
                                    } else if (c.id === 'handoff') {
                                      setActiveView('finish')
                                      window.setTimeout(
                                        () =>
                                          document
                                            .getElementById('handoff-note')
                                            ?.focus(),
                                        100
                                      )
                                    } else if (c.id === 'learnings') {
                                      setActiveView('finish')
                                      window.setTimeout(
                                        () =>
                                          document
                                            .getElementById('learnings-note')
                                            ?.focus(),
                                        100
                                      )
                                    } else if (c.view) setActiveView(c.view)
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
                            ? ` (${i18nT(locale, 'ui.starPinsHint')})`
                            : ''}
                        </p>
                        {ready.thin && (
                          <div className="pack-thin-block">
                            <EmptyIllustration variant="pack" className="pack-thin-illu" />
                            <p className="pack-thin-warning" role="status">
                              {i18nT(locale, 'ui.thinPack')}
                            </p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                  <div className="finish-actions pack-primary-stack">
                    <p className="pack-client-kicker">{i18nT(locale, 'ui.clientHandoff')}</p>
                    {thinPackPrompt && (
                      <div
                        className="thin-pack-prompt"
                        role="alertdialog"
                        aria-labelledby="thin-pack-title"
                      >
                        <p id="thin-pack-title" className="thin-pack-prompt-body">
                          {i18nT(locale, 'ui.thinPackBanner')}
                        </p>
                        <div className="thin-pack-prompt-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              const kind = thinPackPrompt
                              setThinPackPrompt(null)
                              runExport(kind === 'print' ? 'print' : 'pdf')
                            }}
                          >
                            {thinPackPrompt === 'print'
                              ? i18nT(locale, 'ui.continuePrint')
                              : i18nT(locale, 'ui.continueDownload')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setThinPackPrompt(null)}
                          >
                            {i18nT(locale, 'ui.cancel')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setThinPackPrompt(null)
                              setActiveView('studio')
                            }}
                          >
                            Research
                          </button>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary pack-print-btn"
                      onClick={() => {
                        const packSnap = buildCurrentBrandPack()
                        const ready = packReadiness(packSnap)
                        if (ready.thin) {
                          setThinPackPrompt('print')
                          return
                        }
                        runExport('print')
                      }}
                    >
                      {i18nT(locale, 'ui.printSavePdf')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary pack-download-btn"
                      onClick={() => {
                        const packSnap = buildCurrentBrandPack()
                        const ready = packReadiness(packSnap)
                        if (ready.thin) {
                          setThinPackPrompt('pdf')
                          return
                        }
                        runExport('pdf')
                      }}
                    >
                      {i18nT(locale, 'ui.downloadVectorPdf')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost pack-copy-brief"
                      onClick={async () => {
                        try {
                          const packSnap = buildCurrentBrandPack()
                          const md = packBriefMarkdown(packSnap)
                          await navigator.clipboard.writeText(md)
                          flashToast('Leave-behind brief copied')
                          setLastExportNote('Brief copied to clipboard')
                        } catch {
                          flashToast('Could not copy — try Download instead')
                        }
                      }}
                    >
                      Copy brief
                    </button>
                    <p className="pack-export-hint">
                      {i18nT(locale, 'ui.packHint')}
                    </p>
                    {lastExportNote ? (
                      <p className="pack-export-confirm" role="status">
                        {lastExportNote}
                      </p>
                    ) : null}
                    <div className="process-tip-panel" style={{ marginTop: '0.85rem' }}>
                      <div className="brand-section-label">Deliver checklist</div>
                      <ul className="process-guide-checks">
                        {(getProcessPhase('deliver')?.checks || []).map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="field-block" style={{ marginTop: '0.85rem' }}>
                      <label className="field-label" htmlFor="handoff-note">
                        Handoff note (for the client)
                      </label>
                      <textarea
                        id="handoff-note"
                        className="field-input"
                        rows={2}
                        value={activeProject?.handoffNote || ''}
                        onChange={(e) =>
                          updateBrandField('handoffNote', e.target.value)
                        }
                        placeholder="What’s included, how to use the mark, contact for questions…"
                      />
                    </div>
                    <div className="field-block" style={{ marginTop: '0.65rem' }}>
                      <label className="field-label" htmlFor="learnings-note">
                        What I learned
                      </label>
                      <textarea
                        id="learnings-note"
                        className="field-input"
                        rows={3}
                        value={activeProject?.learnings || ''}
                        onChange={(e) =>
                          updateBrandField('learnings', e.target.value)
                        }
                        placeholder="What worked? What felt like me? What to improve next time? (Notes only — not a media library.)"
                      />
                    </div>
                    <p className="panel-hint" style={{ marginTop: '0.65rem' }}>
                      Direction leave-behind &amp; lockups — not a full design
                      tool or Figma replacement.
                    </p>
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
                    <details className="pack-more-actions">
                      <summary className="text-link pack-more-summary">
                        More actions
                      </summary>
                      <div className="finish-secondary-row pack-more-row">
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
                        Edit Design
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setActiveView('flow')}
                      >
                        Sketch
                      </button>
                      </div>
                    </details>
                    <details className="finish-more-formats">
                      <summary>More formats &amp; backup</summary>
                      <div className="finish-more-formats-list">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => runExport('pdf-preview')}
                        >
                          Preview PDF (raster)
                        </button>
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

            <details className="pack-leave-details panel brand-section">
              <summary className="brand-section-label pack-leave-summary">
                Leave desk
              </summary>
              <div className="finish-actions" style={{ marginTop: '0.75rem' }}>
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
              <p className="panel-hint" style={{ marginTop: '0.65rem' }}>
                Log out ends this session. Download a backup first if you need a
                file on your computer.
              </p>
            </details>

            <section className="panel panel-compact pack-path-map">
              <p className="list-heading">Your path</p>
              <ol className="finish-map">
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('project')}>
                    1 Define
                  </button>
                  {' — '}goal · brief · who
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('studio')}>
                    2 Research
                  </button>
                  {' — '}refs · star up to 6
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('spark')}>
                    3 Ideate
                  </button>
                  {' — '}many directions
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('flow')}>
                    4 Sketch
                  </button>
                  {' — '}one step at a time
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('brand')}>
                    5 Design
                  </button>
                  {' — '}artboard · voice · type
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('review')}>
                    6 Review
                  </button>
                  {' — '}critique · readiness
                </li>
                <li>
                  <strong>7 Deliver</strong>
                  {' — '}you are here · vector PDF
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
              locale={locale}
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
              requestConfirm={(label, onConfirm) =>
                setDeskConfirm({
                  kind: 'settings',
                  label,
                  onConfirm: () => {
                    onConfirm?.()
                    setDeskConfirm(null)
                  },
                })
              }
              openForceBreakConsent={() => setForceBreakConsentOpen(true)}
            />
          </Suspense>
        )}

{/* ===== PROJECTS ===== */}
        {activeView === 'project' && (
          <div className="project-view surface-desk view-enter" data-nav-dir={navDir}>
            <div className="flow-top">
              <div>
                <h1 className="page-title">
                  {i18nT(locale, 'path.define')}
                </h1>
                <p className="page-sub">
                  {i18nT(locale, 'ui.projectSub')}
                </p>
              </div>
              <div className="finish-secondary-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveView('studio')}
                >
                  {i18nT(locale, 'ui.openWork') || 'Go to Research'}
                </button>
              </div>
            </div>

            <Suspense fallback={null}>
              <DetectiveSheet
                detective={activeProject?.detective}
                updateDetective={updateDetective}
                applyDetectiveToBrief={applyDetectiveToBrief}
                flashToast={flashToast}
              />
            </Suspense>

            <section className="panel brand-section brand-kits-panel">
              <div className="brand-section-label">Direction kits</div>
              <p className="panel-hint" style={{ marginTop: 0 }}>
                Seed palette, voice, type, and do/don&apos;t — then polish on Design.
              </p>
              <div className="brand-kits-grid">
                {BRAND_KITS.map((kit) => (
                  <button
                    key={kit.id}
                    type="button"
                    className="brand-kit-card"
                    onClick={() => applyBrandKit(kit.id)}
                  >
                    <span className="brand-kit-swatches" aria-hidden="true">
                      {kit.palette.slice(0, 4).map((c) => (
                        <i key={c} style={{ background: c }} />
                      ))}
                    </span>
                    <strong className="brand-kit-name">{kit.name}</strong>
                    <span className="brand-kit-blurb">{kit.blurb}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel brand-section">
              <div className="brand-section-label">
                {i18nT(locale, 'ui.pathReadiness')}
              </div>
              {(() => {
                const det = activeProject?.detective || {}
                const checks = [
                  !!(det.goal?.trim() || activeProject?.brief?.trim()),
                  !!det.audience?.trim(),
                  deskMood.some((m) => m.inPack),
                  !!activeProject?.tagline?.trim(),
                  (projectPalette || []).length >= 2,
                ]
                const readyN = checks.filter(Boolean).length
                return (
                  <>
                    <p
                      className="panel-hint project-ready-count"
                      aria-label={`${readyN} of 5 ready`}
                    >
                      <strong>
                        {readyN} of 5
                      </strong>{' '}
                      ready
                    </p>
                    <ul className="pack-ready-list project-ready-list">
                      <li className={checks[0] ? 'is-ok' : 'is-miss'}>
                        {checks[0] ? (
                          <span>✓ One-sentence goal (detective or brief)</span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() =>
                              document.getElementById('detective-goal')?.focus()
                            }
                          >
                            ○ One-sentence goal — fix
                          </button>
                        )}
                      </li>
                      <li className={checks[1] ? 'is-ok' : 'is-miss'}>
                        {checks[1] ? (
                          <span>✓ Audience named</span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() =>
                              document
                                .getElementById('detective-audience')
                                ?.focus()
                            }
                          >
                            ○ Audience — fix
                          </button>
                        )}
                      </li>
                      <li className={checks[2] ? 'is-ok' : 'is-miss'}>
                        {checks[2] ? (
                          <span>
                            ✓ Starred leave-behind pins (
                            {deskMood.filter((m) => m.inPack).length}/6)
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="pack-ready-fix"
                            onClick={() => setActiveView('studio')}
                          >
                            ○ Star pins on Research — fix
                          </button>
                        )}
                      </li>
                      <li className={checks[3] ? 'is-ok' : 'is-miss'}>
                        {checks[3] ? (
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
                      <li className={checks[4] ? 'is-ok' : 'is-miss'}>
                        {checks[4] ? (
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
                    </ul>
                    <p className="panel-hint" style={{ marginBottom: '0.85rem' }}>
                      {completedCount}/{deskTasks.length || 0} steps done · detective
                      sheet feeds brief &amp; brand book.
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
                <label className="field-label" htmlFor="project-brief">
                  Brief / positioning
                </label>
                <textarea
                  id="project-brief"
                  className="field-input project-brief-input"
                  rows={4}
                  value={activeProject?.brief || ''}
                  onChange={(e) => updateProjectBrief(e.target.value)}
                  placeholder="Who is it for? What should they feel or do? One clear goal."
                  aria-label="Brief and positioning"
                />
                <p className="panel-hint" style={{ marginTop: '0.35rem' }}>
                  Feeds Design positioning and the pack leave-behind.
                </p>
              </div>

              <div className="project-actions-row" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!activeProject || activeProjects.length < 2}
                  onClick={() => {
                    if (!activeProject) return
                    const r = archiveProject(activeProject.id)
                    if (!r.ok) flashToast(r.error || 'Could not archive')
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
                      /* quiet restore */
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
                  onClick={() => setActiveView('studio')}
                >
                  <span className="link-row-label">2 · Research</span>
                  <span className="link-row-meta">
                    {deskMood.filter((m) => m.inPack).length} pack pins
                  </span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('spark')}
                >
                  <span className="link-row-label">3 · Ideate</span>
                  <span className="link-row-meta">Sparks &amp; directions</span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('flow')}
                >
                  <span className="link-row-label">4 · Sketch</span>
                  <span className="link-row-meta">
                    {deskTasks.filter((t) => !t.completed).length} open steps
                  </span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('brand')}
                >
                  <span className="link-row-label">5 · Design</span>
                  <span className="link-row-meta">Artboard &amp; rules</span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('review')}
                >
                  <span className="link-row-label">6 · Review</span>
                  <span className="link-row-meta">Critique &amp; readiness</span>
                </button>
                <button
                  type="button"
                  className="link-row"
                  onClick={() => setActiveView('finish')}
                >
                  <span className="link-row-label">7 · Deliver</span>
                  <span className="link-row-meta">Vector PDF &amp; print</span>
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


      {demoTour && (
        <div
          className="export-overlay demo-tour-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-tour-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDemoTour(null)
          }}
        >
          <div className="export-panel demo-tour-panel">
            <p className="onboard-eyebrow">Soft Signal · sample tour</p>
            <div className="demo-tour-dots" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span key={i} className={i <= demoTour.step ? 'is-on' : ''} />
              ))}
            </div>
            <h2 id="demo-tour-title" style={{ marginTop: 0 }}>
              {
                [
                  '1 · Define',
                  '2 · Research',
                  '3 · Ideate',
                  '4 · Sketch',
                  '5 · Design',
                  '6 · Review',
                  '7 · Deliver',
                ][demoTour.step] || 'Tour'
              }
            </h2>
            <p className="view-lede">
              {
                [
                  'Detective sheet first: who, feel, one-sentence goal. Soft Signal is seeded.',
                  'Curious spy: refs, star up to 6 ★. Use the 20-min research timer.',
                  'Force many sparks — try Opposite direction. Shortlist A/B/C.',
                  '2–3 drafts + one-line why. Low polish. Under ~2 hours total.',
                  'Live artboard + lockups. Bump version (v1→v2) before big changes.',
                  'Show the leave-behind. Ask specific questions. Capture feedback notes.',
                  'Brand book PDF + handoff note + what you learned.',
                ][demoTour.step]
              }
            </p>
            <div className="onboard-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const views = [
                    'project',
                    'studio',
                    'spark',
                    'flow',
                    'brand',
                    'review',
                    'finish',
                  ]
                  const s = demoTour.step
                  setActiveView(views[s])
                  if (s >= 6) setDemoTour(null)
                  else setDemoTour({ step: s + 1 })
                }}
              >
                {demoTour.step >= 6
                  ? 'Open Deliver · done'
                  : 'Go · next tip'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const views = [
                    'project',
                    'studio',
                    'spark',
                    'flow',
                    'brand',
                    'review',
                    'finish',
                  ]
                  setActiveView(views[demoTour.step] || 'project')
                  setDemoTour(null)
                }}
              >
                Stay here
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => setDemoTour(null)}
              >
                Skip tour
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {i18nT(locale, 'ui.onboardTitle')}
                </h2>
                <p id="onboard-desc" className="view-lede onboard-lede">
                  {i18nT(locale, 'ui.onboardLede')}
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
            <details className="onboard-brief-details">
              <summary className="text-link">
                Add brief later? (optional)
              </summary>
              <label className="onboard-label" htmlFor="onboard-brief">
                Brief
                <textarea
                  id="onboard-brief"
                  value={onboardBrief}
                  onChange={(e) => setOnboardBrief(e.target.value)}
                  placeholder="Who is this for? Outcome? Constraint?"
                  rows={2}
                  className="onboard-input"
                />
              </label>
            </details>
            <div className="onboard-actions">
              <button
                type="button"
                className="btn btn-primary onboard-primary"
                disabled={!onboardName.trim()}
                onClick={() => finishOnboarding('custom')}
              >
                Start on Define
              </button>
              <button
                type="button"
                className="text-link onboard-demo"
                onClick={() => finishOnboarding('empty')}
              >
                Skip setup — empty desk (capture a Sketch step later)
              </button>
            </div>
          </div>
        </div>
      )}

      {savePulse && (
        <div className="autosave-chip">✓ Saved on this device</div>
      )}

      {resumeBanner && (
        <div className="resume-banner" role="status">
          <p className="resume-banner-body">
            <strong>{resumeBanner.name}</strong>
            {resumeBanner.viewLabel
              ? ` · ${resumeBanner.viewLabel}`
              : ''}
            {resumeBanner.step
              ? ` · Next: ${String(resumeBanner.step).slice(0, 48)}${
                  String(resumeBanner.step).length > 48 ? '…' : ''
                }`
              : ' · Capture a step on Sketch'}
          </p>
          <div className="resume-banner-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setActiveView(
                  resumeBanner.view ||
                    (resumeBanner.step ? 'flow' : 'project')
                )
                setResumeBanner(null)
              }}
            >
              Continue
              {resumeBanner.viewLabel ? ` · ${resumeBanner.viewLabel}` : ''}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setResumeBanner(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {commandOpen && (
        <div
          className="export-overlay command-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="command-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCommandOpen(false)
              setCommandQuery('')
            }
          }}
        >
          <div className="export-panel command-panel">
            <h3 id="command-title" className="sr-only">
              Command palette
            </h3>
            <input
              ref={commandInputRef}
              className="field-input command-input"
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              placeholder="Jump, complete, Helper…"
              aria-label="Filter commands"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const first = commandFiltered[0]
                  if (first) {
                    e.preventDefault()
                    setCommandOpen(false)
                    setCommandQuery('')
                    first.run()
                  }
                }
              }}
            />
            <ul className="command-list" role="listbox">
              {commandFiltered.length === 0 && (
                <li className="command-empty">No matches</li>
              )}
              {commandFiltered.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="command-item"
                    role="option"
                    onClick={() => {
                      setCommandOpen(false)
                      setCommandQuery('')
                      a.run()
                    }}
                  >
                    <span>{a.label}</span>
                    {a.hint ? <kbd>{a.hint}</kbd> : null}
                  </button>
                </li>
              ))}
            </ul>
            <p className="panel-hint" style={{ margin: '0.55rem 0 0' }}>
              Enter runs the first match · Esc closes
            </p>
          </div>
        </div>
      )}

      {shortcutsOpen && (
        <div
          className="export-overlay shortcuts-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShortcutsOpen(false)
          }}
        >
          <div className="export-panel shortcuts-panel">
            <div className="export-panel-header">
              <h3 id="shortcuts-title" style={{ margin: 0 }}>
                Keyboard
              </h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShortcutsOpen(false)}
              >
                Close
              </button>
            </div>
            <ul className="shortcuts-list">
              <li>
                <kbd>1</kbd>–<kbd>7</kbd> Process steps
              </li>
              <li>
                <kbd>C</kbd> Complete current step
              </li>
              <li>
                <kbd>N</kbd> New capture (Sketch)
              </li>
              <li>
                <kbd>U</kbd> Undo last complete
              </li>
              <li>
                <kbd>?</kbd> This sheet
              </li>
              <li>
                <kbd>⌘</kbd>
                <kbd>K</kbd> Command palette
              </li>
              <li>
                <kbd>Esc</kbd> Close / tuck Helper
              </li>
            </ul>
            <p className="panel-hint" style={{ margin: '0.75rem 0 0' }}>
              Keys work when you are not typing in a field.
            </p>
          </div>
        </div>
      )}

      {forceBreakConsentOpen && (
        <div
          className="desk-confirm-banner force-break-consent"
          role="alertdialog"
          aria-labelledby="force-break-consent-title"
        >
          <p id="force-break-consent-title" className="desk-confirm-body">
            {i18nT(locale, 'ui.forceBreaksConsent')}
          </p>
          <div className="desk-confirm-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setPref('forceBreaksConsented', true)
                setPref('forceBreaksEnabled', true)
                setForceBreakConsentOpen(false)
                flashToast('Forced break lockouts on')
              }}
            >
              {i18nT(locale, 'ui.enable')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setPref('forceBreaksEnabled', false)
                setForceBreakConsentOpen(false)
                flashToast('Forced lockouts off — re-enable in Settings')
              }}
            >
              {i18nT(locale, 'ui.cancel')}
            </button>
          </div>
        </div>
      )}

      {deskConfirm && (
        <div
          className="desk-confirm-banner"
          role="alertdialog"
          aria-labelledby="desk-confirm-title"
        >
          <p id="desk-confirm-title" className="desk-confirm-body">
            {deskConfirm.label}
          </p>
          <div className="desk-confirm-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => deskConfirm.onConfirm?.()}
            >
              {i18nT(locale, 'ui.continue')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setDeskConfirm(null)}
            >
              {i18nT(locale, 'ui.cancel')}
            </button>
          </div>
        </div>
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
                {i18nT(locale, 'ui.downloadVectorPdf')}
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
              <p className="panel-hint export-raster-hint">
                Raster PDF is Pack → More formats. Primary download is vector PDF.
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
          onNavigate={setActiveView}
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
                  <li>Edit the list, then add to your Sketch queue</li>
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
                    Add {bdSteps.filter((s) => s.trim()).length} steps to Sketch
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
