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
  /* deskMood / projectPalette are gone: they fed the artboard preview this
     view no longer renders. The preview builds from the pack snapshot, which
     already carries the pins and palette. */
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
  /* Core gaps drive the headline and the chip colour; handoff/learnings are
     ship polish (see packReadiness.allDone) and must not make a finished job
     read red or unfinished. The full `gaps` list still shows below as optional
     additions. */
  const coreGaps = gaps.filter((c) => !['handoff', 'learnings'].includes(c.id))
  const okCount = ready.checks.filter((c) => c.ok).length

  /* A logo-only job ships the mark, not a 21-page book about a brand that
     doesn't exist. The cold-start tester delivered a logo and the only finish
     button produced the wrong artifact, so the project couldn't close in-app.
     When the brief scopes to the mark alone, the primary CTA becomes the logo
     files; the book stays reachable under More for anyone who still wants it. */
  const logoOnly = isLogoOnlyScope(activeProject?.detective?.deliverablesPicked)


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
          className={`deliver-status-chip${ready.allDone ? ' is-ready' : ' is-gaps'}`}
          aria-live="polite"
        >
          {/* Name the state, not a fraction. "Ready · 4/8" is a number on a
              job whose scope made four of those eight irrelevant; scoping
              already removed the out-of-scope checks, and here the count goes
              too. Done = "Ready to ship"; otherwise name the gaps. */}
          {ready.allDone
            ? 'Ready to ship'
            : `Still to add: ${coreGaps.map((c) => c.label).join(', ')}`}
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
                onClick={() => runExport(logoOnly ? 'mark' : 'pdf')}
              >
                {logoOnly ? 'Download logo files' : 'Brand book PDF'}
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

            {/* The thin-pack notice used to sit here. It listed the failing
                checks and offered two section jumps — but "Fix" directly
                above already renders every failing check as its own button,
                and `thin` can only be true when that list is non-empty. So a
                thin pack showed the same items twice, with two competing sets
                of buttons and no way to tell which one to act on.

                Two UIs over one fact is a decision where there should be
                none. Fix is the more precise of the two: per-item labels that
                jump to the exact field, rather than a coarse jump to the
                section it lives in. */}

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
              {/* Names what it actually removes. "Watermark" was an internal
                  term for the string "Creative Companion" in the footers and
                  the cover meta line — the app's own name, never the user's
                  studio name — so the label was a recall test with nothing on
                  screen to answer it. Same polarity as before: checked hides. */}
              <span>Hide Creative Companion credit</span>
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
                {/* On a logo-only job the book moved off the primary CTA, but
                    it stays here for anyone who wants it anyway — reachable,
                    just not the default. On a full-identity job the book IS
                    the primary button, so it would be a duplicate here. */}
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
          {/* The actual book, page by page — this renders the real PDF, so it
              cannot drift from what downloads. It replaced a single-sheet
              artboard that showed something different from the file entirely:
              you saw one sheet and got a multi-page book, with nothing in the
              app able to tell you that. */}
          <div className="deliver-pack-preview">
            <Suspense fallback={<div className="panel-hint">Loading…</div>}>
              <BrandBookPreview
                pack={packSnap}
                book={bookSetup}
                hideWatermark={hidePackWatermark}
              />
            </Suspense>
          </div>
        </section>
      </div>

          </div>
  )
}
