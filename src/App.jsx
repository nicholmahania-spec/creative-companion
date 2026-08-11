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
import { useWorkClock } from './lib/useWorkClock'
import { projectsShellEqual } from './lib/storeSelectors'
import {
  groupProjectsByClient,
  showClientHeadings as showClientHeadingsFor,
} from './lib/projectGrouping'
import MainOutlet from './app/MainOutlet'
import { warmPathViewChunks, RESTORABLE_VIEWS } from './app/viewRegistry'
import versionService from './services/versionService'

import { DEFAULT_PALETTE } from './lib/color'
import { clampFocusMaskPct } from './lib/uiPrefs'
import { downscaleDataUrl } from './lib/moodPins'
import { resolveStudioName } from './lib/studio/studioIdentity'
import ErrorBoundary from './components/error/ErrorBoundary'
import {
  toISODate,
  deadlineUrgency,
  daysUntil,
} from './lib/dates'
import { loadCapturePad, saveCapturePad } from './lib/capturePad'
import {
  APP_BUILD,
  APP_BUILD_DATE,
  versionLabel,
} from './lib/version'
const LoginView = lazy(() => import('./views/LoginView'))
const BuddyMate = lazy(() => import('./features/helper/BuddyMate'))
const ForcedBreakOverlay = lazy(() => import('./features/helper/ForcedBreakOverlay'))
const BrandArtboard = lazy(() => import('./components/BrandArtboard'))
const TaskBreakdown = lazy(() => import('./features/breakdown/TaskBreakdown'))
import {
  breakMinutesForWork,
  POMODORO_WORK_MIN,
} from './lib/helper/forcedBreak'
import { pickBreakPlan } from './lib/helper/breakKit'
import { markBreak, minutesSinceBreak, loadSessionStart, loadWellness } from './lib/helper/buddy'
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
} from './lib/helper/sessionResume'
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
} from './lib/journey/journey'
import {
  pathStepHasContent,
  pathStepMeetsCondition,
  pathProgressSummary,
  pathFirstGap,
  pathGapFocusSelector,
  buildPathProgressCtx,
  focusPathGapTarget,
  sameProjectId,
} from './lib/journey/journeyProgress'
import {
  nextIdentitySubstep,
  resolveIdentitySubstep,
} from './lib/journey/identitySubsteps'

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
  downloadClientPackage,
  downloadMarkPack,
  downloadWorkspaceBackup,
  packReadiness,
  preloadPdfEngine,
  printElementById,
  slugifyFilename,
} from './lib/book/exportFiles'
import {
  hoursForRange,
  workLogsFromProjects,
  formatHoursWorked,
  hoursLoggedWords,
  HOURS_RANGES,
} from './lib/billing/workWeek'
import LogoLockup from './components/LogoLockup'
import HeaderIcon from './components/HeaderIcon'
import AccountMenu from './components/AccountMenu'
import PullToRefresh from './components/PullToRefresh'
import HighlightExplain from './components/HighlightExplain'
import DeployNotice from './components/DeployNotice'
import { RunningTodoAddModal, RunningTodoPanel } from './features/billing/RunningTodo'
import { HoursInvoicePanel } from './features/billing/HoursInvoice'
import { WorkLogPanel } from './features/billing/WorkLogPanel'
import { DiscoveryBriefPanel } from './features/client-portal/DiscoveryBrief'
import { ProjectOverviewSharePanel } from './features/client-portal/ProjectOverviewShare'
import {
  ClientInboxChip,
  ClientInboxPanel,
  useClientInbox,
} from './features/client-portal/ClientInbox'
import { guessRunningTodoStage } from './lib/billing/runningTodoStages'
import { installAutoGrow } from './lib/autoGrow'
import { chooseLift, collectBlockers, maxLiftFor } from './lib/fabClearance'
import { useModalFocus } from './lib/useModalFocus'
import { useMenuKeyboard } from './lib/useMenuKeyboard'
import useIsMobile from './lib/useIsMobile'
import {
  isSessionOpen,
  closeSession,
  getSession,
  changeAccessPassword,
} from './lib/auth'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { createAssetStorage } from './lib/assets/assetStorage'
import { adoptBriefAttachments } from './lib/assets/adoptBriefAttachments'
import { syncAllProjects } from './services/syncEngine'
import { stepsForProject } from './lib/journey/projectTypes'

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
  const toggleProjectStep = useCallback(
    (...a) => useAppStore.getState().toggleProjectStep(...a),
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
      /* Derived from the view registry, not restated. The hand-written list
         that used to live here had drifted: desk, clients, assets and create
         were all missing, so a refresh on any of them dropped you on Home —
         and mid-intake it took a part-filled form with it. */
      const allowed = new Set(RESTORABLE_VIEWS)
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
  /* Seeded from storage, so a thought half-typed before a reload or a
     navigation is still there. See lib/capturePad.js for why this lives
     beside the workspace payload rather than inside it. */
  const [quickInput, setQuickInput] = useState(() => loadCapturePad())
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
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
  /* The To-do pill collapses to a circle while the page is moving, so the
     area that can land on a control shrinks from ~86px to 48px, then returns
     to its labelled shape the moment you stop. Owner's call (2026-08-07) over
     reserving a gutter or moving it; hiding it was ruled out, since it is the
     frictionless-capture entry point and a pill that is absent when the
     thought arrives loses the thought.

     Idle timer, not scroll direction: direction flips on every small
     correction, which would make the pill flicker between two shapes. The
     shrink is visual only — aria-label carries the accessible name and never
     changes, so nothing moves for a screen reader. */
  const [fabCompact, setFabCompact] = useState(false)
  /* Clearance (see src/lib/fabClearance.js for the full reasoning). The pill
     keeps its column and rests at the lowest offset in it that holds no
     interactive element, recomputed only when the page is at rest — which is
     the only time a tap can land. Refs, not state: this writes one CSS custom
     property on one node and must not re-render the app on every scroll stop. */
  const todoFabRef = useRef(null)
  const fabLiftRef = useRef(0)
  const fabWidthRef = useRef(0)
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
  /* Tools is a menu hung off a button, not a modal — see useMenuKeyboard. */
  const toolsMenuRef = useRef(null)
  const toolsButtonRef = useRef(null)
  const closeMore = useCallback(() => setMoreOpen(false), [])
  const { onKeyDown: onToolsKeyDown, dismiss: dismissTools } = useMenuKeyboard(
    moreOpen,
    { menuRef: toolsMenuRef, triggerRef: toolsButtonRef, onClose: closeMore }
  )
  const [accountOpen, setAccountOpen] = useState(false)
  const [openProjectMenuId, setOpenProjectMenuId] = useState(null)
  const [restoreSelect, setRestoreSelect] = useState('')
  const [navOpen, setNavOpen] = useState(false)
  const [captureOptionsOpen, setCaptureOptionsOpen] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)
  /* The wizard's own seven fields live in TaskBreakdown. This counter is the
     whole of what App still needs: bumping it remounts the wizard, which is
     how a run resets — see the note in that file on why not an effect. */
  const [breakdownRunId, setBreakdownRunId] = useState(0)
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
  /** Settings pref overrides OS prefers-reduced-motion — drives Lottie + hop */
  const reduceMotion = prefs.reduceMotion ?? osReduceMotion
  /** Pomodoro desk lock — default on; user can disable */
  const forceBreaksEnabled = prefs.forceBreaksEnabled !== false
  /* One value governs every client-facing surface. Empty is the normal
     state: the footer then reads project name and date.

     Falls back to the invoice identity, which is the fix for a real defect:
     the app already asks for the studio's name in Invoice (`prefs.invoiceFrom`)
     and used to ignore it here, so a designer who had typed it once still
     shipped uncredited client work. A comment on the Deliver field claimed
     this prefill existed; nothing implemented it. Now it does. */
  const studioName = resolveStudioName(prefs)
  const studioLogo = String(prefs.studioLogo || '').trim()
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
    async (incoming, projectId) => {
      const store = useAppStore.getState()
      const ownerProjectId = projectId ?? store.currentProjectId
      store.mergeDetectiveAnswers(incoming, ownerProjectId)

      /* Client uploads land in a public intake bucket because the client has
         no studio account. Once the designer accepts the reviewed Brief, copy
         the exact image into the existing private Asset Library and replace
         the Brief's conceptual source with an assetRef. The public URL stays
         only as the legacy-compatible image preview fallback. */
      const attachments = Array.isArray(incoming?.existingAssetsFiles)
        ? incoming.existingAssetsFiles
        : []
      if (!attachments.length || !supabase || !isSupabaseConfigured()) return

      const project = useAppStore.getState().projects.find((p) => p.id === ownerProjectId)
      if (!project) return
      const adopted = await adoptBriefAttachments({
        projectId: ownerProjectId,
        attachments,
        assets: useAppStore.getState().assets,
        durableStore: createAssetStorage(supabase),
      })
      const current = useAppStore.getState()
      if (adopted.hydratedAssets.length) current.upsertAssets(adopted.hydratedAssets)
      if (adopted.assets.length) current.addAssets(adopted.assets)
      for (const link of adopted.links) {
        current.linkBriefAttachmentToAsset(
          ownerProjectId,
          'existingAssets',
          link.url,
          link.assetRef
        )
      }
    },
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
  /* `pathStepsFull` / `brandBookReady` were computed here and consumed by
     NOTHING — the only surviving reference was a comment in DeskView. Dead
     since whatever removed their last reader; found while tracing the
     step-completion model on 2026-08-08. `leaveBehindThin` is still real and
     is passed down below. */
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

  /**
   * Say what happened, once.
   *
   * This used to award XP as a side effect and append "· +12" or "· band 4"
   * to the message. The `action` and `meta` arguments are still accepted
   * because ~30 call sites pass them and they read as documentation of what
   * just happened — but nothing accumulates now. PRODUCT.md §21 bans XP,
   * levels and streaks, and the ledger did nothing for task initiation that
   * this toast does not already do.
   */
  const notifyAction = (baseMsg) => {
    flashToast(baseMsg)
    return null
  }


  const completeCurrentStep = () => {
    if (!nextTask) return
    const doneId = nextTask.id
    const doneTitle = nextTask.title
    toggleTask(doneId)
    setStepDueOpen(false)
    setBuddyWinPulse((n) => n + 1)
    offerUndo(doneTitle, () => {
      toggleTask(doneId)
      setStepFocusKey((k) => k + 1)
    })
    flashToast('Step done', { important: true })
    setStepFocusKey((k) => k + 1)
  }

  /**
   * Arm the undo chip for any action that can be honestly reversed.
   *
   * Was hard-wired to task completion — one action out of the several the app
   * can do to you. Everything genuinely destructive still went through a
   * confirmation dialog whose copy had to say "You cannot undo this", which is
   * the sentence this function exists to delete.
   *
   * `restore` must actually restore. If a caller cannot write one truthfully,
   * it should keep its dialog: an undo that silently fails to put something
   * back is worse than the dialog, because the user has been told it was safe
   * and has no reason to check.
   *
   * One chip at a time, latest wins — an undo STACK would be a second thing to
   * hold in mind, which is the opposite of the point.
   */
  const offerUndo = (title, restore) => {
    if (typeof restore !== 'function') return
    setRecentUndo({ title, restore, at: Date.now() })
  }

  const undoLastComplete = () => {
    if (typeof recentUndo?.restore !== 'function') return
    recentUndo.restore()
    flashToast('Undid that')
    setRecentUndo(null)
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

  /* Keep the half-typed capture line. Written on every keystroke rather than
     debounced: the interruption this protects against — closing the tab, the
     browser being killed, wandering off — gives no warning and would land
     inside any debounce window. A short string to localStorage is cheap
     enough that buying certainty with it is the right trade. */
  useEffect(() => {
    saveCapturePad(quickInput)
  }, [quickInput])

  const quickCaptureRef = useRef(null)
  useModalFocus(quickCaptureOpen, () => quickCaptureRef.current, {
    initialSelector: '#quick-capture-input',
    onClose: () => setQuickCaptureOpen(false),
  })

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
      if (accountOpen) {
        e.preventDefault()
        setAccountOpen(false)
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
    accountOpen,
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
        `Work block done (~${Math.round(workMin)} min). Screen lock is off — stretch if you can.`
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
        flashToast('Screen locked for a break — open Settings to turn this off')
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
        ? `Screen locked for a break: ${breakMin} min · ${kitN} care item(s) for this window`
        : `Screen locked for a break: ${breakMin} min (you worked about ${Math.round(workMin)} min)`
    )
  }

  const completeBreakPlanItem = (item) => {
    if (!item?.id) return
    const isFallback = String(item.id).startsWith('_')
    if (!isFallback) {
      completeBreakKitItem(item.id)
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

  /* The work clock — a record of what you actually worked on, per stage and
     per project. Its two pieces of state, five refs and six effects lived
     here; nothing outside App ever read any of them, and these two values
     are all the app consumes. See src/lib/useWorkClock.js. */
  const { workRunning, sessionLabel } = useWorkClock({
    activeView,
    activeProjectId,
    forcedBreak,
    flashToast,
  })


  /* The path this PROJECT walks, not the full catalogue.
     A logo job does not show Touchpoints. Numbering is recomputed inside
     stepsForProject, so the rail positions and the 1-N keyboard shortcuts
     both describe what is actually on screen. The work clock's own STAGE_VIEWS
     (now in useWorkClock) stays the full catalogue on purpose — time spent in
     a view is still time worked whether or not that stage is part of this
     project's path. */
  const pathSteps = useMemo(
    () => stepsForProject(activeProject),
    [activeProject?.projectType, activeProject?.stepsOn]
  )
  /* Stages switched off for this project — object permanence for the rail:
     a stop that is simply absent is invisible, and invisible is how a
     designer ends up wondering whether the app lost something. */
  const offSteps = useMemo(() => {
    const on = new Set(pathSteps.map((s) => s.id))
    return JOURNEY_STEPS.filter((s) => !on.has(s.id))
  }, [pathSteps])

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
      /* N — capture WITHOUT leaving the screen.
         This used to jump to Flow and focus its capture field, which defeated
         the point: the whole reason quick capture exists is to let an
         intrusive thought be put down without derailing what you are doing,
         and navigating away pays the full context switch the capture was
         meant to avoid — you lose the view you were in and have to rebuild
         where you were. That made pressing N a worse deal than not capturing
         at all. It now opens a single field over whatever is on screen. */
      if (k === 'n') {
        e.preventDefault()
        setQuickCaptureOpen(true)
        window.setTimeout(() => {
          document.getElementById('quick-capture-input')?.focus?.()
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
      /* Keys address the path THIS project walks, not the catalogue.
         On a four-stage project, key 5 must do nothing rather than jump to
         a stage the rail does not show — a shortcut that reaches somewhere
         invisible is how you end up somewhere you cannot navigate back to.
         pathSteps is already renumbered, so index and label agree. */
      const n = Number(e.key)
      if (n < 1 || n > pathSteps.length) return
      const step = pathSteps[n - 1]
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
    pathSteps,
  ])

  // Prefetch path view chunks while idle
  useEffect(() => {
    if (!unlocked || cloudHydrating) return undefined
    const warm = () => {
      warmPathViewChunks()
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
      flashToast('Break still running — wait for it to finish')
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

  /* Seat the To-do pill where it steals nothing.
   *
   * Runs only when the page has come to rest, because that is the only moment
   * a tap can land — during a scroll a touch stops the page, it does not
   * activate a control. So there is no per-frame work here and nothing moves
   * while you are moving.
   *
   * The home footprint is reconstructed from `bottom`/`right`/`offsetHeight`
   * rather than read off `getBoundingClientRect`, and that is not fussiness —
   * it is the bug this shipped with first. Both the lift and the compact width
   * are CSS transitions, so a rect read here is mid-flight, and deriving home
   * as "where it is now, plus the lift I asked for" compounded that error into
   * itself on every settle: measured over a 60px-step walk the pill climbed
   * 60px per stop until it ran out of room, and seated itself on top of inputs
   * on the way. Offsets and `offsetHeight` are layout, which no transform or
   * transition touches. `offsetWidth` is not — the compact state really does
   * narrow the box — so the width keeps the widest value ever seen, because
   * seating the 48px circle somewhere the 86px pill will not fit is the same
   * bug 180ms later. */
  const settleTodoFab = useCallback(() => {
    const fab = todoFabRef.current
    if (!fab) return
    const height = fab.offsetHeight
    // Desktop hides the pill entirely (header pill instead) — 0x0, nothing to do.
    if (!height || !fab.offsetWidth) return

    const own = fab.getBoundingClientRect()
    /* Something is over the pill — a dialog backdrop, the print overlay, or the
       pill itself stood down because a field has focus. Freeze the seat rather
       than measure through it: an overlay reads as "nothing interactive under
       here", so re-seating now would send the pill home to sit on whatever the
       overlay is hiding, and there is no event to correct it when the overlay
       goes. Keeping the last good seat is both safer and free — this is also
       what stops a settle running on every keystroke, since the pill steps
       aside for a focused field and so bails here. */
    const atCentre = document.elementFromPoint(
      Math.round(own.left + own.width / 2),
      Math.round(own.top + own.height / 2)
    )
    if (!atCentre || (atCentre !== fab && !fab.contains(atCentre))) return

    const cs = window.getComputedStyle(fab)
    const width = Math.max(fab.offsetWidth, fabWidthRef.current)
    fabWidthRef.current = width
    /* The count badge is absolutely positioned outside the button's box, so the
       pill's tappable area is bigger than the pill. Measured off the children
       rather than restated from the CSS: both rects carry the same transform,
       so the difference is the true overhang whatever the pill is doing, and it
       cannot drift if the badge is restyled. */
    let over = { top: 0, right: 0, bottom: 0, left: 0 }
    for (const child of fab.children) {
      const cr = child.getBoundingClientRect()
      if (!cr.width || !cr.height) continue
      over = {
        top: Math.max(over.top, own.top - cr.top),
        right: Math.max(over.right, cr.right - own.right),
        bottom: Math.max(over.bottom, cr.bottom - own.bottom),
        left: Math.max(over.left, own.left - cr.left),
      }
    }
    const bottom = window.innerHeight - (parseFloat(cs.bottom) || 0) + over.bottom
    const right = window.innerWidth - (parseFloat(cs.right) || 0) + over.right
    const lift = fabLiftRef.current
    const column = {
      left: right - width - over.left - over.right,
      right,
      top: bottom - height - over.top - over.bottom,
      bottom,
      maxLift: maxLiftFor(window.innerHeight),
    }
    const next = chooseLift({
      top: column.top,
      bottom: column.bottom,
      blockers: collectBlockers(fab, column),
      maxLift: column.maxLift,
      currentLift: lift,
    })
    /* null = nothing within reach is clear, which needs the whole column to be
       tiled with controls. Never seen on any measured surface; home is the
       honest fallback, since a pill parked halfway up the screen is a worse
       failure than an overlap the user can see. */
    const applied = next == null ? 0 : next
    if (applied === lift) return
    fabLiftRef.current = applied
    fab.style.setProperty('--todo-fab-lift', `${applied}px`)
  }, [])

  /* Collapse the To-do pill while the page is moving; restore it on idle.
     rAF-coalesced so a fast flick sets the flag once per frame rather than
     once per scroll event, and the 450ms idle window is long enough that
     momentum scrolling does not re-expand it mid-glide. The transition (and
     its prefers-reduced-motion opt-out) lives in CSS beside the pill. */
  useEffect(() => {
    let idleTimer = 0
    let seatTimer = 0
    let frame = 0
    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0
          setFabCompact(true)
        })
      }
      clearTimeout(idleTimer)
      clearTimeout(seatTimer)
      /* Re-seat on a much shorter fuse than the 450ms expand. Momentum scroll
         fires events every frame, so 90ms of silence already means the page
         has stopped — and everything between "stopped" and "re-seated" is time
         the pill spends on top of whatever it landed over. Waiting for the
         450ms expand left a third of a second where a tap could still be
         taken. Seating and expanding are separate concerns on separate fuses. */
      seatTimer = window.setTimeout(settleTodoFab, 90)
      idleTimer = window.setTimeout(() => {
        setFabCompact(false)
        settleTodoFab()
      }, 450)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(idleTimer)
      clearTimeout(seatTimer)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [settleTodoFab])

  /* The other three moments the pill's footprint can stop being clear without
     a scroll: arriving on a view, the viewport changing shape, and the page
     itself growing or shrinking under a stationary pill (a card added, a
     section opened, an async render landing). Without the last one the pill
     would be correct on arrival and wrong forever after. */
  useEffect(() => {
    let settleTimer = 0
    const schedule = () => {
      clearTimeout(settleTimer)
      settleTimer = window.setTimeout(settleTodoFab, 120)
    }
    schedule()
    window.addEventListener('resize', schedule)
    const ro =
      typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null
    if (ro && document.body) ro.observe(document.body)
    return () => {
      clearTimeout(settleTimer)
      window.removeEventListener('resize', schedule)
      if (ro) ro.disconnect()
    }
  }, [activeView, settleTodoFab])

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

  /* Phase 1b: background sync of projects through the structured path
     (clients → brands → projects), alongside the blob push above. Longer
     debounce than the blob — this one does per-project network work.
     Offline is fine: the engine reports it as a state, not a failure, and
     the 'online' listener below runs a catch-up sync when the connection
     returns. Local storage remains the working copy throughout. */
  useEffect(() => {
    if (!CLOUD || !unlocked || !cloudUser || cloudHydrating) return undefined
    const t = window.setTimeout(() => {
      void syncAllProjects({
        getProjects: () => useAppStore.getState().projects,
        setProjects: (next) => useAppStore.setState({ projects: next }),
        getDeletedProjects: () => useAppStore.getState().deletedProjects || [],
      })
    }, 3000)
    return () => window.clearTimeout(t)
  }, [CLOUD, unlocked, cloudUser, cloudHydrating, projects])

  useEffect(() => {
    if (!CLOUD) return undefined
    const onBack = () => {
      if (!unlocked || !cloudUser) return
      void syncAllProjects({
        getProjects: () => useAppStore.getState().projects,
        setProjects: (next) => useAppStore.setState({ projects: next }),
        getDeletedProjects: () => useAppStore.getState().deletedProjects || [],
      })
    }
    window.addEventListener('online', onBack)
    return () => window.removeEventListener('online', onBack)
  }, [CLOUD, unlocked, cloudUser])

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
      studioName,
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
  /* `direct: true` skips the save-file picker and downloads straight to the
     downloads folder.
     Why it exists: two cold-start runs reported "Download brand book PDF"
     as doing nothing. The picker had been dismissed (or was unavailable),
     and the vector path returns cancelled WITHOUT falling back — so the only
     trace was a toast that dismisses itself. Miss it and the button looks
     dead, on the one deliverable the client is paying for. A genuine cancel
     must still cancel, so the fallback is offered rather than forced. */
  const runExport = (kind, { direct = false } = {}) => {
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
          : kind === 'package'
            ? `${slug}-brand-package.zip`
          : kind === 'html'
            ? `${slug}-brand-direction.html`
            : kind === 'md'
              ? `${slug}-brand-direction.md`
              : kind === 'json'
                ? `${slug}-brand-pack.json`
                : kind === 'backup'
                  ? `creative-companion-backup-${toISODate()}.json`
                  : null
    const handlePromise =
      saveName && !direct
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
          flashToast('Save cancelled')
        } else {
          flashToast(
            result.error || 'Download did not finish — try again?'
          )
        }
        return result
      })().finally(clearBusy)
    }

    if (kind === 'package') {
      /* The organized client handoff: numbered folders, named files, fonts
         documented rather than redistributed, and anything the rights say is
         not the client's held back. The toast reports what was left out —
         a package that quietly ships less than the plan promised is the one
         failure this whole path exists to prevent. */
      flashToast('Building the client package…', { important: true })
      return (async () => {
        const result = await downloadClientPackage(
          pack,
          {
            /* No `hideWatermark` any more. The credit is now the studio's own
               name, carried on the pack itself as `pack.studio`, so every
               surface reads one value instead of a boolean only the book PDF
               honoured. This call site arrived from #126 while that change
               was in flight: the two merged with no textual conflict and left
               a free identifier that would have thrown at render — caught by
               the ratchet's zero-tolerance no-undef rule, not by review. */
            book: bookSetup,
            assets: pack.packageAssets || [],
          },
          handlePromise
        )
        if (result.ok) {
          const held = (result.excluded?.length || 0) + (result.missing?.length || 0)
          finishOk('Client package (zip)')
          if (held > 0) {
            flashToast(
              `${result.written} file${result.written === 1 ? '' : 's'} packaged · ${held} left out — see the package panel`,
              { important: true }
            )
          }
        } else if (result.cancelled) {
          flashToast('Save cancelled')
        } else {
          flashToast(result.error || 'Download did not finish — try again?')
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
          flashToast('Save cancelled')
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
          /* A persistent line, not just a toast. The toast was the ONLY
             signal and it disappears; the note stays on screen next to the
             button with a way to finish the job. */
          setLastExportNote('Not saved — you closed the save box. Download anyway?')
          flashToast('Save cancelled')
        } else {
          setLastExportNote(`Not saved — ${result.error || 'the PDF did not finish'}. Try again?`)
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
          flashToast('Save cancelled')
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
            flashToast('Save cancelled')
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
            flashToast('Save cancelled')
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
            flashToast('Save cancelled')
          } else {
            flashToast(result.error || 'Download did not finish — try again?')
          }
          return result
        })
        .finally(clearBusy)
    }
    if (kind === 'backup') {
      /* handlePromise, like every other kind. Without it the picker's 0-byte
         placeholder was the whole backup — see downloadWorkspaceBackup. */
      return downloadWorkspaceBackup(exportAllData(), handlePromise)
        .then((result) => {
          if (result.ok) finishOk('Workspace backup')
          else if (result.cancelled) flashToast('Save cancelled')
          else {
            flashToast(result.error || 'Download did not finish — try again?')
          }
          return result
        })
        .finally(clearBusy)
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
            ? printElementById(el.id)
            : { ok: false, error: 'Nothing to print yet' }
          if (r.ok) {
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

  /* Bumping the run id remounts the wizard, so "open" and "More" are the same
     action — a fresh run either way. */
  const openBreakdown = () => {
    setBreakdownRunId((n) => n + 1)
    setShowBreakdown(true)
    setMoreOpen(false)
  }

  /* Commits the wizard's steps and returns how many landed, which is all the
     wizard needs back. Everything after the batch write is App's: the queue,
     the view switch, the award and the toast all outlive the panel. */
  const commitBreakdown = ({ steps, energy, goalLabel }) => {
    const n = addMicroStepsBatch({ steps, energy, goalLabel })
    setPref('queueCollapsed', true)
    setQueueOpen(false)
    setDoneOpen(false)
    setActiveView('flow')
    setStepFocusKey((k) => k + 1)
    flashToast(
      n === 1
        ? 'One tiny step is ready — do only that one'
        : `${n} tiny steps ready — only do #1 right now`
    )
    return n
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

  /**
   * Delete a project — no dialog, an undo instead.
   *
   * This used to raise a danger confirm whose copy read "You cannot undo
   * this." It now can be undone, so it does not need to ask. A confirmation is
   * a decision; an undo is not, and the difference decides whether a stale
   * project ever actually gets cleared off the desk.
   *
   * The undo restores the view as well as the data. Deleting the last project
   * bounces the app to Create, and putting the rows back without putting the
   * user back would leave them somewhere they never chose to be — the restore
   * has to return the whole situation, not just the state.
   */
  const handleDeleteProjectById = (id, name) => {
    /* `id == null`, not `!id`. A project whose id is 0, '' or NaN is falsy,
       and the old guard returned here — no deletion, no toast, no undo, no
       error. The button did nothing at all and said nothing about it, which
       is indistinguishable from a broken app. Only a genuinely absent id is
       nothing to act on; every other value goes to the store, which reports
       honestly when it cannot find the project. */
    if (id == null) return
    const wasActive = sameProjectId(id, activeProjectId)
    const prevView = activeView
    const result = deleteProject(id)
    if (!result.ok) {
      flashToast(result.error || 'Could not delete that')
      return
    }
    if (result.empty) setActiveView('create')
    else if (wasActive) setActiveView('project')
    flashToast(
      result.empty ? 'Project deleted — desk is empty' : 'Project deleted'
    )
    offerUndo(name || 'Project deleted', () => {
      result.restore?.()
      setActiveView(prevView)
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
        {/* Before the header exists there is still a copy to name — and the
            sign-in screen is where a wrong copy is cheapest to leave. */}
        <DeployNotice />
        <LoginView
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
              Loading your projects…
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
            <HeaderIcon name={navOpen ? 'close' : 'menu'} />
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
                          flashToast('Saved to the cloud')
                        } else {
                          skipNextCloudPush.current = false
                          setSyncState('error')
                          setSyncError(hydrated.error || 'Couldn’t load cloud desk')
                          flashToast(hydrated.error || 'Could not sync right now')
                        }
                      } else {
                        setSyncState('ok')
                        flashToast('Saved to the cloud')
                      }
                      return
                    }
                    // Same coalescing path as the auto-push, so pressing
                    // retry cannot race the save already in flight.
                    const result = await runCloudPush()
                    if (result.ok) {
                      flashToast('Saved to the cloud')
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
            {/* Local: pulse after persist writes. Cloud: syncState. Never a
                hardcoded permanent “Saved” when storage is blocked. */}
            {!storageBlockedRef.current &&
              (CLOUD
                ? syncState !== 'error' && (
                    <span className="header-saved" aria-live="polite">
                      <span className="header-saved-dot" aria-hidden="true" />
                      {syncState === 'syncing' ? 'Saving…' : 'Saved'}
                    </span>
                  )
                : (
                    <span className="header-saved" aria-live="polite">
                      <span className="header-saved-dot" aria-hidden="true" />
                      {savePulse ? 'Saving…' : 'Saved'}
                    </span>
                  ))}

            {/* Account — rightmost. Identity + theme + Settings + sign out/lock.
                Not a second Settings surface: full prefs stay on Settings. */}
            <AccountMenu
              open={accountOpen}
              onOpen={() => setAccountOpen(true)}
              onClose={() => setAccountOpen(false)}
              accessName={accessName}
              theme={theme}
              toggleTheme={toggleTheme}
              onOpenSettings={() => setActiveView('settings')}
              onSignOut={handleSignOut}
              cloud={CLOUD}
            />

          </div>
        </div>
        {/* Which copy of the app is this? Renders nothing on production and
            nothing locally — see components/DeployNotice.jsx. Inside <header>
            deliberately: the header is the one region present on every screen,
            and this answer has to be un-missable without being an alarm. */}
        <DeployNotice />
      </header>

      {/* THE PATH, DRAWN ONCE. Answers "where am I" by position, and the one
          button names its own destination so the choice collapses to a
          zero-decision default.

          Two renderers of one list used to sit on screen together on desktop:
          this rail and the sidebar's `.journey-bar-list`, both mapping
          `pathSteps`, both drawing ticks. Owner's call (2026-08-09): the rail
          is the persistent path, the bar-list is mobile/contextual. So the
          bar-list is hidden from 768px up (shell.css) and this rail is no
          longer gated on being ON a path view — otherwise hiding the other one
          would leave the Desk with no map at all, which is the exact failure
          `stopEstablished.js`'s header records having already been fixed once.

          It follows the project, not the stage: path stops, the Desk and the
          off-path Tools screens all keep it. Home, Clients and Settings are
          studio-level and get nothing, because there is no project whose path
          it could describe.

          (Note for the next reader: the old comment here said "desktop only,
          CSS-hidden below 768px". That was never true — the max-width:767px
          block sets `display: flex !important` and moves it to the `hud` row,
          showing the active pill. Mobile has always had both.) */}
      {activeProject &&
        (journeyActive || activeView === 'desk' || isToolsMenuView(activeView)) && (
        <nav className="step-rail" aria-label="Process position">
          <ol className="step-rail-list">
            {pathSteps.map((step) => {
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
          {/* Stages this project has switched off, and the way back.
              At the rail's TAIL because that is where the absence is felt —
              you reach the end and notice a stop that was never there. In
              Settings it would be a per-project fact wearing an app-preference
              coat, findable only by remembering it exists rather than by
              looking. One muted line naming them together, not a row each: a
              list of off-stages is a list of decisions.
              (adhd-executive-function-advisor, 2026-08-05.) */}
          {offSteps.length > 0 && (
            <p className="step-rail-off">
              {/* "A and B and C" was fine while a project could realistically
                  have one or two stages off. With seven stops a logo job has
                  three, and the bare `join(' and ')` read as a run-on. Comma
                  list, final "and". */}
              <span className="step-rail-off-text">
                {offSteps.length === 1
                  ? offSteps[0].label
                  : `${offSteps
                      .slice(0, -1)
                      .map((s) => s.label)
                      .join(', ')} and ${offSteps[offSteps.length - 1].label}`}{' '}
                {offSteps.length === 1 ? 'is' : 'are'} off
              </span>
              {offSteps.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="step-rail-off-on"
                  onClick={() => toggleProjectStep(activeProject?.id, s.id)}
                >
                  {offSteps.length > 1 ? `turn on ${s.label}` : 'turn on'}
                </button>
              ))}
            </p>
          )}
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
              {/* "Continue → X" is deliberate, and this was briefly renamed to
                  "Next · X" on a bad reading of two things.

                  DESIGN_GRAMMAR G1.3 is explicit: "One primary CTA per page
                  job; path Next solid; rail Continue secondary." The pair is
                  the rule, and the two names are how the rule distinguishes
                  them — the footer is the solid primary, this is the quiet
                  second route to the same stop.

                  The WCAG argument for renaming was also wrong. SC 3.2.4
                  Consistent Identification governs the same component named
                  differently ACROSS a set of pages; both of these are already
                  internally consistent across every path stop. Two distinct
                  controls on one page carrying different labels is not that
                  criterion, and citing it here overstated the case. */}
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

              Settings stays the full prefs page (sidebar). Theme / Sign out
              also live on the header Account menu as a fast path — not a
              second Settings map. */}
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
            {/* Library is cross-project — the same scope as Home, Calendar and
                Clients above it — so it sits with them rather than inside the
                project-scoped Tools drawer it used to live in. A move, not an
                addition: the Tools entry is gone. */}
            <button
              type="button"
              className="journey-goto-row"
              onClick={() => {
                setActiveView('assets')
                setNavOpen(false)
              }}
            >
              <HeaderIcon name="library" />
              {toolsLabelForView('assets')}
            </button>
            <button
              type="button"
              className="journey-goto-row"
              onClick={() => {
                setActiveView('settings')
                setNavOpen(false)
              }}
            >
              <HeaderIcon name="settings" />
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
              ref={toolsButtonRef}
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
              {projectGroups.length === 0 && (
                <li className="journey-projects-empty" role="status">
                  <p className="journey-projects-empty-copy">No projects yet.</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setActiveView('create')
                      setNavOpen(false)
                    }}
                  >
                    New project
                  </button>
                </li>
              )}
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
                // Sidebar: name only. "Next: Strategy" fought the project
                // name for attention and looked like a second row of chrome
                // (Home still uses listRowNext for its denser list).
                return (
                  <li key={p.id} className="journey-project-row-wrap">
                    <button
                      type="button"
                      className={`journey-project-row${isActive ? ' is-active' : ''}`}
                      onClick={() => openProjectWhereLeftOff(p.id)}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <span className="journey-project-row-name">{p.name}</span>
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
                            onClick={() => {
                              const r = archiveProject(p.id)
                              if (!r.ok) {
                                flashToast(r.error || 'Could not archive that')
                              } else if (r.empty) {
                                flashToast('Archived — no open projects')
                                setActiveView('create')
                              } else {
                                flashToast('Project archived')
                              }
                              setOpenProjectMenuId(null)
                            }}
                          >
                            Archive project
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="project-menu-item project-menu-danger"
                            onClick={() => {
                              setOpenProjectMenuId(null)
                              handleDeleteProjectById(p.id, p.name)
                            }}
                          >
                            Delete project
                          </button>
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
                <HeaderIcon name="desk" />
                Desk
              </button>
            ) : (
              <p className="journey-path-empty">
                Open a project to see its path.
              </p>
            )}
            <ol className="journey-bar-list">
              {pathSteps.map((step, idx) => {
                const active = journeyActive === step.id
                const label = step.label
                const pathCtx = {
                  project: activeProject,
                  moodItems: deskMood,
                  tasks: deskTasks,
                  sparkIndex,
                  palette: projectPalette,
                }
                const hasContent = pathStepHasContent(step.id, pathCtx)
                /* `pathSteps`, not JOURNEY_STEPS. `idx` comes from the FILTERED
                   list this loop is drawing, and indexing the unfiltered
                   declaration with it reads a different array whenever a
                   project type switches a stage off: an `expansion` project
                   renders [Brief, Touchpoints, Delivery] but lit Touchpoints'
                   connector from JOURNEY_STEPS[0] and Delivery's from
                   JOURNEY_STEPS[1] — Research, a stage that project does not
                   have. Invisible while most types resolved to the full set;
                   adding Directions and Brand book widened the divergence. */
                const prevLit =
                  idx > 0 && pathStepHasContent(pathSteps[idx - 1].id, pathCtx)
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
                      aria-label={`${label}${hasContent ? ', has content' : ''}`}
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
              {toolsLabelForView(activeView)}
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
        {/* Main page outlet — views registered in app/viewRegistry.js */}
        <MainOutlet
          activeView={activeView}
          navDir={navDir}
          journeyNext={journeyNext}
          activeProject={activeProject}
          activeProjectId={activeProjectId}
          projectPalette={projectPalette}
          deskMood={deskMood}
          deskTasks={deskTasks}
          doneTasks={doneTasks}
          queueTasks={queueTasks}
          stepFocusKey={stepFocusKey}
          setStepFocusKey={setStepFocusKey}
          hideHowItWorks={hideHowItWorks}
          openBreakdown={openBreakdown}
          quickInput={quickInput}
          setQuickInput={setQuickInput}
          captureEnergy={captureEnergy}
          setCaptureEnergy={setCaptureEnergy}
          captureDue={captureDue}
          setCaptureDue={setCaptureDue}
          captureOptionsOpen={captureOptionsOpen}
          setCaptureOptionsOpen={setCaptureOptionsOpen}
          addQuickTask={addQuickTask}
          queueOpen={queueOpen}
          setQueueOpen={setQueueOpen}
          doneOpen={doneOpen}
          setDoneOpen={setDoneOpen}
          updateTaskTitle={updateTaskTitle}
          updateTaskWhy={updateTaskWhy}
          removeTask={removeTask}
          breakIntoSteps={breakIntoSteps}
          setTaskDueDate={setTaskDueDate}
          stepDueOpen={stepDueOpen}
          setStepDueOpen={setStepDueOpen}
          completeCurrentStep={completeCurrentStep}
          startVoice={startVoice}
          setActiveView={setActiveView}
          flashToast={flashToast}
          offerUndo={offerUndo}
          flashMicro={flashMicro}
          notifyAction={notifyAction}
          activeProjects={activeProjects}
          homeOrderedSummaries={homeOrderedSummaries}
          homeSelectedProjectId={homeSelectedProjectId}
          setHomeSelectedProjectId={setHomeSelectedProjectId}
          homeHoursRange={homeHoursRange}
          setHomeHoursRange={setHomeHoursRange}
          setCurrentProject={setCurrentProject}
          openProjectWhereLeftOff={openProjectWhereLeftOff}
          switchProjectAndContinue={switchProjectAndContinue}
          setClientInboxOpen={setClientInboxOpen}
          listRowNext={listRowNext}
          upcomingDeadlines={upcomingDeadlines}
          forcedBreak={forcedBreak}
          setSessionComplete={setSessionComplete}
          setFocusLeft={setFocusLeft}
          setPomodoroWorkStartedAt={setPomodoroWorkStartedAt}
          setIsFocusRunning={setIsFocusRunning}
          setTimerFocusSource={setTimerFocusSource}
          setResearchAddOpen={setResearchAddOpen}
          nextTask={nextTask}
          currentSpark={currentSpark}
          nextSpark={nextSpark}
          oppositeSpark={oppositeSpark}
          addMoodPin={addMoodPin}
          updateDirection={updateDirection}
          sparksTried={sparksTried}
          addTask={addTask}
          focusMinutes={focusMinutes}
          focusSeconds={focusSeconds}
          sessionLabel={sessionLabel}
          startOrPauseFocus={startOrPauseFocus}
          resetFocus={resetFocus}
          isFocusRunning={isFocusRunning}
          focusLeft={focusLeft}
          forceBreaksEnabled={forceBreaksEnabled}
          setPref={setPref}
          bodyDoubling={bodyDoubling}
          toggleBodyDoubling={toggleBodyDoubling}
          endForcedBreak={endForcedBreak}
          sessionComplete={sessionComplete}
          toggleTask={toggleTask}
          completedCount={completedCount}
          prefs={prefs}
          setForceBreakConsentOpen={setForceBreakConsentOpen}
          timerFocusSource={timerFocusSource}
          calCursor={calCursor}
          setCalCursor={setCalCursor}
          calendarEvents={calendarEvents}
          selectProject={selectProject}
          projectDeadline={projectDeadline}
          setProjectDeadline={setProjectDeadline}
          projects={projects}
          setClientRecordName={setClientRecordName}
          clientRecordName={clientRecordName}
          pathRows={pathRows}
          pathNextGap={pathNextGap}
          clientInbox={clientInbox}
          projectsSummary={projectsSummary}
          setIntakeClientName={setIntakeClientName}
          intakeClientName={intakeClientName}
          studioName={studioName}
          studioLogo={studioLogo}
          brandEditSection={brandEditSection}
          setBrandEditSection={setBrandEditSection}
          pathDoneCount={pathDoneCount}
          pathMissingLabelsList={pathMissingLabelsList}
          goToProcessStep={goToProcessStep}
          goSystemSection={goSystemSection}
          buildCurrentBrandPack={buildCurrentBrandPack}
          leaveBehindThin={leaveBehindThin}
          bookSetup={bookSetup}
          runExport={runExport}
          openExportPanel={openExportPanel}
          handleSignOut={handleSignOut}
          downloadDataBackup={downloadDataBackup}
          createNewProject={createNewProject}
          CLOUD={CLOUD}
          lastExportNote={lastExportNote}
          accessName={accessName}
          syncState={syncState}
          syncError={syncError}
          runCloudPush={runCloudPush}
          exportAllData={exportAllData}
          setSyncState={setSyncState}
          setSyncError={setSyncError}
          theme={theme}
          toggleTheme={toggleTheme}
          setShortcutsOpen={setShortcutsOpen}
          reduceMotion={reduceMotion}
          soundEnabled={soundEnabled}
          showHowItWorks={showHowItWorks}
          queueCollapsed={queueCollapsed}
          pwCurrent={pwCurrent}
          setPwCurrent={setPwCurrent}
          pwNext={pwNext}
          setPwNext={setPwNext}
          changeAccessPassword={changeAccessPassword}
          handleImportBackup={handleImportBackup}
          importFileRef={importFileRef}
          clearToEmpty={clearToEmpty}
          clearAllData={clearAllData}
          loadSoftSignalDemo={loadSoftSignalDemo}
          loadHarborHearthDemo={loadHarborHearthDemo}
          setDeskConfirm={setDeskConfirm}
          updateDetective={updateDetective}
          setOverviewSharePanelOpen={setOverviewSharePanelOpen}
        />
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
        currentProjectName={activeProject?.name || ''}
        onAttachPortal={(portalId) => {
          /* `setClientPortalId` writes to the CURRENT project, which is
             exactly the promise the button makes — the label names the
             project it will attach to. */
          setClientPortalId(portalId)
          flashToast(
            `Linked to ${activeProject?.name || 'this project'} — their answers are on the Project screen`,
            { important: true }
          )
        }}
        flashToast={flashToast}
        flashMicro={flashMicro}
      />

      {/* Tools — centered overlay (dialogs front-and-center). Pruned 2026-08:
          Print lives on Assets / Export; Archive/Delete live on each project
          row ⋯ (one door each — a long Tools list was decision fatigue).
          Go-to first (off-path rooms), then project actions by frequency.

          Not role="dialog"/aria-modal: the trigger declares
          aria-haspopup="menu" and this is a menu. It used to claim both —
          promising a focus trap it never implemented, over a role="menu"
          whose arrow keys it also never implemented. */}
      {moreOpen && (
        <div
          className="export-overlay tools-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismissTools()
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
                onClick={dismissTools}
              >
                ×
              </button>
            </div>
            <div
              ref={toolsMenuRef}
              className="more-menu"
              role="menu"
              id="tools-menu"
              aria-labelledby="tools-menu-button"
              onKeyDown={onToolsKeyDown}
            >
              {/* role="menu" may only own menuitem, group and separator, so
                  each heading names a role="group" instead of sitting loose
                  in the menu where AT could drop or misread it. */}
              <div
                className="more-menu-group"
                role="group"
                aria-labelledby="tools-group-goto"
              >
                <p className="more-menu-group-label" id="tools-group-goto">
                  Go to
                </p>
              {/* BRAND BOOK AND IDEATE LEFT THIS MENU BECAUSE THEY ARE STOPS.
                  Both were reachable only from here — the Brand Book Builder
                  from this single call site in the whole app, while Assets
                  exported its PDF without ever offering the screen that shapes
                  it. They are declared in JOURNEY_STEPS now, so the path is
                  their door and a second one here would be the duplicate entry
                  point this menu already suffers from.

                  Library left too, for a different reason: it is cross-project
                  like Home and Clients, so it belongs in the sidebar's Studio
                  band beside them rather than in a project-scoped drawer. It is
                  still a Tool, not a stop — see TOOLS_MENU_VIEWS. */}
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
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
                tabIndex={-1}
                className="more-menu-item"
                onClick={() => {
                  setActiveView('review')
                  setMoreOpen(false)
                }}
              >
                <HeaderIcon name="review" /> Review
              </button>
              </div>
              <div
                className="more-menu-group"
                role="group"
                aria-labelledby="tools-group-project"
              >
                <p className="more-menu-group-label" id="tools-group-project">
                  This project
                </p>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="more-menu-item"
                onClick={() => {
                  setOverviewSharePanelOpen(true)
                  setMoreOpen(false)
                }}
              >
                <HeaderIcon name="share" /> Share Strategy form
              </button>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="more-menu-item"
                onClick={() => {
                  openExportPanel()
                  setMoreOpen(false)
                }}
              >
                <HeaderIcon name="download" /> Export
              </button>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="more-menu-item"
                onClick={() => {
                  setHoursPanelOpen(true)
                  setMoreOpen(false)
                }}
              >
                <HeaderIcon name="invoice" /> Hours &amp; invoice
              </button>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="more-menu-item"
                onClick={() => {
                  setDiscoveryPanelOpen(true)
                  setMoreOpen(false)
                }}
              >
                <HeaderIcon name="question" /> Discovery brief
              </button>
              {/* ARCHIVE AND DELETE, WHERE THE CSS ALREADY SAID THEY WERE.
                  The sidebar's per-row ⋯ is hidden in the app shell with the
                  note "Archive and Delete now live in Tools → This project" —
                  and they did not. The control was removed for a good reason
                  (a hover-only affordance is invisible at a glance and absent
                  on touch) but its destination was never built, so on desktop
                  the two actions were reachable from nowhere at all.

                  They act on the CURRENT project, like Export and Hours above
                  them, and they call the same handlers the sidebar menu calls
                  — no second delete path, and the undo toast still comes from
                  `handleDeleteProjectById`. */}
              {activeProject && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className="more-menu-item"
                    onClick={() => {
                      setMoreOpen(false)
                      const r = archiveProject(activeProject.id)
                      if (!r.ok) {
                        flashToast(r.error || 'Could not archive that')
                      } else if (r.empty) {
                        flashToast('Archived — no open projects')
                        setActiveView('create')
                      } else {
                        flashToast('Project archived')
                      }
                    }}
                  >
                    <HeaderIcon name="archive" /> Archive project
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className="more-menu-item more-menu-danger"
                    onClick={() => {
                      setMoreOpen(false)
                      handleDeleteProjectById(
                        activeProject.id,
                        activeProject.name
                      )
                    }}
                  >
                    <HeaderIcon name="trash" /> Delete project
                  </button>
                </>
              )}
              </div>
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
            Lock the screen 5–10 min after focus? You can turn this off in Settings.
          </p>
          <div className="desk-confirm-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setPref('forceBreaksConsented', true)
                setPref('forceBreaksEnabled', true)
                setForceBreakConsentOpen(false)
                flashToast('Screen lock on')
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
                flashToast('Screen lock off')
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

      {/* Quick capture, over whatever you were doing.
          One field and one button, no category picker and no project picker:
          choosing where a thought belongs is a decision, and asking for it at
          the moment of interruption is the cost this feature exists to avoid.
          It lands in the same desk task list the Flow view already shows —
          somewhere already visible, not a fifth holding pen that ages into a
          second backlog. Filing happens later, with bandwidth. */}
      {quickCaptureOpen && (
        <div
          className="quick-capture-overlay no-print-hide"
          role="dialog"
          aria-modal="true"
          aria-label="Quick capture"
          ref={quickCaptureRef}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setQuickCaptureOpen(false)
          }}
        >
          <div className="quick-capture-panel">
            <label className="quick-capture-label" htmlFor="quick-capture-input">
              Put it down, sort it later
            </label>
            <div className="capture-row">
              <input
                id="quick-capture-input"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addQuickTask({ navigate: false })
                    setQuickCaptureOpen(false)
                  }
                }}
                placeholder="Whatever just came to mind"
                aria-label="Quick capture"
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  addQuickTask({ navigate: false })
                  setQuickCaptureOpen(false)
                }}
              >
                Add
              </button>
            </div>
            {/* Closing keeps the text — it is already saved. Escape here is
                "not now", never "throw that away". */}
            <p className="quick-capture-hint">
              Esc to close. Anything typed is kept.
            </p>
          </div>
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
        ref={todoFabRef}
        type="button"
        className={`todo-fab${fabCompact ? ' is-compact' : ''}`}
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
        <Suspense fallback={null}>
        <TaskBreakdown
          key={breakdownRunId}
          projectName={activeProject?.name}
          projectBrief={activeProject?.brief}
          onClose={() => setShowBreakdown(false)}
          onCommit={commitBreakdown}
          onFinish={finishBreakdownToStep}
          onRestart={openBreakdown}
        />
        </Suspense>
      )}
    </div>
  )
}

export default App
