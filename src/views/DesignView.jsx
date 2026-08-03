/**
 * Identity — one job per screen under a single path stop:
 * Mark → Words → Colour → Type → Preview.
 * Stationery lives on Assets; ★ pack pins stay on Research.
 */
import { useState, useEffect, useMemo, Suspense, lazy } from 'react'
import { labelForStepId } from '../lib/journey/journey'
import {
  IDENTITY_SUBSTEPS,
  resolveIdentitySubstep,
  nextIdentitySubstep,
  prevIdentitySubstep,
} from '../lib/journey/identitySubsteps'
import useAppStore from '../store/useAppStore'
import versionService, {
  versionIdentityPreview,
  versionKindLabel,
} from '../services/versionService'
import { messageDayLabel } from '../lib/client/messageDayLabel'
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
import { loadTypePairFont, loadBrandFamilies } from '../lib/book/fontLoader'
import { chosenDirection } from '../lib/decisionLog'
import { applyBrandCssVars, clearBrandCssVars } from '../lib/brandCssVars'
import '../styles/lazy-design.css'

/** User-facing labels for palette role chips (store keys stay cover/text/…). */
const ROLE_LABELS = {
  cover: 'Primary',
  accent: 'Accent',
  text: 'Ink',
  quiet: 'Paper',
}

const BrandArtboard = lazy(() => import('../components/BrandArtboard'))

export default function DesignView({
  navDir = 'none',
  journeyNext = null,
  activeProject = null,
  deskMood = [],
  projectPalette = [],
  hidePackWatermark = false,
  setActiveView,
  flashToast,
  flashMicro,
  /** One-shot deep link from Review/Deliver readiness — cleared after apply */
  brandEditSectionProp = null,
  setBrandEditSectionProp = null,
}) {
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const updateDirection = useAppStore((s) => s.updateDirection)
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

  /* Resume from project; sub-nav / Next / deep link all write identitySubstep. */
  const identitySubstep = resolveIdentitySubstep(activeProject?.identitySubstep)
  const setIdentitySubstep = (id) => {
    const next = resolveIdentitySubstep(id)
    if (next === identitySubstep) return
    updateBrandField('identitySubstep', next)
  }
  const [deepLinkFocus, setDeepLinkFocus] = useState(null)
  const [brandRoleAssign, setBrandRoleAssign] = useState('cover')
  const [checkBgIndex, setCheckBgIndex] = useState(0)
  const [hexDrafts, setHexDrafts] = useState({})
  const [extractingPins, setExtractingPins] = useState(false)
  const [showPassPairs, setShowPassPairs] = useState(false)
  // Version history state
  const [versionHistory, setVersionHistory] = useState([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [diffResult, setDiffResult] = useState(null)
  const [loadingDiff, setLoadingDiff] = useState(false)
  const [restoringVersion, setRestoringVersion] = useState(false)

  // Template management state
  const [templates, setTemplates] = useState([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [loadingTemplates, setLoadingTemplates] = useState(false)


  useEffect(() => {
    if (checkBgIndex >= projectPalette.length) {
      setCheckBgIndex(Math.max(0, projectPalette.length - 1))
    }
  }, [projectPalette.length, checkBgIndex])

  /* Live brand tokens → :root / .app so swatches and previews share one map. */
  useEffect(() => {
    applyBrandCssVars(activeProject)
    return () => clearBrandCssVars()
  }, [
    activeProject?.id,
    projectPalette,
    activeProject?.colorRoles?.cover,
    activeProject?.colorRoles?.text,
    activeProject?.colorRoles?.accent,
    activeProject?.colorRoles?.quiet,
  ])

  // Fetch the type pair's real Google Fonts stylesheet so the artboard
  // (and this page) render the actual face, not just its name. Runs on
  // every visit too, since a stored pair from an earlier session never
  // triggered a selection event in this browser tab.
  useEffect(() => {
    const id = typePairIdFromLabels(activeProject?.typeHeading, activeProject?.typeBody)
    const pair = TYPE_PAIRS.find((p) => p.id === id)
    loadTypePairFont(pair?.googleCss || null)
    // index.html no longer ships the display families statically, so also
    // fetch whatever the heading/body labels actually name — this covers
    // custom labels that don't map to a known pair, which would otherwise
    // render in the UI fallback.
    loadBrandFamilies([activeProject?.typeHeading, activeProject?.typeBody])
  }, [activeProject?.typeHeading, activeProject?.typeBody])

  // Load version history when project changes
  useEffect(() => {
    loadVersionHistory()
  }, [activeProject?.id])

  const restoreSelectedVersion = async () => {
    if (!selectedVersion?.id || restoringVersion) return
    const label = selectedVersion.versionLabel || 'this version'
    const ok =
      typeof window !== 'undefined'
        ? window.confirm(
            `Restore identity to ${label}? Current mark, words, colour and type will be replaced. Use Bump first if you want a save point.`
          )
        : true
    if (!ok) return
    setRestoringVersion(true)
    try {
      const restored = await versionService.restoreVersion(selectedVersion.id)
      if (!restored) {
        flashToast?.('Could not restore that version')
        return
      }
      await loadVersionHistory()
      setDiffResult(null)
      setSelectedVersion(null)
      setShowVersionHistory(false)
      flashToast?.(`Restored ${label}`)
    } catch (e) {
      console.error('Failed to restore version:', e)
      flashToast?.('Could not restore that version')
    } finally {
      setRestoringVersion(false)
    }
  }

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
      flashToast?.('Templates didn’t load. Try again')
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Save current project as template
  const saveAsTemplate = async (name, description) => {
    if (!name.trim()) {
      flashToast?.('Name the template first')
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
        flashToast?.('Template saved')
        // Track template save action - we need to get the newly created template
        // Since the store.saveAsTemplate returns the templateId, we can use that
        // or get the updated templates list
        const updatedTemplates = [...(useAppStore.getState().templates || [])].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        const newTemplate = updatedTemplates.find(t =>
          t.name === name.trim() &&
          t.description === description.trim()
        ) || updatedTemplates[updatedTemplates.length - 1]; // fallback to last one
        return true
      } else {
        flashToast?.(result.error || 'Didn’t save. Try again')
        return false
      }
    } catch (error) {
      console.error('Failed to save template:', error)
      flashToast?.('Didn’t save. Try again')
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
        flashMicro?.('Template applied')
        // Track template apply action
        const appliedTemplate = store.getTemplateById(templateId)
        return true
      } else {
        flashToast?.(result.error || 'Didn’t apply. Try again')
        return false
      }
    } catch (error) {
      console.error('Failed to apply template:', error)
      flashToast?.('Didn’t apply. Try again')
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
        return true
      } else {
        flashToast?.(result.error || 'Didn’t delete. Try again')
        return false
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
      flashToast?.('Didn’t delete. Try again')
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
        return true
      } else {
        flashToast?.(result.error || 'Didn’t update. Try again')
        return false
      }
    } catch (error) {
      console.error('Failed to update template:', error)
      flashToast?.('Didn’t update. Try again')
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
      flashToast?.('Version history didn’t load. Try again')
    } finally {
      setLoadingVersions(false)
    }
  }

  // One-shot deep link (e.g. readiness “fix palette roles”) — apply then clear
  // so the next visit resumes from identitySubstep, not a sticky gap target.
  useEffect(() => {
    if (!brandEditSectionProp) return
    const target = resolveIdentitySubstep(brandEditSectionProp)
    updateBrandField('identitySubstep', target)
    setBrandEditSectionProp?.(null)
    setDeepLinkFocus(target)
    const t = setTimeout(() => setDeepLinkFocus(null), 2200)
    return () => clearTimeout(t)
  }, [brandEditSectionProp, setBrandEditSectionProp, updateBrandField])

  const substepIndex = Math.max(
    0,
    IDENTITY_SUBSTEPS.findIndex((s) => s.id === identitySubstep)
  )
  const nextSubstep = nextIdentitySubstep(identitySubstep)
  const prevSubstep = prevIdentitySubstep(identitySubstep)

  // New sub-screen → top of page (avoid landing mid-form from a previous step)
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [identitySubstep])

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
    /* The project these pins belong to, captured before the await.
       Extraction decodes every pinned image, and without this the colours
       landed on whichever project was open when it finished. */
    const ownerProjectId = activeProject?.id
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
      setProjectPalette(result.colors, ownerProjectId)
      setHexDrafts({})
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
      `Fixed contrast on ${changes.map((c) => c.role).join(', ')}`
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

  const fmtDiffVal = (v) => {
    if (v === null || v === undefined) return '—'
    if (Array.isArray(v)) return v.join(', ')
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  // The one field the brand book's "Direction Decision" page depends on
  // (directions + decisionLog) used to be writable only in off-path Ideate.
  // Two plain fields here — never a picker, never blocking anything below —
  // write through the same updateDirection() Ideate uses, so choosing or
  // refining a direction from Identity logs a real decision instead of
  // leaving the book's Proof panel blank.
  const identityDirections = Array.isArray(activeProject?.directions)
    ? activeProject.directions
    : []
  const identityChosen = chosenDirection(activeProject)
  const identityTargetId = identityChosen?.id || identityDirections[0]?.id || 'a'
  const identityTarget =
    identityDirections.find((d) => d.id === identityTargetId) || {}

  return (
    <>
          <div className="brand-layout surface-document system-view design-studio view-enter" data-nav-dir={navDir}>
            <div className="brand-template-top design-identity-head">
              <div className="design-identity-head-text">
                <h1 className="page-title">
                  {labelForStepId('design')}
                </h1>
                {/* Quiet status only — pack floor, not goal/words scoreboard. */}
                <p className="design-identity-status" role="status">
                  {IDENTITY_SUBSTEPS[substepIndex]?.label || 'Mark'}
                </p>
              </div>
              {/* Meta chrome only on Preview — craft screens open on the field,
                  not version/template decisions (ADHD: decision fatigue). */}
              {identitySubstep === 'preview' && (
                <div className="brand-template-actions">
                  <div className="version-controls">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      title="Bump the design version"
                      onClick={async () => {
                        const r = bumpDesignVersion()
                        if (r?.ok)
                          flashMicro(`Version ${r.version}`)
                        await loadVersionHistory()
                      }}
                    >
                      Bump · {activeProject?.designVersion || 'v1'}
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
              )}
            </div>

            <nav className="identity-subnav" aria-label="Identity screens">
              {IDENTITY_SUBSTEPS.map((step, i) => {
                const active = identitySubstep === step.id
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`identity-subnav-btn${active ? ' is-active' : ''}`}
                    aria-current={active ? 'step' : undefined}
                    onClick={() => setIdentitySubstep(step.id)}
                  >
                    <span className="identity-subnav-num" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {step.label}
                  </button>
                )
              })}
            </nav>

            <div className="design-edit-column">
            {identitySubstep === 'logo' && (
            <section
              id="design-section-content-logo"
              data-section="logo"
              className={`panel brand-section${
                deepLinkFocus === 'logo' ? ' is-deep-link-focus' : ''
              }`}
            >
              <header className="design-section-head">
                <h2 className="design-section-title">Mark</h2>
                <span className="design-section-rule" aria-hidden="true" />
              </header>
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
                  How the mark behaves
                </label>
                <input
                  id="logo-custom"
                  className="field-input"
                  value={activeProject?.logoDirection || ''}
                  onChange={(e) => setLogoDirection(e.target.value)}
                  placeholder="e.g. always with wordmark"
                />
              </div>
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-client-chose">
                  Client chose
                </label>
                <input
                  id="logo-client-chose"
                  className="field-input"
                  value={activeProject?.logoClientChose || ''}
                  onChange={(e) =>
                    updateBrandField('logoClientChose', e.target.value)
                  }
                  placeholder="e.g. Option B · monogram, 3 Aug phone call"
                />
              </div>
              <div className="brand-two-up">
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
                    placeholder={'e.g. height of the “x” all around'}
                  />
                </div>
                <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                  <label className="field-label" htmlFor="logo-min-size">
                    Smallest mark size
                  </label>
                  <input
                    id="logo-min-size"
                    className="field-input"
                    value={activeProject?.logoMinSize || ''}
                    onChange={(e) =>
                      updateBrandField('logoMinSize', e.target.value)
                    }
                    placeholder="e.g. 24px digital · 12mm print"
                  />
                </div>
              </div>

              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-donts">
                  Mark mistakes to avoid
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
                  aria-label="Mark versions"
                >
                  <p className="field-label" style={{ marginBottom: '0.4rem' }}>
                    Mark versions
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
                        flashToast('Image must be under 2.5MB')
                        return
                      }

                      /* Capture the project NOW, not when the read finishes.
                         The downscale below is async and on a large image the
                         gap is long enough to switch projects in — the same
                         capture-before-await rule setProjectPalette follows a
                         few hundred lines up. */
                      const ownerProjectId = activeProject?.id
                      // Local data URL + downscale (same pipeline as mood pins)
                      const reader = new FileReader()
                      reader.onerror = () =>
                        flashToast('Could not read that image. Try another file.')
                      reader.onload = async () => {
                        try {
                          const { downscaleDataUrl } = await import(
                            '../lib/moodPins'
                          )
                          const scaled = await downscaleDataUrl(
                            reader.result,
                            file.type
                          )
                          setLogoImage(scaled, ownerProjectId)
                        } catch {
                          setLogoImage(reader.result, ownerProjectId)
                        }
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
                      flashMicro('Mark image removed')
                    }}
                  >
                    Remove mark
                  </button>
                ) : null}
              </div>
            </section>
            )}

            {identitySubstep === 'essentials' && (
            <section
              id="design-section-content-essentials"
              data-section="essentials"
              className={`panel brand-section${
                deepLinkFocus === 'essentials' ? ' is-deep-link-focus' : ''
              }`}
            >
              <header className="design-section-head">
                <h2 className="design-section-title">Words</h2>
                <span className="design-section-rule" aria-hidden="true" />
              </header>
              <div className="field-block brand-direction-block">
                <label className="field-label" htmlFor="brand-direction-title">
                  Direction you're building
                  {/* If Ideate later switches which direction is chosen,
                      this box silently starts showing a different (often
                      blank) one — nothing else here would say so. Naming
                      which slot it is makes a switch visible instead of
                      reading as the text having vanished. */}
                  {identityTarget.label && (
                    <span className="brand-direction-slot"> — {identityTarget.label}</span>
                  )}
                </label>
                <input
                  id="brand-direction-title"
                  className="field-input"
                  value={identityTarget.title || ''}
                  placeholder="e.g. Harbor quiet"
                  onChange={(e) =>
                    updateDirection(identityTargetId, {
                      title: e.target.value,
                      chosen: true,
                    })
                  }
                />
                <label
                  className="field-label brand-direction-why-label"
                  htmlFor="brand-direction-why"
                >
                  Why
                </label>
                <input
                  id="brand-direction-why"
                  className="field-input"
                  value={identityTarget.note || ''}
                  placeholder="Optional — one line"
                  onChange={(e) =>
                    updateDirection(identityTargetId, {
                      note: e.target.value,
                      chosen: true,
                    })
                  }
                />
              </div>
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
                  placeholder="e.g. Quiet confidence, made local"
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
                  placeholder="Who it’s for · how it should feel"
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
                  placeholder="Warm, plain, a bit wry"
                  rows={2}
                />
              </div>
              {/* Always visible — collapsed details read as "not there" */}
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
                    placeholder="Short sentences · real photos"
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
                    placeholder="Jargon · stock grins"
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
                  placeholder="e.g. We ship on the date we said"
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
                  placeholder="e.g. 40 homes built · zero missed opens"
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
                  placeholder="Steady · clear · a little dry humor"
                />
              </div>
            </section>
            )}

            {identitySubstep === 'colors' && (
            <section
              id="design-section-content-colors"
              data-section="colors"
              className={`panel brand-section${
                deepLinkFocus === 'colors' ? ' is-deep-link-focus' : ''
              }`}
            >
              <header className="design-section-head">
                <h2 className="design-section-title">Colour</h2>
                <span className="design-section-rule" aria-hidden="true" />
              </header>
              {(() => {
                const health = paletteHealthScore({
                  palette: projectPalette,
                  colorRoles: activeProject?.colorRoles || {},
                  colorRoleWhy: activeProject?.colorRoleWhy || {},
                })
                /* Nothing picked yet is not a failing grade. The score used
                   to open at 20% in red on an untouched project — a mark
                   against you for not having started, which is the exact
                   shape of feedback this app exists to remove. Until there
                   is something to measure it reads as a dash. */
                if (health.score === null) {
                  return (
                    <div className="palette-health">
                      <div className="palette-health-head">
                        <span className="field-label" style={{ margin: 0 }}>
                          Palette health
                        </span>
                        <span className="palette-health-score is-idle">—</span>
                      </div>
                    </div>
                  )
                }
                const healthWord =
                  health.score >= 80
                    ? 'Solid'
                    : health.score >= 50
                      ? 'Getting there'
                      : 'Tighten roles'
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
                        title={`${health.score}%`}
                      >
                        {healthWord}
                      </span>
                    </div>
                    <div className="palette-health-bar" aria-hidden="true">
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
                    return (
                      <li key={index} className="palette-row-block">
                        <div className="palette-row">
                          <label
                            className="palette-swatch-wrap"
                            title="Pick colour"
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
                              aria-label={`Colour ${index + 1} picker`}
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
                            aria-label={`Colour ${index + 1} hex`}
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
                            className="btn btn-ghost palette-remove"
                            disabled={projectPalette.length <= 2}
                            onClick={() => removePaletteColor(index)}
                            aria-label={`Remove color ${index + 1}`}
                          >
                            Remove
                          </button>
                        </div>
                        {tints.length > 0 && (
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
                    Add colour
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!pinCount || extractingPins}
                    title={
                      starredPinCount
                        ? `Sample ★ shortlist (${starredPinCount})`
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
                    }}
                  >
                    Reset to default
                  </button>
                </div>

              </div>

              <div className="palette-roles-editor" style={{ marginTop: '1rem' }}>
                <div className="palette-section-head">
                  <p className="field-label" style={{ margin: 0 }}>
                    Colour jobs
                  </p>
                </div>
                <div className="system-role-assign" style={{ marginTop: '0.45rem' }}>
                  {['cover', 'accent', 'text', 'quiet'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`role-pick-chip${brandRoleAssign === role ? ' is-active' : ''}`}
                      onClick={() => setBrandRoleAssign(role)}
                      title={`${ROLE_LABELS[role]} · ${effectiveRoles[role]}`}
                    >
                      {ROLE_LABELS[role]}
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
                      aria-label={`Set ${c} as ${brandRoleAssign}`}
                      onClick={() => {
                        const n = normalizeHex(c) || c
                        setColorRole(brandRoleAssign, n)
                        flashMicro(`${brandRoleAssign} → ${n}`)
                      }}
                    ></button>
                  ))}
                </div>
              </div>

              <div className="design-contrast-block">
                <p className="field-label" style={{ margin: '1rem 0 0.45rem' }}>
                  Contrast and why
                </p>
                <div className="finish-secondary-row" style={{ marginTop: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    title="Nudge text / accent / quiet / cover until AA targets pass"
                    onClick={() => applyAaRoleFix()}
                  >
                    Fix contrast
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
                  return (
                    <div className="field-block" style={{ marginTop: '0.65rem' }}>
                      <label className="field-label" htmlFor="color-role-why">
                        Why {brandRoleAssign}
                        {brandWords.trim()
                          ? ` · ${brandWords.trim().slice(0, 24)}`
                          : ''}
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
                        placeholder="Why this job fits"
                      />
                    </div>
                  )
                })()}

                <div className="palette-checker" style={{ marginTop: '0.85rem' }}>
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
                      <li className="panel-hint">Need two colours to check</li>
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
                              Fix
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
              </div>
            </section>
            )}

            {identitySubstep === 'type' && (
            <section
              id="design-section-content-type"
              data-section="type"
              className={`panel brand-section${
                deepLinkFocus === 'type' ? ' is-deep-link-focus' : ''
              }`}
            >
              <header className="design-section-head">
                <h2 className="design-section-title">Type</h2>
                <span className="design-section-rule" aria-hidden="true" />
              </header>
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
              {/* Optional, but visible — not tucked in a collapsible. This
                  reaches the brand book's type page, and a field worth
                  printing is not a field worth hiding at capture (the
                  "collapsed content is invisible" rule). Blank prints nothing
                  in the book; there is no toggle and no "include?" step. */}
              <div className="field-block" style={{ marginTop: '0.9rem' }}>
                <label className="field-label" htmlFor="type-why">
                  Why these faces
                  {activeProject?.detective?.brandWords?.trim()
                    ? ` · ${activeProject.detective.brandWords.trim().slice(0, 32)}`
                    : ''}
                </label>
                <input
                  id="type-why"
                  className="field-input"
                  value={activeProject?.typeWhy || ''}
                  onChange={(e) => updateBrandField('typeWhy', e.target.value)}
                  placeholder="Optional — the reason for this pairing (prints in the brand book)"
                />
              </div>
            </section>
            )}


            {identitySubstep === 'preview' && (
            <>
            <div
              className="design-preview-rail design-artboard-bottom"
              tabIndex={0}
              role="region"
              aria-label="Live brand preview"
            >
              <div className="design-rail-label">Artboard</div>
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
            <div className="design-preview-notes is-secondary">
              <h3 className="design-preview-notes-title">Imagery</h3>
              <div className="field-block">
                <label className="field-label" htmlFor="img-style">
                  Look of photos / drawings
                </label>
                <textarea
                  id="img-style"
                  className="field-input"
                  rows={2}
                  value={activeProject?.imageryStyle || ''}
                  onChange={(e) =>
                    updateBrandField('imageryStyle', e.target.value)
                  }
                  placeholder="Warm light · less stock"
                />
              </div>
              <div className="field-block">
                <label className="field-label" htmlFor="img-do">
                  Pictures we want
                </label>
                <textarea
                  id="img-do"
                  className="field-input"
                  rows={2}
                  value={activeProject?.imageryDo || ''}
                  onChange={(e) =>
                    updateBrandField('imageryDo', e.target.value)
                  }
                  placeholder="Hands, real spaces"
                />
              </div>
              <div className="field-block">
                <label className="field-label" htmlFor="img-dont">
                  Pictures to avoid
                </label>
                <textarea
                  id="img-dont"
                  className="field-input"
                  rows={2}
                  value={activeProject?.imageryDont || ''}
                  onChange={(e) =>
                    updateBrandField('imageryDont', e.target.value)
                  }
                  placeholder="Clip art · harsh flash"
                />
              </div>
              <h3 className="design-preview-notes-title">Writing and print</h3>
              <div className="field-block">
                <label className="field-label" htmlFor="wr-case">
                  Headings
                </label>
                <select
                  id="wr-case"
                  className="field-input"
                  value={activeProject?.writingCase || 'sentence'}
                  onChange={(e) =>
                    updateBrandField('writingCase', e.target.value)
                  }
                >
                  <option value="sentence">
                    Sentence case — Like this one
                  </option>
                  <option value="title">Title case — Like This One</option>
                </select>
              </div>
              <div className="field-block">
                <label className="field-label" htmlFor="wr-caps">
                  ALL CAPS
                </label>
                <select
                  id="wr-caps"
                  className="field-input"
                  value={activeProject?.writingCaps || 'sparing'}
                  onChange={(e) =>
                    updateBrandField('writingCaps', e.target.value)
                  }
                >
                  <option value="sparing">Short labels only</option>
                  <option value="labels">UI labels and navigation only</option>
                  <option value="never">Never</option>
                </select>
              </div>
              <div className="field-block">
                <label className="field-label" htmlFor="wr-notes">
                  Anything else about the words
                </label>
                <textarea
                  id="wr-notes"
                  className="field-input"
                  rows={2}
                  value={activeProject?.writingNotes || ''}
                  onChange={(e) =>
                    updateBrandField('writingNotes', e.target.value)
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="field-block">
                <label className="field-label" htmlFor="pr-pantone">
                  Pantone match
                </label>
                <input
                  id="pr-pantone"
                  className="field-input"
                  value={activeProject?.printPantone || ''}
                  onChange={(e) =>
                    updateBrandField('printPantone', e.target.value)
                  }
                  placeholder="e.g. 871C for the gold"
                />
              </div>
              <div className="field-block">
                <label className="field-label" htmlFor="pr-stock">
                  Paper stock
                </label>
                <input
                  id="pr-stock"
                  className="field-input"
                  value={activeProject?.printStock || ''}
                  onChange={(e) =>
                    updateBrandField('printStock', e.target.value)
                  }
                  placeholder="e.g. 350gsm uncoated"
                />
              </div>
              <div className="field-block">
                <label className="field-label" htmlFor="pr-finish">
                  Finish
                </label>
                <input
                  id="pr-finish"
                  className="field-input"
                  value={activeProject?.printFinish || ''}
                  onChange={(e) =>
                    updateBrandField('printFinish', e.target.value)
                  }
                  placeholder="e.g. matt lamination, spot UV"
                />
              </div>
            </div>
            </>
            )}
            </div>

            <div className="path-continue-row design-path-footer">
              <button
                type="button"
                className="btn btn-primary work-path-next"
                onClick={() => {
                  if (nextSubstep) {
                    setIdentitySubstep(nextSubstep.id)
                    return
                  }
                  setActiveView?.(journeyNext?.view || 'flow')
                }}
              >
                {nextSubstep
                  ? `Next · ${nextSubstep.label}`
                  : `Next · ${journeyNext?.label || labelForStepId('sketch')}`}
              </button>
              {prevSubstep ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIdentitySubstep(prevSubstep.id)}
                >
                  Back · {prevSubstep.label}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const hub = 'desk'
                    setActiveView?.(hub)
                  }}
                >
                  Back to the desk
                </button>
              )}
            </div>

          </div>

          {/* Version History Modal */}
          {showVersionHistory && (
            <div className="dv-modal-overlay">
              <div className="dv-modal-panel">
                <div className="dv-modal-head">
                  <h2>Version history</h2>
                  <button
                    onClick={() => setShowVersionHistory(false)}
                    className="btn btn-sm btn-ghost"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="dv-modal-scroll">
                  {loadingVersions ? (
                    <div className="dv-tpl-empty">
                      <p>Loading…</p>
                    </div>
                  ) : versionHistory.length === 0 ? (
                    <div className="dv-tpl-empty">
                      <p>
                        No saves yet. Work on Identity and the app keeps an
                        hourly save while the studio is open — or use Bump on
                        Preview when you want a named point.
                      </p>
                    </div>
                  ) : (
                    <div className="dv-tpl-list">
                      {versionHistory.map((version) => {
                        const preview = versionIdentityPreview(version.data)
                        const kind =
                          version.kind ||
                          version.changeSummary?.kind ||
                          'save'
                        const day =
                          messageDayLabel(version.timestamp) || 'Earlier'
                        const selected = selectedVersion?.id === version.id
                        return (
                          <div
                            key={version.id}
                            className={`dv-tpl-card dv-ver-card${
                              selected ? ' is-selected' : ''
                            }`}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedVersion(version)
                              setDiffResult(null)
                              loadVersionDiff(version.id)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setSelectedVersion(version)
                                setDiffResult(null)
                                loadVersionDiff(version.id)
                              }
                            }}
                          >
                            <div className="dv-tpl-row">
                              <div>
                                <h3 className="dv-tpl-name">{preview.title}</h3>
                                <p className="dv-tpl-meta">
                                  {versionKindLabel(kind)} · {day}
                                </p>
                              </div>
                              <div className="dv-tpl-actions">
                                <span className="dv-ver-badge is-patch">
                                  {versionKindLabel(kind)}
                                </span>
                              </div>
                            </div>
                            {preview.lines.map((line) => (
                              <p key={line} className="dv-tpl-desc">
                                {line}
                              </p>
                            ))}
                            {preview.palette.length > 0 && (
                              <div
                                className="dv-ver-swatches"
                                aria-label="Palette in this save"
                              >
                                {preview.palette.map((hex) => (
                                  <span
                                    key={hex}
                                    className="dv-ver-swatch"
                                    style={{ background: hex }}
                                    title={hex}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                {selectedVersion && (
                  <div className="dv-diff-panel">
                    <div className="dv-diff-head">
                      <h3>This save</h3>
                      <div className="dv-diff-head-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={restoringVersion}
                          onClick={() => restoreSelectedVersion()}
                        >
                          {restoringVersion ? 'Restoring…' : 'Restore this'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVersion(null)
                            setDiffResult(null)
                          }}
                          className="btn btn-sm btn-ghost"
                          aria-label="Close"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {(() => {
                      const preview = versionIdentityPreview(
                        selectedVersion.data
                      )
                      const kind =
                        selectedVersion.kind ||
                        selectedVersion.changeSummary?.kind ||
                        'save'
                      const day =
                        messageDayLabel(selectedVersion.timestamp) ||
                        'Earlier'
                      return (
                        <div className="dv-ver-detail">
                          <p className="dv-tpl-meta">
                            {versionKindLabel(kind)} · {day}
                          </p>
                          <p className="dv-ver-detail-title">{preview.title}</p>
                          {preview.lines.map((line) => (
                            <p key={line} className="dv-tpl-desc">
                              {line}
                            </p>
                          ))}
                          {preview.palette.length > 0 && (
                            <div className="dv-ver-swatches">
                              {preview.palette.map((hex) => (
                                <span
                                  key={hex}
                                  className="dv-ver-swatch"
                                  style={{ background: hex }}
                                  title={hex}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    {loadingDiff ? (
                      <div className="dv-tpl-empty">
                        <p>Comparing to now…</p>
                      </div>
                    ) : diffResult && !diffResult.error ? (
                      <div className="dv-diff-section">
                        <h4>
                          Vs now
                          {diffResult.changeCount
                            ? ` · ${diffResult.changeCount} different`
                            : ' · same as now'}
                        </h4>
                        {diffResult.summary && diffResult.changeCount > 0 && (
                          <p className="dv-diff-summary">{diffResult.summary}</p>
                        )}
                        {diffResult.modified.slice(0, 8).map((change) => (
                          <div key={change.field} className="dv-diff-row">
                            <span className="dv-diff-field">{change.field}:</span>{' '}
                            <span className="dv-diff-old">
                              {fmtDiffVal(change.oldValue)}
                            </span>
                            <span className="dv-diff-arrow">→</span>
                            <span className="dv-diff-added">
                              {fmtDiffVal(change.newValue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Template Library Modal */}
          {showTemplateModal && (
            <div className="dv-modal-overlay">
              <div className="dv-modal-panel is-narrow">
                <div className="dv-modal-head">
                  <h2>Templates</h2>
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="btn btn-sm btn-ghost"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="dv-modal-scroll">
                  {loadingTemplates ? (
                    <div className="dv-tpl-empty">
                      <p>Loading…</p>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="dv-tpl-empty">
                      <p>No templates yet.</p>
                    </div>
                  ) : (
                    <div className="dv-tpl-list">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="dv-tpl-card"
                          onClick={() => {
                            setSelectedTemplate(template)
                          }}
                        >
                          <div className="dv-tpl-row">
                            <div>
                              <h3 className="dv-tpl-name">{template.name}</h3>
                              {template.description && (
                                <p className="dv-tpl-desc">
                                  {template.description}
                                </p>
                              )}
                              <p className="dv-tpl-meta">
                                {new Date(template.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="dv-tpl-actions">
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
                                className="btn btn-sm btn-ghost"
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
          )}

          {/* Save as Template Modal */}
          {showSaveAsTemplateModal && (
            <div className="dv-modal-overlay">
              <div className="dv-modal-panel is-narrow">
                <div className="dv-modal-head">
                  <h2>
                    {selectedTemplate ? 'Update template' : 'Save as template'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSaveAsTemplateModal(false)
                      setTemplateName('')
                      setTemplateDescription('')
                      setSelectedTemplate(null)
                    }}
                    className="btn btn-sm btn-ghost"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <form
                  className="dv-form"
                  onSubmit={(e) => {
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
                  }}
                >
                  <div className="field-block">
                    <label className="field-label" htmlFor="dv-tpl-name">Template name</label>
                    <input
                      id="dv-tpl-name"
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Name"
                      className="field-input"
                    />
                  </div>
                  <div className="field-block">
                    <label className="field-label" htmlFor="dv-tpl-desc">Notes (optional)</label>
                    <textarea
                      id="dv-tpl-desc"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="When you’d use this"
                      rows={3}
                      className="field-textarea"
                    />
                  </div>
                  <div className="dv-form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSaveAsTemplateModal(false)
                        setTemplateName('')
                        setTemplateDescription('')
                        setSelectedTemplate(null)
                      }}
                      className="btn btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!templateName.trim()}
                      className="btn btn-primary"
                    >
                      {selectedTemplate ? 'Update Template' : 'Save Template'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

    </>
  )
}