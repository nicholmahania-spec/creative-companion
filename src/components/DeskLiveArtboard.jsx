/**
 * Desk "Identity · live artboard" — the Studio mock's two-panel card.
 *
 * Not BrandArtboard (direction sheet for Design/PDF). This is only the
 * glanceable lockup: wordmark + tagline + palette | type specimens + voice chips.
 */
import { useMemo } from 'react'
import {
  bestTextOn,
  fontFamilyFromLabel,
  normalizeHex,
  paletteIsUntouched,
} from '../lib/color'
import { labelForStepId } from '../lib/journey/journey'

function voiceChipsFrom(project = {}) {
  const fromWords = String(project.detective?.brandWords || project.brandWords || '')
  const fromVoice = String(project.voice || '')
  const raw = fromWords.trim() || fromVoice
  return raw
    .split(/[,;/|·•\n]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && w.length <= 28)
    .slice(0, 5)
}

function headingSpecimen(project = {}) {
  const promise = String(project.messagingPromise || '').trim()
  if (promise) {
    const first = promise.split(/[.!?]/)[0].trim()
    if (first.length >= 8 && first.length <= 48) return first
    return promise.slice(0, 48).trim()
  }
  const tag = String(project.tagline || '').trim()
  if (tag) return tag
  return 'Heading specimen'
}

/**
 * NEVER `project.brief`.
 *
 * That field is the AUTO-COMPOSED summary of the client's answers —
 * "Client: X Goal: Y Story: Z Deliverables: Primary logo, Logo variations…"
 * run together with no punctuation — and this function used it as the
 * fallback body specimen. So the card headed "Identity · live artboard"
 * rendered a machine-built index of the brief, set in the brand's body face,
 * as if it were a specimen of the brand's writing. It is the clearest example
 * of the defect this rework exists to fix: project information formatted to
 * look like design work.
 *
 * The fallbacks now go through things a person actually wrote — voice, then
 * the designer's positioning line, then the client's own words about how the
 * brand should feel — and stop honestly rather than reaching for the
 * summary.
 */
function bodySpecimen(project = {}) {
  const clip = (v) => (v.length > 220 ? `${v.slice(0, 217).trimEnd()}…` : v)
  const written = [
    project.voice,
    project.positioning,
    project.detective?.toneOfVoice,
    project.detective?.feel,
  ]
    .map((v) => String(v || '').trim())
    .find(Boolean)
  if (written) return clip(written)
  return 'Body specimen — write a voice or positioning line on Identity.'
}

export default function DeskLiveArtboard({
  project = {},
  palette = [],
  id = 'desk-live-artboard',
}) {
  /* The CLIENT's name, not the studio's internal job name. PRD §4.1:
     `detective.clientName` is the project's identity. This card is a picture
     of the brand, and it was headed "My project" in the largest type on it —
     the same defect the direction sheet had. */
  const wordmark =
    String(project.logoWordmark || '').trim() ||
    String(project.detective?.clientName || '').trim() ||
    String(project.name || '').trim() ||
    'Wordmark'
  const tagline = String(project.tagline || '').trim()
  const typeH = project.typeHeading || 'Plus Jakarta Sans Bold'
  const typeB = project.typeBody || 'Plus Jakarta Sans Regular'
  const chips = useMemo(() => voiceChipsFrom(project), [project])
  const heading = headingSpecimen(project)
  const body = bodySpecimen(project)

  const swatches = (palette || [])
    .map((c) => normalizeHex(c) || String(c || '').trim())
    .filter(Boolean)
    .slice(0, 6)

  /* Asked of the palette AS PASSED, not of `swatches` — slicing to 6 and
     normalising would make a longer real palette that merely starts with the
     stock four look untouched. */
  const stockPalette = paletteIsUntouched(palette)

  /* Paper + ink from brand when possible — mock uses cream paper / dark ink. */
  const paper =
    normalizeHex(project.colorRoles?.quiet) ||
    swatches.find((h) => {
      const n = h.replace('#', '')
      if (n.length !== 6) return false
      const r = parseInt(n.slice(0, 2), 16)
      const g = parseInt(n.slice(2, 4), 16)
      const b = parseInt(n.slice(4, 6), 16)
      return (r + g + b) / 3 > 200
    }) ||
    '#F3EBDD'
  const ink =
    normalizeHex(project.colorRoles?.text) ||
    swatches.find((h) => {
      const n = h.replace('#', '')
      if (n.length !== 6) return false
      const r = parseInt(n.slice(0, 2), 16)
      const g = parseInt(n.slice(2, 4), 16)
      const b = parseInt(n.slice(4, 6), 16)
      return (r + g + b) / 3 < 80
    }) ||
    '#221A14'
  const muted = ink

  return (
    <div
      id={id}
      className="desk-live-artboard"
      style={{ background: paper, color: ink }}
    >
      <div className="desk-live-left">
        <div className="desk-live-identity">
          {project.logoImage ? (
            <img
              className="desk-live-logo"
              src={project.logoImage}
              alt=""
            />
          ) : null}
          <p
            className="desk-live-wordmark"
            style={{ fontFamily: fontFamilyFromLabel(typeH) }}
          >
            {wordmark}
          </p>
          {tagline ? (
            <p className="desk-live-tagline" style={{ color: muted, opacity: 0.72 }}>
              {tagline}
            </p>
          ) : null}
        </div>
        {swatches.length > 0 ? (
          <div
            className="desk-live-swatches"
            aria-label={stockPalette ? 'Placeholder palette' : 'Palette'}
          >
            {swatches.map((hex) => (
              <div
                key={hex}
                className="desk-live-swatch"
                style={{
                  background: hex,
                  color: bestTextOn(hex),
                }}
                title={hex}
              >
                <span>{hex}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="desk-live-empty-pal">No palette yet — set colors on Identity.</p>
        )}
        {/* The "no palette" branch below can never fire for a real project —
            every project is CREATED with the four stone defaults, so
            `swatches.length` is never 0 (see `paletteIsUntouched`, which
            exists because three features already made this exact mistake).
            What a new user actually sees is four hexes presented on their
            client's artboard with nothing marking them as ours, and the
            reasonable reading is that the app picked their brand colours.

            Say whose they are, and only while they are still the factory
            four — the line disappears the moment any colour is set. */}
        {stockPalette ? (
          <p className="desk-live-pal-note">
            Placeholder colors — set real ones on {labelForStepId('design')}.
          </p>
        ) : null}
      </div>

      <div className="desk-live-right">
        <div className="desk-live-type-block">
          <span className="desk-live-type-label" style={{ opacity: 0.55 }}>
            Heading · 700
          </span>
          <p
            className="desk-live-heading"
            style={{ fontFamily: fontFamilyFromLabel(typeH) }}
          >
            {heading}
          </p>
        </div>
        <div className="desk-live-type-block">
          <span className="desk-live-type-label" style={{ opacity: 0.55 }}>
            Body · 500
          </span>
          <p
            className="desk-live-body"
            style={{ fontFamily: fontFamilyFromLabel(typeB) }}
          >
            {body}
          </p>
        </div>
        {chips.length > 0 ? (
          <div className="desk-live-chips" aria-label="Voice words">
            {chips.map((w) => (
              <span key={w} className="desk-live-chip" style={{ borderColor: `${ink}24`, color: ink }}>
                {w}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
