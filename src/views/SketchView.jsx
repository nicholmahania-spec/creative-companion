/**
 * Touchpoints — apply the identity on real surfaces from the brief.
 * One job: note / mark each application that the brand book will show.
 * Desk task queue is secondary (collapsed), not the path gate.
 */
import { useMemo, useCallback, lazy, Suspense } from 'react'
import { labelForStepId } from '../lib/journey'
import useAppStore from '../store/useAppStore'
import { getProcessPhase } from '../lib/processGuide'
import InfoReveal from '../components/InfoReveal'
import LayoutPatterns from '../components/LayoutPatterns'
import {
  touchpointsFor,
  touchpointLabel,
  touchpointsBlurb,
} from '../lib/touchpoints'
import '../styles/lazy-sketch.css'

const EmptyIllustration = lazy(() => import('../components/EmptyIllustration'))

export default function SketchView({
  navDir = 'none',
  activeProject = null,
  journeyNext = null,
  setActiveView,
  flashMicro,
}) {
  const updateBrandField = useAppStore((s) => s.updateBrandField)

  const surfaces = activeProject?.detective?.brandSurfaces
  const deliverables = activeProject?.detective?.deliverablesPicked
  const apps = useMemo(
    () => touchpointsFor(surfaces, deliverables),
    [surfaces, deliverables]
  )
  const blurb = useMemo(
    () => touchpointsBlurb(surfaces, deliverables),
    [surfaces, deliverables]
  )
  const proofs = activeProject?.touchpointApps || {}

  const setApp = useCallback(
    (id, patch) => {
      const prev = useAppStore.getState().projects.find(
        (p) => p.id === (activeProject?.id || useAppStore.getState().currentProjectId)
      )?.touchpointApps || {}
      const cur = { ...(prev[id] || {}), ...patch }
      updateBrandField('touchpointApps', {
        ...prev,
        [id]: cur,
      })
    },
    [activeProject?.id, updateBrandField]
  )

  const doneCount = apps.filter((id) => {
    const row = proofs[id]
    return !!(row?.done || String(row?.note || '').trim())
  }).length

  const hasBriefSurfaces =
    (Array.isArray(surfaces) && surfaces.length > 0) ||
    (Array.isArray(deliverables) && deliverables.length > 0)

  return (
    <div
      className="flow-view surface-desk view-enter sketch-studio touchpoints-studio"
      data-nav-dir={navDir}
    >
      <div className="flow-top flow-top-compact sketch-studio-top">
        <div>
          <h1 className="page-title work-page-title">
            {labelForStepId('sketch')}
          </h1>
          <p className="touchpoints-status" role="status">
            {apps.length === 0
              ? 'No surfaces yet'
              : doneCount === 0
                ? 'Applications from the brief'
                : doneCount >= apps.length
                  ? 'All applications noted'
                  : `${doneCount} of ${apps.length} noted`}
            <InfoReveal>
              {(getProcessPhase('sketch')?.checks || []).join(' · ')}
            </InfoReveal>
          </p>
          {blurb ? (
            <p className="touchpoints-blurb">{blurb}</p>
          ) : null}
        </div>
      </div>

      {!hasBriefSurfaces ? (
        <section className="panel touchpoints-empty" aria-label="No surfaces">
          <Suspense fallback={null}>
            <EmptyIllustration variant="desk" />
          </Suspense>
          <p className="touchpoints-empty-title">
            Name where the brand appears
          </p>
          <p className="touchpoints-empty-sub">
            In Strategy, answer “Where will this be used?” or pick deliverables.
            Those become the applications you prove here.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveView?.('project')}
          >
            {`Open ${labelForStepId('define')}`}
          </button>
        </section>
      ) : (
        <>
          <ul className="touchpoints-list" aria-label="Applications">
            {apps.map((id) => {
              const row = proofs[id] || {}
              const note = row.note || ''
              const done = !!row.done
              const hasNote = String(note).trim().length > 0
              const ready = done || hasNote
              return (
                <li
                  key={id}
                  className={`touchpoints-card${ready ? ' is-ready' : ''}`}
                >
                  <div className="touchpoints-card-head">
                    <h2 className="touchpoints-card-title">
                      {touchpointLabel(id)}
                    </h2>
                    <button
                      type="button"
                      className={`btn btn-sm${done ? ' btn-secondary' : ' btn-ghost'}`}
                      aria-pressed={done}
                      onClick={() => {
                        setApp(id, { done: !done })
                        flashMicro?.(
                          !done
                            ? `${touchpointLabel(id)} · looks right`
                            : `${touchpointLabel(id)} · open again`
                        )
                      }}
                    >
                      {done ? 'Looks right' : 'Mark looks right'}
                    </button>
                  </div>
                  <label className="field-label" htmlFor={`tp-note-${id}`}>
                    How it shows up
                  </label>
                  <textarea
                    id={`tp-note-${id}`}
                    className="field-textarea"
                    rows={2}
                    value={note}
                    onChange={(e) => setApp(id, { note: e.target.value })}
                    placeholder="One line — layout, words, or what to check"
                  />
                </li>
              )
            })}
          </ul>
          {/* Quiet reference — closed by default; not the path job */}
          <LayoutPatterns />
        </>
      )}

      <div className="path-continue-row">
        <button
          type="button"
          className="btn btn-primary work-path-next"
          onClick={() => setActiveView?.(journeyNext?.view || 'finish')}
        >
          {`Next · ${journeyNext?.label || labelForStepId('deliver')}`}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            const hub = 'desk'
            setActiveView?.(hub)
          }}
        >
          Back to the desk
        </button>
      </div>
    </div>
  )
}
