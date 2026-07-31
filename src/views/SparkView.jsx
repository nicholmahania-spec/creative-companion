/**
 * Ideate (Tools) — diverge first: volume and range over quality.
 * Shortlist A/B/C only after many rough ideas. Not a single “winning” concept page.
 */
import { useState } from 'react'
import { labelForStepId } from '../lib/journey'
import { getProcessPhase } from '../lib/processGuide'
import useAppStore from '../store/useAppStore'
import InfoReveal from '../components/InfoReveal'
import '../styles/lazy-ideate.css'

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
  flashMicro,
  addTask,
  projectId,
  projectGoal = '',
  roughIdeas = [],
}) {
  const setRoughIdeas = useAppStore((s) => s.setRoughIdeas)
  const dirs =
    Array.isArray(directions) && directions.length >= 3
      ? directions
      : [
          { id: 'a', label: 'A', title: '', note: '', chosen: false },
          { id: 'b', label: 'B', title: '', note: '', chosen: false },
          { id: 'c', label: 'C', title: '', note: '', chosen: false },
        ]
  const filledDirs = dirs.filter((d) => String(d.title || '').trim()).length
  const chosen = dirs.find((d) => d.chosen && String(d.title || '').trim())
  const canSend = !!chosen
  const phase = getProcessPhase('ideate')
  const title = 'Ideate'
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
      id: Date.now() + Math.random(),
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
            <InfoReveal>
              {(phase.checks || []).join(' · ')}
              {phase.prompt ? ` — ${phase.prompt}` : ''}
            </InfoReveal>
          </p>
        ) : null}
        {goalLine ? (
          <p className="ideate-goal" title={goalLine}>
            Goal: {goalLine.slice(0, 80)}
            {goalLine.length > 80 ? '…' : ''}
          </p>
        ) : null}
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
            {dirs.slice(0, 3).map((d) => {
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
