import { BOX_TYPES } from '../../lib/book/layout/positioned'

/**
 * Draws a PositionedPage. Decides nothing.
 *
 * This component is the second renderer of the brand book, and it is
 * deliberately the most boring file in the feature. It receives a page that
 * has already been composed — every rectangle, every line of text and every
 * coordinate settled — and turns it into DOM. It cannot compose, because it
 * cannot reach a template: `rendererBoundary.test.js` walks its import graph
 * and fails if it ever can.
 *
 * WHY SVG RATHER THAN DIVS. The positioned model puts text on a BASELINE,
 * because that is what jsPDF draws to. SVG's `<text y>` is also a baseline, so
 * the coordinates transfer with no conversion and no fudge factor — a `<div>`
 * would have needed the renderer to work backwards from a line box to a
 * baseline, which is exactly the kind of geometry decision it is not allowed
 * to make. `viewBox` in points then scales the whole page to whatever space
 * the Builder gives it, so the page keeps its real proportions instead of
 * being stretched to a fixed ratio.
 *
 * UNKNOWN BOXES THROW. Skipping one would produce a page missing an element
 * with nothing on screen to say so, which is the failure the whole boundary
 * exists to prevent — the same rule `drawRegion` follows in the PDF.
 */
export default function PositionedPageView({
  page,
  fontFamily = {},
  className = '',
  title = '',
}) {
  if (!page) return null
  const { w, h } = page.size
  const boxes = [...page.boxes].sort((l, r) => l.z - r.z)

  return (
    <svg
      className={`bbb-positioned-page ${className}`.trim()}
      viewBox={`0 0 ${w} ${h}`}
      /* The page's real proportions, from the geometry it was composed
         against — never a hardcoded sheet ratio. */
      style={{ aspectRatio: `${w} / ${h}` }}
      role="img"
      aria-label={title || 'Brand book page'}
      data-page-id={page.pageId}
    >
      {page.background?.fill ? (
        <rect x="0" y="0" width={w} height={h} fill={rgb(page.background.fill)} />
      ) : null}
      {boxes.map((b) => {
        if (b.type === 'rect') {
          return (
            <rect
              key={b.id}
              data-box={b.id}
              x={b.rect.x}
              y={b.rect.y}
              width={b.rect.w}
              height={b.rect.h}
              fill={rgb(b.style.fill)}
            />
          )
        }
        if (b.type === 'text') {
          return (
            <text
              key={b.id}
              data-box={b.id}
              x={b.origin.x}
              y={b.origin.y}
              fill={rgb(b.style.color)}
              fontSize={b.style.size}
              fontFamily={fontFamily[b.style.face] || 'sans-serif'}
              /* Tracking arrives in em, as the design asks for it. The PDF
                 narrows it to what a text layer survives; a browser has no
                 such limit, so nothing is capped here. */
              letterSpacing={b.style.tracking ? `${b.style.tracking}em` : undefined}
            >
              {b.lines.map((line, i) => (
                <tspan
                  key={i}
                  x={b.origin.x}
                  dy={i === 0 ? 0 : b.style.size * LINE_ADVANCE}
                >
                  {line}
                </tspan>
              ))}
            </text>
          )
        }
        throw new Error(
          `PositionedPageView: cannot draw box type "${b.type}" — known types are ${BOX_TYPES.join(', ')}`
        )
      })}
    </svg>
  )
}

/* jsPDF's own leading for a multi-line `text` call. Named so the one place it
   is applied is findable, rather than a bare 1.15 sitting in the markup. */
const LINE_ADVANCE = 1.15

const rgb = (v) => (Array.isArray(v) ? `rgb(${v[0]},${v[1]},${v[2]})` : v || 'none')
