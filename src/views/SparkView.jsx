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
 * THE CARD IS A SPECIMEN, NOT A FORM. Preview first; composition, name, why,
 * remove and unchoose live behind one Edit disclosure. Choosing does not open
 * an editor. The step id stays `ideate` because saved projects key `pathDone`
 * off it.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { labelForStepId } from '../lib/journey/journey'
import useAppStore, { DIRECTION_SLOTS, orderedDirections } from '../store/useAppStore'
import useIsMobile from '../lib/useIsMobile'
import DirectionComposition from '../features/discovery/DirectionComposition'
import DirectionPreview from '../features/discovery/DirectionPreview'
import {
  EvidenceBand,
  EvidenceStrip,
} from '../features/discovery/DirectionEvidence'
import {
  directionEvidence,
  projectEvidence,
} from '../lib/brand/directionEvidence'
import { directionDifferenceLines } from '../lib/brand/directionDifference'
import { classifyDirectionStart } from '../lib/brand/directionStart'
import { discoveryObservations } from '../lib/discovery/observations'
import '../styles/lazy-ideate.css'

const focusLater = (id, ms = 60) => {
  window.setTimeout(() => document.getElementById(id)?.focus?.(), ms)
}

export default function SparkView({
  setActiveView,
  workroomLauncherRef,
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

  /* Which route's Edit disclosure is open. Independent of open/chosen — the
     band can fill B while A is chosen, and Edit is only when the designer
     asks to change the composition, name or why. */
  const [editingId, setEditingId] = useState(null)
  const roomRef = useRef(null)
  const launcherRef = useRef(null)

  /* Matches the routes grid breakpoint: one column on phone, multi on desk.
     Closed cards use DirectionPreview compact; Edit opens the full specimen. */
  const isPhone = useIsMobile(720)

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
  const tableRoutes = openRoute
    ? [openRoute, ...routes.filter((route) => route.id !== openRoute.id)]
    : routes

  const evidence = useMemo(
    () => projectEvidence(project, moodItems),
    [project, moodItems]
  )
  const observations = useMemo(() => discoveryObservations(project), [project])

  /* Factual palette comparisons only — empty when close or missing data.
     Computed once for the shortlist so each card does not re-walk peers. */
  const differenceLines = useMemo(
    () =>
      directionDifferenceLines(project, routes, {
        moodItems,
        projectId: projectId ?? project?.id,
      }),
    [project, routes, moodItems, projectId]
  )

  /* How to start: nothing / thin / split offer / ready. Never invents routes. */
  const start = useMemo(
    () => classifyDirectionStart(evidence, routes),
    [evidence, routes]
  )

  const title = labelForStepId('ideate')

  /* Capture before App's post-navigation effect parks focus in main. The
     journey button remains mounted under the inert shell, so it is the exact
     launcher we can return to once the room closes. */
  useLayoutEffect(() => {
    const active = document.activeElement
    launcherRef.current =
      workroomLauncherRef?.current ||
      (active instanceof HTMLElement ? active : null)
  }, [workroomLauncherRef])

  const closeWorkroom = useCallback(() => {
    const launcher = launcherRef.current
    setActiveView?.('studio')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (launcher?.isConnected) launcher.focus({ preventScroll: true })
      })
    })
  }, [setActiveView])

  useEffect(() => {
    const root = document.getElementById('root')
    const hadInert = root?.hasAttribute('inert')
    const priorAriaHidden = root?.getAttribute('aria-hidden')
    const priorOverflow = document.body.style.overflow
    const priorVisibility = root?.style.visibility
    root?.setAttribute('inert', '')
    root?.setAttribute('aria-hidden', 'true')
    if (root) root.style.visibility = 'hidden'
    document.body.style.overflow = 'hidden'
    const focusables = () =>
      [...(roomRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || [])].filter((element) => element instanceof HTMLElement)

    const focusRoom = (last = false) => {
      const items = focusables()
      ;(last ? items.at(-1) : items[0])?.focus({ preventScroll: true })
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeWorkroom()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) {
        event.preventDefault()
        roomRef.current?.focus({ preventScroll: true })
        return
      }
      const current = document.activeElement
      const index = items.indexOf(current)
      if (event.shiftKey && (current === roomRef.current || index <= 0)) {
        event.preventDefault()
        items.at(-1)?.focus({ preventScroll: true })
      } else if (!event.shiftKey && index === items.length - 1) {
        event.preventDefault()
        items[0]?.focus({ preventScroll: true })
      }
    }

    const onFocusIn = (event) => {
      if (roomRef.current && !roomRef.current.contains(event.target)) focusRoom()
    }

    requestAnimationFrame(() => roomRef.current?.focus({ preventScroll: true }))
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
      if (!hadInert) root?.removeAttribute('inert')
      if (priorAriaHidden == null) root?.removeAttribute('aria-hidden')
      else root?.setAttribute('aria-hidden', priorAriaHidden)
      if (root) root.style.visibility = priorVisibility || ''
      document.body.style.overflow = priorOverflow
    }
  }, [closeWorkroom])

  /* Opening is not choosing and never writes a decision. Clicking the route
     that is already open does nothing rather than closing it — there is no
     state in which no route is open while routes exist. */
  const openRouteById = (id) => {
    if (!id || id === project?.activeDirectionId) return
    setActiveDirection?.(id)
  }

  /* Edit puts the name field in the DOM; callers that need to type a name
     (create, choose without a title) open it first, then focus. */
  const openEdit = (id, focusFieldId, ms = 80) => {
    if (!id) return
    setEditingId(id)
    openRouteById(id)
    if (focusFieldId) focusLater(focusFieldId, ms)
  }

  const createRoute = () => {
    const id = addDirection?.()
    if (!id) return
    openEdit(id, `dir-title-${id}`, 80)
  }

  const chooseRoute = (route) => {
    if (!String(route.title || '').trim()) {
      openEdit(route.id, `dir-title-${route.id}`, 0)
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
      openEdit(route.id, `dir-title-${route.id}`, 0)
      flashMicro?.('Name the route first')
      return
    }
    openRouteById(route.id)
    setActiveView?.('brand')
  }

  const removeRoute = (route) => {
    deleteDirection?.(route.id)
    if (editingId === route.id) setEditingId(null)
    flashMicro?.('Route removed')
  }

  /* Accept the computed split: two empty routes + citations only.
     Does not name them, does not set palettes, does not write a why. */
  const acceptSplit = () => {
    const offer = start.offer
    if (!offer || routes.length > 0) return
    const highId = addDirection?.()
    const lowId = addDirection?.()
    if (!highId || !lowId) {
      flashMicro?.('Could not add routes')
      return
    }
    for (const key of offer.highKeys) {
      toggleDirectionEvidence?.(highId, key)
    }
    for (const key of offer.lowKeys) {
      toggleDirectionEvidence?.(lowId, key)
    }
    flashMicro?.(
      `2 routes · ${offer.highCount} ${offer.highLabel}, ${offer.lowCount} ${offer.lowLabel}`
    )
  }

  const room = (
    <section
      ref={roomRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      className="direction-room spark-view ideate-studio"
      aria-labelledby="directions-room-heading"
    >
      <header className="direction-room-recovery">
        <button type="button" className="text-link" onClick={closeWorkroom}>
          Back to {labelForStepId('research')}
        </button>
        <span>{openRoute ? `Working on route ${openRoute.letter}` : 'Private route table'}</span>
      </header>
      <h1 id="directions-room-heading" className="sr-only">{title}</h1>

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
            {' '}
            (♥ on the wall or in Visual Discovery)
          </>
        }
      />

      {/* START STATES. Facts about what is kept — not process prose, not
          invented routes. Split is an offer; accepting creates citations only. */}
      {start.state === 'thin' ? (
        <p className="ideate-start-note" role="status">
          {start.reason}
        </p>
      ) : null}

      {start.state === 'split' && start.offer ? (
        <div className="ideate-split-offer">
          <p className="ideate-split-summary">{start.offer.summary}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={acceptSplit}
          >
            Start from what you kept
          </button>
        </div>
      ) : null}

      <section className="ideate-routes" aria-label={`${title} routes`}>
        {tableRoutes.map((d) => {
          const isOpen = d.id === openId
          const isEditing = editingId === d.id
          const name = String(d.title || '').trim()
          const hasTitle = Boolean(name)
          const cited = directionEvidence(d, moodItems, projectId)
          return (
            <div
              key={d.id}
              className={`ideate-dir-card${d.chosen ? ' is-chosen' : ''}${
                isOpen ? ' is-open' : ''
              }${isEditing ? ' is-editing' : ''}${
                isPhone && !isEditing ? ' is-compact' : ''
              }`}
              aria-current={isOpen ? 'true' : undefined}
            >
              {/* 1. Identity: letter + authored name if any. Untitled routes
                  show letter only — the specimen carries the display line
                  (project/client fallback), not a second invented title. */}
              <div className="ideate-dir-head">
                <button
                  type="button"
                  className="ideate-dir-letter"
                  aria-label={`Open route ${d.letter}`}
                  aria-pressed={isOpen}
                  onClick={() => openRouteById(d.id)}
                >
                  {d.letter}
                </button>
                {hasTitle ? (
                  <span className="ideate-dir-title-text">{name}</span>
                ) : null}
                {d.chosen ? (
                  <span className="ideate-dir-chosen" title="Chosen">
                    ✓
                  </span>
                ) : null}
              </div>

              {/* 2. The specimen — same VM. Compact on phone closed cards. */}
              <DirectionPreview
                project={project}
                direction={d}
                moodItems={moodItems}
                projectId={projectId}
                compact={isPhone && !isEditing}
              />

              {/* Supporting fact only — never the headline. Empty when axes
                  are close or this route has no palette material. */}
              {differenceLines[d.id] ? (
                <p className="ideate-dir-diff">{differenceLines[d.id]}</p>
              ) : null}

              {/* 3. What this route was built from. Drop controls only while
                  Edit is open — closed is material, not a strip of ×. */}
              <EvidenceStrip
                items={cited}
                letter={d.letter}
                sayEmpty={evidence.length > 0 && isOpen && isEditing}
                onCite={
                  isEditing
                    ? (key) => toggleDirectionEvidence?.(d.id, key)
                    : undefined
                }
              />

              {/* 4. One primary action. Choosing does not expand the editor. */}
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

              {/* 5. Small secondary affordances. Edit holds the form. */}
              <div className="ideate-dir-quiet">
                <button
                  type="button"
                  className="text-link"
                  aria-expanded={isEditing}
                  onClick={() =>
                    isEditing ? setEditingId(null) : openEdit(d.id)
                  }
                >
                  {isEditing ? 'Done' : 'Edit'}
                </button>
                {!d.chosen ? (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => developRoute(d)}
                  >
                    Develop
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => openEdit(d.id, `dir-note-${d.id}`, 40)}
                >
                  Why
                </button>
              </div>

              {/* ONE DISCLOSURE. Same DirectionComposition, same fields —
                  just not on the face of the shortlist. */}
              {isEditing ? (
                <div className="ideate-dir-edit">
                  <label className="sr-only" htmlFor={`dir-title-${d.id}`}>
                    Route {d.letter} name
                  </label>
                  <input
                    id={`dir-title-${d.id}`}
                    className="field-input ideate-dir-name"
                    value={d.title || ''}
                    onChange={(e) =>
                      updateDirection?.(d.id, { title: e.target.value })
                    }
                    onFocus={() => openRouteById(d.id)}
                    placeholder="Name this route"
                  />

                  <DirectionComposition
                    project={project}
                    direction={d}
                    editable
                    onCapture={(kind, value) =>
                      captureDirectionFrom?.(d.id, kind, value)
                    }
                    onClear={(kind) =>
                      setDirectionRefs?.(d.id, { [kind]: null })
                    }
                    onSwap={(slot, key) =>
                      setDirectionRefs?.(d.id, { [slot]: key })
                    }
                    onDevelop={(home) => {
                      openRouteById(d.id)
                      if (home.view === 'brand' && goSystemSection) {
                        goSystemSection(home.section)
                        return
                      }
                      setActiveView?.(home.view)
                    }}
                  />

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

                  <div className="ideate-dir-edit-acts">
                    {d.chosen ? (
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => chooseRoute(d)}
                      >
                        Unchoose
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="text-link ideate-dir-remove-link"
                      aria-label={`Remove route ${d.letter}`}
                      onClick={() => removeRoute(d)}
                    >
                      Remove route
                    </button>
                  </div>
                </div>
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
            {routes.length
              ? 'Add another'
              : start.state === 'thin'
                ? 'Start a route'
                : start.state === 'nothing'
                  ? 'Add a direction'
                  : 'Add a direction'}
          </button>
        ) : null}
      </section>
    </section>
  )
  return createPortal(room, document.body)
}
