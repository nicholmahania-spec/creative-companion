/**
 * Directions (path stop 3) — the bridge, not an exercise.
 *
 * RESEARCH DISCOVERS, DIRECTIONS INTERPRETS, IDENTITY DEVELOPS. This screen's
 * whole job is to let a designer group what they already responded to into two
 * or three visual routes and pick one. It authors no creative content of its
 * own, which is the test that removed most of what used to be here: a rough-
 * idea dump nothing downstream could read, a prompt card rotating a string
 * shared across every client in the studio, a button that named a route after
 * a methodology instruction, and two paragraphs auditing whether the designer
 * had followed the method.
 *
 * THREE STATES, ALL SHOWN BY THE LAYOUT:
 *
 *   open    `activeDirectionId` — the route being built. Heavy border. The
 *           evidence band acts on it.
 *   chosen  the route the project proceeds with. One at a time. Choosing also
 *           opens; opening never chooses.
 *   cited   `evidence[]` — refKeys, resolved when drawn, never copied.
 *
 * A·B·C ARE POSITION, NOT IDENTITY. Only routes that exist are drawn, and the
 * letter comes from where a route sits among them. Delete one and the rest
 * reflow while every id, reference and decision-log entry stays put.
 *
 * The step id stays `ideate` because saved projects key `pathDone` off it.
 */
import { useMemo } from 'react'
import { labelForStepId } from '../lib/journey/journey'
import useAppStore, { DIRECTION_SLOTS, orderedDirections } from '../store/useAppStore'
import DirectionComposition from '../features/discovery/DirectionComposition'
import {
  EvidenceBand,
  EvidenceStrip,
} from '../features/discovery/DirectionEvidence'
import {
  directionEvidence,
  projectEvidence,
} from '../lib/brand/directionEvidence'
import { discoveryObservations } from '../lib/discovery/observations'
import '../styles/lazy-ideate.css'

const focusLater = (id, ms = 60) => {
  window.setTimeout(() => document.getElementById(id)?.focus?.(), ms)
}

export default function SparkView({
  setActiveView,
  directions = [],
  updateDirection,
  project = null,
  flashMicro,
  projectId,
  goSystemSection,
}) {
  const addDirection = useAppStore((s) => s.addDirection)
  const deleteDirection = useAppStore((s) => s.deleteDirection)
  const setActiveDirection = useAppStore((s) => s.setActiveDirection)
  const toggleDirectionEvidence = useAppStore((s) => s.toggleDirectionEvidence)
  const captureDirectionFrom = useAppStore((s) => s.captureDirectionFrom)
  const setDirectionRefs = useAppStore((s) => s.setDirectionRefs)
  const moodItems = useAppStore((s) => s.moodItems)

  /* Only what exists, in slot order, each carrying the letter it is drawn
     with. `directions` still arrives as a prop so the view re-renders on a
     store write; the ordering is derived from the project either way. */
  const routes = useMemo(
    () => orderedDirections(project || { directions }),
    [project, directions]
  )
  const canAdd = routes.length < DIRECTION_SLOTS.length

  /* The open route. Falls back to the first one so the band always has a
     target — a fallback for DISPLAY only. Nothing is written on arrival; the
     store's `activeDirectionId` changes when the designer opens something. */
  const stored = project?.activeDirectionId || null
  const openId =
    (stored && routes.some((r) => r.id === stored) && stored) ||
    routes[0]?.id ||
    null
  const openRoute = routes.find((r) => r.id === openId) || null

  const evidence = useMemo(
    () => projectEvidence(project, moodItems),
    [project, moodItems]
  )
  const observations = useMemo(() => discoveryObservations(project), [project])

  const title = labelForStepId('ideate')

  const createRoute = () => {
    const id = addDirection?.()
    if (!id) return
    focusLater(`dir-title-${id}`, 80)
  }

  /* Opening is not choosing and never writes a decision. Clicking the route
     that is already open does nothing rather than closing it — there is no
     state in which no route is open while routes exist. */
  const openRouteById = (id) => {
    if (!id || id === project?.activeDirectionId) return
    setActiveDirection?.(id)
  }

  const chooseRoute = (route) => {
    if (!String(route.title || '').trim()) {
      focusLater(`dir-title-${route.id}`, 0)
      flashMicro?.('Name the route first')
      return
    }
    updateDirection?.(route.id, { chosen: !route.chosen })
    if (!route.chosen) flashMicro?.(`Chosen · ${route.title}`)
  }

  /* Develop always navigates, including to the route already open — coming
     back to what you are working on is the likeliest press on this screen. */
  const developRoute = (route) => {
    if (!String(route.title || '').trim()) {
      focusLater(`dir-title-${route.id}`, 0)
      flashMicro?.('Name the route first')
      return
    }
    openRouteById(route.id)
    setActiveView?.('brand')
  }

  const removeRoute = (route) => {
    deleteDirection?.(route.id)
    flashMicro?.('Route removed')
  }

  return (
    <div className="spark-view ideate-studio">
      <div className="flow-top ideate-top">
        <h1 className="page-title">{title}</h1>
      </div>

      {/* THE BRIDGE. Material the project already holds, read by reference.
          Tapping a tile puts it in the open route — one tap, one target, the
          same on a mouse, a finger and a keyboard. */}
      <EvidenceBand
        items={evidence}
        project={project}
        openRoute={openRoute}
        observations={observations}
        onCite={(key) => openId && toggleDirectionEvidence?.(openId, key)}
        emptyAction={
          <>
            {' '}
            <button
              type="button"
              className="text-link"
              onClick={() => setActiveView?.('studio')}
            >
              Open {labelForStepId('research')}
            </button>
            {' · '}
            <button
              type="button"
              className="text-link"
              onClick={() => setActiveView?.('project')}
            >
              Open {labelForStepId('define')}
            </button>
          </>
        }
      />

      <section className="ideate-routes" aria-label={`${title} routes`}>
        {routes.map((d) => {
          const isOpen = d.id === openId
          const hasTitle = Boolean(String(d.title || '').trim())
          return (
            <div
              key={d.id}
              className={`ideate-dir-card${d.chosen ? ' is-chosen' : ''}${
                isOpen ? ' is-open' : ''
              }`}
              aria-current={isOpen ? 'true' : undefined}
            >
              <div className="ideate-dir-head">
                {/* Position, not identity. `d.letter` is derived per render. */}
                <button
                  type="button"
                  className="ideate-dir-letter"
                  aria-label={`Open route ${d.letter}`}
                  aria-pressed={isOpen}
                  onClick={() => openRouteById(d.id)}
                >
                  {d.letter}
                </button>
                {d.chosen ? (
                  <span className="ideate-dir-chosen" title="Chosen">
                    ✓
                  </span>
                ) : null}
                <button
                  type="button"
                  className="ideate-dir-remove"
                  aria-label={`Remove route ${d.letter}`}
                  onClick={() => removeRoute(d)}
                >
                  ×
                </button>
              </div>

              {/* What this route was built from. Resolved through the pin, so
                  a deleted reference reads as gone rather than being replaced
                  by whatever the wall holds now. */}
              <EvidenceStrip
                items={directionEvidence(d, moodItems, projectId)}
                letter={d.letter}
                sayEmpty={evidence.length > 0 && isOpen}
                onCite={(key) => toggleDirectionEvidence?.(d.id, key)}
              />

              <DirectionComposition
                project={project}
                direction={d}
                editable={isOpen}
                onCapture={(kind, value) =>
                  captureDirectionFrom?.(d.id, kind, value)
                }
                onClear={(kind) => setDirectionRefs?.(d.id, { [kind]: null })}
                onSwap={(slot, key) => setDirectionRefs?.(d.id, { [slot]: key })}
                onDevelop={(home) => {
                  openRouteById(d.id)
                  /* Develop opens the workspace that OWNS the part, at the
                     sub-screen that owns it — the route never grows an editor
                     of its own. */
                  if (home.view === 'brand' && goSystemSection) {
                    goSystemSection(home.section)
                    return
                  }
                  setActiveView?.(home.view)
                }}
              />

              <label className="sr-only" htmlFor={`dir-title-${d.id}`}>
                Route {d.letter} name
              </label>
              <input
                id={`dir-title-${d.id}`}
                className="field-input ideate-dir-name"
                value={d.title || ''}
                onChange={(e) => updateDirection?.(d.id, { title: e.target.value })}
                onFocus={() => openRouteById(d.id)}
                placeholder="Name this route"
              />

              {d.chosen ? (
                <button
                  type="button"
                  className="btn btn-primary ideate-dir-go"
                  onClick={() => developRoute(d)}
                >
                  Develop →
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary ideate-dir-go"
                  onClick={() => chooseRoute(d)}
                  title={!hasTitle ? 'Name the route first' : undefined}
                >
                  Choose this
                </button>
              )}

              <div className="ideate-dir-quiet">
                {d.chosen ? (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => chooseRoute(d)}
                  >
                    Unchoose
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => developRoute(d)}
                  >
                    Develop
                  </button>
                )}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    openRouteById(d.id)
                    focusLater(`dir-note-${d.id}`, 40)
                  }}
                >
                  Why
                </button>
              </div>

              {/* Why is optional and has five readers, so it stays in the
                  model — it just does not need to occupy the card until the
                  designer asks for it. */}
              {String(d.note || '').trim() || isOpen ? (
                <>
                  <label className="sr-only" htmlFor={`dir-note-${d.id}`}>
                    Route {d.letter} why
                  </label>
                  <textarea
                    id={`dir-note-${d.id}`}
                    className="field-input ideate-dir-why"
                    rows={2}
                    value={d.note || ''}
                    onChange={(e) =>
                      updateDirection?.(d.id, { note: e.target.value })
                    }
                    placeholder="Why it could work"
                  />
                </>
              ) : null}
            </div>
          )
        })}

        {canAdd ? (
          <button
            type="button"
            id="dir-add"
            className="ideate-dir-add"
            onClick={createRoute}
          >
            <span className="ideate-dir-add-plus" aria-hidden="true">
              +
            </span>
            {routes.length ? 'Add another' : 'Add a direction'}
          </button>
        ) : null}
      </section>
    </div>
  )
}
