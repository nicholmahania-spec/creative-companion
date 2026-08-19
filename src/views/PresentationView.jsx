/**
 * Presentation — select and order existing Directions, then send for review.
 * Does not author Identity, Brief, Directions, Book, or Delivery.
 */
import { useMemo } from 'react'
import useAppStore from '../store/useAppStore'
import { labelForStepId, toolsLabelForView } from '../lib/journey/journey'
import { frozenPresentedMarkImage } from '../lib/artifacts/identitySnapshot'
import {
  latestSentPresentationVersion,
} from '../lib/documents/documentModel'
import { presentationBuilderFor } from '../lib/documents/presentationBuilder'
import '../styles/lazy-review.css'

function frozenArtifact(project, ref) {
  if (!ref?.kind || !ref?.id) return null
  const hit = project?.artifacts?.[ref.id] || null
  if (!hit || hit.kind !== ref.kind) return null
  return hit
}

function FrozenPreview({ project, version, snapshot }) {
  if (!version) {
    return <p className="muted">Nothing sent for review yet.</p>
  }
  const items = Array.isArray(version.composition) ? version.composition : []
  if (!items.length) {
    return <p className="muted">This send had no directions.</p>
  }
  return (
    <ol>
      {items.map((item) => {
        const markRef = item.contentRefs?.markConcept
        const markSrc = markRef
          ? frozenPresentedMarkImage(snapshot, markRef.id)
          : ''
        const palette = frozenArtifact(project, item.contentRefs?.palette)
        const type = frozenArtifact(project, item.contentRefs?.typePairing)
        return (
          <li key={item.itemId} className="field-block">
            <strong>{item.label || 'Untitled direction'}</strong>
            {type ? (
              <p>
                {type.heading || '—'} / {type.body || '—'}
              </p>
            ) : null}
            {palette?.hexes?.length ? (
              <span className="dir-slot-swatches" aria-label="Palette">
                {palette.hexes.slice(0, 6).map((hex, i) => (
                  <i key={`${hex}-${i}`} style={{ background: hex }} />
                ))}
              </span>
            ) : null}
            {markRef && markSrc ? (
              <img src={markSrc} alt="" width="96" height="64" />
            ) : markRef ? (
              <p className="muted">Mark not in this send.</p>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

export default function PresentationView({
  navDir = 'none',
  activeProject = null,
  flashToast,
  flashMicro,
}) {
  const addPresentationDirection = useAppStore((s) => s.addPresentationDirection)
  const removePresentationItem = useAppStore((s) => s.removePresentationItem)
  const movePresentationItem = useAppStore((s) => s.movePresentationItem)
  const sendPresentationForReview = useAppStore((s) => s.sendPresentationForReview)

  const directions = useMemo(
    () => (Array.isArray(activeProject?.directions) ? activeProject.directions : []),
    [activeProject]
  )
  const builder = presentationBuilderFor(activeProject)
  const includedIds = new Set(builder.contents.map((row) => row.id))
  const included = builder.contents
    .map((row) => ({
      row,
      dir: directions.find((d) => d.recordId === row.id) || null,
    }))
  const available = directions.filter(
    (d) => d?.recordId && !includedIds.has(d.recordId)
  )

  const presentationDoc = (activeProject?.documents || []).find(
    (d) => d?.kind === 'presentation'
  )
  const version = latestSentPresentationVersion(
    activeProject,
    presentationDoc?.documentId
  )
  const snapshot = (activeProject?.identitySnapshots || []).find(
    (row) => row?.snapshotId === version?.identitySnapshotId
  ) || null

  const send = () => {
    const r = sendPresentationForReview(activeProject?.id)
    if (!r?.ok) {
      flashToast?.(r?.error || 'Select a direction first')
      return
    }
    flashToast?.('Sent for review')
  }

  return (
    <div
      className="review-studio surface-desk view-enter"
      data-nav-dir={navDir}
    >
      <div className="flow-top">
        <h1 className="page-title">{toolsLabelForView('presentation')}</h1>
      </div>

      <div className="review-split">
        <div className="review-edit-column">
          <section className="panel brand-section">
            <div className="brand-section-label">{labelForStepId('ideate')}</div>
            {available.length === 0 && included.length === 0 ? (
              <p className="muted">No directions on this project yet.</p>
            ) : null}
            {available.map((dir) => (
              <div key={dir.recordId} className="field-block">
                <span className="field-label">
                  {dir.title || 'Untitled direction'}
                </span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    addPresentationDirection(dir.recordId)
                    flashMicro?.('Added')
                  }}
                >
                  Include
                </button>
              </div>
            ))}
          </section>

          <section className="panel brand-section">
            <div className="brand-section-label">This send</div>
            {included.length === 0 ? (
              <p className="muted">Include at least one direction.</p>
            ) : null}
            {included.map(({ row, dir }, index) => (
              <div key={row.itemId} className="field-block">
                <span className="field-label">
                  {dir?.title || 'Untitled direction'}
                </span>
                <div>
                  <button
                    type="button"
                    className="btn"
                    disabled={index === 0}
                    onClick={() => movePresentationItem(row.itemId, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={index === included.length - 1}
                    onClick={() => movePresentationItem(row.itemId, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      removePresentationItem(row.itemId)
                      flashMicro?.('Removed')
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-primary"
              onClick={send}
              disabled={!included.length}
            >
              Send for review
            </button>
          </section>
        </div>

        {/* THE SECOND COLUMN OF THE SPLIT, and it has to say so.

            This was `.review-edit-column`, which `lazy-review.css` pins to
            `grid-column: 1; grid-row: 1` — the same cell as the column above
            it. Two static children of one grid cell overlap exactly, so this
            panel was painted on top of the Directions panel and swallowed its
            Include button: the control was visible, enabled, and unclickable,
            which is the worst of the three. A designer could not include a
            direction, so nothing could be sent for review at all.

            `.review-preview-panel` is the class the sheet already defines for
            cell two, and it is what this panel is — the read-only view of what
            was sent, beside the controls rather than under them. Below 860px
            the same sheet stacks it to row 2, which is the behaviour that was
            always intended here. */}
        <div className="review-preview-panel">
          <section className="panel brand-section">
            <div className="brand-section-label">Sent for review</div>
            <FrozenPreview
              project={activeProject}
              version={version}
              snapshot={snapshot}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
