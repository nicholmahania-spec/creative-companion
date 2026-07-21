import { useMemo, useRef, useState } from 'react'
import {
  bestTextOn,
  fontFamilyFromLabel,
  formatRgb,
  mapPaletteRoles,
  normalizeHex,
} from '../lib/color'
import { pinFaceStyle } from '../lib/moodPins'

const ROLE_KEYS = [
  { id: 'cover', label: 'Cover' },
  { id: 'text', label: 'Text' },
  { id: 'accent', label: 'Accent' },
  { id: 'quiet', label: 'Quiet' },
]

/**
 * Shared brand leave-behind artboard — Design preview, Review/Deliver, PDF capture.
 * Direction sheet + lockup tiles — not a freeform Figma canvas.
 */
export default function BrandArtboard({
  id = 'system-artboard',
  project = {},
  palette = [],
  pins = [],
  editable = false,
  compact = false,
  /** Hide tool footer watermark (client handoff / print) */
  hideWatermark = false,
  onTaglineChange,
  onBriefChange,
  onVoiceChange,
  onDoChange,
  onDontChange,
  onRoleAssign,
  onLogoImage,
  onClearLogoImage,
}) {
  const fileRef = useRef(null)
  const [assignRole, setAssignRole] = useState('cover')
  const autoRoles = useMemo(() => mapPaletteRoles(palette), [palette])
  const roles = {
    cover: normalizeHex(project.colorRoles?.cover) || autoRoles.cover,
    text: normalizeHex(project.colorRoles?.text) || autoRoles.text,
    accent: normalizeHex(project.colorRoles?.accent) || autoRoles.accent,
    quiet: normalizeHex(project.colorRoles?.quiet) || autoRoles.quiet,
  }
  const coverFg = bestTextOn(roles.cover)
  const orderedPins = useMemo(() => {
    const list = [...(pins || [])]
    list.sort((a, b) => {
      if (a.packHero && !b.packHero) return -1
      if (!a.packHero && b.packHero) return 1
      return (a.packOrder ?? 999) - (b.packOrder ?? 999)
    })
    return list.slice(0, 6)
  }, [pins])

  const typeH = project.typeHeading || 'Plus Jakarta Sans Bold'
  const typeB = project.typeBody || 'Plus Jakarta Sans Regular'

  const roleForSwatch = (hex) => {
    const n = normalizeHex(hex)
    return ROLE_KEYS.filter((r) => normalizeHex(roles[r.id]) === n).map(
      (r) => r.label
    )
  }

  return (
    <article
      className={`direction-sheet system-artboard brand-artboard${
        compact ? ' is-compact' : ''
      }${editable ? ' is-editable' : ''}${
        hideWatermark ? ' hide-watermark' : ''
      }`}
      id={id}
    >
      <div
        className="export-identity-cover"
        style={{ background: roles.cover, color: coverFg }}
      >
        <div className="kicker" style={{ color: 'inherit', opacity: 0.85 }}>
          Direction sheet
        </div>
        {project.logoImage ? (
          <div className="artboard-logo-row">
            <img className="artboard-logo-img" src={project.logoImage} alt="" />
            {editable && (
              <button
                type="button"
                className="text-link artboard-logo-clear"
                onClick={() => onClearLogoImage?.()}
              >
                Remove mark
              </button>
            )}
          </div>
        ) : null}
        <h1 className="direction-title" style={{ color: 'inherit' }}>
          {project.name || 'Untitled project'}
        </h1>
        {editable ? (
          <input
            className="artboard-tagline-input"
            value={project.tagline || ''}
            onChange={(e) => onTaglineChange?.(e.target.value)}
            placeholder="Tagline — one line people remember"
            style={{ color: coverFg, borderColor: `${coverFg}44` }}
            aria-label="Tagline"
          />
        ) : (
          <p
            className="direction-brief"
            style={{ color: 'inherit', opacity: 0.92 }}
          >
            {project.tagline?.trim() || '—'}
          </p>
        )}
      </div>

      <div className="kicker">Positioning</div>
      {editable ? (
        <textarea
          className="artboard-brief-input"
          value={project.brief || ''}
          onChange={(e) => onBriefChange?.(e.target.value)}
          placeholder="Who · outcome · constraint"
          rows={2}
          aria-label="Positioning"
        />
      ) : (
        <p className="direction-brief">{project.brief?.trim() || '—'}</p>
      )}

      <div className="kicker">Voice</div>
      {editable ? (
        <textarea
          className="artboard-brief-input"
          value={project.voice || ''}
          onChange={(e) => onVoiceChange?.(e.target.value)}
          placeholder="How we sound"
          rows={2}
          aria-label="Voice"
        />
      ) : (
        <p className="direction-brief">{project.voice?.trim() || '—'}</p>
      )}

      <div className="kicker">Palette roles</div>
      {editable && (
        <p className="surface-meta artboard-role-hint">
          Assign role, then click a swatch:{' '}
          {ROLE_KEYS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`role-pick-chip${
                assignRole === r.id ? ' is-active' : ''
              }`}
              onClick={() => setAssignRole(r.id)}
            >
              <i style={{ background: roles[r.id] }} />
              {r.label}
            </button>
          ))}
        </p>
      )}
      <div className={`direction-palette${editable ? ' is-clickable' : ''}`}>
        {(palette || []).map((c, i) => {
          const labels = roleForSwatch(c)
          return (
            <button
              key={`${c}-${i}`}
              type="button"
              className="palette-swatch-btn"
              style={{ background: c }}
              title={
                editable
                  ? `Set as ${assignRole}${
                      labels.length ? ` · now: ${labels.join(', ')}` : ''
                    }`
                  : c
              }
              disabled={!editable}
              onClick={() => {
                if (!editable) return
                onRoleAssign?.(assignRole, normalizeHex(c) || c)
              }}
            >
              {labels.length > 0 && (
                <span className="swatch-role-badge">{labels[0][0]}</span>
              )}
            </button>
          )
        })}
      </div>
      <div className="palette-roles-row">
        {ROLE_KEYS.map((r) => (
          <span key={r.id} className="palette-role-chip">
            <i style={{ background: roles[r.id] }} />
            {r.label}
            <code className="role-hex">{roles[r.id]}</code>
          </span>
        ))}
      </div>
      <details className="artboard-advanced">
        <summary>Hex</summary>
        <div className="direction-hex-grid">
          {(palette || []).map((c, i) => (
            <div key={`${c}-${i}`} className="direction-hex-chip">
              <i style={{ background: c }} />
              <span>
                <code>{normalizeHex(c) || c}</code>
              </span>
            </div>
          ))}
        </div>
      </details>

      <div className="kicker">Typography</div>
      <div className="type-specimen">
        <p
          className="type-specimen-h"
          style={{ fontFamily: fontFamilyFromLabel(typeH) }}
        >
          {typeH}
        </p>
        <p
          className="type-specimen-b"
          style={{ fontFamily: fontFamilyFromLabel(typeB) }}
        >
          {typeB}
        </p>
      </div>

      <div className="kicker">Logo lockups</div>
      <div className="logo-lockup-suite" aria-label="Logo lockup suite">
        {[
          {
            id: 'primary',
            label: 'Primary',
            bg: roles.quiet || '#FAFAF9',
            fg: roles.text || '#1C1917',
          },
          {
            id: 'reverse',
            label: 'Reverse',
            bg: roles.cover,
            fg: coverFg,
          },
          {
            id: 'mono',
            label: 'Mono',
            bg: '#FAFAF9',
            fg: '#1C1917',
          },
          {
            id: 'accent',
            label: 'On accent',
            bg: roles.accent,
            fg: bestTextOn(roles.accent),
          },
        ].map((v) => (
          <div
            key={v.id}
            className={`logo-lockup-tile logo-lockup-${v.id}`}
            style={{ background: v.bg, color: v.fg }}
          >
            <span className="logo-lockup-label">{v.label}</span>
            {project.logoImage ? (
              <img
                className="logo-lockup-mark"
                src={project.logoImage}
                alt=""
              />
            ) : (
              <span className="logo-lockup-mark-fallback" aria-hidden="true" />
            )}
            <strong className="logo-lockup-wordmark">
              {project.logoWordmark?.trim() ||
                project.name ||
                'Wordmark'}
            </strong>
          </div>
        ))}
      </div>
      {(project.logoDirection ||
        project.logoClearspace ||
        editable) && (
        <>
          <p className="direction-brief" style={{ marginTop: '0.65rem' }}>
            {project.logoDirection ||
              (editable ? 'Set logo notes in Edit → Logo' : '—')}
          </p>
          {project.logoClearspace?.trim() ? (
            <p className="surface-meta">{project.logoClearspace}</p>
          ) : null}
        </>
      )}

      {editable && (
        <div className="artboard-logo-upload">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fileRef.current?.click()}
          >
            {project.logoImage ? 'Replace mark image' : 'Upload mark image'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              if (file.size > 2.5 * 1024 * 1024) {
                onLogoImage?.({ error: 'Mark image must be under 2.5MB' })
                return
              }
              const reader = new FileReader()
              reader.onload = () =>
                onLogoImage?.({ ok: true, dataUrl: reader.result })
              reader.readAsDataURL(file)
            }}
          />
        </div>
      )}

      <div className="kicker">Application mock</div>
      <div
        className="brand-card-mock"
        aria-label="Business card proof of system"
      >
        <div
          className="brand-card-mock-inner"
          style={{
            background: roles.quiet || '#FAFAF9',
            color: roles.text || '#1C1917',
            borderColor: roles.accent || '#0F766E',
          }}
        >
          <div
            className="brand-card-mock-accent"
            style={{ background: roles.accent || '#0F766E' }}
            aria-hidden
          />
          <div className="brand-card-mock-body">
            <strong
              style={{
                fontFamily: fontFamilyFromLabel(typeH),
                fontSize: '1.05rem',
              }}
            >
              {project.logoWordmark?.trim() || project.name || 'Brand'}
            </strong>
            <p
              className="brand-card-mock-tag"
              style={{ fontFamily: fontFamilyFromLabel(typeB) }}
            >
              {project.tagline?.trim() || '—'}
            </p>
            <p className="brand-card-mock-meta">hello@brand.example</p>
          </div>
          <div
            className="brand-card-mock-cover"
            style={{
              background: roles.cover || '#1C1917',
              color: coverFg,
            }}
          >
            {project.logoImage ? (
              <img src={project.logoImage} alt="" />
            ) : (
              <span aria-hidden>●</span>
            )}
          </div>
        </div>
        <p className="surface-meta" style={{ marginTop: '0.45rem' }}>
          Proof of system — not a print die-line. Roles + type + mark.
        </p>
      </div>

      {(project.messagingPromise ||
        project.messagingProof ||
        project.messagingPersonality) && (
        <>
          <div className="kicker">Messaging</div>
          <ul className="brand-messaging-list">
            {project.messagingPromise ? (
              <li>
                <strong>Promise</strong> — {project.messagingPromise}
              </li>
            ) : null}
            {project.messagingProof ? (
              <li>
                <strong>Proof</strong> — {project.messagingProof}
              </li>
            ) : null}
            {project.messagingPersonality ? (
              <li>
                <strong>Personality</strong> — {project.messagingPersonality}
              </li>
            ) : null}
          </ul>
        </>
      )}

      <div className="export-do-dont">
        <div>
          <div className="kicker">Do</div>
          {editable ? (
            <textarea
              className="artboard-brief-input"
              value={project.doUse || ''}
              onChange={(e) => onDoChange?.(e.target.value)}
              placeholder="What to use…"
              rows={2}
              aria-label="Do"
            />
          ) : (
            <p className="direction-brief">{project.doUse || '—'}</p>
          )}
        </div>
        <div>
          <div className="kicker">Don&apos;t</div>
          {editable ? (
            <textarea
              className="artboard-brief-input"
              value={project.dontUse || ''}
              onChange={(e) => onDontChange?.(e.target.value)}
              placeholder="What to avoid…"
              rows={2}
              aria-label="Don't"
            />
          ) : (
            <p className="direction-brief">{project.dontUse || '—'}</p>
          )}
        </div>
      </div>

      <div className="kicker">Mood direction</div>
      {orderedPins.length === 0 ? (
        <p className="surface-meta">
          No starred pins — open Research and tap ★ for the leave-behind (max 6).
        </p>
      ) : (
        <div className="direction-pins">
          {orderedPins.map((pin) => (
            <div
              key={pin.id}
              className={`direction-pin${pin.packHero ? ' is-hero-pin' : ''}`}
            >
              <div className="direction-pin-visual" style={pinFaceStyle(pin)} />
              <div className="direction-pin-note">
                {pin.packHero ? '★ ' : ''}
                {pin.note || 'Pin'}
              </div>
            </div>
          ))}
        </div>
      )}

      {!hideWatermark && (
        <footer className="direction-foot">
          Creative Companion · Direction sheet ·{' '}
          {new Date().toLocaleDateString()}
        </footer>
      )}
    </article>
  )
}
