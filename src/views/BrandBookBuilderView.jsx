import React, { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'
import {
  bookBuilderFor,
  readPaletteTokens,
  mintTokenId,
  MAX_COLORS,
  MIN_COLORS,
} from '../lib/bookBuilder'
import { labelFor, parseLabel, familyByName } from '../lib/fontCatalog'
import { loadBrandFamilies } from '../lib/fontLoader'
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

const HEADLINE_FONTS = ["Fraunces", "Playfair Display", "Space Grotesk", "Bricolage Grotesque"];
const BODY_FONTS = ["Inter", "Source Serif 4", "IBM Plex Mono"];
const PAGE_SIZES = { letter: { w: 8.5, h: 11, label: "Letter (8.5 × 11 in)" }, a4: { w: 8.27, h: 11.69, label: "A4 (210 × 297 mm)" } };

/* ------------------------------------------------------------- helpers */

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
function resolveBg(colors, key) {
  if (key === "white") return "#ffffff";
  const token = colors.find((c) => String(c.id) === String(key));
  return token ? token.hex : "#ffffff";
}

/* ------------------------------------------------------------ Section */

function Section({ title, defaultOpen, children }) {
  return (
    <details className="bbb-section" open={defaultOpen || undefined}>
      <summary className="bbb-section__summary">
        <h2 className="bbb-section__title">{title}</h2>
      </summary>
      <div className="bbb-section__body">{children}</div>
    </details>
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

function FrontCover({ kit, style }) {
  const { name, tagline, headlineHex, accent, bodyHex, hStack, bStack, headlineSize, headlineWeight, bodyWeight, bg, dark, grid } = kit;
  return (
    <div className="bbb-page bbb-page--cover" data-dark={dark || undefined} style={{ background: bg, ...style }}>
      <span className="bbb-page-label">Front cover</span>
      <GridOverlay {...grid} />
      <div className="bbb-cover-rule" style={{ background: accent }} />
      <p className="bbb-cover-name" style={{ fontFamily: hStack, fontWeight: headlineWeight, fontSize: `${headlineSize}pt`, color: headlineHex }}>{name}</p>
      <p className="bbb-cover-tagline" style={{ fontFamily: bStack, fontWeight: bodyWeight, color: bodyHex || undefined }}>{tagline}</p>
    </div>
  );
}

function ColorsPage({ kit, style }) {
  const { colors, bg, dark, grid, running, swatchCols } = kit;
  return (
    <div className="bbb-page bbb-page--colors" data-dark={dark || undefined} style={{ background: bg, ...style }}>
      <span className="bbb-page-label">Color page</span>
      <GridOverlay {...grid} />
      <RunningHeader {...running} pageIndex={0} />
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
      <RunningFooter {...running} pageIndex={0} />
      <PageNum {...running} pageIndex={0} />
    </div>
  );
}

function TypePage({ kit, style }) {
  const { headlineHex, subheadHex, bodyHex, hStack, bStack, headlineSize, headlineWeight, subheadSize, subheadWeight, bodySize, bodyWeight, bg, dark, grid, running } = kit;
  return (
    <div className="bbb-page bbb-page--type" data-dark={dark || undefined} style={{ background: bg, ...style }}>
      <span className="bbb-page-label">Type page</span>
      <GridOverlay {...grid} />
      <RunningHeader {...running} pageIndex={1} />
      <p className="bbb-ph-title">Typography</p>
      <p className="bbb-type-headline" style={{ fontFamily: hStack, fontWeight: headlineWeight, fontSize: `${headlineSize}pt`, color: headlineHex }}>Headline / H1</p>
      <p className="bbb-type-sub" style={{ fontFamily: hStack, fontWeight: subheadWeight, fontSize: `${subheadSize}pt`, color: subheadHex }}>Subhead &mdash; secondary emphasis</p>
      <p className="bbb-type-body" style={{ fontFamily: bStack, fontWeight: bodyWeight, fontSize: `${bodySize}pt`, color: bodyHex || undefined }}>
        Body text sits here. This paragraph exists to show line length, leading, and color at actual reading size, the way it will appear throughout the guide.
      </p>
      <RunningFooter {...running} pageIndex={1} />
      <PageNum {...running} pageIndex={1} />
    </div>
  );
}

function BackCover({ kit, style }) {
  const { name, headlineHex, hStack, headlineWeight, bg, dark, grid } = kit;
  return (
    <div className="bbb-page bbb-page--back" data-dark={dark || undefined} style={{ background: bg, ...style }}>
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

function Flipbook({ open, onClose, pages, index, setIndex }) {
  if (!open) return null;
  const total = pages.length;
  return (
    <div className="bbb-flip-overlay bbb-flip-overlay--show">
      <button className="bbb-flip-close" type="button" aria-label="Close preview" onClick={onClose}>&times;</button>
      <div className="bbb-flip-stage">
        {pages.map((PageEl, i) => (
          <div
            key={i}
            className="bbb-flip-page"
            style={{ zIndex: i < index ? i : total - i, transform: i < index ? "rotateY(-178deg)" : "rotateY(0deg)" }}
          >
            {PageEl}
          </div>
        ))}
      </div>
      <div className="bbb-flip-controls">
        <button type="button" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>&larr; Prev</button>
        <span>{index + 1} / {total}</span>
        <button type="button" disabled={index === total - 1} onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}>Next &rarr;</button>
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
  const setBookBuilder = useAppStore((s) => s.setBookBuilder)
  const setPaletteTokens = useAppStore((s) => s.setPaletteTokens)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
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

  const runningProps = { show: running.show, text: (running.text.trim() || brandName), align: running.align,
    showFooter: running.showFooter, footerText: (running.footerText.trim() || tagline), footerAlign: running.footerAlign,
    showPageNumbers: running.showPageNumbers, alternate: running.alternate, bStack };

  const kit = {
    name: brandName, tagline, headlineHex, subheadHex, bodyHex, accent, colors, swatchCols,
    hStack, bStack, headlineSize, headlineWeight, subheadSize, subheadWeight, bodySize, bodyWeight,
    grid: { columns: grid.columns, rows: grid.rows, gutter: grid.gutter, show: grid.show },
    running: runningProps,
  };

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
    }
  `;

  /* `window.print()` prints the whole document, and the owner's printCss only
     knows about their own panel — the app header, nav, status pill and any
     open panel would all print with the book. `cc-printing-book` scopes it,
     mirroring how printElementById already handles this for the pack.
     The title is restored afterwards; otherwise the tab keeps the export
     name for the rest of the session. */
  const handleExport = async () => {
    const prevTitle = document.title
    document.title = `${brandName} brand guide`;
    document.body.classList.add('cc-printing-book')
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    try {
      window.print();
    } finally {
      document.body.classList.remove('cc-printing-book')
      document.title = prevTitle
    }
  };

  const pageElements = [
    <FrontCover key="cover" kit={{ ...kit, ...bgFor("pageCover") }} style={gridMarginVar} />,
    <ColorsPage key="colors" kit={{ ...kit, ...bgFor("pageColors") }} style={gridMarginVar} />,
    <TypePage key="type" kit={{ ...kit, ...bgFor("pageType") }} style={gridMarginVar} />,
    <BackCover key="back" kit={{ ...kit, ...bgFor("pageBack") }} style={gridMarginVar} />,
  ];

  return (
    <div className="bbb-root">
      <style>{printCss}</style>

      <div className="bbb-panel">
        <h1 className="bbb-panel__title">Brand kit &mdash; source of truth</h1>

        <Section title="Identity" defaultOpen>
          <div className="bbb-field">
            <label htmlFor="bbb-brandName">Brand name</label>
            <input id="bbb-brandName" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          </div>
          <div className="bbb-field">
            <label htmlFor="bbb-tagline">Tagline</label>
            <input id="bbb-tagline" type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
        </Section>

        <Section title="Type scale">
          <div className="bbb-field">
            <label htmlFor="bbb-headlineFont">Headline font</label>
            <select id="bbb-headlineFont" value={headlineFont} onChange={(e) => setHeadlineFont(e.target.value)}>
              {HEADLINE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
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
            <select id="bbb-bodyFont" value={bodyFont} onChange={(e) => setBodyFont(e.target.value)}>
              {BODY_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
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
        </Section>

        <Section title="Colors" defaultOpen>
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
        </Section>

        <Section title="Type color">
          <TokenSelect id="bbb-colorHeadline" label="Headline" value={typeColor.headline} colors={colors}
            noneValue="auto" noneLabel="Auto" onChange={(v) => setTypeColor((t) => ({ ...t, headline: v }))} />
          <TokenSelect id="bbb-colorSubhead" label="Subhead" value={typeColor.subhead} colors={colors}
            noneValue="auto" noneLabel="Auto" onChange={(v) => setTypeColor((t) => ({ ...t, subhead: v }))} />
          <TokenSelect id="bbb-colorBody" label="Body" value={typeColor.body} colors={colors}
            noneValue="auto" noneLabel="Auto" onChange={(v) => setTypeColor((t) => ({ ...t, body: v }))} />
          <p className="bbb-hint">&quot;Auto&quot; tracks sensible defaults (headline &rarr; primary, subhead &rarr; accent, body &rarr; adapts to light/dark pages). Pick a token to lock it instead.</p>
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
          <p className="bbb-hint">Backgrounds reference a color token, same as everything else &mdash; rename or delete that token and the page follows.</p>
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
          <div className="bbb-field">
            <label htmlFor="bbb-gridMargin">Margin (%)</label>
            <input id="bbb-gridMargin" type="text" inputMode="decimal" value={grid.margin} onChange={(e) => setGrid((g) => ({ ...g, margin: Number(e.target.value) || 0 }))} />
          </div>
          <div className="bbb-field bbb-field--checkbox">
            <input id="bbb-showGrid" type="checkbox" checked={grid.show} onChange={(e) => setGrid((g) => ({ ...g, show: e.target.checked }))} />
            <label htmlFor="bbb-showGrid">Show grid guides</label>
          </div>
          <p className="bbb-hint">Rows and columns share one gutter value. The color page&apos;s swatch columns derive from this column count.</p>
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
          <p className="bbb-hint">These sit on interior pages only &mdash; covers stay clean.</p>
        </Section>

        <Section title="Print setup">
          <div className="bbb-field">
            <label htmlFor="bbb-pageSize">Page size</label>
            <select id="bbb-pageSize" value={printSettings.pageSize} onChange={(e) => setPrintSettings((p) => ({ ...p, pageSize: e.target.value }))}>
              {Object.entries(PAGE_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="bbb-field bbb-field--checkbox">
            <input id="bbb-bleedToggle" type="checkbox" checked={printSettings.bleed} onChange={(e) => setPrintSettings((p) => ({ ...p, bleed: e.target.checked }))} />
            <label htmlFor="bbb-bleedToggle">Include 0.125in bleed</label>
          </div>
        </Section>

        <div className="bbb-section bbb-section--actions">
          <button type="button" className="bbb-btn bbb-btn--primary" onClick={handleExport}>Export to PDF</button>
          <button type="button" className="bbb-btn" onClick={() => { setFlipIndex(0); setFlipOpen(true); }}>Preview as flipbook</button>
        </div>
      </div>

      <div className="bbb-canvas">
        {pageElements}
      </div>

      <Flipbook open={flipOpen} onClose={() => setFlipOpen(false)} pages={pageElements} index={flipIndex} setIndex={setFlipIndex} />
    </div>
  );
}
