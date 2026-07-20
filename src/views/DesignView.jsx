/**
 * Design step — live artboard preview + accordion editors
 * (tagline, voice, colors, type, logo, pack pins).
 * Owns palette hex drafts / role assign / contrast checker local state.
 */
import { useState, useEffect, useMemo, Suspense, lazy } from 'react'
import useAppStore from '../store/useAppStore'
import {
  DEFAULT_PALETTE,
  normalizeHex,
  buildPairChecks,
  buildPassPairs,
  bestTextOn,
  formatRatio,
  mapPaletteRoles,
  fontFamilyFromLabel,
  TYPE_PAIRS,
  typePairIdFromLabels,
  tintsAndShades,
  extractPaletteFromPins,
  suggestRoleAaFixes,
  mergeRolesIntoPalette,
  nudgeHexForContrast,
} from '../lib/color'
import { getProcessPhase } from '../lib/processGuide'
import { pinFaceStyle } from '../lib/moodPins'
import {
  normalizeLocale,
  t as i18nT,
  tFormat,
  pathLabel,
} from '../lib/i18n'

const BrandArtboard = lazy(() => import('../components/BrandArtboard'))

export default function DesignView({
  locale: localeProp = 'en',
  navDir = 'none',
  activeProject = null,
  deskMood = [],
  projectPalette = [],
  hidePackWatermark = false,
  setActiveView,
  flashToast,
  flashMicro,
  /** Controlled accordion tab when jumping from Review/Deliver readiness */
  brandEditSection: brandEditSectionProp,
  setBrandEditSection: setBrandEditSectionProp,
}) {
  const locale = normalizeLocale(localeProp)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const updateProjectBrief = useAppStore((s) => s.updateProjectBrief)
  const setProjectPalette = useAppStore((s) => s.setProjectPalette)
  const updatePaletteColor = useAppStore((s) => s.updatePaletteColor)
  const addPaletteColor = useAppStore((s) => s.addPaletteColor)
  const removePaletteColor = useAppStore((s) => s.removePaletteColor)
  const bumpDesignVersion = useAppStore((s) => s.bumpDesignVersion)
  const bumpDesignVersionIfV1 = useAppStore((s) => s.bumpDesignVersionIfV1)
  const setColorRole = useAppStore((s) => s.setColorRole)
  const setLogoDirection = useAppStore((s) => s.setLogoDirection)
  const setLogoImage = useAppStore((s) => s.setLogoImage)

  const [brandEditSectionLocal, setBrandEditSectionLocal] =
    useState('essentials')
  const brandEditSection =
    brandEditSectionProp != null ? brandEditSectionProp : brandEditSectionLocal
  const setBrandEditSection =
    setBrandEditSectionProp || setBrandEditSectionLocal
  const [brandRoleAssign, setBrandRoleAssign] = useState('cover')
  const [checkBgIndex, setCheckBgIndex] = useState(0)
  const [hexDrafts, setHexDrafts] = useState({})
  const [tintOpenIndex, setTintOpenIndex] = useState(null)
  const [extractingPins, setExtractingPins] = useState(false)
  const [showPassPairs, setShowPassPairs] = useState(false)

  useEffect(() => {
    if (checkBgIndex >= projectPalette.length) {
      setCheckBgIndex(Math.max(0, projectPalette.length - 1))
    }
  }, [projectPalette.length, checkBgIndex])

  // Honor parent jump (e.g. readiness “fix palette roles”)
  useEffect(() => {
    if (brandEditSectionProp) setBrandEditSectionLocal(brandEditSectionProp)
  }, [brandEditSectionProp])

  const paletteRoles = useMemo(
    () => mapPaletteRoles(projectPalette),
    [projectPalette]
  )

  const effectiveRoles = useMemo(() => {
    const o = activeProject?.colorRoles || {}
    return {
      cover: normalizeHex(o.cover) || paletteRoles.cover,
      text: normalizeHex(o.text) || paletteRoles.text,
      accent: normalizeHex(o.accent) || paletteRoles.accent,
      quiet: normalizeHex(o.quiet) || paletteRoles.quiet,
    }
  }, [activeProject?.colorRoles, paletteRoles])

  const checkBg =
    projectPalette[checkBgIndex] ||
    paletteRoles.background ||
    projectPalette[0] ||
    '#FFFFFF'

  const contrastPairs = useMemo(
    () => buildPairChecks(projectPalette, checkBg),
    [projectPalette, checkBg]
  )

  const passPairs = useMemo(
    () => buildPassPairs(projectPalette, 4.5).slice(0, 12),
    [projectPalette]
  )

  const starredPinCount = useMemo(
    () => (deskMood || []).filter((m) => m.inPack).length,
    [deskMood]
  )
  const pinCount = (deskMood || []).length

  const handleHexChange = (index, raw) => {
    setHexDrafts((d) => ({ ...d, [index]: raw }))
    const n = normalizeHex(raw)
    if (n) updatePaletteColor(index, n)
  }

  const commitHex = (index) => {
    const draft = hexDrafts[index]
    if (draft == null) return
    const n = normalizeHex(draft)
    if (n) updatePaletteColor(index, n)
    setHexDrafts((d) => {
      const next = { ...d }
      delete next[index]
      return next
    })
  }

  const applyFromPins = async () => {
    if (!pinCount) {
      flashToast?.('Add Research pins first (color, gradient, or image).')
      return
    }
    setExtractingPins(true)
    try {
      const result = await extractPaletteFromPins(deskMood, {
        max: 6,
        preferStarred: true,
      })
      if (result.empty || result.colors.length < 2) {
        flashToast?.(
          'Could not pull colors from pins — try solid hex pins or image uploads.'
        )
        return
      }
      setProjectPalette(result.colors)
      setHexDrafts({})
      setTintOpenIndex(null)
      const src = result.sources
      const bits = []
      if (src.color) bits.push(`${src.color} color`)
      if (src.gradient) bits.push(`${src.gradient} gradient`)
      if (src.image) bits.push(`${src.image} image`)
      flashMicro?.(
        `Palette from ${starredPinCount ? '★ pins' : 'pins'} · ${result.colors.length} colors${bits.length ? ` (${bits.join(', ')})` : ''}`
      )
    } finally {
      setExtractingPins(false)
    }
  }

  const applyAaRoleFix = () => {
    const { roles, changes } = suggestRoleAaFixes(
      projectPalette,
      activeProject?.colorRoles
    )
    if (!changes.length) {
      flashMicro?.('Roles already pass AA targets')
      return
    }
    for (const c of changes) {
      setColorRole(c.role, c.to)
    }
    // Keep fixed hexes on the palette so checker + export stay in sync
    const nextPal = mergeRolesIntoPalette(projectPalette, roles, 8)
    if (nextPal.length >= 2) setProjectPalette(nextPal)
    flashMicro?.(
      `Fixed ${changes.length} role${changes.length === 1 ? '' : 's'} for AA · ${changes.map((c) => c.role).join(', ')}`
    )
  }

  const fixPairFg = (fg, bg, index) => {
    const fix = nudgeHexForContrast(fg, bg, 4.5)
    if (!fix || !fix.changed) {
      flashMicro?.('Already AA or cannot fix this pair')
      return
    }
    if (typeof index === 'number' && index >= 0) {
      updatePaletteColor(index, fix.hex)
      setHexDrafts((d) => {
        const next = { ...d }
        delete next[index]
        return next
      })
    }
    flashMicro?.(`${fg} → ${fix.hex} · ${formatRatio(fix.ratio)}`)
  }

  return (
          <div className="brand-layout surface-document system-view view-enter" data-nav-dir={navDir}>
            <div className="brand-template-top">
              <div>
                <h1 className="page-title">
                  {i18nT(locale, 'path.design')}
                </h1>
                <p className="page-sub">
                  {i18nT(locale, 'ui.systemSub')}{' '}
                  <strong>{activeProject?.name || 'this project'}</strong>
                  {' · '}
                  client pack {deskMood.filter((m) => m.inPack).length}/6
                </p>
              </div>
              <div className="brand-template-actions">
                <label className="field-label design-version-label" htmlFor="design-version">
                  Version
                  <input
                    id="design-version"
                    className="field-input design-version-input"
                    value={activeProject?.designVersion || 'v1'}
                    onChange={(e) =>
                      updateBrandField('designVersion', e.target.value)
                    }
                    aria-label="Design version"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title="Bump before a big change (v1 → v2)"
                  onClick={() => {
                    const r = bumpDesignVersion()
                    if (r?.ok)
                      flashMicro(
                        tFormat(locale, 'ui.versionBumped', {
                          version: r.version,
                        })
                      )
                  }}
                >
                  Bump
                </button>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setActiveView('flow')}
                >
                  ← Sketch
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Encourage version discipline before review
                    const cur = String(
                      activeProject?.designVersion || 'v1'
                    ).trim()
                    if (/^v?1$/i.test(cur) || cur === '') {
                      updateBrandField('designVersion', 'v2')
                      flashToast(i18nT(locale, 'ui.versionToReview'))
                    }
                    setActiveView('review')
                  }}
                >
                  {tFormat(locale, 'ui.continueNext', {
                    label: pathLabel(locale, 'review') || 'Review',
                  })}
                </button>
              </div>
            </div>

            <section className="panel brand-section process-tip-panel">
              <div className="brand-section-label">Design checklist</div>
              <p className="panel-hint" style={{ marginTop: 0 }}>
                {getProcessPhase('design')?.prompt}
              </p>
              <ul className="process-guide-checks">
                {(getProcessPhase('design')?.checks || []).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="panel-hint" style={{ marginBottom: 0 }}>
                Bump version before big changes. Then Review with specific
                questions — not “do you like it?”
              </p>
            </section>

            {/* ARTBOARD — sticky preview on wide screens (not freeform edit) */}
            <div
              className="system-artboard-sticky"
              tabIndex={0}
              role="region"
              aria-label="Live leave-behind preview"
            >
              <p className="panel-hint design-preview-caption" style={{ marginTop: 0 }}>
                {i18nT(locale, 'ui.designPreviewCaption')}
              </p>
              <Suspense fallback={<div className="panel-hint">Loading artboard…</div>}>
                <BrandArtboard
                  id="system-artboard"
                  project={activeProject || {}}
                  palette={projectPalette}
                  pins={deskMood.filter((m) => m.inPack)}
                  editable={false}
                  hideWatermark={hidePackWatermark}
                />
              </Suspense>
            </div>

            <p className="system-edit-label">Edit</p>
            <div className="system-accordion-nav" role="tablist">
              {[
                ['essentials', 'Tagline'],
                ['messaging', 'Message'],
                ['voice', 'Voice'],
                ['colors', 'Colors'],
                ['type', 'Type'],
                ['logo', 'Logo'],
                ['imagery', 'Imagery'],
                ['pins', 'Pins'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={brandEditSection === id}
                  className={`system-acc-tab${
                    brandEditSection === id ? ' is-active' : ''
                  }`}
                  onClick={() => setBrandEditSection(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 01 Essentials */}
            <section
              className={`panel brand-section${
                brandEditSection && brandEditSection !== 'essentials'
                  ? ' is-collapsed-edit'
                  : ''
              }`}
              hidden={brandEditSection !== 'essentials'}
            >
              <div className="brand-section-label">Tagline &amp; positioning</div>
              <div className="field-block">
                <label className="field-label" htmlFor="brand-tagline">
                  Tagline
                </label>
                <input
                  id="brand-tagline"
                  className="field-input"
                  value={activeProject?.tagline || ''}
                  onChange={(e) =>
                    updateBrandField('tagline', e.target.value)
                  }
                  placeholder="One line. Memorable."
                />
              </div>
              <div className="field-block" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="brand-brief">
                  Positioning / brief
                </label>
                <textarea
                  id="brand-brief"
                  className="field-textarea"
                  value={activeProject?.brief || ''}
                  onChange={(e) => updateProjectBrief(e.target.value)}
                  placeholder="Who is this for? What should it feel like?"
                  rows={3}
                />
              </div>
            </section>

            {/* 02 Voice */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'voice'}
            >
              <div className="brand-section-label">Voice · do / don&apos;t</div>
              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="brand-voice">
                  How we sound
                </label>
                <textarea
                  id="brand-voice"
                  className="field-textarea"
                  value={activeProject?.voice || ''}
                  onChange={(e) => updateBrandField('voice', e.target.value)}
                  placeholder="e.g. Warm, plain-spoken, hopeful — never corporate."
                  rows={2}
                />
              </div>
              <div className="brand-do-dont">
                <div className="field-block" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor="brand-do">
                    Do
                  </label>
                  <textarea
                    id="brand-do"
                    className="field-textarea"
                    value={activeProject?.doUse || ''}
                    onChange={(e) =>
                      updateBrandField('doUse', e.target.value)
                    }
                    placeholder="Behaviors, materials, tone that fit."
                    rows={3}
                  />
                </div>
                <div className="field-block" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor="brand-dont">
                    Don&apos;t
                  </label>
                  <textarea
                    id="brand-dont"
                    className="field-textarea"
                    value={activeProject?.dontUse || ''}
                    onChange={(e) =>
                      updateBrandField('dontUse', e.target.value)
                    }
                    placeholder="Clichés and traps to avoid."
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {/* 03 Palette + checker */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'colors'}
            >
              <div className="brand-section-label">Colors</div>
              <div className="brand-palette-block" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                <div className="palette-section-head">
                  <p className="field-label" style={{ margin: 0 }}>
                    Palette builder
                  </p>
                  <span className="panel-hint" style={{ margin: 0 }}>
                    {projectPalette.length}/8 · saved on project
                  </span>
                </div>

                <div className="brand-palette-bleed">
                  {projectPalette.map((c, i) => (
                    <div
                      key={`${c}-${i}`}
                      style={{ flex: 1, background: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="direction-hex">
                  {projectPalette.join(' · ')}
                </div>

                <ul className="palette-editor">
                  {projectPalette.map((hex, index) => {
                    const display =
                      hexDrafts[index] != null ? hexDrafts[index] : hex
                    const tints = tintsAndShades(hex, { steps: 2 })
                    const tintsOpen = tintOpenIndex === index
                    return (
                      <li key={index} className="palette-row-block">
                        <div className="palette-row">
                          <label
                            className="palette-swatch-wrap"
                            title="Pick color"
                          >
                            <input
                              type="color"
                              className="palette-color-input"
                              value={normalizeHex(hex) || '#888888'}
                              onChange={(e) => {
                                const n = normalizeHex(e.target.value)
                                if (n) {
                                  updatePaletteColor(index, n)
                                  setHexDrafts((d) => {
                                    const next = { ...d }
                                    delete next[index]
                                    return next
                                  })
                                }
                              }}
                              aria-label={`Color ${index + 1} picker`}
                            />
                            <span
                              className="palette-swatch"
                              style={{
                                background: normalizeHex(hex) || hex,
                              }}
                            />
                          </label>
                          <input
                            type="text"
                            className="palette-hex-input"
                            value={display}
                            onChange={(e) =>
                              handleHexChange(index, e.target.value)
                            }
                            onBlur={() => commitHex(index)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                            }}
                            spellCheck={false}
                            aria-label={`Color ${index + 1} hex`}
                          />
                          <span
                            className="palette-preview-chip"
                            style={{
                              background: normalizeHex(hex) || hex,
                              color: bestTextOn(hex),
                            }}
                          >
                            Aa
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            aria-expanded={tintsOpen}
                            title="Tints and shades"
                            onClick={() =>
                              setTintOpenIndex(tintsOpen ? null : index)
                            }
                          >
                            Tints
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost palette-remove"
                            disabled={projectPalette.length <= 2}
                            onClick={() => removePaletteColor(index)}
                            aria-label={`Remove color ${index + 1}`}
                          >
                            Remove
                          </button>
                        </div>
                        {tintsOpen && tints.length > 0 && (
                          <div
                            className="palette-tints-row"
                            role="group"
                            aria-label={`Tints and shades for color ${index + 1}`}
                          >
                            {tints.map((t) => {
                              const isBase =
                                normalizeHex(t) === normalizeHex(hex)
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  className={`palette-tint-chip${isBase ? ' is-base' : ''}`}
                                  style={{
                                    background: t,
                                    color: bestTextOn(t),
                                  }}
                                  title={
                                    isBase
                                      ? `${t} (current)`
                                      : `Apply ${t} to this swatch`
                                  }
                                  onClick={() => {
                                    if (isBase) return
                                    updatePaletteColor(index, t)
                                    setHexDrafts((d) => {
                                      const next = { ...d }
                                      delete next[index]
                                      return next
                                    })
                                    flashMicro?.(`Swatch → ${t}`)
                                  }}
                                >
                                  {isBase ? '·' : ''}
                                </button>
                              )
                            })}
                            {projectPalette.length < 8 &&
                              tints
                                .filter(
                                  (t) =>
                                    normalizeHex(t) !== normalizeHex(hex)
                                )
                                .slice(0, 2)
                                .map((t) => (
                                  <button
                                    key={`add-${t}`}
                                    type="button"
                                    className="btn btn-ghost btn-sm palette-tint-add"
                                    title={`Add ${t} to palette`}
                                    onClick={() => {
                                      addPaletteColor(t)
                                      flashMicro?.(`Added ${t}`)
                                    }}
                                  >
                                    +{t.slice(0, 4)}
                                  </button>
                                ))}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>

                <div className="palette-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={projectPalette.length >= 8}
                    onClick={() => addPaletteColor('#888888')}
                  >
                    Add color
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!pinCount || extractingPins}
                    title={
                      starredPinCount
                        ? `Sample ★ leave-behind pins (${starredPinCount})`
                        : pinCount
                          ? `Sample all Research pins (${pinCount})`
                          : 'Add pins on Research first'
                    }
                    onClick={() => applyFromPins()}
                  >
                    {extractingPins
                      ? 'Sampling…'
                      : starredPinCount
                        ? 'From ★ pins'
                        : 'From pins'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setProjectPalette([...DEFAULT_PALETTE])
                      setHexDrafts({})
                      setTintOpenIndex(null)
                    }}
                  >
                    Reset default
                  </button>
                </div>
                <p className="panel-hint" style={{ marginTop: '0.45rem', marginBottom: 0 }}>
                  From pins pulls solids, gradients, and image samples from
                  Research {starredPinCount ? '(★ first)' : ''}. Open a swatch’s
                  tints to expand shades.
                </p>
              </div>

              <div className="palette-roles-editor" style={{ marginTop: '1rem' }}>
                <div className="palette-section-head">
                  <p className="field-label" style={{ margin: 0 }}>
                    Pack roles — pick a role, then a swatch
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    title="Nudge text / accent / quiet / cover until AA targets pass"
                    onClick={() => applyAaRoleFix()}
                  >
                    Fix roles for AA
                  </button>
                </div>
                <div className="system-role-assign" style={{ marginTop: '0.45rem' }}>
                  {['cover', 'text', 'accent', 'quiet'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`role-pick-chip${brandRoleAssign === role ? ' is-active' : ''}`}
                      onClick={() => setBrandRoleAssign(role)}
                      title={effectiveRoles[role]}
                    >
                      {role[0].toUpperCase() + role.slice(1)}
                      <span
                        className="role-pick-swatch"
                        style={{ background: effectiveRoles[role] }}
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
                <div className="direction-palette is-clickable" style={{ marginTop: '0.55rem' }}>
                  {projectPalette.map((c, i) => (
                    <button
                      key={`${c}-role-${i}`}
                      type="button"
                      className="palette-swatch-btn"
                      style={{ background: c }}
                      title={`Set as ${brandRoleAssign}`}
                      onClick={() => {
                        const n = normalizeHex(c) || c
                        setColorRole(brandRoleAssign, n)
                        flashMicro(`${brandRoleAssign} → ${n}`)
                      }}
                    ></button>
                  ))}
                </div>
              </div>

              <div className="palette-checker" style={{ marginTop: '1.15rem' }}>
                <div className="palette-section-head">
                  <p className="field-label" style={{ margin: 0 }}>
                    Contrast checker
                  </p>
                  <span className="panel-hint" style={{ margin: 0 }}>
                    WCAG 2.1 · AA ≥ 4.5:1 body · ≥ 3:1 large
                  </span>
                </div>
                <label className="field-label" htmlFor="check-bg">
                  Background color
                </label>
                <select
                  id="check-bg"
                  className="palette-bg-select"
                  value={checkBgIndex}
                  onChange={(e) => setCheckBgIndex(Number(e.target.value))}
                >
                  {projectPalette.map((c, i) => (
                    <option key={`${c}-bg-${i}`} value={i}>
                      {c}
                    </option>
                  ))}
                </select>
                <div
                  className="palette-check-preview"
                  style={{ background: checkBg }}
                >
                  <p
                    className="palette-check-preview-text"
                    style={{ color: bestTextOn(checkBg) }}
                  >
                    Sample text on this background
                  </p>
                </div>
                <ul className="palette-check-list">
                  {contrastPairs.length === 0 ? (
                    <li className="panel-hint">
                      Add at least two different colors to check contrast.
                    </li>
                  ) : (
                    contrastPairs.map((pair) => (
                      <li
                        key={`${pair.fg}-${pair.bg}`}
                        className="palette-check-row"
                      >
                        <span className="palette-check-pair">
                          <span
                            className="palette-check-fg"
                            style={{
                              background: pair.fg,
                              color: bestTextOn(pair.fg),
                            }}
                          >
                            Aa
                          </span>
                          <span className="palette-check-on">on</span>
                          <span
                            className="palette-check-bg-chip"
                            style={{ background: pair.bg }}
                          />
                        </span>
                        <span className="palette-check-ratio">
                          {formatRatio(pair.ratio)}
                        </span>
                        <span
                          className={`palette-check-badge ${pair.label.level}`}
                        >
                          {pair.label.text}
                        </span>
                        <span className="palette-check-detail">
                          {pair.grade.aaNormal
                            ? 'Body text OK'
                            : pair.grade.aaLarge
                              ? 'Large text only'
                              : 'Too low for text'}
                        </span>
                        {!pair.grade.aaNormal && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm palette-fix-pair"
                            title="Nudge this color’s lightness until AA body"
                            onClick={() =>
                              fixPairFg(pair.fg, pair.bg, pair.index)
                            }
                          >
                            Fix AA
                          </button>
                        )}
                      </li>
                    ))
                  )}
                </ul>

                <div className="palette-pass-pairs" style={{ marginTop: '0.85rem' }}>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setShowPassPairs((v) => !v)}
                    aria-expanded={showPassPairs}
                  >
                    {showPassPairs ? 'Hide' : 'Show'} AA pass pairs
                    {passPairs.length ? ` (${passPairs.length})` : ''}
                  </button>
                  {showPassPairs && (
                    <ul className="palette-pass-list">
                      {passPairs.length === 0 ? (
                        <li className="panel-hint">
                          No body-text pairs yet — add contrast or use Fix AA.
                        </li>
                      ) : (
                        passPairs.map((p) => (
                          <li key={`${p.fg}-${p.bg}`} className="palette-pass-row">
                            <span
                              className="palette-pass-chip"
                              style={{
                                background: p.bg,
                                color: p.fg,
                              }}
                              title={`${p.fg} on ${p.bg}`}
                            >
                              Aa
                            </span>
                            <span className="palette-pass-meta">
                              {p.fg} on {p.bg} · {formatRatio(p.ratio)}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {/* 04 Type */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'type'}
            >
              <div className="brand-section-label">Type</div>
              <div className="field-block" style={{ marginBottom: '1rem' }}>
                <label className="field-label" htmlFor="type-pair">
                  Type pair
                </label>
                <select
                  id="type-pair"
                  className="field-input"
                  value={
                    typePairIdFromLabels(
                      activeProject?.typeHeading,
                      activeProject?.typeBody
                    ) || 'custom'
                  }
                  onChange={(e) => {
                    const id = e.target.value
                    if (id === 'custom') return
                    const pair = TYPE_PAIRS.find((p) => p.id === id)
                    if (!pair) return
                    updateBrandField('typeHeading', pair.heading)
                    updateBrandField('typeBody', pair.body)
                    const bump = bumpDesignVersionIfV1()
                    flashMicro(
                      bump?.bumped
                        ? `Type · ${pair.label} · ${bump.version}`
                        : `Type · ${pair.label}`
                    )
                  }}
                >
                  {TYPE_PAIRS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                  <option value="custom">Custom labels…</option>
                </select>
              </div>
              <div className="brand-type-pair">
                <div className="field-block">
                  <label className="field-label" htmlFor="type-heading">
                    Heading face
                  </label>
                  <input
                    id="type-heading"
                    className="field-input"
                    value={
                      activeProject?.typeHeading || 'Plus Jakarta Sans Bold'
                    }
                    onChange={(e) =>
                      updateBrandField('typeHeading', e.target.value)
                    }
                  />
                  <div
                    className="brand-type-display"
                    style={{
                      marginTop: '0.65rem',
                      fontFamily: fontFamilyFromLabel(
                        activeProject?.typeHeading || 'Plus Jakarta Sans Bold'
                      ),
                    }}
                  >
                    {activeProject?.typeHeading || 'Plus Jakarta Sans Bold'}
                  </div>
                </div>
                <div className="field-block" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor="type-body">
                    Body face
                  </label>
                  <input
                    id="type-body"
                    className="field-input"
                    value={
                      activeProject?.typeBody || 'Plus Jakarta Sans Regular'
                    }
                    onChange={(e) =>
                      updateBrandField('typeBody', e.target.value)
                    }
                  />
                  <div
                    className="brand-type-body"
                    style={{
                      marginTop: '0.65rem',
                      fontFamily: fontFamilyFromLabel(
                        activeProject?.typeBody || 'Plus Jakarta Sans Regular'
                      ),
                    }}
                  >
                    {activeProject?.typeBody || 'Plus Jakarta Sans Regular'} —
                    The quick brown fox keeps the brief honest.
                  </div>
                </div>
              </div>
            </section>

            {/* Messaging pillars */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'messaging'}
            >
              <div className="brand-section-label">
                {i18nT(locale, 'ui.messagingPillars') || 'Messaging pillars'}
              </div>
              <p className="panel-hint" style={{ marginTop: 0 }}>
                Promise · proof · personality — ships in the brand book and kit.
              </p>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="msg-promise">
                  {i18nT(locale, 'ui.messagingPromise') || 'Promise'}
                </label>
                <textarea
                  id="msg-promise"
                  className="field-input"
                  rows={2}
                  value={activeProject?.messagingPromise || ''}
                  onChange={(e) =>
                    updateBrandField('messagingPromise', e.target.value)
                  }
                  placeholder="What we commit to for the customer"
                />
              </div>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="msg-proof">
                  {i18nT(locale, 'ui.messagingProof') || 'Proof'}
                </label>
                <textarea
                  id="msg-proof"
                  className="field-input"
                  rows={2}
                  value={activeProject?.messagingProof || ''}
                  onChange={(e) =>
                    updateBrandField('messagingProof', e.target.value)
                  }
                  placeholder="Evidence, credentials, why believe us"
                />
              </div>
              <div className="field-block">
                <label className="field-label" htmlFor="msg-personality">
                  {i18nT(locale, 'ui.messagingPersonality') || 'Personality'}
                </label>
                <textarea
                  id="msg-personality"
                  className="field-input"
                  rows={2}
                  value={activeProject?.messagingPersonality || ''}
                  onChange={(e) =>
                    updateBrandField('messagingPersonality', e.target.value)
                  }
                  placeholder="How we sound and feel in three words + a sentence"
                />
              </div>
            </section>

            {/* 05 Logo lockup suite */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'logo'}
            >
              <div className="brand-section-label">Logo lockups</div>
              <p className="panel-hint" style={{ marginBottom: '0.75rem' }}>
                Mark image, wordmark, clearspace, don’ts — primary / reverse /
                mono in the brand book.
              </p>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-wordmark">
                  Wordmark text
                </label>
                <input
                  id="logo-wordmark"
                  className="field-input"
                  value={activeProject?.logoWordmark || ''}
                  onChange={(e) =>
                    updateBrandField('logoWordmark', e.target.value)
                  }
                  placeholder={
                    activeProject?.name
                      ? `Defaults to “${activeProject.name}”`
                      : 'Brand wordmark'
                  }
                />
              </div>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-custom">
                  Logo direction
                </label>
                <input
                  id="logo-custom"
                  className="field-input"
                  value={activeProject?.logoDirection || ''}
                  onChange={(e) => setLogoDirection(e.target.value)}
                  placeholder="e.g. Soft monoline bird mark · no drop shadows"
                />
              </div>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-clearspace">
                  Clearspace
                </label>
                <textarea
                  id="logo-clearspace"
                  className="field-input"
                  rows={2}
                  value={activeProject?.logoClearspace || ''}
                  onChange={(e) =>
                    updateBrandField('logoClearspace', e.target.value)
                  }
                  placeholder="e.g. Clearspace = ½ mark height on all sides"
                />
              </div>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-min-size">
                  {i18nT(locale, 'ui.logoMinSize') || 'Min size'}
                </label>
                <input
                  id="logo-min-size"
                  className="field-input"
                  value={activeProject?.logoMinSize || ''}
                  onChange={(e) =>
                    updateBrandField('logoMinSize', e.target.value)
                  }
                  placeholder="24px digital · 0.5″ print"
                />
              </div>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-donts">
                  {i18nT(locale, 'ui.logoDonts') || 'Logo don’ts'}
                </label>
                <textarea
                  id="logo-donts"
                  className="field-input"
                  rows={3}
                  value={activeProject?.logoDonts || ''}
                  onChange={(e) =>
                    updateBrandField('logoDonts', e.target.value)
                  }
                  placeholder={
                    'One rule per line (defaults used if empty):\nDo not stretch or distort\nDo not recolor outside palette roles\nDo not place on low-contrast photos'
                  }
                />
              </div>
              {activeProject?.logoImage ? (
                <div
                  className="logo-variant-row"
                  role="group"
                  aria-label={i18nT(locale, 'ui.logoVariants') || 'Variants'}
                >
                  <p className="field-label" style={{ marginBottom: '0.4rem' }}>
                    {i18nT(locale, 'ui.logoVariants') || 'Variants'}
                  </p>
                  <div className="logo-variant-grid">
                    <div className="logo-variant-card is-primary">
                      <span className="logo-variant-label">Primary</span>
                      <img src={activeProject.logoImage} alt="" />
                    </div>
                    <div className="logo-variant-card is-reverse">
                      <span className="logo-variant-label">Reverse</span>
                      <img src={activeProject.logoImage} alt="" />
                    </div>
                    <div className="logo-variant-card is-mono">
                      <span className="logo-variant-label">Mono</span>
                      <img src={activeProject.logoImage} alt="" />
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="finish-secondary-row" style={{ marginTop: '0.85rem' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  {activeProject?.logoImage ? 'Replace mark image' : 'Upload mark image'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      if (file.size > 2.5 * 1024 * 1024) {
                        flashToast(i18nT(locale, 'ui.markTooBig'))
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = () => {
                        setLogoImage(reader.result)
                        const bump = bumpDesignVersionIfV1()
                        flashMicro(
                          bump?.bumped
                            ? `Mark image · ${bump.version}`
                            : 'Mark image added'
                        )
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
                {activeProject?.logoImage ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setLogoImage('')
                      flashMicro(i18nT(locale, 'ui.markRemoved'))
                    }}
                  >
                    Remove mark
                  </button>
                ) : null}
              </div>
            </section>

            {/* Imagery guidelines */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'imagery'}
            >
              <div className="brand-section-label">
                {i18nT(locale, 'ui.imageryGuidelines') || 'Imagery guidelines'}
              </div>
              <p className="panel-hint" style={{ marginTop: 0 }}>
                Style + do/don’t for photos and illustrations. Pairs with ★ pins
                on Research.
              </p>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="img-style">
                  {i18nT(locale, 'ui.imageryStyle') || 'Photo / illustration style'}
                </label>
                <textarea
                  id="img-style"
                  className="field-input"
                  rows={2}
                  value={activeProject?.imageryStyle || ''}
                  onChange={(e) =>
                    updateBrandField('imageryStyle', e.target.value)
                  }
                  placeholder="e.g. Soft natural light · documentary · warm neutrals"
                />
              </div>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="img-do">
                  {i18nT(locale, 'ui.imageryDo') || 'Imagery do'}
                </label>
                <textarea
                  id="img-do"
                  className="field-input"
                  rows={2}
                  value={activeProject?.imageryDo || ''}
                  onChange={(e) =>
                    updateBrandField('imageryDo', e.target.value)
                  }
                  placeholder="Real people, hands at work, quiet environments…"
                />
              </div>
              <div className="field-block">
                <label className="field-label" htmlFor="img-dont">
                  {i18nT(locale, 'ui.imageryDont') || 'Imagery don’t'}
                </label>
                <textarea
                  id="img-dont"
                  className="field-input"
                  rows={2}
                  value={activeProject?.imageryDont || ''}
                  onChange={(e) =>
                    updateBrandField('imageryDont', e.target.value)
                  }
                  placeholder="Stock handshakes, neon gradients, cluttered backgrounds…"
                />
              </div>
            </section>

            {/* 06 Mood from board — starred pack pins only */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'pins'}
            >
              <div className="brand-section-label">
                Leave-behind pins (starred on Research)
              </div>
              {(() => {
                const packPins = deskMood.filter((m) => m.inPack)
                if (packPins.length === 0) {
                  return (
                <div className="brand-mood-empty">
                  <p className="empty-state-body" style={{ margin: 0 }}>
                    Star pins on Research with ★ (max 6). Only starred pins
                    appear here and in your leave-behind PDF.
                  </p>
                  <div className="finish-secondary-row" style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveView('studio')}
                    >
                      Open Research
                    </button>
                  </div>
                </div>
                  )
                }
                return (
                <div className="brand-mood-row">
                  {packPins.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="brand-mood-thumb"
                      style={pinFaceStyle(p)}
                      title={p.note}
                    />
                  ))}
                </div>
                )
              })()}
            </section>

            <div className="brand-export-bar path-continue-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveView('review')}
              >
                {tFormat(locale, 'ui.continueNext', {
                  label: pathLabel(locale, 'review') || 'Review',
                })}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveView('studio')}
              >
                Research
              </button>
            </div>
          </div>
  )
}
