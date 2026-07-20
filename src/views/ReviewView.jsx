/**
 * Review step — leave-behind preview, process map, feedback notes.
 */
import { Suspense, lazy } from 'react'
import useAppStore from '../store/useAppStore'
import { JOURNEY_STEPS } from '../lib/journey'
import { getProcessPhase, REVIEW_QUESTIONS } from '../lib/processGuide'
import {
  normalizeLocale,
  t as i18nT,
  tFormat,
  pathLabel,
} from '../lib/i18n'
import { packReadiness, packBriefMarkdown } from '../lib/exportFiles'

const PathProgressPanel = lazy(() => import('../components/PathProgressPanel'))
const BrandArtboard = lazy(() => import('../components/BrandArtboard'))

export default function ReviewView({
  locale: localeProp = 'en',
  navDir = 'none',
  activeProject = null,
  deskMood = [],
  projectPalette = [],
  pathRows = [],
  pathDoneCount = 0,
  pathMissingLabelsList = [],
  pathNextGap = null,
  hidePackWatermark = false,
  setActiveView,
  goToProcessStep,
  goSystemSection,
  buildCurrentBrandPack,
  flashToast,
  flashMicro,
  toggleBodyDoubling,
  bodyDoubling = false,
}) {
  const locale = normalizeLocale(localeProp)
  const updateBrandField = useAppStore((s) => s.updateBrandField)

  return (
          <div className="review-view surface-desk view-enter" data-nav-dir={navDir}>
            <div className="flow-top">
              <div>
                <h1 className="page-title">{i18nT(locale, 'path.review')}</h1>
                <p className="page-sub">
                  Show the work. Ask if it feels right. Revise for the goal — not
                  every opinion.
                </p>
              </div>
              <div className="finish-secondary-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveView('brand')}
                >
                  Back to Design
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveView('finish')}
                >
                  {tFormat(locale, 'ui.continueNext', {
                    label: pathLabel(locale, 'deliver') || 'Deliver',
                  })}
                </button>
              </div>
            </div>
            <Suspense fallback={null}>
              <PathProgressPanel
                steps={JOURNEY_STEPS}
                rows={pathRows}
                doneN={pathDoneCount}
                missing={pathMissingLabelsList}
                nextGap={pathNextGap}
                showFixCta={false}
                showMissing={false}
                onOpenStep={(_view, step) => {
                  const s =
                    step ||
                    JOURNEY_STEPS.find((x) => x.view === _view) ||
                    pathRows.find((x) => x.view === _view)
                  if (s) goToProcessStep(s)
                }}
                labelForId={(id) => pathLabel(locale, id)}
                hint="Tap a step chip to open it. Path strip or G for the next empty step — then Deliver."
              />
            </Suspense>
            <section className="panel brand-section">
              <div className="brand-section-label">Leave-behind preview</div>
              <p className="panel-hint" style={{ marginTop: 0 }}>
                What a reviewer sees — same sheet as Deliver.
              </p>
              <div
                className="pack-preview-thumb pack-preview-artboard review-pack-preview"
                tabIndex={0}
                role="region"
                aria-label="Review pack preview — scroll for full sheet"
              >
                <Suspense fallback={<div className="panel-hint">Loading artboard…</div>}>
                  <BrandArtboard
                    id="review-preview-artboard"
                    project={activeProject || {}}
                    palette={projectPalette}
                    pins={deskMood.filter((m) => m.inPack)}
                    editable={false}
                    hideWatermark={hidePackWatermark}
                  />
                </Suspense>
                <p className="pack-preview-scroll-hint">Scroll preview for full sheet</p>
              </div>
            </section>
            <section className="panel brand-section">
              <div className="brand-section-label">Review checklist</div>
              <ul className="process-guide-checks review-checks">
                {(getProcessPhase('review')?.checks || []).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="process-guide-prompt">
                {getProcessPhase('review')?.prompt}
              </p>
            </section>
            <section className="panel brand-section">
              <div className="brand-section-label">Leave-behind readiness</div>
              {(() => {
                const packSnap = buildCurrentBrandPack()
                const ready = packReadiness(packSnap)
                return (
                  <>
                    <p className="panel-hint">
                      <strong>
                        {ready.okCount}/{ready.checks.length}
                      </strong>{' '}
                      ready
                      {ready.thin ? ' · not ready for the client yet' : ''}
                    </p>
                    <ul className="pack-ready-list">
                      {ready.checks.map((c) => (
                        <li
                          key={c.id}
                          className={c.ok ? 'is-ok' : 'is-miss'}
                        >
                          {c.ok ? (
                            <span>✓ {c.label}</span>
                          ) : (
                            <button
                              type="button"
                              className="pack-ready-fix"
                              onClick={() => {
                                if (c.view === 'studio') setActiveView('studio')
                                else if (c.view === 'brand')
                                  goSystemSection(c.section || 'essentials')
                                else if (c.view === 'project') {
                                  setActiveView('project')
                                  window.setTimeout(
                                    () =>
                                      document
                                        .getElementById('detective-goal')
                                        ?.focus(),
                                    100
                                  )
                                } else if (c.view) setActiveView(c.view)
                              }}
                            >
                              ○ {c.label} — fix
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )
              })()}
            </section>
            <section className="panel brand-section">
              <div className="brand-section-label">Ask for feedback</div>
              <p className="panel-hint" style={{ marginTop: 0 }}>
                Specific beats “do you like it?” Feedback is not failure — capture
                it, then keep only what serves the goal.
              </p>
              <div className="review-question-chips">
                {REVIEW_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(q)
                        flashToast(i18nT(locale, 'ui.questionCopied'))
                      } catch {
                        flashMicro(q.slice(0, 40))
                      }
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="field-block" style={{ marginTop: '0.85rem' }}>
                <label className="field-label" htmlFor="feedback-notes">
                  Feedback notes
                </label>
                <textarea
                  id="feedback-notes"
                  className="field-input"
                  rows={4}
                  value={activeProject?.feedbackNotes || ''}
                  onChange={(e) =>
                    updateBrandField('feedbackNotes', e.target.value)
                  }
                  placeholder="What they said · what you’ll change · what you’ll ignore (taste noise)."
                />
              </div>
              <div className="finish-secondary-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (!bodyDoubling) toggleBodyDoubling()
                    flashToast(i18nT(locale, 'ui.helperOpenCritique'))
                  }}
                >
                  Open Helper for Critique
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={async () => {
                    try {
                      const md = packBriefMarkdown(buildCurrentBrandPack())
                      await navigator.clipboard.writeText(md)
                      flashToast(i18nT(locale, 'ui.briefCopied'))
                    } catch {
                      flashToast(i18nT(locale, 'ui.briefCopyFail'))
                    }
                  }}
                >
                  Copy brief to share
                </button>
              </div>
            </section>
          </div>
  )
}
