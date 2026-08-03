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
  review: lazy(() => import('../views/ReviewView')),
  settings: lazy(() => import('../views/SettingsView')),
}

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
