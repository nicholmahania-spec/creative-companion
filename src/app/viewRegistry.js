/**
 * Main shell view registry — one map of activeView id → lazy page + chrome.
 * App.jsx stays the orchestration shell; MainOutlet renders from this map.
 *
 * pathStepId: optional StepDependencyReminder step (journey id / tools id).
 * warm: included in idle path-chunk prefetch.
 */
import { lazy } from 'react'
import { labelForView } from '../lib/journey/journey'

export const lazyViews = {
  home: lazy(() => import('../views/HomeView')),
  project: lazy(() => import('../views/DefineView')),
  studio: lazy(() => import('../views/ResearchView')),
  brand: lazy(() => import('../views/DesignView')),
  flow: lazy(() => import('../views/SketchView')),
  finish: lazy(() => import('../views/DeliverView')),
  spark: lazy(() => import('../views/SparkView')),
  insights: lazy(() => import('../views/InsightsView')),
  calendar: lazy(() => import('../views/CalendarView')),
  clients: lazy(() => import('../views/ClientsView')),
  clientRecord: lazy(() => import('../views/ClientRecordView')),
  desk: lazy(() => import('../views/DeskView')),
  create: lazy(() => import('../views/NewProjectIntake')),
  book: lazy(() => import('../views/BrandBookBuilderView')),
  assets: lazy(() => import('../views/AssetLibraryView')),
  review: lazy(() => import('../views/ReviewView')),
  settings: lazy(() => import('../views/SettingsView')),
}

/**
 * Views a reload is allowed to put you back on.
 *
 * Derived from `lazyViews`, never restated. Two hand-maintained copies of this
 * list had drifted from it — App.jsx's `allowed` set and sessionResume's
 * ALL_VIEWS — and between them Desk, Clients, Asset library and New project
 * were missing from both. Refreshing on any of those silently returned you to
 * Home, and a part-filled New project intake was discarded with it. Verified
 * by hashing screenshots: all four rendered byte-identical to Home.
 * `CLAUDE.md` §21 lists "pause and resume" as a core principle, and it was
 * failing on the two screens a newcomer uses most.
 *
 * `clientRecord` is the one deliberate exclusion: it renders a specific
 * client, and restoring it without knowing which one lands on an empty screen
 * with no way back. Clients (the list) is the correct place to return to, and
 * it is included.
 */
export const RESTORABLE_VIEWS = Object.freeze(
  Object.keys(lazyViews).filter((id) => id !== 'clientRecord')
)

/** Path stops prefetched after unlock (not Tools). */
export const PATH_WARM_VIEWS = [
  'project',
  'studio',
  'brand',
  'flow',
  'finish',
]

export function skeletonLabelForView(view) {
  if (view === 'home') return 'Loading Home…'
  if (view === 'insights') return 'Loading timer…'
  if (view === 'calendar') return 'Loading calendar…'
  if (view === 'clients') return 'Loading clients…'
  if (view === 'clientRecord') return 'Loading client…'
  if (view === 'desk') return 'Loading this project…'
  if (view === 'create' || view === 'spark') return 'Loading…'
  if (view === 'book') return 'Loading brand book…'
  if (view === 'assets') return 'Loading asset library…'
  if (view === 'review') return 'Loading Review…'
  if (view === 'settings') return 'Loading settings…'
  const label = labelForView(view)
  return label ? `Loading ${label}…` : 'Loading…'
}

/**
 * Journey/tools step id for StepDependencyReminder, or null.
 * Define (`project`) is null — brief is form-only; no dependency strip there.
 */
export function pathStepIdForView(view) {
  switch (view) {
    case 'studio':
      return 'research'
    case 'brand':
      return 'design'
    case 'flow':
      return 'sketch'
    case 'finish':
      return 'deliver'
    case 'spark':
      return 'ideate'
    case 'review':
      return 'review'
    default:
      return null
  }
}

export function warmPathViewChunks() {
  void import('../views/DefineView')
  void import('../views/SketchView')
  void import('../views/ResearchView')
  void import('../views/DesignView')
  void import('../views/DeliverView')
}
