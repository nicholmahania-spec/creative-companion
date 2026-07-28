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
import { projectsShellEqual } from './lib/storeSelectors'
import PathViewSkeleton from './components/PathViewSkeleton'

import { DEFAULT_PALETTE } from './lib/color'
import { clampFocusMaskPct } from './lib/uiPrefs'
import { trackExportAction } from './lib/analytics'
import ErrorBoundary from './components/error/ErrorBoundary'
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
const ActivityTable = lazy(() => import('./components/dashboard/ActivityTable'))
const InsightsView = lazy(() => import('./views/InsightsView'))
const CalendarView = lazy(() => import('./views/CalendarView'))
const ClientsView = lazy(() => import('./views/ClientsView'))
const SettingsView = lazy(() => import('./views/SettingsView'))
const SparkView = lazy(() => import('./views/SparkView'))
const ResearchView = lazy(() => import('./views/ResearchView'))
const SketchView = lazy(() => import('./views/SketchView'))
const DefineView = lazy(() => import('./views/DefineView'))
const DesignView = lazy(() => import('./views/DesignView'))
const ReviewView = lazy(() => import('./views/ReviewView'))
const DeliverView = lazy(() => import('./views/DeliverView'))
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
  focusPathGapField,
} from './lib/sessionResume'
import { awardAndBroadcast } from './lib/buddyGame'
import {
  JOURNEY_STEPS,
  PATH_STEP_COUNT,
  PATH_VIEWS,
  labelForView,
  journeyIdForView,
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
import PathStepIcon from './components/PathStepIcon'
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
  printCurrentPage,
  slugifyFilename,
} from './lib/exportFiles'
import LogoLockup from './components/LogoLockup'
import StepDependencyReminder from './components/StepDependencyReminder'
import BeforeAfterChip from './components/BeforeAfterChip'
import BeforeAfterOverlay from './components/BeforeAfterOverlay'
import HeaderIcon from './components/HeaderIcon'
import PullToRefresh from './components/PullToRefresh'
import HighlightExplain from './components/HighlightExplain'
import { RunningTodoAddModal, RunningTodoPanel } from './components/RunningTodo'
import { HoursInvoicePanel } from './components/HoursInvoice'
import { WorkLogPanel } from './components/WorkLogPanel'
import { DiscoveryBriefPanel } from './components/DiscoveryBrief'
import { ProjectOverviewSharePanel } from './components/ProjectOverviewShare'
import {
  ClientInboxChip,
  ClientInboxPanel,
  useClientInbox,
} from './components/ClientInbox'
import { guessRunningTodoStage } from './lib/runningTodoStages'
import { installAutoGrow } from './lib/autoGrow'
import {
  normalizeLocale,
  t as i18nT,
  pathLabel,
  pathPlain,
  tFormat,
  localeDir,
} from './lib/i18n'
import { useModalFocus } from './lib/useModalFocus'
import useIsMobile from './lib/useIsMobile'
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
  // projects: ignore detective/discovery for equality so Define typing does
  // not re-render this entire shell (DefineView reads detective itself).
  const projects = useAppStore((s) => s.projects, projectsShellEqual)
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const tasks = useAppStore((s) => s.tasks)
  const moodItems = useAppStore((s) => s.moodItems)
  const theme = useAppStore((s) => s.theme)
  const bodyDoubling = useAppStore((s) => s.bodyDoubling)
  const onboarded = useAppStore((s) => s.onboarded)
  const currentSpark = useAppStore((s) => s.currentSpark)
  const sparkIndex = useAppStore((s) => s.sparkIndex)
  const sparksTried = useAppStore((s) => s.sparksTried)
  // Actions are stable — bind once via getState so we do not hold 40+ action
  // subscriptions on the god shell.
  const setCurrentProject = useCallback(
    (...a) => useAppStore.getState().setCurrentProject(...a),
    []
  )
  const updateProjectBrief = useCallback(
    (...a) => useAppStore.getState().updateProjectBrief(...a),
    []
  )
  const updateDetective = useCallback(
    (...a) => useAppStore.getState().updateDetective(...a),
    []
  )
  const updateDirection = useCallback(
    (...a) => useAppStore.getState().updateDirection(...a),
    []
  )
  const setProjectPalette = useCallback(
    (...a) => useAppStore.getState().setProjectPalette(...a),
    []
  )
  const bumpDesignVersion = useCallback(
    (...a) => useAppStore.getState().bumpDesignVersion(...a),
    []
  )
  const toggleTheme = useCallback(
    (...a) => useAppStore.getState().toggleTheme(...a),
    []
  )
  const setBodyDoubling = useCallback(
    (...a) => useAppStore.getState().setBodyDoubling(...a),
    []
  )
  const toggleBodyDoubling = useCallback(
    (...a) => useAppStore.getState().toggleBodyDoubling(...a),
    []
  )
  const setOnboarded = useCallback(
    (...a) => useAppStore.getState().setOnboarded(...a),
    []
  )
  const addTask = useCallback((...a) => useAppStore.getState().addTask(...a), [])
  const toggleTask = useCallback(
    (...a) => useAppStore.getState().toggleTask(...a),
    []
  )
  const updateTaskTitle = useCallback(
    (...a) => useAppStore.getState().updateTaskTitle(...a),
    []
  )
  const updateTaskMeta = useCallback(
    (...a) => useAppStore.getState().updateTaskMeta(...a),
    []
  )
  const updateTaskWhy = useCallback(
    (...a) => useAppStore.getState().updateTaskWhy(...a),
    []
  )
  const removeTask = useCallback(
    (...a) => useAppStore.getState().removeTask(...a),
    []
  )
  const breakIntoSteps = useCallback(
    (...a) => useAppStore.getState().breakIntoSteps(...a),
    []
  )
  const addMoodPin = useCallback(
    (...a) => useAppStore.getState().addMoodPin(...a),
    []
  )
  const nextSpark = useCallback(
    (...a) => useAppStore.getState().nextSpark(...a),
    []
  )
  const oppositeSpark = useCallback(
    (...a) => useAppStore.getState().oppositeSpark(...a),
    []
  )
  const createNewProject = useCallback(
    (...a) => useAppStore.getState().createNewProject(...a),
    []
  )
  const addMicroStepsBatch = useCallback(
    (...a) => useAppStore.getState().addMicroStepsBatch(...a),
    []
  )
  const setProjectDeadline = useCallback(
    (...a) => useAppStore.getState().setProjectDeadline(...a),
    []
  )
  const setTaskDueDate = useCallback(
    (...a) => useAppStore.getState().setTaskDueDate(...a),
    []
  )
  const prefs = useAppStore((s) => s.prefs) || {}
  const setPref = useCallback((...a) => useAppStore.getState().setPref(...a), [])
  const exportAllData = useCallback(
    (...a) => useAppStore.getState().exportAllData(...a),
    []
  )
  const importAllData = useCallback(
    (...a) => useAppStore.getState().importAllData(...a),
    []
  )
  const hydrateFromPayload = useCallback(
    (...a) => useAppStore.getState().hydrateFromPayload(...a),
    []
  )
  const applyImageUrlReplacements = useCallback(
    (...a) => useAppStore.getState().applyImageUrlReplacements(...a),
    []
  )
  const clearAllData = useCallback(
    (...a) => useAppStore.getState().clearAllData(...a),
    []
  )
  const clearToEmpty = useCallback(
    (...a) => useAppStore.getState().clearToEmpty(...a),
    []
  )
  const renameProject = useCallback(
    (...a) => useAppStore.getState().renameProject(...a),
    []
  )
  const setLogoImage = useCallback(
    (...a) => useAppStore.getState().setLogoImage(...a),
    []
  )
  const setProjectLastView = useCallback(
    (...a) => useAppStore.getState().setProjectLastView(...a),
    []
  )
  const isMobileViewport = useIsMobile()
  const deleteProject = useCallback(
    (...a) => useAppStore.getState().deleteProject(...a),
    []
  )
  const archiveProject = useCallback(
    (...a) => useAppStore.getState().archiveProject(...a),
    []
  )
  const unarchiveProject = useCallback(
    (...a) => useAppStore.getState().unarchiveProject(...a),
    []
  )
  const breakKit = useAppStore((s) => s.breakKit)
  const conceptItems = useAppStore((s) => s.conceptItems)
  const completeBreakKitItem = useCallback(
    (...a) => useAppStore.getState().completeBreakKitItem(...a),
    []
  )
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
    // Focus Mode product removed — never land on *-focus views.
    let next = view
    if (typeof next === 'string' && next.endsWith('-focus')) {
      const map = {
        'define-focus': 'project',
        'research-focus': 'studio',
        'ideate-focus': 'spark',
        'sketch-focus': 'flow',
        'design-focus': 'brand',
        'review-focus': 'review',
        'deliver-focus': 'finish',
      }
      next = map[next] || 'home'
    }
    setActiveViewRaw(next)
    try {
      if (next) localStorage.setItem('cc-active-view', String(next))
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

  /* Seconds worked in the current run, counting UP. `focusLeft` counts DOWN
     toward a forced break — that is the Pomodoro, a different job — and
     showing it made the chip read as a deadline you were losing rather than
     a record of what you had done. Ticked by the same interval that runs the
     countdown, so it advances only while the clock is genuinely running:
     never during a forced break, and never across an idle pause. */
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const sessionLabel = (() => {
    const m = Math.floor(sessionSeconds / 60)
    if (m < 1) return 'just started'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    const rem = m % 60
    return rem ? `${h}h ${rem}m` : `${h}h`
  })()
  const forcedBreakRef = useRef(null)
  forcedBreakRef.current = forcedBreak
  /** View to restore after forced break ends */
  const preBreakViewRef = useRef(null)
  const [showCreativeReset, setShowCreativeReset] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardName, setOnboardName] = useState('')
  const [onboardBrief, setOnboardBrief] = useState('')
  const [onboardFirstStep, setOnboardFirstStep] = useState('')
  const [recentUndo, setRecentUndo] = useState(null)
  const [exportPanel, setExportPanel] = useState(null)
  const [exportBusy, setExportBusy] = useState(false)
  /** Sync guard so sequential await runExport() does not re-enter on stale React state. */
  const exportBusyRef = useRef(false)
  const [lastExportNote, setLastExportNote] = useState('')
  /** @type {null | { kind: string, label: string, onConfirm: () => void }} */
  const [deskConfirm, setDeskConfirm] = useState(null)
  const [forceBreakConsentOpen, setForceBreakConsentOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [runningTodoPromptOpen, setRunningTodoPromptOpen] = useState(false)
  const [runningTodoPanelOpen, setRunningTodoPanelOpen] = useState(false)
  /** True when the add popup was opened by an explicit "Add to list" click,
   *  so it skips the "Anything to add?" yes/no gate. */
  const [runningTodoAddDirect, setRunningTodoAddDirect] = useState(false)
  const [researchAddOpen, setResearchAddOpen] = useState(false)
  const [hoursPanelOpen, setHoursPanelOpen] = useState(false)
  const [workLogPanelOpen, setWorkLogPanelOpen] = useState(false)
  const [discoveryPanelOpen, setDiscoveryPanelOpen] = useState(false)
  const [overviewSharePanelOpen, setOverviewSharePanelOpen] = useState(false)
  const [autoOpenPortalReview, setAutoOpenPortalReview] = useState(false)
  const [clientInboxOpen, setClientInboxOpen] = useState(false)
  const [demoTour, setDemoTour] = useState(null)
  const [navDir, setNavDir] = useState('none')
  const prevJourneyIdx = useRef(0)
  const [savePulse, setSavePulse] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [openProjectMenuId, setOpenProjectMenuId] = useState(null)
  const [beforeAfterOpen, setBeforeAfterOpen] = useState(false)
  const [restoreSelect, setRestoreSelect] = useState('')
  const [navOpen, setNavOpen] = useState(false)
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
  const toastBatchRef = useRef([])
  const toastBatchTimerRef = useRef(null)
  const toastTimeoutId = useRef(null)
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
  /** Which project's detail shows on the multi-project Home — separate from
   * currentProjectId so browsing the list doesn't switch the active project
   * until the user actually clicks Continue / Open Deliver. */
  const [homeSelectedProjectId, setHomeSelectedProjectId] = useState(null)
  const [syncState, setSyncState] = useState('idle') // idle | syncing | ok | error
  const [syncError, setSyncError] = useState('')
  /** Which direction last failed — decides what "Retry" actually retries */
  const [syncErrorSource, setSyncErrorSource] = useState('push') // 'pull' | 'push'
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNext, setPwNext] = useState('')
  const [buddyWinPulse, setBuddyWinPulse] = useState(0)
  /** Pomodoro → Helper: open Break care (scripted) without requiring Helper on all the time. */
  const [helperBreakCare, setHelperBreakCare] = useState({
    open: false,
    minutes: 0,
  })
  const moreWrapRef = useRef(null)
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
  const runningTodo = activeProject?.runningTodo || null
  // Open items only — never "3 of 11". A denominator turns a next-action cue
  // into a progress verdict, which invites the "I'm behind" read.
  const openTodoCount = (runningTodo?.items || []).filter((it) => !it.completed).length
  const addRunningTodoItem = useCallback(
    (...a) => useAppStore.getState().addRunningTodoItem(...a),
    []
  )
  const toggleRunningTodoItem = useCallback(
    (...a) => useAppStore.getState().toggleRunningTodoItem(...a),
    []
  )
  const removeRunningTodoItem = useCallback(
    (...a) => useAppStore.getState().removeRunningTodoItem(...a),
    []
  )
  const sortRunningTodo = useCallback(
    (...a) => useAppStore.getState().sortRunningTodo(...a),
    []
  )
  const resetRunningTodoIfNewDay = useCallback(
    (...a) => useAppStore.getState().resetRunningTodoIfNewDay(...a),
    []
  )
  const setHourlyRate = useCallback(
    (...a) => useAppStore.getState().setHourlyRate(...a),
    []
  )
  const addTimeEntry = useCallback(
    (...a) => useAppStore.getState().addTimeEntry(...a),
    []
  )
  const removeTimeEntry = useCallback(
    (...a) => useAppStore.getState().removeTimeEntry(...a),
    []
  )
  const removeWorkEntry = useCallback(
    (...a) => useAppStore.getState().removeWorkEntry(...a),
    []
  )
  const updateDiscoveryField = useCallback(
    (...a) => useAppStore.getState().updateDiscoveryField(...a),
    []
  )
  const setDiscoveryUpload = useCallback(
    (...a) => useAppStore.getState().setDiscoveryUpload(...a),
    []
  )
  const setDiscoveryShare = useCallback(
    (...a) => useAppStore.getState().setDiscoveryShare(...a),
    []
  )
  const mergeDiscoveryAnswers = useCallback(
    (...a) => useAppStore.getState().mergeDiscoveryAnswers(...a),
    []
  )
  const setClientPortalId = useCallback(
    (...a) => useAppStore.getState().setClientPortalId(...a),
    []
  )
  const mergeDetectiveAnswers = useCallback(
    (...a) => useAppStore.getState().mergeDetectiveAnswers(...a),
    []
  )
  const portalSeen = useAppStore((s) => s.portalSeen)
  const markPortalSeen = useCallback(
    (...a) => useAppStore.getState().markPortalSeen(...a),
    []
  )

  // Textareas grow to fit their content instead of carrying a resize grip.
  // No-ops entirely in browsers with native `field-sizing` (the CSS handles
  // it there); this only installs the JS sizer for the ones without it.
  useEffect(() => installAutoGrow(), [])

  /* Follow the OS colour scheme until the user pins a theme. Applied on load
     because a persisted workspace carries whatever theme was stored — usually
     the old hard-coded 'deep' that nobody actually chose — and applied live,
     because switching your machine to light at dusk should carry the app with
     it rather than leaving one window bright against everything else.
     `themeSource: 'user'` stops both, so an explicit choice is never
     overruled. */
  const applyDeviceTheme = useCallback(
    (...a) => useAppStore.getState().applyDeviceTheme(...a),
    []
  )
  useEffect(() => {
    applyDeviceTheme?.()
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyDeviceTheme?.()
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [applyDeviceTheme])

  // Every time a project is opened: clear yesterday's completed to-dos, if
  // the day rolled over. Housekeeping only — nothing is shown to the user.
  //
  // This used to also auto-open the "Anything to add?" modal. The seen-key
  // only ever suppressed the FIRST open of a given project, so from the
  // second open onward it interrupted every single arrival and every project
  // switch. A prompt whose answer is always the same is not a prompt, it is
  // a toll: it costs a decision on every visit and returns nothing, which is
  // the decision-fatigue failure this project treats as non-negotiable.
  // The user's own words: "i feel like i wont use it but i will always
  // dismiss."
  //
  // Nothing is lost. The running list keeps its permanent entry points — the
  // to-do FAB ("Open your to-do list") and the header pill — and the panel's
  // own "Add" button still opens this same popup on request, in its
  // skipAsk form. Capability on demand, no interruption.
  useEffect(() => {
    if (!activeProjectId) return
    resetRunningTodoIfNewDay(activeProjectId)
  }, [activeProjectId, resetRunningTodoIfNewDay])

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
  /** Leave-behind can still be thin when every path step looks full */
  const leaveBehindThin = useMemo(() => {
    const pack = buildBrandPackSnapshot({
      project: activeProject,
      tasks: deskTasks,
      moodItems: deskMood,
      palette: projectPalette,
    })
    return !!packReadiness(pack).thin
  }, [activeProject, deskTasks, deskMood, projectPalette])
  /** Path steps full ≠ pack ready — Home must not overclaim ship readiness. */
  const pathStepsFull = pathDoneCount >= PATH_STEP_COUNT
  const brandBookReady = pathStepsFull && !leaveBehindThin
  const completedCount = doneTasks.length

  const projectDeadline = activeProject?.deadline || ''

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

  /** Client activity, across every project. Polls only while cloud sync is
   *  configured; the chip degrades to a plain "sign in" prompt otherwise. */
  const clientInbox = useClientInbox({
    enabled: CLOUD,
    projects,
    seen: portalSeen,
  })

  /** Opening an inbox item takes you to the thing it's about — switching
   *  project first if the item belongs to a different one, so the context
   *  never has to be reassembled by hand. */
  const goToInboxTarget = useCallback(
    (row) => {
      if (!row) return
      const target = projects.find((p) => String(p.id) === String(row.projectLocalId))
      if (target && String(target.id) !== String(currentProjectId)) setCurrentProject(target.id)
      if (row.targetView) setActiveView(row.targetView)
    },
    [projects, currentProjectId, setCurrentProject]
  )

  const openInboxPortal = useCallback(
    (row) => {
      if (row) {
        const target = projects.find((p) => String(p.id) === String(row.projectLocalId))
        if (target && String(target.id) !== String(currentProjectId)) setCurrentProject(target.id)
      }
      // A form-submission row's button says "Open their answers" — it used
      // to always land on the general Portal management screen (step
      // toggles, chat log) with the actual answers one more buried button
      // away, which didn't match what the button promised.
      setAutoOpenPortalReview(row?.kind === 'form')
      setOverviewSharePanelOpen(true)
    },
    [projects, currentProjectId, setCurrentProject]
  )

  // Seed missing project palettes
  useEffect(() => {
    if (!activeProject) return
    if (!activeProject.palette?.length) {
      setProjectPalette([...DEFAULT_PALETTE])
    }
  }, [activeProject?.id, activeProject?.palette, setProjectPalette])

  const hideHowItWorks = () => setPref('showHowItWorks', false)

  const toastMode = prefs.toastMode === 'all' ? 'all' : 'quiet'
  /** Seconds non-error toasts queue before flushing together; 0 = show instantly (default) */
  const toastBatchWindow = Number(prefs.toastBatchWindow) || 0

  /** Readable dwell time: ~450ms/word, floor 3.2s, cap 7s (WCAG-friendly). */
  const toastDuration = (msg) => {
    const words = String(msg || '').trim().split(/\s+/).filter(Boolean).length
    return Math.min(7000, Math.max(3200, words * 450))
  }

  /** @param {string} msg @param {{ micro?: boolean, important?: boolean }} [opts] */
  const flashToast = (msg, opts = {}) => {
    if (!msg) return
    // Clear any existing timeout to prevent accumulation
    if (toastTimeoutId.current !== null) {
      window.clearTimeout(toastTimeoutId.current)
      toastTimeoutId.current = null
    }
    // Quiet (default): skip micro successes; always show important/errors
    if (toastMode === 'quiet' && opts.micro && !opts.important) return
    if (toastBatchWindow > 0 && !opts.important) {
      toastBatchRef.current.push(msg)
      if (toastBatchTimerRef.current) window.clearTimeout(toastBatchTimerRef.current)
      toastBatchTimerRef.current = window.setTimeout(() => {
        const batched = toastBatchRef.current
        toastBatchRef.current = []
        toastBatchTimerRef.current = null
        const shown =
          batched.length > 1 ? `${batched[0]} · +${batched.length - 1} more` : batched[0]
        setActionToast(shown)
        toastTimeoutId.current = window.setTimeout(() => setActionToast(''), toastDuration(shown))
      }, toastBatchWindow * 1000)
      return
    }
    setActionToast(msg)
    toastTimeoutId.current = window.setTimeout(() => setActionToast(''), toastDuration(msg))
  }

  /** Micro feedback — only when user enables “All toasts” */
  const flashMicro = (msg) => flashToast(msg, { micro: true })

  /** Award progress in background; only append band points when strip is on */
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
      flashToast(`${baseMsg} · band ${g.newLevel}`)
    } else if (showProgress && g?.gained) {
      flashToast(`${baseMsg} · +${g.gained}`)
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

  /** Open a project where the user actually left it. Jumping to a computed
   * "first gap" drops them somewhere they didn't choose — if you stopped
   * mid-Sketch, being teleported to Research costs a re-orientation every
   * time. Gap-jumping stays on the explicitly labelled Continue button. */
  // Record the journey view in play so a later switch back can resume it.
  useEffect(() => {
    if (!activeProjectId) return
    if (!JOURNEY_STEPS.some((st) => st.view === activeView)) return
    setProjectLastView(activeProjectId, activeView)
  }, [activeProjectId, activeView, setProjectLastView])

  const openProjectWhereLeftOff = useCallback(
    (projectId) => {
      const target = (projects || []).find((p) => p.id === projectId)
      setCurrentProject(projectId)
      setActiveView(target?.lastView || 'project')
      setNavOpen(false)
    },
    [projects, setCurrentProject, setActiveView]
  )

  /** Filled after runExport is defined — export actions ref this. */
  const runExportRef = useRef(/** @type {null | ((kind: string) => void)} */ (null))

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
        const mood = (moodItems || []).filter((m) =>
          sameProjectId(m.projectId, p.id)
        )
        const pTasks = (tasks || []).filter((t) =>
          sameProjectId(t.projectId, p.id)
        )
        const palette = p.palette?.length > 0 ? p.palette : DEFAULT_PALETTE
        const ctx = {
          project: p,
          moodItems: mood,
          tasks: pTasks,
          sparkIndex,
          palette,
        }
        const rows = pathProgressSummary(JOURNEY_STEPS, ctx)
        const pack = buildBrandPackSnapshot({
          project: p,
          tasks: pTasks,
          moodItems: mood,
          palette,
        })
        const packThin = !!packReadiness(pack).thin
        const doneCount = rows.filter((r) => r.done).length
        return {
          project: p,
          rows,
          doneCount,
          nextGap: pathFirstGap(JOURNEY_STEPS, ctx),
          pathFull: doneCount >= PATH_STEP_COUNT,
          packReady: doneCount >= PATH_STEP_COUNT && !packThin,
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

  // Keyboard: Esc dismiss overlays (priority: topmost first)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key !== 'Escape') return
      // Topmost dialogs first
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
      setShowCreativeReset(false)
      // Ask Helper to tuck if expanded
      window.dispatchEvent(new CustomEvent('cc-helper-minimize'))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [
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

    // User turned lockouts off — soft landing only (Helper still coaches)
    if (!forceBreaksEnabledRef.current) {
      setIsFocusRunning(false)
      setSessionComplete(true)
      setPomodoroWorkStartedAt(null)
      markBreak()
      playBreakChime()
      setHelperBreakCare({ open: true, minutes: breakMin })
      flashToast(
        tFormat(locale, 'ui.workBlockDoneSoft', {
          min: Math.round(workMin),
        })
      )
      return
    }

    // First lockout: bottom consent once; later use Settings if still off
    if (!prefs.forceBreaksConsented) {
      setIsFocusRunning(false)
      setSessionComplete(true)
      setPomodoroWorkStartedAt(null)
      markBreak()
      playBreakChime()
      setHelperBreakCare({ open: true, minutes: breakMin })
      if (!prefs.forceBreaksExplained) {
        setPref('forceBreaksExplained', true)
        setForceBreakConsentOpen(true)
        flashToast(i18nT(locale, 'ui.forceBreaksReview'))
      }
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
    // Remember path view so unlock returns user where they were
    preBreakViewRef.current = activeView
    // Pomodoro is Helper's job: open Break kit alongside the lock overlay
    setHelperBreakCare({ open: true, minutes: breakMin })
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
    setHelperBreakCare({ open: false, minutes: 0 })
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

  /** Split the bank when the active project changes mid-stretch. */
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
  const getDeskConfirmRoot = useCallback(
    () => document.querySelector('.desk-confirm-modal'),
    []
  )
  const getShortcutsRoot = useCallback(
    () => document.querySelector('.shortcuts-overlay'),
    []
  )
  const getDemoTourRoot = useCallback(
    () => document.querySelector('.demo-tour-overlay'),
    []
  )
  const getCreativeResetRoot = useCallback(
    () => document.querySelector('.reset-panel')?.closest('.export-overlay') || null,
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
  // Destructive/blocking confirm: land focus on Cancel (safe default), trap Tab
  useModalFocus(!!deskConfirm, getDeskConfirmRoot, {
    initialSelector: '.desk-confirm-cancel',
  })
  // Shortcuts panel: trap Tab and restore focus to the opener on close.
  useModalFocus(shortcutsOpen, getShortcutsRoot, {
    initialSelector: 'button',
  })
  useModalFocus(!!demoTour, getDemoTourRoot, {
    initialSelector: 'button',
  })
  useModalFocus(!!showCreativeReset, getCreativeResetRoot, {
    initialSelector: '.reset-row',
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
      if (n < 1 || n > JOURNEY_STEPS.length) return
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
    shortcutsOpen,
    nextTask,
    recentUndo,
    setActiveView,
    goToNextProcessGap,
  ])

  // Prefetch path view chunks while idle
  useEffect(() => {
    if (!unlocked || cloudHydrating) return undefined
    const warm = () => {
      void import('./views/DefineView')
      void import('./views/SketchView')
      void import('./views/ResearchView')
      void import('./views/DesignView')
      void import('./views/DeliverView')
    }
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warm, { timeout: 4500 })
      return () => window.cancelIdleCallback?.(id)
    }
    const timer = window.setTimeout(warm, 2200)
    return () => window.clearTimeout(timer)
  }, [unlocked, cloudHydrating])

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
      // Research timer runs 20 min, not the Pomodoro 25 — pick the right total
      // so worked-minutes (and the break length derived from it) stay honest
      const totalSec =
        focusH.source === 'research' ? 20 * 60 : POMODORO_WORK_MIN * 60
      setPomodoroWorkStartedAt(
        Date.now() - Math.max(0, totalSec - focusH.leftSec) * 1000
      )
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

    // Break finished while tab was closed → land on resume step + say so
    if (breakH?.expired) {
      clearForcedBreakSession()
      markBreak()
      const resume = breakH.resumeView
      if (resume) {
        setActiveView(resume)
        preBreakViewRef.current = resume
      }
      flashToast(
        i18nT(locale, 'ui.breakFinishedAway') ||
          'Break finished while you were away — pick up here',
        { important: true }
      )
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

  // Close More / Account / sidebar project menus on outside click / Escape
  useEffect(() => {
    if (!moreOpen && !openProjectMenuId) return
    const onPointer = (e) => {
      if (
        moreOpen &&
        moreWrapRef.current &&
        !moreWrapRef.current.contains(e.target)
      ) {
        setMoreOpen(false)
      }
      if (openProjectMenuId && !e.target.closest('.journey-project-row-menu-wrap')) {
        setOpenProjectMenuId(null)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMoreOpen(false)
        setOpenProjectMenuId(null)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen, openProjectMenuId])

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

  // Hard safety net: if cloud loading ever hangs (even past the 25s
  // per-request timeout in cloudSync.js — workspaces can run several MB),
  // never leave the user stuck on a dead screen with no way out. Short
  // delay matters most on flaky mobile networks, where this screen is
  // most likely to be seen.
  useEffect(() => {
    if (!cloudHydrating) {
      setShowHydratingEscape(false)
      return undefined
    }
    const t = window.setTimeout(() => setShowHydratingEscape(true), 3000)
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
        setSyncErrorSource('pull')
        setSyncError(result.error || 'Couldn’t load cloud desk')
        setCloudHydrating(false)
        cloudSyncReady.current = true
        return
      }
      if (result.payload && Array.isArray(result.payload.projects)) {
        skipNextCloudPush.current = true
        const hydrated = hydrateFromPayload(result.payload)
        if (hydrated.ok) {
          setSyncState('ok')
        } else {
          skipNextCloudPush.current = false
          setSyncState('error')
          setSyncErrorSource('pull')
          setSyncError(hydrated.error || 'Couldn’t load cloud desk')
        }
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
          if (push.ok) {
            applyImageUrlReplacements(push.replacements)
          } else {
            setSyncErrorSource('push')
            setSyncError(push.error || 'Couldn’t upload')
          }
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

  // Debounced push to Supabase when desk changes (local always saved via zustand)
  useEffect(() => {
    if (!CLOUD || !unlocked || !cloudUser || !cloudSyncReady.current) return
    if (skipNextCloudPush.current) {
      skipNextCloudPush.current = false
      return
    }
    if (cloudHydrating) return
    // Don't flip to "syncing" until the debounce fires — avoids flicker on every keystroke
    const t = window.setTimeout(async () => {
      setSyncState('syncing')
      const payload = exportAllData()
      const result = await pushWorkspace(payload)
      if (result.ok) {
        setSyncState('ok')
        setSyncError('')
        applyImageUrlReplacements(result.replacements)
      } else {
        setSyncState('error')
        setSyncError(result.error || 'Couldn’t sync')
      }
    }, 1600)
    return () => window.clearTimeout(t)
  }, [
    CLOUD,
    unlocked,
    cloudUser?.id,
    cloudHydrating,
    projects,
    tasks,
    moodItems,
    conceptItems,
    breakKit,
    sparkIndex,
    sparksTried,
    currentSpark,
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

  const commitHeaderProjectRename = () => {
    if (!activeProject) return
    const next = String(projectNameDraft || '').trim()
    if (!next) {
      setProjectNameDraft(activeProject.name || '')
      return
    }
    if (next === activeProject.name) return
    renameProject(activeProject.id, next)
    flashMicro('Name saved')
  }

  const [coverDropActive, setCoverDropActive] = useState(false)

  /** Lets a user drop their own image straight onto the export preview's
   * cover to use it as the brand book's cover art — same upload this project
   * already supports from Design → Logo, just reachable without navigating
   * away first. Doing nothing keeps the existing generic cover, so this adds
   * zero required steps. */
  const handleCoverImageDrop = (file) => {
    if (!file || !file.type?.startsWith('image/')) return
    if (file.size > 2.5 * 1024 * 1024) {
      flashToast('Cover image must be under 2.5MB')
      return
    }
    // Local data URL, downscaled like mood pins — protects localStorage quota
    const reader = new FileReader()
    reader.onerror = () =>
      flashToast('Could not read that image. Try another file.')
    reader.onload = async () => {
      try {
        const { downscaleDataUrl } = await import('./lib/moodPins')
        const scaled = await downscaleDataUrl(reader.result, file.type)
        setLogoImage(scaled)
        flashMicro('Cover image updated')
      } catch {
        setLogoImage(reader.result)
        flashMicro('Cover image updated')
      }
    }
    reader.readAsDataURL(file)
  }

  // Autosave pulse — skip first mount so load doesn’t flash “Saved”
  const savePulseReady = useRef(false)
  const storageBlockedRef = useRef(false)
  useEffect(() => {
    if (!savePulseReady.current) {
      savePulseReady.current = true
      return
    }
    if (storageBlockedRef.current) return
    setSavePulse(true)
    const t = window.setTimeout(() => setSavePulse(false), 1400)
    return () => window.clearTimeout(t)
  }, [tasks, moodItems, breakKit, activeProjectId, projects, theme, prefs])

  /** Browser storage full/failed — honest signal (store already dispatches). */
  useEffect(() => {
    const onStorageError = (ev) => {
      storageBlockedRef.current = true
      setSavePulse(false)
      const quota = !!ev?.detail?.quota
      flashToast(
        quota
          ? 'Browser storage is full — changes are not saving. Remove mood images or download a backup from Settings.'
          : 'Could not save to this browser — changes may be lost until storage works again.',
        { important: true }
      )
    }
    window.addEventListener('cc-storage-error', onStorageError)
    return () => window.removeEventListener('cc-storage-error', onStorageError)
  }, [])

  /** Capture a task. `navigate: false` keeps the user on the current view —
   * used by Define's inline capture, where jumping to Flow mid-brief threw
   * away chapter/scroll/focus state (interruption-recovery cost). */
  const addQuickTask = ({ navigate = true } = {}) => {
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
    if (navigate) setActiveView('flow')
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

  const finishOnboarding = (mode) => {
    if (mode === 'custom' && onboardName.trim()) {
      const brief = onboardBrief.trim() // optional; do not invent placeholder brief
      // First run: the workspace already holds one untouched blank project —
      // rename it instead of appending a stray empty "My project" lane.
      const st = useAppStore.getState()
      const only = st.projects.length === 1 ? st.projects[0] : null
      const untouchedBlank =
        only &&
        only.name === 'My project' &&
        !String(only.brief || '').trim() &&
        !(st.tasks || []).length
      let project
      if (untouchedBlank) {
        renameProject(only.id, onboardName.trim())
        if (brief) updateProjectBrief(brief)
        project = only
      } else {
        project = createNewProject(onboardName.trim(), brief)
        // First path stop is Research (studio); Strategy (project) is next.
      }
      // CRM identity lives in detective.clientName (not only project display name)
      updateDetective('clientName', onboardName.trim())
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
        why: '',
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
        updateDetective('clientName', onboardName.trim())
      }
      flashToast(i18nT(locale, 'ui.emptyDeskFirst'))
    }
    setOnboarded(true)
    localStorage.setItem('cc-onboarded', '1')
    setShowOnboarding(false)
    // Quiet first session — Helper stays off until user opts in (Tools or Settings)
    setBodyDoubling(false)
    // Path step 1 = Strategy (project brief); Research is next
    setActiveView('project')
    window.setTimeout(() => {
      const tryFocus = () => {
        const el =
          document.getElementById('detective-clientName') ||
          document.getElementById('detective-goal') ||
          document.querySelector('.define-start-here .btn-primary')
        if (!el) return false
        try {
          el.focus?.({ preventScroll: false })
          el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
        } catch {
          /* ignore */
        }
        return true
      }
      // DetectiveSheet is lazy; retry once after paint if first pass misses
      if (!tryFocus()) {
        window.setTimeout(tryFocus, 120)
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

  /**
   * Export one format. Returns a Promise so multi-format Focus Ship can await
   * each step (exportBusy used to no-op every call after the first).
   * @returns {Promise<{ ok?: boolean, busy?: boolean, cancelled?: boolean }>}
   */
  const runExport = (kind) => {
    if (exportBusyRef.current) return Promise.resolve({ ok: false, busy: true })
    exportBusyRef.current = true
    setExportBusy(true)
    /* Clear the note before the attempt, not after a failure.
       `setLastExportNote` was called only on success, so a re-export that
       failed left the PREVIOUS success on screen — "PDF saved · 3:15pm",
       persistent and still looking current — while the only sign of failure
       was a toast that dismisses itself. Miss the toast and you have been
       told the file exists. Clearing up front covers every failure and
       cancel branch, including ones added later. */
    setLastExportNote('')
    const pack = buildCurrentBrandPack()
    const slug = slugifyFilename(pack.projectName, 'brand-pack')
    const finishOk = (label) => {
      awardAndBroadcast('export_pack', { label })
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
      // Track export action
      trackExportAction(kind, true)
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
                  ? `creative-companion-backup-${toISODate()}.json`
                  : null
    const handlePromise = saveName
      ? captureSaveHandle(saveName, 'Creative Companion export')
      : null

    const clearBusy = () => {
      exportBusyRef.current = false
      setExportBusy(false)
    }

    if (kind === 'kit') {
      flashToast(i18nT(locale, 'ui.kitBuilding') || 'Building brand kit…', {
        important: true,
      })
      return (async () => {
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
        } else if (result.cancelled) {
          flashToast(i18nT(locale, 'ui.saveCancelled'))
          trackExportAction('kit', false)
        } else {
          flashToast(
            result.error || i18nT(locale, 'ui.downloadFailed') || 'Kit failed'
          )
          trackExportAction('kit', false)
        }
        return result
      })().finally(clearBusy)
    }

    if (kind === 'pdf') {
      // Vector direction pack (text + swatches as PDF primitives)
      void preloadPdfEngine()
      flashToast(i18nT(locale, 'ui.pdfBuilding'), { important: true })
      return (async () => {
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
        } else if (result.cancelled) {
          flashToast(i18nT(locale, 'ui.saveCancelled'))
          trackExportAction('pdf', false)
        } else {
          flashToast(result.error || i18nT(locale, 'ui.pdfFailed'))
          trackExportAction('pdf', false)
        }
        return result
      })().finally(clearBusy)
    }

    if (kind === 'pdf-preview') {
      // Raster snapshot matching on-screen artboard (optional)
      const hasSystem = document.getElementById('system-artboard')
      if (!hasSystem && !exportPanel) openExportPanel()
      void preloadPdfEngine()
      flashToast(i18nT(locale, 'ui.pdfPreviewing'), { important: true })
      return (async () => {
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
        } else if (result.cancelled) {
          flashToast(i18nT(locale, 'ui.saveCancelled'))
          trackExportAction('pdf-preview', false)
        } else {
          flashToast(result.error || i18nT(locale, 'ui.pdfFailed'))
          trackExportAction('pdf-preview', false)
        }
        return result
      })().finally(clearBusy)
    }

    if (kind === 'html') {
      return Promise.resolve(downloadBrandPackHtml(pack, handlePromise))
        .then((result) => {
          if (result.ok) {
            finishOk('Brand HTML')
          } else if (result.cancelled) {
            flashToast(i18nT(locale, 'ui.saveCancelled'))
            trackExportAction('html', false)
          } else {
            flashToast(result.error || i18nT(locale, 'ui.downloadFailed'))
            trackExportAction('html', false)
          }
          return result
        })
        .finally(clearBusy)
    }
    if (kind === 'md') {
      return Promise.resolve(downloadBrandPackMarkdown(pack, handlePromise))
        .then((result) => {
          if (result.ok) finishOk('Brand Markdown')
          else if (result.cancelled)
            flashToast(i18nT(locale, 'ui.saveCancelled'))
          else flashToast(result.error || i18nT(locale, 'ui.downloadFailed'))
          return result
        })
        .finally(clearBusy)
    }
    if (kind === 'json') {
      return Promise.resolve(downloadBrandPackJson(pack, handlePromise))
        .then((result) => {
          if (result.ok) finishOk('Brand JSON')
          else if (result.cancelled) {
            flashToast(i18nT(locale, 'ui.saveCancelled'))
            trackExportAction('json', false)
          } else {
            flashToast(result.error || i18nT(locale, 'ui.downloadFailed'))
            trackExportAction('json', false)
          }
          return result
        })
        .finally(clearBusy)
    }
    if (kind === 'backup') {
      const result = downloadWorkspaceBackup(exportAllData())
      if (result.ok) finishOk('Workspace backup')
      else {
        flashToast(result.error || i18nT(locale, 'ui.downloadFailed'))
        trackExportAction('backup', false)
      }
      clearBusy()
      return Promise.resolve(result)
    }
    if (kind === 'print') {
      if (!exportPanel) openExportPanel()
      return new Promise((resolve) => {
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
            setLastExportNote(
              `Print dialog · ${when} — Save as PDF if you want a file`
            )
            flashToast(i18nT(locale, 'ui.printDialogOpen'))
            trackExportAction('print', true)
          } else {
            flashToast(r.error || i18nT(locale, 'ui.printFailed'))
            trackExportAction('print', false)
          }
          clearBusy()
          resolve(r)
        }, exportPanel ? 50 : 180)
      })
    }
    flashToast(i18nT(locale, 'ui.unknownExport'))
    clearBusy()
    return Promise.resolve({ ok: false })
  }
  runExportRef.current = runExport

  const creativeResetItems = [
    {
      label: 'Break into micro-steps',
      action: () => {
        setShowCreativeReset(false)
        openBreakdown()
      },
    },
    {
      label: 'Current Sketch step',
      action: () => {
        setActiveView('flow')
        setShowCreativeReset(false)
      },
    },
    {
      label: 'Split step ×3',
      action: () => {
        if (nextTask && !nextTask.parentId) breakIntoSteps(nextTask.id)
        setActiveView('flow')
        setShowCreativeReset(false)
      },
    },
    {
      label: 'Spark',
      action: () => {
        setActiveView('spark')
        setShowCreativeReset(false)
      },
    },
    {
      label: '2-min timer',
      action: () => {
        resetFocus(2)
        setActiveView('insights')
        setShowCreativeReset(false)
      },
    },
    {
      label: 'Research board',
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
      flashToast?.('Voice is not supported in this browser.')
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
    awardAndBroadcast('breakdown', {
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
        'Load Soft Signal demo? Replaces workspace. Backup first if needed.',
      onConfirm: () => {
        setDeskConfirm(null)
        void runSoftSignalImport()
      },
    })
  }

  /** Full brand-guide sample — every brand-book chapter has content. */
  const runHarborHearthImport = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}demos/harbor-hearth-workspace.json`
      )
      if (!res.ok) throw new Error('Demo file missing')
      const data = await res.json()
      const result = importAllData(data)
      if (result.ok) {
        setBodyDoubling(true)
        setActiveView('finish')
        setDemoTour(null)
        notifyAction(
          'Harbor & Hearth demo loaded · open Pack for full brand book',
          'project_create',
          { label: 'Harbor & Hearth demo' }
        )
      } else {
        flashToast(result.error || i18nT(locale, 'ui.demoLoadFail'))
      }
    } catch (e) {
      flashToast(e?.message || 'Could not load Harbor & Hearth demo')
    }
  }

  const loadHarborHearthDemo = () => {
    setDeskConfirm({
      kind: 'demo',
      label:
        'Load Harbor & Hearth full brand guide demo? Replaces workspace. Backup first if needed.',
      onConfirm: () => {
        setDeskConfirm(null)
        void runHarborHearthImport()
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

  const handleDeleteProjectById = (id, name) => {
    if (!id) return
    if (projects.length <= 1) {
      flashToast(i18nT(locale, 'ui.keepOneProject'))
      return
    }
    const wasActive = id === activeProjectId
    setDeskConfirm({
      kind: 'delete-project',
      label: `${i18nT(locale, 'ui.deleteProjectConfirm')} (“${name}”)`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        const result = deleteProject(id)
        if (result.ok) {
          flashToast(i18nT(locale, 'ui.projectDeleted'))
          if (wasActive) setActiveView('project')
        } else {
          flashToast(result.error || i18nT(locale, 'ui.deleteFail'))
        }
        setDeskConfirm(null)
      },
    })
  }

  const handleDeleteProject = () => {
    if (!activeProject) return
    handleDeleteProjectById(activeProject.id, activeProject.name)
  }

  const handleArchiveProject = () => {
    if (!activeProject) return
    const active = (projects || []).filter((p) => !p.archived)
    if (active.length < 2) {
      flashToast(i18nT(locale, 'ui.keepOneProject'))
      return
    }
    const id = activeProject.id
    const name = activeProject.name
    setDeskConfirm({
      kind: 'archive-project',
      label: `Archive “${name}”? It moves out of your active list — you can restore it anytime from Define.`,
      confirmLabel: 'Archive',
      onConfirm: () => {
        const result = archiveProject(id)
        if (result?.ok) flashToast(i18nT(locale, 'ui.projectArchived') || 'Project archived')
        else flashToast(result?.error || i18nT(locale, 'ui.archiveFail') || 'Could not archive')
        setDeskConfirm(null)
      },
    })
  }

  const handleAddRunningTodoItem = (text) => {
    const currentStageId = journeyIdForView(activeView) || 'define'
    addRunningTodoItem(text, guessRunningTodoStage(text, currentStageId))
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
              Loading desk…
            </p>
            {showHydratingEscape && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '0.5rem' }}
                onClick={() => {
                  setCloudHydrating(false)
                  cloudSyncReady.current = true
                  setSyncState('error')
                  setSyncErrorSource('pull')
                  setSyncError('Cloud load slow — continued locally.')
                }}
              >
                Continue offline
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const journeyActive = journeyIdForView(activeView)
  const journeyNext = getNextJourney(activeView)

  return (
    <div
      className={`app app-shell ${theme} view-${activeView}${
        forcedBreak ? ' is-break-locked' : ''
      }${activeView === 'finish' ? ' is-pack-view' : ''}${
        prefs.focusRingStrength === 'high' ? ' focus-ring-high' : ''
      }${prefs.hideNavUntilBlur ? ' hide-nav-until-blur' : ''}${
        prefs.hideTips ? ' hide-tips-on' : ''
      }${
        navOpen ? ' nav-open' : ''
      }`}
      style={{
        /* Bounds live in lib/uiPrefs so the slider, the stored default and
           the applied value cannot drift apart. The floor is a legibility
           floor: masked fields are the user's own answers, kept readable as
           working-memory scaffolding. Measured composites — 40%: 3.59:1
           dark / 2.48:1 light; 60%: 6.55 / 4.44; 65%: 7.5 / 5.22. Only 65
           clears 4.5:1 in both themes. */
        ['--focus-mask-opacity']: String(
          clampFocusMaskPct(prefs.focusMaskPct) / 100
        ),
        ['--focus-mask-blur']:
          Number(prefs.focusMaskBlur) > 0
            ? `${Number(prefs.focusMaskBlur)}px`
            : '0px',
      }}
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
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <PullToRefresh reduceMotion={reduceMotion} />
      <HighlightExplain />
      <header className="header header-redesign">
        <div className="header-content header-content-simple">
          <button
            type="button"
            className="header-menu-toggle"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span aria-hidden="true">{navOpen ? '✕' : '☰'}</span>
          </button>
          <button
            type="button"
            className="brand-block brand-block-link"
            onClick={() => setActiveView('home')}
            aria-label="Home"
            title="Home"
          >
            <LogoLockup className="logo" locale={locale} reduceMotion={reduceMotion} />
          </button>
          {activeProject ? (
            <input
              className="header-mobile-title header-name-input"
              value={projectNameDraft}
              onChange={(e) => setProjectNameDraft(e.target.value)}
              onBlur={commitHeaderProjectRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitHeaderProjectRename()
                  e.currentTarget.blur()
                }
              }}
              aria-label="Project name"
            />
          ) : (
            <span className="header-mobile-title" aria-hidden="true">
              Creative Companion
            </span>
          )}
          <div className="header-actions">
            {/* Labelled, not a 5th identical glyph. This is the highest-
                frequency control in the app; as an icon among icons it would
                cost a five-way scan on every open, resolved only by hovering
                for a tooltip. The count is ambient evidence the list has
                something in it — otherwise the list doesn't exist between
                opens and re-checking it depends on remembering to. No badge
                at zero: a "0" reads as a scoreboard of nothing done. */}
            <button
              type="button"
              className="header-todo-pill"
              onClick={() => setRunningTodoPanelOpen(true)}
              aria-label={
                openTodoCount
                  ? `To-do list, ${openTodoCount} open`
                  : 'To-do list, nothing open'
              }
            >
              <HeaderIcon name="list" />
              <span>To-do</span>
              {openTodoCount > 0 && (
                <span className="header-todo-count" aria-hidden="true">
                  {openTodoCount}
                </span>
              )}
            </button>
            {/* Same chip, same place, on every screen — whether or not this
                project has a client link yet. One target to learn, and the
                only entry point to client activity. */}
            <ClientInboxChip
              hasUnread={clientInbox.hasUnread}
              onOpen={() => setClientInboxOpen(true)}
            />
            {activeProject && (
              <input
                className="header-name-input header-name-input-desktop"
                value={projectNameDraft}
                onChange={(e) => setProjectNameDraft(e.target.value)}
                onBlur={commitHeaderProjectRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitHeaderProjectRename()
                    e.currentTarget.blur()
                  }
                }}
                aria-label="Project name"
              />
            )}
            {/* No project <select> here: it duplicated the rename input's text
                ("Test Project" twice, a which-one-do-I-use fork) while hiding
                every other project behind a dropdown. The sidebar list is the
                switcher — always visible, one click, with progress counts. */}
            {(workRunning || isFocusRunning || (CLOUD && syncState === 'error')) && (
            <div className="header-status-slot">
            {workRunning && (
              <button
                type="button"
                className="work-clock-chip"
                /* Opens the clock's OWN record. This opened the Timer view,
                   which undid the separation at the last step: you clicked a
                   readout of hours already worked and landed on a countdown,
                   which reads as the clock having started something. */
                onClick={() => setWorkLogPanelOpen(true)}
                title="Clocked work time — runs by itself while you work"
              >
                {/* The CLOCK: hours at work, kept automatically. Counts up,
                    in minutes not mm:ss — a seconds digit changing every
                    second is motion in the corner of the eye all day, and it
                    is finer than any decision it informs. No icon: this is
                    not a control, it is a readout. */}
                Working · {sessionLabel}
              </button>
            )}
            {/* The TIMER: separate chip, separate job, and only here because
                you switched it on. The clock records; the timer is the thing
                you reach for when time blindness needs help. They were one
                control, which made choosing the timer indistinguishable from
                simply being at work — and made stopping the timer look like
                clocking off. ⏱ marks it as the chosen tool. */}
            {isFocusRunning && (
              <button
                type="button"
                className="focus-timer-chip"
                onClick={() => setActiveView('insights')}
                title="Focus timer you started — separate from clocked hours"
              >
                ⏱ {focusMinutes}:{String(focusSeconds).padStart(2, '0')}
              </button>
            )}
            {CLOUD && syncState === 'error' && (
              <button
                type="button"
                className="sync-error-chip"
                title={syncError || 'Cloud save failed'}
                onClick={async () => {
                  setSyncState('syncing')
                  setSyncError('')
                  try {
                    // A failed *pull* (resume) must retry the pull, not push
                    // local over the cloud copy it never actually loaded.
                    if (syncErrorSource === 'pull') {
                      const result = await pullWorkspace()
                      if (!result.ok) {
                        setSyncState('error')
                        setSyncError(result.error || 'Couldn’t load cloud desk')
                        flashToast(result.error || i18nT(locale, 'ui.syncFail'))
                        return
                      }
                      if (result.payload && Array.isArray(result.payload.projects)) {
                        skipNextCloudPush.current = true
                        const hydrated = hydrateFromPayload(result.payload)
                        if (hydrated.ok) {
                          setSyncState('ok')
                          flashToast(i18nT(locale, 'ui.syncedOk'))
                        } else {
                          skipNextCloudPush.current = false
                          setSyncState('error')
                          setSyncError(hydrated.error || 'Couldn’t load cloud desk')
                          flashToast(hydrated.error || i18nT(locale, 'ui.syncFail'))
                        }
                      } else {
                        setSyncState('ok')
                        flashToast(i18nT(locale, 'ui.syncedOk'))
                      }
                      return
                    }
                    const result = await pushWorkspace(exportAllData())
                    if (result.ok) {
                      setSyncState('ok')
                      setSyncError('')
                      applyImageUrlReplacements(result.replacements)
                      flashToast(i18nT(locale, 'ui.syncedOk'))
                    } else {
                      setSyncState('error')
                      setSyncError(result.error || 'Couldn’t sync')
                      flashToast(result.error || i18nT(locale, 'ui.syncFail'))
                    }
                  } catch (e) {
                    setSyncState('error')
                    setSyncError(e?.message || 'Couldn’t sync')
                    flashToast(e?.message || i18nT(locale, 'ui.syncFail'))
                  }
                }}
              >
                <span className="sync-error-chip-full">
                  {syncErrorSource === 'pull' ? 'Retry load' : 'Retry save'}
                </span>
                <span className="sync-error-chip-short">Retry</span>
              </button>
            )}
            </div>
            )}

            <button
              type="button"
              className="header-icon-btn"
              onClick={() => setActiveView('calendar')}
              title="Calendar"
              aria-label="Calendar"
            >
              <HeaderIcon name="calendar" />
            </button>

            <button
              type="button"
              className="header-icon-btn"
              onClick={() => setActiveView('clients')}
              title="Clients"
              aria-label="Clients"
            >
              <HeaderIcon name="people" />
            </button>

            {/* Print moved into the Tools menu. It's genuinely low-frequency,
                and the header was about to gain a wider control — leaving the
                icon row to grow is how the to-do button ended up colliding
                with page content in the first place. */}

            <div className="more-wrap" ref={moreWrapRef}>
              <button
                type="button"
                className="header-tools-btn"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                // Set only while the menu exists: it is conditionally
                // rendered below, so a static aria-controls pointed at a
                // missing id whenever the menu was closed.
                aria-controls={moreOpen ? 'tools-menu' : undefined}
                id="tools-menu-button"
                onClick={() => setMoreOpen(!moreOpen)}
              >
                <HeaderIcon name="tools" />
                {/* Labelled in text, not icon-only. This menu is now the home
                    for Settings and Log out, and people are conditioned to
                    hunt for an avatar for those — a bare glyph makes finding
                    them a recall problem instead of a read. */}
                <span>{i18nT(locale, 'ui.tools')}</span>
              </button>
              {moreOpen && (
                <div className="more-menu" role="menu" id="tools-menu" aria-labelledby="tools-menu-button">
                  <p className="more-menu-group-label">Go to</p>
                  {/* Mirrors the two standalone header icon buttons, which
                      are hidden on mobile (no room in that row once Tools
                      itself needs to fit) — without a copy here, Calendar
                      and Clients would go the same way Settings just did:
                      hidden with nothing standing in for them. */}
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item more-menu-item-mobile-only"
                    onClick={() => {
                      setActiveView('calendar')
                      setMoreOpen(false)
                    }}
                  >
                    <HeaderIcon name="calendar" /> Calendar
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item more-menu-item-mobile-only"
                    onClick={() => {
                      setActiveView('clients')
                      setMoreOpen(false)
                    }}
                  >
                    <HeaderIcon name="people" /> Clients
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
                    <HeaderIcon name="timer" /> {i18nT(locale, 'ui.timer')}
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
                    <span aria-hidden="true">✦</span> Ideate
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setActiveView('review')
                      setMoreOpen(false)
                    }}
                  >
                    <span aria-hidden="true">◎</span> Review
                  </button>
                  <p className="more-menu-group-label">This project</p>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      openExportPanel()
                      setMoreOpen(false)
                    }}
                  >
                    <span aria-hidden="true">⬇</span> Export
                  </button>
                  {/* The to-do list now has one door: the labelled pill in the
                      header. Two live triggers means two things to check and
                      an ambiguous "are these the same list?". */}
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setMoreOpen(false)
                      const r = printCurrentPage()
                      if (!r.ok) flashToast(r.error || 'Print failed')
                    }}
                  >
                    <HeaderIcon name="print" /> Print / Save as PDF
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setHoursPanelOpen(true)
                      setMoreOpen(false)
                    }}
                  >
                    <span aria-hidden="true">$</span> Hours &amp; invoice
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setDiscoveryPanelOpen(true)
                      setMoreOpen(false)
                    }}
                  >
                    <span aria-hidden="true">?</span> Discovery brief
                  </button>
                  {/* Archive/Delete moved here from the sidebar's hover-only
                      "⋯", which was invisible on touch and at a glance —
                      destructive actions need one learnable home. */}
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      handleArchiveProject()
                      setMoreOpen(false)
                    }}
                  >
                    <span aria-hidden="true">□</span> Archive project
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item is-danger"
                    onClick={() => {
                      handleDeleteProject()
                      setMoreOpen(false)
                    }}
                  >
                    <span aria-hidden="true">×</span> Delete project
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setOverviewSharePanelOpen(true)
                      setMoreOpen(false)
                    }}
                  >
                    <span aria-hidden="true">↗</span> Share project overview
                  </button>
                  {/* "Account", not "App" — that's the word you go looking
                      for when you want Settings or Log out. */}
                  <p className="more-menu-group-label">Account</p>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      setActiveView('settings')
                      setMoreOpen(false)
                    }}
                  >
                    <span aria-hidden="true">⚙</span> {i18nT(locale, 'ui.settings')}
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
                    <span aria-hidden="true">⌨</span> Keyboard shortcuts
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item"
                    onClick={() => {
                      toggleTheme()
                      setMoreOpen(false)
                    }}
                  >
                    <span aria-hidden="true">◐</span>{' '}
                    {theme === 'warm' ? 'Switch to dark' : 'Switch to light'}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="more-menu-item more-menu-danger"
                    onClick={() => {
                      setMoreOpen(false)
                      handleSignOut()
                    }}
                  >
                    <span aria-hidden="true">→</span>{' '}
                    {CLOUD ? 'Log out' : 'Log out / lock'}
                  </button>
                </div>
              )}
            </div>

            {/* Absence of an error is not the same reassurance as "saved" —
                you can't tell "no error" from "nothing is happening". Not a
                button: it answers the question at a glance and costs no
                decision. Errors keep their own retry chip above. */}
            {CLOUD && syncState !== 'error' && (
              <span className="header-saved" aria-live="polite">
                <span className="header-saved-dot" aria-hidden="true" />
                {syncState === 'syncing' ? 'Saving…' : 'Saved'}
              </span>
            )}

          </div>
        </div>
      </header>

      {/* Step rail — desktop only (CSS-hidden below 768px, where the drawer
          still carries the step list). Answers "where am I" by position, and
          the one button names its own destination so the seven-way choice
          collapses to a zero-decision default. */}
      {journeyActive && (
        <nav className="step-rail" aria-label="Process position">
          <ol className="step-rail-list">
            {JOURNEY_STEPS.map((step) => {
              const active = journeyActive === step.id
              const label = pathLabel(locale, step.id) || step.label
              const done =
                !active &&
                pathStepHasContent(step.id, {
                  project: activeProject,
                  moodItems: deskMood,
                  tasks: deskTasks,
                  sparkIndex,
                  palette: projectPalette,
                })
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    className={`step-rail-step${active ? ' is-active' : ''}${
                      done ? ' is-done' : ''
                    }`}
                    onClick={() => setActiveView(step.view)}
                    aria-current={active ? 'step' : undefined}
                    aria-label={`Step ${step.num}: ${label}${done ? ', done' : ''}`}
                    title={`${label} · key ${step.num}`}
                  >
                    {done && (
                      <span className="step-rail-check" aria-hidden="true">✓</span>
                    )}
                    {label}
                  </button>
                </li>
              )
            })}
          </ol>
          {/* Only when it actually goes somewhere. When the next gap IS the
              current page, "Continue → Project overview" points at the screen
              you're already on — a control that does nothing is worse than no
              control. "Start with these" is the call to action on that page. */}
          {pathNextGap && pathNextGap.view !== activeView && (
            <button
              type="button"
              className="btn btn-primary step-rail-cta"
              onClick={() => goToProcessStep(pathNextGap, { micro: 'next' })}
            >
              Continue → {pathLabel(locale, pathNextGap.id) || pathNextGap.label}
            </button>
          )}
        </nav>
      )}

      {showProgress && (
        <>
          <Suspense fallback={null}>
            <GameHUD />
          </Suspense>
          <Suspense fallback={<PathViewSkeleton label="Loading activity…" />}>
            <ActivityTable />
          </Suspense>
        </>
      )}
      <nav
        className={`journey-sidebar${journeyActive ? '' : ' is-tools'}`}
        aria-label={i18nT(locale, 'pathAria')}
        /* Parked off-canvas on mobile, its 10 buttons stayed keyboard-
           reachable — Tab from the header walked into an invisible drawer.
           inert only applies below 768px, where the drawer is closed. */
        /* `true`, not '': React treats an empty string as false for boolean
           attributes, so the drawer was never actually inert and the bug
           this comment describes was still live. */
        inert={isMobileViewport && !navOpen ? true : undefined}
      >
          <div className="journey-projects-section" aria-label="Your projects">
            <div className="journey-projects-head">
              <span className="journey-projects-heading">Projects</span>
              <button
                type="button"
                className="journey-projects-add"
                onClick={() => {
                  createNewProject()
                  notifyAction('New project', 'project_create', {
                    label: 'New project',
                  })
                  setActiveView('project')
                  setNavOpen(false)
                }}
                aria-label="New project"
                title="New project"
              >
                +
              </button>
            </div>
            <ul className="journey-projects-list">
              {projectsSummary.map(({ project: p, doneCount, nextGap }) => {
                const isActive = p.id === activeProjectId
                const menuOpen = openProjectMenuId === p.id
                // A named next action beats a ratio: "1/5" has to be decoded
                // into a meaning and still doesn't say what to do.
                const nextLabel = nextGap
                  ? `Next: ${pathLabel(locale, nextGap.id) || nextGap.label}`
                  : 'Ready to deliver'
                return (
                  <li key={p.id} className="journey-project-row-wrap">
                    <button
                      type="button"
                      className={`journey-project-row${isActive ? ' is-active' : ''}`}
                      onClick={() => openProjectWhereLeftOff(p.id)}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <span className="journey-project-row-name">{p.name}</span>
                      <span className="journey-project-row-next">{nextLabel}</span>
                    </button>
                    <div className="journey-project-row-menu-wrap">
                      <button
                        type="button"
                        className="journey-project-row-menu-btn"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        aria-label={`Project actions for “${p.name}”`}
                        title="Project actions"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenProjectMenuId(menuOpen ? null : p.id)
                        }}
                      >
                        ⋯
                      </button>
                      {menuOpen && (
                        <div
                          className="journey-project-row-menu"
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="project-menu-item"
                            disabled={activeProjects.length < 2}
                            onClick={() => {
                              const r = archiveProject(p.id)
                              if (!r.ok) flashToast(r.error || i18nT(locale, 'ui.archiveFail'))
                              setOpenProjectMenuId(null)
                            }}
                          >
                            Archive project
                          </button>
                          {activeProjects.length < 2 && (
                            <p className="project-menu-note">
                              Needs a second active project to switch to.
                            </p>
                          )}
                          <button
                            type="button"
                            role="menuitem"
                            className="project-menu-item project-menu-danger"
                            disabled={projects.length <= 1}
                            onClick={() => {
                              setOpenProjectMenuId(null)
                              handleDeleteProjectById(p.id, p.name)
                            }}
                          >
                            Delete project
                          </button>
                          {projects.length <= 1 && (
                            <p className="project-menu-note">
                              This is your only project.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            {archivedProjects.length > 0 && (
              <select
                className="journey-projects-restore"
                value={restoreSelect}
                onChange={(e) => {
                  const id = e.target.value
                  if (!id) return
                  unarchiveProject(Number(id) || id)
                  selectProject(Number(id) || id)
                  setRestoreSelect('')
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
          <ol className="journey-bar-list">
            {JOURNEY_STEPS.map((step, idx) => {
              const active = journeyActive === step.id
              const label = pathLabel(locale, step.id) || step.label
              const plain = pathPlain(locale, step.id) || step.plain
              const pathCtx = {
                project: activeProject,
                moodItems: deskMood,
                tasks: deskTasks,
                sparkIndex,
                palette: projectPalette,
              }
              const hasContent = pathStepHasContent(step.id, pathCtx)
              const prevLit =
                idx > 0 &&
                pathStepHasContent(JOURNEY_STEPS[idx - 1].id, pathCtx)
              return (
                <li
                  key={step.id}
                  className={`journey-bar-item${active ? ' is-active' : ''}${
                    hasContent && !active ? ' is-done' : ''
                  }`}
                >
                  {idx > 0 && (
                    <span
                      className={`journey-flow-link${prevLit ? ' is-lit' : ''}`}
                      aria-hidden="true"
                    />
                  )}
                  <button
                    type="button"
                    className={`journey-step${active ? ' is-active' : ''}${
                      hasContent && !active ? ' is-done' : ''
                    }`}
                    onClick={() => {
                      setActiveView(step.view)
                      setNavOpen(false)
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
                    <span className="journey-node" aria-hidden="true">
                      {hasContent && !active ? (
                        <span className="journey-check">✓</span>
                      ) : (
                        <PathStepIcon id={step.id} />
                      )}
                    </span>
                    <span className="journey-num" aria-hidden="true">
                      {hasContent && !active ? '✓' : String(step.num).padStart(2, '0')}
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

      <button
        type="button"
        className="nav-backdrop"
        aria-label="Close menu"
        tabIndex={navOpen ? 0 : -1}
        onClick={() => setNavOpen(false)}
      />

      <main className="main" id="main-content" tabIndex={-1} data-nav-dir={navDir}>
        {journeyActive && activeView !== 'review' && activeView !== 'finish' && (
          <JourneyGapStrip
            locale={locale}
            thisStepFilled={thisStepFilled}
            pathNextGap={pathNextGap}
            leaveBehindThin={leaveBehindThin}
            activeView={activeView}
            i18nT={i18nT}
            setActiveView={setActiveView}
          />
        )}
        {journeyActive && (
          <BeforeAfterChip
            project={activeProject}
            onOpen={() => setBeforeAfterOpen(true)}
          />
        )}
        {/* ===== HOME (multi-project) — master/detail, not a card grid ===== */}
        {activeView === 'home' && activeProjects.length > 1 && (() => {
          const sorted = [...projectsSummary].sort((a, b) => {
            const aDone = a.pathFull
            const bDone = b.pathFull
            if (aDone !== bDone) return aDone ? 1 : -1
            return 0
          })
          const selected =
            sorted.find((s) => s.project.id === homeSelectedProjectId) ||
            sorted[0]
          if (!selected) return null
          const pathFull = !!selected.pathFull
          const packReady = !!selected.packReady
          return (
            <section className="home-view home-md home-studio">
              <nav className="home-md-list" aria-label="Your projects">
                <div className="home-md-list-head">
                  <h1 className="home-title" style={{ margin: 0 }}>
                    Projects
                  </h1>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm home-new-project"
                    onClick={() => {
                      createNewProject()
                      notifyAction('New project', 'project_create', {
                        label: 'New project',
                      })
                      setActiveView('project')
                    }}
                  >
                    + New project
                  </button>
                </div>
                <ul className="home-md-rows">
                  {sorted.map(({ project: p, doneCount, nextGap, pathFull: rowFull, packReady: rowPack }) => {
                    const isActive = p.id === selected.project.id
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={`home-md-row${isActive ? ' is-active' : ''}`}
                          onClick={() => setHomeSelectedProjectId(p.id)}
                        >
                          <span className="home-md-row-top">
                            <span className="home-md-row-name">{p.name}</span>
                            <span className="home-md-row-count">
                              {doneCount}/{PATH_STEP_COUNT}
                            </span>
                          </span>
                          <span
                            className={`home-md-row-next${rowFull ? ' is-done' : ''}`}
                          >
                            {rowPack
                              ? 'Ship'
                              : rowFull
                                ? 'Deliver'
                                : nextGap
                                  ? pathLabel(locale, nextGap.id) || nextGap.label
                                  : '—'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>

              <div className="home-md-detail">
                <p className="home-kicker">
                  {packReady ? 'Ready' : pathFull ? 'Path full' : 'Next'}
                </p>
                <h2 className="home-title">
                  {packReady
                    ? 'Brand book ready'
                    : pathFull
                      ? 'Path steps look full'
                      : selected.nextGap
                        ? pathLabel(locale, selected.nextGap.id) ||
                          selected.nextGap.label
                        : 'All caught up'}
                </h2>
                {pathFull && !packReady ? (
                  <p className="home-kicker" style={{ marginTop: '0.35rem' }}>
                    Pack still thin — open Deliver to fill gaps or ship anyway
                  </p>
                ) : null}
                <div className="home-cta-row">
                  <button
                    type="button"
                    className="btn btn-primary home-cta"
                    onClick={() => {
                      if (pathFull) {
                        setCurrentProject(selected.project.id)
                        setActiveView('finish')
                        return
                      }
                      switchProjectAndContinue(selected.project.id)
                    }}
                  >
                    {pathFull ? 'Open Deliver' : 'Continue'}
                  </button>
                </div>

                <div className="home-md-strip">
                  <p className="home-md-strip-label">
                    {selected.doneCount}/{PATH_STEP_COUNT}
                  </p>
                  <div className="home-md-steps">
                    {selected.rows.map((r, i) => {
                      const num = i + 1
                      const isCurrent =
                        selected.nextGap && r.id === selected.nextGap.id
                      return (
                        <div
                          key={r.id}
                          className={`home-md-step${r.done ? ' is-done' : ''}${
                            isCurrent ? ' is-current' : ''
                          }`}
                          title={pathLabel(locale, r.id) || r.label}
                        >
                          <span className="home-md-step-dot">
                            {r.done ? '✓' : num}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>
          )
        })()}
        {activeView === 'home' && activeProjects.length <= 1 && (
          <section className="home-view home-studio">
            <p className="home-eyebrow">
              {activeProject?.name || 'Project'}
            </p>
            {brandBookReady ? (
              <>
                <h1 className="home-title">Brand book ready</h1>
                <button
                  type="button"
                  className="btn btn-primary home-cta"
                  onClick={() => setActiveView('finish')}
                >
                  Open Deliver
                </button>
              </>
            ) : pathStepsFull ? (
              <>
                <h1 className="home-title">Path steps look full</h1>
                <p className="home-kicker" style={{ marginTop: '0.5rem' }}>
                  Pack still thin — open Deliver to fill gaps or ship anyway
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
                <p className="home-kicker">Next</p>
                <h1 className="home-title">
                  {pathLabel(locale, pathNextGap.id) || pathNextGap.label}
                </h1>
                <div className="home-cta-row">
                  <button
                    type="button"
                    className="btn btn-primary home-cta"
                    onClick={() => goToNextProcessGap()}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="home-title">All caught up</h1>
                <button
                  type="button"
                  className="btn btn-primary home-cta"
                  onClick={() => setActiveView('finish')}
                >
                  Open Deliver
                </button>
              </>
            )}
            <div className="home-cta-row home-new-project-row">
              <button
                type="button"
                className="btn btn-secondary home-new-project"
                onClick={() => {
                  createNewProject()
                  notifyAction('New project', 'project_create', {
                    label: 'New project',
                  })
                  setActiveView('project')
                }}
              >
                + New project
              </button>
            </div>
          </section>
        )}
        {/* ===== WORK — one step owns the fold ===== */}
        {/* ===== SKETCH (lazy) ===== */}
        {activeView === 'flow' && (
          <Suspense fallback={<PathViewSkeleton
              label={`Loading ${labelForView('flow')}…`}
            />}>
            <StepDependencyReminder stepId="sketch" />
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
              setDeskConfirm={setDeskConfirm}
            />
          </Suspense>
        )}

        {/* ===== RESEARCH (lazy) ===== */}
        {activeView === 'studio' && (
          <Suspense fallback={<PathViewSkeleton
              label={`Loading ${labelForView('studio')}…`}
            />}>
            <StepDependencyReminder stepId="research" />
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
              onAddPinModeChange={setResearchAddOpen}
            />
          </Suspense>
        )}

        {/* ===== SPARK (lazy) ===== */}
        {activeView === 'spark' && (
          <Suspense fallback={<PathViewSkeleton label="Loading…" />}>
            <StepDependencyReminder stepId="ideate" />
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
              roughIdeas={activeProject?.roughIdeas || []}
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
          <Suspense fallback={<PathViewSkeleton label="Loading timer…" />}>
            <InsightsView
              setActiveView={setActiveView}
              nextTask={nextTask}
              focusMinutes={focusMinutes}
              focusSeconds={focusSeconds}
              sessionLabel={sessionLabel}
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
              pathReturnView={activeProject?.lastView || 'project'}
              locale={locale}
            />
          </Suspense>

        )}
        {/* ===== CALENDAR (lazy) ===== */}
        {activeView === 'calendar' && (
          <Suspense fallback={<PathViewSkeleton label="Loading calendar…" />}>
            <CalendarView
              setActiveView={setActiveView}
              pathReturnView={activeProject?.lastView || 'project'}
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
              onOpenTaskPanel={() => setRunningTodoPanelOpen(true)}
            />
          </Suspense>
        )}

        {/* ===== CLIENTS (lazy) ===== */}
        {activeView === 'clients' && (
          <Suspense fallback={<PathViewSkeleton label="Loading clients…" />}>
            <ClientsView
              projects={projects}
              selectProject={selectProject}
              setActiveView={setActiveView}
            />
          </Suspense>
        )}

        {/* Concept pipeline removed from UI — Research + Design path only */}

        {/* ===== BRAND IDENTITY TEMPLATE ===== */}
        {/* ===== DESIGN (lazy) ===== */}
        {activeView === 'brand' && (
          <Suspense fallback={<PathViewSkeleton
              label={`Loading ${labelForView('brand')}…`}
            />}>
            <StepDependencyReminder stepId="design" />
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
          <Suspense fallback={<PathViewSkeleton label="Loading Review…" />}>
            <StepDependencyReminder stepId="review" />
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
          <Suspense fallback={<PathViewSkeleton
              label={`Loading ${labelForView('finish')}…`}
            />}>
            <StepDependencyReminder stepId="deliver" />
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
          <Suspense fallback={<PathViewSkeleton label="Loading settings…" />}>
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
              loadHarborHearthDemo={loadHarborHearthDemo}
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
          <Suspense fallback={<PathViewSkeleton
              label={`Loading ${labelForView('project')}…`}
            />}>
            <DefineView
              locale={locale}
              navDir={navDir}
              activeProject={activeProject}
              deskTasks={deskTasks}
              setActiveView={setActiveView}
              updateDetective={updateDetective}
              onOpenShare={() => setOverviewSharePanelOpen(true)}
              setProjectDeadline={setProjectDeadline}
              projectDeadline={projectDeadline}
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
          <div className="export-panel demo-tour-panel demo-tour-studio">
            <p className="onboard-eyebrow">Demo</p>
            <div className="demo-tour-dots" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span key={i} className={i <= demoTour.step ? 'is-on' : ''} />
              ))}
            </div>
            <h2 id="demo-tour-title" style={{ marginTop: 0 }}>
              {
                [
                  /* Was a frozen seven-entry list naming Define/Ideate/
                     Sketch/Design/Review/Deliver and walking through Ideate
                     and Review as if they were path stops. A first-run tour
                     that contradicts every other screen is worse than none. */
                  ...JOURNEY_STEPS.map((st, i) => `${i + 1} · ${st.label}`),
                ][demoTour.step] || 'Tour'
              }
            </h2>
            <p className="view-lede demo-tour-lede">
              {
                [
                  'Goal · who · feel',
                  'Pins · ★ up to 6',
                  'Sparks · shortlist',
                  'Drafts + why',
                  'Artboard · version',
                  'Notes · gaps',
                  'PDF · handoff',
                ][demoTour.step]
              }
            </p>
            <div className="onboard-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const views = PATH_VIEWS
                  const s = demoTour.step
                  setActiveView(views[s])
                  if (s >= 6) setDemoTour(null)
                  else setDemoTour({ step: s + 1 })
                }}
              >
                {demoTour.step >= 6 ? 'Deliver' : 'Next'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const views = PATH_VIEWS
                  setActiveView(views[demoTour.step] || 'project')
                  setDemoTour(null)
                }}
              >
                Stay
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDemoTour(null)}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div
          className="export-overlay onboard-overlay onboard-studio"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboard-title"
        >
          <div className="export-panel onboard-panel">
            <h2 id="onboard-title" className="onboard-title">
              New project
            </h2>
            <label className="onboard-label" htmlFor="onboard-name">
              Client / project name
              <input
                id="onboard-name"
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                placeholder="Usually the client's name"
                className="onboard-input"
                autoFocus
                autoComplete="off"
              />
            </label>
            <label className="onboard-label" htmlFor="onboard-step">
              First step
              <input
                id="onboard-step"
                value={onboardFirstStep}
                onChange={(e) => setOnboardFirstStep(e.target.value)}
                placeholder="One small task to start with — you can skip this"
                className="onboard-input"
                autoComplete="off"
              />
            </label>
            <details className="onboard-brief-details">
              <summary>Brief</summary>
              <label className="onboard-label" htmlFor="onboard-brief">
                <span className="sr-only">Brief</span>
                <textarea
                  id="onboard-brief"
                  value={onboardBrief}
                  onChange={(e) => setOnboardBrief(e.target.value)}
                  placeholder="What’s the job? One line is plenty"
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
                Start the brief
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm onboard-demo"
                onClick={() => finishOnboarding('empty')}
              >
                Empty desk
              </button>
            </div>
            {!onboardName.trim() && (
              <p className="onboard-gate-hint">Add a name to start.</p>
            )}
          </div>
        </div>
      )}

      {savePulse && (
        <div className="autosave-chip" role="status">✓ Saved</div>
      )}

      <RunningTodoAddModal
        open={runningTodoPromptOpen && activeView !== 'home' && !researchAddOpen}
        onClose={() => {
          setRunningTodoPromptOpen(false)
          setRunningTodoAddDirect(false)
        }}
        onAdd={handleAddRunningTodoItem}
        stageLabel={pathLabel(locale, journeyIdForView(activeView) || 'define')}
        skipAsk={runningTodoAddDirect}
      />
      <RunningTodoPanel
        open={runningTodoPanelOpen}
        onClose={() => setRunningTodoPanelOpen(false)}
        runningTodo={runningTodo}
        onToggle={toggleRunningTodoItem}
        onRemove={removeRunningTodoItem}
        onSort={sortRunningTodo}
        onOpenAdd={() => {
          setRunningTodoPanelOpen(false)
          setRunningTodoAddDirect(true)
          setRunningTodoPromptOpen(true)
        }}
      />
      <WorkLogPanel
        open={workLogPanelOpen}
        onClose={() => setWorkLogPanelOpen(false)}
        workLog={activeProject?.workLog || []}
        onRemoveEntry={removeWorkEntry}
      />
      <HoursInvoicePanel
        open={hoursPanelOpen}
        onClose={() => setHoursPanelOpen(false)}
        orgName={activeProject?.logoWordmark || activeProject?.name || ''}
        hourlyRate={activeProject?.hourlyRate || ''}
        timeLog={activeProject?.timeLog || []}
        onSetRate={setHourlyRate}
        onAddEntry={addTimeEntry}
        onRemoveEntry={removeTimeEntry}
        flashToast={flashToast}
      />
      <DiscoveryBriefPanel
        open={discoveryPanelOpen}
        onClose={() => setDiscoveryPanelOpen(false)}
        answers={activeProject?.discoveryAnswers || {}}
        onUpdateField={updateDiscoveryField}
        clientName={activeProject?.name || ''}
        upload={activeProject?.discoveryUpload || null}
        onSetUpload={setDiscoveryUpload}
        flashToast={flashToast}
        projectId={activeProject?.id || null}
        shareId={activeProject?.discoveryShareId || null}
        shareStatus={activeProject?.discoveryShareStatus || null}
        onSetShare={setDiscoveryShare}
        onMergeAnswers={mergeDiscoveryAnswers}
      />
      <ProjectOverviewSharePanel
        open={overviewSharePanelOpen}
        onClose={() => setOverviewSharePanelOpen(false)}
        project={activeProject}
        portalId={activeProject?.clientPortalId || null}
        onSetPortalId={setClientPortalId}
        onApplyAnswers={mergeDetectiveAnswers}
        autoOpenReview={autoOpenPortalReview}
        onAutoOpenReviewHandled={() => setAutoOpenPortalReview(false)}
        flashToast={flashToast}
        flashMicro={flashMicro}
      />

      <ClientInboxPanel
        open={clientInboxOpen}
        onClose={() => setClientInboxOpen(false)}
        inbox={clientInbox}
        seen={portalSeen}
        onMarkSeen={markPortalSeen}
        onGoToView={goToInboxTarget}
        onOpenPortal={openInboxPortal}
        flashToast={flashToast}
        flashMicro={flashMicro}
      />

      <BeforeAfterOverlay
        open={beforeAfterOpen}
        onClose={() => setBeforeAfterOpen(false)}
        project={activeProject}
      />

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
          <div className="export-panel shortcuts-panel shortcuts-studio">
            <div className="export-panel-header">
              <h3 id="shortcuts-title" style={{ margin: 0 }}>
                Keys
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Close keyboard shortcuts"
                onClick={() => setShortcutsOpen(false)}
              >
                ×
              </button>
            </div>
            <ul className="shortcuts-list">
              <li>
                <kbd>1</kbd>–<kbd>{PATH_STEP_COUNT}</kbd> Path
              </li>
              <li>
                <kbd>C</kbd> Done step
              </li>
              <li>
                <kbd>N</kbd> Capture
              </li>
              <li>
                <kbd>G</kbd> Next gap
              </li>
              <li>
                <kbd>U</kbd> Undo
              </li>
              <li>
                <kbd>?</kbd> This
              </li>
              <li>
                <kbd>Esc</kbd> Close / Helper
              </li>
            </ul>
          </div>
        </div>
      )}

      {forceBreakConsentOpen && (
        <div
          className="desk-confirm-banner force-break-consent force-break-consent-studio"
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
              {i18nT(locale, 'ui.enable') || 'On'}
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
              Off
            </button>
          </div>
        </div>
      )}

      {deskConfirm && (
        <div
          className="desk-confirm-banner desk-confirm-modal"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="desk-confirm-title"
        >
          <p id="desk-confirm-title" className="desk-confirm-body">
            {deskConfirm.label}
          </p>
          <div className="desk-confirm-actions">
            <button
              type="button"
              className={`btn btn-sm desk-confirm-go${
                deskConfirm.danger ? ' settings-danger' : ' btn-primary'
              }`}
              onClick={() => deskConfirm.onConfirm?.()}
            >
              {deskConfirm.confirmLabel || i18nT(locale, 'ui.continue')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm desk-confirm-cancel"
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
          Undo · {String(recentUndo.title || '').slice(0, 24)}
          {String(recentUndo.title || '').length > 24 ? '…' : ''}
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
          <div className="export-panel portfolio-export export-studio">
            <div className="export-panel-header no-print">
              <div>
                <h3 style={{ margin: 0 }}>Export</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Close export"
                onClick={() => setExportPanel(null)}
              >
                ×
              </button>
            </div>

            <div
              className={`export-artboard-wrap${coverDropActive ? ' is-cover-drop-active' : ''}`}
              onDragOver={(e) => {
                if (!e.dataTransfer?.types?.includes('Files')) return
                e.preventDefault()
                setCoverDropActive(true)
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget)) return
                setCoverDropActive(false)
              }}
              onDrop={(e) => {
                if (!e.dataTransfer?.files?.length) return
                e.preventDefault()
                setCoverDropActive(false)
                handleCoverImageDrop(e.dataTransfer.files[0])
              }}
            >
              <Suspense fallback={<div className="panel-hint">…</div>}>
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
              <p className="export-cover-drop-hint">
                {activeProject?.logoImage
                  ? 'Drop a new image here to replace the cover'
                  : 'Drop an image here to use it on the cover'}
              </p>
              {exportPanel.openTasks.length > 0 && (
                <div className="export-open-work">
                  <div className="kicker">Open</div>
                  <ul className="direction-tasks">
                    {exportPanel.openTasks.map((t) => (
                      <li key={t.id}>{t.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="export-panel-actions no-print">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => runExport('pdf')}
                disabled={exportBusy}
              >
                {i18nT(locale, 'ui.downloadVectorPdf')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Close export"
                onClick={() => setExportPanel(null)}
              >
                ×
              </button>
            </div>
            <details className="export-more-formats no-print">
              <summary>More</summary>
              <div className="finish-more-formats-list">
                <button type="button" className="btn btn-secondary btn-sm" disabled={exportBusy} onClick={() => runExport('html')}>HTML</button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={exportBusy} onClick={() => runExport('md')}>MD</button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={exportBusy} onClick={() => runExport('json')}>JSON</button>
                <button type="button" className="btn btn-secondary btn-sm" disabled={exportBusy} onClick={() => runExport('print')}>Print</button>
              </div>
            </details>
          </div>
        </div>
      )}

      <button
        type="button"
        className="todo-fab"
        onClick={() => setRunningTodoPanelOpen(true)}
        title="To-do list"
        aria-label={
          openTodoCount
            ? `Open your to-do list, ${openTodoCount} open`
            : 'Open your to-do list, nothing open'
        }
      >
        <HeaderIcon name="list" />
        {openTodoCount > 0 && (
          <span className="todo-fab-count" aria-hidden="true">
            {openTodoCount}
          </span>
        )}
      </button>

      {/* Helper — presence coach. Usually off unless opted in; also mounts
          during a Pomodoro break so Break kit has a voice (not only a lock). */}
      {(bodyDoubling || helperBreakCare.open || forcedBreak) && (
        <Suspense fallback={null}>
        <BuddyMate
          onClose={() => {
            setBodyDoubling(false)
            setHelperBreakCare({ open: false, minutes: 0 })
          }}
          isFocusRunning={isFocusRunning}
          focusLeft={focusLeft}
          completedCount={completedCount}
          nextTaskTitle={nextTask?.title || ''}
          reduceMotion={reduceMotion}
          pulseWin={buddyWinPulse}
          showProgress={showProgress}
          helperQuiet={!!prefs.helperQuiet}
          forceBreakCare={
            !!(helperBreakCare.open || forcedBreak)
          }
          breakMinutes={
            forcedBreak?.breakMinutes || helperBreakCare.minutes || 0
          }
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
          <div className="export-panel breakdown-panel breakdown-studio">
            <div className="export-panel-header">
              <div>
                <h3 style={{ margin: 0 }}>
                  Break down · {activeProject?.name || 'Project'}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Close step breakdown"
                onClick={() => setShowBreakdown(false)}
              >
                ×
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
                  Giant blob → tiny Sketch steps.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setBreakdownStep(1)}
                >
                  Start
                </button>
              </div>
            )}

            {breakdownStep === 1 && (
              <div className="breakdown-step">
                <label className="field-label" htmlFor="bd-goal">
                  Goal
                </label>
                <input
                  id="bd-goal"
                  className="field-input"
                  value={bdGoal}
                  onChange={(e) => setBdGoal(e.target.value)}
                  placeholder="What we’re making"
                />
                <label
                  className="field-label"
                  htmlFor="bd-done"
                  style={{ marginTop: '0.65rem' }}
                >
                  Done enough
                </label>
                <textarea
                  id="bd-done"
                  className="field-textarea"
                  rows={2}
                  value={bdDone}
                  onChange={(e) => setBdDone(e.target.value)}
                  placeholder="Ship definition"
                />
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
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
                <p className="field-label">Depth</p>
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
                    </button>
                  ))}
                </div>
                <label className="field-label" htmlFor="bd-energy">
                  Energy
                </label>
                <select
                  id="bd-energy"
                  className="palette-bg-select"
                  value={bdEnergy}
                  onChange={(e) => setBdEnergy(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="med">Med</option>
                  <option value="high">High</option>
                </select>
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setBreakdownStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={buildBreakdownPreview}
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}

            {breakdownStep === 3 && (
              <div className="breakdown-step">
                <p className="field-label">Edit steps</p>
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
                        className="btn btn-ghost btn-sm"
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
                  className="btn btn-ghost btn-sm"
                  onClick={addBdStepLine}
                >
                  + Step
                </button>
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
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
                    Add {bdSteps.filter((s) => s.trim()).length} to Sketch
                  </button>
                </div>
              </div>
            )}

            {breakdownStep === 4 && (
              <div className="breakdown-step">
                <p className="session-done" style={{ marginTop: 0 }}>
                  +{breakdownAdded} steps · do #1 only
                </p>
                <div className="breakdown-nav">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={openBreakdown}
                  >
                    More
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={finishBreakdownToStep}
                  >
                    Start #1
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
          <div className="export-panel reset-panel reset-studio">
            <h3 className="reset-title">Stuck · pick one</h3>
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
