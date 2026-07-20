/**
 * Deliver step — brand book PDF, handoff, learnings, leave-behind ready.
 */
import { useState, Suspense, lazy } from 'react'
import useAppStore from '../store/useAppStore'
import { JOURNEY_STEPS } from '../lib/journey'
import { getProcessPhase } from '../lib/processGuide'
import {
  normalizeLocale,
  t as i18nT,
  tFormat,
  pathLabel,
} from '../lib/i18n'
import { packReadiness, packBriefMarkdown } from '../lib/exportFiles'
import { focusPathGapTarget } from '../lib/journeyProgress'

const PathProgressPanel = lazy(() => import('../components/PathProgressPanel'))
const BrandArtboard = lazy(() => import('../components/BrandArtboard'))
const EmptyIllustration = lazy(() => import('../components/EmptyIllustration'))

export default function DeliverView({
  locale: localeProp = 'en',
  navDir = 'none',
  activeProject = null,
  deskMood = [],
  deskTasks = [],
  completedCount = 0,
  projectPalette = [],
  pathRows = [],
  pathDoneCount = 0,
  pathMissingLabelsList = [],
  pathNextGap = null,
  leaveBehindThin = false,
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
  /** @type {null | 'print' | 'pdf'} */
  const [thinPackPrompt, setThinPackPrompt] = useState(null)

  return (
          <div className="finish-view surface-document pack-view view-enter" data-nav-dir={navDir}>
            <div className="flow-top">
              <div>
                <p className="pack-eyebrow">{i18nT(locale, 'ui.packEyebrow')}</p>
                <h1 className="page-title page-title-display">
                  {i18nT(locale, 'path.deliver')}
                </h1>
                <p className="page-sub">
                  {activeProject?.name || 'Your project'} · {i18nT(locale, 'ui.packSub')}
                </p>
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
                hint="Tap a step chip to fill gaps. Path strip or G for the next empty step — then brand book PDF."
              />
            </Suspense>

            <section className="panel brand-section finish-hero-panel pack-hero">
              <div className="pack-layout">
                <div
                  className="pack-preview-thumb pack-preview-artboard"
                  tabIndex={0}
                  role="region"
                  aria-label="Leave-behind preview — scroll for full sheet"
                >
                  <Suspense fallback={<div className="panel-hint">Loading artboard…</div>}>
                    <BrandArtboard
                      id="pack-preview-artboard"
                      project={activeProject || {}}
                      palette={projectPalette}
                      pins={deskMood.filter((m) => m.inPack)}
                      editable={false}
                      hideWatermark={hidePackWatermark}
                    />
                  </Suspense>
                  <p className="pack-preview-scroll-hint">Scroll preview for full sheet</p>
                </div>
                <div className="pack-meta">
                  {(() => {
                    const packSnap = buildCurrentBrandPack()
                    const ready = packReadiness(packSnap)
                    return (
                      <>
                        <div className="brand-section-label">Ready</div>
                        <ul className="pack-ready-list">
                          {ready.checks.map((c) => (
                            <li
                              key={c.id}
                              className={c.ok ? 'is-ok' : 'is-miss'}
                            >
                              {c.ok ? (
                                <span>
                                  ✓ {c.label}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="pack-ready-fix"
                                  onClick={() => {
                                    if (c.view === 'brand') {
                                      goSystemSection(c.section || 'essentials')
                                      return
                                    }
                                    if (c.id === 'handoff') {
                                      setActiveView('finish')
                                      focusPathGapTarget('#handoff-note')
                                      return
                                    }
                                    if (c.id === 'learnings') {
                                      setActiveView('finish')
                                      focusPathGapTarget('#learnings-note')
                                      return
                                    }
                                    const step = JOURNEY_STEPS.find(
                                      (s) => s.view === c.view
                                    )
                                    if (step) goToProcessStep(step)
                                    else if (c.view) setActiveView(c.view)
                                  }}
                                >
                                  {tFormat(locale, 'ui.packReadyFix', {
                                    label: c.label,
                                  })}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                        <p className="panel-hint">
                          Steps {completedCount}
                          {deskTasks.length ? `/${deskTasks.length}` : ''} · Pins{' '}
                          {packSnap.pins?.length || 0}
                          {packSnap.pinsUsedFallback
                            ? ` (${i18nT(locale, 'ui.starPinsHint')})`
                            : ''}
                        </p>
                        {ready.thin && (
                          <div className="pack-thin-block">
                            <Suspense fallback={null}>
                              <EmptyIllustration
                                variant="pack"
                                className="pack-thin-illu"
                              />
                            </Suspense>
                            <p className="pack-thin-warning" role="status">
                              {i18nT(locale, 'ui.thinPack')}
                            </p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                  <div className="finish-actions pack-primary-stack">
                    <p className="pack-client-kicker">{i18nT(locale, 'ui.clientHandoff')}</p>
                    {thinPackPrompt && (
                      <div
                        className="thin-pack-prompt"
                        role="alertdialog"
                        aria-labelledby="thin-pack-title"
                      >
                        <p id="thin-pack-title" className="thin-pack-prompt-body">
                          {i18nT(locale, 'ui.thinPackBanner')}
                        </p>
                        <div className="thin-pack-prompt-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              const kind = thinPackPrompt
                              setThinPackPrompt(null)
                              runExport(kind === 'print' ? 'print' : 'pdf')
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
                    <button
                      type="button"
                      className="btn btn-primary pack-print-btn"
                      onClick={() => {
                        const packSnap = buildCurrentBrandPack()
                        const ready = packReadiness(packSnap)
                        if (ready.thin) {
                          setThinPackPrompt('print')
                          return
                        }
                        runExport('print')
                      }}
                    >
                      {i18nT(locale, 'ui.printSavePdf')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary pack-download-btn"
                      onClick={() => {
                        const packSnap = buildCurrentBrandPack()
                        const ready = packReadiness(packSnap)
                        if (ready.thin) {
                          setThinPackPrompt('pdf')
                          return
                        }
                        runExport('pdf')
                      }}
                    >
                      {i18nT(locale, 'ui.downloadVectorPdf')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost pack-copy-brief"
                      onClick={async () => {
                        try {
                          const packSnap = buildCurrentBrandPack()
                          const md = packBriefMarkdown(packSnap)
                          await navigator.clipboard.writeText(md)
                          flashToast(i18nT(locale, 'ui.leaveBehindBriefCopied'))
                          setLastExportNote('Brief copied to clipboard')
                        } catch {
                          flashToast(i18nT(locale, 'ui.leaveBehindBriefCopyFail'))
                        }
                      }}
                    >
                      Copy brief
                    </button>
                    <p className="pack-export-hint">
                      {i18nT(locale, 'ui.packHint')}
                    </p>
                    {lastExportNote ? (
                      <p className="pack-export-confirm" role="status">
                        {lastExportNote}
                      </p>
                    ) : null}
                    <div className="process-tip-panel" style={{ marginTop: '0.85rem' }}>
                      <div className="brand-section-label">Deliver checklist</div>
                      <ul className="process-guide-checks">
                        {(getProcessPhase('deliver')?.checks || []).map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="field-block" style={{ marginTop: '0.85rem' }}>
                      <label className="field-label" htmlFor="handoff-note">
                        Handoff note (for the client)
                      </label>
                      <textarea
                        id="handoff-note"
                        className="field-input"
                        rows={2}
                        value={activeProject?.handoffNote || ''}
                        onChange={(e) =>
                          updateBrandField('handoffNote', e.target.value)
                        }
                        placeholder="What’s included, how to use the mark, contact for questions…"
                      />
                    </div>
                    <div className="field-block" style={{ marginTop: '0.65rem' }}>
                      <label className="field-label" htmlFor="learnings-note">
                        What I learned
                      </label>
                      <textarea
                        id="learnings-note"
                        className="field-input"
                        rows={3}
                        value={activeProject?.learnings || ''}
                        onChange={(e) =>
                          updateBrandField('learnings', e.target.value)
                        }
                        placeholder="What worked? What felt like me? What to improve next time? (Notes only — not a media library.)"
                      />
                    </div>
                    <p className="panel-hint" style={{ marginTop: '0.65rem' }}>
                      Direction leave-behind &amp; lockups — not a full design
                      tool or Figma replacement.
                    </p>
                    <p className="panel-hint" style={{ marginTop: '0.35rem' }}>
                      {i18nT(locale, 'ui.pdfFontHonesty')}
                    </p>
                    {leaveBehindThin && pathDoneCount >= 5 && (
                      <p className="panel-hint pack-path-vs-thin" role="status">
                        {i18nT(locale, 'ui.pathFullLeaveBehindThin')}
                      </p>
                    )}
                    <label className="pack-watermark-toggle">
                      <input
                        type="checkbox"
                        checked={hidePackWatermark}
                        onChange={(e) =>
                          setPref('hidePackWatermark', e.target.checked)
                        }
                      />
                      <span>Hide tool watermark (client handoff)</span>
                    </label>
                    <details className="pack-more-actions">
                      <summary className="text-link pack-more-summary">
                        More actions
                      </summary>
                      <div className="finish-secondary-row pack-more-row">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={openExportPanel}
                      >
                        Preview full
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setActiveView('brand')}
                      >
                        Edit Design
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setActiveView('flow')}
                      >
                        Sketch
                      </button>
                      </div>
                    </details>
                    <details className="finish-more-formats">
                      <summary>More formats &amp; backup</summary>
                      <div className="finish-more-formats-list">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => runExport('pdf-preview')}
                        >
                          Preview PDF (raster)
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => runExport('html')}
                        >
                          HTML
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => runExport('md')}
                        >
                          Markdown
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => runExport('json')}
                        >
                          Pack JSON
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={downloadDataBackup}
                        >
                          Full workspace backup
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </section>

            <details className="pack-leave-details panel brand-section">
              <summary className="brand-section-label pack-leave-summary">
                Leave desk
              </summary>
              <div className="finish-actions" style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
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
                  className="btn btn-ghost"
                  onClick={handleSignOut}
                >
                  {CLOUD ? 'Log out' : 'Log out / lock'}
                </button>
              </div>
              <p className="panel-hint" style={{ marginTop: '0.65rem' }}>
                Log out ends this session. Download a backup first if you need a
                file on your computer.
              </p>
            </details>

            <section className="panel panel-compact pack-path-map">
              <p className="list-heading">Your path</p>
              <ol className="finish-map">
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('project')}>
                    1 Define
                  </button>
                  {' — '}goal · brief · who
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('studio')}>
                    2 Research
                  </button>
                  {' — '}refs · star up to 6
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('spark')}>
                    3 Ideate
                  </button>
                  {' — '}many directions
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('flow')}>
                    4 Sketch
                  </button>
                  {' — '}one step at a time
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('brand')}>
                    5 Design
                  </button>
                  {' — '}artboard · voice · type
                </li>
                <li>
                  <button type="button" className="text-link" onClick={() => setActiveView('review')}>
                    6 Review
                  </button>
                  {' — '}critique · readiness
                </li>
                <li>
                  <strong>7 Deliver</strong>
                  {' — '}you are here · brand book PDF
                </li>
              </ol>
            </section>
          </div>
  )
}
