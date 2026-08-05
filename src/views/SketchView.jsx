/**
 * Touchpoints — apply the identity on real surfaces from the brief.
 * One job: check the book mock + note / mark good.
 */
import { useMemo, useCallback, lazy, Suspense } from 'react'
import { labelForStepId } from '../lib/journey/journey'
import useAppStore from '../store/useAppStore'
import { focusPathGapTarget } from '../lib/journey/journeyProgress'
import TouchpointMockThumb from '../components/TouchpointMockThumb'
import {
  touchpointsFor,
  touchpointLabel,
  touchpointCheckHint,
} from '../lib/journey/touchpoints'
import '../styles/lazy-sketch.css'

const EmptyIllustration = lazy(() => import('../components/EmptyIllustration'))

/** One-tap surfaces so a thin job isn’t stuck bouncing to Strategy. */
const QUICK_SURFACES = [
  { id: 'website', label: 'Website' },
  { id: 'social', label: 'Social' },
  { id: 'print', label: 'Print' },
  { id: 'app', label: 'App' },
]

/** Word status — never N of M (numbers don’t register for this user). */
export function touchpointsStatusLine({ hasBriefSurfaces, apps, proofs }) {
  if (!hasBriefSurfaces) return 'No surfaces yet'
  const notedIds = (apps || []).filter((id) => {
    const row = proofs?.[id]
    return !!(row?.done || String(row?.note || '').trim())
  })
  if (notedIds.length === 0) return 'Check each mock the book will show'
  if (notedIds.length >= apps.length) return 'All mocks checked'
  const first = touchpointLabel(notedIds[0])
  if (notedIds.length === 1) {
    return `${first} checked · enough for the path · rest optional`
  }
  return `${first} and more checked · enough for the path · rest optional`
}

export default function SketchView({
  navDir = 'none',
  activeProject = null,
  projectPalette = [],
  journeyNext = null,
  setActiveView,
  flashMicro,
}) {
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const updateDetective = useAppStore((s) => s.updateDetective)

  const surfaces = activeProject?.detective?.brandSurfaces
  const deliverables = activeProject?.detective?.deliverablesPicked
  const apps = useMemo(
    () => touchpointsFor(surfaces, deliverables),
    [surfaces, deliverables]
  )
  const proofs = activeProject?.touchpointApps || {}
  const palette =
    Array.isArray(projectPalette) && projectPalette.length
      ? projectPalette
      : activeProject?.palette || []

  const setApp = useCallback(
    (id, patch) => {
      const prev =
        useAppStore.getState().projects.find(
          (p) =>
            p.id ===
            (activeProject?.id || useAppStore.getState().currentProjectId)
        )?.touchpointApps || {}
      const cur = { ...(prev[id] || {}), ...patch }
      updateBrandField('touchpointApps', {
        ...prev,
        [id]: cur,
      })
    },
    [activeProject?.id, updateBrandField]
  )

  const hasBriefSurfaces =
    (Array.isArray(surfaces) && surfaces.length > 0) ||
    (Array.isArray(deliverables) && deliverables.length > 0)

  const statusLine = touchpointsStatusLine({
    hasBriefSurfaces,
    apps: hasBriefSurfaces ? apps : [],
    proofs,
  })

  const openSurfacesInStrategy = () => {
    setActiveView?.('project')
    focusPathGapTarget(
      '#detective-brandSurfaces, #detective-field-brandSurfaces, #detective-deliverablesPicked, #detective-goal'
    )
  }

  const addQuickSurface = (id) => {
    const prev = Array.isArray(surfaces) ? [...surfaces] : []
    if (prev.includes(id)) {
      flashMicro?.(`${touchpointLabel(id)} · already on the list`)
      return
    }
    updateDetective('brandSurfaces', [...prev, id])
    flashMicro?.(`${touchpointLabel(id)} · added`)
  }

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
            {statusLine}
          </p>
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
          <div
            className="touchpoints-quick"
            role="group"
            aria-label="Add a surface"
          >
            {QUICK_SURFACES.map((s) => (
              <button
                key={s.id}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => addQuickSurface(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary touchpoints-empty-cta"
            onClick={openSurfacesInStrategy}
          >
            {`Open ${labelForStepId('define')} · surfaces`}
          </button>
        </section>
      ) : (
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
                <div className="touchpoints-card-layout">
                  <TouchpointMockThumb
                    id={id}
                    project={activeProject}
                    palette={palette}
                  />
                  <div className="touchpoints-card-body">
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
                              ? `${touchpointLabel(id)} · mock is good`
                              : `${touchpointLabel(id)} · open again`
                          )
                        }}
                      >
                        {done ? 'Mock is good' : 'This mock is good'}
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
                      placeholder={touchpointCheckHint(id)}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
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
