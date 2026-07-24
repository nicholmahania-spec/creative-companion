/**
 * Design step — live artboard preview + accordion editors
 * (tagline, voice, colors, type, logo, pack pins).
 * Owns palette hex drafts / role assign / contrast checker local state.
 */
import { useState, useEffect, useMemo, Suspense, lazy } from 'react'
import useAppStore from '../store/useAppStore'
import { useFigma } from '../hooks/useFigma'
import assetService from '../services/assetService'
import versionService from '../services/versionService'
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
import { trackTemplateAction } from '../lib/analytics'

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
  brandEditSectionProp,
  setBrandEditSectionProp,
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
  // Version history state
  const [versionHistory, setVersionHistory] = useState([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [diffResult, setDiffResult] = useState(null)
  const [loadingDiff, setLoadingDiff] = useState(false)
  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [permission, setPermission] = useState('view')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [invitedEmail, setInvitedEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    setSharing(true)
    try {
      await new Promise(r => setTimeout(r, 500))
      flashToast?.('Design shared successfully')
      setShowShareDialog(false)
    } finally {
      setSharing(false)
    }
  }

  const inviteViaEmail = async () => {
    if (!inviteEmail || !/\S+@\S+\.\S+/.test(inviteEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }
    setEmailError('')
    setInviting(true)
    try {
      await new Promise(r => setTimeout(r, 500))
      setInvitedEmail(inviteEmail)
      setInviteEmail('')
    } finally {
      setInviting(false)
    }
  }

  // Template management state
  const [templates, setTemplates] = useState([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Figma integration
  const {
    isInitialized: figmaInitialized,
    isAuthenticated: figmaAuthenticated,
    user: figmaUser,
    error: figmaError,
    isLoading: figmaLoading,
    login: figmaLogin,
    handleCallback: figmaHandleCallback,
    logout: figmaLogout,
    getFile: figmaGetFile,
    importDesign: figmaImportDesign,
    isConfigured: figmaIsConfigured,
    hasSession: figmaHasSession,
  } = useFigma()

  const [figmaFileKey, setFigmaFileKey] = useState('')
  const [importedColors, setImportedColors] = useState([])
  const [importedDesign, setImportedDesign] = useState(null)
  const [importingDesign, setImportingDesign] = useState(false)

  useEffect(() => {
    if (checkBgIndex >= projectPalette.length) {
      setCheckBgIndex(Math.max(0, projectPalette.length - 1))
    }
  }, [projectPalette.length, checkBgIndex])

  // Load version history when project changes
  useEffect(() => {
    loadVersionHistory()
  }, [activeProject?.id])

  // Load version diff between selected version and current state
  const loadVersionDiff = async (versionId) => {
    if (!versionId) return

    setLoadingDiff(true)
    setDiffResult(null)
    try {
      const version = await versionService.getVersionById(versionId)
      if (!version) {
        setDiffResult({ error: 'Version not found' })
        return
      }

      // Get current state
      const store = useAppStore.getState()
      const { currentProjectId } = store

      if (!currentProjectId) {
        setDiffResult({ error: 'No active project' })
        return
      }

      // Create a snapshot of current state for comparison
      const currentVersion = await versionService.createVersionSnapshot()
      if (!currentVersion) {
        setDiffResult({ error: 'Unable to create current version snapshot' })
        return
      }

      // Calculate diff between selected version and current state
      const diff = versionService.diffVersions(version, currentVersion)
      setDiffResult(diff)
    } catch (error) {
      console.error('Failed to load version diff:', error)
      setDiffResult({ error: 'Failed to generate diff' })
    } finally {
      setLoadingDiff(false)
    }
  }

  // Load templates
  const loadTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const state = useAppStore.getState()
      const raw = state.templates || []
      setTemplates([...raw].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
    } catch (error) {
      console.error('Failed to load templates:', error)
      flashToast?.('Failed to load templates')
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Save current project as template
  const saveAsTemplate = async (name, description) => {
    if (!name.trim()) {
      flashToast?.('Template name is required')
      return false
    }

    try {
      const store = useAppStore.getState()
      const result = store.saveAsTemplate(name.trim(), description.trim())
      if (result.ok) {
        await loadTemplates()
        setShowSaveAsTemplateModal(false)
        setTemplateName('')
        setTemplateDescription('')
        setSelectedTemplate(null)
        flashToast?.('Template saved successfully')
        // Track template save action - we need to get the newly created template
        // Since the store.saveAsTemplate returns the templateId, we can use that
        // or get the updated templates list
        const updatedTemplates = [...(useAppStore.getState().templates || [])].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        const newTemplate = updatedTemplates.find(t =>
          t.name === name.trim() &&
          t.description === description.trim()
        ) || updatedTemplates[updatedTemplates.length - 1]; // fallback to last one
        trackTemplateAction('save', newTemplate)
        return true
      } else {
        flashToast?.(`Failed to save template: ${result.error}`)
        return false
      }
    } catch (error) {
      console.error('Failed to save template:', error)
      flashToast?.('Failed to save template')
      return false
    }
  }

  // Apply template to current project
  const applyTemplate = async (templateId) => {
    try {
      const store = useAppStore.getState()
      const result = store.applyTemplate(templateId)
      if (result.ok) {
        // Refresh version history after applying template
        await loadVersionHistory()
        flashMicro?.('Template applied successfully')
        // Track template apply action
        const appliedTemplate = store.getTemplateById(templateId)
        trackTemplateAction('apply', appliedTemplate)
        return true
      } else {
        flashToast?.(`Failed to apply template: ${result.error}`)
        return false
      }
    } catch (error) {
      console.error('Failed to apply template:', error)
      flashToast?.('Failed to apply template')
      return false
    }
  }

  // Delete template
  const deleteTemplate = async (templateId) => {
    try {
      const store = useAppStore.getState()
      // Get template details before deleting for tracking
      const templateToDelete = store.getTemplateById(templateId)
      const result = store.deleteTemplate(templateId)
      if (result.ok) {
        await loadTemplates()
        flashMicro?.('Template deleted')
        // Track template delete action
        trackTemplateAction('delete', templateToDelete)
        return true
      } else {
        flashToast?.(`Failed to delete template: ${result.error}`)
        return false
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
      flashToast?.('Failed to delete template')
      return false
    }
  }

  // Update template
  const updateTemplate = async (templateId, updates) => {
    try {
      const store = useAppStore.getState()
      // Get template details before updating for tracking
      const templateBeforeUpdate = store.getTemplateById(templateId)
      const result = store.updateTemplate(templateId, updates)
      if (result.ok) {
        await loadTemplates()
        // Track template update action
        trackTemplateAction('update', {
          ...templateBeforeUpdate,
          ...updates
        })
        return true
      } else {
        flashToast?.(`Failed to update template: ${result.error}`)
        return false
      }
    } catch (error) {
      console.error('Failed to update template:', error)
      flashToast?.('Failed to update template')
      return false
    }
  }

  // Load version history
  const loadVersionHistory = async () => {
    if (!activeProject?.id) return

    setLoadingVersions(true)
    try {
      const versions = await versionService.getProjectVersions(activeProject.id)
      setVersionHistory(versions)
    } catch (error) {
      console.error('Failed to load version history:', error)
      flashToast?.('Failed to load version history')
    } finally {
      setLoadingVersions(false)
    }
  }

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

  // Figma import function
  const importFigmaDesign = async () => {
    if (!figmaFileKey.trim()) return

    setImportingDesign(true)
    try {
      // Extract just the file ID if a full URL was provided
      const fileId = figmaFileKey.trim().split('/').pop().split('?')[0]

      const result = await figmaImportDesign(fileId, { extractColors: true })

      if (result && result.colors) {
        setImportedColors(result.colors)
        setImportedDesign(result)

        // Show a toast notification
        flashToast?.(`Imported ${result.colors.length} colors from Figma file: ${result.file?.name}`);

        // Set state to show the template modal
        setShowTemplateModal(true);
      }
    } catch (err) {
      // Error is handled by the hook
      console.error('Failed to import Figma design:', err)
    } finally {
      setImportingDesign(false)
    }
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
    <>
          <div className="brand-layout surface-document system-view design-studio view-enter" data-nav-dir={navDir}>
            <div className="brand-template-top">
              <div>
                <h1 className="page-title">
                  {i18nT(locale, 'path.design')}
                </h1>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveView('design-focus')}
                >
                  Try Focus Mode (beta)
                </button>
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
                <div className="version-controls">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title={`Version ${activeProject?.designVersion || 'v1'} — bump`}
                    onClick={async () => {
                      const r = bumpDesignVersion()
                      if (r?.ok)
                        flashMicro(
                          tFormat(locale, 'ui.versionBumped', {
                            version: r.version,
                          })
                        )
                      // Refresh version history after bumping
                      await loadVersionHistory()
                    }}
                  >
                    {activeProject?.designVersion || 'v1'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title="View version history"
                    onClick={async () => {
                      await loadVersionHistory()
                      setShowVersionHistory(true)
                    }}
                  >
                    History
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title="Share design"
                    onClick={() => {
                      setShowShareDialog(true)
                    }}
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title="Manage templates"
                    onClick={async () => {
                      await loadTemplates()
                      setShowTemplateModal(true)
                    }}
                  >
                    Templates
                  </button>
                </div>
              </div>
            </div>

            <div className="design-edit-column">
            <div className="system-accordion-nav design-section-tabs" role="tablist">
              {[
                ['essentials', 'Words'],
                ['colors', 'Color'],
                ['type', 'Type'],
                ['figma', 'Figma'],
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
                          })}
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
                            <span className="palette-check-bg-chip"
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
                          {(!pair.grade.aaNormal && (
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
                          ))}
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

            {/* Figma */}
            <section
              className="panel brand-section"
              hidden={brandEditSection !== 'figma'}
            >
              <div className="brand-section-label">Figma Integration</div>
              {(!figmaIsConfigured) && (
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500">
                  <h3 className="font-semibold mb-2">Figma Not Configured</h3>
                  <p className="mb-2">
                    To use Figma integration, please add your Figma Client ID and Client Secret to your
                    <code className="bg-gray-200 px-1 py-0.5 rounded">.env.local</code> file:
                  </p>
                  <pre className="mb-3 p-3 bg-gray-100 rounded overflow-auto text-xs">
VITE_FIGMA_CLIENT_ID=your_client_id_here
VITE_FIGMA_CLIENT_SECRET=your_client_secret_here
                  </pre>
                  <p className="text-sm text-gray-500">
                    Get these values from{' '}
                    <a href="https://www.figma.com/settings" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Figma Settings → Personal Access Tokens
                    </a>
                  </p>
                </div>
              )}
              {figmaIsConfigured && !figmaInitialized && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="mt-2">Initializing Figma integration...</p>
                </div>
              )}
              {figmaIsConfigured && figmaInitialized && !figmaAuthenticated && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Connect to Figma</h3>
                    <p className="text-gray-600">
                      Connect your Figma account to import designs, extract colors, and sync assets directly into your Creative Companion projects.
                    </p>
                    <button
                      onClick={figmaLogin}
                      disabled={figmaLoading}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {figmaLoading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-b-2 border-white"></div>
                          Connecting...
                        </>
                      ) : (
                        'Connect to Figma'
                      )}
                    </button>
                    {figmaError && (
                      <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                        {figmaError}
                      </div>
                    )}
                  </div>
                </>
              )}
              {figmaIsConfigured && figmaInitialized && figmaAuthenticated && (
                <>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {figmaUser?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-medium">{figmaUser?.name || 'Connected'}</h3>
                      <p className="text-sm text-gray-500">@{figmaUser?.handle || 'figma_user'}</p>
                    </div>
                  </div>

                  <button
                    onClick={figmaLogout}
                    className="w-full mb-4 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  >
                    Disconnect from Figma
                  </button>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Import Design from Figma</h3>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!figmaFileKey.trim()) return;
                        importFigmaDesign();
                      }} className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-2">Figma File URL or ID:</label>
                          <div className="relative">
                            <input
                              type="text"
                  value={figmaFileKey}
                  onChange={(e) => setFigmaFileKey(e.target.value)}
                  placeholder="https://www.figma.com/file/FILE_ID/FILE-NAME or just FILE_ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            {importingDesign && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            You can paste either the full Figma URL or just the file ID (the alphanumeric code in the URL)
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={!figmaFileKey.trim() || importingDesign}
                          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {importingDesign ? 'Importing...' : 'Import Design'}
                        </button>
                      </form>
                    </div>

                    {importedColors.length > 0 && (
                      <div className="mt-4 p-4 bg-indigo-50 border-l-4 border-indigo-500">
                        <h3 className="font-semibold mb-3">Colors Extracted</h3>
                        <div className="flex flex-wrap gap-2">
                          {importedColors.map((color, index) => (
                            <span
                              key={index}
                              className="inline-flex h-8 w-8 items-center justify-center rounded text-xs font-medium"
                              style={{ backgroundColor: color, color: bestTextOn(color) }}
                            >
                              {color}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            // Add the first few colors to the palette
                            const colorsToAdd = importedColors.slice(0, Math.min(8 - projectPalette.length, importedColors.length));
                            colorsToAdd.forEach((color, index) => {
                              const paletteIndex = projectPalette.length + index;
                              if (paletteIndex < 8) {
                                updatePaletteColor(paletteIndex, color);
                              }
                            });
                            setImportedColors([]);
                            setImportedDesign(null);
                            setFigmaFileKey('');
                          }}
                          className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                        >
                          Add Colors to Palette
                        </button>
                      </div>
                    )}

                    {importedDesign && (
                      <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500">
                        <h3 className="font-semibold mb-3">Design Imported</h3>
                        <div className="space-y-3">
                          <div>
                            <span className="font-medium">File:</span> {importedDesign.file?.name}
                          </div>
                          <div>
                            <span className="font-medium">Imported at:</span> {new Date(importedDesign.metadata?.importedAt || Date.now()).toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-3">
                          <button
                            onClick={() => {
                              // This would typically trigger a more complex import process
                              // For now, we'll just show a message
                              alert('Design import functionality would be implemented here in a full version');
                            }}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                          >
                            Use Imported Design
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
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
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      if (file.size > 2.5 * 1024 * 1024) {
                        flashToast(i18nT(locale, 'ui.markTooBig'))
                        return
                      }

                      try {
                        // Show uploading state
                        const uploadButton = e.target.closest('label').querySelector('span')
                        const originalText = uploadButton.textContent
                        uploadButton.textContent = 'Uploading...'

                        // Upload to storage
                        const result = await assetService.uploadImage(file, 'assets', `logos/${Date.now()}-${file.name}`)

                        // Update state with URL
                        setLogoImage(result.url)

                        const bump = bumpDesignVersionIfV1()
                        flashMicro(
                          bump?.bumped
                            ? `Mark image · ${bump.version}`
                            : 'Mark image added'
                        )

                        // Reset button text
                        uploadButton.textContent = originalText
                      } catch (error) {
                        console.error('Error uploading logo:', error)
                        flashToast('Failed to upload image. Please try again.')
                        // Reset button text on error
                        const uploadButton = e.target.closest('label').querySelector('span')
                        uploadButton.textContent = 'Upload mark image'
                      }
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

          {/* Version History Modal */}
          {showVersionHistory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="flex flex-col h-full">
                  <div className="border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Version History</h2>
                    <button
                      onClick={() => setShowVersionHistory(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    {loadingVersions ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p>Loading version history...</p>
                      </div>
                    ) : versionHistory.length === 0 ? (
                      <div className="text-center py-8 text-color-muted">
                        <p>No versions found for this project.</p>
                        <p className="mt-2">Create a version by making changes and bumping the design version.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {versionHistory.map((version) => (
                          <div
                            key={version.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedVersion(version)
                              setDiffResult(null)
                              // Load diff between selected version and current state
                              loadVersionDiff(version.id)
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-medium">{version.versionLabel || 'Unnamed'}</h3>
                                <p className="text-sm text-color-muted">
                                  {new Date(version.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right space-x-2">
                                {version.changeSummary?.severity && (
                                  <span
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      version.changeSummary.severity === 'major'
                                        ? 'bg-red-100 text-red-800'
                                        : version.changeSummary.severity === 'minor'
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-green-100 text-green-800'
                                    }`}
                                  >
                                    {version.changeSummary.severity}
                                  </span>
                                )}
                                {version.changeSummary?.changeCount && (
                                  <span className="text-xs text-color-muted">
                                    {version.changeSummary.changeCount} changes
                                  </span>
                                )}
                              </div>
                            </div>
                            {version.changeSummary?.summary && (
                              <p className="mt-2 text-sm text-color-muted">
                                {version.changeSummary.summary}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {(selectedVersion || diffResult) && (
                    <div className="border-t pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold">
                          {selectedVersion ? 'Comparing Versions' : 'Diff Details'}
                        </h3>
                        <button
                          onClick={() => {
                            setSelectedVersion(null)
                            setDiffResult(null)
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </div>
                      <div className="space-y-6">
                        {/* Version info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium">Current Version</h4>
                            <p className="text-sm text-color-muted">
                              {activeProject?.designVersion || 'v1'} •{" "}
                              {new Date().toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium">Selected Version</h4>
                            <p className="text-sm text-color-muted">
                              {selectedVersion?.versionLabel || 'Unnamed'} •{" "}
                              {new Date(selectedVersion.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Diff results or loading */}
                        {loadingDiff ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p>Generating diff...</p>
                          </div>
                        ) : diffResult ? (
                          <div>
                            {diffResult.error ? (
                              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                                <p className="text-red-700">{diffResult.error}</p>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center mb-4">
                                  <span className={`px-3 py-1 text-xs rounded-full ${
                                    diffResult.severity === 'major'
                                      ? 'bg-red-100 text-red-800'
                                      : diffResult.severity === 'minor'
                                        ? 'bg-orange-100 text-orange-800'
                                        : diffResult.changeCount > 10
                                          ? 'bg-red-100 text-red-800'
                                          : diffResult.changeCount > 5
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-green-100 text-green-800'
                                  }`}
                                  >
                                    {diffResult.severity || 'patch'}
                                  </span>
                                  <span className="ml-4 font-medium">
                                    {diffResult.changeCount} changes
                                  </span>
                                </div>
                                <p className="text-sm text-color-muted mb-4">
                                  {diffResult.summary}
                                </p>

                                {/* Changes breakdown */}
                                <div className="space-y-4">
                                  {diffResult.modified.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">Modified ({diffResult.modified.length})</h4>
                                      <div className="space-y-2">
                                        {diffResult.modified.map((change) => (
                                          <div key={change.field} className="text-sm">
                                            <span className="font-medium">{change.field}:</span>
                                            {" "}
                                            <span className="text-color-muted">{change.oldValue}</span>
                                            <span className="ml-2 text-red-600">→</span>
                                            <span className="ml-2 text-green-600">{change.newValue}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {diffResult.added.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">Added ({diffResult.added.length})</h4>
                                      <div className="space-y-2">
                                        {diffResult.added.map((change) => (
                                          <div key={change.field} className="text-sm">
                                            <span className="font-medium">{change.field}:</span>
                                            {" "}
                                            <span className="text-green-600">{change.value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {diffResult.removed.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">Removed ({diffResult.removed.length})</h4>
                                      <div className="space-y-2">
                                        {diffResult.removed.map((change) => (
                                          <div key={change.field} className="text-sm">
                                            <span className="font-medium">{change.field}:</span>
                                            {" "}
                                            <span className="text-red-600">{change.value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-color-muted">
                              Select a version from the history to see the diff
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Share Dialog */}
          {showShareDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h2 className="text-xl font-bold text-color-primary">Share Design</h2>
                    <p className="text-color-muted">
                      Share your design with teammates or clients to collaborate or review.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-center space-x-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <div>
                          <p className="font-medium text-color-primary shareable-link" id="shareable-link">
                            https://designcompanion.com/projects/{activeProject?.id || '123abc'}
                          </p>
                          <button
                            onClick={() => {
                              const el = document.getElementById('shareable-link')
                              navigator.clipboard?.writeText(el?.textContent?.trim() || '')
                            }}
                            className="ml-auto text-sm text-blue-600 hover:text-blue-800"
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="font-medium text-color-primary">Permission Settings</p>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="permission"
                          value="view"
                          checked={permission === 'view'}
                          onChange={(e) => setPermission(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2">View only</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="permission"
                          value="edit"
                          checked={permission === 'edit'}
                          onChange={(e) => setPermission(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2">Can edit</span>
                      </label>
                    </div>
                  </div>

                  {emailError && (
                    <p className="text-sm text-red-600">{emailError}</p>
                  )}

                  <div className="flex items-center space-x-2">
                    <input
                      type="email"
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                    </input>
                    <button
                      onClick={inviteViaEmail}
                      disabled={!inviteEmail || inviting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviting ? 'Inviting...' : 'Invite'}
                    </button>
                  </div>

                  {invitedEmail && (
                    <p className="text-sm text-green-600 mt-2">
                      Invitation sent to {invitedEmail}
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowShareDialog(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sharing ? 'Sharing...' : 'Share Design'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template Library Modal */}
          {showTemplateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="flex flex-col h-full">
                  <div className="border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Template Library</h2>
                    <button
                      onClick={() => setShowTemplateModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    {loadingTemplates ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p>Loading templates...</p>
                      </div>
                    ) : templates.length === 0 ? (
                      <div className="text-center py-8 text-color-muted">
                        <p>No templates saved yet.</p>
                        <p className="mt-2">Create templates from your designs to reuse them later.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedTemplate(template)
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-medium">{template.name}</h3>
                                {template.description && (
                                  <p className="text-sm text-color-muted">
                                    {template.description}
                                  </p>
                                )}
                                <p className="text-xs text-color-muted">
                                  Created: {new Date(template.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    applyTemplate(template.id)
                                    setShowTemplateModal(false)
                                  }}
                                  className="btn btn-sm btn-primary"
                                >
                                  Apply
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowSaveAsTemplateModal(true)
                                    // Pre-fill the form with template data for updating
                                    setTemplateName(template.name)
                                    setTemplateDescription(template.description || '')
                                  }}
                                  className="btn btn-sm btn-ghost"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteTemplate(template.id)
                                  }}
                                  className="btn btn-sm btn-ghost text-red-500 hover:text-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save as Template Modal */}
          {showSaveAsTemplateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                <div className="flex flex-col h-full">
                  <div className="border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-semibold">
                      {selectedTemplate ? 'Update Template' : 'Save as Template'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowSaveAsTemplateModal(false)
                        setTemplateName('')
                        setTemplateDescription('')
                        setSelectedTemplate(null)
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex-1 p-6">
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      if (selectedTemplate) {
                        // Update existing template
                        updateTemplate(selectedTemplate.id, {
                          name: templateName,
                          description: templateDescription
                        }).then(() => {
                          loadTemplates()
                          setShowSaveAsTemplateModal(false)
                          setTemplateName('')
                          setTemplateDescription('')
                          setSelectedTemplate(null)
                          flashMicro?.('Template updated')
                        })
                      } else {
                        // Save new template
                        saveAsTemplate(templateName, templateDescription)
                      }
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium mb-2">Template Name</label>
                        <input
                          type="text"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Enter template name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium mb-2">Description (optional)</label>
                        <textarea
                          value={templateDescription}
                          onChange={(e) => setTemplateDescription(e.target.value)}
                          placeholder="Describe when to use this template"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex justify-end pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSaveAsTemplateModal(false)
                            setTemplateName('')
                            setTemplateDescription('')
                            setSelectedTemplate(null)
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!templateName.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          {selectedTemplate ? 'Update Template' : 'Save Template'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
    </>
  )
}