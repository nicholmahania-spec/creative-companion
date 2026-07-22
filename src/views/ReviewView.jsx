/**
 * Review — notes + gaps left (55%), sticky pack preview right (45%).
 * ADHD: one capture surface, Review-only readiness, sticky Next → Deliver.
 */
import { Suspense, lazy, useState } from 'react'
import useAppStore from '../store/useAppStore'
import { getProcessPhase, REVIEW_QUESTIONS } from '../lib/processGuide'
import {
  normalizeLocale,
  t as i18nT,
  tFormat,
  pathLabel,
} from '../lib/i18n'
import { packReadiness } from '../lib/exportFiles'

const BrandArtboard = lazy(() => import('../components/BrandArtboard'))

/** Short stems — full sentence only as title / Advanced */
const REVIEW_PROMPTS = [
  { stem: 'Hopeful?', full: REVIEW_QUESTIONS[0] },
  { stem: 'First 3s?', full: REVIEW_QUESTIONS[1] },
  { stem: 'Notice first?', full: REVIEW_QUESTIONS[2] },
  { stem: 'One change?', full: REVIEW_QUESTIONS[3] },
]

/** Deliver-stage items belong on Deliver, not Review */
const REVIEW_GAP_SKIP = new Set(['handoff', 'learnings'])

export default function ReviewView({
  locale: localeProp = 'en',
  navDir = 'none',
  activeProject = null,
  deskMood = [],
  projectPalette = [],
  hidePackWatermark = false,
  setActiveView,
  goSystemSection,
  buildCurrentBrandPack,
  flashToast,
  flashMicro,
}) {
  const locale = normalizeLocale(localeProp)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const packSnap = buildCurrentBrandPack()
  const ready = packReadiness(packSnap)
  const reviewChecks = ready.checks.filter((c) => !REVIEW_GAP_SKIP.has(c.id))
  const miss = reviewChecks.filter((c) => !c.ok)
  const okCount = reviewFilters.filter((c) => c.ok).length
  const [activePrompt, setActiveProduct] = useState(0)

  const goal = activeProject?.detective?.goal
    ? String(activeProject.detective.goal)
    : ''
  const brandWords = activeProject?.detective?.brandWords
    ? String(activeProject.detective.brandWords)
    : ''

  const appendPrompt = (full) => {
    const cur = String(activeProject?.feedbackNotes || '')
    const line = full.trim()
    if (!line) return
    if (cur.includes(line)) {
      flashMicro?.('Already in notes')
      return
    }
    const next = cur.trim() ? `${cur.trim()}\n• ${line}` : `• ${line}`
    updateBrandField('feedbackNotes', next)
    flashMicro?.('Added to notes')
  }

  const jumpGap = (c) => {
    if (c.view === 'studio') setActiveView('studio')
    else if (c.view === 'brand') goSystemSection(c.section || 'essentials')
    else if (c.view === 'project') {
      setActiveView('project')
      window.setTimeout(
        () => document.getElementById('detective-goal')?.focus(),
        100
      )
    } else if (c.view === 'finish') setActiveView('finish')
    else if (c.view) setActiveView(c.view)
  }

  return (
    <div
      className="review-view surface-desk view-enter review-studio"
      data-nav-dir={navDir}
    >
      <div className="flow-top review-top">
        <div className="review-top-text">
          <h1 className="page-title">{i18nT(locale, 'path.review')}</h1>
          {(goal || brandWords) && (
            <p className="review-meta-info" role="status">
              {goal ? `Goal: ${goal.slice(0, 30)}${goal.length > 30 ? '...' : ''}` : ''}
              {goal && brandWords ? ' • ' : ''}
              {brandWords ? `${brandWords.slice(0, 30)}${brandWords.length > 30 ? '...' : ''}` : ''}
            </p>
          )}
          <InfoReveal>
            {(getProcessPhase('review')?.checks || []).join(' · ')}
          </InfoReveal>
        </div>
        {miss.length === 0 ? (
          <span className="review-status-chip is-ready" aria-live="polite">
            Ready · {okCount}/{reviewChecks.length}
          </span>
        ) : (
          <span className="review-status-chip is-gaps" aria-live="polite">
            Ready · {okCount}/{reviewChecks.length}
          </span>
        )}
      </div>

      <div className="review-split">
        {/* Edit rail — notes first */}
        <div className="review-edit-column">
          <section className="panel brand-section review-feedback-hero">
            <div className="brand-section-label">Notes</div>
            <div className="field-block review-notes-block">
              <label className="field-label sr-only" htmlFor="feedback-notes">
                Notes
              </label>
              <textarea
                id="feedback-notes"
                className="field-input review-notes-input"
                rows={6}
                value={activeProject?.feedbackNotes || ''}
                onChange={(e) =>
                  updateBrandField('feedbackNotes', e.target.value)
                }
                placeholder="Change · why · keep"
              />
            </div>

            <details className="review-advanced">
              <summary>Prompts</summary>
              <div
                className="review-question-chips"
                role="group"
                aria-label="Review prompts"
              >
                {REVIEW_PROMPTS.map((p, i) => (
                  <button
                    key={p.stem}
                    type="button"
                    title={p.full}
                    className={`review-prompt-chip${
                      activePrompt === i ? ' is-active' : ''
                    }`}
                    onClick={() => {
                      setActiveProdut(i)
                      appendPrompt(p.full)
                    }}
                  >
                    {p.stem}
                  </button>
                ))}
              </div>
            </details>
          </section>

          {miss.length > 0 && (
            <section className="panel brand-section review-ready-panel">
              <div className="brand-section-label">
                Fix · {miss.length} gap{miss.length === 1 ? '' : 's'}
              </div>
              <ul className="pack-ready-list review-ready-list">
                {miss.slice(0, 6).map((c) => (
                  <li key={c.id} className="is-miss">
                    <button
                      type="button"
                      className="pack-ready-fix review-gap-btn"
                      onClick={() => jumpGap(c)}
                    >
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sticky preview 45% */}
        <section
          className="panel brand-section review-split-left review-preview-panel"
          tabIndex={0}
          role="region"
          aria-label="Pack preview"
        >
          <div className="design-rail-label">Preview</div>
          <div className="pack-preview-thumb pack-preview-artboard review-pack-preview">
            <Suspense fallback={<div className="panel-hint">Loading…</div>}>
              <BrandArtboard
                id="review-preview-artboard"
                project={activeProject || {}}
                palette={projectPalette}
                pins={deskMood.filter((m) => m.inPack)}
                editable={false}
                hideWatermark={hidePackWatermark}
              />
            </Suspense>
          </div>
        </section>
      </div>

      <div className="brand-export-bar path-continue-row review-continue">
        <button
          type="button"
          className="btn btn-primary work-path-next"
          onClick={() => setActiveView('finish')}
        >
          {tFormat(locale, 'ui.continueNext', {
            label: pathLabel(locale, 'deliver') || 'Deliver',
          })}
        </button>
      </div>
    </div>
  )
}