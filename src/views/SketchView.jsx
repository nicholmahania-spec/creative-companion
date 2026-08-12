/**
 * Touchpoints — Application Stage / Prop Table (Phase 5).
 *
 * Steps 1–6: proofing column (specimen → honesty → tray → forensic).
 * Step 7: immersive portal workroom — same isolation pattern as
 * Directions/Identity. Engine ownership unchanged.
 */
import { useEffect, useState } from 'react'
import Workroom from '../components/Workroom'
import { labelForStepId } from '../lib/journey/journey'
import useAppStore from '../store/useAppStore'
import TouchpointMockThumb from '../components/TouchpointMockThumb'
import ApplicationSpecimen from '../components/ApplicationSpecimen'
import ApplicationOutputTray from '../components/ApplicationOutputTray'
import ApplicationForensicProof from '../components/ApplicationForensicProof'
import ApplicationCheck from '../features/brand/ApplicationCheck'
import BusinessCardProduce from '../features/brand/BusinessCardProduce'
import EmailSignatureProduce from '../features/brand/EmailSignatureProduce'
import {
  BRAND_ROLE_KEYS,
  BRAND_ROLE_LABELS,
  paletteIsUntouched,
} from '../lib/color'
import {
  touchpointsFor,
  allBrandSurfaces,
  touchpointLabel,
  touchpointCheckHint,
} from '../lib/journey/touchpoints'
import { projectHasProducedBusinessCard } from '../lib/brand/businessCardArtifact'
import { projectHasProducedEmailSignature } from '../lib/brand/emailSignatureArtifact'
import '../styles/lazy-sketch.css'

/**
 * UI-only memory of the last active surface per project across workroom
 * remounts. Not store state, not package truth, not Identity.
 * @type {Map<string, string>}
 */
const lastActiveSurfaceByProject = new Map()

/** One-tap surfaces, so a thin brief is not stuck bouncing back to Strategy. */
const QUICK_SURFACES = [
  { id: 'website', label: 'Website' },
  { id: 'social', label: 'Social' },
  { id: 'print', label: 'Print' },
  { id: 'app', label: 'App' },
  { id: 'email', label: 'Email' },
  { id: 'signage', label: 'Signage' },
]

/** Title Case for a surface id ('website' → 'Website'). */
const surfaceLabel = (id) =>
  String(id || '').replace(/^./, (c) => c.toUpperCase())

/** 'a', 'a and b', 'a, b and c' — no digits, by design (see below). */
function joinWords(list) {
  if (list.length <= 1) return list[0] || ''
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

/**
 * Touchpoints status as words about what is RECORDED — never path completion,
 * never "checked" for a note, never "1 of 3".
 *
 * A surface has evidence when it holds any of: mock accepted (`done`), a note,
 * or a colour-sample object (`check`). Those are discrete facts, not a claim
 * that the application is finished, approved, or delivered.
 *
 * ARTIFACT HONESTY: this line must not say "checked", "complete", or "enough
 * for the path". The system only knows optional designer evidence on mocks.
 */
export function touchpointsStatusLine({
  hasBriefSurfaces = false,
  apps = [],
  proofs = {},
} = {}) {
  const list = Array.isArray(apps) ? apps.filter(Boolean) : []
  if (!list.length) return hasBriefSurfaces ? 'No mocks yet' : 'No surfaces yet'

  const withEvidence = list.filter((id) => {
    const proof = proofs?.[id]
    if (!proof) return false
    return (
      proof.done === true ||
      String(proof.note || '').trim().length > 0 ||
      !!(proof.check && typeof proof.check === 'object')
    )
  })

  if (!withEvidence.length) return 'Nothing recorded yet'
  if (withEvidence.length === list.length) return 'Evidence on every surface'
  return `Evidence on ${joinWords(withEvidence.map(surfaceLabel))}`
}

export default function SketchView(props) {
  const {
    navDir = 'none',
    journeyNext = null,
    activeProject = null,
    projectPalette = [],
    setActiveView,
    applicationWorkroomLauncherRef,
    pathCtx = null,
    flashMicro,
    offerUndo,
  } = props

  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const addPackageAsset = useAppStore((s) => s.addPackageAsset)
  const updatePackageAsset = useAppStore((s) => s.updatePackageAsset)
  const businessCardProduced = projectHasProducedBusinessCard(activeProject)
  const emailSignatureProduced = projectHasProducedEmailSignature(activeProject)

  /* Brief surfaces ∪ designer additions — never rewrites detective.brandSurfaces. */
  const touchpointSurfaces = allBrandSurfaces(activeProject)
  const touchpointDeliverables = activeProject?.detective?.deliverablesPicked
  const touchpointApps = touchpointsFor(
    touchpointSurfaces,
    touchpointDeliverables
  )
  const touchpointProofs = activeProject?.touchpointApps || {}
  const hasBriefSurfaces =
    (Array.isArray(touchpointSurfaces) && touchpointSurfaces.length > 0) ||
    (Array.isArray(touchpointDeliverables) &&
      touchpointDeliverables.length > 0)
  const statusLine = touchpointsStatusLine({
    hasBriefSurfaces,
    apps: hasBriefSurfaces ? touchpointApps : [],
    proofs: touchpointProofs,
  })

  const projectKey = activeProject?.id || ''


  /* UI-only active surface. Navigation does not write identity or proofs.
     Remembered across workroom remounts so reopen keeps the same surface. */
  const [activeSurfaceId, setActiveSurfaceId] = useState(() => {
    if (!projectKey) return null
    const remembered = lastActiveSurfaceByProject.get(projectKey)
    return remembered || null
  })
  const appsKey = touchpointApps.join('|')
  useEffect(() => {
    if (!touchpointApps.length) {
      setActiveSurfaceId(null)
      return
    }
    setActiveSurfaceId((prev) => {
      let next = prev
      if (!(prev && touchpointApps.includes(prev))) {
        const remembered = projectKey
          ? lastActiveSurfaceByProject.get(projectKey)
          : null
        next =
          remembered && touchpointApps.includes(remembered)
            ? remembered
            : touchpointApps[0]
      }
      if (projectKey && next) lastActiveSurfaceByProject.set(projectKey, next)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- appsKey is the list signature
  }, [appsKey, projectKey])

  const selectSurface = (id) => {
    setActiveSurfaceId(id)
    if (projectKey && id) lastActiveSurfaceByProject.set(projectKey, id)
  }

  const specimenPalette =
    Array.isArray(projectPalette) && projectPalette.length
      ? projectPalette
      : activeProject?.palette || []

  /* Reads CURRENT row from store so rapid edits do not clobber each other. */
  const setTouchpointApp = (id, patch) => {
    const state = useAppStore.getState()
    const projectId = activeProject?.id || state.currentProjectId
    const prev =
      state.projects.find((p) => p.id === projectId)?.touchpointApps || {}
    updateBrandField('touchpointApps', {
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    })
  }

  const checkPalette = (() => {
    const chosen =
      Array.isArray(projectPalette) && projectPalette.length
        ? projectPalette
        : activeProject?.palette || []
    return paletteIsUntouched(chosen) ? [] : chosen
  })()

  const roleLabelForHex = (hex) => {
    const want = String(hex || '').toLowerCase()
    if (!want) return null
    const key = BRAND_ROLE_KEYS.find(
      (k) =>
        String(activeProject?.colorRoles?.[k] || '').toLowerCase() === want
    )
    return key ? BRAND_ROLE_LABELS[key] : null
  }

  /* THE CLIENT'S ANSWER IS NOT THE DESIGNER'S LIST. */
  const addQuickSurface = (id) => {
    if (touchpointSurfaces.includes(id)) {
      flashMicro?.(`${touchpointLabel(id)} · already on the list`)
      /* Focus related mock if it already maps from this surface */
      const nextApps = touchpointsFor(
        allBrandSurfaces({
          ...activeProject,
          designerSurfaces: activeProject?.designerSurfaces,
        }),
        touchpointDeliverables
      )
      if (nextApps.includes(id)) selectSurface(id)
      else if (id === 'print' && nextApps.includes('businessCard')) {
        selectSurface('businessCard')
      }
      return
    }
    const mine = Array.isArray(activeProject?.designerSurfaces)
      ? activeProject.designerSurfaces
      : []
    updateBrandField('designerSurfaces', [...mine, id])
    flashMicro?.(`${touchpointLabel(id)} · added`)
    /* Active surface will resolve via appsKey effect after re-render;
       prefer first new mapping when known. */
    const mapped = touchpointsFor(
      [...touchpointSurfaces, id],
      touchpointDeliverables
    )
    const fresh = mapped.find((t) => !touchpointApps.includes(t))
    if (fresh) selectSurface(fresh)
  }

  return (
    <Workroom
      stepId="sketch"
      project={activeProject}
      pathCtx={pathCtx}
      setActiveView={setActiveView}
      launcherRef={applicationWorkroomLauncherRef}
      className="application-workroom"
      testId="application-workroom"
      status={
        activeSurfaceId
          ? `Working on ${touchpointLabel(activeSurfaceId)}`
          : labelForStepId('sketch')
      }
      /* Touchpoints had NO next-action affordance at all — one of the two
         stops the census found without one. Same journey target the path edge
         offers, in the place every other stop now puts it. */
      ledge={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActiveView?.('brand')}
          >
            Back to {labelForStepId('design')}
          </button>
          <button
            type="button"
            className="btn btn-primary work-path-next"
            onClick={() => setActiveView?.(journeyNext?.view || 'book')}
          >
            {`Next · ${journeyNext?.label || labelForStepId('book')}`}
          </button>
        </>
      }
    >
      <div
        className="flow-view surface-desk view-enter sketch-studio touchpoints-studio application-workroom-body"
        data-testid="touchpoints-stage"
        data-nav-dir={navDir}
      >

      {/* Empty: quiet surface add — not a dashboard */}
      {!hasBriefSurfaces ? (
        <div className="app-stage-empty touchpoints-empty">
          <p className="touchpoints-empty-title">Name where the brand appears</p>
          <p className="touchpoints-empty-sub">
            From the brief when it is filled — or add a surface here. This does
            not rewrite the client&apos;s brief answer.
          </p>
          <div
            className="touchpoints-quick"
            role="group"
            aria-label="Add a surface"
          >
            {QUICK_SURFACES.map((s) => (
              <button
                key={s.id}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => addQuickSurface(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <section
          className="app-stage-proof"
          aria-label="Application proofing table"
        >
          {/* Step 3: filmstrip — navigation ONLY */}
          <nav
            className="app-stage-filmstrip"
            aria-label="Application surfaces"
          >
            <ul className="app-stage-filmstrip-list">
              {touchpointApps.map((id) => {
                const active = id === activeSurfaceId
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`app-stage-film-cell${active ? ' is-active' : ''}`}
                      aria-current={active ? 'true' : undefined}
                      aria-label={touchpointLabel(id)}
                      data-touchpoint={id}
                      data-testid={`filmstrip-${id}`}
                      onClick={() => selectSurface(id)}
                    >
                      <span className="app-stage-film-thumb" aria-hidden="true">
                        <TouchpointMockThumb
                          id={id}
                          project={activeProject || {}}
                          palette={specimenPalette}
                        />
                      </span>
                      <span className="app-stage-film-label">
                        {touchpointLabel(id)}
                      </span>
                    </button>
                  </li>
                )
              })}
              <li className="app-stage-film-add">
                <details className="app-stage-quick-add">
                  <summary className="app-stage-quick-add-summary">
                    + Surface
                  </summary>
                  <div
                    className="touchpoints-quick app-stage-quick-add-panel"
                    role="group"
                    aria-label="Add a surface"
                  >
                    {QUICK_SURFACES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => addQuickSurface(s.id)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </details>
              </li>
            </ul>
          </nav>

          {/* Dominant specimen + mock judgment (Step 4).
              Acceptance is a stamp on the work — not a status panel. */}
          {activeSurfaceId ? (
            <div className="app-stage-field">
              <div className="app-stage-field-head">
                <div>
                  <p className="app-stage-proof-kicker">Proofing table</p>
                  <h2 className="app-stage-proof-title cc-stage-display--subject">
                    {touchpointLabel(activeSurfaceId)}
                  </h2>
                </div>
                <button
                  type="button"
                  className="app-stage-accept-btn"
                  aria-pressed={!!(touchpointProofs[activeSurfaceId] || {}).done}
                  data-testid="mock-accept-btn"
                  onClick={() => {
                    const done = !!(
                      touchpointProofs[activeSurfaceId] || {}
                    ).done
                    setTouchpointApp(activeSurfaceId, { done: !done })
                    flashMicro?.(
                      !done
                        ? `${touchpointLabel(activeSurfaceId)} · mock accepted`
                        : `${touchpointLabel(activeSurfaceId)} · mock open again`
                    )
                  }}
                >
                  {!!(touchpointProofs[activeSurfaceId] || {}).done
                    ? 'Mock is good'
                    : 'This mock is good'}
                </button>
              </div>
              <ApplicationSpecimen
                surfaceId={activeSurfaceId}
                project={activeProject || {}}
                palette={specimenPalette}
                scale="stage"
                accepted={!!(touchpointProofs[activeSurfaceId] || {}).done}
              />
              <p className="sr-only" role="status" aria-live="polite">
                {!!(touchpointProofs[activeSurfaceId] || {}).done
                  ? `Mock accepted for ${touchpointLabel(activeSurfaceId)}. Schematic only — not a produced file.`
                  : `Mock not yet accepted for ${touchpointLabel(activeSurfaceId)}.`}
              </p>

              {/* Step 5 — real production output. Separate from schematic.
                  Uses existing produce → packageAssets writers only. */}
              <ApplicationOutputTray
                surfaceId={activeSurfaceId}
                project={activeProject || {}}
                palette={specimenPalette}
                addPackageAsset={addPackageAsset}
                updatePackageAsset={updatePackageAsset}
                flashMicro={flashMicro}
                setActiveView={setActiveView}
              />

              {/* Step 6 — forensic colour proof. Existing check engine only.
                  Writes touchpointApps[id].check sample — never Identity. */}
              <ApplicationForensicProof
                surfaceId={activeSurfaceId}
                project={activeProject || {}}
                palette={checkPalette}
                check={(touchpointProofs[activeSurfaceId] || {}).check || null}
                labelFor={roleLabelForHex}
                onChecked={(sample) => {
                  setTouchpointApp(activeSurfaceId, { check: sample })
                }}
                onClear={() => {
                  const before = (touchpointProofs[activeSurfaceId] || {})
                    .check
                  setTouchpointApp(activeSurfaceId, { check: null })
                  offerUndo?.('Colour sample cleared', () =>
                    setTouchpointApp(activeSurfaceId, { check: before })
                  )
                }}
                flashMicro={flashMicro}
              />
            </div>
          ) : null}
        </section>
      )}

      {/* Existing engine — collapsed until Steps 4–6 restage accept/make/check.
          Keeps produce + sample + notes reachable without a card-grid stage. */}
      <details className="touchpoints-engine-hold">
        <summary className="touchpoints-engine-hold-summary">
          Recorded evidence · produce · colour sample
          {statusLine ? ` · ${statusLine}` : ''}
        </summary>
        <section className="touchpoints-block" aria-label="Application mocks">
          <div className="touchpoints-head">
            <h2 className="touchpoints-heading">Application mocks</h2>
            <p className="touchpoints-status" role="status">
              {statusLine}
            </p>
          </div>

          {hasBriefSurfaces && touchpointApps.length > 0 ? (
            <ul className="touchpoints-list">
              {touchpointApps.map((id) => {
                const row = touchpointProofs[id] || {}
                const note = row.note || ''
                const done = !!row.done
                const hasCheck = !!(row.check && typeof row.check === 'object')
                const isBusinessCard = id === 'businessCard'
                const isEmail = id === 'email'
                const cardProduced = isBusinessCard && businessCardProduced
                const emailProduced = isEmail && emailSignatureProduced
                const appProduced = cardProduced || emailProduced
                const proofBits = []
                if (done) proofBits.push('Mock accepted')
                if (hasCheck) proofBits.push('Colour sample')
                if (String(note).trim()) proofBits.push('Note')
                if (appProduced) proofBits.push('Application produced')
                return (
                  <li
                    key={id}
                    className={`touchpoints-card${appProduced ? ' is-produced' : ''}`}
                    data-touchpoint={id}
                    data-application-produced={appProduced ? 'true' : 'false'}
                  >
                    <div className="touchpoints-card-layout">
                      <TouchpointMockThumb
                        id={id}
                        project={activeProject}
                        palette={specimenPalette}
                      />
                      <div className="touchpoints-card-body">
                        <div className="touchpoints-card-head">
                          <h3 className="touchpoints-card-title">
                            {touchpointLabel(id)}
                          </h3>
                          <button
                            type="button"
                            className={`btn btn-sm${done ? ' btn-secondary' : ' btn-ghost'}`}
                            aria-pressed={done}
                            onClick={() => {
                              setTouchpointApp(id, { done: !done })
                              flashMicro?.(
                                !done
                                  ? `${touchpointLabel(id)} · mock accepted`
                                  : `${touchpointLabel(id)} · mock open again`
                              )
                            }}
                          >
                            {done ? 'Mock is good' : 'This mock is good'}
                          </button>
                        </div>
                        <p className="touchpoints-proof-line" role="status">
                          {proofBits.length
                            ? proofBits.join(' · ')
                            : 'Nothing recorded yet'}
                        </p>
                        <label
                          className="field-label"
                          htmlFor={`tp-note-${id}`}
                        >
                          How it shows up
                        </label>
                        <textarea
                          id={`tp-note-${id}`}
                          className="field-textarea"
                          rows={2}
                          value={note}
                          onChange={(e) =>
                            setTouchpointApp(id, { note: e.target.value })
                          }
                          placeholder={touchpointCheckHint(id)}
                        />
                        {isBusinessCard ? (
                          <BusinessCardProduce
                            project={activeProject}
                            palette={specimenPalette}
                            addPackageAsset={addPackageAsset}
                            updatePackageAsset={updatePackageAsset}
                            flashMicro={flashMicro}
                            setActiveView={setActiveView}
                          />
                        ) : null}
                        {isEmail ? (
                          <EmailSignatureProduce
                            project={activeProject}
                            palette={specimenPalette}
                            addPackageAsset={addPackageAsset}
                            updatePackageAsset={updatePackageAsset}
                            flashMicro={flashMicro}
                            setActiveView={setActiveView}
                          />
                        ) : null}
                        <ApplicationCheck
                          check={row.check || null}
                          palette={checkPalette}
                          labelFor={roleLabelForHex}
                          label={touchpointLabel(id).toLowerCase()}
                          onChecked={(check) => {
                            setTouchpointApp(id, { check })
                            flashMicro?.(
                              `${touchpointLabel(id)} · colour sample`
                            )
                          }}
                          onClear={() => {
                            const before = row.check
                            setTouchpointApp(id, { check: null })
                            offerUndo?.('Colour sample cleared', () =>
                              setTouchpointApp(id, { check: before })
                            )
                          }}
                        />
                        <p className="touchpoints-asset-line">
                          {appProduced ? (
                            <>
                              Application {cardProduced ? 'PDF' : 'PNG'} is in
                              the{' '}
                              <button
                                type="button"
                                className="text-link"
                                onClick={() => setActiveView?.('finish')}
                              >
                                Delivery · client package
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="text-link"
                                onClick={() => setActiveView?.('assets')}
                              >
                                Upload finished files in Assets
                              </button>
                              {' '}
                              — not linked to this surface yet
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}

          {/* Feedback is READ here if present — Review owns the editor.
              Ownership foundation: one field, one writer. */}
          {activeProject?.feedbackNotes ? (
            <p className="app-stage-feedback-read" role="note">
              Feedback so far is on Review — this stage does not edit it.
            </p>
          ) : null}
        </section>
      </details>
      </div>
    </Workroom>
  )
}
