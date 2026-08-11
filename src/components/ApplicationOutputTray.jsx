/**
 * Physical output tray for real packageAssets on the Application Stage.
 *
 * Schematic specimen stays separate. This tray only surfaces existing
 * produce paths + packageAssets rows — never package verification.
 */
import BusinessCardProduce from '../features/brand/BusinessCardProduce'
import EmailSignatureProduce from '../features/brand/EmailSignatureProduce'
import {
  produceMetaForSurface,
  producedAssetsForSurface,
  trayHonestyLine,
} from '../lib/brand/applicationPackageAssets'

/**
 * @param {object} props
 * @param {string} props.surfaceId
 * @param {object} [props.project]
 * @param {string[]} [props.palette]
 * @param {function} [props.addPackageAsset]
 * @param {function} [props.updatePackageAsset]
 * @param {function} [props.flashMicro]
 * @param {function} [props.setActiveView]
 */
export default function ApplicationOutputTray({
  surfaceId,
  project = {},
  palette = [],
  addPackageAsset,
  updatePackageAsset,
  flashMicro,
  setActiveView,
}) {
  const meta = produceMetaForSurface(surfaceId)
  const files = producedAssetsForSurface(project, surfaceId)
  const hasFile = files.length > 0

  /* Surfaces without an in-app produce path: stay nearly silent. */
  if (!meta) {
    return (
      <aside
        className="app-stage-tray is-unavailable"
        data-testid="output-tray"
        data-surface={surfaceId}
        data-has-file="false"
        aria-label="Real file output"
      >
        <p className="app-stage-tray-kicker">Real file</p>
        <p className="app-stage-tray-empty" role="status">
          No in-app production path for this surface yet
        </p>
        <p className="app-stage-tray-honesty">
          Schematic above is not a file. Finished work may be filed in Library
          — not linked here as package material yet.
        </p>
      </aside>
    )
  }

  return (
    <aside
      className={`app-stage-tray${hasFile ? ' is-filled' : ' is-empty'}`}
      data-testid="output-tray"
      data-surface={surfaceId}
      data-has-file={hasFile ? 'true' : 'false'}
      aria-label="Real file output"
    >
      <div className="app-stage-tray-head">
        <p className="app-stage-tray-kicker">
          {hasFile
            ? files.length > 1
              ? 'Real files'
              : 'Real file'
            : 'Real file'}
        </p>
        {hasFile ? (
          <span className="app-stage-tray-kind" aria-hidden="true">
            {meta.kindLabel}
          </span>
        ) : null}
      </div>

      {hasFile ? (
        <ul className="app-stage-tray-files">
          {files.map((f) => (
            <li key={f.id || f.name} className="app-stage-tray-file">
              <span className="app-stage-tray-filename">
                {f.name || 'Produced file'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="app-stage-tray-empty" role="status">
          Nothing produced yet
        </p>
      )}

      <p className="app-stage-tray-honesty" role="note">
        {trayHonestyLine(hasFile)}
      </p>

      {/* Existing produce engines — same writers, tray presentation only */}
      <div className="app-stage-tray-produce">
        {surfaceId === 'businessCard' ? (
          <BusinessCardProduce
            project={project}
            palette={palette}
            addPackageAsset={addPackageAsset}
            updatePackageAsset={updatePackageAsset}
            flashMicro={flashMicro}
            setActiveView={setActiveView}
          />
        ) : null}
        {surfaceId === 'email' ? (
          <EmailSignatureProduce
            project={project}
            palette={palette}
            addPackageAsset={addPackageAsset}
            updatePackageAsset={updatePackageAsset}
            flashMicro={flashMicro}
            setActiveView={setActiveView}
          />
        ) : null}
      </div>

      {!hasFile && meta.emptyHint ? (
        <p className="app-stage-tray-hint">{meta.emptyHint}</p>
      ) : null}
    </aside>
  )
}
