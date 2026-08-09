/**
 * Directions (path stop 3) — diverge first: volume and range over quality.
 * Shortlist A/B/C only after many rough ideas. Not a single “winning” concept page.
 *
 * Was the Tools view "Ideate". Promoted to a path stop 2026-08-09; the step id
 * stays `ideate` because saved projects key `pathDone` off it.
 */
import { useState, useEffect } from 'react'
import { labelForStepId } from '../lib/journey/journey'
import { getProcessPhase } from '../lib/journey/processGuide'
import useAppStore, { DIRECTION_SLOTS } from '../store/useAppStore'
import { POMODORO_WORK_MIN } from '../lib/helper/forcedBreak'
import DirectionComposition from '../features/discovery/DirectionComposition'
import '../styles/lazy-ideate.css'

/* Module scope, not the component body. The React compiler treats `Date.now`
   and `Math.random` in a component as impure reads — correctly, since a task
   id must be minted once when the button is pressed and not re-derived on a
   re-render. */
function newTaskId() {
  return Date.now() + Math.random()
}

export default function SparkView({
  setActiveView,
  currentSpark,
  nextSpark,
  oppositeSpark,
  addMoodPin,
  projectPalette,
  notifyAction,
  directions = [],
  updateDirection,
  project = null,
  flashMicro,
  addTask,
  projectId,
  projectGoal = '',
  roughIdeas = [],
  // Focus timer props
}) {
  const setRoughIdeas = useAppStore((s) => s.setRoughIdeas)
  const captureDirectionFrom = useAppStore((s) => s.captureDirectionFrom)
  const setDirectionRefs = useAppStore((s) => s.setDirectionRefs)
  /* Three cards, always — drawn from the slot list, filled from whatever
     records exist. The old version swapped the WHOLE array for three blanks
     whenever fewer than three records came in, so a project holding two real
     directions displayed as three empty ones and the deleted letter appeared
     to come back. A slot with no record is drawn empty and stores nothing;
     typing a title is what creates the record. */
  const dirs = DIRECTION_SLOTS.map((sl) => {
    const list = Array.isArray(directions) ? directions : []
    return list.find((d) => d?.id === sl.id) || { ...sl, title: '', note: '', chosen: false }
  })
  const filledDirs = dirs.filter((d) => String(d.title || '').trim()).length
  const chosen = dirs.find((d) => d.chosen && String(d.title || '').trim())
  const canSend = !!chosen
  const phase = getProcessPhase('ideate')
  /* Derived, never restated — this screen is a path stop now and its name is
     declared in journey.js. It read 'Ideate' while the rail said 'Directions'. */
  const title = labelForStepId('ideate')
  const goalLine = String(projectGoal || '').trim()

  // Persisted diverge dump (project.roughIdeas) — only the draft line is session-local
  const rough = Array.isArray(roughIdeas) ? roughIdeas : []
  const [roughDraft, setRoughDraft] = useState('')


  const pinSparkStay = () => {
    addMoodPin({
      type: 'spark',
      fromSpark: true,
      note: currentSpark,
      visual: projectPalette[0] || '#1A1A1E',
    })
    notifyAction?.('Pinned', 'mood_pin', { label: 'Spark pin' })
    flashMicro?.('Pinned to board')
  }

  const useSparkAsTitle = () => {
    const text = String(currentSpark || '')
      .split(/[—.–]/)[0]
      .trim()
    if (!text) return
    const empty = dirs.find((d) => !String(d.title || '').trim())
    if (!empty) {
      flashMicro?.('A · B · C are full')
      return
    }
    updateDirection?.(empty.id, { title: text })
    flashMicro?.(`→ ${empty.label}`)
    window.setTimeout(() => {
      document.getElementById(`dir-title-${empty.id}`)?.focus?.()
    }, 40)
  }

  const addRough = () => {
    const t = roughDraft.trim()
    if (!t) return
    setRoughIdeas([...rough, t])
    setRoughDraft('')
  }

  const promoteRough = (index) => {
    const text = rough[index]
    if (!text) return
    const empty = dirs.find((d) => !String(d.title || '').trim())
    if (!empty) {
      flashMicro?.('A · B · C are full')
      return
    }
    updateDirection?.(empty.id, { title: text })
    setRoughIdeas(rough.filter((_, i) => i !== index))
    flashMicro?.(`→ ${empty.label}`)
  }

  const removeRough = (index) => {
    setRoughIdeas(rough.filter((_, i) => i !== index))
  }

  const chooseDirection = (dir) => {
    const hasTitle = String(dir.title || '').trim()
    if (!dir.chosen && !hasTitle) {
      document.getElementById(`dir-title-${dir.id}`)?.focus?.()
      flashMicro?.('Add a title first')
      return
    }
    const nextChosen = !dir.chosen
    // updateDirection logs decision when chosen:true — do not log again on queue
    updateDirection?.(dir.id, { chosen: nextChosen })
    if (nextChosen) {
      flashMicro?.(`Choice saved · ${dir.label || dir.id}`)
      if (!String(dir.note || '').trim()) {
        window.setTimeout(() => {
          document.getElementById(`dir-note-${dir.id}`)?.focus?.()
        }, 80)
      }
    }
  }

  const queueChosen = () => {
    if (!chosen) return
    addTask?.({
      id: newTaskId(),
      title: `Draft ${chosen.label}: ${chosen.title}`,
      energy: 'med',
      meta: chosen.note || 'Direction option',
      completed: false,
      seeded: false,
      projectId: projectId || null,
      dueDate: '',
      why: chosen.note || '',
    })
    flashMicro?.('Draft added to Touchpoints')
    setActiveView('flow')
  }

  const statusLine = (() => {
    const roughN = rough.length
    if (roughN < 3 && filledDirs === 0) {
      return `Diverge first · ${roughN} rough (aim for several, not one perfect idea)`
    }
    if (chosen) {
      return `${roughN} rough · ${filledDirs}/3 shortlisted · ${chosen.label} ready for Work`
    }
    if (filledDirs === 0) {
      return `${roughN} rough · promote a few to A · B · C when ready`
    }
    if (filledDirs < 3) {
      return `${roughN} rough · ${filledDirs}/3 shortlisted · more range still welcome`
    }
    return `${roughN} rough · 3 shortlisted · choose one to send to Work (optional)`
  })()

  return (
    <div className="spark-view ideate-studio">
      <div className="flow-top ideate-top">
        <div className="ideate-top-text">
          <h1 className="page-title">{title}</h1>
          <p className="page-sub ideate-thesis">
            Volume first. Messy list, then a short shortlist — not one polished concept.
          </p>
        </div>
      </div>
      <div className="ideate-meta">
        <p className="ideate-progress" role="status">
          {statusLine}
        </p>
        {phase ? (
          <p className="ideate-phase" role="status">
            {(phase.checks || []).join(' · ')}
              {phase.prompt ? ` — ${phase.prompt}` : ''}
          </p>
        ) : null}
        {goalLine ? (
          <p className="ideate-goal" title={goalLine}>
            Goal: {goalLine.slice(0, 80)}
            {goalLine.length > 80 ? '…' : ''}
          </p>
        ) : null}

        {/* The focus timer used to be duplicated here. It never worked on
            this screen: MainOutlet passes it none of the timer props, so
            `resetFocus` was undefined and the two unlabelled buttons threw a
            TypeError on click, while the readout showed a permanent "not
            started" beside a designer who was demonstrably working. Removed
            rather than wired: the real Timer lives on Tools, and a second
            copy of a running clock is a second thing to reconcile. Same fix
            already applied to Identity and Assets — see no-dead-timer.spec.js. */}
      </div>

      {/* Diverge first — messy dump before shortlist */}
      <section className="ideate-rough" aria-label="Rough ideas">
        <p className="ideate-rough-label">1 · Diverge (rough dump)</p>
        <p className="ideate-rough-hint">
          Aim for range, not quality. Capture many lines. Promote only when you have options.
        </p>
        {rough.length > 0 ? (
          <ul className="ideate-rough-list">
            {rough.map((t, i) => (
              <li key={`${t}-${i}`} className="ideate-rough-chip">
                <span>{t}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => promoteRough(i)}
                  title="Promote to next empty A/B/C"
                >
                  ↑ shortlist
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeRough(i)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="ideate-rough-add">
          <label className="sr-only" htmlFor="rough-idea-input">
            Add rough idea
          </label>
          <input
            id="rough-idea-input"
            className="field-input"
            value={roughDraft}
            onChange={(e) => setRoughDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRough()}
            placeholder="e.g. Quiet type, bold photo crop…"
          />
          <button type="button" className="btn btn-secondary" onClick={addRough}>
            Add
          </button>
        </div>
      </section>

      <div className="ideate-layout">
        <section
          className="panel brand-section ideate-shortlist"
          aria-label="Three directions A B C"
        >
          <div className="brand-section-label">2 · Shortlist · A · B · C</div>
          <div className="ideate-directions is-locked-3">
            {dirs.map((d) => {
              const hasTitle = Boolean(String(d.title || '').trim())
              return (
                <div
                  key={d.id}
                  className={`ideate-dir-card${d.chosen ? ' is-chosen' : ''}${
                    hasTitle ? ' has-title' : ''
                  }`}
                >
                  <div className="ideate-dir-head">
                    <span className="ideate-dir-letter" aria-hidden="true">
                      {d.label || d.id?.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm${
                        d.chosen ? ' is-on' : ''
                      }`}
                      onClick={() => chooseDirection(d)}
                      aria-pressed={!!d.chosen}
                      disabled={!hasTitle && !d.chosen}
                      title={
                        !hasTitle && !d.chosen
                          ? 'Add a title first'
                          : undefined
                      }
                    >
                      {d.chosen ? 'Chosen' : 'Choose'}
                    </button>
                  </div>
                  <label className="sr-only" htmlFor={`dir-title-${d.id}`}>
                    Direction {d.label} title
                  </label>
                  <input
                    id={`dir-title-${d.id}`}
                    className="field-input"
                    value={d.title || ''}
                    onChange={(e) =>
                      updateDirection?.(d.id, { title: e.target.value })
                    }
                    placeholder={`${d.label} title`}
                  />
                  {/* Why only after choose — name first, defend second */}
                  {d.chosen ? (
                    <>
                      <label className="sr-only" htmlFor={`dir-note-${d.id}`}>
                        Direction {d.label} why
                      </label>
                      <textarea
                        id={`dir-note-${d.id}`}
                        className="field-input"
                        rows={2}
                        value={d.note || ''}
                        onChange={(e) =>
                          updateDirection?.(d.id, { note: e.target.value })
                        }
                        placeholder="Optional — why it could work"
                      />
                    </>
                  ) : null}

                  {/* THE COMPOSITION. Three references, resolved from wherever
                      the parts live. Capturing points this direction at what
                      the project has right now; palette and pairing are
                      content-addressed snapshots, so editing them later cannot
                      rewrite what this direction was. Nothing here edits a
                      mark, a face or a hex — "Open" goes to the workspace that
                      owns it. */}
                  <DirectionComposition
                    project={project}
                    direction={d}
                    onCapture={(kind, value) =>
                      captureDirectionFrom?.(d.id, kind, value)
                    }
                    onClear={(kind) => setDirectionRefs?.(d.id, { [kind]: null })}
                    onOpen={(view) => setActiveView?.(view)}
                  />
                </div>
              )
            })}
          </div>
        </section>

        <aside className="ideate-spark-tray" aria-label="Prompt">
          <div className="brand-section-label">Prompt</div>
          <div className="spark-card spark-card-stem" title={currentSpark || ''}>
            <p>
              {String(currentSpark || '')
                .split(/[—.–]/)[0]
                .trim() || '—'}
            </p>
          </div>
          <div className="spark-actions">
            <button
              type="button"
              onClick={useSparkAsTitle}
              className="btn btn-secondary"
            >
              Use as next A/B/C title
            </button>
            <button
              type="button"
              onClick={nextSpark}
              className="btn btn-ghost"
            >
              New
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => oppositeSpark?.()}
            >
              Opposite
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={pinSparkStay}
            >
              Pin to Board
            </button>
          </div>
        </aside>
      </div>

      <div className="path-continue-row ideate-send-row">
        <button
          type="button"
          className={`btn work-path-next${canSend ? ' btn-primary' : ' btn-secondary'}`}
          onClick={queueChosen}
          disabled={!canSend}
          aria-describedby="ideate-send-help"
        >
          {canSend
            ? `Send · ${labelForStepId('sketch')}`
            : 'Keep diverging (or choose A/B/C)'}
        </button>
        <p
          id="ideate-send-help"
          className={`ideate-send-help${canSend ? ' is-ready' : ''}`}
          role="status"
        >
          {canSend
            ? `Optional handoff — ${chosen.label}: ${chosen.title}`
            : 'No pressure to pick yet — add rough ideas above'}
        </p>
      </div>
    </div>
  )
}
