/**
 * Explicit production of a business-card APPLICATION artifact.
 *
 * Reuses StationeryKit's card face + elementToPdf (same engine, same geometry).
 * Writes real PDF bytes into packageAssets — never into touchpointApps.check.
 *
 * Mock accepted / colour sample are separate and do not trigger this.
 */
import { useMemo, useRef, useState } from 'react'
import {
  fontFamilyFromLabel,
  mapPaletteRoles,
  normalizeHex,
  bestTextOn,
} from '../../lib/color'
import { elementToPdf, PAGE_SIZES } from '../../lib/book/stationery'
import {
  blobToDataUrl,
  businessCardAssetName,
  findProducedBusinessCard,
  projectHasProducedBusinessCard,
} from '../../lib/brand/businessCardArtifact'
/* Same face styles StationeryKit uses — one visual system, one generator. */
import '../../styles/lazy-design.css'

export default function BusinessCardProduce({
  project = {},
  palette = [],
  addPackageAsset,
  updatePackageAsset,
  flashMicro,
  setActiveView,
}) {
  const cardRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const roles = mapPaletteRoles(
    Array.isArray(palette) && palette.length ? palette : project.palette || []
  )
  const cover =
    normalizeHex(project.colorRoles?.cover) || roles.cover || '#1A1A1A'
  const accent =
    normalizeHex(project.colorRoles?.accent) || roles.accent || '#606060'
  const headingFont = fontFamilyFromLabel(project.typeHeading)
  const bodyFont = fontFamilyFromLabel(project.typeBody)
  const orgName =
    String(project.logoWordmark || project.name || 'Brand').trim() || 'Brand'

  const contacts = Array.isArray(project.contacts) ? project.contacts : []
  const activeContact = contacts[0] || null
  const hasContact = !!activeContact

  const produced = useMemo(
    () => projectHasProducedBusinessCard(project),
    [project]
  )
  const producedRow = useMemo(
    () => findProducedBusinessCard(project.packageAssets),
    [project.packageAssets]
  )

  const runProduce = async () => {
    if (!hasContact) {
      flashMicro?.('Add a contact on Delivery · Stationery first')
      return
    }
    if (!cardRef.current) {
      flashMicro?.('Could not render the card')
      return
    }
    setBusy(true)
    try {
      const result = await elementToPdf(cardRef.current, {
        ...PAGE_SIZES.businessCard,
        filename: `${activeContact?.name || orgName}-business-card.pdf`,
        returnBlobOnly: true,
      })
      if (!result?.ok || !result.blob) {
        flashMicro?.(result?.error || 'Could not produce business card')
        return
      }
      const dataUrl = await blobToDataUrl(result.blob)
      if (!/^data:application\/pdf/i.test(dataUrl)) {
        flashMicro?.('Produced file was not a PDF')
        return
      }
      const name = businessCardAssetName({
        orgName,
        contactName: activeContact?.name,
      })
      const existing = findProducedBusinessCard(project.packageAssets)
      if (existing?.id && updatePackageAsset) {
        updatePackageAsset(existing.id, {
          name,
          dataUrl,
          group: 'application',
          item: 'businessCard',
          deliverable: 'businessCard',
          rights: 'clientOwned',
          heldBack: '',
          sizeBytes: result.blob.size || 0,
        })
      } else {
        addPackageAsset?.({
          name,
          dataUrl,
          group: 'application',
          item: 'businessCard',
          deliverable: 'businessCard',
          rights: 'clientOwned',
          sizeBytes: result.blob.size || 0,
        })
      }
      flashMicro?.(
        produced ? 'Business card re-produced' : 'Business card produced'
      )
    } catch (err) {
      flashMicro?.(err?.message || 'Could not produce business card')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tp-produce" data-testid="business-card-produce">
      <p
        className={`tp-produce-status${produced ? ' is-produced' : ''}`}
        role="status"
        data-testid="business-card-produce-status"
      >
        {produced
          ? 'Application produced — real PDF in client package'
          : 'Application not produced yet — mock only'}
      </p>

      {/* Live face for capture: same stationery-card-face StationeryKit uses.
          Kept in layout (not display:none) so html2canvas gets real metrics. */}
      <div className="tp-produce-stage" aria-hidden="true">
        {hasContact ? (
          <div
            ref={cardRef}
            className="stationery-card-face"
            data-testid="business-card-produce-face"
            style={{
              background: cover,
              color: bestTextOn(cover),
              fontFamily: bodyFont,
            }}
          >
            <div
              style={{ fontFamily: headingFont }}
              className="stationery-card-name"
              data-placeholder={activeContact?.name ? undefined : 'true'}
            >
              {activeContact?.name || 'Name'}
            </div>
            <div
              className="stationery-card-title"
              data-placeholder={activeContact?.title ? undefined : 'true'}
            >
              {activeContact?.title || 'Title'}
            </div>
            <div className="stationery-card-contact">
              {[activeContact?.phone, activeContact?.email]
                .filter(Boolean)
                .join('  ·  ')}
            </div>
            <div className="stationery-card-org" style={{ color: accent }}>
              {orgName}
            </div>
          </div>
        ) : (
          <p className="tp-produce-need">
            Add a contact under Delivery → Stationery, then produce here. The
            card uses your committed Identity (colour, type, wordmark) plus
            that contact — no invented fields.
          </p>
        )}
      </div>

      <div className="tp-produce-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          data-testid="business-card-produce-btn"
          disabled={busy || !hasContact}
          onClick={runProduce}
        >
          {busy
            ? 'Producing…'
            : produced
              ? 'Re-produce this application'
              : 'Produce this application'}
        </button>
        {produced && (
          <button
            type="button"
            className="text-link"
            data-testid="business-card-open-package"
            onClick={() => setActiveView?.('finish')}
          >
            Open in Delivery · client package
          </button>
        )}
      </div>
      {producedRow?.name ? (
        <p className="tp-produce-filed" data-testid="business-card-filed-name">
          Filed as {producedRow.name}
        </p>
      ) : null}
    </div>
  )
}
