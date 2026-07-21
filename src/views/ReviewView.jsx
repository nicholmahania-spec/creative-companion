/**
 * Review step — leave-behind preview, process map, feedback notes.
 */
import { Suspense, lazy } from 'react'
import useAppStore from '../store/useAppStore'
import { getProcessPhase, REVIEW_QUESTIONS } from '../lib/processGuide'
import {
  normalizeLocale,
  t as i18nT,
  tFormat,
  pathLabel,
} from '../lib/i18n'
import { packReadiness, packBriefMarkdown } from '../lib/exportFiles'
import InfoReveal from '../components/InfoReveal'

const BrandArtboard = lazy(() => import('../components/BrandArtboard'))

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
            <div className="review-split">
              <section className="panel brand-section review-split-left">
                <div className="brand-section-label">Preview</div>
                <div
                  className="pack-preview-thumb pack-preview-artboard review-pack-preview"
                  tabIndex={0}
                  role="region"
                  aria-label="Review pack preview — scroll for full sheet"
                >
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
              <div className="review-split-right">
                <section className="panel brand-section">
                  <div className="brand-section-label">
                    Review
                    <InfoReveal>
                      {(getProcessPhase('review')?.checks || []).join(' · ')}
                    </InfoReveal>
                  </div>
                </section>
                <section className="panel brand-section">
                  <div className="brand-section-label">Readiness</div>
                  {(() => {
                    const packSnap = buildCurrentBrandPack()
                    const ready = packReadiness(packSnap)
                    return (
                      <>
                        <p className="panel-hint">
                          <strong>
                            {ready.okCount}/{ready.checks.length}
                          </strong>
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
                                  ○ {c.label}
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
                  <div className="brand-section-label">Feedback</div>
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
                      Notes
                    </label>
                    <textarea
                      id="feedback-notes"
                      className="field-input"
                      rows={4}
                      value={activeProject?.feedbackNotes || ''}
                      onChange={(e) =>
                        updateBrandField('feedbackNotes', e.target.value)
                      }
                      placeholder="What changes…"
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
                      Open Helper
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
                      Copy brief
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
  )
}
