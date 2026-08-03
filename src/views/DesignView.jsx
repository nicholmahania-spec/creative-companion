/**
 * Identity (Design) — live artboard + flat editors (mark, words, colour, type, pack, stationery).
 * Path rebuild (2026-08-03): full main width, mark-done off, Next leads footer.
 * Artboard readable first (left wide / first mobile); one wall pack, no dual homes.
 */
import { useState, useEffect, useMemo, Suspense, lazy } from 'react'
import { labelForStepId } from '../lib/journey'
import useAppStore from '../store/useAppStore'
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
import { loadTypePairFont, loadBrandFamilies } from '../lib/fontLoader'
import { chosenDirection } from '../lib/decisionLog'
import InfoReveal from '../components/InfoReveal'
import '../styles/lazy-design.css'

const BrandArtboard = lazy(() => import('../components/BrandArtboard'))
const StationeryKit = lazy(() => import('../components/StationeryKit'))

/** Smooth scrolling is a vestibular trigger for some users; honor the OS pref. */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* The flat column's order, numbered 01-06. One source read by both the
   rail and the section heads — never restate this list. */
const DESIGN_SECTIONS = [
  { id: 'logo', num: '01', title: 'The mark' },
  { id: 'essentials', num: '02', title: 'What it says' },
  { id: 'colors', num: '03', title: 'Colour' },
  { id: 'type', num: '04', title: 'Type' },
  { id: 'pins', num: '05', title: 'Pack' },
  { id: 'stationery', num: '06', title: 'Stationery' },
]

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
  /** Controlled accordion tab when jumping from Review/Deliver readiness */
  brandEditSectionProp,
  setBrandEditSectionProp,
}) {
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const updateDirection = useAppStore((s) => s.updateDirection)
  const addContact = useAppStore((s) => s.addContact)
  const updateContact = useAppStore((s) => s.updateContact)
  const removeContact = useAppStore((s) => s.removeContact)
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

  /* FLAT column, not tabs (adhd-executive-function-advisor ruling, 2026
     design handoff). All six sections are always mounted; the rail below is
     a scroll INDEX whose highlight follows scroll position
     (IntersectionObserver — same pattern as DetectiveSheet's chapter rail),
     never a switcher that hides siblings. brandEditSectionLocal is that
     highlight, not a visibility gate. */
  const [brandEditSectionLocal, setBrandEditSectionLocal] = useState('logo')
  const brandEditSection = brandEditSectionLocal
  const setBrandEditSection = setBrandEditSectionLocal
  /* A deep link (e.g. Review/Deliver readiness "fix palette roles") scrolls
     to the section and puts a brief focus ring on its head — it no longer
     hides the other five. */
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

  // Honor parent jump (e.g. readiness “fix palette roles”): scroll to the
  // section and ring its head briefly. Everything stays mounted and visible
  // — this never hides the other five sections.
  useEffect(() => {
    if (!brandEditSectionProp) return
    const map = {
      messaging: 'essentials',
      voice: 'essentials',
      imagery: 'pins',
    }
    const target = map[brandEditSectionProp] || brandEditSectionProp
    requestAnimationFrame(() => {
      document
        .getElementById(`design-section-content-${target}`)
        ?.scrollIntoView({
          block: 'start',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
    })
    setDeepLinkFocus(target)
    const t = setTimeout(() => setDeepLinkFocus(null), 2200)
    return () => clearTimeout(t)
  }, [brandEditSectionProp])

  // Rail highlight follows scroll position, same pattern as DetectiveSheet's
  // chapter rail — a scroll index is only honest if it's always current.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = e.target.dataset.section
            if (id) setBrandEditSectionLocal(id)
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    for (const s of DESIGN_SECTIONS) {
      const el = document.getElementById(`design-section-content-${s.id}`)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [])

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
                  {(() => {
                    const inPack = deskMood.filter((m) => m.inPack).length
                    if (!inPack) return 'Artboard · no pack pins yet'
                    return inPack >= 6
                      ? 'Artboard · ★ pack full'
                      : `Artboard · ★ ${inPack} in pack · room for ${6 - inPack}`
                  })()}
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
            </div>

            <div className="design-edit-column">
            {/* Scroll INDEX, not a switcher — every section below is always
                mounted. Clicking moves the page; the highlight follows scroll
                (IntersectionObserver), so it never goes stale. Six rows,
                never five plus an "Advanced" fork — Stationery is an
                ordinary stop, not a hidden extra. */}
            <nav className="design-section-rail" aria-label="Identity sections">
              {DESIGN_SECTIONS.map((s) => {
                const active = brandEditSection === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`design-section-tab${active ? ' is-active' : ''}`}
                    aria-current={active ? 'step' : undefined}
                    aria-controls={`design-section-content-${s.id}`}
                    onClick={() => {
                      setBrandEditSection(s.id)
                      requestAnimationFrame(() => {
                        document
                          .getElementById(`design-section-content-${s.id}`)
                          ?.scrollIntoView({
                            block: 'start',
                            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                          })
                      })
                    }}
                  >
                    <span className="design-section-tab-num" aria-hidden="true">
                      {s.num}
                    </span>
                    <span className="design-section-tab-label">{s.title}</span>
                  </button>
                )
              })}
            </nav>
            <p className="panel-hint design-min-hint" style={{ margin: '0 0 0.75rem' }}>
              Tagline, colors, or logo is enough for the path.
            </p>

            {/* Logo section — physically first in the column (01 The mark),
                moved here from its old spot after Type so DOM order matches
                the ruling's numbering. */}
            <section
              id="design-section-content-logo"
              data-section="logo"
              className={`panel brand-section${
                deepLinkFocus === 'logo' ? ' is-deep-link-focus' : ''
              }`}
            >
              <header className="design-section-head">
                <span className="design-section-badge">01</span>
                <h2 className="design-section-title">The mark</h2>
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
                    placeholder="Clearspace"
                  />
                </div>
                <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                  <label className="field-label" htmlFor="logo-min-size">
                    Smallest logo size
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
              </div>

              {activeProject?.logoImage ? (
                <div
                  className="logo-variant-row"
                  role="group"
                  aria-label="Logo versions"
                >
                  <p className="field-label" style={{ marginBottom: '0.4rem' }}>
                    Logo versions
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
              <div className="field-block" style={{ marginBottom: '0.85rem' }}>
                <label className="field-label" htmlFor="logo-donts">
                  Logo mistakes to avoid
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
                  aria-label="Logo versions"
                >
                  <p className="field-label" style={{ marginBottom: '0.4rem' }}>
                    Logo versions
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
                        flashToast('Logo image must be under 2.5MB')
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
                      flashMicro('Logo image removed')
                    }}
                  >
                    Remove mark
                  </button>
                ) : null}
              </div>
            </section>

            {/* 02 What it says */}
            <section
              id="design-section-content-essentials"
              data-section="essentials"
              className={`panel brand-section${
                deepLinkFocus === 'essentials' ? ' is-deep-link-focus' : ''
              }`}
            >
              <header className="design-section-head">
                <span className="design-section-badge">02</span>
                <h2 className="design-section-title">What it says</h2>
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

            {/* 03 Colour */}
            <section
              id="design-section-content-colors"
              data-section="colors"
              className={`panel brand-section${
                deepLinkFocus === 'colors' ? ' is-deep-link-focus' : ''
              }`}
            >
              <header className="design-section-head">
                <span className="design-section-badge">03</span>
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
                      <p className="panel-hint" style={{ margin: 0 }}>
                        Add a color to see this.
                      </p>
                    </div>
                  )
                }
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
                    Add color
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!pinCount || extractingPins}
                    title={
                      starredPinCount
                        ? `Sample ★ pack pins (${starredPinCount})`
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

            {/* 04 Type */}
            <section
              id="design-section-content-type"
              data-section="type"
              className={`panel brand-section${
                deepLinkFocus === 'type' ? ' is-deep-link-focus' : ''
              }`}
            >
              <header className="design-section-head">
                <span className="design-section-badge">04</span>
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
                <p className="panel-hint">
                  Shows here and on the artboard preview. The PDF and exported
                  files still use the app's default typeface — this picker
                  doesn't change those yet.
                </p>
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

            {/* 05 Pack — starred pins + imagery advanced */}
            <section
              id="design-section-content-pins"
              data-section="pins"
              className={`panel brand-section${
                deepLinkFocus === 'pins' ? ' is-deep-link-focus' : ''
              }`}
            >
              <header className="design-section-head">
                <span className="design-section-badge">05</span>
                <h2 className="design-section-title">Pack</h2>
                <span className="design-section-rule" aria-hidden="true" />
              </header>
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
                    placeholder="Look"
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
                    placeholder="Do"
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
                    placeholder="Don't"
                  />
                </div>
              </details>
              {/* Writing and print rules. Two selects rather than a blank box:
                  the answer is a choice from a short list, and asking for
                  prose here would get the same skip every open-ended field
                  gets. Both already carry a defensible default, so the book
                  prints a rule whether or not this is ever opened. */}
              <details className="design-advanced">
                <summary>Writing and print rules</summary>
                <div className="field-block" style={{ marginTop: '0.65rem' }}>
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
              </details>
            </section>

            {/* 06 Stationery — an ordinary section now, not an "Advanced"
                fork; letterhead, business card, envelope, email signature */}
            <section
              id="design-section-content-stationery"
              data-section="stationery"
              className={`panel brand-section${
                deepLinkFocus === 'stationery' ? ' is-deep-link-focus' : ''
              }`}
            >
              <header className="design-section-head">
                <span className="design-section-badge">06</span>
                <h2 className="design-section-title">Stationery</h2>
                <span className="design-section-rule" aria-hidden="true" />
              </header>
              <Suspense fallback={<div className="panel-hint">Loading…</div>}>
                <StationeryKit
                  activeProject={activeProject}
                  projectPalette={projectPalette}
                  updateBrandField={updateBrandField}
                  addContact={addContact}
                  updateContact={updateContact}
                  removeContact={removeContact}
                  flashToast={flashToast}
                />
              </Suspense>
            </section>
            </div>

            {/* Preview — sticky 45% right on wide */}
            <div
              className="system-artboard-sticky design-preview-rail"
              tabIndex={0}
              role="region"
              aria-label="Live leave-behind preview"
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

            <div className="path-continue-row design-path-footer">
              <button
                type="button"
                className="btn btn-primary work-path-next"
                onClick={() => setActiveView?.(journeyNext?.view || 'flow')}
              >
                {`Next · ${journeyNext?.label || labelForStepId('sketch')}`}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveView?.('desk')}
              >
                Back to the desk
              </button>
            </div>
          </div>

          {/* Version History Modal */}
          {showVersionHistory && (
            <div className="dv-modal-overlay">
              <div className="dv-modal-panel">
                <div className="dv-modal-head">
                  <h2>Version History</h2>
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
                      <p>Loading version history…</p>
                    </div>
                  ) : versionHistory.length === 0 ? (
                    <div className="dv-tpl-empty">
                      <p>No versions found for this project.</p>
                      <p>Create a version by making changes and bumping the design version.</p>
                    </div>
                  ) : (
                    <div className="dv-tpl-list">
                      {versionHistory.map((version) => (
                        <div
                          key={version.id}
                          className="dv-tpl-card"
                          onClick={() => {
                            setSelectedVersion(version)
                            setDiffResult(null)
                            // Load diff between selected version and current state
                            loadVersionDiff(version.id)
                          }}
                        >
                          <div className="dv-tpl-row">
                            <div>
                              <h3 className="dv-tpl-name">{version.versionLabel || 'Unnamed'}</h3>
                              <p className="dv-tpl-meta">
                                {new Date(version.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <div className="dv-tpl-actions">
                              {version.changeSummary?.severity && (
                                <span
                                  className={`dv-ver-badge ${
                                    version.changeSummary.severity === 'major'
                                      ? 'is-major'
                                      : version.changeSummary.severity === 'minor'
                                        ? 'is-minor'
                                        : 'is-patch'
                                  }`}
                                >
                                  {version.changeSummary.severity}
                                </span>
                              )}
                              {version.changeSummary?.changeCount && (
                                <span className="dv-ver-count">
                                  {version.changeSummary.changeCount} changes
                                </span>
                              )}
                            </div>
                          </div>
                          {version.changeSummary?.summary && (
                            <p className="dv-tpl-desc">
                              {version.changeSummary.summary}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {(selectedVersion || diffResult) && (
                  <div className="dv-diff-panel">
                    <div className="dv-diff-head">
                      <h3>
                        {selectedVersion ? 'Comparing Versions' : 'Diff Details'}
                      </h3>
                      <button
                        onClick={() => {
                          setSelectedVersion(null)
                          setDiffResult(null)
                        }}
                        className="btn btn-sm btn-ghost"
                        aria-label="Close diff"
                      >
                        ×
                      </button>
                    </div>
                    {/* Version info */}
                    <div className="dv-diff-grid">
                      <div>
                        <h4>Current Version</h4>
                        <p className="dv-diff-meta">
                          {activeProject?.designVersion || 'v1'} •{" "}
                          {new Date().toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <h4>Selected Version</h4>
                        <p className="dv-diff-meta">
                          {selectedVersion?.versionLabel || 'Unnamed'} •{" "}
                          {selectedVersion?.timestamp ? new Date(selectedVersion.timestamp).toLocaleString() : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Diff results or loading */}
                    {loadingDiff ? (
                      <div className="dv-tpl-empty">
                        <p>Generating diff…</p>
                      </div>
                    ) : diffResult ? (
                      <div>
                        {diffResult.error ? (
                          <div className="dv-diff-error">
                            <p>{diffResult.error}</p>
                          </div>
                        ) : (
                          <>
                            <div className="dv-diff-summaryrow">
                              <span className={`dv-ver-badge ${
                                diffResult.severity === 'major'
                                  ? 'is-major'
                                  : diffResult.severity === 'minor'
                                    ? 'is-minor'
                                    : diffResult.changeCount > 10
                                      ? 'is-major'
                                      : diffResult.changeCount > 5
                                        ? 'is-minor'
                                        : 'is-patch'
                              }`}
                              >
                                {diffResult.severity || 'patch'}
                              </span>
                              <span className="dv-diff-field">
                                {diffResult.changeCount} changes
                              </span>
                            </div>
                            <p className="dv-diff-summary">
                              {diffResult.summary}
                            </p>

                            {/* Changes breakdown */}
                            <div>
                              {diffResult.modified.length > 0 && (
                                <div className="dv-diff-section">
                                  <h4>Modified ({diffResult.modified.length})</h4>
                                  {diffResult.modified.map((change) => (
                                    <div key={change.field} className="dv-diff-row">
                                      <span className="dv-diff-field">{change.field}:</span>
                                      {" "}
                                      <span className="dv-diff-old">{fmtDiffVal(change.oldValue)}</span>
                                      <span className="dv-diff-arrow">→</span>
                                      <span className="dv-diff-added">{fmtDiffVal(change.newValue)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {diffResult.added.length > 0 && (
                                <div className="dv-diff-section">
                                  <h4>Added ({diffResult.added.length})</h4>
                                  {diffResult.added.map((change) => (
                                    <div key={change.field} className="dv-diff-row">
                                      <span className="dv-diff-field">{change.field}:</span>
                                      {" "}
                                      <span className="dv-diff-added">{fmtDiffVal(change.value)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {diffResult.removed.length > 0 && (
                                <div className="dv-diff-section">
                                  <h4>Removed ({diffResult.removed.length})</h4>
                                  {diffResult.removed.map((change) => (
                                    <div key={change.field} className="dv-diff-row">
                                      <span className="dv-diff-field">{change.field}:</span>
                                      {" "}
                                      <span className="dv-diff-removed">{fmtDiffVal(change.value)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="dv-tpl-empty">
                        <p>
                          Select a version from the history to see the diff
                        </p>
                      </div>
                    )}
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
                  <h2>Template Library</h2>
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
                      <p>Loading templates…</p>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="dv-tpl-empty">
                      <p>No templates saved yet.</p>
                      <p>Create templates from your designs to reuse them later.</p>
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
                                Created: {new Date(template.createdAt).toLocaleString()}
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
                    {selectedTemplate ? 'Update Template' : 'Save as Template'}
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
                    <label className="field-label" htmlFor="dv-tpl-name">Template Name</label>
                    <input
                      id="dv-tpl-name"
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Enter template name"
                      className="field-input"
                    />
                  </div>
                  <div className="field-block">
                    <label className="field-label" htmlFor="dv-tpl-desc">Description (optional)</label>
                    <textarea
                      id="dv-tpl-desc"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Describe when to use this template"
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