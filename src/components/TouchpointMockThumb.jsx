/**
 * Schematic of the application mock the brand book will prove.
 * Not a second PDF renderer — live identity (mark, wordmark, palette)
 * so “this mock is good” is about something you can see.
 */
import { mapPaletteRoles, normalizeHex, bestTextOn } from '../lib/color'
import { touchpointLabel } from '../lib/touchpoints'

/** Aspect ratio class / CSS aspect-ratio per mock shape. */
export const TOUCHPOINT_ASPECT = {
  businessCard: '1.75 / 1',
  print: '1 / 1.3',
  social: '1 / 1',
  website: '16 / 10',
  app: '9 / 16',
  email: '4 / 3',
  packaging: '3 / 4',
  merch: '1 / 1',
  signage: '16 / 9',
}

function brandBits(project = {}, palette = []) {
  const roles = mapPaletteRoles(
    Array.isArray(palette) && palette.length ? palette : project.palette || []
  )
  const cover = normalizeHex(project.colorRoles?.cover) || roles.cover || '#1A1A1A'
  const accent = normalizeHex(project.colorRoles?.accent) || roles.accent || '#606060'
  const quiet = normalizeHex(project.colorRoles?.quiet) || roles.quiet || '#F5F5F5'
  const textOnCover = bestTextOn(cover) || '#FFFFFF'
  const name =
    String(project.logoWordmark || project.name || project.detective?.clientName || 'Brand').trim() ||
    'Brand'
  const tag = String(project.tagline || '').trim()
  return { cover, accent, quiet, textOnCover, name, tag, logo: project.logoImage || '' }
}

function Mark({ logo, name, color }) {
  if (logo) {
    return (
      <img
        className="tp-mock-logo"
        src={logo}
        alt=""
        draggable={false}
      />
    )
  }
  return (
    <span className="tp-mock-wordmark" style={{ color }}>
      {name.slice(0, 18)}
    </span>
  )
}

export default function TouchpointMockThumb({
  id,
  project = {},
  palette = [],
}) {
  const bits = brandBits(project, palette)
  const aspect = TOUCHPOINT_ASPECT[id] || '4 / 3'
  const label = touchpointLabel(id)

  return (
    <div
      className={`tp-mock tp-mock-${id}`}
      style={{ aspectRatio: aspect }}
      aria-hidden="true"
    >
      <div
        className="tp-mock-sheet"
        style={{
          background: bits.quiet,
          color: bits.cover,
          borderColor: bits.accent,
        }}
      >
        {id === 'businessCard' && (
          <div className="tp-mock-card-inner">
            <Mark logo={bits.logo} name={bits.name} color={bits.cover} />
            <span className="tp-mock-meta">{bits.tag || 'Name · title'}</span>
          </div>
        )}
        {id === 'print' && (
          <div className="tp-mock-print-inner">
            <div
              className="tp-mock-print-band"
              style={{ background: bits.cover, color: bits.textOnCover }}
            >
              <Mark logo={bits.logo} name={bits.name} color={bits.textOnCover} />
            </div>
            <span className="tp-mock-meta">Flyer / one-pager</span>
          </div>
        )}
        {id === 'social' && (
          <div
            className="tp-mock-social-inner"
            style={{ background: bits.cover, color: bits.textOnCover }}
          >
            <Mark logo={bits.logo} name={bits.name} color={bits.textOnCover} />
            <span className="tp-mock-meta">{bits.tag || 'Post'}</span>
          </div>
        )}
        {id === 'website' && (
          <div className="tp-mock-web-inner">
            <div
              className="tp-mock-web-nav"
              style={{ background: bits.cover, color: bits.textOnCover }}
            >
              <Mark logo={bits.logo} name={bits.name} color={bits.textOnCover} />
            </div>
            <div className="tp-mock-web-body">
              <span className="tp-mock-block" style={{ background: bits.accent }} />
              <span className="tp-mock-lines" />
            </div>
          </div>
        )}
        {id === 'app' && (
          <div className="tp-mock-app-inner">
            <div
              className="tp-mock-app-status"
              style={{ background: bits.cover }}
            />
            <div className="tp-mock-app-body">
              <Mark logo={bits.logo} name={bits.name} color={bits.cover} />
              <span className="tp-mock-block" style={{ background: bits.accent }} />
            </div>
          </div>
        )}
        {id === 'email' && (
          <div className="tp-mock-email-inner">
            <Mark logo={bits.logo} name={bits.name} color={bits.cover} />
            <span className="tp-mock-meta">{bits.tag || 'Email header'}</span>
            <span className="tp-mock-lines" />
          </div>
        )}
        {id === 'packaging' && (
          <div
            className="tp-mock-pack-inner"
            style={{ background: bits.cover, color: bits.textOnCover }}
          >
            <Mark logo={bits.logo} name={bits.name} color={bits.textOnCover} />
            <span className="tp-mock-meta">Pack</span>
          </div>
        )}
        {id === 'merch' && (
          <div className="tp-mock-merch-inner">
            <div
              className="tp-mock-merch-tee"
              style={{ background: bits.quiet, borderColor: bits.cover }}
            >
              <Mark logo={bits.logo} name={bits.name} color={bits.cover} />
            </div>
          </div>
        )}
        {id === 'signage' && (
          <div
            className="tp-mock-sign-inner"
            style={{ background: bits.cover, color: bits.textOnCover }}
          >
            <Mark logo={bits.logo} name={bits.name} color={bits.textOnCover} />
          </div>
        )}
        {!TOUCHPOINT_ASPECT[id] && (
          <div className="tp-mock-generic">
            <Mark logo={bits.logo} name={bits.name} color={bits.cover} />
            <span className="tp-mock-meta">{label}</span>
          </div>
        )}
      </div>
      <span className="tp-mock-caption">Book mock</span>
    </div>
  )
}
