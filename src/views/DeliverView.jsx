/**
 * Deliver — handoff + ship left (55%), sticky pack preview right (45%).
 * ADHD: one primary Download, gaps compact, advanced formats/leave.
 */
import { useState, Suspense, lazy } from 'react'
import useAppStore from '../store/useAppStore'
import { JOURNEY_STEPS } from '../lib/journey'
import { getProcessPhase } from '../lib/processGuide'
import {
  normalizeLocale,
  t as i18nT,
} from '../lib/i18n'
import { packReadiness, packBriefMarkdown } from '../lib/exportFiles'
import { focusPathGapTarget } from '../lib/journeyProgress'
import InfoReveal from '../components/InfoReveal'

const BrandArtboard = lazy(() => import('../components/BrandArtboard'))

export default function DeliverView({
  locale: localeProp = 'en',
  navDir = 'none',
  activeProject = null,
  deskMood = [],
  projectPalette = [],
  hidePackWatermark = false,
  setActiveView,
  goToProcessStep,
  goSystemSection,
  buildCurrentBrandPack,
  setPref,
  runExport,
  openExportPanel,
  flashToast,
  handleSignOut,
  downloadDataBackup,
  createNewProject,
  notifyAction,
  CLOUD = false,
  lastExportNote = '',
}) {
  const locale = normalizeLocale(localeProp)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  /** @type {null | 'print' | 'pdf' | 'kit'} */
  const [thinPackPrompt, setThinPackPrompt] = useState(null)

  const packSnap = buildCurrentBrandPack()
  const ready = packReadiness(packSnap)
  const gaps = ready.checks.filter((c) => !c.ok)
  const okCount = ready.checks.filter((c) => c.ok).length

  const goal = activeProject?.detective?.goal
    ? String(activeProject.detective.goal)
    : ''
  const brandWords = activeProject?.detective?.brandWords
    ? String(activeProject.detective.brandWords)
    : ''

  const jumpGap = (c) => {
    if (c.view === 'brand') {
      goSystemSection(c.section || 'essentials')
      return
    }
    if (c.id === 'handoff') {
      focusPathGapTarget('#handoff-note')
      return
    }
    if (c.id === 'learnings') {
      focusPathGapTarget('#learnings-note')
      return
    }
    const step = JOURNEY_STEPS.find((s) => s.view === c.view)
    if (step) goToProcessStep(step)
    else if (c.view) setActiveView(c.view)
  }

  const runPack = (kind) => {
    if (ready.thin) {
      setThinPackPrompt(kind === 'print' ? 'print' : kind)
      return
    }
    runExport(kind)
  }

  const brandWordList = String(activeProject?.detective?.brandWords || '')
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean)
  const checked = activeProject?.deliverWordsChecked || {}

  return (
    <div
      className="finish-view surface-document pack-view deliver-studio view-enter"
      data-nav-dir={navDir}
    >
      <div className="flow-top deliver-top">
        <div className="deliver-top-text">
          <h1 className="page-title">{i18nT(locale, 'path.deliver')}</h1>
          {(goal || brandWords) && (
            <p
              className="deliver-goal-anchor"
              title={[goal, brandWords].filter(Boolean).join(' · ')}
            >
              {goal
                ? `Goal · ${goal.slice(0, 80)}${goal.length > 80 ? '…' : ''}`
                : null}
              {goal && brandWords ? ' · ' : ''}
              {brandWords ? brandWords.slice(0, 48) : null}
            </p>
          )}
          <InfoReveal>
            {(getProcessPhase('deliver')?.checks || []).join(' · ')}
          </InfoReveal>
        </div>
        <span
          className={`deliver-status-chip${gaps.length ? ' is-gaps' : ' is-ready'}`}
          aria-live="polite"
        >
          {gaps.length
            ? `Pack · ${okCount}/${ready.checks.length}`
            : `Pack · ${okCount}/${ready.checks.length} ready`}
        </span>
      </div>

      <div className="deliver-split">
        <div className="deliver-edit-column">
          <section className="panel brand-section deliver-ship-panel">
            <div className="brand-section-label">Ship</div>

            <div className="field-block">
              <label className="field-label" htmlFor="handoff-note">
                Handoff
              </label>
              <textarea
                id="handoff-note"
                className="field-input deliver-focus-field"
                rows={2}
                value={activeProject?.handoffNote || ''}
                onChange={(e) =>
                  updateBrandField('handoffNote', e.target.value)
                }
                placeholder="What's included…"
              />
            </div>
            <div className="field-block">
              <label className="field-label" htmlFor="learnings-note">
                Learned
              </label>
              <textarea
                id="learnings-note"
                className="field-input deliver-focus-field"
                rows={2}
                value={activeProject?.learnings || ''}
                onChange={(e) =>
                  updateBrandField('learnings', e.target.value)
                }
                placeholder="What worked · next"
              />
            </div>

            {gaps.length > 0 && (
              <div className="deliver-gaps">
                <p className="field-label" style={{ margin: '0 0 0.35rem' }}>
                  Fix
                </p>
                <ul className="pack-ready-list deliver-gap-list">
                  {gaps.slice(0, 6).map((c) => (
                    <li key={c.id} className="is-miss">
                      <button
                        type="button"
                        className="pack-ready-fix deliver-gap-btn"
                        onClick={() => jumpGap(c)}
                      >
                        {c.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ready.thin && (
              <p className="pack-thin-warning" role="status">
                Thin · tagline / colors / ★ pins
              </p>
            )}

            {thinPackPrompt && (
              <div
                className="thin-pack-prompt"
                role="alertdialog"
                aria-labelledby="thin-pack-title"
              >
                <p id="thin-pack-title" className="thin-pack-prompt-body">
                  Thin pack — ship anyway?
                </p>
                <div className="thin-pack-prompt-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const kind = thinPackPrompt
                      setThinPackPrompt(null)
                      runExport(
                        kind === 'print'
                          ? 'print'
                          : kind === 'kit'
                            ? 'kit'
                            : 'pdf'
                      )
                    }}
                  >
                    {thinPackPrompt === 'print'
                      ? i18nT(locale, 'ui.continuePrint')
                      : i18nT(locale, 'ui.continueDownload')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setThinPackPrompt(null)}
                  >
                    {i18nT(locale, 'ui.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setThinPackPrompt(null)
                      setActiveView('studio')
                    }}
                  >
                    Research
                  </button>
                </div>
              </div>
            )}

            {lastExportNote ? (
              <p className="pack-export-confirm" role="status">
                {lastExportNote}
              </p>
            ) : null}

            <label className="pack-watermark-toggle">
              <input
                type="checkbox"
                checked={hidePackWatermark}
                onChange={(e) =>
                  setPref('hidePackWatermark', e.target.checked)
                }
              />
              <span>Hide watermark</span>
            </label>

            {brandWordList.length > 0 && (
              <details className="deliver-advanced">
                <summary>Brand words</summary>
                <div className="deliver-words-check">
                  {brandWordList.map((w) => (
                    <label key={w} className="deliver-word-check-row">
                      <input
                        type="checkbox"
                        checked={!!checked[w]}
                        onChange={(e) =>
                          updateBrandField('deliverWordsChecked', {
                            ...checked,
                            [w]: e.target.checked,
                          })
                        }
                      />
                      {w}
                    </label>
                  ))}
                </div>
              </details>
            )}

            <details className="deliver-advanced">
              <summary>More formats</summary>
              <div className="finish-secondary-row pack-more-row">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => runPack('print')}
                >
                  Print
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => runPack('kit')}
                >
                  Kit zip
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    try {
                      const md = packBriefMarkdown(buildCurrentBrandPack())
                      await navigator.clipboard.writeText(md)
                      flashToast(i18nT(locale, 'ui.leaveBehindBriefCopied'))
                    } catch {
                      flashToast(i18nT(locale, 'ui.leaveBehindBriefCopyFail'))
                    }
                  }}
                >
                  Copy brief
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={openExportPanel}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveView('brand')}
                >
                  Design
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => runExport('pdf-preview')}
                >
                  Raster
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => runExport('md')}
                >
                  MD
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={downloadDataBackup}
                >
                  Backup
                </button>
              </div>
            </details>
          </section>

          <details className="deliver-advanced deliver-leave">
            <summary>Leave</summary>
            <div className="finish-secondary-row" style={{ marginTop: '0.55rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  createNewProject()
                  notifyAction('New project', 'project_create', {
                    label: 'New project',
                  })
                  setActiveView('project')
                }}
              >
                New project
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleSignOut}
              >
                {CLOUD ? 'Log out' : 'Log out / lock'}
              </button>
            </div>
          </details>
        </div>

        <section
          className="panel brand-section deliver-preview-panel"
          tabIndex={0}
          role="region"
          aria-label="Pack preview"
        >
          <div className="design-rail-label">Preview</div>
          <div className="pack-preview-thumb pack-preview-artboard deliver-pack-preview">
            <Suspense fallback={<div className="panel-hint">Loading…</div>}>
              <BrandArtboard
                id="pack-preview-artboard"
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

      <div className="brand-export-bar path-continue-row deliver-continue">
        <button
          type="button"
          className="btn btn-primary work-path-next pack-split-main"
          onClick={() => runPack('pdf')}
        >
          {i18nT(locale, 'ui.downloadVectorPdf')}
        </button>
      </div>
    </div>
  )
}
