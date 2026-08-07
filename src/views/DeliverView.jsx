/**
 * Assets — preview + ship the leave-behind.
 * One job: handoff note and one primary download. Setup, stationery,
 * formats, and leave live below as secondary work.
 */
import { Suspense, lazy, useState } from 'react'
import useAppStore from '../store/useAppStore'
import CaseStudyExport from '../components/CaseStudyExport'
import ClientPackagePanel from '../components/ClientPackagePanel'
import { labelForStepId, JOURNEY_STEPS } from '../lib/journey/journey'
import {
  packReadiness,
  packBriefMarkdown,
  creditedFooter,
} from '../lib/book/exportFiles'
import { isLogoOnlyScope } from '../lib/brief/detectiveBrief'
import { focusPathGapTarget } from '../lib/journey/journeyProgress'
import {
  BOOK_PAGE_SIZES,
  BOOK_EDGE_SPACE,
  bookSetupSummary,
} from '../lib/book/brandBookSetup'
import { POMODORO_WORK_MIN } from '../lib/helper/forcedBreak'
import '../styles/lazy-deliver.css'

const BrandBookPreview = lazy(
  () => import('../components/BrandBookPreview')
)
const StationeryKit = lazy(() => import('../components/StationeryKit'))
const DeliverToClient = lazy(
  () => import('../features/client-portal/DeliverToClient')
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
  projectPalette = [],
  studioName = '',
  prefs = {},
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
  offerUndo,
  openPortalPanel,
  // Focus timer props
}) {
  /* Built with the same helper the exports use, so the preview cannot
     drift from what actually prints. */
  const packFooterPreview = creditedFooter([
    activeProject?.name || 'Untitled project',
    studioName,
  ])

  /* The value as typed, not as resolved. `studioName` may have come from the
     invoice identity, and putting an inherited value into the input would show
     the designer editing a field they never filled in. */
  const studioNameRaw = String(prefs?.studioName || '')
  const [creditOpen, setCreditOpen] = useState(!studioName)

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

  /* Named gap beside ship — download never blocked; hollowness must not feel ready. */
  const firstCoreGap = coreGaps[0] || null
  const statusLine = ready.allDone
    ? 'Ready to ship'
    : firstCoreGap
      ? `Still to add · ${firstCoreGap.label}`
      : gaps.length > 0
        ? 'Add a handoff note when you ship'
        : 'Preview the book, then download'
  const moreCoreCount = Math.max(0, coreGaps.length - 1)

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
          </p>
      </div>
      </div>

      {/* Ship ticket first in DOM for mobile; sticky on wide (audit P0). */}
      <section className="assets-ship assets-ship-ticket" aria-label="Ship">
        {firstCoreGap ? (
          <div className="assets-ship-gap" role="status">
            <span className="assets-ship-gap-label">
              Still thin
              {moreCoreCount > 0 ? ` · +${moreCoreCount} more` : ''}
            </span>
            <button
              type="button"
              className="assets-ship-gap-fix"
              onClick={() => jumpGap(firstCoreGap)}
            >
              {`Open · ${firstCoreGap.label}`}
            </button>
          </div>
        ) : (
          <p className="assets-ship-ready" role="status">
            Core pack looks ready — download when you want
          </p>
        )}

        {/* The credit, next to the button that sends it — the only moment it
            is ever visible. It used to live inside the collapsed "Page setup ·
            print size" block below, labelled "Footer credit", where the owner
            of this app never found it and shipped uncredited client work
            without ever being told.

            Two states, one rule: the line that will print is always shown.
            Once there is something to credit this is read-only and Settings
            owns the value, so there is one writer and no drift. While there is
            nothing to credit the field is offered right here — the value is
            visible, the answer is in mind, and sending someone to Settings to
            fix a gap they just spotted is a working-memory carry across two
            screens for two seconds of typing.

            No warning, no badge, no blocking dialog. The gap speaks for
            itself: the designer's name is plainly not in the string. */}
        <div className="deliver-credit">
          <p className="book-setup-state">
            Every page you send says: {packFooterPreview}
          </p>
          {creditOpen ? (
            <>
              <label className="field-label" htmlFor="studio-name">
                Your studio
              </label>
              {/* Held open by state rather than keyed on `studioName`. Keyed on
                  the value, the first character typed makes it truthy, the
                  branch swaps the input for a button mid-keystroke, and focus
                  is lost with one letter saved. It closes on blur instead. */}
              <input
                id="studio-name"
                className="field-input"
                type="text"
                value={studioNameRaw}
                placeholder="Your studio name"
                onChange={(e) => setPref('studioName', e.target.value)}
                onBlur={() => {
                  if (studioNameRaw.trim()) setCreditOpen(false)
                }}
              />
            </>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveView?.('settings')}
            >
              Change in Settings
            </button>
          )}
        </div>

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
            {/* A failed export must offer the way out, next to the button
                that failed. Without this the note states a problem and
                leaves the designer to work out the remedy — and the remedy
                (press the same button and hope) is not discoverable. */}
            {/^Not saved/.test(lastExportNote) ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm pack-export-retry"
                onClick={() => runExport('pdf', { direct: true })}
              >
                Download it now
              </button>
            ) : null}
          </p>
        ) : null}

        {/* The organized handoff — folders, names, rights, and whether the
            client is getting what they bought. Below the one-click download
            on purpose: the fast path stays one press, and the package is
            there when the job is bigger than a PDF. */}
        <ClientPackagePanel
          pack={packSnap}
          onExport={runExport}
          flashToast={flashToast}
        />

        {coreGaps.length > 1 && (
          <div className="deliver-gaps assets-gaps">
            <p className="field-label assets-gaps-label">Also open</p>
            <ul className="pack-ready-list deliver-gap-list">
              {coreGaps.slice(1, 6).map((c) => (
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

      {/* The delivery moment. Sits directly under the ship ticket because it
          is the other half of shipping: the download is the designer's copy,
          this is the client's. */}
      <Suspense fallback={<div className="panel-hint">Loading…</div>}>
        <DeliverToClient
          project={activeProject}
          portalId={activeProject?.clientPortalId || ''}
          pack={packSnap}
          book={bookSetup}
          studio={studioName}
          cloud={CLOUD}
          onOpenPortalPanel={openPortalPanel}
          flashToast={flashToast}
          offerUndo={offerUndo}
        />
      </Suspense>

      {/* Preview — real book; ship ticket stays sticky on wide */}
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
              studio={studioName}
            />
          </Suspense>
        </div>
      </section>

      {/* Secondary — setup, learnings, stationery, formats */}
      <div className="assets-secondary">
        <details className="deliver-advanced" open={false}>
          <summary>Page setup · print size</summary>
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
          <summary>Extras · print, ZIP, backup</summary>
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
