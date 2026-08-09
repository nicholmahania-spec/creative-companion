import { useEffect, useMemo } from 'react'
import { fontFamilyFromLabel } from '../../lib/color'
import { directionPreview } from '../../lib/brand/directionPreview'
import { loadBrandFamilies } from '../../lib/book/fontLoader'
import '../../styles/lazy-directions.css'

/**
 * One direction, as a small type specimen on its own paper.
 *
 * Built for the A/B/C shortlist: same structure on every card so the design
 * variables (paper, faces, mark) are what change. Does not author content and
 * does not write to the store — see `directionPreview`.
 *
 * NOT BrandArtboard. That sheet needs ~15 project fields and Identity chrome;
 * this is two rungs and a mark.
 *
 * `compact` (phone closed cards): same VM, display rung + mark only, tighter
 * paper. Desktop and open-Edit keep both rungs so the pairing stays visible.
 */

/** Display size on a narrow card — still a real hierarchy, not a caption. */
const COMPACT_DISPLAY_PX = 28

/* Three cards each call loadBrandFamilies; that helper owns one <link> and
   would otherwise keep only the last card's faces. Union across mounts so
   A, B and C all render their real typefaces at once. */
const previewFaceLabels = new Set()

function MarkFace({ mark }) {
  if (!mark) return null
  if (mark.image) {
    return <img className="dir-preview-mark" src={mark.image} alt="" />
  }
  const label = String(mark.label || '').trim()
  if (!label) return null
  return <span className="dir-preview-mark is-text">{label}</span>
}

export default function DirectionPreview({
  project,
  direction,
  moodItems,
  projectId,
  compact = false,
}) {
  const preview = useMemo(
    () =>
      directionPreview(project, direction, {
        moodItems,
        projectId: projectId ?? project?.id,
      }),
    [project, direction, moodItems, projectId]
  )

  useEffect(() => {
    const labels = preview.rungs.map((r) => r.faceLabel).filter(Boolean)
    for (const label of labels) previewFaceLabels.add(label)
    if (previewFaceLabels.size) loadBrandFamilies?.([...previewFaceLabels])
  }, [preview])

  const rungs = compact
    ? preview.rungs.filter((r) => r.id === 'display')
    : preview.rungs

  return (
    <div
      className={`dir-preview${compact ? ' is-compact' : ''}`}
      style={{ background: preview.paper, color: preview.ink }}
      aria-label={
        preview.title
          ? `Direction preview · ${preview.title}`
          : 'Direction preview'
      }
    >
      <div className="dir-preview-type">
        {rungs.map((r) => {
          const px =
            compact && r.id === 'display' ? COMPACT_DISPLAY_PX : r.px
          return (
            <p
              key={r.id}
              className={`dir-preview-line dir-preview-line--${r.id}${
                r.own ? '' : ' is-fallback'
              }`}
              style={{
                fontFamily: fontFamilyFromLabel(r.faceLabel),
                /* Real sizes from TYPE_RUNGS; compact only shortens display. */
                fontSize: `${px}px`,
                fontWeight: r.weight,
                lineHeight: px >= 28 ? 1.1 : 1.45,
              }}
            >
              {r.text}
            </p>
          )
        })}
      </div>
      <MarkFace mark={preview.mark} />
    </div>
  )
}
