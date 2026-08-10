/**
 * Explicit production of an email-signature APPLICATION artifact.
 *
 * Reuses StationeryKit's signature face + elementToPng (same engine).
 * Writes real PNG bytes into packageAssets — never into touchpointApps.check.
 *
 * Mock accepted / colour sample are separate and do not trigger this.
 */
import { useMemo, useRef, useState } from 'react'
import {
  fontFamilyFromLabel,
  mapPaletteRoles,
  normalizeHex,
} from '../../lib/color'
import { elementToPng } from '../../lib/book/stationery'
import { effectiveWord } from '../../lib/brand/briefWords'
import {
  blobToDataUrl,
  emailSignatureAssetName,
  findProducedEmailSignature,
  projectHasProducedEmailSignature,
} from '../../lib/brand/emailSignatureArtifact'
/* Same face styles StationeryKit uses — one visual system, one generator. */
import '../../styles/lazy-design.css'

export default function EmailSignatureProduce({
  project = {},
  palette = [],
  addPackageAsset,
  updatePackageAsset,
  flashMicro,
  setActiveView,
}) {
  const sigRef = useRef(null)
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
  /* Same contact line StationeryKit uses — contact when present, else org. */
  const contactBlock = activeContact
    ? [activeContact.name, activeContact.title].filter(Boolean).join(' · ')
    : orgName

  const produced = useMemo(
    () => projectHasProducedEmailSignature(project),
    [project]
  )
  const producedRow = useMemo(
    () => findProducedEmailSignature(project.packageAssets),
    [project.packageAssets]
  )

  const runProduce = async () => {
    if (!sigRef.current) {
      flashMicro?.('Could not render the email signature')
      return
    }
    setBusy(true)
    try {
      const result = await elementToPng(sigRef.current, {
        filename: `${activeContact?.name || orgName}-email-signature.png`,
        returnBlobOnly: true,
      })
      if (!result?.ok || !result.blob) {
        flashMicro?.(result?.error || 'Could not produce email signature')
        return
      }
      const dataUrl = await blobToDataUrl(result.blob)
      if (!/^data:image\/png/i.test(dataUrl)) {
        flashMicro?.('Produced file was not a PNG')
        return
      }
      const name = emailSignatureAssetName({
        orgName,
        contactName: activeContact?.name,
      })
      const existing = findProducedEmailSignature(project.packageAssets)
      const patch = {
        name,
        dataUrl,
        group: 'application',
        item: 'emailSignature',
        deliverable: 'emailSignature',
        rights: 'clientOwned',
        heldBack: '',
        sizeBytes: result.blob.size || 0,
      }
      if (existing?.id && updatePackageAsset) {
        updatePackageAsset(existing.id, patch)
      } else {
        addPackageAsset?.(patch)
      }
      flashMicro?.(
        produced ? 'Email signature re-produced' : 'Email signature produced'
      )
    } catch (err) {
      flashMicro?.(err?.message || 'Could not produce email signature')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tp-produce" data-testid="email-signature-produce">
      <p
        className={`tp-produce-status${produced ? ' is-produced' : ''}`}
        role="status"
        data-testid="email-signature-produce-status"
      >
        {produced
          ? 'Application produced — real PNG in client package'
          : 'Application not produced yet — mock only'}
      </p>

      {/* Live face for capture: same stationery-signature StationeryKit uses. */}
      <div className="tp-produce-stage" aria-hidden="true">
        <div
          ref={sigRef}
          className="stationery-signature"
          data-testid="email-signature-produce-face"
          style={{ fontFamily: bodyFont }}
        >
          <div
            style={{ fontFamily: headingFont, color: cover }}
            className="stationery-sig-name"
          >
            {contactBlock}
          </div>
          <div className="stationery-sig-org" style={{ color: accent }}>
            {orgName}
          </div>
          <div className="stationery-sig-contact">
            {[
              effectiveWord(project, 'orgPhone').value,
              effectiveWord(project, 'orgEmail').value,
              project.orgWebsite,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </div>
        </div>
      </div>

      <div className="tp-produce-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          data-testid="email-signature-produce-btn"
          disabled={busy}
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
            data-testid="email-signature-open-package"
            onClick={() => setActiveView?.('finish')}
          >
            Open in Delivery · client package
          </button>
        )}
      </div>
      {producedRow?.name ? (
        <p className="tp-produce-filed" data-testid="email-signature-filed-name">
          Filed as {producedRow.name}
        </p>
      ) : null}
    </div>
  )
}
