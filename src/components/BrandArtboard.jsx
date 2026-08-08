import { useMemo } from 'react'
import {
  bestTextOn,
  fontFamilyFromLabel,
  formatRgb,
  mapPaletteRoles,
  normalizeHex,
} from '../lib/color'
import { BRAND_ROLE_KEYS, BRAND_ROLE_LABELS } from '../lib/color'
import { colorSpec } from '../lib/brandSystem'
import { pinFaceStyle } from '../lib/moodPins'
import { creditedFooter } from '../lib/book/exportFiles'
import { hasAnswer } from '../lib/brand/directionValue'
import {
  BRIEF_PROVENANCE,
  effectiveWord,
  isBriefOwned,
} from '../lib/brand/briefWords'
import { clientFacingName, wordmarkName } from '../lib/client/clientRecord'
import { IDENTITY_SUBSTEPS } from '../lib/journey/identitySubsteps'
import { labelForStepId } from '../lib/journey/journey'
/* The artboard's own rules — the palette strip, its swatch cells, the lockup
   grid — live in `lazy-design.css`. Import them here rather than relying on the route:
   Review and the export modal render this component too, and neither of them
   loads Identity's sheet. */
import '../styles/lazy-design.css'

const formatCmyk = (hex) => colorSpec(hex)?.cmyk || ''

/**
 * Where the mark's reasoning is actually written.
 *
 * This line used to read "Set logo notes in Edit → Logo". There is no Edit
 * mode and no Logo substep — Identity is Mark / Color / Type / Handover — and
 * `logoDirection` is now the chosen concept's `why`, mirrored by the store.
 * So the sheet was sending the designer to a destination that does not exist,
 * on all four screens. The substep label comes from `IDENTITY_SUBSTEPS` rather
 * than being typed, so a rename moves this with it.
 */
const MARK_RATIONALE_HINT = `Write it on ${
  IDENTITY_SUBSTEPS.find((s) => s.id === 'logo')?.label || 'Mark'
} — it is the reason on your chosen concept.`

/**
 * A kicker that says where the line under it came from.
 *
 * The suffix is the WHOLE provenance mechanism — no button, no confirm, no
 * "unconfirmed" tint. It disappears on its own the moment the designer types,
 * because at that point the line is not from the brief any more. See
 * `briefWords.js` for why an accept step would be the wrong shape.
 */
function WordKicker({ children, fromBrief }) {
  return (
    <div className="kicker artboard-word-kicker">
      {children}
      {fromBrief && (
        <span className="artboard-from-brief"> · {BRIEF_PROVENANCE}</span>
      )}
    </div>
  )
}

/**
 * One editable line on the sheet.
 *
 * ALWAYS CARRIES A VISIBLE LABEL, in both modes. A placeholder is guidance
 * you can only read while you have written nothing — this file's own
 * `logo-donts` comment made that argument once already — and an editable
 * region styled as finished artwork is a weak signifier that measurably costs
 * people time to find (NN/g, 2017). The label plus the input's own edge is
 * what makes it obviously a thing you can type in rather than a thing that
 * was printed.
 */
function ArtboardLine({
  label,
  project,
  field,
  onChange,
  editable,
  placeholder,
  rows = 2,
  style,
  onEditInBrief,
}) {
  const { value, fromBrief } = effectiveWord(project, field)
  /* IDENTITY REPORTS THESE, IT DOES NOT ASK THEM.
     The brief asks the same question, so a box here is a second place to
     answer one thing — and when nobody has answered, an empty box on a design
     workspace asking the designer to write the client's tone of voice. The
     value still RESOLVES live through `effectiveWord`; only the control is
     gone, so a brief edited tomorrow shows through here with nothing to sync.
     See `BRIEF_OWNED_WORDS` for which lines and why. */
  const inherited = isBriefOwned(field)
  /* SOURCE MATERIAL IS NOT A DRAFT.
     A line the designer still authors may have a brief answer BEHIND it
     without that answer being the same fact — Positioning is written from
     "What does your business do?", not equal to it. Putting the fallback
     inside the box looked helpful and was a copy waiting to happen: the
     textarea held the client's sentence, so the first keystroke sent
     `e.target.value` — client sentence and all — into `project.positioning`,
     forking one fact into two columns exactly as briefWords.js forbids.
     So the box holds the designer's OWN words, and the client's answer sits
     under it as the material to write from. The SHEET still falls back when
     nothing has been written; only the control stops pre-filling. */
  const ownValue = String(project?.[field] ?? '')
  const sourceBehind = !inherited && fromBrief ? value : ''
  return (
    <>
      <WordKicker fromBrief={fromBrief}>{label}</WordKicker>
      {editable && !inherited ? (
        <>
          <textarea
            className="artboard-brief-input"
            value={ownValue}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            aria-label={label}
            style={style}
          />
          {sourceBehind && (
            <p className="artboard-word-source">
              {`${BRIEF_PROVENANCE}: ${sourceBehind}`}
            </p>
          )}
        </>
      ) : (
        <>
          <DirectionValue value={value} />
          {/* Only where the designer could act on it. The same sheet prints
              into the client pack and the PDF, and a navigation link has no
              meaning there. */}
          {editable && inherited && onEditInBrief && (
            <button
              type="button"
              className="text-link artboard-word-home"
              onClick={onEditInBrief}
            >
              {`Edit in ${labelForStepId('define')}`}
            </button>
          )}
        </>
      )}
    </>
  )
}

/* The vocabulary, not a private copy. This listed four jobs with the OLD
   wording — the client's leave-behind sheet (captured by both the raster
   preview and Print/Save-as-PDF) said "Cover" and "Quiet" where the designer
   had been shown "Primary" and "Background", and a Secondary or Neutral they
   had assigned appeared nowhere on it at all. */
const ROLE_KEYS = BRAND_ROLE_KEYS.map((id) => ({
  id,
  label: BRAND_ROLE_LABELS[id] || id,
}))

/**
 * A direction-sheet line: the answer, or an em-dash while there isn't one.
 *
 * An unanswered line is a real state — "nobody has decided this yet" — and it
 * should read as waiting rather than as content. The dash was previously set
 * in the same ink as a real answer, so a sheet of five dashes looked like a
 * sheet with five things written on it.
 *
 * NO animation on the dash being replaced, though the roadmap asked for one.
 * The audit's Phase 5 #20 assumed the direction sheet sits beside the fields
 * that feed it, so a designer would watch strategy turn into the brand. It
 * does not: all three call sites pass `editable={false}`, and the artboard
 * only renders on Identity's Preview sub-screen, on Review, and in the export
 * panel — never next to the Words fields where Positioning and Voice are
 * written. The transition therefore always happens on a screen nobody is
 * looking at, and firing it on arrival instead would flutter every line of a
 * project finished last week, which is the exact noise the idea was meant to
 * avoid. An animation nothing can see is not delight, it is dead code with a
 * keyframe. See docs/VISUAL_AUDIT.md Phase 5.
 */
function DirectionValue({ value, className = 'direction-brief', empty = '—' }) {
  const text = String(value ?? '').trim()
  return (
    <p className={`${className}${hasAnswer(value) ? '' : ' is-unset'}`}>
      {text || empty}
    </p>
  )
}

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
  /** The studio's own name for the sheet footer. Empty prints project +
   *  date and no platform credit — see `creditedFooter` in exportFiles.js. */
  studio = '',
  onTaglineChange,
  onPositioningChange,
  onDoChange,
  /* Voice, Promise, Proof, Personality and Don't are the brief's — the sheet
     resolves and reports them, and this is the route to where they are
     actually written. No onChange for them any more; there is nothing here to
     change. */
  onEditInBrief,
}) {
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
      }${editable ? ' is-editable' : ''}`}
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
          </div>
        ) : null}
        {/* The CLIENT's name, not the project's.
            PRD §4.1: `detective.clientName` is the project's identity and
            wins in exports, export filenames and the portal. This sheet is a
            picture of what the client receives, and it was headed "My
            project" — the studio's internal label for the job — in the
            largest type on the page, on the one surface where that reads as
            the brand's own name. `project.name` stays as the fallback for a
            project with no client record yet. */}
        <h1 className="direction-title" style={{ color: 'inherit' }}>
          {clientFacingName(project)}
        </h1>
        {editable ? (
          <>
            {/* Positioning and Voice below both carry a persistent kicker;
                this had only a placeholder and an aria-label, so once a
                tagline was typed the cover showed one unlabelled sentence and
                a designer returning next week had to infer from position what
                that line was and where it goes downstream. Recognition, not
                recall — and it is the only label on the sheet that has to sit
                on the brand's own cover colour, so it takes its ink from
                `coverFg` rather than from a token that would fight it. */}
            <div
              className="kicker artboard-word-kicker artboard-cover-kicker"
              style={{ color: coverFg, opacity: 0.7 }}
            >
              Tagline
            </div>
            <input
              className="artboard-tagline-input"
              value={project.tagline || ''}
              onChange={(e) => onTaglineChange?.(e.target.value)}
              placeholder="One line people remember"
              style={{ color: coverFg, borderColor: `${coverFg}55` }}
              aria-label="Tagline"
            />
          </>
        ) : (
          /* Same "unanswered reads as waiting" rule as the lines below, but
             it cannot use --text-muted: this sits on the brand's own cover
             colour, and a fixed grey would fight whatever the designer chose.
             Opacity is relative to the inherited ink, so it holds on any
             cover. */
          <p
            className="direction-brief"
            style={{
              color: 'inherit',
              opacity: hasAnswer(project.tagline) ? 0.92 : 0.6,
            }}
          >
            {project.tagline?.trim() || '—'}
          </p>
        )}
      </div>

      {/* `positioning`, never `brief`.
          `brief` is the auto-composed summary of the client's answers —
          "Client: X Goal: Y Story: Z" run together with no punctuation — and
          printing that under a heading promising a positioning statement is
          the defect `exportFiles.js` already corrected for the brand book. */}
      <ArtboardLine
        label="Positioning"
        project={project}
        field="positioning"
        onChange={onPositioningChange}
        editable={editable}
        placeholder="Who · outcome · constraint"
      />

      <ArtboardLine
        label="Voice"
        project={project}
        field="voice"
        onEditInBrief={onEditInBrief}
        editable={editable}
        placeholder="How we sound"
      />

      {/* THE SHEET REPORTS THE ROLES. IT DOES NOT ASSIGN THEM.
          There used to be an arming row here — "Assign role, then click a
          swatch" plus nine chips — and it did nothing at all: `onRoleAssign`
          was declared as a prop and passed by no caller, so every click was
          `undefined?.()`. Measured, it cost 261px at 1440 and 413px at 390 on
          all four Identity screens, and on Color it put a second, inert set of
          nine role chips about 900px from the live one, with its own armed
          state. Assigning a color role happens in one place: the Color tool. */}
      <div className="kicker">Palette roles</div>
      <div className="direction-palette">
        {(palette || []).map((c, i) => {
          const labels = roleForSwatch(c)
          return (
            <div
              key={`${c}-${i}`}
              className="palette-swatch-cell"
              style={{ background: c }}
              title={labels.length ? `${c} · ${labels.join(', ')}` : c}
            >
              {labels.length > 0 && (
                <span className="swatch-role-badge">{labels[0][0]}</span>
              )}
            </div>
          )
        })}
      </div>
      <div className="palette-roles-row">
        {ROLE_KEYS.map((r) => (
          <span key={r.id} className="palette-role-chip">
            <i style={{ background: roles[r.id] }} />
            {r.label}
            <code className="role-hex">{roles[r.id]}</code>
            <code className="role-cmyk">CMYK {formatCmyk(roles[r.id])}</code>
          </span>
        ))}
      </div>
      <details className="artboard-advanced">
        <summary>Hex / RGB / CMYK</summary>
        <div className="direction-hex-grid">
          {(palette || []).map((c, i) => (
            <div key={`${c}-${i}`} className="direction-hex-chip">
              <i style={{ background: c }} />
              <span>
                <code>{normalizeHex(c) || c}</code>
                <code className="direction-hex-rgb">RGB {formatRgb(c)}</code>
                <code className="direction-hex-cmyk">CMYK {formatCmyk(c)}</code>
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
              {wordmarkName(project)}
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
              (editable ? MARK_RATIONALE_HINT : '—')}
          </p>
          {project.logoClearspace?.trim() ? (
            <p className="surface-meta">{project.logoClearspace}</p>
          ) : null}
        </>
      )}

      {/* MARK UPLOAD IS NOT ON THE SHEET, and neither is removing one.
          Both controls lived here, unreachable, while `editable` was false at
          every call site. Switching the sheet on made them real — and axe
          immediately caught the file input having no accessible name
          (`label`, critical). They are deleted rather than labelled: Mark
          owns adding, choosing and removing a mark through the concept strip,
          and a second upload route on the sheet would be exactly the
          duplicate editor this rework exists to remove. The "Remove mark"
          button was worse than unlabelled — no caller passes
          `onClearLogoImage`, so it rendered and did nothing. */}

      {/* Business card specimen — only when there is a real contact to put
          on it. Render nothing (no placeholder card, no "add a contact"
          hint) with no contacts: an unfilled artifact on screen reads as an
          accusation, and absence is neutral. */}
      {(() => {
        const usableContact = (project.contacts || []).find((c) =>
          [c?.name, c?.email, c?.phone].some((v) => String(v || '').trim())
        )
        if (!usableContact) return null
        const contactLine = [usableContact.phone, usableContact.email]
          .map((v) => String(v || '').trim())
          .filter(Boolean)
          .join('  ·  ')
        return (
          <>
            <div className="kicker">Business card specimen</div>
            <div
              className="brand-card-mock"
              aria-label="Business card specimen from your brand fields"
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
                    {usableContact.name?.trim() ||
                      project.logoWordmark?.trim() ||
                      project.name ||
                      'Brand'}
                  </strong>
                  <p
                    className="brand-card-mock-tag"
                    style={{ fontFamily: fontFamilyFromLabel(typeB) }}
                  >
                    {usableContact.title?.trim() ||
                      project.tagline?.trim() ||
                      '—'}
                  </p>
                  {contactLine ? (
                    <p className="brand-card-mock-meta">{contactLine}</p>
                  ) : null}
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
                    <span aria-hidden>
                      {(project.logoWordmark || project.name || '?')
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <p className="surface-meta" style={{ marginTop: '0.45rem' }}>
                Specimen from your roles, type, and mark — not a print
                die-line.
              </p>
            </div>
          </>
        )
      })()}

      {/* Reported, not asked. All three resolve the client's own brief answer
          (`briefWords.js`) and the brief is where they are written, so the
          sheet shows the effective value and routes to Strategy.

          Still shown on the editable sheet even when all three are empty:
          these are three of the lines the brand book prints under
          "Messaging", and a row that disappears until something fills it is
          how the designer loses track of what the book is still waiting on.
          On a read-only sheet — the client pack, the PDF — an empty block
          would be three em-dashes nobody can act on, so it stays hidden. */}
      {(editable ||
        project.messagingPromise ||
        project.messagingProof ||
        project.messagingPersonality ||
        project.detective?.messagingPromise ||
        project.detective?.messagingProof ||
        project.detective?.brandAsPerson) && (
        <div className="artboard-messaging">
          <ArtboardLine
            label="Promise"
            project={project}
            field="messagingPromise"
            onEditInBrief={onEditInBrief}
            editable={editable}
            placeholder="What you always deliver"
          />
          <ArtboardLine
            label="Proof"
            project={project}
            field="messagingProof"
            onEditInBrief={onEditInBrief}
            editable={editable}
            placeholder="What backs it up"
          />
          <ArtboardLine
            label="Personality"
            project={project}
            field="messagingPersonality"
            onEditInBrief={onEditInBrief}
            editable={editable}
            placeholder="If the brand were a person"
          />
        </div>
      )}

      <div className="export-do-dont">
        <div>
          <ArtboardLine
            label="Do"
            project={project}
            field="doUse"
            onChange={onDoChange}
            editable={editable}
            placeholder="What to use…"
          />
        </div>
        <div>
          {/* Don't resolves the client's "anything you definitely don't
              want?" answer. Do has no brief source and correctly has none —
              nothing in the brief asks what TO do. */}
          <ArtboardLine
            label="Don't"
            project={project}
            field="dontUse"
            onEditInBrief={onEditInBrief}
            editable={editable}
            placeholder="What to avoid…"
          />
        </div>
      </div>

      <div className="kicker">Mood direction</div>
      {orderedPins.length === 0 ? (
        <p className="surface-meta">No starred images yet — open Research and tap ★ (up to 6) for what the client sees.</p>
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

      <footer className="direction-foot">
        {creditedFooter([
          studio,
          'Direction sheet',
          new Date().toLocaleDateString(),
        ])}
      </footer>
    </article>
  )
}
