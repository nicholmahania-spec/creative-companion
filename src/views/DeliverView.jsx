/**
 * Assets — preview + ship the leave-behind.
 * One job: handoff note and one primary download. Setup, stationery,
 * formats, and leave live below as secondary work.
 */
import { Suspense, lazy } from 'react'
import useAppStore from '../store/useAppStore'
import CaseStudyExport from '../components/CaseStudyExport'
import { labelForStepId, JOURNEY_STEPS } from '../lib/journey'
import { getProcessPhase } from '../lib/processGuide'
import { packReadiness, packBriefMarkdown } from '../lib/exportFiles'
import { isLogoOnlyScope } from '../lib/detectiveBrief'
import { focusPathGapTarget } from '../lib/journeyProgress'
import InfoReveal from '../components/InfoReveal'
import {
  BOOK_PAGE_SIZES,
  BOOK_EDGE_SPACE,
  bookSetupSummary,
} from '../lib/brandBookSetup'
import '../styles/lazy-deliver.css'

const BrandBookPreview = lazy(
  () => import('../components/BrandBookPreview')
)
const StationeryKit = lazy(() => import('../components/StationeryKit'))

/**
 * A row of named stops. Options come from brandBookSetup so the labels here
 * and the geometry the PDF applies are the same declaration.
 */
function SetupChoice({ label, options, value, onChange }) {
  return (
    <div className="book-setup-row">
      <span className="book-setup-label">{label}</span>
      <div className="book-setup-stops" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`book-setup-stop${value === o.id ? ' is-on' : ''}`}
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DeliverView({
  navDir = 'none',
  activeProject = null,
  projectPalette = [],
  hidePackWatermark = false,
  bookSetup = { pageSize: 'letter', edgeSpace: 'standard', printShop: false },
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
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const addContact = useAppStore((s) => s.addContact)
  const updateContact = useAppStore((s) => s.updateContact)
  const removeContact = useAppStore((s) => s.removeContact)

  const packSnap = buildCurrentBrandPack()
  const ready = packReadiness(packSnap)
  const gaps = ready.checks.filter((c) => !c.ok)
  /* Core gaps drive the status line; handoff/learnings are ship polish and
     must not make a finished job read unfinished. */
  const coreGaps = gaps.filter((c) => !['handoff', 'learnings'].includes(c.id))

  /* Logo-only jobs ship the mark files as primary; book stays under More. */
  const logoOnly = isLogoOnlyScope(activeProject?.detective?.deliverablesPicked)

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

  const brandWordList = String(activeProject?.detective?.brandWords || '')
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean)
  const checked = activeProject?.deliverWordsChecked || {}

  const statusLine = ready.allDone
    ? 'Ready to ship'
    : coreGaps.length === 1
      ? `Still to add · ${coreGaps[0].label}`
      : coreGaps.length > 1
        ? `Still to add · ${coreGaps.length} things`
        : gaps.length > 0
          ? 'Add a handoff note when you ship'
          : 'Preview the book, then download'

  return (
    <div
      className="finish-view surface-document pack-view deliver-studio assets-studio view-enter"
      data-nav-dir={navDir}
    >
      <div className="flow-top deliver-top">
        <div className="deliver-top-text">
          <h1 className="page-title work-page-title">
            {labelForStepId('deliver')}
          </h1>
          <p className="assets-status" role="status">
            {statusLine}
            <InfoReveal>
              {(getProcessPhase('deliver')?.checks || []).join(' · ')}
            </InfoReveal>
          </p>
        </div>
      </div>

      {/* Primary surface — the real book, same PDF as download */}
      <section
        className="assets-preview-panel"
        tabIndex={0}
        role="region"
        aria-label="Pack preview"
      >
        <div className="assets-preview-frame deliver-pack-preview">
          <Suspense fallback={<div className="panel-hint">Loading preview…</div>}>
            <BrandBookPreview
              pack={packSnap}
              book={bookSetup}
              hideWatermark={hidePackWatermark}
            />
          </Suspense>
        </div>
      </section>

      {/* One ship job — download + handoff */}
      <section className="assets-ship" aria-label="Ship">
        <div className="path-continue-row deliver-primary-ship">
          <button
            type="button"
            className="btn btn-primary work-path-next"
            onClick={() => runExport(logoOnly ? 'mark' : 'pdf')}
          >
            {logoOnly ? 'Download logo files' : 'Download brand book PDF'}
          </button>
        </div>

        <div className="field-block deliver-note-block">
          <label className="field-label" htmlFor="handoff-note">
            Handoff
          </label>
          <textarea
            id="handoff-note"
            className="field-textarea deliver-focus-field deliver-note"
            rows={2}
            value={activeProject?.handoffNote || ''}
            onChange={(e) => updateBrandField('handoffNote', e.target.value)}
            placeholder="What’s included · how to use it"
          />
        </div>

        {lastExportNote ? (
          <p className="pack-export-confirm" role="status">
            {lastExportNote}
          </p>
        ) : null}

        {coreGaps.length > 0 && (
          <div className="deliver-gaps assets-gaps">
            <p className="field-label assets-gaps-label">Still open on the path</p>
            <ul className="pack-ready-list deliver-gap-list">
              {coreGaps.slice(0, 6).map((c) => (
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
      </section>

      {/* Secondary — setup, learnings, stationery, formats */}
      <div className="assets-secondary">
        <details className="deliver-advanced" open={false}>
          <summary>Page setup</summary>
          <div className="book-setup" role="group" aria-label="Page setup">
            <SetupChoice
              label="Page size"
              options={BOOK_PAGE_SIZES}
              value={bookSetup.pageSize}
              onChange={(v) => setPref('bookPageSize', v)}
            />
            <SetupChoice
              label="Edge space"
              options={BOOK_EDGE_SPACE}
              value={bookSetup.edgeSpace}
              onChange={(v) => setPref('bookEdgeSpace', v)}
            />
            <label className="book-setup-shop">
              <input
                type="checkbox"
                checked={bookSetup.printShop}
                onChange={(e) => setPref('bookPrintShop', e.target.checked)}
              />
              <span>Going to a print shop</span>
            </label>
            <p className="book-setup-state">{bookSetupSummary(bookSetup)}</p>
            <label className="pack-watermark-toggle">
              <input
                type="checkbox"
                checked={hidePackWatermark}
                onChange={(e) => setPref('hidePackWatermark', e.target.checked)}
              />
              <span>Hide Creative Companion credit</span>
            </label>
          </div>
        </details>

        <div className="field-block deliver-note-block">
          <label className="field-label" htmlFor="learnings-note">
            Learned
          </label>
          <textarea
            id="learnings-note"
            className="field-textarea deliver-focus-field deliver-note"
            rows={2}
            value={activeProject?.learnings || ''}
            onChange={(e) => updateBrandField('learnings', e.target.value)}
            placeholder="What worked · what next"
          />
        </div>

        <CaseStudyExport
          activeProject={activeProject}
          flashToast={flashToast}
        />

        <section className="assets-stationery" aria-label="Stationery">
          <h2 className="assets-secondary-title">Stationery</h2>
          <p className="deliver-stationery-lede">
            Letterhead, card, envelope, signature — applications of the system.
          </p>
          <Suspense fallback={<div className="panel-hint">Loading…</div>}>
            <StationeryKit
              activeProject={activeProject}
              projectPalette={projectPalette}
              updateBrandField={updateBrandField}
              addContact={addContact}
              updateContact={updateContact}
              removeContact={removeContact}
              flashToast={flashToast}
            />
          </Suspense>
        </section>

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
            {logoOnly && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => runExport('pdf')}
              >
                Brand book PDF
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => runExport('print')}
            >
              Print
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => runExport('kit')}
            >
              Everything (zip)
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                try {
                  const md = packBriefMarkdown(buildCurrentBrandPack())
                  await navigator.clipboard.writeText(md)
                  flashToast('Brand summary copied')
                } catch {
                  flashToast('Could not copy — try Download instead')
                }
              }}
            >
              Copy summary
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

      <div className="path-continue-row assets-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setActiveView?.('desk')}
        >
          Back to the desk
        </button>
      </div>
    </div>
  )
}
