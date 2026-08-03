import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  lazy,
  Suspense,
  Fragment,
} from 'react'
import useAppStore from './store/useAppStore'
import { projectsShellEqual } from './lib/storeSelectors'
import {
  groupProjectsByClient,
  showClientHeadings as showClientHeadingsFor,
} from './lib/projectGrouping'
import PathViewSkeleton from './components/PathViewSkeleton'
import versionService from './services/versionService'

import { DEFAULT_PALETTE } from './lib/color'
import { clampFocusMaskPct } from './lib/uiPrefs'
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
const InsightsView = lazy(() => import('./views/InsightsView'))
const CalendarView = lazy(() => import('./views/CalendarView'))
const ClientsView = lazy(() => import('./views/ClientsView'))
const ClientRecordView = lazy(() => import('./views/ClientRecordView'))
const DeskView = lazy(() => import('./views/DeskView'))
const NewProjectIntake = lazy(() => import('./views/NewProjectIntake'))
const BrandBookBuilderView = lazy(
  () => import('./views/BrandBookBuilderView')
)
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
  labelForStepId,
  journeyIdForView,
  getNextJourney,
  getPrevJourney,
  toolsLabelForView,
  isToolsMenuView,
} from './lib/journey'
import {
  pathStepHasContent,
  pathStepMeetsCondition,
  pathProgressSummary,
  pathFirstGap,
  pathGapFocusSelector,
  buildPathProgressCtx,
  focusPathGapTarget,
  sameProjectId,
} from './lib/journeyProgress'
import {
  nextIdentitySubstep,
  resolveIdentitySubstep,
} from './lib/identitySubsteps'

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
  downloadMarkPack,
  downloadWorkspaceBackup,
  packReadiness,
  preloadPdfEngine,
  printElementById,
  printCurrentPage,
  slugifyFilename,
} from './lib/exportFiles'
import {
  hoursForRange,
  workLogsFromProjects,
  formatHoursWorked,
  hoursLoggedWords,
  HOURS_RANGES,
} from './lib/workWeek'
import LogoLockup from './components/LogoLockup'
import StepDependencyReminder from './components/StepDependencyReminder'
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
  /* Invoice numbering, split in two: read it to print on the PDF, consume it
     only once the PDF exists.

     BOTH must be bound here, like every other store action the shell hands
     down. The single-function version was once passed to HoursInvoicePanel
     without ever being defined — a render-time ReferenceError that blanks the
     entire app, which unit tests and the build both stayed green through,
     because nothing renders App in vitest and an undefined identifier in JSX
     is perfectly valid syntax. Splitting one prop into two is exactly the edit
     that reintroduces it; invoiceNumbering.test.js now checks that anything
     passed to the panel is actually defined here. */
  const peekInvoiceNumber = useCallback(
    (...a) => useAppStore.getState().peekInvoiceNumber(...a),
    []
  )
  const commitInvoiceNumber = useCallback(
    (...a) => useAppStore.getState().commitInvoiceNumber(...a),
    []
  )
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
        'book',
        /* 'clients' is deliberately absent upstream — noted, not fixed here:
           refreshing on Clients drops you to Home, and the same id is missing
           from sessionResume's ALL_VIEWS. Separate one-line fix. */
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

  /** One-shot Identity sub-screen target from Review/Deliver readiness (null = none) */
  const [brandEditSection, setBrandEditSection] = useState(null)
  const goSystemSection = useCallback(
    (section) => {
      if (section) setBrandEditSection(section)
      else setBrandEditSection(null)
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
  const [navDir, setNavDir] = useState('none')
  const prevJourneyIdx = useRef(0)
  const [savePulse, setSavePulse] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [openProjectMenuId, setOpenProjectMenuId] = useState(null)
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
  /** Which client the record view ('clientRecord') is showing. */
  const [clientRecordName, setClientRecordName] = useState('')
  /** Client name the intake pre-fills when opened from a client record. */
  const [intakeClientName, setIntakeClientName] = useState('')
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
   * until the user actually clicks Continue / the final-stop CTA. */
  const [homeSelectedProjectId, setHomeSelectedProjectId] = useState(null)
  /** Home hours panel: day | week | month | year | all */
  const [homeHoursRange, setHomeHoursRange] = useState('week')
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
  /** Brand book page setup — sticky prefs, honoured by the vector generator */
  const bookSetup = {
    pageSize: prefs.bookPageSize,
    edgeSpace: prefs.bookEdgeSpace,
    printShop: !!prefs.bookPrintShop,
  }
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
    () => pathMissingRows.map((r) => r.label),
    [pathMissingRows]
  )
  const thisStepId = journeyIdForView(activeView)
  const markPathReached = useCallback(
    (...a) => useAppStore.getState().markPathReached(...a),
    []
  )

  /* Record a stop the moment its live condition is first met.

     Completion is latched rather than recomputed (see pathStepHasContent), so
     something has to write the latch. This is the one place that knows both
     the live conditions and the active project, and markPathReached only ever
     adds — a no-op write returns early so this cannot churn the persist layer
     or the cloud push on every render. */
  useEffect(() => {
    const projectId = activeProject?.id
    if (!projectId) return
    const newly = JOURNEY_STEPS.filter(
      (step) =>
        !activeProject?.pathReached?.[step.id] &&
        pathStepMeetsCondition(step.id, pathProgressCtx)
    ).map((step) => step.id)
    if (newly.length) markPathReached(newly, projectId)
  }, [activeProject, pathProgressCtx, markPathReached])

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
    flashToast('Step done', { important: true })
    setStepFocusKey((k) => k + 1)
  }

  const undoLastComplete = () => {
    if (!recentUndo?.id) return
    toggleTask(recentUndo.id)
    flashToast('Undid that')
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
      const label = step.label
      flashMicro(
        opts.micro === 'next' ? `Next empty · ${label}` : `Going to ${label}`
      )
      if (step.id) focusPathGapTarget(pathGapFocusSelector(step.id))
      return step
    },
    [setActiveView]
  )

  /**
   * Identity: rail Continue and footer Next share one rule — advance
   * Mark→…→Preview, then path Touchpoints. Elsewhere: path next stop.
   */
  const advancePathOrIdentity = useCallback(() => {
    if (activeView === 'brand') {
      const cur = resolveIdentitySubstep(
        useAppStore.getState().projects.find(
          (p) => p.id === useAppStore.getState().currentProjectId
        )?.identitySubstep
      )
      const nextSub = nextIdentitySubstep(cur)
      if (nextSub) {
        useAppStore.getState().updateBrandField('identitySubstep', nextSub.id)
        flashMicro(`Going to ${nextSub.label}`)
        return
      }
      const pathNext = getNextJourney('brand')
      if (pathNext) goToProcessStep(pathNext, { micro: 'open' })
      return
    }
    const pathNext = getNextJourney(activeView)
    if (pathNext) goToProcessStep(pathNext, { micro: 'open' })
  }, [activeView, goToProcessStep])

  /** Earliest incomplete step — reuses buildPathProgressCtx (same filters as strip) */
  const goToNextProcessGap = useCallback(() => {
    const gap = pathFirstGap(
      JOURNEY_STEPS,
      buildPathProgressCtx(useAppStore.getState())
    )
    if (gap?.view) return goToProcessStep(gap, { micro: 'next' })
    flashToast(
      'Steps look full — download the brand book on Deliver when you are ready'
    )
    setActiveView('finish')
    return null
  }, [goToProcessStep, setActiveView])

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

  /* Opening a project always lands on the desk — one predictable
     destination. A conditional landing (desk sometimes, resume other times)
     costs re-orientation on every open, because the user cannot predict
     where the click ends up. The resume target is not lost: the desk shows
     it as the first row of What's next, in the same slot every time, so the
     app visibly remembered instead of teleporting. */
  const openProjectWhereLeftOff = useCallback(
    (projectId) => {
      setCurrentProject(projectId)
      setActiveView('desk')
      setNavOpen(false)
    },
    [setCurrentProject, setActiveView]
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

  /** Project ids with unread client activity (boolean only — no counts). */
  const projectsWithClientUnread = useMemo(() => {
    const set = new Set()
    for (const r of clientInbox?.rows || []) {
      if (r?.unread && r.projectLocalId != null) {
        set.add(String(r.projectLocalId))
      }
    }
    return set
  }, [clientInbox?.rows])

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
          hasUnreadClient: projectsWithClientUnread.has(String(p.id)),
        }
      }),
    [activeProjects, moodItems, tasks, sparkIndex, projectsWithClientUnread]
  )

  /* One ordering + client grouping for BOTH the sidebar and Home, so a
     project sits in the same place on every surface (#17) and repeat clients
     cluster (#4). Reviewed by adhd-executive-function-advisor:
     - order is deterministic (in-progress first, completed sunk, store index
       as a stable final tiebreaker) so a row only moves on a deliberate act —
       a new project or a completion — never on a re-render or on merely
       opening a project;
     - client headings show ONLY when ≥2 named clients actually collide; a
       single-client or no-client studio renders a flat list with no heading
       tax;
     - unclienten projects (blank detective.clientName) sit UNLABELED at the
       top, where fresh or abandoned work is easiest to return to — never
       under a "No client" label, which reads as a deficiency. */
  const projectGroups = useMemo(
    () => groupProjectsByClient(projectsSummary, activeProjects),
    [projectsSummary, activeProjects]
  )

  const showClientHeadings = showClientHeadingsFor(projectGroups)

  /** Flat project order for Home default-select (same as grouped lists). */
  const homeOrderedSummaries = useMemo(
    () => projectGroups.flatMap((g) => g.projects),
    [projectGroups]
  )

  /* Return wall: when the selected Home project is missing, land on the top
     of needs-you → in-progress → ready (never an empty detail pane). */
  useEffect(() => {
    if (activeView !== 'home') return
    if (homeOrderedSummaries.length === 0) return
    const stillThere = homeOrderedSummaries.some(
      (s) => s.project.id === homeSelectedProjectId
    )
    if (!stillThere) {
      setHomeSelectedProjectId(homeOrderedSummaries[0].project.id)
    }
  }, [activeView, homeOrderedSummaries, homeSelectedProjectId])

  /* One phrasing for a project's next action, shared by the sidebar and the
     Home list so the two surfaces speak the identical phrase (advisor: memory
     transfers between surfaces instead of resetting). Two states only, no
     numeric ratio to decode. */
  const listRowNext = useCallback(
    (summary) =>
      summary.nextGap ? `Next: ${summary.nextGap.label}` : 'Ready to ship',
    []
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
      setMoreOpen(false)
      // Ask Helper to tuck if expanded
      window.dispatchEvent(new CustomEvent('cc-helper-minimize'))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [
    shortcutsOpen,
    deskConfirm,
    forceBreakConsentOpen,
    exportPanel,
    showBreakdown,
  ])

  /* No outside-click closer for the Tools menu anymore: it opens as a
     centered overlay whose backdrop click and Esc are the close paths —
     same as every other dialog here. */

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
        `Work block done (~${Math.round(workMin)} min). Break locks are off — stretch if you can.`
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
        flashToast('Break lock · check Settings')
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
        ? `Break locked: ${breakMin} min · ${kitN} care item(s) for this window`
        : `Break locked: ${breakMin} min (you worked about ${Math.round(workMin)} min)`
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
        ? step.label
        : toolsLabelForView(resume)
      flashMicro(`Back to ${label || resume}`)
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
        ? 'Break ended early — try a real rest next time.'
        : 'Break done · welcome back'
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

  // Focus traps — export / breakdown (Research lightbox lives in ResearchView)
  const getExportRoot = useCallback(
    () =>
      document.querySelector(
        '.export-overlay.no-print-hide, .export-overlay.portfolio-export, .export-overlay'
      ),
    []
  )
  const getBreakdownRoot = useCallback(
    () =>
      document
        .querySelector('.export-overlay .breakdown-panel')
        ?.closest('.export-overlay') || null,
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
  useModalFocus(!!exportPanel && !showBreakdown, getExportRoot, {
    initialSelector: '.export-panel-header button, button',
  })
  useModalFocus(!!showBreakdown, getBreakdownRoot, {
    initialSelector: '.export-panel-header button, button',
  })
  // Destructive/blocking confirm: land focus on Cancel (safe default), trap Tab
  useModalFocus(!!deskConfirm, getDeskConfirmRoot, {
    initialSelector: '.desk-confirm-cancel',
  })
  // Shortcuts panel: trap Tab and restore focus to the opener on close.
  useModalFocus(shortcutsOpen, getShortcutsRoot, {
    initialSelector: 'button',
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
        deskConfirm ||
        forceBreakConsentOpen ||
        document.querySelector('.board-lightbox-overlay')
      ) {
        return
      }
      /* WCAG 2.1.4 (Character Key Shortcuts): a bare single-key shortcut must
         not fire while focus is on some other control. These stay live in the
         workspace's resting state — focus in `#main-content` or nowhere in
         particular (the document body, where it sits on load and after a blur)
         — and go quiet the moment focus is deliberately placed elsewhere: a
         header/sidebar button, the Helper, an open dialog, or a speech-input
         target. (Text fields are already handled by the typing-guard above.)
         No off-switch and no modifier, so the initiation aid — press 1, you're
         in Define — is intact. A deliberate resting-body allowance: forcing
         focus into the workspace on every keystroke to satisfy the letter of
         2.1.4 would fight the app's own focus and is exactly the friction the
         ADHD mandate ranks above it. */
      const workspace = document.getElementById('main-content')
      const ae = document.activeElement
      const inWorkspace =
        !ae || ae === document.body || (workspace && workspace.contains(ae))
      if (!inWorkspace) return
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

  /* Identity history: about once an hour while the studio is open, if the
     mark/words/colour actually changed. Bump still saves a named point. */
  useEffect(() => {
    if (!unlocked || !onboarded || cloudHydrating || !activeProjectId) {
      return undefined
    }
    const HOUR_MS = 60 * 60 * 1000
    const run = () => {
      versionService.maybeHourlyVersion().catch(() => {})
    }
    /* Catch up if the last save is already stale (tab left open overnight). */
    run()
    const id = window.setInterval(run, HOUR_MS)
    return () => window.clearInterval(id)
  }, [unlocked, onboarded, cloudHydrating, activeProjectId])

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
      flashToast('Break still running — desk locked')
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

  /* Re-arm the single-key shortcuts after a header/sidebar navigation. Click a
     stage in the journey bar and focus sits on that button — outside the
     workspace — so the shortcuts would stay quiet until you clicked back into
     the content. When focus is parked on a control OUTSIDE #main-content at a
     view change, pull it into the workspace. It never touches the resting
     states (body, or focus already in the content), never steals from a
     control the view itself focused (e.g. N → capture box, which is inside
     the workspace), and stands down while a dialog owns focus. */
  useEffect(() => {
    const main = document.getElementById('main-content')
    if (!main) return
    if (
      exportPanel ||
      showBreakdown ||
      deskConfirm ||
      forceBreakConsentOpen ||
      shortcutsOpen ||
      document.querySelector('.board-lightbox-overlay')
    ) {
      return
    }
    const ae = document.activeElement
    if (!ae || ae === document.body || main.contains(ae)) return
    main.focus({ preventScroll: true })
    // Keyed on activeView ONLY: this arms the workspace on navigation. Keying
    // it on the dialog states too would re-fire on dialog CLOSE and stomp the
    // dialog's own focus-restore-to-opener — the guard above reads the current
    // dialog state at nav time, which is all it needs.
  }, [activeView])

  // Close sidebar project ⋯ menus on outside click / Escape. (The Tools
  // menu is a centered overlay now — its backdrop and the global Esc chain
  // close it, like every other dialog.)
  useEffect(() => {
    if (!openProjectMenuId) return
    const onPointer = (e) => {
      if (!e.target.closest('.journey-project-row-menu-wrap')) {
        setOpenProjectMenuId(null)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenProjectMenuId(null)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [openProjectMenuId])

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

  /* One push at a time, and only the newest result counts.

     The debounce above clears the TIMER, but once it fires the upsert runs for
     up to 25 seconds while the user keeps typing — long enough for the next
     debounce to fire a second push underneath the first. Completion order is
     not guaranteed, and pushWorkspace writes a whole row (onConflict:
     'user_id'), so an older snapshot resolving last overwrote everything newer.
     Last-response-wins, on exactly the flaky-mobile case this code was built
     for. The manual retry button raced the same way.

     So: if a push is running, note that another is wanted and coalesce the
     burst into one trailing push rather than stacking calls. Each attempt
     carries a generation, and a reply from a superseded generation is dropped
     — it must not overwrite state or drag the sync indicator backwards. */
  const pushInFlightRef = useRef(false)
  const pushQueuedRef = useRef(false)
  const pushGenRef = useRef(0)

  const runCloudPush = useCallback(async () => {
    if (pushInFlightRef.current) {
      pushQueuedRef.current = true
      return { ok: true, coalesced: true }
    }
    pushInFlightRef.current = true
    let last = { ok: true }
    try {
      do {
        pushQueuedRef.current = false
        const gen = (pushGenRef.current += 1)
        setSyncState('syncing')
        const result = await pushWorkspace(exportAllData())
        last = result
        // A newer push started while this one was in the air — its result is
        // the truth, so say nothing about this one.
        if (gen !== pushGenRef.current) continue
        if (result.ok) {
          setSyncState('ok')
          setSyncError('')
          applyImageUrlReplacements(result.replacements)
        } else {
          setSyncState('error')
          setSyncError(result.error || 'Couldn’t sync')
        }
      } while (pushQueuedRef.current)
    } finally {
      pushInFlightRef.current = false
    }
    return last
  }, [exportAllData, applyImageUrlReplacements])

  // Debounced push to Supabase when desk changes (local always saved via zustand)
  useEffect(() => {
    if (!CLOUD || !unlocked || !cloudUser || !cloudSyncReady.current) return
    if (skipNextCloudPush.current) {
      skipNextCloudPush.current = false
      return
    }
    if (cloudHydrating) return
    // Don't flip to "syncing" until the debounce fires — avoids flicker on every keystroke
    const t = window.setTimeout(() => {
      void runCloudPush()
    }, 1600)
    return () => window.clearTimeout(t)
  }, [
    runCloudPush,
    CLOUD,
    unlocked,
    cloudUser?.id,
    cloudHydrating,
    projects,
    tasks,
    moodItems,
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

  /* First unlock: no modal gate. Home (+ New project → intake) is enough.
     The old New project dialog duplicated create intake and blocked the desk. */
  useEffect(() => {
    if (!unlocked || cloudHydrating || onboarded) return
    setOnboarded(true)
    try {
      localStorage.setItem('cc-onboarded', '1')
    } catch {
      /* ignore */
    }
    setBodyDoubling(false)
    setActiveView('home')
  }, [unlocked, onboarded, cloudHydrating, setOnboarded, setBodyDoubling, setActiveView])

  /* The header rename input and its draft state are gone — rename lives on
     the project screen's title now (DefineView), where the name is visible
     in place rather than in chrome. */

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
    /* Capture the project before the async read, so a project switch during
       the downscale cannot land this image on the wrong one. */
    const ownerProjectId = activeProject?.id
    // Local data URL, downscaled like mood pins — protects localStorage quota
    const reader = new FileReader()
    reader.onerror = () =>
      flashToast('Could not read that image. Try another file.')
    reader.onload = async () => {
      try {
        const { downscaleDataUrl } = await import('./lib/moodPins')
        const scaled = await downscaleDataUrl(reader.result, file.type)
        setLogoImage(scaled, ownerProjectId)
        flashMicro('Cover image updated')
      } catch {
        setLogoImage(reader.result, ownerProjectId)
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
      // XP stays in Progress HUD — success toast stays human leave-behind language
      flashToast(
        kind === 'backup' ? 'Backup saved' : 'Client pack saved',
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
          : kind === 'mark'
            ? `${slug}-logo-files.zip`
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
      flashToast('Building brand kit…', {
        important: true,
      })
      return (async () => {
        const result = await downloadBrandKitZip(pack, handlePromise, {
          hideWatermark: hidePackWatermark,
          book: bookSetup,
        })
        if (result.ok) {
          setLastExportNote(
            `Everything (zip) · ${new Date().toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}`
          )
          finishOk('Everything (zip)')
        } else if (result.cancelled) {
          flashToast('Save cancelled — no problem')
        } else {
          flashToast(
            result.error || 'Download did not finish — try again?'
          )
        }
        return result
      })().finally(clearBusy)
    }

    if (kind === 'mark') {
      // Logo-only handoff: the real mark + an honest README, zipped. No book.
      flashToast('Zipping the logo files…', { important: true })
      return (async () => {
        const result = await downloadMarkPack(pack, handlePromise)
        if (result.ok) {
          setLastExportNote(
            `Logo files (zip) · ${new Date().toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}`
          )
          finishOk('Logo files (zip)')
          if (result.hasMark === false) {
            // The pack still saved (README explains the gap) — but say plainly
            // that no mark was in it, rather than letting "saved" imply one was.
            flashToast('Saved — but no logo image was in it yet')
          }
        } else if (result.cancelled) {
          flashToast('Save cancelled — no problem')
        } else {
          flashToast(result.error || 'Download did not finish — try again?')
        }
        return result
      })().finally(clearBusy)
    }

    if (kind === 'pdf') {
      // Vector direction pack (text + swatches as PDF primitives)
      void preloadPdfEngine()
      flashToast('Making your brand book PDF…', { important: true })
      return (async () => {
        const result = await downloadBrandPackPdf(pack, handlePromise, {
          hideWatermark: hidePackWatermark,
          mode: 'vector',
          book: bookSetup,
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
          flashToast('Save cancelled — no problem')
        } else {
          flashToast(result.error || 'Could not finish that PDF — try again?')
        }
        return result
      })().finally(clearBusy)
    }

    if (kind === 'pdf-preview') {
      // Raster snapshot matching on-screen artboard (optional)
      const hasSystem = document.getElementById('system-artboard')
      if (!hasSystem && !exportPanel) openExportPanel()
      void preloadPdfEngine()
      flashToast('Making a simple preview PDF…', { important: true })
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
          flashToast('Save cancelled — no problem')
        } else {
          flashToast(result.error || 'Could not finish that PDF — try again?')
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
            flashToast('Save cancelled — no problem')
          } else {
            flashToast(result.error || 'Download did not finish — try again?')
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
            flashToast('Save cancelled — no problem')
          else flashToast(result.error || 'Download did not finish — try again?')
          return result
        })
        .finally(clearBusy)
    }
    if (kind === 'json') {
      return Promise.resolve(downloadBrandPackJson(pack, handlePromise))
        .then((result) => {
          if (result.ok) finishOk('Brand JSON')
          else if (result.cancelled) {
            flashToast('Save cancelled — no problem')
          } else {
            flashToast(result.error || 'Download did not finish — try again?')
          }
          return result
        })
        .finally(clearBusy)
    }
    if (kind === 'backup') {
      const result = downloadWorkspaceBackup(exportAllData())
      if (result.ok) finishOk('Workspace backup')
      else {
        flashToast(result.error || 'Download did not finish — try again?')
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
            : { ok: false, error: 'Nothing to print yet' }
          if (r.ok) {
            awardAndBroadcast('export_pack', { label: 'Print / PDF' })
            const when = new Date().toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })
            setLastExportNote(
              `Print dialog · ${when} — Save as PDF if you want a file`
            )
            flashToast('Print is open — choose Save as PDF if you want a file')
          } else {
            flashToast(r.error || 'Print did not open — try again?')
          }
          clearBusy()
          resolve(r)
        }, exportPanel ? 50 : 180)
      })
    }
    flashToast('Not sure what to export')
    clearBusy()
    return Promise.resolve({ ok: false })
  }
  runExportRef.current = runExport

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
        ? 'One tiny step is ready — do only that one'
        : `${n} tiny steps ready — only do #1 right now`
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
        notifyAction(
          'Soft Signal demo loaded',
          'project_create',
          { label: 'Soft Signal demo' }
        )
      } else {
        flashToast(result.error || 'Could not load that demo')
      }
    } catch (e) {
      flashToast(e?.message || 'Could not load Soft Signal demo')
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
        /* Desk is the project hub — open there so the Studio sample is visible. */
        setActiveView('desk')
        notifyAction(
          'Harbor & Hearth demo loaded · desk sample ready',
          'project_create',
          { label: 'Harbor & Hearth demo' }
        )
      } else {
        flashToast(result.error || 'Could not load that demo')
      }
    } catch (e) {
      flashToast(e?.message || 'Could not load Harbor & Hearth demo')
    }
  }

  const loadHarborHearthDemo = () => {
    setDeskConfirm({
      kind: 'demo',
      label:
        'Load Harbor & Hearth desk sample? Replaces workspace. Backup first if needed.',
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
        flashToast('Backup restored')
      } else {
        flashToast(result.error || 'Could not import that file')
      }
    }
    reader.onerror = () => flashToast('Could not read that file')
    reader.readAsText(file)
  }

  const handleDeleteProjectById = (id, name) => {
    if (!id) return
    if (projects.length <= 1) {
      flashToast('Keep at least one project')
      return
    }
    const wasActive = id === activeProjectId
    setDeskConfirm({
      kind: 'delete-project',
      label: `Delete this project and its steps & pictures? You cannot undo this. (“${name}”)`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        const result = deleteProject(id)
        if (result.ok) {
          flashToast('Project deleted')
          if (wasActive) setActiveView('project')
        } else {
          flashToast(result.error || 'Could not delete that')
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
      flashToast('Keep at least one project')
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
        if (result?.ok) flashToast('Project archived')
        else flashToast(result?.error || 'Could not archive that')
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
      flashToast('Signed out — rest easy')
      return
    }
    closeSession()
    setUnlocked(false)
    setAccessName('')
    flashToast('Desk locked')
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
  /** Rail label on Identity: next sub-screen, else Touchpoints (path next). */
  const identityRailNext =
    activeView === 'brand'
      ? nextIdentitySubstep(activeProject?.identitySubstep) || journeyNext
      : null
  const stepRailContinueLabel =
    activeView === 'brand'
      ? identityRailNext?.label || journeyNext?.label
      : journeyNext?.label
  const stepRailContinueVisible =
    activeView === 'brand'
      ? !!(identityRailNext || journeyNext)
      : !!journeyNext

  /* Header back affordance — one stable header whose contents adapt per view
     (2026 design handoff). Derivation, not a per-view lookup table:
     - Home is the root: no back at all (a dead ‹ is worse than none).
     - Journey stops walk back one stop (order from JOURNEY_STEPS — never a
       hand-written prev chain); the first stop returns Home.
     - Tools views return to where you were on the path (lastView — only ever
       a journey view), falling back to Home when no project exists yet, so a
       fresh account is never sent to a project screen with no project.
     - Timer keeps its "started from Research" return path and clears the
       flag on the way out, same as the in-view chip it replaces.
     Labels always come from labelForView() — journeySingleSource guards. */
  const headerBack = (() => {
    if (activeView === 'home') return null
    const pathFallback = activeProject
      ? activeProject.lastView || 'project'
      : 'home'
    let target
    if (journeyActive) {
      target = getPrevJourney(activeView)?.view || 'home'
    } else if (activeView === 'insights' && timerFocusSource === 'research') {
      target = 'studio'
    } else if (activeView === 'clients' || activeView === 'create') {
      target = 'home'
    } else if (activeView === 'clientRecord') {
      target = 'clients'
    } else if (activeView === 'desk') {
      target = 'home'
    } else {
      target = pathFallback
    }
    return {
      label: labelForView(target),
      go: () => {
        if (activeView === 'insights') setTimerFocusSource(null)
        setActiveView(target)
        // The header stays tappable above the open mobile drawer (z-70 vs
        // 60), so back must close it like every other navigating control —
        // else the destination loads underneath a still-open drawer.
        setNavOpen(false)
      },
    }
  })()

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
          {/* Back affordance (2026 design chrome). On Home there is no back —
              the wordmark stands where it would be, as a mark, not a button
              (a control that navigates to the screen it is on is a dead
              click). Everywhere else: ‹ plus the destination's name, derived
              in headerBack above. The old header project-rename inputs are
              gone from here — rename lives on the project screen's title now
              (owner's call), where the name is visible in place. */}
          {headerBack ? (
            <button
              type="button"
              className="header-back"
              onClick={headerBack.go}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {headerBack.label}
            </button>
          ) : (
            <div className="brand-block">
              <LogoLockup className="logo" reduceMotion={reduceMotion} />
            </div>
          )}
          {/* Which project am I in — read-only context, all widths. The old
              mobile title carried this answer (as an input); with rename
              moved to the project screen this span keeps the answer ambient
              on the path, where losing your place mid-interruption is the
              actual risk. Hidden on Tools pages: the back label already
              names the return point and the work there isn't project-scoped
              in the same way. */}
          {journeyActive && activeProject && (
            <span className="header-context">{activeProject.name}</span>
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
            {/* No project name input or <select> here anymore. The rename
                input moved to the project screen's title (visible in place);
                a <select> would hide every other project behind a dropdown.
                The sidebar list is the switcher — always visible, one click,
                with progress counts — and .header-context answers "which
                project am I in". */}
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
                Working
                {/* Split out so a narrow header can drop the detail and keep
                    the readout whole. Capping the chip and letting it ellipsis
                    spent the same width to render "Workin…" — the detail was
                    already lost, and the project name was paying for it. */}
                <span className="work-clock-chip-detail"> · {sessionLabel}</span>
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
                {/* Named on screen, like the clock chip beside it says
                    "Working". The two sat side by side as bare readouts whose
                    only distinction lived in hover text — and to someone for
                    whom numbers do not register, two adjacent numbers with no
                    names are the same thing twice. The word is what keeps the
                    deliberate clock/timer separation visible instead of
                    something the user has to remember. */}
                ⏱ Focus · {focusMinutes}:{String(focusSeconds).padStart(2, '0')}
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
                        flashToast(result.error || 'Could not sync right now')
                        return
                      }
                      if (result.payload && Array.isArray(result.payload.projects)) {
                        skipNextCloudPush.current = true
                        const hydrated = hydrateFromPayload(result.payload)
                        if (hydrated.ok) {
                          setSyncState('ok')
                          flashToast('Desk saved to the cloud')
                        } else {
                          skipNextCloudPush.current = false
                          setSyncState('error')
                          setSyncError(hydrated.error || 'Couldn’t load cloud desk')
                          flashToast(hydrated.error || 'Could not sync right now')
                        }
                      } else {
                        setSyncState('ok')
                        flashToast('Desk saved to the cloud')
                      }
                      return
                    }
                    // Same coalescing path as the auto-push, so pressing
                    // retry cannot race the save already in flight.
                    const result = await runCloudPush()
                    if (result.ok) {
                      flashToast('Desk saved to the cloud')
                    } else {
                      setSyncState('error')
                      setSyncError(result.error || 'Couldn’t sync')
                      flashToast(result.error || 'Could not sync right now')
                    }
                  } catch (e) {
                    setSyncState('error')
                    setSyncError(e?.message || 'Couldn’t sync')
                    flashToast(e?.message || 'Could not sync right now')
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

            {/* Calendar / Clients / Settings / Tools left this row for the
                sidebar's "Go to" band (2026 design chrome — the top nav is
                gone). They are low-frequency destinations; what stays here
                is the always-needed chrome — To-do pill, client inbox, the
                status chips and the Saved dot — because a count or an error
                only does its job while it is visible without an action. */}

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
              const label = step.label
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
          {/* Sequential forward. On Identity, same advance as footer Next
              (sub-screens then Touchpoints) — never skip craft screens.
              Elsewhere: next path stop. Home still uses pathNextGap. */}
          {stepRailContinueVisible && stepRailContinueLabel && (
            <button
              type="button"
              /* is-earned: the gradient ring fires ONLY when the stop you are
                 on is complete — a reward you caused, not standing chrome
                 (advisor: rarity is the mechanism; a permanent chromatic
                 accent habituates in days and taxes attention forever).
                 Static always, one per screen, never on destructive or
                 client-facing controls. */
              /* Secondary: in-page Next is the solid primary (one forward). */
              className={`btn btn-secondary step-rail-cta${
                journeyActive && thisStepFilled ? ' is-earned' : ''
              }`}
              onClick={() => advancePathOrIdentity()}
            >
              Continue → {stepRailContinueLabel}
            </button>
          )}
        </nav>
      )}

      {/* The Activity table used to render here beside the HUD. It could not
          show a true row in any configuration: without Supabase the hook
          returned three invented ones — a "Website Redesign" project, a
          "Create logo concepts" task, timestamps faked at one, two and three
          hours ago — and with Supabase it queried `user_activity`, a table
          that appears in no migration and that nothing in this app has ever
          written to. So the two possible states were fabricated history or an
          error about a missing table.

          It is the Promise/Proof bug at full size, and it had been defended
          rather than questioned: `formatActivityType` carried a careful
          null-guard against malformed rows arriving from a table that has
          never existed. Its markup was Tailwind-classed too, in a repo with no
          Tailwind, so the columns it did draw were unstyled.

          Deleted rather than emptied. A panel kept alive on an honest empty
          state is still UI in front of nothing, and the build rule is that a
          feature needing a backend that does not exist is blocked — not
          shipped as its own shape. If activity is wanted later, the honest
          source is already on hand: workLog, tasks and projects hold real
          history that no table needs to be invented for. */}
      {showProgress && (
        <Suspense fallback={null}>
          <GameHUD />
        </Suspense>
      )}
      <nav
        className={`journey-sidebar${journeyActive ? '' : ' is-tools'}`}
        aria-label="Your path in Creative Companion"
        /* Parked off-canvas on mobile, its 10 buttons stayed keyboard-
           reachable — Tab from the header walked into an invisible drawer.
           inert only applies below 768px, where the drawer is closed. */
        /* `true`, not '': React treats an empty string as false for boolean
           attributes, so the drawer was never actually inert and the bug
           this comment describes was still live. */
        inert={isMobileViewport && !navOpen ? true : undefined}
      >
          {/* "Go to" band — the global destinations that used to live in the
              top nav (removed, 2026 design chrome). Fixed short band ABOVE
              the variable-length project list, because anything below a list
              that grows is below-the-fold, and for this user below-the-fold
              is the same as gone. Low-frequency destinations only: the
              always-needed chrome (To-do, inbox, status) stays on the
              header, where a count is visible without opening anything.

              Labelled, not icon-only. `title` does not exist on touch and
              does not fire on keyboard focus; these are visited rarely
              enough that a bare glyph is re-derived from scratch on each
              encounter instead of recognised. The icon still leads, so the
              rows scan by shape; the word is what makes a cold return after
              two weeks survivable. No aria-label: the visible text is the
              accessible name, which keeps voice control working.

              Settings is a destination, not a dropdown — theme and Log out
              live on that page, so a menu here would just ask "which of the
              two menus holds this?" before every use. */}
          {/* Studio = multi-project destinations. Path steps below = This project. */}
          <div className="journey-goto-section" aria-label="Studio">
            <span className="journey-goto-heading">Studio</span>
            <button
              type="button"
              className="journey-goto-row"
              onClick={() => {
                setActiveView('home')
                setNavOpen(false)
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 11.5 12 4l8 7.5" />
                <path d="M6 10v9h12v-9" />
              </svg>
              {toolsLabelForView('home')}
            </button>
            <button
              type="button"
              className="journey-goto-row"
              onClick={() => {
                setActiveView('calendar')
                setNavOpen(false)
              }}
            >
              <HeaderIcon name="calendar" />
              {toolsLabelForView('calendar')}
            </button>
            <button
              type="button"
              className="journey-goto-row"
              onClick={() => {
                setActiveView('clients')
                setNavOpen(false)
              }}
            >
              <HeaderIcon name="people" />
              {toolsLabelForView('clients')}
            </button>
            <button
              type="button"
              className="journey-goto-row"
              onClick={() => {
                setActiveView('settings')
                setNavOpen(false)
              }}
            >
              <span aria-hidden="true">⚙</span>
              {toolsLabelForView('settings')}
            </button>
            <button
              type="button"
              className="journey-goto-row"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              // Set only while the menu exists (it renders conditionally) —
              // a static aria-controls would point at a missing id when
              // closed.
              aria-controls={moreOpen ? 'tools-menu' : undefined}
              id="tools-menu-button"
              onClick={() => {
                setMoreOpen(true)
                setNavOpen(false)
              }}
            >
              <HeaderIcon name="tools" />
              Tools
            </button>
          </div>
          <div className="journey-projects-section" aria-label="Your projects">
            <div className="journey-projects-head">
              <span className="journey-projects-heading">Projects</span>
              <button
                type="button"
                className="journey-projects-add"
                onClick={() => {
                  // Opens the new-project intake (name + 3 quick answers)
                  // instead of creating a blank project instantly.
                  setActiveView('create')
                  setNavOpen(false)
                }}
                aria-label="New project"
                title="New project"
              >
                +
              </button>
            </div>
            <ul className="journey-projects-list">
              {projectGroups.map((group) => (
                <Fragment key={group.key}>
                  {showClientHeadings && group.clientName && (
                    <li className="journey-projects-group-head" role="presentation">
                      {group.clientName}
                    </li>
                  )}
                  {group.projects.map((summary) => {
                const p = summary.project
                const isActive = p.id === activeProjectId
                const menuOpen = openProjectMenuId === p.id
                // A named next action beats a ratio: "1/5" has to be decoded
                // into a meaning and still doesn't say what to do. Shared with
                // Home via listRowNext so both surfaces speak the same phrase.
                const nextLabel = listRowNext(summary)
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
                              if (!r.ok) flashToast(r.error || 'Could not archive that')
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
                </Fragment>
              ))}
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
          <div className="journey-path-section" aria-label="This project path">
            <span className="journey-path-heading">This project</span>
            {activeProject ? (
              <button
                type="button"
                className={`journey-goto-row journey-desk-row${
                  activeView === 'desk' ? ' is-current' : ''
                }`}
                onClick={() => {
                  setActiveView('desk')
                  setNavOpen(false)
                }}
              >
                <span aria-hidden="true">▦</span>
                Desk
              </button>
            ) : (
              <p className="journey-path-empty">
                Open a project to see its path.
              </p>
            )}
            <ol className="journey-bar-list">
              {JOURNEY_STEPS.map((step, idx) => {
                const active = journeyActive === step.id
                const label = step.label
                const plain = step.plain
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
                      disabled={!activeProject}
                      onClick={() => {
                        if (!activeProject) return
                        setActiveView(step.view)
                        setNavOpen(false)
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
                        {hasContent && !active
                          ? '✓'
                          : String(step.num).padStart(2, '0')}
                      </span>
                      <span className="journey-label">{label}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
          {/* Only when actually in a Tools menu view — never "Tools · Home" */}
          {isToolsMenuView(activeView) && (
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
        {/* Inner crash net — wraps only the view, so a screen that throws
            leaves the header, the Tools menu and the project nav standing and
            the answer is "go somewhere else" rather than "the app is gone".
            main.jsx holds the outer one for anything that gets past this.

            Keyed on the view so navigating away remounts it and clears the
            error. Without the key the boundary stays broken after you leave,
            which is a worse trap than a white page because it looks
            deliberate. The escape hatch points somewhere OTHER than the screen
            that just failed — offering "back to the project" while the project
            view is the thing crashing is a button that re-runs the crash. */}
        <ErrorBoundary
          key={activeView}
          leaveLabel={
            activeView === 'project' ? 'Back to your projects' : 'Back to the project'
          }
          onLeave={() => setActiveView(activeView === 'project' ? 'home' : 'project')}
        >
        {journeyActive && activeView !== 'review' && activeView !== 'finish' && (
          <JourneyGapStrip
            thisStepFilled={thisStepFilled}
            pathNextGap={pathNextGap}
            leaveBehindThin={leaveBehindThin}
            activeView={activeView}
            setActiveView={setActiveView}
          />
        )}
        {/* Path-title ambient chips removed (owner): identity stamp, client
            arrival, before/after progress line, and stage Mark done. They
            stacked under every journey page title. Mark done stays on the
            desk gap card; unread client stays in inbox / Home rows. */}
        {/* ===== HOME — studio dashboard (all project counts) =====
            Glanceable work status: pick-up + project cards + path + client.
            Not a sparse single CTA card. */}
        {activeView === 'home' &&
          (() => {
            const n = activeProjects.length
            const orderedFlat = homeOrderedSummaries
            const focus =
              n === 0
                ? null
                : orderedFlat.find(
                    (s) => s.project.id === homeSelectedProjectId
                  ) || orderedFlat[0]
            const clientOf = (s) =>
              (s.project?.detective?.clientName || '').trim()
            const needsYouList = orderedFlat.filter((s) => s.hasUnreadClient)
            const readyList = orderedFlat.filter((s) => s.packReady)
            const studioHours = hoursForRange(
              workLogsFromProjects(activeProjects),
              homeHoursRange
            )

            if (n === 0) {
              return (
                <section className="home-dash" aria-label="Home dashboard">
                  <header className="home-dash-head">
                    <h1 className="home-dash-title">Home</h1>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setActiveView('create')}
                    >
                      + New project
                    </button>
                  </header>
                  <p className="home-dash-empty">
                    Run client brand projects from brief to leave-behind —
                    five stops, one pack to send.
                  </p>
                  <ol className="home-dash-path-promise" aria-label="The path">
                    {JOURNEY_STEPS.map((s) => (
                      <li key={s.id}>
                        <strong>{s.label}</strong>
                        <span>{s.plain}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="home-dash-empty-hint">
                    Start a project when you&rsquo;re ready — blanks are fine.
                  </p>
                </section>
              )
            }

            if (!focus) return null
            const pathFull = !!focus.pathFull
            const packReady = !!focus.packReady
            const nextLabel = packReady
              ? 'Brand book ready'
              : pathFull
                ? 'Path full — pack still thin'
                : focus.nextGap
                  ? focus.nextGap.label
                  : 'All caught up'
            const nextStepMeta = JOURNEY_STEPS.find(
              (s) => s.id === focus.nextGap?.id
            )
            const nextPlain =
              nextStepMeta?.plain ||
              (packReady
                ? 'Download or send the leave-behind from Assets.'
                : pathFull
                  ? `Open ${labelForStepId('deliver')} to fill gaps or ship.`
                  : '')

            return (
              <section className="home-dash" aria-label="Home dashboard">
                <header className="home-dash-head">
                  <div>
                    <p className="home-dash-eyebrow">Home</p>
                    <h1 className="home-dash-title">Studio</h1>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveView('create')}
                  >
                    + New project
                  </button>
                </header>

                {/* Pick-up — one primary action */}
                <div className="home-dash-pickup">
                  <div className="home-dash-pickup-copy">
                    <p className="home-dash-pickup-project">
                      {clientOf(focus)
                        ? `${clientOf(focus)} · ${focus.project.name}`
                        : focus.project.name}
                      {focus.hasUnreadClient ? (
                        <span className="home-dash-pill">Client waiting</span>
                      ) : null}
                    </p>
                    <p className="home-dash-pickup-kicker">
                      {focus.hasUnreadClient
                        ? 'Needs you'
                        : packReady
                          ? 'Ready'
                          : 'Next'}
                    </p>
                    <h2 className="home-dash-pickup-title">
                      {focus.hasUnreadClient
                        ? 'Client inbox'
                        : nextLabel}
                    </h2>
                    {focus.hasUnreadClient ? (
                      <p className="home-dash-pickup-plain">
                        Open their messages and answers.
                      </p>
                    ) : nextPlain ? (
                      <p className="home-dash-pickup-plain">{nextPlain}</p>
                    ) : null}
                  </div>
                  <div className="home-dash-pickup-actions">
                    <button
                      type="button"
                      className="btn btn-primary home-dash-primary"
                      onClick={() => {
                        if (focus.hasUnreadClient) {
                          setCurrentProject(focus.project.id)
                          setClientInboxOpen(true)
                          return
                        }
                        if (pathFull) {
                          setCurrentProject(focus.project.id)
                          setActiveView('finish')
                          return
                        }
                        switchProjectAndContinue(focus.project.id)
                      }}
                    >
                      {focus.hasUnreadClient
                        ? 'Open client inbox'
                        : pathFull
                          ? `Open ${labelForStepId('deliver')}`
                          : `Continue · ${focus.nextGap?.label || 'work'}`}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        openProjectWhereLeftOff(focus.project.id)
                      }
                    >
                      Desk
                    </button>
                  </div>
                </div>

                <div className="home-dash-grid">
                  {/* Projects */}
                  <section
                    className="home-dash-panel home-dash-projects"
                    aria-label="Projects"
                  >
                    <div className="home-dash-panel-head">
                      <h2 className="home-dash-panel-title">Projects</h2>
                      <span className="home-dash-panel-meta">
                        {n === 1 ? '1 open' : `${n} open`}
                      </span>
                    </div>
                    <ul className="home-dash-project-list">
                      {orderedFlat.map((summary) => {
                        const p = summary.project
                        const isFocus = p.id === focus.project.id
                        const unread = !!summary.hasUnreadClient
                        const client = clientOf(summary)
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              className={`home-dash-project-card${
                                isFocus ? ' is-focus' : ''
                              }${unread ? ' has-unread' : ''}`}
                              onClick={() => {
                                setHomeSelectedProjectId(p.id)
                                if (n === 1) {
                                  openProjectWhereLeftOff(p.id)
                                }
                              }}
                            >
                              <span className="home-dash-project-card-top">
                                <span className="home-dash-project-name">
                                  {p.name}
                                </span>
                                {unread ? (
                                  <span
                                    className="home-md-row-badge"
                                    aria-label="Client activity waiting"
                                  />
                                ) : null}
                              </span>
                              {client ? (
                                <span className="home-dash-project-client">
                                  {client}
                                </span>
                              ) : null}
                              <span
                                className={`home-dash-project-next${
                                  summary.pathFull ? ' is-done' : ''
                                }`}
                              >
                                {listRowNext(summary)}
                              </span>
                              <span
                                className="home-dash-mini-path"
                                aria-hidden="true"
                              >
                                {summary.rows.map((r) => (
                                  <i
                                    key={r.id}
                                    className={
                                      r.done
                                        ? 'is-done'
                                        : summary.nextGap?.id === r.id
                                          ? 'is-current'
                                          : ''
                                    }
                                  />
                                ))}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </section>

                  {/* One next stop only — full path lives in nav / Desk (audit dual-map). */}
                  <section
                    className="home-dash-panel home-dash-up-next"
                    aria-label="Up next on focus project"
                  >
                    <div className="home-dash-panel-head">
                      <h2 className="home-dash-panel-title">Up next</h2>
                      <span className="home-dash-panel-meta">
                        {focus.project.name}
                      </span>
                    </div>
                    {pathFull ? (
                      <p className="home-dash-panel-empty">
                        Path complete — open Assets to ship or Desk to review.
                      </p>
                    ) : focus.nextGap ? (
                      <button
                        type="button"
                        className="home-dash-up-next-card"
                        onClick={() => {
                          setCurrentProject(focus.project.id)
                          setActiveView(focus.nextGap.view)
                        }}
                      >
                        <span className="home-dash-up-next-kicker">
                          Continue
                        </span>
                        <span className="home-dash-up-next-title">
                          {focus.nextGap.label}
                        </span>
                        <span className="home-dash-up-next-plain">
                          {nextStepMeta?.plain ||
                            nextStepMeta?.enough ||
                            'Open this stop'}
                        </span>
                      </button>
                    ) : (
                      <p className="home-dash-panel-empty">
                        Nothing open on the path.
                      </p>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm home-dash-panel-cta"
                      onClick={() =>
                        openProjectWhereLeftOff(focus.project.id)
                      }
                    >
                      Open desk
                    </button>
                  </section>
                  {/* Client needs you */}
                  <section
                    className="home-dash-panel"
                    aria-label="Client activity"
                  >
                    <div className="home-dash-panel-head">
                      <h2 className="home-dash-panel-title">Client</h2>
                      <span className="home-dash-panel-meta">
                        {needsYouList.length
                          ? 'Waiting on you'
                          : 'Quiet'}
                      </span>
                    </div>
                    {needsYouList.length === 0 ? (
                      <p className="home-dash-panel-empty">
                        No unread client activity across open projects.
                      </p>
                    ) : (
                      <ul className="home-dash-client-list">
                        {needsYouList.map((s) => (
                          <li key={s.project.id}>
                            <button
                              type="button"
                              className="home-dash-client-row"
                              onClick={() => {
                                setHomeSelectedProjectId(s.project.id)
                                setCurrentProject(s.project.id)
                                setClientInboxOpen(true)
                              }}
                            >
                              <span className="home-dash-client-name">
                                {s.project.name}
                              </span>
                              <span className="home-dash-client-action">
                                Open inbox
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm home-dash-panel-cta"
                      onClick={() => setClientInboxOpen(true)}
                    >
                      Client inbox
                    </button>
                  </section>

                  {/* Ready to ship */}
                  <section
                    className="home-dash-panel"
                    aria-label="Ready to ship"
                  >
                    <div className="home-dash-panel-head">
                      <h2 className="home-dash-panel-title">Ready to ship</h2>
                      <span className="home-dash-panel-meta">
                        {readyList.length
                          ? `${readyList.length} pack${readyList.length === 1 ? '' : 's'}`
                          : 'None yet'}
                      </span>
                    </div>
                    {readyList.length === 0 ? (
                      <p className="home-dash-panel-empty">
                        When a pack is ready for handoff, it shows up here.
                      </p>
                    ) : (
                      <ul className="home-dash-client-list">
                        {readyList.map((s) => (
                          <li key={s.project.id}>
                            <button
                              type="button"
                              className="home-dash-client-row"
                              onClick={() => {
                                setCurrentProject(s.project.id)
                                setActiveView('finish')
                              }}
                            >
                              <span className="home-dash-client-name">
                                {s.project.name}
                              </span>
                              <span className="home-dash-client-action">
                                Open {labelForStepId('deliver')}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* Hours worked — private workLog only */}
                  <section
                    className="home-dash-panel home-dash-hours"
                    aria-label="Hours worked"
                  >
                    <div className="home-dash-panel-head">
                      <h2 className="home-dash-panel-title">Hours worked</h2>
                      <span className="home-dash-panel-meta">
                        {studioHours.rangeLabel}
                      </span>
                    </div>
                    <div
                      className="home-dash-hours-ranges"
                      role="tablist"
                      aria-label="Hours range"
                    >
                      {HOURS_RANGES.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          role="tab"
                          aria-selected={homeHoursRange === r.id}
                          className={`home-dash-hours-range${
                            homeHoursRange === r.id ? ' is-active' : ''
                          }`}
                          onClick={() => setHomeHoursRange(r.id)}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                    {studioHours.total <= 0 ? (
                      <p className="home-dash-panel-empty">
                        No clocked hours in this range. Time on the work clock
                        shows up here (private — not the invoice).
                      </p>
                    ) : (
                      <>
                        <p className="home-dash-hours-total">
                          {hoursLoggedWords(studioHours.total)}
                          <span className="home-dash-hours-range-note">
                            {' '}
                            · {studioHours.rangeLabel}
                          </span>
                        </p>
                        <div
                          className={`home-dash-hours-bars${
                            homeHoursRange === 'month' ? ' is-dense' : ''
                          }`}
                          role="img"
                          aria-label={`${hoursLoggedWords(studioHours.total)} · ${studioHours.rangeLabel}`}
                        >
                          {studioHours.buckets.map((b) => (
                            <div key={b.key} className="home-dash-hours-col">
                              <div
                                className={`home-dash-hours-bar${
                                  b.fill ? ' is-filled' : ''
                                }`}
                                style={{ height: `${b.hPx}px` }}
                                title={
                                  b.fill
                                    ? `${b.label}: ${formatHoursWorked(b.hours)}h`
                                    : undefined
                                }
                              />
                              <span className="home-dash-hours-label">
                                {b.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                </div>
              </section>
            )
          })()}
        {/* ===== WORK — one step owns the fold ===== */}
        {/* ===== SKETCH (lazy) ===== */}
        {activeView === 'flow' && (
          <Suspense fallback={<PathViewSkeleton
              label={`Loading ${labelForView('flow')}…`}
            />}>
            <StepDependencyReminder stepId="sketch" />
            <SketchView
              navDir={navDir}
              activeProject={activeProject}
              projectPalette={projectPalette}
              journeyNext={journeyNext}
              setActiveView={setActiveView}
              flashMicro={flashMicro}
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
              navDir={navDir}
              journeyNext={journeyNext}
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
              flashMicro={flashMicro}
              addTask={addTask}
              projectId={activeProjectId}
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
            />
          </Suspense>

        )}
        {/* ===== CALENDAR (lazy) ===== */}
        {activeView === 'calendar' && (
          <Suspense fallback={<PathViewSkeleton label="Loading calendar…" />}>
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

        {/* ===== CLIENTS (lazy) ===== */}
        {activeView === 'clients' && (
          <Suspense fallback={<PathViewSkeleton label="Loading clients…" />}>
            <ClientsView
              projects={projects}
              selectProject={selectProject}
              setActiveView={setActiveView}
              openClientRecord={(name) => {
                setClientRecordName(name)
                setActiveView('clientRecord')
              }}
            />
          </Suspense>
        )}

        {activeView === 'desk' && (
          <Suspense fallback={<PathViewSkeleton label="Loading desk…" />}>
            <DeskView
              project={activeProject}
              palette={projectPalette}
              pins={deskMood}
              rows={pathRows}
              nextGap={pathNextGap}
              tasks={deskTasks}
              clientInbox={clientInbox}
              onOpenView={setActiveView}
              onOpenClientInbox={() => setClientInboxOpen(true)}
              onToggleTask={toggleTask}
              onToggleNotNeeded={(stepId) =>
                activeProject &&
                useAppStore.getState().toggleStepNotNeeded(activeProject.id, stepId)
              }
              onMarkStepDone={(stepId, done) =>
                activeProject &&
                useAppStore.getState().setStepDone(stepId, done, activeProject.id)
              }
              onEditIdentity={() => setActiveView('brand')}
              onEditBrief={() => setActiveView('project')}
              onOpenWall={() => setActiveView('studio')}
              onOpenAssets={() => setActiveView('finish')}
            />
          </Suspense>
        )}

        {activeView === 'clientRecord' && (
          <Suspense fallback={<PathViewSkeleton label="Loading client…" />}>
            <ClientRecordView
              clientName={clientRecordName}
              projects={projects}
              projectsSummary={projectsSummary}
              listRowNext={listRowNext}
              openProject={openProjectWhereLeftOff}
              onNewProject={(name) => {
                setIntakeClientName(name)
                setActiveView('create')
              }}
              flashMicro={flashMicro}
            />
          </Suspense>
        )}

        {activeView === 'create' && (
          <Suspense fallback={<PathViewSkeleton label="Loading…" />}>
            <NewProjectIntake
              setActiveView={setActiveView}
              flashToast={flashToast}
              /* Pre-filled when opened from a client record ("New project
                 for {client}") — cleared on unmount so the next fresh
                 intake doesn't inherit a stale name. */
              initialClientName={intakeClientName}
              onDone={() => setIntakeClientName('')}
            />
          </Suspense>
        )}

        {/* ===== BRAND BOOK BUILDER (lazy) ===== */}
        {activeView === 'book' && (
          <Suspense
            fallback={<PathViewSkeleton label="Loading brand book…" />}
          >
            <BrandBookBuilderView />
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
              navDir={navDir}
              journeyNext={journeyNext}
              activeProject={activeProject}
              deskMood={deskMood}
              projectPalette={projectPalette}
              hidePackWatermark={hidePackWatermark}
              setActiveView={setActiveView}
              flashToast={flashToast}
              flashMicro={flashMicro}
              /* Prop names must match DesignView's destructure — they
                 didn't (brandEditSection vs brandEditSectionProp), so the
                 deep-link jump from Review/Deliver was silently inert. */
              brandEditSectionProp={brandEditSection}
              setBrandEditSectionProp={setBrandEditSection}
            />
          </Suspense>
        )}

        {/* ===== REVIEW (lazy) ===== */}
        {activeView === 'review' && (
          <Suspense fallback={<PathViewSkeleton label="Loading Review…" />}>
            <StepDependencyReminder stepId="review" />
            <ReviewView
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
              navDir={navDir}
              activeProject={activeProject}
              projectPalette={projectPalette}
              deskTasks={deskTasks}
              completedCount={completedCount}
              pathRows={pathRows}
              pathDoneCount={pathDoneCount}
              pathMissingLabelsList={pathMissingLabelsList}
              pathNextGap={pathNextGap}
              leaveBehindThin={leaveBehindThin}
              hidePackWatermark={hidePackWatermark}
              bookSetup={bookSetup}
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
              runCloudPush={runCloudPush}
              exportAllData={exportAllData}
              setSyncState={setSyncState}
              setSyncError={setSyncError}
              handleSignOut={handleSignOut}
              theme={theme}
              toggleTheme={toggleTheme}
              openShortcuts={() => setShortcutsOpen(true)}
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
              navDir={navDir}
              journeyNext={journeyNext}
              activeProject={activeProject}
              setActiveView={setActiveView}
              updateDetective={updateDetective}
              onOpenShare={() => setOverviewSharePanelOpen(true)}
              setProjectDeadline={setProjectDeadline}
              projectDeadline={projectDeadline}
              flashMicro={flashMicro}
            />
          </Suspense>
        )}
        </ErrorBoundary>

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
        stageLabel={labelForStepId(journeyIdForView(activeView) || 'define')}
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
        prefs={prefs}
        setPref={setPref}
        peekInvoiceNumber={peekInvoiceNumber}
        commitInvoiceNumber={commitInvoiceNumber}
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

      {/* Tools — a centered overlay, not a header dropdown (the header nav
          is gone; the trigger lives in the sidebar's Go to band). Centered
          per the standing rule: dialogs render front and center, never
          anchored/bottom/top. Backdrop click and the global Esc chain
          close it. Same items, same order as the old menu:
          ordered by how often each is reached, not by category tidiness —
          an unsorted list is read in full every time. Destructive last.
          The three mobile-only Go-to mirrors (Calendar/Clients/Settings)
          are retired: those rows live in the sidebar band at every width
          now, and two doors to one place is a which-one fork.

          The Account group (Settings/theme/Log out) stays gone — those
          live on the Settings page, one home each. The to-do list keeps
          its one door: the labelled pill in the header. */}
      {moreOpen && (
        <div
          className="export-overlay tools-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tools-menu-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMoreOpen(false)
          }}
        >
          <div className="export-panel tools-panel">
            <div className="export-panel-header">
              <h3 id="tools-menu-title" style={{ margin: 0 }}>
                Tools
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Close tools"
                onClick={() => setMoreOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="more-menu" role="menu" id="tools-menu" aria-labelledby="tools-menu-title">
              <p className="more-menu-group-label">Go to</p>
              <button
                type="button"
                role="menuitem"
                className="more-menu-item"
                onClick={() => {
                  setActiveView('book')
                  setMoreOpen(false)
                }}
              >
                <HeaderIcon name="print" /> {toolsLabelForView('book')}
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
                <HeaderIcon name="timer" /> Timer
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
                  setOverviewSharePanelOpen(true)
                  setMoreOpen(false)
                }}
              >
                <span aria-hidden="true">↗</span> Share project overview
              </button>
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
              {/* Archive/Delete: destructive actions keep one learnable
                  home, worded, last. */}
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
            </div>
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
            Lock desk 5–10 min after focus? Off anytime in Settings.
          </p>
          <div className="desk-confirm-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setPref('forceBreaksConsented', true)
                setPref('forceBreaksEnabled', true)
                setForceBreakConsentOpen(false)
                flashToast('Break lock on')
              }}
            >
              On
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setPref('forceBreaksEnabled', false)
                setForceBreakConsentOpen(false)
                flashToast('Break lock off')
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
              {deskConfirm.confirmLabel || 'Continue'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm desk-confirm-cancel"
              onClick={() => setDeskConfirm(null)}
            >
              Cancel
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
          aria-labelledby="export-panel-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExportPanel(null)
          }}
        >
          <div className="export-panel portfolio-export export-studio">
            <div className="export-panel-header no-print">
              <div>
                <h3 id="export-panel-title" style={{ margin: 0 }}>
                  Export
                </h3>
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
                Brand book PDF
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
        {/* Named on screen, not only in the tooltip. A bare list glyph is an
            invented private code — there is no universal icon for "your
            running to-do" — and this is the one control the user is meant to
            reach for without hunting. The count still rides alongside when
            there is something in it, so a glance answers both "what is this"
            and "is there anything waiting" without opening it. */}
        <span className="todo-fab__label">To-do</span>
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
              ? pathNextGap.label
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
    </div>
  )
}

export default App
