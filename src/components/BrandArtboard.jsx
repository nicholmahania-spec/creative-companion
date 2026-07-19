import { useMemo, useRef } from 'react'
import {
  bestTextOn,
  fontFamilyFromLabel,
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
 * Shared brand pack artboard — System live view, Pack preview, PDF capture source.
 */
export default function BrandArtboard({
  id = 'system-artboard',
  project = {},
  palette = [],
  pins = [],
  editable = false,
  compact = false,
  onTaglineChange,
  onBriefChange,
  onRoleAssign,
  onLogoImage,
  onClearLogoImage,
}) {
  const fileRef = useRef(null)
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

  return (
    <article
      className={`direction-sheet system-artboard brand-artboard${
        compact ? ' is-compact' : ''
      }${editable ? ' is-editable' : ''}`}
      id={id}
    >
      <div
        className="export-identity-cover"
        style={{ background: roles.cover, color: coverFg }}
      >
        <div className="kicker" style={{ color: 'inherit', opacity: 0.85 }}>
          Brand identity template
        </div>
        {project.logoImage ? (
          <div className="artboard-logo-row">
            <img
              className="artboard-logo-img"
              src={project.logoImage}
              alt=""
            />
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
            {project.tagline?.trim() || 'Tagline TBD'}
          </p>
        )}
      </div>

      <div className="kicker">Positioning</div>
      {editable ? (
        <textarea
          className="artboard-brief-input"
          value={project.brief || ''}
          onChange={(e) => onBriefChange?.(e.target.value)}
          placeholder="Who is this for? Outcome? Constraint?"
          rows={2}
          aria-label="Positioning"
        />
      ) : (
        <p className="direction-brief">{project.brief || 'No brief yet.'}</p>
      )}

      {project.voice ? (
        <>
          <div className="kicker">Voice</div>
          <p className="direction-brief">{project.voice}</p>
        </>
      ) : null}

      <div className="kicker">Palette roles</div>
      <div className="direction-palette">
        {(palette || []).map((c, i) => (
          <div key={`${c}-${i}`} style={{ background: c }} title={c} />
        ))}
      </div>
      <div className="palette-roles-row">
        {ROLE_KEYS.map((r) => (
          <span key={r.id} className="palette-role-chip">
            <i style={{ background: roles[r.id] }} />
            {r.label}
            {editable && (
              <select
                className="role-select"
                aria-label={`Assign ${r.label} color`}
                value={roles[r.id]}
                onChange={(e) => onRoleAssign?.(r.id, e.target.value)}
              >
                {(palette || []).map((c) => (
                  <option key={`${r.id}-${c}`} value={normalizeHex(c) || c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </span>
        ))}
      </div>
      <div className="direction-hex">{(palette || []).join(' · ')}</div>

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
          {typeB} — body for UI and long copy.
        </p>
      </div>

      {project.logoDirection ? (
        <>
          <div className="kicker">Logo direction</div>
          <p className="direction-brief">{project.logoDirection}</p>
        </>
      ) : null}

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

      <div className="export-do-dont">
        <div>
          <div className="kicker">Do</div>
          <p className="direction-brief">{project.doUse || '—'}</p>
        </div>
        <div>
          <div className="kicker">Don&apos;t</div>
          <p className="direction-brief">{project.dontUse || '—'}</p>
        </div>
      </div>

      <div className="kicker">Mood direction</div>
      {orderedPins.length === 0 ? (
        <p className="surface-meta">
          No starred pins — open Board and tap ★ Pack (max 6).
        </p>
      ) : (
        <div className="direction-pins">
          {orderedPins.map((pin) => (
            <div
              key={pin.id}
              className={`direction-pin${pin.packHero ? ' is-hero-pin' : ''}`}
            >
              <div
                className="direction-pin-visual"
                style={pinFaceStyle(pin)}
              />
              <div className="direction-pin-note">
                {pin.packHero ? '★ ' : ''}
                {pin.note || 'Pin'}
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="direction-foot">
        Creative Companion · Brand identity ·{' '}
        {new Date().toLocaleDateString()}
      </footer>
    </article>
  )
}
