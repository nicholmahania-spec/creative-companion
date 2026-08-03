import React, { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import {
  bookBuilderFor,
  readPaletteTokens,
  resolvePageBg,
  mintTokenId,
  MAX_COLORS,
  MIN_COLORS,
  EDGE_STOPS,
  EDGE_ORDER,
  nearestEdgeStop,
} from '../lib/book/bookBuilder'
import { paginatedBookPages, PAGE_FIELDS, readField, APPENDIX_PAGES } from '../lib/book/bookContent'
import { currentBrandPack } from '../lib/book/currentPack'
import { downloadBrandPackVectorPdf } from '../lib/book/exportFiles'
import { bookSectionIds, bookPlan, FOUNDATION_PAGES, SECTION_PAGES } from '../lib/book/bookDocument'
import { labelFor, parseLabel, familyByName, FONT_GROUPS } from '../lib/book/fontCatalog'
import { monogramFor, logoDontsList, DEFAULT_LOGO_CLEARSPACE, DEFAULT_LOGO_MIN_SIZE } from '../lib/brandSystem'
import { loadBrandFamilies } from '../lib/book/fontLoader'
import '../styles/brand-book-builder.css'

/* ----------------------------------------------------------------------
   The owner's BrandBookBuilder, integrated.

   Everything below the MAIN marker keeps their JSX intact — the adaptation
   works by giving each store-backed setter the SAME SIGNATURE their markup
   already calls (`setGrid(g => ({...g, columns: n}))`), so the markup itself
   did not have to change to be wired up.

   Deliberately preserved: the size inputs hold raw strings, so a size can be
   "" while you retype it. Coercing with Number() would stop you clearing the
   field, and the value is only ever interpolated into `${x}pt`.
   ---------------------------------------------------------------------- */

/* ---------------------------------------------------------- constants */

/* Headline and body both offer the whole registry — see FONT_GROUPS in
   fontCatalog.js. The two hardcoded lists that used to live here named seven
   of the thirteen families and nothing kept them in step with the registry. */
const BUILTIN_PAGE_LABELS = { cover: "Front cover", colors: "Color palette", type: "Typography", back: "Back cover" };
const PAGE_SIZES = { letter: { w: 8.5, h: 11, label: "Letter (8.5 × 11 in)" }, a4: { w: 8.27, h: 11.69, label: "A4 (210 × 297 mm)" } };

/* ------------------------------------------------------------- helpers */

/* One picker for both headline and body, so the two can never drift apart
   the way the old pair of literals did. */
function FontSelect({ id, value, onChange }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {FONT_GROUPS.map((g) => (
        <optgroup key={g.id} label={g.label}>
          {g.families.map((f) => (
            <option key={f.id} value={f.name}>{f.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function isLight(hex) {
  const r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}
function fontStack(name, generic) {
  return `'${name} Local', '${name}', ${generic}`;
}
function resolveTypeColor(colors, key, fallback) {
  if (key === "auto") return null;
  const token = colors.find((c) => String(c.id) === String(key));
  return token ? token.hex : fallback;
}
/* Resolution lives in bookBuilder.js so the screen and the PDF cannot answer
   differently — the whole reason the page-background control was screen-only
   is that this view resolved it privately and nothing else could. */
const resolveBg = (colors, key) => resolvePageBg(colors, key);

/* ------------------------------------------------------------ Section */

/* Always-open — the <details> collapse is gone. A closed panel with only a
   label is a memory test, not a control ("they are hidden and my first
   thought was 'I have no idea what this is'" — CLAUDE.md), so every section
   renders its heading and its body at once. */
function Section({ title, children }) {
  return (
    <div className="bbb-section">
      <h2 className="bbb-section__title">{title}</h2>
      <div className="bbb-section__body">{children}</div>
    </div>
  );
}

/* Chip row for a small, closed choice set — Sheet, Edge space. One aria-pressed
   button per option, reusing the app's chip visual language (border-subtle /
   radius / bg-muted+text-primary when selected — see .bbb-chip in
   brand-book-builder.css). */
function ChipRow({ label, options, value, onChange }) {
  return (
    <div className="bbb-field">
      <p className="bbb-microhead">{label}</p>
      <div className="bbb-chip-row" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className="bbb-chip"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Pill toggle for "Going to a print shop" — same print.bleed field the old
   checkbox wrote, new control. */
function PillToggle({ id, label, checked, onChange }) {
  return (
    <div className="bbb-field bbb-field--checkbox">
      <label htmlFor={id}>{label}</label>
      <button
        id={id}
        type="button"
        className="bbb-pill-toggle"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="bbb-pill-knob" aria-hidden="true" />
      </button>
    </div>
  );
}

/* The book's own words, editable from the book.
   The panel above this edits how the book LOOKS — fonts, palette, page
   backgrounds. Its words lived in other views entirely, so writing the book
   meant leaving it. These fields write to exactly the answers the PDF is
   built from, so an edit here changes the page beside it and the file the
   client receives, with nothing to sync.

   Rows are derived from PAGE_FIELDS rather than listed again here — the same
   declaration the page prints from — so a field cannot end up printable and
   uneditable, or editable and never printed.

   Empty fields are shown, not hidden. A page that is missing because you have
   not answered for it yet is exactly the thing you need to see in order to
   answer; hiding the input until content exists is the chicken-and-egg version
   of the collapsed-panel problem. */
function BookTextFields({ pageId, x, onChange }) {
  const rows = (PAGE_FIELDS[pageId] || []).filter((f) => !f.editedElsewhere);
  if (!rows.length) return null;
  return (
    <>
      {rows.map((f) => {
        const id = `bbb-txt-${pageId}-${f.field}`;
        return (
          <div className="bbb-field" key={f.field}>
            <label htmlFor={id}>{f.label}</label>
            <textarea
              id={id}
              className="bbb-textarea"
              rows={2}
              value={readField(f, x)}
              onChange={(e) => onChange(f, e.target.value)}
            />
          </div>
        );
      })}
    </>
  );
}

/* --------------------------------------------------------- TokenSelect */
/* Shared control for anything that binds to a color token: page
   backgrounds ("white" + tokens) and type colors ("auto" + tokens). */

function TokenSelect({ id, label, value, onChange, colors, noneValue, noneLabel }) {
  return (
    <div className="bbb-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={noneValue}>{noneLabel}</option>
        {colors.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------ GridOverlay */

function GridOverlay({ columns, rows, gutter, show }) {
  if (!show) return null;
  const cells = Array.from({ length: Math.max(1, columns) * Math.max(1, rows) });
  return (
    <div
      className="bbb-grid-overlay bbb-grid-overlay--show"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: `${gutter}%` }}
    >
      {cells.map((_, i) => <div key={i} className="bbb-gcol" />)}
    </div>
  );
}

/* ------------------------------------------------------------- Pages */
/* Each page is a pure function of props derived from top-level state,
   so the exact same component renders identically in the normal grid
   and inside the flipbook -- no duplicated logic, no cloned markup. */

function FrontCover({ kit, style, id }) {
  const { name, tagline, headlineHex, accent, bodyHex, hStack, bStack, headlineSize, headlineWeight, bodyWeight, bg, dark, grid } = kit;
  return (
    <div id={id} className="bbb-page bbb-page--cover" data-dark={dark || undefined} style={{ background: bg, ...style }}>
      <span className="bbb-page-label">Front cover</span>
      <GridOverlay {...grid} />
      <div className="bbb-cover-rule" style={{ background: accent }} />
      <p className="bbb-cover-name" style={{ fontFamily: hStack, fontWeight: headlineWeight, fontSize: `${headlineSize}pt`, color: headlineHex }}>{name}</p>
      <p className="bbb-cover-tagline" style={{ fontFamily: bStack, fontWeight: bodyWeight, color: bodyHex || undefined }}>{tagline}</p>
    </div>
  );
}

/* pageIndex is passed in rather than fixed: with content pages between the
   cover and the back, a hard-coded 0/1 would repeat page numbers and put the
   alternating margins on the wrong side. Defaults keep the old behaviour if
   this page is ever rendered on its own. */
function ColorsPage({ kit, style, pageIndex = 0, id }) {
  const { colors, bg, dark, grid, running, swatchCols } = kit;
  return (
    <div id={id} className="bbb-page bbb-page--colors" data-dark={dark || undefined} style={{ background: bg, ...style }}>
      <span className="bbb-page-label">Color page</span>
      <GridOverlay {...grid} />
      <RunningHeader {...running} pageIndex={pageIndex} />
      <p className="bbb-ph-title">Color palette</p>
      <div className="bbb-swatch-grid" style={{ gridTemplateColumns: `repeat(${swatchCols}, 1fr)` }}>
        {colors.slice(0, 6).map((c) => {
          const light = isLight(c.hex);
          return (
            <div key={c.id} className="bbb-swatch" style={{ background: c.hex }}>
              <span className="bbb-swatch__label" style={{ color: light ? "#2a2a28" : "#f4f1ea" }}>
                {c.name} &middot; {c.hex.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
      <RunningFooter {...running} pageIndex={pageIndex} />
      <PageNum {...running} pageIndex={pageIndex} />
    </div>
  );
}

function TypePage({ kit, style, pageIndex = 1, id }) {
  const { headlineHex, subheadHex, bodyHex, hStack, bStack, headlineSize, headlineWeight, subheadSize, subheadWeight, bodySize, bodyWeight, bg, dark, grid, running } = kit;
  return (
    <div id={id} className="bbb-page bbb-page--type" data-dark={dark || undefined} style={{ background: bg, ...style }}>
      <span className="bbb-page-label">Type page</span>
      <GridOverlay {...grid} />
      <RunningHeader {...running} pageIndex={pageIndex} />
      <p className="bbb-ph-title">Typography</p>
      <p className="bbb-type-headline" style={{ fontFamily: hStack, fontWeight: headlineWeight, fontSize: `${headlineSize}pt`, color: headlineHex }}>Headline / H1</p>
      <p className="bbb-type-sub" style={{ fontFamily: hStack, fontWeight: subheadWeight, fontSize: `${subheadSize}pt`, color: subheadHex }}>Subhead &mdash; secondary emphasis</p>
      <p className="bbb-type-body" style={{ fontFamily: bStack, fontWeight: bodyWeight, fontSize: `${bodySize}pt`, color: bodyHex || undefined }}>
        Body text sits here. This paragraph exists to show line length, leading, and color at actual reading size, the way it will appear throughout the guide.
      </p>
      <RunningFooter {...running} pageIndex={pageIndex} />
      <PageNum {...running} pageIndex={pageIndex} />
    </div>
  );
}

/* The logo page, drawn the way the PDF draws it.
   Until this existed, the book on screen had pages for Colour and Type but
   none for Logo — so the lockups the client receives were the one page you
   could not check before sending. It mirrors the PDF's Logo section: the
   wordmark set on four grounds, the construction box around the real artwork
   (or the monogram when there is none), the clearspace/min-size spec, and the
   project's own don't list. `monogramFor` is shared with the PDF rather than
   reimplemented, so the two cannot letter the monogram differently. */
function LogoPage({ kit, style, pageIndex = 0, id }) {
  const { name, colors, accent, hStack, bStack, headlineWeight, bg, dark, grid, running, logo } = kit;
  const wordmark = logo.wordmark || name;
  const mono = monogramFor(wordmark);

  /* The same four grounds the PDF uses: paper, ink, accent, black. Drawn from
     the project's palette so the page moves when the palette does. */
  const inkHex = colors[0]?.hex || "#1a1a1a";
  const grounds = ["#ffffff", inkHex, accent || colors[1]?.hex || inkHex, "#000000"];

  return (
    <div id={id} className="bbb-page bbb-page--logo" data-dark={dark || undefined} style={{ background: bg, ...style }}>
      <span className="bbb-page-label">Logo page</span>
      <GridOverlay {...grid} />
      <RunningHeader {...running} pageIndex={pageIndex} />
      <p className="bbb-ph-title" style={{ fontFamily: hStack, fontWeight: headlineWeight }}>Logo</p>

      <div className="bbb-lockup-grid">
        {grounds.map((ground, i) => (
          <div key={i} className="bbb-lockup" style={{ background: ground }}>
            <span
              className="bbb-lockup__mark"
              style={{ fontFamily: hStack, fontWeight: headlineWeight, color: isLight(ground) ? "#1a1a1a" : "#f4f1ea" }}
            >
              {mono} {wordmark}
            </span>
          </div>
        ))}
      </div>

      <div className="bbb-logo-spec">
        <div className="bbb-logo-construct">
          {/* Deferred: multiple image wells (alternate lockups/marks) — not
              built. One logo image only, same as before. */}
          {logo.image ? (
            <img src={logo.image} alt="" className="bbb-logo-construct__art" />
          ) : (
            <span className="bbb-logo-construct__mono" style={{ fontFamily: hStack, fontWeight: headlineWeight }}>{mono}</span>
          )}
          <span className="bbb-logo-construct__inset" aria-hidden="true" />
        </div>
        <p className="bbb-logo-spec__text" style={{ fontFamily: bStack }}>
          {[logo.clearspace, logo.minSize].filter(Boolean).join(" ")}
        </p>
      </div>

      {logo.donts.length > 0 && (
        <div className="bbb-logo-donts">
          <span className="bbb-logo-donts__label" style={{ fontFamily: bStack }}>Don&rsquo;t</span>
          <div className="bbb-logo-donts__pills">
            {logo.donts.map((t) => (
              <span key={t} className="bbb-logo-dont" style={{ fontFamily: bStack }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      <RunningFooter {...running} pageIndex={pageIndex} />
      <PageNum {...running} pageIndex={pageIndex} />
    </div>
  );
}

/* One renderer for every content page. The pages differ by what the project
   holds, not by layout, so a component each would be eight copies of the same
   thing drifting apart — the defect this codebase already knows well. Type
   and colour come from the same `kit` the cover and type pages read, so a
   font or ink change moves the whole book at once. */
function ContentPage({ kit, page, pageIndex, style, id }) {
  const { headlineHex, subheadHex, bodyHex, hStack, bStack, subheadSize, subheadWeight, bodySize, bodyWeight, headlineWeight, bg, dark, grid, running } = kit;
  const bodyStyle = { fontFamily: bStack, fontWeight: bodyWeight, fontSize: `${bodySize}pt`, color: bodyHex || undefined };
  return (
    <div id={id} className={`bbb-page bbb-page--content bbb-page--${page.id}`} data-dark={dark || undefined} style={{ background: bg, ...style }}>
      <span className="bbb-page-label">{page.label}</span>
      <GridOverlay {...grid} />
      <RunningHeader {...running} pageIndex={pageIndex} />
      <p className="bbb-ph-title" style={{ fontFamily: hStack, fontWeight: headlineWeight, color: headlineHex }}>{page.label}</p>
      <p className="bbb-ph-sub" style={{ fontFamily: bStack, fontWeight: bodyWeight, color: subheadHex }}>{page.sub}</p>
      <div className="bbb-content-body">
        {page.blocks.map((b, i) => {
          if (b.kind === "prose") return <p key={i} className="bbb-content-prose" style={bodyStyle}>{b.text}</p>;
          if (b.kind === "list") return (
            <ul key={i} className="bbb-content-list" style={bodyStyle}>
              {b.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          );
          if (b.kind === "group") return (
            <div key={i} className="bbb-content-group">
              <p className="bbb-content-group-title" style={{ fontFamily: hStack, fontWeight: subheadWeight, fontSize: `${subheadSize}pt`, color: subheadHex }}>{b.title}</p>
              {b.rows.map((r, j) => (
                <div key={j} className="bbb-content-field">
                  <p className="bbb-content-label" style={{ fontFamily: bStack, color: subheadHex }}>{r.label}</p>
                  <p className="bbb-content-text" style={bodyStyle}>{r.text}</p>
                </div>
              ))}
            </div>
          );
          return (
            <div key={i} className="bbb-content-field">
              <p className="bbb-content-label" style={{ fontFamily: bStack, color: subheadHex }}>{b.label}</p>
              <p className="bbb-content-text" style={bodyStyle}>{b.text}</p>
            </div>
          );
        })}
      </div>
      <RunningFooter {...running} pageIndex={pageIndex} />
      <PageNum {...running} pageIndex={pageIndex} />
    </div>
  );
}

function BackCover({ kit, style, id }) {
  const { name, headlineHex, hStack, headlineWeight, bg, dark, grid } = kit;
  return (
    <div id={id} className="bbb-page bbb-page--back" data-dark={dark || undefined} style={{ background: bg, ...style }}>
      <span className="bbb-page-label">Back cover</span>
      <GridOverlay {...grid} />
      <p className="bbb-back-mark" style={{ fontFamily: hStack, fontWeight: headlineWeight, color: headlineHex }}>{name}</p>
    </div>
  );
}

/* -------------------------------------------------- running elements */

function mirrorAlign(align, flip) {
  if (!flip) return align;
  if (align === "left") return "right";
  if (align === "right") return "left";
  return align;
}

function RunningHeader({ show, text, align, alternate, pageIndex, bStack }) {
  if (!show) return null;
  const isEven = (pageIndex + 1) % 2 === 0;
  return <div className="bbb-running-header" style={{ fontFamily: bStack, textAlign: mirrorAlign(align, alternate && isEven) }}>{text}</div>;
}
function RunningFooter({ showFooter, footerText, footerAlign, alternate, pageIndex, bStack }) {
  if (!showFooter) return null;
  const isEven = (pageIndex + 1) % 2 === 0;
  return <div className="bbb-running-footer" style={{ fontFamily: bStack, textAlign: mirrorAlign(footerAlign, alternate && isEven) }}>{footerText}</div>;
}
function PageNum({ showPageNumbers, alternate, pageIndex }) {
  if (!showPageNumbers) return null;
  const num = pageIndex + 1;
  const isEven = num % 2 === 0;
  const side = alternate && isEven ? { left: "var(--space-md, 9%)", right: "auto" } : { right: "var(--space-md, 9%)", left: "auto" };
  return <div className="bbb-page-num" style={side}>{num}</div>;
}

/* ------------------------------------------------------------ Flipbook */

/* Flip overlay reskin: the top-right × is gone — Close is a labelled button
   in the same control row as Back/Next, so the whole "how do I move / how do
   I leave" decision lives in one place instead of two. Pages are the SAME
   elements the canvas renders (cloned only to re-key their anchor id, so the
   canvas and the overlay never carry the same id twice at once) — never a
   duplicated page component. */
function Flipbook({ open, onClose, pages, index, setIndex }) {
  if (!open) return null;
  const total = pages.length;
  return (
    <div className="bbb-flip-overlay bbb-flip-overlay--show">
      <div className="bbb-flip-stage">
        {pages.map((PageEl, i) => (
          <div
            key={i}
            className="bbb-flip-page"
            style={{ zIndex: i < index ? i : total - i, transform: i < index ? "rotateY(-178deg)" : "rotateY(0deg)" }}
          >
            {React.cloneElement(PageEl, {
              id: PageEl.props.id ? `flip-${PageEl.props.id}` : undefined,
            })}
          </div>
        ))}
      </div>
      <div className="bbb-flip-controls">
        <button type="button" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>&larr; Back</button>
        <span className="bbb-flip-controls__count">{index + 1} of {total}</span>
        <button type="button" disabled={index === total - 1} onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}>Next &rarr;</button>
        <button type="button" className="bbb-flip-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- ColorRow */

function ColorRow({ color, onChange, onRemove, canRemove }) {
  return (
    <div className="bbb-color-row">
      <input type="color" value={color.hex} onChange={(e) => onChange({ ...color, hex: e.target.value })} />
      <input type="text" value={color.name} onChange={(e) => onChange({ ...color, name: e.target.value })} />
      <span className="bbb-color-row__hex">{color.hex.toUpperCase()}</span>
      <button
        type="button"
        aria-label="Remove color"
        onClick={onRemove}
        disabled={!canRemove}
        title={canRemove ? undefined : `${MIN_COLORS} colors is the minimum`}
      >
        &times;
      </button>
    </div>
  );
}

/* ============================================================= MAIN */

export default function BrandBookBuilderView() {
  const activeProject = useAppStore((s) =>
    s.projects.find((p) => p.id === s.currentProjectId)
  )
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const moodItems = useAppStore((s) => s.moodItems)
  const setBookBuilder = useAppStore((s) => s.setBookBuilder)
  const setPaletteTokens = useAppStore((s) => s.setPaletteTokens)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const updateDetective = useAppStore((s) => s.updateDetective)
  const renameProject = useAppStore((s) => s.renameProject)

  const project = activeProject || {}
  const bb = bookBuilderFor(project)

  /* The client IS the project's identity — this box renames the project
     itself rather than keeping a second, competing name for the same thing. */
  const brandName = project.detective?.clientName || project.name || ''
  const setBrandName = (v) => {
    if (project.id) renameProject(project.id, v)
  }
  const tagline = project.tagline || ''
  const setTagline = (v) => updateBrandField('tagline', v)

  /* Wrappers matching the owner's setter signatures, so the markup below is
     unchanged from their file while the values live in the store. */
  const patch = (key) => (fn) =>
    setBookBuilder({ [key]: typeof fn === 'function' ? fn(bb[key]) : fn })
  const setTypeColor = patch('typeColor')
  const setPageBg = patch('pageBg')
  const setGrid = patch('grid')
  const setRunning = patch('running')
  const setPrintSettings = patch('print')

  const setType = (field) => (value) =>
    setBookBuilder({ type: { ...bb.type, [field]: value } })

  /* Font choices are the project's real type fields, so Identity and the book
     can never name different faces. Stored in the existing label shape
     ("Fraunces SemiBold") — no schema change, all existing readers keep working. */
  const headingLabel = project.typeHeading || ''
  const bodyLabel = project.typeBody || ''
  const parsedHeading = parseLabel(headingLabel)
  const parsedBody = parseLabel(bodyLabel)
  const headlineFont = familyByName(parsedHeading.family)
    ? parsedHeading.family
    : bb.type.headlineFont
  const bodyFont = familyByName(parsedBody.family)
    ? parsedBody.family
    : bb.type.bodyFont
  const headlineWeight = bb.type.headlineWeight
  const bodyWeight = bb.type.bodyWeight

  const setHeadlineFont = (v) => {
    setBookBuilder({ type: { ...bb.type, headlineFont: v } })
    updateBrandField('typeHeading', labelFor(v, headlineWeight))
  }
  const setBodyFont = (v) => {
    setBookBuilder({ type: { ...bb.type, bodyFont: v } })
    updateBrandField('typeBody', labelFor(v, bodyWeight))
  }
  const setHeadlineWeight = (v) => {
    setBookBuilder({ type: { ...bb.type, headlineWeight: v } })
    updateBrandField('typeHeading', labelFor(headlineFont, v))
  }
  const setBodyWeight = (v) => {
    setBookBuilder({ type: { ...bb.type, bodyWeight: v } })
    updateBrandField('typeBody', labelFor(bodyFont, v))
  }

  const headlineSize = bb.type.headlineSize
  const setHeadlineSize = setType('headlineSize')
  const subheadSize = bb.type.subheadSize
  const setSubheadSize = setType('subheadSize')
  const subheadWeight = bb.type.subheadWeight
  const setSubheadWeight = setType('subheadWeight')
  const bodySize = bb.type.bodySize
  const setBodySize = setType('bodySize')

  const typeColor = bb.typeColor
  const pageBg = bb.pageBg
  const grid = bb.grid
  const running = bb.running
  const printSettings = bb.print

  /* Fetch whatever families are named, so the pages render the real faces
     rather than silently falling back to the UI font. */
  useEffect(() => {
    loadBrandFamilies([
      labelFor(headlineFont, headlineWeight),
      labelFor(bodyFont, bodyWeight),
    ])
  }, [headlineFont, headlineWeight, bodyFont, bodyWeight])

  const colors = readPaletteTokens(project)

  const [flipOpen, setFlipOpen] = useState(false);
  const [flipIndex, setFlipIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState('');

  const updateColor = (idx, next) =>
    setPaletteTokens(colors.map((c, i) => (i === idx ? next : c)))
  const removeColor = (idx) =>
    setPaletteTokens(colors.filter((_, i) => i !== idx))
  const addColor = () =>
    setPaletteTokens([
      ...colors,
      { id: mintTokenId(), name: 'New token', hex: '#888888' },
    ])

  /* ---- derived values, recomputed every render (mirrors the vanilla render()) ---- */

  const primary = colors[0]?.hex || "#2B3A55";
  const accent = colors[1]?.hex || "#C77B4B";
  const headlineHex = resolveTypeColor(colors, typeColor.headline, primary) || primary;
  const subheadHex = resolveTypeColor(colors, typeColor.subhead, accent) || accent;
  const bodyHex = resolveTypeColor(colors, typeColor.body, null);
  const hStack = fontStack(headlineFont, "serif");
  const bStack = fontStack(bodyFont, "sans-serif");
  const swatchCols = Math.min(6, Math.max(2, Math.round(grid.columns / 2)));
  const dims = PAGE_SIZES[printSettings.pageSize];
  const bleedIn = printSettings.bleed ? 0.125 : 0;
  const marginIn = (grid.margin / 100) * dims.w;

  /* The active Edge chip: an explicit choice if one was ever made, else the
     stop the current margin reads closest to — display-only, never written
     back (see bookBuilderFor's no-migration read of grid.edge). */
  const activeEdge = grid.edge || nearestEdgeStop(grid.margin, printSettings.pageSize);

  /* The top-bar setup line, stated from the real settings — never a fixed
     string. e.g. "A4 · Standard edge · print-shop bleed on". */
  const setupSummary = `${dims.label.split(' (')[0]} · ${EDGE_STOPS[activeEdge].label} edge · ${
    printSettings.bleed ? 'print-shop bleed on' : 'no bleed'
  }`;

  const runningProps = { show: running.show, text: (running.text.trim() || brandName), align: running.align,
    showFooter: running.showFooter, footerText: (running.footerText.trim() || tagline), footerAlign: running.footerAlign,
    showPageNumbers: running.showPageNumbers, alternate: running.alternate, bStack };

  /* The book on screen is built from the same pack the PDF is exported from,
     not from the raw project. Reading the project directly was half of why the
     two could disagree about what the project contained. */
  const pack = currentBrandPack({
    project: activeProject,
    projectId: currentProjectId,
    moodItems,
  });

  /* Read from the pack, so the page on screen is set from exactly what the
     PDF will be given — not from a second reading of the project. */
  const logoKit = {
    wordmark: (pack.logoWordmark || '').trim(),
    image: pack.logoImage || '',
    clearspace: (pack.logoClearspace || '').trim() || DEFAULT_LOGO_CLEARSPACE,
    minSize: (pack.logoMinSize || '').trim() || DEFAULT_LOGO_MIN_SIZE,
    donts: logoDontsList(pack),
  };

  /* The same resolved inputs the page prints from, so the editor shows what
     will actually appear rather than a copy of it. */
  const bookX = bookPlan(pack).inputs;

  /* One writer for both homes. Which store a book answer lives in is not
     guessable from its name — Story, USP and tone of voice are on the brief,
     the rest are on the project — and writing to the wrong one silently does
     nothing, because the read prefers the other. PAGE_FIELDS carries the
     answer so no call site has to know. */
  const writeBookField = (f, value) =>
    f.scope === 'detective' ? updateDetective(f.field, value) : updateBrandField(f.field, value);

  const kit = {
    logo: logoKit,
    name: brandName, tagline, headlineHex, subheadHex, bodyHex, accent, colors, swatchCols,
    hStack, bStack, headlineSize, headlineWeight, subheadSize, subheadWeight, bodySize, bodyWeight,
    grid: { columns: grid.columns, rows: grid.rows, gutter: grid.gutter, show: grid.show },
    running: runningProps,
  };

  /* Deferred: overflow ("spilled") detection — a page that runs past its
     sheet is not flagged in this view. Not built. */
  const { pages: contentPages, omitted: omittedPages } = paginatedBookPages(pack);

  const bgFor = (pageId) => {
    const hex = resolveBg(colors, pageBg[pageId]);
    return { bg: hex, dark: !isLight(hex) };
  };

  const gridMarginVar = { "--space-md": `${grid.margin}%` };

  const printCss = `
    @page{size:${(dims.w + bleedIn * 2).toFixed(3)}in ${(dims.h + bleedIn * 2).toFixed(3)}in;margin:0}
    @media print{
      .bbb-panel,.bbb-page-label,.bbb-grid-overlay{display:none!important}
      body{background:#fff}
      .bbb-canvas{padding:0;gap:0;display:block}
      .bbb-page{box-shadow:none;page-break-after:always;break-after:page;
        width:${(dims.w + bleedIn * 2).toFixed(3)}in;height:${(dims.h + bleedIn * 2).toFixed(3)}in;
        padding:${marginIn.toFixed(3)}in}
      /* Same reason as the on-screen rule: a content page that runs long
         flows onto the next sheet rather than having its tail cut off. */
      .bbb-page--content{height:auto;min-height:${(dims.h + bleedIn * 2).toFixed(3)}in}
    }
  `;

  /* One book. This used to window.print() the on-screen preview cards — but
     those cards are budgeted to ~9 lines each for a ~320px thumbnail, so
     printing one full sheet per card produced a sparse ~54-page book, a
     different and worse artifact than Deliver's "Brand book PDF". Both now go
     through the same vector generator, so there is exactly one brand book and
     the page count the client receives is the one the export reports. The
     builder's own page-size / bleed controls still drive it, mapped to the
     book setup the generator resolves. */
  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    setExportNote('')
    const book = {
      pageSize: printSettings.pageSize,
      edgeSpace: 'standard',
      printShop: !!printSettings.bleed,
    }
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready
      const res = await downloadBrandPackVectorPdf(pack, null, { book })
      if (res.ok) {
        // The true count of the deliverable, named at the one moment it
        // answers a real question — how big is the file I just made.
        setExportNote(
          res.pages ? `Saved · ${res.pages}-page PDF` : 'Saved · brand book PDF'
        )
      } else if (res.cancelled) {
        setExportNote('Save cancelled — no problem')
      } else {
        setExportNote(res.error || 'Export didn’t finish — try again?')
      }
    } catch (e) {
      setExportNote(e?.message || 'Export didn’t finish — try again?')
    } finally {
      setExporting(false)
    }
  }

  /* The order is READ from the plan, never written out here. It used to be a
     literal list, and when the PDF was rebuilt to the Harbor & Hearth layout
     this copy kept printing the old book — different pages, different order —
     while a comment above it claimed the two matched. `bookSectionIds` gives
     the numbered sections; foundations come before them and the appendix
     after, exactly as the PDF prints them.

     `color` and `type` render from the builder's own controls rather than
     from prose, so they are drawn here directly. Content pages share the type
     page's background rather than adding a control of their own — a per-page
     background picker is one more decision to make the same answer to. */
  /* Deferred: per-page lock toggles and ↑/↓ reorder — not built. The order
     below is entirely plan-derived; there is no per-page control yet. */
  const pagesFor = (id) =>
    contentPages.filter((pg) => pg.sectionId === id);

  const inner = [];
  const pushContent = (pg) =>
    inner.push((i) => <ContentPage key={pg.id} page={pg} pageIndex={i} kit={{ ...kit, ...bgFor("pageType") }} style={gridMarginVar} />);

  contentPages.filter((pg) => pg.kind === "foundation").forEach(pushContent);

  bookSectionIds(pack).forEach((id) => {
    if (id === "color") { inner.push((i) => <ColorsPage key="colors" pageIndex={i} kit={{ ...kit, ...bgFor("pageColors") }} style={gridMarginVar} />); return; }
    if (id === "type") { inner.push((i) => <TypePage key="type" pageIndex={i} kit={{ ...kit, ...bgFor("pageType") }} style={gridMarginVar} />); return; }
    /* Logo draws its lockups first, then any notes the project holds — the
       visual page is what the client receives, the notes are the detail
       behind it. */
    if (id === "logo") inner.push((i) => <LogoPage key="logo" pageIndex={i} kit={{ ...kit, ...bgFor("pageType") }} style={gridMarginVar} />);
    pagesFor(id).forEach(pushContent);
  });

  contentPages.filter((pg) => pg.kind === "appendix").forEach(pushContent);

  /* Anchor ids for the page rail (in this book -> jump the canvas to that
     page). One id per position in `pageElements`, assigned after the fact
     rather than threaded through every push above, so the numbering can
     never drift from what actually renders. */
  const innerElements = inner.map((render, i) => render(i));
  const pageElements = [
    <FrontCover key="cover" id="bbb-anchor-0" kit={{ ...kit, ...bgFor("pageCover") }} style={gridMarginVar} />,
    ...innerElements.map((el, i) => React.cloneElement(el, { id: `bbb-anchor-${i + 1}` })),
    <BackCover key="back" id={`bbb-anchor-${innerElements.length + 1}`} kit={{ ...kit, ...bgFor("pageBack") }} style={gridMarginVar} />,
  ];

  return (
    <div className="bbb-root">
      <style>{printCss}</style>

      {/* In-view chrome, not the app header (which already carries back
          navigation). Left: nothing. Center-left: the real setup, stated as
          a sentence rather than left to be inferred from control positions.
          Right: the two actions that used to sit at the bottom of the
          panel, a full scroll away — "Flip through it" opens the existing
          flipbook, "Print / save as PDF" is the existing export. */}
      <div className="bbb-topbar">
        <span className="bbb-topbar__summary">{setupSummary}</span>
        <div className="bbb-topbar__actions">
          <button type="button" className="bbb-btn" onClick={() => { setFlipIndex(0); setFlipOpen(true); }}>
            Flip through it
          </button>
          <button type="button" className="bbb-btn bbb-btn--primary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Making the PDF…' : 'Print / save as PDF'}
          </button>
          {exportNote && (
            <span className="bbb-topbar__note" aria-live="polite">{exportNote}</span>
          )}
        </div>
      </div>

      <div className="bbb-body">
      <div className="bbb-panel">
        <h1 className="bbb-panel__title">Brand book &mdash; source of truth</h1>

        {/* Named for what's inside rather than "Identity": the app's third
            path stop is already called that, and the heading is the only
            clue to what a section holds. */}
        <Section title="Name &amp; tagline">
          <div className="bbb-field">
            <label htmlFor="bbb-brandName">Brand name</label>
            <input id="bbb-brandName" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          </div>
          <div className="bbb-field">
            <label htmlFor="bbb-tagline">Tagline</label>
            <input id="bbb-tagline" type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
        </Section>

        {/* Sheet / Edge space / print-shop bleed — the three controls the
            top-bar summary states as a sentence. Named stops replace the old
            free-typed margin percent ("named stops, not number fields"). */}
        <Section title="Setup">
          <ChipRow
            label="Sheet"
            value={printSettings.pageSize}
            onChange={(v) => setPrintSettings((p) => ({ ...p, pageSize: v }))}
            options={Object.entries(PAGE_SIZES).map(([id, v]) => ({ id, label: v.label.split(' (')[0] }))}
          />
          <ChipRow
            label="Edge space"
            value={activeEdge}
            onChange={(v) => setGrid((g) => ({ ...g, edge: v }))}
            options={EDGE_ORDER.map((id) => ({ id, label: EDGE_STOPS[id].label }))}
          />
          <PillToggle
            id="bbb-printShop"
            label="Going to a print shop"
            checked={printSettings.bleed}
            onChange={(v) => setPrintSettings((p) => ({ ...p, bleed: v }))}
          />
          <p className="bbb-hint">Print shop adds a 0.125in bleed so a trimmed edge keeps full colour.</p>
        </Section>

        {/* The book's words, one section per page it prints on, in the order
            the book runs. Derived from the plan and from PAGE_FIELDS rather
            than listed here, so a page added to the book brings its inputs
            with it instead of being editable nowhere.

            Only pages that hold typed answers appear — Colour and Typography
            are drawn from the controls below, and the agreed brief and
            applications list are composed from elsewhere, so none of them has
            words to type here. */}
        {/* Derived from the DECLARED pages, not the ones that currently exist.
            Deriving from the live plan looked right and was the chicken-and-egg
            version of the same bug: a page appears only once it holds an
            answer, so Brand Voice, Our Audience and Imagery had no inputs
            until they had content, and no way to be given any. The section for
            an unanswered page is exactly the one you need. */}
        {[...FOUNDATION_PAGES, ...SECTION_PAGES, ...APPENDIX_PAGES].map((pg) => {
          const rows = (PAGE_FIELDS[pg.id] || []).filter((f) => !f.editedElsewhere);
          if (!rows.length) return null;
          return (
            <Section key={pg.id} title={pg.title || pg.name || pg.label}>
              <BookTextFields pageId={pg.id} x={bookX} onChange={writeBookField} />
            </Section>
          );
        })}

        <Section title="Colors">
          <div className="bbb-color-list">
            {colors.map((c, i) => (
              <ColorRow
                key={c.id}
                color={c}
                onChange={(next) => updateColor(i, next)}
                onRemove={() => removeColor(i)}
                canRemove={colors.length > MIN_COLORS}
              />
            ))}
          </div>
          <button type="button" className="bbb-btn" onClick={addColor} disabled={colors.length >= MAX_COLORS}>+ add color token</button>
          {colors.length >= MAX_COLORS && (
            <p className="bbb-hint">{MAX_COLORS} is the maximum &mdash; remove one to add another.</p>
          )}
          {/* Deferred: Style presets (Style chips) — not built. Colours are
              set one token at a time, no starting-point palettes. */}
        </Section>

        {/* Fine-tuning, grouped under one section rather than five — each
            still gets its own micro-head, but nothing here is a decision
            you need on arrival the way Setup and Colors are. */}
        <Section title="Advanced">
          <p className="bbb-microhead">Type scale</p>
          <div className="bbb-field">
            <label htmlFor="bbb-headlineFont">Headline font</label>
            <FontSelect id="bbb-headlineFont" value={headlineFont} onChange={setHeadlineFont} />
          </div>
          <div className="bbb-field-row">
            <div className="bbb-field">
              <label htmlFor="bbb-headlineSize">Size (pt)</label>
              <input id="bbb-headlineSize" type="text" inputMode="decimal" value={headlineSize} onChange={(e) => setHeadlineSize(e.target.value)} />
            </div>
            <div className="bbb-field">
              <label htmlFor="bbb-headlineWeight">Weight</label>
              <select id="bbb-headlineWeight" value={headlineWeight} onChange={(e) => setHeadlineWeight(e.target.value)}>
                <option value="400">Regular</option><option value="500">Medium</option>
                <option value="600">Semibold</option><option value="700">Bold</option>
              </select>
            </div>
          </div>
          <div className="bbb-field-row">
            <div className="bbb-field">
              <label htmlFor="bbb-subheadSize">Subhead size (pt)</label>
              <input id="bbb-subheadSize" type="text" inputMode="decimal" value={subheadSize} onChange={(e) => setSubheadSize(e.target.value)} />
            </div>
            <div className="bbb-field">
              <label htmlFor="bbb-subheadWeight">Subhead weight</label>
              <select id="bbb-subheadWeight" value={subheadWeight} onChange={(e) => setSubheadWeight(e.target.value)}>
                <option value="400">Regular</option><option value="500">Medium</option>
                <option value="600">Semibold</option><option value="700">Bold</option>
              </select>
            </div>
          </div>
          <div className="bbb-field">
            <label htmlFor="bbb-bodyFont">Body font</label>
            <FontSelect id="bbb-bodyFont" value={bodyFont} onChange={setBodyFont} />
          </div>
          <div className="bbb-field-row">
            <div className="bbb-field">
              <label htmlFor="bbb-bodySize">Size (pt)</label>
              <input id="bbb-bodySize" type="text" inputMode="decimal" value={bodySize} onChange={(e) => setBodySize(e.target.value)} />
            </div>
            <div className="bbb-field">
              <label htmlFor="bbb-bodyWeight">Weight</label>
              <select id="bbb-bodyWeight" value={bodyWeight} onChange={(e) => setBodyWeight(e.target.value)}>
                <option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option>
              </select>
            </div>
          </div>
          <p className="bbb-hint">Sizes shown in points, same unit InDesign uses. If the real font is installed locally (e.g. via Adobe Fonts), it&apos;s used automatically over the web-font copy.</p>

          <p className="bbb-microhead">Type color</p>
          <TokenSelect id="bbb-colorHeadline" label="Headline" value={typeColor.headline} colors={colors}
            noneValue="auto" noneLabel="Auto" onChange={(v) => setTypeColor((t) => ({ ...t, headline: v }))} />
          <TokenSelect id="bbb-colorSubhead" label="Subhead" value={typeColor.subhead} colors={colors}
            noneValue="auto" noneLabel="Auto" onChange={(v) => setTypeColor((t) => ({ ...t, subhead: v }))} />
          <TokenSelect id="bbb-colorBody" label="Body" value={typeColor.body} colors={colors}
            noneValue="auto" noneLabel="Auto" onChange={(v) => setTypeColor((t) => ({ ...t, body: v }))} />
          <p className="bbb-hint">&quot;Auto&quot; tracks sensible defaults (headline &rarr; primary, subhead &rarr; accent, body &rarr; adapts to light/dark pages). Pick a token to lock it instead.</p>

          <p className="bbb-microhead">Page backgrounds</p>
          <TokenSelect id="bbb-bgCover" label="Front cover" value={pageBg.pageCover} colors={colors}
            noneValue="white" noneLabel="White" onChange={(v) => setPageBg((p) => ({ ...p, pageCover: v }))} />
          <TokenSelect id="bbb-bgColors" label="Color page" value={pageBg.pageColors} colors={colors}
            noneValue="white" noneLabel="White" onChange={(v) => setPageBg((p) => ({ ...p, pageColors: v }))} />
          <TokenSelect id="bbb-bgType" label="Type page" value={pageBg.pageType} colors={colors}
            noneValue="white" noneLabel="White" onChange={(v) => setPageBg((p) => ({ ...p, pageType: v }))} />
          <TokenSelect id="bbb-bgBack" label="Back cover" value={pageBg.pageBack} colors={colors}
            noneValue="white" noneLabel="White" onChange={(v) => setPageBg((p) => ({ ...p, pageBack: v }))} />
          <p className="bbb-hint">Backgrounds reference a color token, same as everything else &mdash; rename or delete that token and the page follows.</p>

          <p className="bbb-microhead">Grid guides</p>
          <div className="bbb-field">
            <label htmlFor="bbb-gridColumns">Columns</label>
            <input id="bbb-gridColumns" type="text" inputMode="numeric" value={grid.columns} onChange={(e) => setGrid((g) => ({ ...g, columns: Number(e.target.value) || 1 }))} />
          </div>
          <div className="bbb-field">
            <label htmlFor="bbb-gridRows">Rows</label>
            <input id="bbb-gridRows" type="text" inputMode="numeric" value={grid.rows} onChange={(e) => setGrid((g) => ({ ...g, rows: Number(e.target.value) || 1 }))} />
          </div>
          <div className="bbb-field">
            <label htmlFor="bbb-gridGutter">Gutter (%)</label>
            <input id="bbb-gridGutter" type="text" inputMode="decimal" value={grid.gutter} onChange={(e) => setGrid((g) => ({ ...g, gutter: Number(e.target.value) || 0 }))} />
          </div>
          <div className="bbb-field bbb-field--checkbox">
            <input id="bbb-showGrid" type="checkbox" checked={grid.show} onChange={(e) => setGrid((g) => ({ ...g, show: e.target.checked }))} />
            <label htmlFor="bbb-showGrid">Show grid guides</label>
          </div>
          <p className="bbb-hint">Rows and columns share one gutter value; the edge itself is set by Edge space, above. The color page&apos;s swatch columns derive from this column count.</p>

          <p className="bbb-microhead">Running elements</p>
          <div className="bbb-field bbb-field--checkbox">
            <input id="bbb-showHeader" type="checkbox" checked={running.show} onChange={(e) => setRunning((r) => ({ ...r, show: e.target.checked }))} />
            <label htmlFor="bbb-showHeader">Show header</label>
          </div>
          <div className="bbb-field">
            <input type="text" placeholder="Defaults to brand name" value={running.text} onChange={(e) => setRunning((r) => ({ ...r, text: e.target.value }))} />
          </div>
          <div className="bbb-field">
            <label htmlFor="bbb-headerAlign">Header alignment</label>
            <select id="bbb-headerAlign" value={running.align} onChange={(e) => setRunning((r) => ({ ...r, align: e.target.value }))}>
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
          </div>
          <div className="bbb-field bbb-field--checkbox">
            <input id="bbb-showFooter" type="checkbox" checked={running.showFooter} onChange={(e) => setRunning((r) => ({ ...r, showFooter: e.target.checked }))} />
            <label htmlFor="bbb-showFooter">Show footer</label>
          </div>
          <div className="bbb-field">
            <input type="text" placeholder="Defaults to tagline" value={running.footerText} onChange={(e) => setRunning((r) => ({ ...r, footerText: e.target.value }))} />
          </div>
          <div className="bbb-field">
            <label htmlFor="bbb-footerAlign">Footer alignment</label>
            <select id="bbb-footerAlign" value={running.footerAlign} onChange={(e) => setRunning((r) => ({ ...r, footerAlign: e.target.value }))}>
              <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
            </select>
          </div>
          <div className="bbb-field bbb-field--checkbox">
            <input id="bbb-showPageNumbers" type="checkbox" checked={running.showPageNumbers} onChange={(e) => setRunning((r) => ({ ...r, showPageNumbers: e.target.checked }))} />
            <label htmlFor="bbb-showPageNumbers">Show page numbers</label>
          </div>
          <div className="bbb-field bbb-field--checkbox">
            <input id="bbb-alternatePages" type="checkbox" checked={running.alternate} onChange={(e) => setRunning((r) => ({ ...r, alternate: e.target.checked }))} />
            <label htmlFor="bbb-alternatePages">Alternate for facing pages</label>
          </div>
          <p className="bbb-hint">These sit on interior pages only &mdash; covers stay clean.</p>
        </Section>

        {/* The book's spine — its sections by name, so a glance says "yes,
            that's a brand book" rather than a raw page number.
            Deliberately NOT "Pages · N": that count was the on-screen preview
            cards (each ~9 lines), which roughly doubled the real exported PDF —
            a number that meant nothing to a time-blind reader except a false
            "this is bloated" alarm. The true page count now appears once, on
            the export itself, where it answers a real question. A run of
            continuation pages collapses to a single named entry — the Agreed
            brief is one line, "record", not the thing that dominates the
            felt length. Open by default: a collapsed label is a memory test. */}
        {/* The book's spine, now with each in-book entry an anchor that
            scrolls the canvas to that page — per-page lock and ↑/↓ reorder
            would attach to this same row and are deferred, not built. */}
        <Section title="In this book">
          <ul className="bbb-pagelist">
            {pageElements
              .map((el) => ({
                id: el.props.id,
                label: el.props.page ? el.props.page.label : BUILTIN_PAGE_LABELS[el.key],
              }))
              .filter((m, i, arr) => m.label && m.label !== arr[i - 1]?.label)
              .map((m) => (
                <li key={m.id} className="bbb-pagelist__in">
                  <a
                    href={`#${m.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(m.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    {m.label}
                  </a>
                </li>
              ))}
          </ul>
          {omittedPages.length > 0 && (
            <>
              <p className="bbb-pagelist__head">Not in the book yet</p>
              <ul className="bbb-pagelist">
                {omittedPages.map((o) => (
                  <li key={o.id} className="bbb-pagelist__out">
                    <span>{o.label}</span>
                    <span className="bbb-pagelist__needs">needs {o.needs}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      </div>

      <div className="bbb-canvas">
        {pageElements}
      </div>
      </div>

      <Flipbook open={flipOpen} onClose={() => setFlipOpen(false)} pages={pageElements} index={flipIndex} setIndex={setFlipIndex} />
    </div>
  );
}
