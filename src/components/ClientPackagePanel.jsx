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
  deliverableChecklist,
  packagePlan,
  USAGE_RIGHTS,
  fontInformation,
} from '../lib/deliver/packagePlan'

/** Big enough for a print-ready card, small enough to survive localStorage. */
const MAX_ASSET_BYTES = 4 * 1024 * 1024

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

  const onPick = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setReading(true)
    for (const file of files) {
      if (file.size > MAX_ASSET_BYTES) {
        flashToast?.(
          `${file.name} is over 4MB — add it to the folder by hand after the download`
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
    <section className="panel brand-section package-panel" aria-label="Client package">
      <div className="brand-section-label">
        Client package
        <span className="package-count">
          {` ${plan.fileCount} file${plan.fileCount === 1 ? '' : 's'} in ${plan.folders.length} folder${plan.folders.length === 1 ? '' : 's'}`}
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
          <div className="package-subhead">
            {shortfall.length === 0
              ? 'Everything the brief asked for is in here'
              : `${shortfall.length} of ${checklist.length} bought items not in the package yet`}
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
            ? 'Font files will be included. Only do this when the licence lets you pass them on.'
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
            What the licence says
          </label>
          <input
            id="package-font-licence"
            type="text"
            className="field-input"
            value={pack.typeLicenceNote || ''}
            onChange={(e) => updateBrandField('typeLicenceNote', e.target.value)}
            placeholder="e.g. SIL Open Font Licence, or 1 desktop seat"
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
          The licence lets me hand the font files over
        </label>
      </div>

      {/* Work made elsewhere. */}
      <div className="package-assets">
        <div className="package-subhead">Files you made elsewhere</div>
        {assets.length === 0 ? (
          <p className="panel-hint">
            Nothing added. Bring in the card, the signage artwork, the social
            templates — whatever you built in your own tools.
          </p>
        ) : (
          <ul className="package-asset-list">
            {assets.map((a) => (
              <li key={a.id} className="package-asset">
                <span className="package-asset-name">{a.name}</span>
                <label className="sr-only" htmlFor={`rights-${a.id}`}>
                  Usage rights for {a.name}
                </label>
                <select
                  id={`rights-${a.id}`}
                  className="field-input package-rights"
                  value={a.rights || 'clientOwned'}
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
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={fileRef}
          type="file"
          multiple
          className="sr-only"
          onChange={onPick}
        />
        <button
          type="button"
          className="btn btn-secondary"
          disabled={reading}
          onClick={() => fileRef.current?.click()}
        >
          {reading ? 'Reading…' : 'Add files'}
        </button>
      </div>

      <div className="package-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={exportBusy}
          onClick={() => onExport?.('package')}
        >
          {exportBusy ? 'Building…' : 'Build the client package'}
        </button>
      </div>
    </section>
  )
}
