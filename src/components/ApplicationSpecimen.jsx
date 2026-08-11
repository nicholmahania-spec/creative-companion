/**
 * Active application specimen — Stage-scale schematic for the proofing table.
 *
 * NOT a produced artifact. NOT a 3× thumbnail. A representation large enough
 * to judge mark scale, type hierarchy, spacing, colour, crop, and proportion.
 *
 * Surface identity and representation kind come from applicationRepresentation.
 * Only the schematic kind is implemented; richer kinds plug in later without
 * a second architecture.
 */
import {
  representationForSurface,
  specimenGeometry,
  applicationBrandMaterial,
  specimenHonestyLine,
  REPRESENTATION_KINDS,
} from '../lib/brand/applicationRepresentation'
import { TOUCHPOINT_SPECS } from '../lib/journey/touchpoints'

function Mark({ logo, name, color, className = 'app-specimen-mark' }) {
  if (logo) {
    return (
      <img className={className} src={logo} alt="" draggable={false} />
    )
  }
  return (
    <span className={`${className} is-wordmark`} style={{ color }}>
      {name}
    </span>
  )
}

function contactLines(bits) {
  const person = bits.contact
  const name = person?.name || ''
  const title = person?.title || ''
  const phone = person?.phone || bits.phone || ''
  const email = person?.email || bits.email || ''
  return { name, title, phone, email }
}

/** Business card — physical 3.5×2 hierarchy a designer can actually judge. */
function FaceBusinessCard({ bits }) {
  const { name: person, title, phone, email } = contactLines(bits)
  const line = [phone, email].filter(Boolean).join('  ·  ')
  return (
    <div
      className="app-specimen-face app-specimen-card"
      style={{
        background: bits.quiet,
        color: bits.text,
        fontFamily: bits.bodyFont,
      }}
    >
      <div className="app-specimen-card-top">
        <Mark
          logo={bits.logo}
          name={bits.name}
          color={bits.cover}
          className="app-specimen-mark app-specimen-card-mark"
        />
      </div>
      <div className="app-specimen-card-primary">
        <div
          className="app-specimen-card-person"
          style={{ fontFamily: bits.headingFont, color: bits.cover }}
          data-placeholder={!person ? 'true' : undefined}
        >
          {person || 'Name'}
        </div>
        <div
          className="app-specimen-card-title"
          data-placeholder={!title ? 'true' : undefined}
        >
          {title || 'Title'}
        </div>
      </div>
      <div className="app-specimen-card-foot">
        <div
          className="app-specimen-card-contact"
          data-placeholder={!line ? 'true' : undefined}
        >
          {line || 'Phone  ·  Email'}
        </div>
        <div className="app-specimen-card-org" style={{ color: bits.accent }}>
          {bits.name}
        </div>
      </div>
    </div>
  )
}

/** Website — browser field with nav, hero hierarchy, body measure. */
function FaceWebsite({ bits }) {
  return (
    <div className="app-specimen-face app-specimen-web">
      <div className="app-specimen-browser-chrome" aria-hidden="true">
        <span className="app-specimen-browser-dot" />
        <span className="app-specimen-browser-dot" />
        <span className="app-specimen-browser-dot" />
        <span className="app-specimen-browser-url">{bits.website || bits.name.toLowerCase().replace(/\s+/g, '') + '.com'}</span>
      </div>
      <div
        className="app-specimen-web-nav"
        style={{
          background: bits.cover,
          color: bits.textOnCover,
          fontFamily: bits.headingFont,
        }}
      >
        <Mark
          logo={bits.logo}
          name={bits.name}
          color={bits.textOnCover}
          className="app-specimen-mark app-specimen-web-mark"
        />
        <span className="app-specimen-web-nav-links" style={{ fontFamily: bits.bodyFont }}>
          Work · About · Contact
        </span>
      </div>
      <div
        className="app-specimen-web-hero"
        style={{ background: bits.quiet, color: bits.cover }}
      >
        <h3
          className="app-specimen-web-headline"
          style={{ fontFamily: bits.headingFont }}
        >
          {bits.tag || bits.name}
        </h3>
        <p className="app-specimen-web-lede" style={{ fontFamily: bits.bodyFont, color: bits.text }}>
          {bits.tag
            ? `How ${bits.name} shows up when the page has room to breathe.`
            : 'Hero hierarchy · wordmark scale · accent on the primary action.'}
        </p>
        <span
          className="app-specimen-web-cta"
          style={{ background: bits.accent, color: bits.textOnAccent }}
        >
          Primary action
        </span>
      </div>
      <div className="app-specimen-web-body" style={{ background: bits.background || '#fff' }}>
        <div className="app-specimen-web-col">
          <span className="app-specimen-rule" style={{ background: bits.accent }} />
          <span className="app-specimen-textline" style={{ background: `color-mix(in srgb, ${bits.text} 18%, transparent)` }} />
          <span className="app-specimen-textline is-short" style={{ background: `color-mix(in srgb, ${bits.text} 14%, transparent)` }} />
        </div>
        <div className="app-specimen-web-col">
          <span className="app-specimen-textline" style={{ background: `color-mix(in srgb, ${bits.text} 14%, transparent)` }} />
          <span className="app-specimen-textline is-short" style={{ background: `color-mix(in srgb, ${bits.text} 12%, transparent)` }} />
        </div>
      </div>
    </div>
  )
}

/** Email — signature hierarchy on a message sheet. */
function FaceEmail({ bits }) {
  const { name: person, title } = contactLines(bits)
  const who = [person, title].filter(Boolean).join(' · ') || bits.name
  const details = [bits.phone, bits.email, bits.website].filter(Boolean).join('  ·  ')
  return (
    <div
      className="app-specimen-face app-specimen-email"
      style={{ background: bits.background || '#fff', fontFamily: bits.bodyFont }}
    >
      <div className="app-specimen-email-thread" aria-hidden="true">
        <span className="app-specimen-textline" style={{ background: `color-mix(in srgb, ${bits.text} 10%, transparent)` }} />
        <span className="app-specimen-textline is-short" style={{ background: `color-mix(in srgb, ${bits.text} 8%, transparent)` }} />
      </div>
      <div className="app-specimen-email-sig">
        <Mark
          logo={bits.logo}
          name={bits.name}
          color={bits.cover}
          className="app-specimen-mark app-specimen-email-mark"
        />
        <div
          className="app-specimen-email-name"
          style={{ fontFamily: bits.headingFont, color: bits.cover }}
        >
          {who}
        </div>
        <div className="app-specimen-email-org" style={{ color: bits.accent }}>
          {bits.name}
        </div>
        <div className="app-specimen-email-meta" style={{ color: bits.text }}>
          {details || 'Phone  ·  Email  ·  Web'}
        </div>
      </div>
    </div>
  )
}

/** Social post — square field, crop, mark vs wordmark. */
function FaceSocial({ bits }) {
  return (
    <div
      className="app-specimen-face app-specimen-social"
      style={{
        background: bits.cover,
        color: bits.textOnCover,
        fontFamily: bits.headingFont,
      }}
    >
      <div className="app-specimen-social-inner">
        <Mark
          logo={bits.logo}
          name={bits.name}
          color={bits.textOnCover}
          className="app-specimen-mark app-specimen-social-mark"
        />
        <p className="app-specimen-social-caption" style={{ fontFamily: bits.bodyFont }}>
          {bits.tag || 'Post · crop · contrast at a glance'}
        </p>
        <span
          className="app-specimen-social-accent"
          style={{ background: bits.accent }}
        />
      </div>
    </div>
  )
}

/** Print — flyer with band hierarchy and body measure. */
function FacePrint({ bits }) {
  return (
    <div
      className="app-specimen-face app-specimen-print"
      style={{ background: bits.quiet, color: bits.text, fontFamily: bits.bodyFont }}
    >
      <div
        className="app-specimen-print-band"
        style={{ background: bits.cover, color: bits.textOnCover }}
      >
        <Mark
          logo={bits.logo}
          name={bits.name}
          color={bits.textOnCover}
          className="app-specimen-mark app-specimen-print-mark"
        />
        <h3
          className="app-specimen-print-headline"
          style={{ fontFamily: bits.headingFont }}
        >
          {bits.tag || bits.name}
        </h3>
      </div>
      <div className="app-specimen-print-body">
        <span className="app-specimen-rule" style={{ background: bits.accent }} />
        <span className="app-specimen-textline" style={{ background: `color-mix(in srgb, ${bits.text} 16%, transparent)` }} />
        <span className="app-specimen-textline" style={{ background: `color-mix(in srgb, ${bits.text} 14%, transparent)` }} />
        <span className="app-specimen-textline is-short" style={{ background: `color-mix(in srgb, ${bits.text} 12%, transparent)` }} />
        <p className="app-specimen-print-meta">Margins · logo placement · headline scale</p>
      </div>
    </div>
  )
}

/** App — phone proportion, mark at small size, accent CTA. */
function FaceApp({ bits }) {
  return (
    <div className="app-specimen-phone-shell">
      <div
        className="app-specimen-face app-specimen-app"
        style={{ background: bits.quiet, color: bits.cover }}
      >
        <div className="app-specimen-app-status" style={{ background: bits.cover }} />
        <div className="app-specimen-app-body">
          <Mark
            logo={bits.logo}
            name={bits.name}
            color={bits.cover}
            className="app-specimen-mark app-specimen-app-mark"
          />
          <p className="app-specimen-app-lede" style={{ fontFamily: bits.bodyFont, color: bits.text }}>
            {bits.tag || 'Readable at arm’s length'}
          </p>
          <span
            className="app-specimen-app-cta"
            style={{
              background: bits.accent,
              color: bits.textOnAccent,
              fontFamily: bits.headingFont,
            }}
          >
            Continue
          </span>
        </div>
      </div>
    </div>
  )
}

/** Packaging — front panel at arm’s length. */
function FacePackaging({ bits }) {
  return (
    <div className="app-specimen-pack-shell">
      <div
        className="app-specimen-face app-specimen-pack"
        style={{
          background: bits.cover,
          color: bits.textOnCover,
          fontFamily: bits.headingFont,
        }}
      >
        <Mark
          logo={bits.logo}
          name={bits.name}
          color={bits.textOnCover}
          className="app-specimen-mark app-specimen-pack-mark"
        />
        <p className="app-specimen-pack-line" style={{ fontFamily: bits.bodyFont }}>
          {bits.tag || 'Front panel'}
        </p>
        <span
          className="app-specimen-pack-rule"
          style={{ background: bits.accent }}
        />
      </div>
    </div>
  )
}

/** Merch — print area on a soft tee form. */
function FaceMerch({ bits }) {
  return (
    <div className="app-specimen-merch-shell">
      <div
        className="app-specimen-face app-specimen-merch"
        style={{ background: bits.background || '#e8e6e3' }}
      >
        <div
          className="app-specimen-merch-print"
          style={{
            background: bits.quiet,
            borderColor: bits.cover,
            color: bits.cover,
            fontFamily: bits.headingFont,
          }}
        >
          <Mark
            logo={bits.logo}
            name={bits.name}
            color={bits.cover}
            className="app-specimen-mark app-specimen-merch-mark"
          />
        </div>
      </div>
    </div>
  )
}

/** Signage — distance read, large lockup. */
function FaceSignage({ bits }) {
  return (
    <div
      className="app-specimen-face app-specimen-sign"
      style={{
        background: bits.cover,
        color: bits.textOnCover,
        fontFamily: bits.headingFont,
      }}
    >
      <Mark
        logo={bits.logo}
        name={bits.name}
        color={bits.textOnCover}
        className="app-specimen-mark app-specimen-sign-mark"
      />
      {bits.tag ? (
        <p className="app-specimen-sign-tag" style={{ fontFamily: bits.bodyFont }}>
          {bits.tag}
        </p>
      ) : null}
    </div>
  )
}

const FACES = {
  businessCard: FaceBusinessCard,
  website: FaceWebsite,
  email: FaceEmail,
  social: FaceSocial,
  print: FacePrint,
  app: FaceApp,
  packaging: FacePackaging,
  merch: FaceMerch,
  signage: FaceSignage,
}

function FaceGeneric({ bits, surfaceId }) {
  return (
    <div
      className="app-specimen-face app-specimen-generic"
      style={{
        background: bits.quiet,
        color: bits.cover,
        fontFamily: bits.headingFont,
      }}
    >
      <Mark logo={bits.logo} name={bits.name} color={bits.cover} />
      <p className="app-specimen-generic-label" style={{ fontFamily: bits.bodyFont }}>
        {surfaceId}
      </p>
    </div>
  )
}

/**
 * @param {object} props
 * @param {string} props.surfaceId
 * @param {object} [props.project]
 * @param {string[]} [props.palette]
 * @param {'stage'|'thumb'} [props.scale] stage = proofing table; thumb = reserved
 * @param {boolean} [props.accepted] mock-accepted stamp — not production
 * @param {string} [props.className]
 */
export default function ApplicationSpecimen({
  surfaceId,
  project = {},
  palette = [],
  scale = 'stage',
  accepted = false,
  className = '',
}) {
  const representation = representationForSurface(surfaceId)
  const geometry = specimenGeometry(surfaceId)
  const bits = applicationBrandMaterial(project, palette)
  const honesty = specimenHonestyLine(surfaceId)
  const Face = FACES[surfaceId] || FaceGeneric

  /* Only schematic is implemented. Unknown kinds fall back so the room
     never blanks if a future kind is requested early. */
  if (
    representation.kind !== REPRESENTATION_KINDS.SCHEMATIC &&
    representation.kind !== 'schematic'
  ) {
    /* Future representations enter here — composite, image, real-file, etc. */
  }

  return (
    <figure
      className={`app-specimen app-specimen-scale-${scale} app-specimen-frame-${geometry.frame}${accepted ? ' is-accepted' : ''} ${className}`.trim()}
      data-surface={surfaceId}
      data-representation={representation.kind}
      data-schematic="true"
      data-produced="false"
      data-mock-accepted={accepted ? 'true' : 'false'}
      style={{
        '--specimen-aspect': geometry.aspect,
        '--specimen-max-w': geometry.maxWidth,
        '--specimen-max-h': geometry.maxHeight,
      }}
    >
      <div className="app-specimen-table">
        <div className="app-specimen-stage">
          <Face bits={bits} surfaceId={surfaceId} />
          {accepted && scale === 'stage' ? (
            <span className="app-specimen-stamp" aria-hidden="true">
              Mock accepted
            </span>
          ) : null}
        </div>
      </div>
      <figcaption className="app-specimen-honesty">
        {honesty}
        {accepted
          ? ' · Mock accepted — schematic judgment only, not a produced file'
          : ''}
      </figcaption>
    </figure>
  )
}
