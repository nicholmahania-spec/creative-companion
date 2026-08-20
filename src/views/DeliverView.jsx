/**
 * Assets — preview + ship the leave-behind.
 * One job: handoff note and one primary download. Setup, stationery,
 * formats, and leave live below as secondary work.
 */
import { Suspense, lazy, useState } from 'react'
import useAppStore from '../store/useAppStore'
import CaseStudyExport from '../components/CaseStudyExport'
import ClientPackagePanel from '../components/ClientPackagePanel'
import Workroom from '../components/Workroom'
import { labelForStepId, JOURNEY_STEPS } from '../lib/journey/journey'
import {
  packReadiness,
  packBriefMarkdown,
  creditedFooter,
} from '../lib/book/exportFiles'
import { FIELD_HOMES } from '../lib/book/bookContent'
import { isLogoOnlyScope } from '../lib/brief/detectiveBrief'
import { clientFacingName } from '../lib/client/clientRecord'
import { focusPathGapTarget } from '../lib/journey/journeyProgress'
import {
  deliverStatusLine,
  workingDocumentMarkStatus,
} from '../lib/deliver/deliverStatus'
import {
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
export default function DeliverView({
  navDir = 'none',
  workroomLauncherRef = null,
  activeProject = null,
  projectPalette = [],
  studioName = '',
  prefs = {},
  bookSetup = { pageSize: 'letter', edgeSpace: 'standard', printShop: false },
  setActiveView,
  pathCtx = null,
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
    clientFacingName(activeProject),
    studioName,
  ])

  /* The value as typed, not as resolved. `studioName` may have come from the
     invoice identity, and putting an inherited value into the input would show
     the designer editing a field they never filled in. */
  const studioNameRaw = String(prefs?.studioName || '')
  const [creditOpen, setCreditOpen] = useState(!studioName)

  const updateBrandField = useAppStore((s) => s.updateBrandField)
  /* Page setup is the PROJECT's, not a studio pref. These three controls used
     to write `prefs.book*` while the Brand Book Builder wrote its own
     per-project copy, so the two surfaces could disagree about the trim the
     client would actually receive. Same three controls, one home. */
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
      /* Open the disclosure first. `learnings` is not in `coreGaps`, so no
         current call site reaches this — but a closed <details> hides its
         content from focus entirely, and a gap button that silently does
         nothing is the failure mode this whole screen exists to avoid. */
      document.getElementById('deliver-learned')?.setAttribute('open', '')
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
  const statusLine = deliverStatusLine(ready, firstCoreGap, gaps.length)
  const workingDocumentMark = workingDocumentMarkStatus(packSnap)
  const moreCoreCount = Math.max(0, coreGaps.length - 1)

  return (
    <Workroom
      stepId="deliver"
      project={activeProject}
      pathCtx={pathCtx}
      setActiveView={setActiveView}
      launcherRef={workroomLauncherRef}
      /* `.assets-status` in the masthead already carries this line. Two copies
         of one status on one screen is two facts to reconcile. */
      masthead={
        <>
          <h1 className="cc-stage-display">{labelForStepId('deliver')}</h1>
          <p className="cc-stage-meta assets-status" role="status">
            {statusLine}
            {workingDocumentMark ? ` · ${workingDocumentMark}` : ''}
          </p>
        </>
      }
      ledge={
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setActiveView?.('desk')}
        >
          Back to the desk
        </button>
      }
    >
    <div
      className="finish-view surface-document pack-view deliver-studio assets-studio view-enter"
      data-nav-dir={navDir}
    >
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
        {workingDocumentMark ? (
          <p className="assets-ship-working" role="status">
            {workingDocumentMark}
          </p>
        ) : null}

        {/* THE REST OF THE GAPS, BESIDE THE VERDICT THAT COUNTS THEM.
            "Still thin · +3 more" names the first gap at the top; this is the
            rest of that sentence, and it used to render AFTER the package
            tree — so "what else is missing" sat below the whole file listing,
            several screens from the line that said how many there were. The
            order the screen has to read in is ready → gaps → ship. */}
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

        <div className="path-continue-row deliver-primary-ship">
          <button
            type="button"
            className="btn btn-primary work-path-next"
            onClick={() => runExport(logoOnly ? 'mark' : 'pdf')}
          >
            {logoOnly ? 'Download logo files' : 'Download brand book PDF'}
          </button>
        </div>

        {/* BELOW THE BUTTON IT DESCRIBES, NOT BETWEEN THE VERDICT AND IT.
            This is still the only moment the credit is visible, which is the
            whole reason it was pulled out of the collapsed "Page setup" block,
            and both of its states are unchanged. It simply no longer stands
            between "is this ready" and the control that ships it. */}
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

      </section>

      {/* The delivery moment. Sits directly under the ship ticket because it
          is the other half of shipping: the download is the designer's copy,
          this is the client's. */}
      <Suspense fallback={<div className="panel-hint">Loading…</div>}>
        <DeliverToClient
          project={activeProject}
          portalId={activeProject?.clientPortalId || ''}
          /* The LIVE pack, for the delivered-vs-current diff only. What the
             client receives is built from the frozen Book Version inside
             `send()`; `bookSetup` is deliberately no longer passed, because
             the delivery's page setup now comes from that Version. */
          pack={packSnap}
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
          {/* READ-ONLY. The sheet is the book's decision, proofed against the
              book's own pages, and it had two editors — here and in the
              Builder — writing the one field the store's v10 migration gave a
              single home. Reporting it here and linking to the home is the
              same shape the Builder already uses for facts Identity owns
              (`BookOwnedElsewhere`), and `FIELD_HOMES.pageSize` is where that
              destination is declared rather than restated. */}
          <div className="book-setup" role="group" aria-label="Page setup">
            <p className="book-setup-state">{bookSetupSummary(bookSetup)}</p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveView?.(FIELD_HOMES.pageSize.view)}
            >
              {`Edit in ${FIELD_HOMES.pageSize.label} →`}
            </button>
          </div>
        </details>

        {/* Collapsed, because this file already says it is not required to
            ship: `coreGaps` filters out `handoff` and `learnings` as "ship
            polish". The rule existed and the layout contradicted it — a bare
            always-open textarea sitting at the same weight as the package.
            Same `deliver-advanced` disclosure the four blocks around it use.

            ON THE JUMP-TO-GAP ROUTE: content inside a CLOSED <details> is not
            focusable, so `focusPathGapTarget('#learnings-note')` would land on
            nothing. That is unreachable today — every `jumpGap` call site
            reads `coreGaps`, which filters `learnings` out — so this is a
            latent trap rather than a live bug, and `jumpGap` opens the panel
            before focusing so it stays that way. */}
        <details className="deliver-advanced" id="deliver-learned">
          <summary>Learned</summary>
          <div className="field-block deliver-note-block">
            <label className="field-label sr-only" htmlFor="learnings-note">
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
        </details>

        <CaseStudyExport
          activeProject={activeProject}
          flashToast={flashToast}
        />

        {/* Collapsed. This was the only always-open block left in the
            secondary column and by far the tallest — four contact fields, the
            contacts list, and four preview cards with their own downloads,
            several screens of it, sitting at the same weight as the package
            it comes after. Five of its six siblings were already behind a
            `deliver-advanced` summary; this is the sixth.

            The heading becomes the summary rather than being duplicated by
            it. StationeryKit itself is untouched, its lazy Suspense boundary
            still wraps it, and Address / Phone / Email / Website keep exactly
            the ownership they had — see the note in the PR. */}
        <details className="deliver-advanced assets-stationery">
          <summary>Stationery</summary>
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
        </details>

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

    </div>
    </Workroom>
  )
}
