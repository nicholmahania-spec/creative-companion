import { useMemo, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { CONCEPT_STAGES, PACKAGE_FIELDS, packageProgress } from '../lib/conceptPackage'

/**
 * Sketches → Develop → Iterations → Lock plan → Package → Brand
 */
export default function ConceptPipeline({
  projectPills,
  openTasks = [],
  onGoBrand,
  onGoWork,
  flashToast,
}) {
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const projects = useAppStore((s) => s.projects)
  const conceptItems = useAppStore((s) => s.conceptItems) || []
  const addConceptItem = useAppStore((s) => s.addConceptItem)
  const updateConceptItem = useAppStore((s) => s.updateConceptItem)
  const removeConceptItem = useAppStore((s) => s.removeConceptItem)
  const selectSketchToDevelop = useAppStore((s) => s.selectSketchToDevelop)
  const lockConceptItem = useAppStore((s) => s.lockConceptItem)
  const updateConceptPackageField = useAppStore((s) => s.updateConceptPackageField)
  const applyConceptPackageToBrand = useAppStore((s) => s.applyConceptPackageToBrand)

  const [lane, setLane] = useState('sketch')
  const [iterStepId, setIterStepId] = useState('')
  const [lockNote, setLockNote] = useState('')
  const [lockTarget, setLockTarget] = useState(null)

  const project = projects.find((p) => p.id === currentProjectId)
  const pack = {
    audience: '',
    outcome: '',
    concept: '',
    voice: '',
    visualDirection: '',
    doUse: '',
    dontUse: '',
    notes: '',
    ...(project?.conceptPackage || {}),
  }
  const progress = packageProgress(pack)

  const mine = useMemo(
    () =>
      conceptItems.filter(
        (c) => c.projectId == null || c.projectId === currentProjectId
      ),
    [conceptItems, currentProjectId]
  )

  const byStage = (stage) => mine.filter((c) => c.stage === stage)
  const sketches = byStage('sketch')
  const develop = byStage('develop')
  const iterations = byStage('iteration')
  const locked = byStage('locked')

  const readFiles = (fileList, stage, extra = {}) => {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith('image/')
    )
    if (!files.length) {
      flashToast?.('Use image files')
      return
    }
    files.forEach((file, i) => {
      const reader = new FileReader()
      reader.onload = () => {
        addConceptItem({
          stage,
          visual: reader.result,
          title: file.name.replace(/\.[^.]+$/, '') || 'Upload',
          note: '',
          ...extra,
        })
      }
      reader.readAsDataURL(file)
    })
    flashToast?.(
      stage === 'iteration'
        ? 'Iteration added'
        : `${files.length} sketch${files.length > 1 ? 'es' : ''} added`
    )
  }

  const applyToBrand = () => {
    const result = applyConceptPackageToBrand()
    if (result.ok) {
      flashToast?.('Brand identity filled from concept pack')
      onGoBrand?.()
    } else {
      flashToast?.(result.error || 'Could not apply')
    }
  }

  return (
    <div className="concept-view surface-document">
      <button type="button" className="back-link" onClick={onGoWork}>
        ← Work
      </button>

      <div className="flow-top">
        <div>
          <h1 className="page-title page-title-display">Ideas</h1>
          <p className="page-sub">
            Step 3 — upload sketches, pick favorites, lock them, then fill the
            plan. Last button sends everything to Brand.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={applyToBrand}>
          Send to Brand →
        </button>
      </div>

      <section className="panel brand-section">
        <div className="brand-section-label">Project</div>
        <div className="panel-head" style={{ marginBottom: 0 }}>
          <div>
            <h2 className="panel-title">{project?.name || 'Project'}</h2>
            <p className="panel-hint">
              Package {progress.filled}/{progress.total} fields · {locked.length}{' '}
              locked ideas
            </p>
          </div>
          {projectPills}
        </div>
      </section>

      <nav className="concept-lanes" aria-label="Concept stages">
        {CONCEPT_STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`concept-lane-tab${lane === s.id ? ' is-active' : ''}`}
            onClick={() => setLane(s.id)}
          >
            <strong>{s.label}</strong>
            <span>
              {s.id === 'sketch' && sketches.length}
              {s.id === 'develop' && develop.length}
              {s.id === 'iteration' && iterations.length}
              {s.id === 'locked' && locked.length}
              {s.id === 'package' && `${progress.percent}%`}
            </span>
          </button>
        ))}
      </nav>

      {/* ——— SKETCHES ——— */}
      {lane === 'sketch' && (
        <section className="panel brand-section">
          <div className="brand-section-label">Upload sketches</div>
          <p className="panel-hint" style={{ marginBottom: '0.75rem' }}>
            Paper photos, thumbnails, first marks — dump them raw.
          </p>
          <label className="concept-upload-hero">
            <strong>Upload sketches</strong>
            <span>PNG, JPG, screenshots — multiple OK</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                readFiles(e.target.files, 'sketch')
                e.target.value = ''
              }}
            />
          </label>
          <ConceptGrid
            items={sketches}
            empty="No sketches yet. Upload your first roughs."
            onTitle={(id, title) => updateConceptItem(id, { title })}
            actions={(item) => (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    selectSketchToDevelop(item.id)
                    flashToast?.('Moved to Develop')
                    setLane('develop')
                  }}
                >
                  Develop this
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setLockTarget(item.id)
                    setLockNote(item.note || item.title || '')
                    setLane('locked')
                  }}
                >
                  Lock to plan
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeConceptItem(item.id)}
                >
                  Remove
                </button>
              </>
            )}
            onNote={(id, note) => updateConceptItem(id, { note })}
          />
        </section>
      )}

      {/* ——— DEVELOP ——— */}
      {lane === 'develop' && (
        <section className="panel brand-section">
          <div className="brand-section-label">Develop selection</div>
          <p className="panel-hint" style={{ marginBottom: '0.75rem' }}>
            Sketches you chose to push. Add notes, then iterate or lock.
          </p>
          {develop.length === 0 ? (
            <p className="empty-state-body">
              Nothing here yet. In Sketches, tap <strong>Develop this</strong> on
              a strong rough.
            </p>
          ) : (
            <ConceptGrid
              items={develop}
              empty=""
              onTitle={(id, title) => updateConceptItem(id, { title })}
              actions={(item) => (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setLockTarget(item.id)
                      setLockNote(item.note || item.title || '')
                      setLane('locked')
                    }}
                  >
                    Lock to plan
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      updateConceptItem(item.id, { stage: 'sketch' })
                    }
                  >
                    Back to sketches
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeConceptItem(item.id)}
                  >
                    Remove
                  </button>
                </>
              )}
              onNote={(id, note) => updateConceptItem(id, { note })}
            />
          )}
        </section>
      )}

      {/* ——— ITERATIONS ——— */}
      {lane === 'iteration' && (
        <section className="panel brand-section">
          <div className="brand-section-label">Iterations by step</div>
          <p className="panel-hint" style={{ marginBottom: '0.75rem' }}>
            Upload refined versions tied to a Work step (optional but powerful).
          </p>
          <label className="field-label" htmlFor="iter-step">
            Link to current step (optional)
          </label>
          <select
            id="iter-step"
            className="field-input"
            value={iterStepId}
            onChange={(e) => setIterStepId(e.target.value)}
            style={{ marginBottom: '0.75rem' }}
          >
            <option value="">No step link</option>
            {openTasks.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.title.slice(0, 60)}
              </option>
            ))}
          </select>
          <label className="concept-upload-hero">
            <strong>Upload iteration</strong>
            <span>Next pass on a direction — digital or photo</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                readFiles(e.target.files, 'iteration', {
                  stepId: iterStepId ? Number(iterStepId) : null,
                })
                e.target.value = ''
              }}
            />
          </label>
          <ConceptGrid
            items={iterations}
            empty="No iterations yet. Upload refined passes as you go."
            stepLookup={openTasks}
            onTitle={(id, title) => updateConceptItem(id, { title })}
            actions={(item) => (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setLockTarget(item.id)
                    setLockNote(item.note || item.title || '')
                    setLane('locked')
                  }}
                >
                  Lock to plan
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeConceptItem(item.id)}
                >
                  Remove
                </button>
              </>
            )}
            onNote={(id, note) => updateConceptItem(id, { note })}
          />
        </section>
      )}

      {/* ——— LOCKED PLAN ——— */}
      {lane === 'locked' && (
        <section className="panel brand-section">
          <div className="brand-section-label">Concept plan (locked)</div>
          <p className="panel-hint" style={{ marginBottom: '0.75rem' }}>
            Locked ideas become the spine of your package and Brand brief.
          </p>
          {lockTarget != null && (
            <div className="concept-lock-form">
              <label className="field-label" htmlFor="lock-note">
                Why lock this? (becomes plan language)
              </label>
              <div className="capture-row">
                <input
                  id="lock-note"
                  className="field-input"
                  value={lockNote}
                  onChange={(e) => setLockNote(e.target.value)}
                  placeholder="e.g. Soft invitation mark — no hard sell"
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    lockConceptItem(lockTarget, lockNote)
                    setLockTarget(null)
                    setLockNote('')
                    flashToast?.('Locked into plan')
                  }}
                >
                  Lock in
                </button>
              </div>
            </div>
          )}
          <ConceptGrid
            items={locked}
            empty="Nothing locked yet. Develop a sketch or iteration, then lock it."
            onTitle={(id, title) => updateConceptItem(id, { title })}
            actions={(item) => (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    updateConceptItem(item.id, { stage: 'develop' })
                  }
                >
                  Unlock to develop
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeConceptItem(item.id)}
                >
                  Remove
                </button>
              </>
            )}
            onNote={(id, note) => updateConceptItem(id, { note })}
          />
          {locked.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '0.85rem' }}
              onClick={() => setLane('package')}
            >
              Continue to package →
            </button>
          )}
        </section>
      )}

      {/* ——— PACKAGE ——— */}
      {lane === 'package' && (
        <section className="panel brand-section">
          <div className="brand-section-label">Concept package</div>
          <p className="panel-hint" style={{ marginBottom: '0.5rem' }}>
            Fill step by step. When ready, push into Brand identity for a smooth
            handoff.
          </p>
          <div className="concept-pack-progress" aria-hidden="true">
            <div
              className="concept-pack-progress-fill"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="panel-hint" style={{ marginBottom: '1rem' }}>
            {progress.filled} of {progress.total} fields · {progress.percent}%
          </p>

          {locked.length > 0 && (
            <div className="concept-plan-summary">
              <p className="list-heading">From locked plan</p>
              <ul className="concept-plan-list">
                {locked.map((c) => (
                  <li key={c.id}>{c.note || c.title || 'Locked idea'}</li>
                ))}
              </ul>
            </div>
          )}

          {PACKAGE_FIELDS.map((f) => (
            <div key={f.id} className="field-block">
              <label className="field-label" htmlFor={`pack-${f.id}`}>
                {f.label}
              </label>
              <textarea
                id={`pack-${f.id}`}
                className="field-textarea"
                rows={2}
                value={pack[f.id] || ''}
                placeholder={f.placeholder}
                onChange={(e) =>
                  updateConceptPackageField(f.id, e.target.value)
                }
              />
            </div>
          ))}

          <div className="field-block">
            <label className="field-label" htmlFor="pack-notes">
              Extra notes for the brief
            </label>
            <textarea
              id="pack-notes"
              className="field-textarea"
              rows={2}
              value={pack.notes || ''}
              placeholder="Anything else the brand pack should carry…"
              onChange={(e) =>
                updateConceptPackageField('notes', e.target.value)
              }
            />
          </div>

          <div className="concept-pack-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={applyToBrand}
            >
              Send to Brand (step 4) →
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onGoBrand}
            >
              Open Brand now
            </button>
          </div>
          <p className="panel-hint" style={{ marginTop: '0.75rem' }}>
            This copies your plan into Brand (colors &amp; words page). You can
            still change anything there. Then go to Finish to share.
          </p>
        </section>
      )}
    </div>
  )
}

function ConceptGrid({
  items,
  empty,
  actions,
  onNote,
  onTitle,
  stepLookup = [],
}) {
  if (!items?.length) {
    return empty ? (
      <p className="empty-state-body" style={{ marginTop: '0.75rem' }}>
        {empty}
      </p>
    ) : null
  }
  return (
    <div className="concept-grid">
      {items.map((item) => {
        const step = stepLookup.find((t) => t.id === item.stepId)
        const isImg =
          item.visual?.startsWith('data:') ||
          item.visual?.startsWith('http') ||
          item.visual?.startsWith('blob:')
        return (
          <article key={item.id} className="concept-card">
            <div
              className="concept-card-visual"
              style={
                isImg
                  ? {
                      backgroundImage: `url(${item.visual})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : { background: item.visual || 'var(--bg-muted)' }
              }
            />
            <div className="concept-card-body">
              {step && (
                <span className="task-badge">
                  Step: {step.title.slice(0, 32)}
                </span>
              )}
              <input
                className="concept-card-title"
                value={item.title || ''}
                onChange={(e) => onTitle?.(item.id, e.target.value)}
                placeholder="Title"
                aria-label="Asset title"
              />
              <textarea
                className="concept-card-note"
                value={item.note || ''}
                onChange={(e) => onNote?.(item.id, e.target.value)}
                placeholder="Note / why this matters"
                rows={2}
              />
              <div className="concept-card-actions">{actions?.(item)}</div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
