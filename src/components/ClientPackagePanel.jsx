/**
 * The client package, shown before it is built.
 *
 * Three things a designer cannot check inside a zip they have already sent:
 * what folders it contains, whether the client is getting everything they
 * bought, and what was held back on rights. All three are on screen here,
 * before the download, which is the only moment any of them can be fixed.
 *
 * The panel never blocks the download. A gap is a statement, not a gate —
 * the same rule the brand check follows.
 */
import { useMemo, useRef, useState } from 'react'
import useAppStore from '../store/useAppStore'
import {
  attachableDeliverables,
  deliverableChecklist,
  packagePlan,
  USAGE_RIGHTS,
  fontInformation,
} from '../lib/deliver/packagePlan'

/** Big enough for a print-ready card, small enough to survive localStorage. */
const MAX_ASSET_BYTES = 4 * 1024 * 1024

/**
 * A file's own picture, where the browser can already draw it.
 *
 * The whole point is recognition rather than recall: a package once shipped
 * three files belonging to a different client, and the panel showed them as
 * three monospaced filenames identical in weight to the legitimate rows. The
 * designer would have had to REMEMBER what they uploaded to spot the odd one.
 * The intruders were red and purple; the brand was deep green. A thumbnail
 * ends that comparison in a glance and costs the designer no decision, no
 * click and no reading.
 *
 * PDFs cannot be drawn without a renderer, so they get their type instead of a
 * fake preview — an honest 'PDF' beats a generic document glyph that implies
 * the app looked inside and found it fine.
 */
function assetThumb(dataUrl = '') {
  const m = /^data:([^;,]+)[;,]/.exec(String(dataUrl || ''))
  const mime = m ? m[1].toLowerCase() : ''
  if (mime.startsWith('image/')) return { src: dataUrl, kind: '' }
  const sub = mime.split('/')[1] || ''
  return { src: '', kind: (sub.split(/[-+]/).pop() || 'file').toUpperCase().slice(0, 4) }
}

export default function ClientPackagePanel({
  pack = {},
  onExport,
  exportBusy = false,
  flashToast,
}) {
  const assets = useMemo(
    () => (Array.isArray(pack.packageAssets) ? pack.packageAssets : []),
    [pack.packageAssets]
  )
  const addPackageAsset = useAppStore((s) => s.addPackageAsset)
  const updatePackageAsset = useAppStore((s) => s.updatePackageAsset)
  const removePackageAsset = useAppStore((s) => s.removePackageAsset)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const fileRef = useRef(null)
  const [reading, setReading] = useState(false)

  const plan = useMemo(() => packagePlan(pack, { assets }), [pack, assets])
  const checklist = useMemo(
    () => deliverableChecklist(pack, plan),
    [pack, plan]
  )
  const fonts = fontInformation(pack)
  const shortfall = checklist.filter((r) => !r.ok)
  const attachable = useMemo(() => attachableDeliverables(pack), [pack])

  const onPick = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setReading(true)
    for (const file of files) {
      if (file.size > MAX_ASSET_BYTES) {
        /* Recorded, not dropped.
           This was a `continue` and a toast. The file was never added, so it
           could not appear in the panel, the plan, `missing`, the README or
           the zip — and the only notice was one transient message that
           `toastMode: 'quiet'` is entitled to swallow. A designer adds a 6MB
           press-ready card, sees nothing, and finds out when the client asks
           where it is. Deliverables out of Illustrator and InDesign are
           routinely over 4MB, so this is the common path, not the edge.

           The row carries no data URL and is held back by the same machinery
           that holds back a third-party asset, so it is named in the panel and
           in the client's README instead of vanishing. */
        addPackageAsset({
          name: file.name.replace(/\.[^.]+$/, ''),
          dataUrl: '',
          heldBack: 'tooLarge',
          sizeBytes: file.size,
        })
        flashToast?.(
          `${file.name} is over 4MB — listed as held back; add it to the folder by hand`,
          { important: true }
        )
        continue
      }
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(String(r.result || ''))
          r.onerror = () => reject(r.error)
          r.readAsDataURL(file)
        })
        addPackageAsset({ name: file.name.replace(/\.[^.]+$/, ''), dataUrl })
      } catch {
        flashToast?.(`Could not read ${file.name}`)
      }
    }
    setReading(false)
  }

  return (
    <section className="panel brand-section package-panel" aria-label="Files included">
      <div className="brand-section-label">
        Files included
        <span className="package-count">
          {` · ${plan.fileCount} file${plan.fileCount === 1 ? '' : 's'} · ${plan.folders.length} folder${plan.folders.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* The tree, exactly as it will be written. */}
      <ul className="package-tree">
        {plan.folders.map((f) => (
          <li key={f.id} className="package-folder">
            <span className="package-folder-name">{f.name}/</span>
            <ul className="package-files">
              {f.files.map((file) => (
                <li key={file.name} className="package-file">
                  <span className="package-file-name">{file.name}</span>
                  <span className="package-file-note">{file.note}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {plan.excluded.length > 0 && (
        <div className="package-held" role="status">
          <div className="package-subhead">Held back</div>
          <ul className="package-held-list">
            {plan.excluded.map((x) => (
              <li key={x.name}>
                <strong>{x.name}</strong> — {x.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {checklist.length > 0 && (
        <div className="package-checklist">
          {/* Named, never counted. "3 of 8 bought items not in the package
              yet" is a grade — it reads as a score, and it withholds the one
              thing that would resolve the worry it creates, so the designer
              has to read the list anyway to learn WHICH three. Three nouns are
              three objects a person can act on; a fraction is not. */}
          <div className="package-subhead">
            {shortfall.length === 0
              ? 'Everything the brief asked for is in here'
              : `Not in the package yet: ${shortfall.map((r) => r.label.toLowerCase()).join(', ')}`}
          </div>
          <ul className="package-check-list">
            {checklist.map((row) => (
              <li key={row.id} className={row.ok ? 'is-ok' : ''}>
                <span className="package-tick" aria-hidden="true">
                  {row.ok ? '✓' : '·'}
                </span>
                <span className="package-check-label">{row.label}</span>
                {!row.ok && (
                  <span className="package-check-missing">{row.missing}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fonts: documented by default, files only when the licence allows. */}
      <div className="package-fonts">
        <div className="package-subhead">Fonts</div>
        <p className="panel-hint">
          {fonts.filesIncluded
            ? 'Font files will be included. Only do this when the license lets you pass them on.'
            : 'The faces are documented — files are not copied into the package.'}
        </p>
        <div className="field-block">
          <label className="field-label" htmlFor="package-font-source">
            Where the client buys or downloads them
          </label>
          <input
            id="package-font-source"
            type="text"
            className="field-input"
            value={pack.typeSource || ''}
            onChange={(e) => updateBrandField('typeSource', e.target.value)}
            placeholder="Google Fonts, a foundry, a purchase link"
          />
        </div>
        <div className="field-block">
          <label className="field-label" htmlFor="package-font-licence">
            What the license says
          </label>
          <input
            id="package-font-licence"
            type="text"
            className="field-input"
            value={pack.typeLicenceNote || ''}
            onChange={(e) => updateBrandField('typeLicenceNote', e.target.value)}
            placeholder="e.g. SIL Open Font License, or 1 desktop seat"
          />
        </div>
        <label className="package-licence-check">
          <input
            type="checkbox"
            checked={pack.fontFilesLicensed === true}
            onChange={(e) =>
              updateBrandField('fontFilesLicensed', e.target.checked)
            }
          />
          The license lets me hand the font files over
        </label>
      </div>

      {/* Work made elsewhere. */}
      <div className="package-assets">
        <div className="package-subhead">Files you made elsewhere</div>
        {assets.length > 0 ? (
          <ul className="package-asset-list">
            {assets.map((a) => {
              const thumb = assetThumb(a.dataUrl)
              return (
                <li key={a.id} className="package-asset">
                  {a.heldBack ? null : thumb.src ? (
                    <img
                      className="package-asset-thumb"
                      src={thumb.src}
                      alt=""
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="package-asset-thumb is-type" aria-hidden="true">
                      {thumb.kind}
                    </span>
                  )}
                  <span className="package-asset-name">
                    {a.name}
                    {a.heldBack === 'tooLarge' && (
                      /* The row exists so this file is not forgotten; it carries
                         no data, so a usage-rights choice would be theatre. */
                      <span className="package-asset-note">
                        {' '}
                        — too large to store
                        {a.sizeBytes
                          ? ` (${(a.sizeBytes / 1024 / 1024).toFixed(1)}MB)`
                          : ''}
                        , add it to the folder by hand
                      </span>
                    )}
                  </span>
                  {/* Which bought item this file is. A matching question —
                      "which of these is this file?" — not an audit: it is
                      answerable from the thumbnail beside it, and it is what
                      stops one upload from ticking every item at once. Shown
                      only when the brief bought something the app cannot make
                      itself, so it never appears with nothing to offer. */}
                  {attachable.length > 0 && !a.heldBack && (
                    <>
                      <label className="sr-only" htmlFor={`deliverable-${a.id}`}>
                        Which bought item {a.name} is
                      </label>
                      <select
                        id={`deliverable-${a.id}`}
                        className="field-input package-deliverable"
                        value={a.deliverable || ''}
                        onChange={(e) =>
                          updatePackageAsset(a.id, { deliverable: e.target.value })
                        }
                      >
                        <option value="">Which item is this?</option>
                        {attachable.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <label className="sr-only" htmlFor={`rights-${a.id}`}>
                    Usage rights for {a.name}
                  </label>
                  <select
                    id={`rights-${a.id}`}
                    className="field-input package-rights"
                    value={a.rights || 'clientOwned'}
                    disabled={!!a.heldBack}
                    onChange={(e) =>
                      updatePackageAsset(a.id, { rights: e.target.value })
                    }
                  >
                    {USAGE_RIGHTS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removePackageAsset(a.id)}
                  >
            Remove file
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
        {/* Visually hidden, but still a real control in the accessibility
            tree — `sr-only` hides it from sight, not from a screen reader, so
            without a name it announces as an unlabelled file input (axe rates
            this critical). The visible button below is what everyone actually
            presses; this input has to carry its own name regardless. */}
        <input
          ref={fileRef}
          type="file"
          multiple
          className="sr-only"
          aria-label="Upload project asset"
          onChange={onPick}
        />
        <button
          type="button"
          className="btn btn-secondary"
          disabled={reading}
          onClick={() => fileRef.current?.click()}
        >
          {reading ? 'Reading…' : 'Upload asset'}
        </button>
      </div>

      <div className="package-actions">
        {/* The consequence rides on the button, not in a paragraph above it,
            so the outcome and the commit gesture land in the same glance. When
            nothing is held back it says nothing extra and the designer is
            right to just press it — no review step to perform. */}
        <button
          type="button"
          className="btn btn-primary"
          disabled={exportBusy}
          onClick={() => onExport?.('package')}
        >
          {exportBusy
            ? 'Preparing…'
            : plan.excluded.length > 0
          ? `Download brand package · ${plan.excluded.length} excluded`
              : 'Download brand package'}
        </button>
      </div>
    </section>
  )
}
