/**
 * Deliver — handoff + ship left (55%), sticky pack preview right (45%).
 * ADHD: one primary Download, gaps compact, advanced formats/leave.
 */
import { Suspense, lazy } from 'react'
import useAppStore from '../store/useAppStore'
import CaseStudyExport from '../components/CaseStudyExport'
import { labelForStepId, JOURNEY_STEPS } from '../lib/journey'
import { getProcessPhase } from '../lib/processGuide'
import { packReadiness, packBriefMarkdown } from '../lib/exportFiles'
import { focusPathGapTarget } from '../lib/journeyProgress'
import InfoReveal from '../components/InfoReveal'
import {
  BOOK_PAGE_SIZES,
  BOOK_EDGE_SPACE,
  bookSetupSummary,
} from '../lib/brandBookSetup'
import '../styles/lazy-deliver.css'

const BrandArtboard = lazy(() => import('../components/BrandArtboard'))

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
  deskMood = [],
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

  /* `runPack` used to sit here and intercept every export when the pack was
     thin, to ask "download anyway?". The page already shows that warning
     before the click, under the same `ready.thin` condition — so the user was
     told, decided to proceed, and was told again, with the answer being
     "anyway" every time. A prompt whose answer never changes is a toll, and
     as a gate at the moment of shipping it read as a verdict on the work.
     Nothing here is irreversible; it downloads a file. Export buttons call
     `runExport` directly now. */

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
          <h1 className="page-title">{labelForStepId('deliver')}</h1>
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

            {/* Primary ship CTA — ADHD: one obvious download on the fold */}
            <div className="path-continue-row deliver-primary-ship">
              <button
                type="button"
                className="btn btn-primary work-path-next"
                onClick={() => runExport('pdf')}
              >
                Brand book PDF
              </button>
            </div>

            {/* Page setup sits against the button it changes, not behind a
                toggle and not at the foot of the page — a setting stored away
                from its action has to be remembered as a separate errand, and
                that retrieval step is where starting dies. Three named stops
                rather than number fields: an open number invites tuning with
                no end state. Current setup is printed underneath because
                these prefs are sticky across projects, so it has to be
                readable months later rather than recalled. */}
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
                onChange={(e) =>
                  updateBrandField('handoffNote', e.target.value)
                }
                placeholder="What's included…"
              />
            </div>
            <div className="field-block deliver-note-block">
              <label className="field-label" htmlFor="learnings-note">
                Learned
              </label>
              <textarea
                id="learnings-note"
                className="field-textarea deliver-focus-field deliver-note"
                rows={2}
                value={activeProject?.learnings || ''}
                onChange={(e) =>
                  updateBrandField('learnings', e.target.value)
                }
                placeholder="What worked · next"
              />
            </div>

            {/* After the notes it reads from — Learned feeds the outcome
                section, so offering the export above it would ask for the
                story before the last line of it was written. */}
            <CaseStudyExport
              activeProject={activeProject}
              flashToast={flashToast}
            />

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
              <div className="pack-thin-warning" role="status">
                <p style={{ margin: '0 0 0.5rem' }}>
                  Thin pack — add tagline, colors, or ★ Research pins.
                </p>
                <div className="finish-secondary-row" style={{ margin: 0 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveView('studio')}
                  >
                    Go to Research
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => goSystemSection('essentials')}
                  >
                    {labelForStepId('design')}
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
                  onClick={() => runExport('print')}
                >
                  Print
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => runExport('kit')}
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
                      flashToast('Client brief copied')
                    } catch {
                      flashToast('Could not copy — try Download instead')
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
                {/* An "Identity" button used to sit here, between Preview and
                    Raster. It exported nothing — it navigated to the Identity
                    view — inside a row whose every other entry produces a
                    file. Someone scanning "More formats" for a file type
                    landed on a different page instead. The journey bar offers
                    Identity one click away, always, so nothing is lost. */}
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

          </div>
  )
}
