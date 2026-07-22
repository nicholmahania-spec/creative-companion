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
  paletteHealthScore,
  suggestRoleColor,
} from '../lib/color'
import { getProcessPhase } from '../lib/processGuide'
import { pinFaceStyle } from '../lib/moodPins'
import {
  normalizeLocale,
  t as i18nT,
  tFormat,
  pathLabel,
} from '../lib/i18n'
import InfoReveal from '../components/InfoReveal'

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
    if (!brandEditSectionProp) return
    // Map legacy section ids into the 6-tab Tech-Studio set
    const map = {
      messaging: 'essentials',
      voice: 'essentials',
      imagery: 'pins',
    }
    setBrandEditSectionLocal(map[brandEditSectionProp] || brandEditSectionProp)
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
          <div className="brand-layout surface-document system-view design-studio view-enter" data-nav-dir={navDir}>
            <div className="brand-template-top">
              <div>
                <h1 className="page-title">
                  {i18nT(locale, 'path.design')}
                </h1>
                <p className="page-sub">
                  {activeProject?.name || 'Project'}
                  {' · ★'}
                  {deskMood.filter((m) => m.inPack).length}/6
                  {activeProject?.detective?.goal && (
                    <span> · Goal: {String(activeProject.detective.goal).slice(0, 20)}{String(activeProject.detective.goal).length > 20 ? '…' : ''}</span>
                  )}
                  {activeProject?.detective?.brandWords && (
                    <span> · {String(activeProject.detective.brandWords).slice(0, 20)}{String(activeProject.detective.brandWords).length > 20 ? '…' : ''}</span>
                  )}
                  <InfoReveal>
                    {(getProcessPhase('design')?.checks || []).join(' · ')}
                  </InfoReveal>
                </p>
              </div>
              <div className="brand-template-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title={`Version ${activeProject?.designVersion || 'v1'} — bump`}
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
                  {activeProject?.designVersion || 'v1'}
                </button>
              </div>
            </div>

            <div className="design-edit-column">
            <div className="system-accordion-nav design-section-tabs" role="tablist">
              {[
                ['essentials', 'Words'],
                ['colors', 'Color'],
                ['type', 'Type'],
                ['logo', 'Logo'],
                ['pins', 'Pack'],
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
              className="panel brand-section"
              hidden={brandEditSection !== 'essentials'}
            >
              <div className="brand-section-label">Words</div>
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
                  placeholder="One line"
                />
              </div>
              <div className="field-block">
                <label className="field-label" htmlFor="brand-brief">
                  Positioning
                </label>
                <textarea
                  id="brand-brief"
                  className="field-textarea"
                  value={activeProject?.brief || ''}
                  onChange={(e) => updateProjectBrief(e.target.value)}
                  placeholder="Who · feel"
                  rows={2}
                />
              </div>
              <div className="field-block">
                <label className="field-label" htmlFor="brand-voice">
                  Voice
                </label>
                <textarea
                  id="brand-voice"
                  className="field-textarea"
                  value={activeProject?.voice || ''}
                  onChange={(e) => updateBrandField('voice', e.target.value)}
                  placeholder="How we sound"
                  rows={2}
                />
              </div>
              <details className="design-advanced">
                <summary>Do / Don&apos;t · Messages</summary>
                <div className="brand-do-dont" style={{ marginTop: '0.65rem' }}>
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
                      placeholder="Fits"
                      rows={2}
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
                      placeholder="Avoid"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="field-block" style={{ marginTop: '0.75rem' }}>
                  <label className="field-label" htmlFor="msg-promise">
                    Promise
                  </label>
                  <textarea
                    id="msg-promise"
                    className="field-input"
                    rows={2}
                    value={activeProject?.messagingPromise || ''}
                    onChange={(e) =>
                      updateBrandField('messagingPromise', e.target.value)
                    }
                    placeholder="Promise"
                  />
                </div>
                <div className="field-block">
                  <label className="field-label" htmlFor="msg-proof">
                    Proof
                  </label>
                  <textarea
                    id="msg-proof"
                    className="field-input"
                    rows={2}
                    value={activeProject?.messagingProof || ''}
                    onChange={(e) =>
                      updateBrandField('messagingProof', e.target.value)
                    }
                    placeholder="Proof"
                  />
                </div>
                <div className="field-block">
                  <label className="field-label" htmlFor="msg-personality">
                    Personality
                  </label>
                  <textarea
                    id="msg-personality"
                    className="field-input"
                    rows={2}
                    value={activeProject?.messagingPersonality || ''}
                    onChange={(e) =>
                      updateBrandField('messagingPersonality', e.target.value)
                    }
                    placeholder="Personality"
                  />
                </div>
              </details>
            </section>

            {/* Color */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'colors'}
            >
              <div className="brand-section-label">Color</div>
              {(() => {
                const health = paletteHealthScore({
                  palette: projectPalette,
                  colorRoles: activeProject?.colorRoles || {},
                  colorRoleWhy: activeProject?.colorRoleWhy || {},
                })
                return (
                  <div className="palette-health">
                    <div className="palette-health-head">
                      <span className="field-label" style={{ margin: 0 }}>
                        Palette health
                      </span>
                      <span
                        className={`palette-health-score${
                          health.score >= 80
                            ? ' is-good'
                            : health.score >= 50
                              ? ' is-mid'
                              : ' is-low'
                        }`}
                      >
                        {health.score}%
                      </span>
                    </div>
                    <div className="palette-health-bar">
                      <div
                        className="palette-health-bar-fill"
                        style={{ width: `${health.score}%` }}
                      />
                    </div>
                  </div>
                )
              })()}
              <div className="brand-palette-block" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                <div className="palette-section-head">
                  <p className="field-label" style={{ margin: 0 }}>
                    Palette
                  </p>
                  <span className="panel-hint" style={{ margin: 0 }}>
                    {projectPalette.length}/8
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

              </div>

              <div className="palette-roles-editor" style={{ marginTop: '1rem' }}>
                <div className="palette-section-head">
                  <p className="field-label" style={{ margin: 0 }}>
                    Pack roles
                  </p>
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
                      className="palette-role-swatch-btn"
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

              <details className="design-advanced">
                <summary>AA · Why · Suggest</summary>
                <div className="finish-secondary-row" style={{ marginTop: '0.65rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    title="Nudge text / accent / quiet / cover until AA targets pass"
                    onClick={() => applyAaRoleFix()}
                  >
                    Fix AA
                  </button>
                  {!activeProject?.colorRoles?.[brandRoleAssign] && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm palette-suggest-btn"
                      onClick={() => {
                        const suggestion = suggestRoleColor(
                          projectPalette,
                          brandRoleAssign
                        )
                        setColorRole(brandRoleAssign, suggestion)
                        flashMicro(
                          `Suggested ${brandRoleAssign} → ${suggestion}`
                        )
                      }}
                    >
                      Suggest {brandRoleAssign}
                    </button>
                  )}
                </div>
                {(() => {
                  const roleWhy = activeProject?.colorRoleWhy || {}
                  const brandWords = activeProject?.detective?.brandWords || ''
                  const justifiedCount = [
                    'cover',
                    'text',
                    'accent',
                    'quiet',
                  ].filter((r) => String(roleWhy[r] || '').trim()).length
                  return (
                    <div className="field-block" style={{ marginTop: '0.65rem' }}>
                      <label className="field-label" htmlFor="color-role-why">
                        Why {brandRoleAssign}
                        {brandWords.trim()
                          ? ` · ${brandWords.trim().slice(0, 24)}`
                          : ''}
                        <span
                          className="panel-hint"
                          style={{ marginLeft: '0.4rem' }}
                        >
                          {justifiedCount}/4
                        </span>
                      </label>
                      <input
                        id="color-role-why"
                        className="field-input"
                        value={roleWhy[brandRoleAssign] || ''}
                        onChange={(e) =>
                          updateBrandField('colorRoleWhy', {
                            cover: '',
                            text: '',
                            accent: '',
                            quiet: '',
                            ...roleWhy,
                            [brandRoleAssign]: e.target.value,
                          })
                        }
                        placeholder="Why this role"
                      />
                    </div>
                  )
                })()}

                <div className="palette-checker" style={{ marginTop: '0.85rem' }}>
                  <div className="palette-section-head">
                    <p className="field-label" style={{ margin: 0 }}>
                      Contrast
                    </p>
                  </div>
                  <label className="field-label" htmlFor="check-bg">
                    Background
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
                      Aa
                    </p>
                  </div>
                  <ul className="palette-check-list">
                    {contrastPairs.length === 0 ? (
                      <li className="panel-hint">2+ colors</li>
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
                              ? 'OK'
                              : pair.grade.aaLarge
                                ? 'Large'
                                : 'Fail'}
                          </span>
                          {!pair.grade.aaNormal && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm palette-fix-pair"
                              title="Nudge lightness until AA body"
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

                  <div
                    className="palette-pass-pairs"
                    style={{ marginTop: '0.85rem' }}
                  >
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => setShowPassPairs((v) => !v)}
                      aria-expanded={showPassPairs}
                    >
                      {showPassPairs ? 'Hide' : 'Show'} pass pairs
                      {passPairs.length ? ` (${passPairs.length})` : ''}
                    </button>
                    {showPassPairs && (
                      <ul className="palette-pass-list">
                        {passPairs.length === 0 ? (
                          <li className="panel-hint">None</li>
                        ) : (
                          passPairs.map((p) => (
                            <li
                              key={`${p.fg}-${p.bg}`}
                              className="palette-pass-row"
                            >
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
              </details>
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
              <details className="design-advanced">
                <summary>Why this pair</summary>
                <div className="field-block" style={{ marginTop: '0.65rem' }}>
                  <label className="field-label" htmlFor="type-why">
                    Why
                    {activeProject?.detective?.brandWords?.trim()
                      ? ` · ${activeProject.detective.brandWords.trim().slice(0, 32)}`
                      : ''}
                  </label>
                  <input
                    id="type-why"
                    className="field-input"
                    value={activeProject?.typeWhy || ''}
                    onChange={(e) =>
                      updateBrandField('typeWhy', e.target.value)
                    }
                    placeholder="Why these fonts"
                  />
                </div>
              </details>
            </section>

            {/* Logo */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'logo'}
            >
              <div className="brand-section-label">Logo</div>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-wordmark">
                  Wordmark
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
                  placeholder="Mark rules"
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
                  placeholder="Clearspace"
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
                  placeholder="Min size"
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

            {/* Pack — starred pins + imagery advanced */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'pins'}
            >
              <div className="brand-section-label">Pack</div>
              {(() => {
                const packPins = deskMood.filter((m) => m.inPack)
                if (packPins.length === 0) {
                  return (
                    <div className="brand-mood-empty">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setActiveView('studio')}
                      >
                        ★ pins in Research
                      </button>
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
              <details className="design-advanced">
                <summary>Imagery guidelines</summary>
                <div className="field-block" style={{ marginTop: '0.65rem' }}>
                  <label className="field-label" htmlFor="img-style">
                    {i18nT(locale, 'ui.imageryStyle') || 'Style'}
                  </label>
                  <textarea
                    id="img-style"
                    className="field-input"
                    rows={2}
                    value={activeProject?.imageryStyle || ''}
                    onChange={(e) =>
                      updateBrandField('imageryStyle', e.target.value)
                    }
                    placeholder="Look"
                  />
                </div>
                <div className="field-block">
                  <label className="field-label" htmlFor="img-do">
                    {i18nT(locale, 'ui.imageryDo') || 'Do'}
                  </label>
                  <textarea
                    id="img-do"
                    className="field-input"
                    rows={2}
                    value={activeProject?.imageryDo || ''}
                    onChange={(e) =>
                      updateBrandField('imageryDo', e.target.value)
                    }
                    placeholder="Do"
                  />
                </div>
                <div className="field-block">
                  <label className="field-label" htmlFor="img-dont">
                    {i18nT(locale, 'ui.imageryDont') || "Don't"}
                  </label>
                  <textarea
                    id="img-dont"
                    className="field-input"
                    rows={2}
                    value={activeProject?.imageryDont || ''}
                    onChange={(e) =>
                      updateBrandField('imageryDont', e.target.value)
                    }
                    placeholder="Don't"
                  />
                </div>
              </details>
            </section>
            </div>

            {/* Preview — sticky 45% right on wide */}
            <div
              className="system-artboard-sticky design-preview-rail"
              tabIndex={0}
              role="region"
              aria-label="Live leave-behind preview"
            >
              <div className="design-rail-label">Preview</div>
              <Suspense
                fallback={<div className="panel-hint">Loading…</div>}
              >
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

            <div className="brand-export-bar path-continue-row">
              <button
                type="button"
                className="btn btn-secondary work-path-next"
                onClick={() => setActiveView('review')}
              >
                {tFormat(locale, 'ui.continueNext', {
                  label: pathLabel(locale, 'review') || 'Review',
                })}
              </button>
            </div>
          </div>
  )
}
