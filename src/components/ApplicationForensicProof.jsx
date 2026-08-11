/**
 * Forensic proofing surface for Touchpoints Application Stage.
 *
 * Uses the existing ApplicationCheck engine only:
 *   sampleFileColours → sample stored in touchpointApps[id].check
 *   applicationColourReading recomputed against current Identity palette
 *
 * Does NOT store the artwork. Does NOT write Identity. Does NOT check the
 * schematic specimen. Does NOT create package truth.
 */
import { useMemo, useRef, useState } from 'react'
import { sampleFileColours, CHECKABLE_TYPES } from '../lib/brand/checkFile'
import {
  applicationColourLine,
  applicationColourReading,
  CHECK_SCOPE_NOTE,
} from '../lib/brand/applicationCheck'
import {
  producedAssetsForSurface,
  primaryProducedAsset,
} from '../lib/brand/applicationPackageAssets'
import { mapPaletteRoles, normalizeHex } from '../lib/color'
import { touchpointLabel } from '../lib/journey/touchpoints'

/**
 * data URL package asset → File for the existing sampler.
 * Prefer direct base64 decode — fetch(dataUrl) is unreliable for large PDFs
 * in some browsers and can hang without surfacing a sample.
 * @param {object} asset
 * @returns {File|null}
 */
function fileFromPackageAsset(asset) {
  const url = String(asset?.dataUrl || '')
  if (!url || !/^data:/i.test(url)) return null
  const name = String(asset.name || 'application').trim() || 'application'
  const comma = url.indexOf(',')
  if (comma < 0) return null
  const meta = url.slice(0, comma)
  const payload = url.slice(comma + 1)
  const mimeMatch = /data:([^;]+)/i.exec(meta)
  const type =
    (mimeMatch && mimeMatch[1]) ||
    (meta.includes('pdf')
      ? 'application/pdf'
      : meta.includes('png')
        ? 'image/png'
        : 'application/octet-stream')
  try {
    const isBase64 = /;base64/i.test(meta)
    let bytes
    if (isBase64) {
      const bin = atob(payload)
      bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(payload))
    }
    return new File([bytes], name, { type })
  } catch {
    return null
  }
}

/**
 * @param {object} props
 * @param {string} props.surfaceId
 * @param {object} [props.project]
 * @param {string[]} [props.palette]
 * @param {object|null} [props.check] touchpointApps[id].check sample
 * @param {(hex: string) => string|null} [props.labelFor]
 * @param {(sample: object) => void} [props.onChecked]
 * @param {() => void} [props.onClear]
 * @param {function} [props.flashMicro]
 */
export default function ApplicationForensicProof({
  surfaceId,
  project = {},
  palette = [],
  check = null,
  labelFor,
  onChecked,
  onClear,
  flashMicro,
}) {
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const label = touchpointLabel(surfaceId).toLowerCase()
  const produced = producedAssetsForSurface(project, surfaceId)
  const primary = primaryProducedAsset(project, surfaceId)
  const hasProduced = produced.length > 0

  const reading = useMemo(
    () =>
      check
        ? applicationColourReading({ sample: check, palette, labelFor })
        : null,
    [check, palette, labelFor]
  )
  const { line } = reading ? applicationColourLine(reading) : { line: '' }

  const roles = mapPaletteRoles(
    Array.isArray(palette) && palette.length ? palette : project.palette || []
  )
  const compareHexes = [
    normalizeHex(project.colorRoles?.cover) || roles.cover,
    normalizeHex(project.colorRoles?.accent) || roles.accent,
    normalizeHex(project.colorRoles?.text) || roles.text,
  ].filter(Boolean)

  const presentSwatches = (reading?.present || []).slice(0, 5)
  const intruderSwatches = (reading?.intruders || []).slice(0, 5)

  const runSample = async (file, sourceLabel) => {
    if (!file) return
    setBusy(true)
    try {
      const sample = await sampleFileColours(file)
      onChecked?.({
        colours: sample.colours || [],
        readable: !!sample.readable,
        reason: sample.reason,
        pages: sample.pages,
        fileName: file.name || sourceLabel || '',
        at: new Date().toISOString(),
        source: sourceLabel || 'upload',
      })
      flashMicro?.(
        sample.readable
          ? `${touchpointLabel(surfaceId)} · colour sample`
          : `${touchpointLabel(surfaceId)} · sample unreadable`
      )
    } catch {
      onChecked?.({
        colours: [],
        readable: false,
        reason: 'decode-failed',
        fileName: file.name || sourceLabel || '',
        at: new Date().toISOString(),
        source: sourceLabel || 'upload',
      })
      flashMicro?.(`${touchpointLabel(surfaceId)} · sample failed`)
    } finally {
      setBusy(false)
    }
  }

  const sampleProduced = async () => {
    if (!primary) {
      flashMicro?.('No produced file to sample')
      return
    }
    const file = fileFromPackageAsset(primary)
    if (!file) {
      flashMicro?.('Could not open the produced file for sampling')
      return
    }
    await runSample(file, primary.name || 'produced file')
  }

  return (
    <aside
      className={`app-stage-forensic${check ? ' has-sample' : ''}${hasProduced ? ' has-produced' : ''}`}
      data-testid="forensic-proof"
      data-surface={surfaceId}
      data-has-sample={check ? 'true' : 'false'}
      data-has-produced={hasProduced ? 'true' : 'false'}
      aria-label="Forensic colour proof"
    >
      <div className="app-stage-forensic-head">
        <p className="app-stage-forensic-kicker">Forensic proof</p>
        <p className="app-stage-forensic-lede">
          Sample a real file — never the schematic specimen. Reading only;
          artwork is not stored. Not mock acceptance. Not package verification.
        </p>
      </div>

      {/* What we compare against — Identity, read-only */}
      <div className="app-stage-forensic-against" aria-label="Compared against Identity">
        <span className="app-stage-forensic-meta">Compared against Identity</span>
        <div className="app-stage-forensic-roles" aria-hidden="true">
          {compareHexes.map((hex) => (
            <span
              key={hex}
              className="app-stage-forensic-role"
              style={{ background: hex }}
              title={hex}
            />
          ))}
        </div>
      </div>

      {/* What can be checked */}
      <div className="app-stage-forensic-source">
        {hasProduced ? (
          <p className="app-stage-forensic-source-line">
            Real file available:{' '}
            <strong>{primary?.name || 'produced application'}</strong>
          </p>
        ) : (
          <p className="app-stage-forensic-source-line is-muted">
            No produced package file for this surface yet — drop an external
            export if you have one. The schematic mock above is not sampleable
            as proof.
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={CHECKABLE_TYPES}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          runSample(file, 'upload')
        }}
      />

      {!busy && (
        <div className="app-stage-forensic-actions">
          {hasProduced ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              data-testid="forensic-sample-produced"
              onClick={sampleProduced}
            >
              Sample the produced file
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            data-testid="forensic-sample-upload"
            onClick={() => inputRef.current?.click()}
          >
            {hasProduced ? 'Sample another file' : 'Sample colours from a file'}
          </button>
          {check && onClear ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              data-testid="forensic-clear"
              onClick={() => {
                onClear()
                flashMicro?.(`${touchpointLabel(surfaceId)} · sample cleared`)
              }}
            >
              Clear sample
            </button>
          ) : null}
        </div>
      )}

      {busy && (
        <p className="app-stage-forensic-status" role="status">
          Reading {label}…
        </p>
      )}

      {check && !busy && (
        <div className="app-stage-forensic-result" role="status">
          <p className="app-stage-forensic-finding">{line}</p>
          <p className="app-stage-forensic-scope">{CHECK_SCOPE_NOTE}</p>

          {(presentSwatches.length > 0 || intruderSwatches.length > 0) && (
            <div className="app-stage-forensic-swatch-block">
              {presentSwatches.length > 0 && (
                <div className="app-stage-forensic-swatch-row">
                  <span className="app-stage-forensic-meta">Seen in palette</span>
                  <div className="app-stage-forensic-swatches" aria-hidden="true">
                    {presentSwatches.map((c) => (
                      <span
                        key={`p-${c.hex}`}
                        className="app-stage-forensic-swatch is-present"
                        style={{ background: c.hex }}
                        title={c.label ? `${c.label} ${c.hex}` : c.hex}
                      />
                    ))}
                  </div>
                </div>
              )}
              {intruderSwatches.length > 0 && (
                <div className="app-stage-forensic-swatch-row">
                  <span className="app-stage-forensic-meta">Away from palette</span>
                  <div className="app-stage-forensic-swatches" aria-hidden="true">
                    {intruderSwatches.map((c) => (
                      <span
                        key={`i-${c.hex}`}
                        className="app-stage-forensic-swatch is-intruder"
                        style={{ background: c.hex }}
                        title={
                          c.nearestHex
                            ? `${c.hex} → nearest ${c.nearestHex}`
                            : c.hex
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="app-stage-forensic-file">
            Sampled: {check.fileName || 'file'}
            {check.pages > 1 ? ` · ${check.pages} pages` : ''}
            {check.at
              ? ` · ${new Date(check.at).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}`
              : ''}
          </p>
          <p className="app-stage-forensic-boundary">
            Reading only — not stored artwork · not mock acceptance · not
            package verification
          </p>
        </div>
      )}
    </aside>
  )
}
