import React, { useEffect, useState, useRef } from 'react'
import useAppStore from '../store/useAppStore'
import { labelForView, labelForStepId } from '../lib/journey/journey'
import Workroom from '../components/Workroom'
import {
  bookBuilderFor,
  readPaletteTokens,
  resolvePageBg,
  EDGE_STOPS,
  marginPercentForEdge,
  projectBookSetup,
  EDGE_ORDER,
} from '../lib/book/bookBuilder'
import { paginatedBookPages, PAGE_FIELDS, readField, APPENDIX_PAGES, fieldHome, FIELD_HOMES } from '../lib/book/bookContent'
import { currentBrandPack } from '../lib/book/currentPack'
import { downloadBrandPackVectorPdf } from '../lib/book/exportFiles'
import { bookSectionIds, bookPlan, FOUNDATION_PAGES, SECTION_PAGES } from '../lib/book/bookDocument'
import { labelFor, parseLabel, familyByName } from '../lib/book/fontCatalog'
import { monogramFor, logoDontsList, DEFAULT_LOGO_CLEARSPACE, DEFAULT_LOGO_MIN_SIZE } from '../lib/brandSystem'
import { loadBrandFamilies } from '../lib/book/fontLoader'
import { useModalFocus } from '../lib/useModalFocus'
import { applyBrandCssVars, clearBrandCssVars } from '../lib/brandCssVars'
import {
  touchpointsFor,
  touchpointLabel,
} from '../lib/journey/touchpoints'
import TouchpointMockThumb from '../components/TouchpointMockThumb'
import '../styles/brand-book-builder.css'
/* Application mock geometry (shared with Touchpoints) */
import '../styles/lazy-sketch.css'

/* Overflow detection component to flag when page content exceeds boundaries */
function OverflowDetector({ children, onOverflow, id }) {
  const containerRef = useRef(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const onOverflowRef = useRef(onOverflow)
  onOverflowRef.current = onOverflow

  useEffect(() => {
    const observeResize = () => {
      if (!containerRef.current) return

      // Check if content overflows vertically
      const isOverflowing =
        containerRef.current.scrollHeight > containerRef.current.clientHeight
      setHasOverflow(isOverflowing)

      if (onOverflowRef.current) {
        onOverflowRef.current(isOverflowing)
      }
    }

    let resizeObserver
    try {
      resizeObserver = new ResizeObserver(observeResize)
      resizeObserver.observe(containerRef.current)
      observeResize()
    } catch (err) {
      console.warn('ResizeObserver not supported:', err)
      observeResize()
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="bbb-overflow-detector" id={id}>
      {children}
      {hasOverflow && (
        <div className="bbb-overflow-indicator">
          <span role="img" aria-label="Content overflows page">
            ↓
          </span>
          <span className="sr-only">Content overflows page boundary</span>
        </div>
      )}
    </div>
  )
}

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
/* Only the two covers live here now. The section pages name themselves from
   SECTION_PAGES (see `sectionName` where `inner` is built) rather than being
   looked up by React key in a map that had to be kept in step by hand — and
   was not: `logo` and `apps` were missing from it, which is how users came to
   see `bbb-anchor-1` and `bbb-anchor-4` in their own contents list. */
const BUILTIN_PAGE_LABELS = { cover: "Front cover", back: "Back cover" };

/**
 * What to call a page in "In this book".
 *
 * One function, used by both the row and the collapse-consecutive check, so
 * the two can never disagree about what a page is called.
 *
 * The tail is deliberate: a page with no name is a bug either way, but
 * "Untitled page" is one a user can report, and `bbb-anchor-4` is one they
 * cannot.
 */
function labelForPageEl(pageEl) {
  return (
    pageEl?.props?.pageLabel ||
    pageEl?.props?.page?.label ||
    BUILTIN_PAGE_LABELS[pageEl?.key] ||
    'Untitled page'
  )
}
const PAGE_SIZES = { letter: { w: 8.5, h: 11, label: "Letter (8.5 × 11 in)" }, a4: { w: 8.27, h: 11.69, label: "A4 (210 × 297 mm)" } };

/* ------------------------------------------------------------- helpers */

/* One picker for both headline and body, so the two can never drift apart
   the way the old pair of literals did. */

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

/* Collapsible rail sections (prototype Brand Kit). Open sections use the
   native `open` attribute so React does not warn about defaultOpen on DOM. */
function Section({ title, children, defaultOpen = false }) {
  return (
    <details className="bbb-section" {...(defaultOpen ? { open: true } : {})}>
      <summary className="bbb-section__summary">
        <span className="bbb-section__title">{title}</span>
        <span className="bbb-section__toggle" aria-hidden="true" />
      </summary>
      <div className="bbb-section__body">{children}</div>
    </details>
  )
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
   backgrounds. This shows the WORDS the pages print.

   READ-ONLY, WITH A ROUTE. It used to render an editable textarea per field,
   which made the builder a fourth place to type the same fact: the client
   answers in the brief, the designer sharpens it on Identity's direction
   sheet, and then a third box here wrote to whichever store the read happened
   to prefer. Nothing on screen said which box the PDF would use. (Owner,
   2026-08-08: the builder is an OUTPUT surface, not another authoring
   location.)

   So each row states the resolved value — the same `readField` the page
   prints from, so this cannot disagree with the PDF — names where that answer
   is written, and takes you there in one press.

   Empty fields are still SHOWN, not hidden. A page that is missing because
   nobody has answered for it is exactly the thing you need to see in order to
   go and answer it; hiding the row until content exists is the
   chicken-and-egg version of the collapsed-panel problem.

   Rows are derived from PAGE_FIELDS — the same declaration the page prints
   from — so a field cannot end up printable and invisible here. */
function BookTextFields({ pageId, x, onOpen }) {
  const rows = (PAGE_FIELDS[pageId] || []).filter((f) => !f.editedElsewhere);
  if (!rows.length) return null;
  return (
    <>
      {rows.map((f) => {
        const value = readField(f, x);
        const home = fieldHome(f);
        return (
          <div className="bbb-field bbb-read" key={f.field}>
            <span className="bbb-read-label">{f.label}</span>
            {/* An unanswered line reads as WAITING, not as content — the same
                em-dash rule the direction sheet follows. */}
            <p className={`bbb-read-value${value ? '' : ' is-empty'}`}>
              {value || '—'}
            </p>
            {home && onOpen && (
              <button
                type="button"
                className="text-link bbb-read-link"
                onClick={() => onOpen(home.view, home.section)}
              >
                {value ? `Edit on ${home.label}` : `Write it on ${home.label}`}
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}

/* A brand fact the book PRINTS but does not OWN.
   Same shape as `BookTextFields` because it is the same rule: the book is an
   output surface, and an output may not author a decision. These three —
   name, tagline, and the two faces — were the last places it did. */
function BookOwnedElsewhere({ label, value, homeLabel, onOpen }) {
  return (
    <div className="bbb-field bbb-read">
      <span className="bbb-read-label">{label}</span>
      <p className={`bbb-read-value${value ? '' : ' is-empty'}`}>
        {value || '—'}
      </p>
      {onOpen && (
        <button type="button" className="text-link bbb-read-link" onClick={onOpen}>
          {value ? `Edit on ${homeLabel}` : `Write it on ${homeLabel}`}
        </button>
      )}
    </div>
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
  const { colors, bg, dark, grid, running, swatchCols, roleColors } = kit
  const swatches = colors.slice(0, 6)
  const roles = roleColors || []
  return (
    <div
      id={id}
      className="bbb-page bbb-page--colors"
      data-dark={dark || undefined}
      style={{ background: bg, ...style }}
    >
      <span className="bbb-page-label">Color page</span>
      <GridOverlay {...grid} />
      <RunningHeader {...running} pageIndex={pageIndex} />
      <p className="bbb-ph-title">Color palette</p>
      {roles.length > 0 && (
        <div className="bbb-role-swatches" aria-label="Brand colour roles">
          {roles.map((r) => {
            const light = isLight(r.hex)
            return (
              <div
                key={r.id}
                className="bbb-role-swatch"
                style={{ background: r.hex }}
              >
                <span
                  className="bbb-role-swatch__name"
                  style={{ color: light ? '#2a2a28' : '#f4f1ea' }}
                >
                  {r.name}
                </span>
                <span
                  className="bbb-role-swatch__hex"
                  style={{ color: light ? '#2a2a28' : '#f4f1ea' }}
                >
                  {String(r.hex || '').toUpperCase()}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <div
        className="bbb-swatch-grid"
        style={{
          gridTemplateColumns: `repeat(${Math.min(swatchCols, Math.max(2, swatches.length))}, 1fr)`,
        }}
      >
        {swatches.map((c) => {
          const light = isLight(c.hex)
          return (
            <div
              key={c.id}
              className="bbb-swatch"
              style={{ background: c.hex || '#e7e7e7' }}
            >
              <span
                className="bbb-swatch__label"
                style={{ color: light ? '#2a2a28' : '#f4f1ea' }}
              >
                {c.name} &middot; {String(c.hex || '').toUpperCase()}
              </span>
            </div>
          )
        })}
      </div>
      <RunningFooter {...running} pageIndex={pageIndex} />
      <PageNum {...running} pageIndex={pageIndex} />
    </div>
  )
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
            {logo.image ? (
              <img
                src={logo.image}
                alt=""
                className="bbb-lockup__art"
              />
            ) : (
              <span
                className="bbb-lockup__mark"
                style={{
                  fontFamily: hStack,
                  fontWeight: headlineWeight,
                  color: isLight(ground) ? '#1a1a1a' : '#f4f1ea',
                }}
              >
                {mono} {wordmark}
              </span>
            )}
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
          {/* One line per rule — joining with spaces made clearspace + min-size
              + usage read as a single run-on sentence on the flip page. */}
          {[
            logo.clearspace || DEFAULT_LOGO_CLEARSPACE,
            logo.minSize || DEFAULT_LOGO_MIN_SIZE,
          ]
            .filter(Boolean)
            .map((line) => (
              <span key={line} className="bbb-logo-spec__line">
                {line}
              </span>
            ))}
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

/**
 * Applications — live mocks (logo + palette + wordmark), not a bare bullet list.
 * Same touchpoint keys the PDF draws so screen and deliverable stay aligned.
 */
function AppsPage({ kit, style, pageIndex = 0, id, touchpoints = [], project }) {
  const {
    bg,
    dark,
    grid,
    running,
    hStack,
    bStack,
    headlineWeight,
    headlineHex,
    subheadHex,
    bodyHex,
    bodyWeight,
    bodySize,
  } = kit
  const palette = (kit.colors || []).map((c) => c.hex).filter(Boolean)
  const list =
    Array.isArray(touchpoints) && touchpoints.length
      ? touchpoints
      : ['businessCard', 'social', 'packaging', 'signage']

  return (
    <div
      id={id}
      className="bbb-page bbb-page--apps"
      data-dark={dark || undefined}
      style={{ background: bg, ...style }}
    >
      <span className="bbb-page-label">Applications</span>
      <GridOverlay {...grid} />
      <RunningHeader {...running} pageIndex={pageIndex} />
      <p
        className="bbb-ph-title"
        style={{ fontFamily: hStack, fontWeight: headlineWeight, color: headlineHex }}
      >
        Brand in use
      </p>
      <p
        className="bbb-ph-sub"
        style={{
          fontFamily: bStack,
          fontWeight: bodyWeight,
          color: subheadHex,
        }}
      >
        Applications
      </p>
      <div className="bbb-apps-grid">
        {list.map((tpId) => (
          <div key={tpId} className="bbb-apps-card">
            <TouchpointMockThumb
              id={tpId}
              project={project}
              palette={palette}
            />
            <span
              className="bbb-apps-card__label"
              style={{
                fontFamily: bStack,
                fontSize: `${Math.max(7, Number(bodySize) || 10)}pt`,
                color: bodyHex || undefined,
              }}
            >
              {touchpointLabel(tpId)}
            </span>
          </div>
        ))}
      </div>
      <RunningFooter {...running} pageIndex={pageIndex} />
      <PageNum {...running} pageIndex={pageIndex} />
    </div>
  )
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

/* Open book: left = verso (back of previous leaf), right = recto (front).
   Both faces are upright page content — never a CSS rotateY mirror of the
   same sheet (that was the "mirror image" bug). Cover opens on the right
   alone, like a real book. Pages are still the canvas elements, re-keyed. */
function Flipbook({ open, onClose, pages, index, setIndex }) {
  /* Hooks run before the early returns below — an overlay that mounts and
     unmounts must not change hook order on the way. */
  const overlayRef = useRef(null)
  /* The only way out used to be finding the Close button with a mouse: no
     Escape, no focus management, while claiming aria-modal to a screen
     reader. This is a genuine modal (it covers the builder), so it gets the
     real pattern rather than the label for it. */
  useModalFocus(open, () => overlayRef.current, {
    initialSelector: '.bbb-flip-close-btn',
    onClose,
  })

  if (!open) return null
  const total = pages.length
  if (!total) return null
  /* `index` is the right-hand (recto) page. Left is the previous page. */
  const rightIndex = Math.min(Math.max(0, index), total - 1)
  const leftIndex = rightIndex > 0 ? rightIndex - 1 : null
  const leftPage = leftIndex != null ? pages[leftIndex] : null
  const rightPage = pages[rightIndex]

  const clonePage = (el, side, pageI) =>
    React.cloneElement(el, {
      id: el.props.id ? `flip-${side}-${el.props.id}` : `flip-${side}-${pageI}`,
      key: `${side}-${pageI}`,
    })

  return (
    <div
      ref={overlayRef}
      className="bbb-flip-overlay bbb-flip-overlay--show"
      role="dialog"
      aria-modal="true"
      aria-label="Brand book flip through"
    >
      <div
        className={`bbb-flip-stage${leftPage ? ' bbb-flip-stage--spread' : ' bbb-flip-stage--cover'}`}
      >
        {leftPage ? (
          <div className="bbb-flip-leaf bbb-flip-leaf--verso" aria-label={`Page ${leftIndex + 1}`}>
            {clonePage(leftPage, 'verso', leftIndex)}
          </div>
        ) : (
          <div className="bbb-flip-leaf bbb-flip-leaf--empty" aria-hidden="true" />
        )}
        <div className="bbb-flip-gutter" aria-hidden="true" />
        <div className="bbb-flip-leaf bbb-flip-leaf--recto" aria-label={`Page ${rightIndex + 1}`}>
          {clonePage(rightPage, 'recto', rightIndex)}
        </div>
      </div>
      <div className="bbb-flip-controls">
        <button
          type="button"
          disabled={rightIndex === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          &larr; Back
        </button>
        <span className="bbb-flip-controls__count">
          {leftIndex != null
            ? `${leftIndex + 1}–${rightIndex + 1} of ${total}`
            : `${rightIndex + 1} of ${total}`}
        </span>
        <button
          type="button"
          disabled={rightIndex >= total - 1}
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
        >
          Next &rarr;
        </button>
        <button type="button" className="bbb-flip-close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}


/* ============================================================= MAIN */

/**
 * Where a missing page gets filled in.
 *
 * `omitted` entries already carry the id of the section they came from, and
 * `bookContent` already knows what each is waiting for — the only thing
 * missing was the last hop. Keyed on the section id so a renamed label cannot
 * break it, and unmatched ids simply render as text rather than a dead
 * control, which is the honest failure for a page nobody has mapped yet.
 *
 * Values are VIEW IDS, never labels. Writing "Identity" here would be a
 * second copy of a name journey.js owns, free to drift the first time a stop
 * is renamed — journeySingleSource.test.js greps for exactly that and caught
 * this map doing it. `labelForView` derives the words at render.
 */
const GAP_DESTINATION = {
  logo: 'brand',
  color: 'brand',
  type: 'brand',
  voice: 'brand',
  story: 'project',
  audience: 'project',
  /* 'brief', not 'agreed' — APPENDIX_PAGES names the page "Agreed brief" but
     ids it `brief`, and guessing from the label left that row as dead text.
     Caught by counting actionable rows against omitted rows rather than by
     reading the map. */
  brief: 'project',
  imagery: 'studio',
  usage: 'flow',
  handoff: 'finish',
}

export default function BrandBookBuilderView({
  setActiveView,
  workroomLauncherRef = null,
  goSystemSection,
  pathCtx = null,
  journeyNext = null,
}) {
  const activeProject = useAppStore((s) =>
    s.projects.find((p) => p.id === s.currentProjectId)
  )
  const currentProjectId = useAppStore((s) => s.currentProjectId)
  const moodItems = useAppStore((s) => s.moodItems)
  const setBookBuilder = useAppStore((s) => s.setBookBuilder)

  const project = activeProject || {}
  const bb = bookBuilderFor(project)

  /* The client IS the project's identity — this box renames the project
     itself rather than keeping a second, competing name for the same thing. */
  const brandName = project.detective?.clientName || project.name || ''
  const tagline = project.tagline || ''

  /* Wrappers matching the owner's setter signatures, so the markup below is
     unchanged from their file while the values live in the store. */
  const patch = (key) => (fn) =>
    setBookBuilder({ [key]: typeof fn === 'function' ? fn(bb[key]) : fn })
  const setTypeColor = patch('typeColor')
  const setPageBg = patch('pageBg')
  const setGrid = patch('grid')
  const setRunning = patch('running')
  /* Page setup writes the canonical top-level keys, not `print`/`grid.edge`.
     Those were this surface's half of the two-home split — the Builder kept
     its own trim while every client-facing consumer read `prefs.book*`. */
  const setBookSetup = (p) => setBookBuilder(p)

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

  /* THE FACES ARE THE BRAND'S, NOT THE BOOK'S.
     These four setters used to write `typeHeading` / `typeBody`, so picking a
     face for the document renamed the brand's typeface — the Type bench and
     the book were two authors of one decision. The families are now shown and
     routed; weight stays a document control and writes only `bb.type`, which
     is what the PDF renders with. `headlineFont`/`bodyFont` still resolve from
     the brand label first, so the book keeps printing the brand's faces. */
  const setHeadlineWeight = (v) => {
    setBookBuilder({ type: { ...bb.type, headlineWeight: v } })
  }
  const setBodyWeight = (v) => {
    setBookBuilder({ type: { ...bb.type, bodyWeight: v } })
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
  /* The project's page setup — the same three values the PDF, the package
     and the delivery resolve through `projectBookSetup`. */
  const printSettings = { pageSize: bb.pageSize, bleed: bb.printShop }

  /* Fetch whatever families are named, so the pages render the real faces
     rather than silently falling back to the UI font. */
  useEffect(() => {
    loadBrandFamilies([
      labelFor(headlineFont, headlineWeight),
      labelFor(bodyFont, bodyWeight),
    ])
  }, [headlineFont, headlineWeight, bodyFont, bodyWeight])

  /* Palette → CSS tokens so page previews and shell can share brand colours. */
  useEffect(() => {
    applyBrandCssVars(activeProject)
    return () => clearBrandCssVars()
  }, [activeProject, activeProject?.palette, activeProject?.colorRoles])

  const colors = readPaletteTokens(project)

  const [flipOpen, setFlipOpen] = useState(false);
  const [flipIndex, setFlipIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState('');
  /* Optional lock/reorder — only set when the user acts. Empty means natural
     book order (pageElements as built). Never auto-write empty order back to
     the store on open: that wiped the canvas and could loop set→effect→set. */
  const [lockedPages, setLockedPages] = useState(() => {
    const saved = project?.bookBuilder?.pageLocking?.lockedPages
    return new Set(Array.isArray(saved) ? saved : [])
  })
  const [pageOrder, setPageOrder] = useState(() => {
    const saved = project?.bookBuilder?.pageOrder
    return Array.isArray(saved) && saved.length > 0 ? saved : []
  })
  const lockOrderHydratedFor = useRef(project?.id ?? null)

  /* Re-hydrate lock/order only when switching projects. */
  useEffect(() => {
    const id = project?.id ?? null
    if (lockOrderHydratedFor.current === id) return
    lockOrderHydratedFor.current = id
    const saved = project?.bookBuilder
    const savedLock = saved?.pageLocking?.lockedPages
    const savedOrder = saved?.pageOrder
    setLockedPages(new Set(Array.isArray(savedLock) ? savedLock : []))
    setPageOrder(Array.isArray(savedOrder) && savedOrder.length > 0 ? savedOrder : [])
  }, [project?.id, project?.bookBuilder])

  const persistLockOrder = (nextLock, nextOrder) => {
    if (!project?.id) return
    setBookBuilder({
      pageLocking: { lockedPages: Array.from(nextLock) },
      pageOrder: nextOrder,
    })
  }

  /* Page locking and ordering helpers */
  const togglePageLock = (pageId) => {
    setLockedPages((prev) => {
      const next = new Set(prev)
      if (next.has(pageId)) next.delete(pageId)
      else next.add(pageId)
      persistLockOrder(next, pageOrder)
      return next
    })
  }

  const movePageUp = (pageId, fallbackOrder = []) => {
    setPageOrder((prev) => {
      const base = prev.length ? [...prev] : [...fallbackOrder]
      if (!base.includes(pageId)) return prev.length ? prev : base
      const index = base.indexOf(pageId)
      if (index <= 0) return base
      ;[base[index], base[index - 1]] = [base[index - 1], base[index]]
      persistLockOrder(lockedPages, base)
      return base
    })
  }

  const movePageDown = (pageId, fallbackOrder = []) => {
    setPageOrder((prev) => {
      const base = prev.length ? [...prev] : [...fallbackOrder]
      if (!base.includes(pageId)) return prev.length ? prev : base
      const index = base.indexOf(pageId)
      if (index < 0 || index >= base.length - 1) return base
      ;[base[index], base[index + 1]] = [base[index + 1], base[index]]
      persistLockOrder(lockedPages, base)
      return base
    })
  }

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
  /* The active Edge chip reads the canonical value directly. It used to fall
     back to a nearest-stop guess off `grid.margin` — the GUIDE-overlay
     number, a different quantity the PDF never used for its content margin. */
  const activeEdge = bb.edgeSpace;

  /* PAGE PADDING ON SCREEN = PAGE MARGIN IN THE PDF.
     This was `(grid.margin / 100) * dims.w` — the guide-overlay percentage,
     derived from an edge table that disagreed with the generator's by 2-3mm
     per stop. `marginPercentForEdge` now resolves through the same
     BOOK_EDGE_SPACE points `resolveBookSetup` uses, so what is proofed here
     is the edge that prints. `grid.margin` keeps its own job: the guides. */
  const edgePercent = marginPercentForEdge(activeEdge, printSettings.pageSize);
  const marginIn = (edgePercent / 100) * dims.w;

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

  /* Take me to where this answer is written.
     Replaces `writeBookField`, which wrote a third copy of facts the brief
     and Identity already own. Identity targets go through `goSystemSection`
     so the sub-screen resolution and the deep-link highlight are the ones
     `resolveIdentitySubstep` already defines — spelling a substep id here
     would be a second map to keep in step. */
  const openFieldHome = (view, section) => {
    if (view === 'brand' && typeof goSystemSection === 'function') {
      goSystemSection(section || null);
      return;
    }
    setActiveView?.(view);
  };

  /* Primary / Accent / Ink / Paper from roles + named tokens for the colour page. */
  const roleColors = (() => {
    const roles = {
      ...Object.fromEntries(
        (colors || []).map((c) => [String(c.name || '').toLowerCase(), c.hex])
      ),
    }
    const cr = project.colorRoles || {}
    const pick = (name, roleKey, fallbackIdx) => ({
      id: name,
      name,
      hex:
        (cr[roleKey] && String(cr[roleKey])) ||
        roles[name.toLowerCase()] ||
        colors[fallbackIdx]?.hex ||
        '#888888',
    })
    return [
      pick('Primary', 'cover', 0),
      pick('Accent', 'accent', 1),
      pick('Ink', 'text', 2),
      pick('Paper', 'quiet', 3),
    ].filter((r) => r.hex)
  })()

  const appsTouchpoints = touchpointsFor(
    pack.brandSurfaces,
    pack.detective?.deliverablesPicked || pack.deliverablesPicked
  )

  const kit = {
    logo: logoKit,
    name: brandName,
    tagline,
    headlineHex,
    subheadHex,
    bodyHex,
    accent,
    colors,
    roleColors,
    swatchCols,
    hStack,
    bStack,
    headlineSize,
    headlineWeight,
    subheadSize,
    subheadWeight,
    bodySize,
    bodyWeight,
    grid: {
      columns: grid.columns,
      rows: grid.rows,
      gutter: grid.gutter,
      show: grid.show,
    },
    running: runningProps,
  }

  /* Deferred: overflow ("spilled") detection — a page that runs past its
     sheet is not flagged in this view. Not built. */
  const { pages: contentPages, omitted: omittedPages } = paginatedBookPages(pack);

  const bgFor = (pageId) => {
    const hex = resolveBg(colors, pageBg[pageId]);
    return { bg: hex, dark: !isLight(hex) };
  };

  /* The page's own padding var — the canonical edge, not the guide number. */
  const gridMarginVar = { "--space-md": `${edgePercent}%` };

  const sheetW = (dims.w + bleedIn * 2).toFixed(3)
  const sheetH = (dims.h + bleedIn * 2).toFixed(3)
  const padIn = marginIn.toFixed(3)
  const printCss = `
    @page{size:${sheetW}in ${sheetH}in;margin:0}
    @media print{
      html.bbb-printing .bbb-topbar,
      html.bbb-printing .bbb-panel,
      html.bbb-printing .bbb-pagelist,
      html.bbb-printing .bbb-page-label,
      html.bbb-printing .bbb-grid-overlay,
      html.bbb-printing .bbb-flip-overlay,
      html.bbb-printing .header-redesign,
      html.bbb-printing .journey-sidebar,
      html.bbb-printing .step-rail,
      html.bbb-printing .app-footer,
      html.bbb-printing .todo-fab{display:none!important}
      html.bbb-printing body,
      html.bbb-printing .app,
      html.bbb-printing .app-shell,
      html.bbb-printing .main{background:#fff!important;margin:0!important;padding:0!important}
      html.bbb-printing .bbb-root,
      html.bbb-printing .bbb-body,
      html.bbb-printing .bbb-canvas{
        display:block!important;padding:0!important;gap:0!important;margin:0!important;
        width:100%!important;max-width:none!important;background:#fff!important
      }
      html.bbb-printing .bbb-page{
        box-shadow:none!important;page-break-after:always;break-after:page;
        width:${sheetW}in!important;height:${sheetH}in!important;
        min-height:${sheetH}in!important;max-width:none!important;
        padding:${padIn}in!important;margin:0!important;overflow:visible!important;
        aspect-ratio:auto!important
      }
      html.bbb-printing .bbb-page--content{height:auto!important;min-height:${sheetH}in!important}
    }
  `;

  /* Print uses the live canvas + @media print (A4/roomy from Setup chips).
     Vector PDF remains the high-fidelity download path when the OS print
     dialog is not enough — same pack, same geometry, one source of truth. */
  const handlePrint = () => {
    setExportNote('')
    /* class on root so print CSS can hide chrome without fighting React. */
    document.documentElement.classList.add('bbb-printing')
    const cleanup = () => {
      document.documentElement.classList.remove('bbb-printing')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.setTimeout(() => {
      try {
        window.print()
      } catch {
        cleanup()
        setExportNote('Print dialog didn’t open — try again?')
      }
    }, 50)
  }

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    setExportNote('')
    /* Derived once, in the module every other consumer uses, so the Builder's
       own download cannot describe the page differently from the package,
       the kit or the client's copy. */
    const book = projectBookSetup(project)
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready
      const res = await downloadBrandPackVectorPdf(pack, null, { book })
      if (res.ok) {
        setExportNote(
          res.pages ? `Saved · ${res.pages}-page PDF` : 'Saved · brand book PDF'
        )
      } else if (res.cancelled) {
        setExportNote('Save cancelled')
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

  /* The "In this book" list used to name pages by looking their React key up
     in a hand-written map of four entries. Two of the pages it has to name —
     logo and apps — were never in that map, so they fell through to a second
     lookup that could not match anything (it strips `bbb-anchor-` off the id,
     leaving a NUMBER, and searches a map keyed by names) and then to the raw
     id. Users saw `bbb-anchor-1` and `bbb-anchor-4` in their own contents
     list, which is an internal id in a document they present to a client.

     Carrying the label on the element removes the guess entirely: the name
     comes from SECTION_PAGES, the same source the page itself is built from,
     so a new section cannot arrive unnamed and a rename cannot drift. */
  const sectionName = (id) =>
    SECTION_PAGES.find((s) => s.id === id)?.name || null;

  contentPages.filter((pg) => pg.kind === "foundation").forEach(pushContent);

  bookSectionIds(pack).forEach((id) => {
    if (id === 'color') {
      inner.push((i) => (
        <ColorsPage
          key="colors"
          pageLabel={sectionName('color')}
          pageIndex={i}
          kit={{ ...kit, ...bgFor('pageColors') }}
          style={gridMarginVar}
        />
      ))
      return
    }
    if (id === 'type') {
      inner.push((i) => (
        <TypePage
          key="type"
          pageLabel={sectionName('type')}
          pageIndex={i}
          kit={{ ...kit, ...bgFor('pageType') }}
          style={gridMarginVar}
        />
      ))
      return
    }
    /* Logo draws lockups first; prose notes from PAGE_FIELDS follow. */
    if (id === 'logo') {
      inner.push((i) => (
        <LogoPage
          key="logo"
          pageLabel={sectionName('logo')}
          pageIndex={i}
          kit={{ ...kit, ...bgFor('pageType') }}
          style={gridMarginVar}
        />
      ))
      pagesFor(id).forEach(pushContent)
      return
    }
    /* Applications: mock grid (live identity), not a bare bullet list. */
    if (id === 'apps') {
      inner.push((i) => (
        <AppsPage
          key="apps"
          pageLabel={sectionName('apps')}
          pageIndex={i}
          kit={{ ...kit, ...bgFor('pageType') }}
          style={gridMarginVar}
          touchpoints={appsTouchpoints}
          project={project}
        />
      ))
      return
    }
    pagesFor(id).forEach(pushContent)
  })

  contentPages.filter((pg) => pg.kind === "appendix").forEach(pushContent);

  /* Anchor ids for the page rail (in this book -> jump the canvas to that
     page). One id per position in `pageElements`, assigned after the fact
     rather than threaded through every push above, so the numbering can
     never drift from what actually renders. */
  /* pageIndex must match the page's place in the finished book (cover = 0).
     The old path passed 0..n only for inner pages, so Logo (page 2 of N)
     printed "1" while the flip controls said "2 of N". */
  const pageElements = [
    <OverflowDetector key="cover" id="bbb-anchor-0">
      <FrontCover
        key="cover"
        id="bbb-anchor-0"
        pageIndex={0}
        kit={{ ...kit, ...bgFor('pageCover') }}
        style={gridMarginVar}
      />
    </OverflowDetector>,
    ...inner.map((render, i) => {
      const el = render(i + 1)
      const anchorId = `bbb-anchor-${i + 1}`
      return (
        <OverflowDetector key={`content-${i}`} id={anchorId}>
          {React.cloneElement(el, { id: anchorId })}
        </OverflowDetector>
      )
    }),
    <OverflowDetector key="back" id={`bbb-anchor-${inner.length + 1}`}>
      <BackCover
        key="back"
        id={`bbb-anchor-${inner.length + 1}`}
        pageIndex={inner.length + 1}
        kit={{ ...kit, ...bgFor('pageBack') }}
        style={gridMarginVar}
      />
    </OverflowDetector>,
  ];

  /* Id may live on the OverflowDetector wrapper or the page child. The
     reorder work only set child ids, so the map was always empty and the
     canvas rendered zero pages. */
  const pageNodeId = (el) => {
    if (!el?.props) return null
    if (el.props.id) return el.props.id
    const child = el.props.children
    if (child?.props?.id) return child.props.id
    return null
  }

  const pageElementMap = new Map()
  pageElements.forEach((el) => {
    const id = pageNodeId(el)
    if (id) pageElementMap.set(id, el)
  })

  const naturalIds = pageElements.map(pageNodeId).filter(Boolean)
  /* Saved order when the user reordered; otherwise natural cover→…→back. */
  const effectiveOrder =
    pageOrder.length > 0
      ? [
          ...pageOrder.filter((id) => naturalIds.includes(id)),
          ...naturalIds.filter((id) => !pageOrder.includes(id)),
        ]
      : naturalIds

  const orderedPageElements = effectiveOrder
    .map((id) => pageElementMap.get(id))
    .filter(Boolean)
  const canvasPages =
    orderedPageElements.length > 0 ? orderedPageElements : pageElements

  return (
    /* THE BUILDER MOVES ONTO THE STAGE, UNCHANGED.
       `book` is stop 6 (DESIGN_GRAMMAR G1) and was the only one still
       rendering into the page shell, so it kept the global header while the
       other six hid it — two navigation models for one path.

       Wrapped, not rewritten. Everything below this line is the same tree it
       was; the stage supplies what it was missing (path edge, exit, ledge,
       stage identity) and `brand-book-workroom` hands the plane's height and
       scrolling back to `.bbb-root`, which has owned them since it was built
       to fill `.main`. Nesting the plane's scroller inside the builder's own
       is the stacked-scroller failure the stage exists to prevent.

       No visible masthead on purpose: the builder's top bar is already this
       stop's masthead, and a second heading over it would be the duplication
       this pass removes. Workroom still renders the stop's `sr-only` h1, so
       the accessible heading is present either way. */
    <Workroom
      stepId="book"
      project={activeProject}
      pathCtx={pathCtx}
      setActiveView={setActiveView}
      launcherRef={workroomLauncherRef}
      className="brand-book-workroom"
      status={labelForStepId('book')}
      ledge={
        <button
          type="button"
          className="btn btn-primary work-path-next"
          onClick={() => setActiveView?.(journeyNext?.view || 'finish')}
        >
          {`Next · ${journeyNext?.label || labelForStepId('deliver')}`}
        </button>
      }
    >
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
          <button type="button" className="bbb-btn bbb-btn--primary" onClick={handlePrint}>
            Print / save as PDF
          </button>
          <button
            type="button"
            className="bbb-btn"
            onClick={handleExport}
            disabled={exporting}
            title="Download a vector PDF (same live project values)"
          >
            {exporting ? 'Making the PDF…' : 'Download PDF'}
          </button>
          {exportNote && (
            <span className="bbb-topbar__note" aria-live="polite">{exportNote}</span>
          )}
        </div>
      </div>

      <div className="bbb-body">
        <div className="bbb-panel">
        {/* Derived. This is a path stop now, so its heading is its stop label —
            the same way every other stop announces itself, and the thing
            `headingForStep` looks for. The old "— source of truth" appositive
            went with it: it explained the screen to someone already on it. */}
        <h1 className="bbb-panel__title">{labelForView('book')}</h1>

        {/* Named for what's inside rather than "Identity": the app's third
            path stop is already called that, and the heading is the only
            clue to what a section holds. */}
        <Section title="Name &amp; tagline" defaultOpen>
          {/* READ-ONLY, AND IT WAS LYING BEFORE. This box read
              `detective.clientName || project.name` and wrote `project.name` —
              two different fields. On any project where the client had answered
              chapter 01 it showed their answer, accepted typing, renamed the
              project underneath, then re-rendered the client's answer over the
              top: the edit vanished with no error. The business name is the
              client's and the brief asks for it, so that is where it is
              written. (Renaming the PROJECT is a different fact and still
              lives on the client record.) */}
          <BookOwnedElsewhere
            label="Brand name"
            value={brandName}
            homeLabel={FIELD_HOMES.clientName.label}
            onOpen={() => openFieldHome(FIELD_HOMES.clientName.view, null)}
          />
          <BookOwnedElsewhere
            label="Tagline"
            value={tagline}
            homeLabel={FIELD_HOMES.tagline.label}
            onOpen={() =>
              openFieldHome(FIELD_HOMES.tagline.view, FIELD_HOMES.tagline.section)
            }
          />
        </Section>

        {/* Sheet / Edge space / print-shop bleed — the three controls the
            top-bar summary states as a sentence. Named stops replace the old
            free-typed margin percent ("named stops, not number fields"). */}
        {/* Closed on arrival. The top bar already states this as a sentence
            — "A4 · Roomy edge · no bleed" — so an open panel repeating it in
            three controls is the summary and the controls competing for the
            same 320px. Open it when you are changing the sheet, which is once
            a project, not once a visit. */}
        <Section title="Setup">
          <ChipRow
            label="Sheet"
            value={printSettings.pageSize}
            onChange={(v) => setBookSetup({ pageSize: v })}
            options={Object.entries(PAGE_SIZES).map(([id, v]) => ({ id, label: v.label.split(' (')[0] }))}
          />
          <ChipRow
            label="Edge space"
            value={activeEdge}
            onChange={(v) => setBookSetup({ edgeSpace: v })}
            options={EDGE_ORDER.map((id) => ({ id, label: EDGE_STOPS[id].label }))}
          />
          <PillToggle
            id="bbb-printShop"
            label="Going to a print shop"
            checked={printSettings.bleed}
            onChange={(v) => setBookSetup({ printShop: v })}
          />
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
              <BookTextFields pageId={pg.id} x={bookX} onOpen={openFieldHome} />
            </Section>
          );
        })}

        {/* THE PALETTE IS SHOWN HERE AND EDITED ON COLOUR.
            This was a full second editor for the canonical palette — name, hex,
            add and remove — sitting on an output surface. It wrote the real
            `palette`/`paletteTokens` through `setPaletteTokens`, so it was not a
            duplicate STORE; it was a duplicate AUTHORING HOME, which is the rule
            this file's own header sets out. Naming was the one thing it could do
            that Colour could not, so naming moved to Colour rather than being
            deleted, and the rows are read-only here.

            The swatch and hex stay visible: the book has to show what it will
            print, and a designer laying out a page needs to see the colours
            without leaving for them. */}
        <Section title="Colors" defaultOpen>
          <div className="bbb-color-list bbb-color-list-read">
            {colors.map((c) => (
              <div className="bbb-color-read" key={c.id}>
                <span
                  className="bbb-color-read-chip"
                  style={{ background: c.hex }}
                  aria-hidden="true"
                />
                <span className="bbb-color-read-name">{c.name}</span>
                <span className="bbb-color-read-hex">{c.hex}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="text-link bbb-read-link"
            onClick={() =>
              openFieldHome(FIELD_HOMES.palette.view, FIELD_HOMES.palette.section)
            }
          >
            {`Edit on ${FIELD_HOMES.palette.label}`}
          </button>
        </Section>

        {/* Prototype kit rail: each fine-tune group is its own collapsed
            section (Type scale, Type color, …), not one long Advanced block. */}
        <Section title="Type scale">
          <div className="bbb-field">
            <label htmlFor="bbb-headlineFont">Headline font</label>
            <BookOwnedElsewhere
              label="Headline face"
              value={headingLabel}
              homeLabel={FIELD_HOMES.typeHeading.label}
              onOpen={() =>
                openFieldHome(
                  FIELD_HOMES.typeHeading.view,
                  FIELD_HOMES.typeHeading.section
                )
              }
            />
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
            <BookOwnedElsewhere
              label="Body face"
              value={bodyLabel}
              homeLabel={FIELD_HOMES.typeBody.label}
              onOpen={() =>
                openFieldHome(
                  FIELD_HOMES.typeBody.view,
                  FIELD_HOMES.typeBody.section
                )
              }
            />
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
        </Section>

        <Section title="Type color">
          <TokenSelect id="bbb-colorHeadline" label="Headline" value={typeColor.headline} colors={colors}
            noneValue="auto" noneLabel="Auto" onChange={(v) => setTypeColor((t) => ({ ...t, headline: v }))} />
          <TokenSelect id="bbb-colorSubhead" label="Subhead" value={typeColor.subhead} colors={colors}
            noneValue="auto" noneLabel="Auto" onChange={(v) => setTypeColor((t) => ({ ...t, subhead: v }))} />
          <TokenSelect id="bbb-colorBody" label="Body" value={typeColor.body} colors={colors}
            noneValue="auto" noneLabel="Auto" onChange={(v) => setTypeColor((t) => ({ ...t, body: v }))} />
        </Section>

        <Section title="Page backgrounds">
          <TokenSelect id="bbb-bgCover" label="Front cover" value={pageBg.pageCover} colors={colors}
            noneValue="white" noneLabel="White" onChange={(v) => setPageBg((p) => ({ ...p, pageCover: v }))} />
          <TokenSelect id="bbb-bgColors" label="Color page" value={pageBg.pageColors} colors={colors}
            noneValue="white" noneLabel="White" onChange={(v) => setPageBg((p) => ({ ...p, pageColors: v }))} />
          <TokenSelect id="bbb-bgType" label="Type page" value={pageBg.pageType} colors={colors}
            noneValue="white" noneLabel="White" onChange={(v) => setPageBg((p) => ({ ...p, pageType: v }))} />
          <TokenSelect id="bbb-bgBack" label="Back cover" value={pageBg.pageBack} colors={colors}
            noneValue="white" noneLabel="White" onChange={(v) => setPageBg((p) => ({ ...p, pageBack: v }))} />
        </Section>

        <Section title="Grid">
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
        </Section>

        <Section title="Running elements">
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
        </Section>

        {/* Book spine: which pages are in / not yet. Starts open so the map
            of the book is not hidden behind a bare label. */}
        {/* Closed on arrival. This is a 15-row list of the pages, and the
            pages themselves are the thing filling the canvas to the right —
            so open by default it was the tallest item in the rail and a second
            copy of what the document already shows. It stays for reordering
            and locking, one click away. */}
        <Section title="In this book">
          <ul className="bbb-pagelist">
            {effectiveOrder.map((id, index) => {
              const el = pageElementMap.get(id)
              if (!el) return null

              const pageEl = el.props.children
              const label = labelForPageEl(pageEl)
              const isLocked = lockedPages.has(id)

              /* Consecutive pages of the same section collapse to one row.
                 This used to derive the previous label by a DIFFERENT rule
                 than the current one, so the two could disagree and the
                 dedupe silently stop working — both go through
                 labelForPageEl now, so they cannot drift. */
              if (index > 0) {
                const prevEl = pageElementMap.get(effectiveOrder[index - 1])
                if (prevEl && label === labelForPageEl(prevEl.props.children)) {
                  return null
                }
              }

              return (
                <li
                  key={id}
                  className={`bbb-pagelist__in${isLocked ? ' bbb-pagelist__locked' : ''}`}
                >
                  {/* Name first, then what you can do to it.
                      This row used to read [Lock][Move up][Move down][name] —
                      three controls before the thing they act on, so you had
                      to read past all of them to learn what you were about to
                      move. Seven rows made 21 controls, most of them 17-22px.
                      Now: the page name, then one disclosure holding its
                      actions.

                      A <details> rather than a popup menu on purpose. It is
                      pointer- AND keyboard-operable with no focus-trap code to
                      get wrong, and every action inside stays a real button —
                      which is what WCAG 2.2 SC 2.5.7 requires. Drag-to-reorder
                      was considered and rejected for the same criterion:
                      drag-only fails it (F108), and these rows are far too
                      short to drag reliably on a touch screen anyway.

                      No undo toast here, deliberately. Reordering is not
                      destructive and each move is its own inverse — the way
                      back from "Move up" is "Move down", one row away. */}
                  <div className="bbb-page-controls">
                    <a
                      href={`#${id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        document
                          .getElementById(id)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className="bbb-page-link"
                    >
                      {label}
                    </a>
                    <details className="bbb-page-actions">
                      <summary
                        className="bbb-page-actions__toggle"
                        aria-label={`Actions for ${label}`}
                      >
                        <span aria-hidden="true">⋯</span>
                      </summary>
                      <div className="bbb-page-actions__menu">
                        <button
                          type="button"
                          className="bbb-page-action"
                          onClick={() => togglePageLock(id)}
                        >
                          {isLocked ? 'Unlock page' : 'Lock page'}
                        </button>
                        <button
                          type="button"
                          className="bbb-page-action"
                          onClick={() => movePageUp(id, effectiveOrder)}
                          disabled={index === 0 || isLocked}
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          className="bbb-page-action"
                          onClick={() => movePageDown(id, effectiveOrder)}
                          disabled={index === effectiveOrder.length - 1 || isLocked}
                        >
                          Move down
                        </button>
                      </div>
                    </details>
                  </div>
                </li>
              )
            })}
          </ul>
          {/* Inventory, not a deficit list.
              This was ten permanent rows headed "Not in the book yet", each a
              pair of spans — no link, no button, nothing to press. So it
              named ten things you had failed to do and gave you no way to do
              any of them: the worst of both, and exactly the standing
              scoreboard CLAUDE.md §2 rules out for this audience.

              Three changes. It counts what IS in the book first, because
              "12 of 19 in" and "7 missing" are the same fact in different
              registers and only one of them is a state rather than a verdict.
              It collapses, so the tail is available without being permanent.
              And every row now goes to the stop that fills it — the entries
              already carried the id, so this was one map away from working.

              Kept OUT of the count: this is not a progress bar. No percentage,
              no colour, no dot. */}
          {omittedPages.length > 0 && (
            <details className="bbb-gaps">
              <summary className="bbb-gaps__summary">
                {contentPages.length} of {contentPages.length + omittedPages.length}{' '}
                sections in the book
              </summary>
              <ul className="bbb-pagelist bbb-gaps__list">
                {omittedPages.map((o) => {
                  const toView = GAP_DESTINATION[o.id]
                  return (
                    <li key={o.id} className="bbb-pagelist__out">
                      {toView && setActiveView ? (
                        <button
                          type="button"
                          className="bbb-gaps__go"
                          onClick={() => setActiveView(toView)}
                        >
                          <span className="bbb-gaps__label">{o.label}</span>
                          <span className="bbb-pagelist__needs">
                            needs {o.needs} — open {labelForView(toView)}
                          </span>
                        </button>
                      ) : (
                        <>
                          <span className="bbb-gaps__label">{o.label}</span>
                          <span className="bbb-pagelist__needs">needs {o.needs}</span>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            </details>
          )}
        </Section>
        </div>

        {/* Focusable, because it scrolls. `.bbb-canvas` scrolls on both axes
            and had no keyboard access at all, so the pages were reachable by
            mouse or trackpad only — axe `scrollable-region-focusable`, serious,
            WCAG 2.1.1 and 2.1.3.

            It is not a new defect; it is a newly VISIBLE one. axe-path walks
            the path stops, and until the Brand book became one this screen had
            never been audited. Same treatment `ReviewView` already gives its
            scrolling pack preview: a named region that takes focus, so arrow
            keys reach the pages. */}
        <div
          className="bbb-canvas"
          role="region"
          aria-label={`${labelForView('book')} pages`}
          tabIndex={0}
        >
          {canvasPages}
        </div>
      </div>

      <Flipbook open={flipOpen} onClose={() => setFlipOpen(false)} pages={canvasPages} index={flipIndex} setIndex={setFlipIndex} />
    </div>
    </Workroom>
  );
}
