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
import { DEFAULT_PALETTE } from './lib/color'
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
const ResearchView = lazy(() => import('./views/ResearchView'))
const SketchView = lazy(() => import('./views/SketchView'))
const DefineView = lazy(() => import('./views/DefineView'))
const DesignView = lazy(() => import('./views/DesignView'))
const ReviewView = lazy(() => import('./views/ReviewView'))
const DeliverView = lazy(() => import('./views/DeliverView'))
const DetectiveSheet = lazy(() => import('./views/DetectiveSheet'))
import {
  breakMinutesForWork,
  POMODORO_WORK_MIN,
} from './lib/forcedBreak'
import { pickBreakPlan } from './lib/breakKit'
import { markBreak, minutesSinceBreak, loadSessionStart, loadWellness } from './lib/buddy'
import {
  saveDeskSession,
  loadDeskSession,
  clearForcedBreakSession,
  clearFocusSession,
  serializeForcedBreak,
  serializeFocus,
  hydrateForcedBreak,
  hydrateFocus,
  tickForcedBreak,
  buildResumeBanner,
  focusPathGapField,
  VIEW_RESUME_LABELS,
} from './lib/sessionResume'
import {
  formatDecisionLine,
  latestDecision,
  chosenDirection,
} from './lib/decisionLog'
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
  pathFirstGap,
  pathGapFocusSelector,
  buildPathProgressCtx,
  focusPathGapTarget,
  sameProjectId,
} from './lib/journeyProgress'
import JourneyGapStrip from './components/JourneyGapStrip'
import {
  PROCESS_PHASES,
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
  downloadBrandKitZip,
  downloadWorkspaceBackup,
  packReadiness,
  preloadPdfEngine,
  printElementById,
  slugifyFilename,
} from './lib/exportFiles'
import LogoLockup from './components/LogoLockup'
const EmptyIllustration = lazy(() => import('./components/EmptyIllustration'))
import {
  LOCALES,
  normalizeLocale,
  t as i18nT,
  pathLabel,
  pathPlain,
  pathFillHint,
  tFormat,
  localeDir,
  isRtl,
} from './lib/i18n'
import { useModalFocus } from './lib/useModalFocus'
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
  const sparksTried = useAppStore((s) => s.sparksTried)
  const addProject = useAppStore((s) => s.addProject)
  const setCurrentProject = useAppStore((s) => s.setCurrentProject)
  const updateProjectBrief = useAppStore((s) => s.updateProjectBrief)
  const updateDetective = useAppStore((s) => s.updateDetective)
  const applyDetectiveToBrief = useAppStore((s) => s.applyDetectiveToBrief)
  const updateDirection = useAppStore((s) => s.updateDirection)
  const setLogoDirection = useAppStore((s) => s.setLogoDirection)
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
  const updateTaskWhy = useAppStore((s) => s.updateTaskWhy)
  const removeTask = useAppStore((s) => s.removeTask)
  const breakIntoSteps = useAppStore((s) => s.breakIntoSteps)
  const addMoodPin = useAppStore((s) => s.addMoodPin)
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
        'home',
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
    // First visit and every return visit: one clear next action
    return 'home'
  })
  const setActiveView = useCallback((view) => {
    setActiveViewRaw(view)
    try {
      if (view) localStorage.setItem('cc-active-view', String(view))
    } catch {
      /* ignore */
    }
  }, [])

  /** Design accordion target when jumping from Review/Deliver readiness fixes */
  const [brandEditSection, setBrandEditSection] = useState('essentials')
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
  /** 'research' when 20-min research timer started — rejoin Ideate after ding */
  const [timerFocusSource, setTimerFocusSource] = useState(null)
  const [pomodoroWorkStartedAt, setPomodoroWorkStartedAt] = useState(null)
  /** @type {null | { totalSec: number, leftSec: number, workMinutes: number, breakMinutes: number, planItems: array, completedIds: string[] }} */
  const [forcedBreak, setForcedBreak] = useState(null)
  const focusMinutes = Math.floor(focusLeft / 60)
  const focusSeconds = focusLeft % 60
  const forcedBreakRef = useRef(null)
  forcedBreakRef.current = forcedBreak
  /** View to restore after forced break ends */
  const preBreakViewRef = useRef(null)
  const [showCreativeReset, setShowCreativeReset] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardName, setOnboardName] = useState('')
  const [onboardBrief, setOnboardBrief] = useState('')
  const [onboardFirstStep, setOnboardFirstStep] = useState('')
  const [processPhase, setProcessPhase] = useState(null)
  const [processOpen, setProcessOpen] = useState(false)
  const [recentUndo, setRecentUndo] = useState(null)
  const [exportPanel, setExportPanel] = useState(null)
  const [lastExportNote, setLastExportNote] = useState('')
  /** @type {null | { kind: string, label: string, onConfirm: () => void }} */
  const [deskConfirm, setDeskConfirm] = useState(null)
  const [forceBreakConsentOpen, setForceBreakConsentOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const commandInputRef = useRef(null)
  const [resumeBanner, setResumeBanner] = useState(null)
  const [demoTour, setDemoTour] = useState(null)
  const [navDir, setNavDir] = useState('none')
  const prevJourneyIdx = useRef(0)
  const [savePulse, setSavePulse] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [captureOptionsOpen, setCaptureOptionsOpen] = useState(false)
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
  const [showHydratingEscape, setShowHydratingEscape] = useState(false)
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
    (t) =>
      t.projectId == null || String(t.projectId) === String(activeProjectId)
  )
  const openTasks = deskTasks.filter((t) => !t.completed)
  const doneTasks = deskTasks.filter((t) => t.completed)
  const nextTask = openTasks[0] || null
  const queueTasks = openTasks.slice(1)
  const deskMood = (moodItems || [])
    .filter(
      (m) =>
        m.projectId == null || String(m.projectId) === String(activeProjectId)
    )
    .slice()
    .sort((a, b) => (a.boardOrder ?? 0) - (b.boardOrder ?? 0))

  /** Shared path progress (must stay above any early return — Rules of Hooks) */
  const pathProgressCtx = useMemo(
    () => ({
      project: activeProject,
      moodItems: deskMood,
      tasks: deskTasks,
      sparkIndex,
      palette: projectPalette,
    }),
    [activeProject, deskMood, deskTasks, sparkIndex, projectPalette]
  )
  const pathRows = useMemo(
    () => pathProgressSummary(JOURNEY_STEPS, pathProgressCtx),
    [pathProgressCtx]
  )
  const pathDoneCount = useMemo(
    () => pathRows.filter((r) => r.done).length,
    [pathRows]
  )
  const pathNextGap = useMemo(
    () => pathRows.find((r) => !r.done) || null,
    [pathRows]
  )
  const pathMissingRows = useMemo(
    () => pathRows.filter((r) => !r.done),
    [pathRows]
  )
  const pathMissingLabelsList = useMemo(
    () =>
      pathMissingRows.map((r) => pathLabel(locale, r.id) || r.label),
    [pathMissingRows, locale]
  )
  const thisStepId = journeyIdForView(activeView)
  const thisStepFilled = useMemo(() => {
    if (!thisStepId) return null
    return pathStepHasContent(thisStepId, pathProgressCtx)
  }, [thisStepId, pathProgressCtx])
  /** Leave-behind can still be thin when path N/7 looks full */
  const leaveBehindThin = useMemo(() => {
    const pack = buildBrandPackSnapshot({
      project: activeProject,
      tasks: deskTasks,
      moodItems: deskMood,
      palette: projectPalette,
    })
    return !!packReadiness(pack).thin
  }, [activeProject, deskTasks, deskMood, projectPalette])
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

  // Seed missing project palettes
  useEffect(() => {
    if (!activeProject) return
    if (!activeProject.palette?.length) {
      setProjectPalette([...DEFAULT_PALETTE])
    }
  }, [activeProject?.id, activeProject?.palette, setProjectPalette])

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
    flashToast(i18nT(locale, 'ui.stepComplete'), { important: true })
    setStepFocusKey((k) => k + 1)
  }

  const undoLastComplete = () => {
    if (!recentUndo?.id) return
    toggleTask(recentUndo.id)
    flashToast(i18nT(locale, 'ui.undidStep'))
    setRecentUndo(null)
    setStepFocusKey((k) => k + 1)
  }

  const bumpDesignVersionIfV1 = useAppStore((s) => s.bumpDesignVersionIfV1)

  /**
   * Open a process step + focus a useful field (ADHD land-on-work).
   * @param {{ view: string, id?: string, label?: string }} step
   * @param {{ micro?: 'open'|'next' }} [opts]
   */
  const goToProcessStep = useCallback(
    (step, opts = {}) => {
      if (!step?.view) return null
      setActiveView(step.view)
      const label = pathLabel(locale, step.id) || step.label
      const micro = opts.micro === 'next' ? 'ui.nextGapMicro' : 'ui.openStepMicro'
      flashMicro(tFormat(locale, micro, { label }))
      if (step.id) focusPathGapTarget(pathGapFocusSelector(step.id))
      return step
    },
    [setActiveView, locale]
  )

  /** Earliest incomplete step — reuses buildPathProgressCtx (same filters as strip) */
  const goToNextProcessGap = useCallback(() => {
    const gap = pathFirstGap(
      JOURNEY_STEPS,
      buildPathProgressCtx(useAppStore.getState())
    )
    if (gap?.view) return goToProcessStep(gap, { micro: 'next' })
    flashToast(i18nT(locale, 'ui.processLooksFull'))
    setActiveView('finish')
    return null
  }, [goToProcessStep, setActiveView, locale])

  /** Home dashboard: switch to a different project, then land on its own next gap */
  const switchProjectAndContinue = useCallback(
    (projectId) => {
      setCurrentProject(projectId)
      const gap = pathFirstGap(
        JOURNEY_STEPS,
        buildPathProgressCtx(useAppStore.getState())
      )
      if (gap?.view) return goToProcessStep(gap, { micro: 'next' })
      setActiveView('finish')
      return null
    },
    [setCurrentProject, goToProcessStep, setActiveView]
  )

  /** Filled after runExport is defined — command palette export actions use this */
  const runExportRef = useRef(/** @type {null | ((kind: string) => void)} */ (null))

  const commandActions = useMemo(() => {
    /** @type {{ id: string, label: string, hint: string, group: 'actions'|'path'|'tools', run: () => void, when?: () => boolean }[]} */
    const acts = [
      // —— Actions (desk recovery first) ——
      {
        id: 'complete',
        label: 'Complete current step',
        hint: 'C',
        group: 'actions',
        run: () => completeCurrentStep(),
        when: () => !!nextTask,
      },
      {
        id: 'capture',
        label: 'New capture on Sketch',
        hint: 'N',
        group: 'actions',
        run: () => {
          setActiveView('flow')
          window.setTimeout(
            () => document.getElementById('desk-capture')?.focus?.(),
            60
          )
        },
      },
      {
        id: 'fix-next-gap',
        label:
          pathDoneCount >= 7
            ? 'Process full · open Deliver'
            : `Fix next process gap (${pathDoneCount}/7)`,
        hint: 'G',
        group: 'actions',
        run: () => goToNextProcessGap(),
      },
      // —— Path 1–7 (spaced step · label) ——
      {
        id: 'define',
        label: '1 · Define',
        hint: '1',
        group: 'path',
        run: () => setActiveView('project'),
      },
      {
        id: 'research',
        label: '2 · Research',
        hint: '2',
        group: 'path',
        run: () => setActiveView('studio'),
      },
      {
        id: 'ideate',
        label: '3 · Ideate',
        hint: '3',
        group: 'path',
        run: () => setActiveView('spark'),
      },
      {
        id: 'sketch',
        label: '4 · Sketch',
        hint: '4',
        group: 'path',
        run: () => setActiveView('flow'),
      },
      {
        id: 'design',
        label: '5 · Design',
        hint: '5',
        group: 'path',
        run: () => setActiveView('brand'),
      },
      {
        id: 'review',
        label: '6 · Review',
        hint: '6',
        group: 'path',
        run: () => setActiveView('review'),
      },
      {
        id: 'deliver',
        label: '7 · Deliver',
        hint: '7',
        group: 'path',
        run: () => setActiveView('finish'),
      },
      // —— Tools & extras ——
      {
        id: 'timer',
        label: 'Open Focus timer',
        hint: '',
        group: 'tools',
        run: () => setActiveView('insights'),
      },
      {
        id: 'helper',
        label: bodyDoubling ? 'Turn Helper off' : 'Turn Helper on',
        hint: '',
        group: 'tools',
        run: () => toggleBodyDoubling(),
      },
      {
        id: 'keys',
        label: 'Keyboard shortcuts',
        hint: '?',
        group: 'tools',
        run: () => setShortcutsOpen(true),
      },
      {
        id: 'settings',
        label: 'Open Settings',
        hint: '',
        group: 'tools',
        run: () => setActiveView('settings'),
      },
      {
        id: 'detective',
        label: 'Open Design Detective Sheet',
        hint: '',
        group: 'tools',
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
        group: 'tools',
        run: () => {
          const r = bumpDesignVersion()
          if (r?.ok)
            flashMicro(
              tFormat(locale, 'ui.versionBumped', { version: r.version })
            )
          setActiveView('brand')
        },
      },
      {
        id: 'research-timer',
        label: 'Start 20-min research timer',
        hint: '',
        group: 'tools',
        run: () => {
          if (forcedBreak) {
            flashToast(i18nT(locale, 'ui.breakLockFirst'))
            return
          }
          setSessionComplete(false)
          setTimerFocusSource('research')
          setFocusLeft(20 * 60)
          setPomodoroWorkStartedAt(Date.now())
          setIsFocusRunning(true)
          setActiveView('insights')
          saveDeskSession({
            activeView: 'insights',
            projectId: activeProjectId,
            focus: serializeFocus({
              running: true,
              leftSec: 20 * 60,
              source: 'research',
            }),
          })
          notifyAction('Focus on', 'focus_start', {
            label: 'Research timer',
          })
          flashToast(i18nT(locale, 'ui.researchTimerOn'))
        },
      },
      {
        id: 'brand-kit',
        label: i18nT(locale, 'ui.downloadKit') || 'Download brand kit (zip)',
        hint: '',
        group: 'tools',
        run: () => {
          if (forcedBreak) {
            flashToast(i18nT(locale, 'ui.breakLockFirst'))
            return
          }
          setActiveView('finish')
          window.setTimeout(() => {
            runExportRef.current?.('kit')
          }, 80)
        },
      },
      {
        id: 'brand-book-pdf',
        label: i18nT(locale, 'ui.downloadVectorPdf') || 'Download brand book PDF',
        hint: '',
        group: 'tools',
        run: () => {
          if (forcedBreak) {
            flashToast(i18nT(locale, 'ui.breakLockFirst'))
            return
          }
          setActiveView('finish')
          window.setTimeout(() => {
            runExportRef.current?.('pdf')
          }, 80)
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
    goToNextProcessGap,
    pathDoneCount,
    locale,
  ])

  const commandFiltered = useMemo(() => {
    const q = commandQuery.trim().toLowerCase()
    if (!q) return commandActions
    return commandActions.filter((a) => a.label.toLowerCase().includes(q))
  }, [commandActions, commandQuery])

  const commandSections = useMemo(() => {
    const order = [
      { id: 'actions', label: 'Actions' },
      { id: 'path', label: 'Path' },
      { id: 'tools', label: 'Tools' },
    ]
    return order
      .map((sec) => ({
        ...sec,
        items: commandFiltered.filter((a) => a.group === sec.id),
      }))
      .filter((sec) => sec.items.length > 0)
  }, [commandFiltered])

  // Auto-clear undo window
  useEffect(() => {
    if (!recentUndo) return undefined
    const t = window.setTimeout(() => setRecentUndo(null), 6000)
    return () => window.clearTimeout(t)
  }, [recentUndo])

  const activeProjects = (projects || []).filter((p) => !p.archived)
  const archivedProjects = (projects || []).filter((p) => p.archived)

  /** Per-project next-step summary for the multi-project Home dashboard */
  const projectsSummary = useMemo(
    () =>
      activeProjects.map((p) => {
        const ctx = {
          project: p,
          moodItems: (moodItems || []).filter((m) =>
            sameProjectId(m.projectId, p.id)
          ),
          tasks: (tasks || []).filter((t) => sameProjectId(t.projectId, p.id)),
          sparkIndex,
          palette: p.palette?.length > 0 ? p.palette : DEFAULT_PALETTE,
        }
        const rows = pathProgressSummary(JOURNEY_STEPS, ctx)
        return {
          project: p,
          doneCount: rows.filter((r) => r.done).length,
          nextGap: pathFirstGap(JOURNEY_STEPS, ctx),
        }
      }),
    [activeProjects, moodItems, tasks, sparkIndex]
  )

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
        tFormat(locale, 'ui.workBlockDoneSoft', {
          min: Math.round(workMin),
        })
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
      flashToast(i18nT(locale, 'ui.forceBreaksReview'))
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
    clearFocusSession()
    setMoreOpen(false)
    setAccountOpen(false)
    // Remember path view so unlock returns user where they were
    preBreakViewRef.current = activeView
    const endsAt = Date.now() + totalSec * 1000
    const fb = {
      totalSec,
      leftSec: totalSec,
      endsAt,
      workMinutes: workMin,
      breakMinutes: breakMin,
      reason,
      planItems,
      completedIds: [],
      resumeView: activeView,
    }
    setForcedBreak(fb)
    // Persist so reload mid-break restores the lock + resume view
    saveDeskSession({
      activeView,
      projectId: activeProjectId,
      forcedBreak: serializeForcedBreak(fb),
      focus: null,
    })
    playBreakChime()
    const kitN = planItems.length
    flashToast(
      kitN > 0
        ? tFormat(locale, 'ui.breakLockedKit', {
            min: breakMin,
            n: kitN,
          })
        : tFormat(locale, 'ui.breakLockedPlain', {
            min: breakMin,
            work: Math.round(workMin),
          })
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
    const fb = forcedBreakRef.current
    const resume = fb?.resumeView || preBreakViewRef.current || null
    markBreak()
    setForcedBreak(null)
    clearForcedBreakSession()
    setPomodoroWorkStartedAt(Date.now())
    setFocusLeft(POMODORO_WORK_MIN * 60)
    setSessionComplete(false)
    if (!emergency) {
      awardAndBroadcast('break_complete', { label: 'Pomodoro break' })
      awardAndBroadcast('pomodoro_work', { label: 'Focus cycle' })
    }
    if (resume) {
      setActiveView(resume)
      const step = JOURNEY_STEPS.find((s) => s.view === resume)
      const label = step
        ? pathLabel(locale, step.id) || step.label
        : toolsLabelForView(resume)
      flashMicro(
        tFormat(locale, 'ui.backAfterBreak', { label: label || resume })
      )
      // Land on the craft field, not just the route
      focusPathGapField(resume)
      preBreakViewRef.current = null
      saveDeskSession({
        activeView: resume,
        projectId: activeProjectId,
        forcedBreak: null,
      })
    }
    flashToast(
      emergency
        ? i18nT(locale, 'ui.breakEndedEarly')
        : i18nT(locale, 'ui.breakDone')
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

  // Forced break countdown (blocks whole app) — endsAt-based so sleep/reload stay honest
  useEffect(() => {
    if (!forcedBreak) return undefined
    if (forcedBreak.leftSec <= 0) {
      endForcedBreak(false)
      return undefined
    }
    const id = window.setInterval(() => {
      setForcedBreak((fb) => {
        if (!fb) return null
        const next = tickForcedBreak(fb)
        if (!next || next.leftSec <= 0) {
          return { ...fb, leftSec: 0, endsAt: next?.endsAt || fb.endsAt }
        }
        // Persist remaining occasionally via endsAt (absolute)
        try {
          saveDeskSession({
            forcedBreak: serializeForcedBreak(next),
            activeView: next.resumeView || preBreakViewRef.current,
          })
        } catch {
          /* ignore */
        }
        return next
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

  // Focus traps — export / breakdown / onboard (Research lightbox lives in ResearchView)
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
        exportPanel ||
        showBreakdown ||
        showOnboarding ||
        demoTour ||
        deskConfirm ||
        forceBreakConsentOpen ||
        commandOpen ||
        document.querySelector('.board-lightbox-overlay') ||
        document.querySelector('.thin-pack-prompt')
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
      // G — fix next process gap
      if (k === 'g') {
        e.preventDefault()
        goToNextProcessGap()
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
    exportPanel,
    showBreakdown,
    showOnboarding,
    demoTour,
    deskConfirm,
    forceBreakConsentOpen,
    commandOpen,
    shortcutsOpen,
    nextTask,
    recentUndo,
    setActiveView,
    goToNextProcessGap,
  ])

  // Hydrate forced break + focus timer after unlock (reload mid-session)
  useEffect(() => {
    if (!unlocked || !onboarded || cloudHydrating) return undefined
    if (forcedBreakRef.current) return undefined
    const session = loadDeskSession()
    if (!session) return undefined

    const breakH = hydrateForcedBreak(session.forcedBreak)
    if (breakH?.active) {
      preBreakViewRef.current = breakH.active.resumeView
      setForcedBreak(breakH.active)
      if (breakH.active.resumeView) {
        setActiveView(breakH.active.resumeView)
      }
      flashToast(i18nT(locale, 'ui.breakResumed') || 'Break still running — desk locked')
      return undefined
    }

    const focusH = hydrateFocus(session.focus)
    if (focusH?.running && focusH.leftSec > 0) {
      setFocusLeft(focusH.leftSec)
      setIsFocusRunning(true)
      setTimerFocusSource(focusH.source || null)
      setPomodoroWorkStartedAt(Date.now() - (POMODORO_WORK_MIN * 60 - focusH.leftSec) * 1000)
      setSessionComplete(false)
    } else if (focusH?.ended) {
      setFocusLeft(0)
      setIsFocusRunning(false)
      setSessionComplete(true)
      clearFocusSession()
    } else if (focusH && focusH.leftSec > 0) {
      setFocusLeft(focusH.leftSec)
      setIsFocusRunning(false)
      setTimerFocusSource(focusH.source || null)
    }

    // Break finished while tab was closed → soft resume banner mode
    if (breakH?.expired) {
      clearForcedBreakSession()
      markBreak()
      const resume = breakH.resumeView
      if (resume) {
        setActiveView(resume)
        preBreakViewRef.current = resume
      }
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, onboarded, cloudHydrating])

  // Keep desk session snapshot in sync (path view + project)
  useEffect(() => {
    if (!unlocked) return
    saveDeskSession({
      activeView,
      projectId: activeProjectId,
    })
  }, [activeView, activeProjectId, unlocked])

  // Persist focus timer while running (absolute endsAt)
  useEffect(() => {
    if (!unlocked || forcedBreak) return
    if (!isFocusRunning) return undefined
    saveDeskSession({
      activeView,
      projectId: activeProjectId,
      focus: serializeFocus({
        running: true,
        leftSec: focusLeft,
        source: timerFocusSource,
      }),
    })
    const id = window.setInterval(() => {
      setFocusLeft((left) => {
        const next = Math.max(0, left)
        saveDeskSession({
          focus: serializeFocus({
            running: next > 0,
            leftSec: next,
            source: timerFocusSource,
          }),
        })
        return left
      })
    }, 5000)
    return () => window.clearInterval(id)
  }, [
    unlocked,
    forcedBreak,
    isFocusRunning,
    focusLeft,
    timerFocusSource,
    activeView,
    activeProjectId,
  ])

  // Once per browser session: stronger resume strip (view + decision + field focus)
  useEffect(() => {
    if (!unlocked || !onboarded || cloudHydrating) return undefined
    try {
      if (sessionStorage.getItem('cc-resume-shown') === '1') return undefined
      sessionStorage.setItem('cc-resume-shown', '1')
    } catch {
      /* ignore */
    }
    // Don't stack banner on top of an active forced break
    if (forcedBreakRef.current) return undefined

    const session = loadDeskSession() || {
      activeView,
      forcedBreak: null,
      focus: null,
    }
    const dec =
      latestDecision(activeProject?.decisionLog, 'direction') ||
      latestDecision(activeProject?.decisionLog)
    const fromChosen = chosenDirection(activeProject)
    const decisionLine =
      formatDecisionLine(dec) ||
      (fromChosen
        ? formatDecisionLine({
            label: fromChosen.label,
            title: fromChosen.title,
            why: fromChosen.note,
          })
        : '')

    const banner = buildResumeBanner({
      session,
      projectName: activeProject?.name || '',
      nextStepTitle: nextTask?.title || '',
      decisionLine,
      activeView,
    })

    // Always show when we have a named project or desk step or decision
    if (!banner.name && !banner.step && !banner.decisionLine) return undefined
    if (banner.name === 'Project' && !banner.step && !banner.decisionLine && !activeProject?.name) {
      return undefined
    }

    // Localize path label when possible
    const stepId = journeyIdForView(banner.view)
    const viewLabel = stepId
      ? pathLabel(locale, stepId) || VIEW_RESUME_LABELS[banner.view]
      : VIEW_RESUME_LABELS[banner.view] || banner.viewLabel

    setResumeBanner({
      ...banner,
      viewLabel,
    })
    return undefined
  }, [
    unlocked,
    onboarded,
    cloudHydrating,
    activeProject?.name,
    activeProject?.decisionLog,
    nextTask?.title,
    activeView,
    locale,
  ])

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

  // Hard safety net: if cloud loading ever hangs (even past the 12s
  // per-request timeout in cloudSync.js), never leave the user stuck on a
  // dead screen with no way out.
  useEffect(() => {
    if (!cloudHydrating) {
      setShowHydratingEscape(false)
      return undefined
    }
    const t = window.setTimeout(() => setShowHydratingEscape(true), 6000)
    return () => window.clearTimeout(t)
  }, [cloudHydrating])

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
        setSyncError(result.error || 'Couldn’t load cloud desk')
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
          if (!push.ok) setSyncError(push.error || 'Couldn’t upload')
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
        setSyncError(result.error || 'Couldn’t sync')
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
    setTimerFocusSource(null)
    clearFocusSession()
    saveDeskSession({
      activeView,
      projectId: activeProjectId,
      focus: serializeFocus({
        running: false,
        leftSec: minutes * 60,
        source: null,
      }),
    })
  }

  const startOrPauseFocus = () => {
    if (forcedBreak) return
    setSessionComplete(false)
    const baseLeft = focusLeft === 0 ? POMODORO_WORK_MIN * 60 : focusLeft
    if (focusLeft === 0) setFocusLeft(baseLeft)
    if (!isFocusRunning) {
      setPomodoroWorkStartedAt(Date.now())
      setIsFocusRunning(true)
      notifyAction('Focus on', 'focus_start', { label: 'Focus' })
      saveDeskSession({
        activeView,
        projectId: activeProjectId,
        focus: serializeFocus({
          running: true,
          leftSec: baseLeft,
          source: timerFocusSource,
        }),
      })
    } else {
      setIsFocusRunning(false)
      saveDeskSession({
        activeView,
        projectId: activeProjectId,
        focus: serializeFocus({
          running: false,
          leftSec: focusLeft,
          source: timerFocusSource,
        }),
      })
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
      flashToast(i18nT(locale, 'ui.deskReady'))
    } else {
      // Empty real desk — no sample clients
      clearToEmpty()
      if (onboardName.trim()) {
        renameProject(
          useAppStore.getState().currentProjectId,
          onboardName.trim()
        )
      }
      flashToast(i18nT(locale, 'ui.emptyDeskFirst'))
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
        el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
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
      // XP stays in Progress HUD — success toast stays human leave-behind language
      flashToast(
        kind === 'backup'
          ? i18nT(locale, 'ui.backupSaved')
          : i18nT(locale, 'ui.leaveBehindSaved'),
        { important: true }
      )
    }

    // Capture File System Access handle WHILE we still have the user-gesture.
    // Critical for PDF (async jsPDF load) and helps Chrome when anchor download is blocked.
    const saveName =
      kind === 'pdf' || kind === 'pdf-preview'
        ? `${slug}-brand-direction.pdf`
        : kind === 'kit'
          ? `${slug}-brand-kit.zip`
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

    if (kind === 'kit') {
      flashToast(i18nT(locale, 'ui.kitBuilding') || 'Building brand kit…', {
        important: true,
      })
      void (async () => {
        const result = await downloadBrandKitZip(pack, handlePromise, {
          hideWatermark: hidePackWatermark,
        })
        if (result.ok) {
          setLastExportNote(
            `Brand kit zip · ${new Date().toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}`
          )
          finishOk('Brand kit')
        } else if (result.cancelled)
          flashToast(i18nT(locale, 'ui.saveCancelled'))
        else
          flashToast(
            result.error || i18nT(locale, 'ui.downloadFailed') || 'Kit failed'
          )
      })()
      return
    }

    if (kind === 'pdf') {
      // Vector direction pack (text + swatches as PDF primitives)
      void preloadPdfEngine()
      flashToast(i18nT(locale, 'ui.pdfBuilding'), { important: true })
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
        } else if (result.cancelled)
          flashToast(i18nT(locale, 'ui.saveCancelled'))
        else flashToast(result.error || i18nT(locale, 'ui.pdfFailed'))
      })()
      return
    }

    if (kind === 'pdf-preview') {
      // Raster snapshot matching on-screen artboard (optional)
      const hasSystem = document.getElementById('system-artboard')
      if (!hasSystem && !exportPanel) openExportPanel()
      void preloadPdfEngine()
      flashToast(i18nT(locale, 'ui.pdfPreviewing'), { important: true })
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
        } else if (result.cancelled)
          flashToast(i18nT(locale, 'ui.saveCancelled'))
        else flashToast(result.error || i18nT(locale, 'ui.pdfFailed'))
      })()
      return
    }

    if (kind === 'html') {
      void Promise.resolve(downloadBrandPackHtml(pack, handlePromise)).then(
        (result) => {
          if (result.ok) finishOk('Brand HTML')
          else if (result.cancelled)
            flashToast(i18nT(locale, 'ui.saveCancelled'))
          else flashToast(result.error || i18nT(locale, 'ui.downloadFailed'))
        }
      )
      return
    }
    if (kind === 'md') {
      void Promise.resolve(downloadBrandPackMarkdown(pack, handlePromise)).then(
        (result) => {
          if (result.ok) finishOk('Brand Markdown')
          else if (result.cancelled)
            flashToast(i18nT(locale, 'ui.saveCancelled'))
          else flashToast(result.error || i18nT(locale, 'ui.downloadFailed'))
        }
      )
      return
    }
    if (kind === 'json') {
      void Promise.resolve(downloadBrandPackJson(pack, handlePromise)).then(
        (result) => {
          if (result.ok) finishOk('Brand JSON')
          else if (result.cancelled)
            flashToast(i18nT(locale, 'ui.saveCancelled'))
          else flashToast(result.error || i18nT(locale, 'ui.downloadFailed'))
        }
      )
      return
    }
    if (kind === 'backup') {
      const result = downloadWorkspaceBackup(exportAllData())
      if (result.ok) finishOk('Workspace backup')
      else flashToast(result.error || i18nT(locale, 'ui.downloadFailed'))
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
          : { ok: false, error: i18nT(locale, 'ui.nothingToPrint') }
        if (r.ok) {
          awardAndBroadcast('export_pack', { label: 'Print / PDF' })
          const when = new Date().toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })
          setLastExportNote(`Print dialog · ${when} — Save as PDF if you want a file`)
          flashToast(i18nT(locale, 'ui.printDialogOpen'))
        } else flashToast(r.error || i18nT(locale, 'ui.printFailed'))
      }, exportPanel ? 50 : 180)
      return
    }
    flashToast(i18nT(locale, 'ui.unknownExport'))
  }
  runExportRef.current = runExport

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
    flashToast(
      n === 1
        ? i18nT(locale, 'ui.microStepsOne')
        : tFormat(locale, 'ui.microStepsN', { n })
    )
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
        flashToast(result.error || i18nT(locale, 'ui.demoLoadFail'))
      }
    } catch (e) {
      flashToast(e?.message || i18nT(locale, 'ui.softSignalFail'))
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
        flashToast(i18nT(locale, 'ui.backupRestored'))
      } else {
        flashToast(result.error || i18nT(locale, 'ui.importFail'))
      }
    }
    reader.onerror = () => flashToast(i18nT(locale, 'ui.readFileFail'))
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
    flashToast(i18nT(locale, 'ui.projectRenamed'))
  }

  const handleDeleteProject = () => {
    if (!activeProject) return
    if (projects.length <= 1) {
      flashToast(i18nT(locale, 'ui.keepOneProject'))
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
          flashToast(i18nT(locale, 'ui.projectDeleted'))
          setActiveView('project')
        } else {
          flashToast(result.error || i18nT(locale, 'ui.deleteFail'))
        }
        setDeskConfirm(null)
      },
    })
  }

  const handleSignOut = async () => {
    if (CLOUD) {
      await signOutCloud()
      setCloudUser(null)
      setUnlocked(false)
      setAccessName('')
      cloudSyncReady.current = false
      flashToast(i18nT(locale, 'ui.signedOutOk'))
      return
    }
    closeSession()
    setUnlocked(false)
    setAccessName('')
    flashToast(i18nT(locale, 'ui.lockedOk'))
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
            {showHydratingEscape && (
              <>
                <p
                  className="login-fineprint"
                  style={{ marginTop: '0.85rem' }}
                >
                  Taking longer than expected — your connection may be slow.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => {
                    setCloudHydrating(false)
                    cloudSyncReady.current = true
                    setSyncState('error')
                    setSyncError('Cloud load took too long — continued locally.')
                  }}
                >
                  Continue without waiting
                </button>
              </>
            )}
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
          <button
            type="button"
            className="brand-block brand-block-link"
            onClick={() => setActiveView('home')}
            aria-label="Home"
            title="Home"
          >
            <LogoLockup className="logo" locale={locale} reduceMotion={reduceMotion} />
          </button>
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
                    flashToast(i18nT(locale, 'ui.syncedOk'))
                  } else {
                    setSyncState('error')
                    setSyncError(result.error || 'Couldn’t sync')
                    flashToast(result.error || i18nT(locale, 'ui.syncFail'))
                  }
                }}
              >
                Save didn’t stick · Retry
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
                        flashMicro(i18nT(locale, 'ui.helperOnMicro'))
                      } else {
                        flashMicro(i18nT(locale, 'ui.helperOffMicro'))
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
                    <span>C · N · G (next gap) · 1–7 · ?</span>
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
                    onClick={() => {
                      setActiveView(step.view)
                      // Empty steps: land focus on a useful field
                      if (!hasContent) {
                        focusPathGapTarget(pathGapFocusSelector(step.id))
                      }
                    }}
                    aria-current={active ? 'step' : undefined}
                    aria-label={`Step ${step.num}: ${label}. ${plain}${
                      hasContent ? ' Has content.' : ''
                    } Press ${step.num} to open.`}
                    title={`${plain} · key ${step.num}`}
                  >
                    <span className="journey-num" aria-hidden="true">
                      {hasContent && !active ? '✓' : step.num}
                    </span>
                    <span className="journey-label">{label}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          {journeyActive ? (
            <button
              type="button"
              className={`journey-progress-pill${
                pathDoneCount >= 7 ? ' is-full' : ''
              }${pathDoneCount > 0 && pathDoneCount < 7 ? ' is-partial' : ''}`}
              data-done={pathDoneCount}
              onClick={() => goToNextProcessGap()}
              title={
                pathDoneCount >= 7
                  ? i18nT(locale, 'ui.processFullDeliver')
                  : pathNextGap
                    ? `Process ${pathDoneCount}/7 · ${pathLabel(locale, pathNextGap.id) || pathNextGap.label} (G)`
                    : `Process ${pathDoneCount}/7 · G`
              }
              aria-label={
                pathDoneCount >= 7
                  ? 'Process complete, seven of seven steps have content'
                  : pathNextGap
                    ? `Process ${pathDoneCount} of 7. Next gap ${pathLabel(locale, pathNextGap.id) || pathNextGap.label}. Fix next gap.`
                    : `Process ${pathDoneCount} of 7 steps have content. Fix next gap.`
              }
            >
              {pathDoneCount}/7
            </button>
          ) : (
            <span className="journey-tools-pill" role="status" aria-live="polite">
              Tools · {toolsLabelForView(activeView)}
            </span>
          )}
        </nav>
      </header>

      <main className="main" id="main-content" tabIndex={-1} data-nav-dir={navDir}>
        {journeyActive && activeView !== 'review' && activeView !== 'finish' && (
          <JourneyGapStrip
            locale={locale}
            thisStepFilled={thisStepFilled}
            pathNextGap={pathNextGap}
            leaveBehindThin={leaveBehindThin}
            activeView={activeView}
            getNextJourney={getNextJourney}
            pathLabel={pathLabel}
            i18nT={i18nT}
            tFormat={tFormat}
            goToNextProcessGap={goToNextProcessGap}
            setActiveView={setActiveView}
          />
        )}
        {/* ===== HOME — the whole app, reduced to one sentence and one button ===== */}
        {activeView === 'home' && activeProjects.length > 1 && (
          <section className="home-view home-view-multi">
            <p className="home-eyebrow">Your projects</p>
            <h1 className="home-title">What's next</h1>
            <ul className="home-project-list">
              {[...projectsSummary]
                .sort((a, b) => {
                  const aDone = a.doneCount >= 7
                  const bDone = b.doneCount >= 7
                  if (aDone !== bDone) return aDone ? 1 : -1
                  return 0
                })
                .map(({ project: p, doneCount, nextGap }) => {
                  const done = doneCount >= 7
                  return (
                    <li key={p.id} className="home-project-row">
                      <div className="home-project-row-main">
                        <p className="home-project-name">{p.name}</p>
                        <p className="home-project-next">
                          {done
                            ? 'Ready to deliver'
                            : nextGap
                              ? `Next: ${pathLabel(locale, nextGap.id) || nextGap.label}`
                              : 'All caught up'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={`btn ${done ? 'btn-secondary' : 'btn-primary'} home-project-btn`}
                        onClick={() => {
                          if (done) {
                            setCurrentProject(p.id)
                            setActiveView('finish')
                            return
                          }
                          switchProjectAndContinue(p.id)
                        }}
                      >
                        {done ? 'Open Deliver' : 'Continue'}
                      </button>
                    </li>
                  )
                })}
            </ul>
          </section>
        )}
        {activeView === 'home' && activeProjects.length <= 1 && (
          <section className="home-view">
            <p className="home-eyebrow">
              {activeProject?.name || 'Your project'}
            </p>
            {pathDoneCount >= 7 ? (
              <>
                <h1 className="home-title">Your brand book is ready.</h1>
                <p className="home-body">
                  Every step has something in it. Time to hand it off.
                </p>
                <button
                  type="button"
                  className="btn btn-primary home-cta"
                  onClick={() => setActiveView('finish')}
                >
                  Open Deliver
                </button>
              </>
            ) : pathNextGap ? (
              <>
                <p className="home-kicker">Next step</p>
                <h1 className="home-title">
                  {pathLabel(locale, pathNextGap.id) || pathNextGap.label}
                </h1>
                <p className="home-body">
                  {pathPlain(locale, pathNextGap.id) ||
                    pathFillHint(locale, pathNextGap.id)}
                </p>
                <div className="home-cta-row">
                  <button
                    type="button"
                    className="btn btn-primary home-cta"
                    onClick={() => goToNextProcessGap()}
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost home-cta-secondary"
                    title="A tiny timer just to get moving — not a real work session"
                    onClick={() => {
                      if (forcedBreak) {
                        flashToast(i18nT(locale, 'ui.breakLockFirst'))
                        return
                      }
                      setTimerFocusSource?.('starter')
                      setFocusLeft(5 * 60)
                      setPomodoroWorkStartedAt(Date.now())
                      setIsFocusRunning(true)
                      flashToast('5-minute starter running — just begin.')
                      goToNextProcessGap()
                    }}
                  >
                    Start 5 min
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="home-title">All caught up.</h1>
                <button
                  type="button"
                  className="btn btn-primary home-cta"
                  onClick={() => setActiveView('finish')}
                >
                  Go to Deliver
                </button>
              </>
            )}
            <button
              type="button"
              className="text-link home-see-all"
              onClick={() =>
                setActiveView(pathNextGap ? pathNextGap.view : 'project')
              }
            >
              See all 7 steps
            </button>
          </section>
        )}
        {/* ===== WORK — one step owns the fold ===== */}
        {/* ===== SKETCH (lazy) ===== */}
        {activeView === 'flow' && (
          <Suspense fallback={<div className="panel panel-hint" style={{ margin: '1rem' }}>Loading Sketch…</div>}>
            <SketchView
              locale={locale}
              navDir={navDir}
              activeProject={activeProject}
              projectDeadline={projectDeadline}
              completedCount={completedCount}
              deskTasks={deskTasks}
              doneTasks={doneTasks}
              queueTasks={queueTasks}
              nextTask={nextTask}
              stepFocusKey={stepFocusKey}
              setStepFocusKey={setStepFocusKey}
              showHowItWorks={showHowItWorks}
              hideHowItWorks={hideHowItWorks}
              openBreakdown={openBreakdown}
              journeyNext={journeyNext}
              setActiveView={setActiveView}
              flashToast={flashToast}
              flashMicro={flashMicro}
              notifyAction={notifyAction}
              quickInput={quickInput}
              setQuickInput={setQuickInput}
              captureEnergy={captureEnergy}
              setCaptureEnergy={setCaptureEnergy}
              captureDue={captureDue}
              setCaptureDue={setCaptureDue}
              captureOptionsOpen={captureOptionsOpen}
              setCaptureOptionsOpen={setCaptureOptionsOpen}
              handleCapture={addQuickTask}
              queueCollapsed={queueCollapsed}
              queueOpen={queueOpen}
              setQueueOpen={setQueueOpen}
              doneOpen={doneOpen}
              setDoneOpen={setDoneOpen}
              toggleTask={toggleTask}
              updateTaskTitle={updateTaskTitle}
              updateTaskMeta={updateTaskMeta}
              updateTaskWhy={updateTaskWhy}
              removeTask={removeTask}
              breakIntoSteps={breakIntoSteps}
              setTaskDueDate={setTaskDueDate}
              stepDueOpen={stepDueOpen}
              setStepDueOpen={setStepDueOpen}
              completeCurrentStep={completeCurrentStep}
              startVoice={startVoice}
            />
          </Suspense>
        )}

        {/* ===== RESEARCH (lazy) ===== */}
        {activeView === 'studio' && (
          <Suspense fallback={<div className="panel panel-hint" style={{ margin: '1rem' }}>Loading Research…</div>}>
            <ResearchView
              locale={locale}
              navDir={navDir}
              deskMood={deskMood}
              activeProjectId={activeProjectId}
              brandWords={activeProject?.detective?.brandWords || ''}
              projectPalette={projectPalette}
              forcedBreak={forcedBreak}
              setActiveView={setActiveView}
              flashToast={flashToast}
              flashMicro={flashMicro}
              notifyAction={notifyAction}
              setSessionComplete={setSessionComplete}
              setFocusLeft={setFocusLeft}
              setPomodoroWorkStartedAt={setPomodoroWorkStartedAt}
              setIsFocusRunning={setIsFocusRunning}
              setTimerFocusSource={setTimerFocusSource}
            />
          </Suspense>
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
              decisionLog={activeProject?.decisionLog || []}
              sparksTried={sparksTried || 0}
              locale={locale}
              flashMicro={flashMicro}
              addTask={addTask}
              projectId={activeProjectId}
              i18nT={(key) => i18nT(locale, key)}
              projectGoal={
                activeProject?.detective?.goal ||
                activeProject?.brief ||
                ''
              }
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
              timerFocusSource={timerFocusSource}
              setTimerFocusSource={setTimerFocusSource}
              locale={locale}
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
        {/* ===== DESIGN (lazy) ===== */}
        {activeView === 'brand' && (
          <Suspense fallback={<div className="panel panel-hint" style={{ margin: '1rem' }}>Loading Design…</div>}>
            <DesignView
              locale={locale}
              navDir={navDir}
              activeProject={activeProject}
              deskMood={deskMood}
              projectPalette={projectPalette}
              hidePackWatermark={hidePackWatermark}
              setActiveView={setActiveView}
              flashToast={flashToast}
              flashMicro={flashMicro}
              brandEditSection={brandEditSection}
              setBrandEditSection={setBrandEditSection}
            />
          </Suspense>
        )}

        {/* ===== REVIEW (lazy) ===== */}
        {activeView === 'review' && (
          <Suspense fallback={<div className="panel panel-hint" style={{ margin: '1rem' }}>Loading Review…</div>}>
            <ReviewView
              locale={locale}
              navDir={navDir}
              activeProject={activeProject}
              deskMood={deskMood}
              projectPalette={projectPalette}
              pathRows={pathRows}
              pathDoneCount={pathDoneCount}
              pathMissingLabelsList={pathMissingLabelsList}
              pathNextGap={pathNextGap}
              hidePackWatermark={hidePackWatermark}
              setActiveView={setActiveView}
              goToProcessStep={goToProcessStep}
              goSystemSection={goSystemSection}
              buildCurrentBrandPack={buildCurrentBrandPack}
              flashToast={flashToast}
              flashMicro={flashMicro}
              toggleBodyDoubling={toggleBodyDoubling}
              bodyDoubling={bodyDoubling}
            />
          </Suspense>
        )}

        {/* ===== DELIVER (lazy) ===== */}
        {activeView === 'finish' && (
          <Suspense fallback={<div className="panel panel-hint" style={{ margin: '1rem' }}>Loading Deliver…</div>}>
            <DeliverView
              locale={locale}
              navDir={navDir}
              activeProject={activeProject}
              deskMood={deskMood}
              deskTasks={deskTasks}
              completedCount={completedCount}
              projectPalette={projectPalette}
              pathRows={pathRows}
              pathDoneCount={pathDoneCount}
              pathMissingLabelsList={pathMissingLabelsList}
              pathNextGap={pathNextGap}
              leaveBehindThin={leaveBehindThin}
              hidePackWatermark={hidePackWatermark}
              setActiveView={setActiveView}
              goToProcessStep={goToProcessStep}
              goSystemSection={goSystemSection}
              buildCurrentBrandPack={buildCurrentBrandPack}
              setPref={setPref}
              runExport={runExport}
              openExportPanel={openExportPanel}
              flashToast={flashToast}
              handleSignOut={handleSignOut}
              downloadDataBackup={downloadDataBackup}
              createNewProject={createNewProject}
              notifyAction={notifyAction}
              CLOUD={CLOUD}
              lastExportNote={lastExportNote}
            />
          </Suspense>
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
        {/* ===== DEFINE (lazy) ===== */}
        {activeView === 'project' && (
          <Suspense fallback={<div className="panel panel-hint" style={{ margin: '1rem' }}>Loading Define…</div>}>
            <DefineView
              locale={locale}
              navDir={navDir}
              activeProject={activeProject}
              nextTask={nextTask}
              deskMood={deskMood}
              deskTasks={deskTasks}
              projectPalette={projectPalette}
              projects={projects}
              projectNameDraft={projectNameDraft}
              setProjectNameDraft={setProjectNameDraft}
              setActiveView={setActiveView}
              flashToast={flashToast}
              flashMicro={flashMicro}
              updateDetective={updateDetective}
              applyDetectiveToBrief={applyDetectiveToBrief}
              setProjectDeadline={setProjectDeadline}
              handleDeleteProject={handleDeleteProject}
              renameProject={renameProject}
              createNewProject={createNewProject}
              selectProject={selectProject}
              goSystemSection={goSystemSection}
              completedCount={completedCount}
              projectPills={projectPills}
              projectDeadline={projectDeadline}
              quickInput={quickInput}
              setQuickInput={setQuickInput}
              addQuickTask={addQuickTask}
            />
          </Suspense>
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

      {resumeBanner && activeView !== 'home' && (
        <div
          className={`resume-banner${resumeBanner.afterBreak ? ' is-after-break' : ''}${resumeBanner.rejoinTimer ? ' is-timer' : ''}`}
          role="status"
        >
          <div className="resume-banner-copy">
            <p className="resume-banner-body">
              <strong>{resumeBanner.name}</strong>
              {resumeBanner.afterBreak
                ? ` · ${i18nT(locale, 'ui.resumeAfterBreak') || 'Break done — pick up here'}`
                : resumeBanner.rejoinTimer
                  ? ` · ${i18nT(locale, 'ui.resumeTimerRunning') || 'Timer still running'}`
                  : resumeBanner.viewLabel
                    ? ` · ${resumeBanner.viewLabel}`
                    : ''}
              {resumeBanner.step
                ? ` · Next: ${String(resumeBanner.step).slice(0, 48)}${
                    String(resumeBanner.step).length > 48 ? '…' : ''
                  }`
                : !resumeBanner.decisionLine
                  ? ` · ${i18nT(locale, 'ui.resumeCaptureHint') || 'Capture a step on Sketch'}`
                  : ''}
            </p>
            {resumeBanner.decisionLine ? (
              <p className="resume-banner-decision">
                {resumeBanner.decisionLine}
              </p>
            ) : null}
          </div>
          <div className="resume-banner-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                const view =
                  resumeBanner.view ||
                  (resumeBanner.step ? 'flow' : 'project')
                setActiveView(view)
                focusPathGapField(view)
                setResumeBanner(null)
              }}
            >
              {i18nT(locale, 'ui.resumeContinue') || 'Continue'}
              {resumeBanner.viewLabel ? ` · ${resumeBanner.viewLabel}` : ''}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setResumeBanner(null)}
            >
              {i18nT(locale, 'ui.resumeDismiss') || 'Dismiss'}
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
            <div className="command-list-wrap">
              <div
                className="command-list"
                role="listbox"
                aria-label="Commands"
              >
                {commandFiltered.length === 0 && (
                  <p className="command-empty">No matches</p>
                )}
                {commandSections.map((sec) => (
                  <div key={sec.id} className="command-section" role="group">
                    <div className="command-section-label" aria-hidden="true">
                      {sec.label}
                    </div>
                    <ul className="command-section-list">
                      {sec.items.map((a) => (
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
                            <span className="command-item-label">{a.label}</span>
                            {a.hint ? <kbd>{a.hint}</kbd> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <p className="panel-hint command-footer-hint">
              Enter runs the first match · scroll for Path &amp; Tools · Esc
              closes
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
                <kbd>G</kbd> / path <strong>N/7</strong> / strip → next empty step
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
              Keys work when you are not typing in a field. One next-gap
              system: keyboard G, path pill, and under-path strip.
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
                flashToast(i18nT(locale, 'ui.forceBreaksOn'))
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
                flashToast(i18nT(locale, 'ui.forceBreaksOff'))
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
            goal:
              activeProject?.detective?.goal ||
              activeProject?.brief ||
              '',
            audience: activeProject?.detective?.audience || '',
            pathDoneCount,
            nextGapLabel: pathNextGap
              ? pathLabel(locale, pathNextGap.id) || pathNextGap.label
              : '',
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
