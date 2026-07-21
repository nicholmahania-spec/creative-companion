/**
 * Review — leave-behind preview (left) + readiness & feedback desk (right).
 * ADHD: preview stays in view while capturing notes (no tab-away for the pack).
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
  const packSnap = buildCurrentBrandPack()
  const ready = packReadiness(packSnap)
  const miss = ready.checks.filter((c) => !c.ok)
  const ok = ready.checks.filter((c) => c.ok)

  return (
    <div className="review-view surface-desk view-enter review-studio" data-nav-dir={navDir}>
      <div className="flow-top">
        <div>
          <h1 className="page-title">{i18nT(locale, 'path.review')}</h1>
          <InfoReveal>
            {(getProcessPhase('review')?.checks || []).join(' · ')}
          </InfoReveal>
        </div>
        <div className="finish-secondary-row path-continue-row">
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

      <div className="review-split">
        <section className="panel brand-section review-split-left review-preview-panel">
          <div className="brand-section-label">Leave-behind preview</div>
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
          <section className="panel brand-section review-feedback-hero">
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
                className="field-input review-notes-input"
                rows={5}
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

          <section className="panel brand-section review-ready-panel">
            <div className="brand-section-label">
              Readiness · {ready.okCount}/{ready.checks.length}
            </div>
            {miss.length > 0 ? (
              <ul className="pack-ready-list review-ready-list">
                {miss.map((c) => (
                  <li key={c.id} className="is-miss">
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
                              document.getElementById('detective-goal')?.focus(),
                            100
                          )
                        } else if (c.view) setActiveView(c.view)
                      }}
                    >
                      Fix · {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-hint review-ready-ok">
                Checks look solid — capture feedback, then Deliver.
              </p>
            )}
            {ok.length > 0 && miss.length > 0 && (
              <details className="review-ready-ok-details">
                <summary className="text-link">
                  {ok.length} already ok
                </summary>
                <ul className="pack-ready-list">
                  {ok.map((c) => (
                    <li key={c.id} className="is-ok">
                      <span>✓ {c.label}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
