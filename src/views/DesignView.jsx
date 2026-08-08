/**
 * Identity — one job per screen under a single path stop:
 * Mark → Words → Colour → Type → Preview.
 * Stationery lives on Assets; ★ pack pins stay on Research.
 */
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  lazy,
} from 'react'
import { labelForStepId } from '../lib/journey/journey'
import {
  IDENTITY_SUBSTEPS,
  resolveIdentitySubstep,
  nextIdentitySubstep,
  prevIdentitySubstep,
  isArtboardDeepLink,
} from '../lib/journey/identitySubsteps'
import useAppStore from '../store/useAppStore'
import versionService, {
  versionIdentityPreview,
  versionKindLabel,
} from '../services/versionService'
import { messageDayLabel } from '../lib/client/messageDayLabel'
import { wordmarkName } from '../lib/client/clientRecord'
import { familyByName, parseLabel } from '../lib/book/fontCatalog'
import AlignmentBars from '../components/AlignmentBars'
import AxisTagger from '../components/AxisTagger'
import { strategyProfile } from '../lib/brand/alignment'
import { DEFAULT_LOGO_DONTS } from '../lib/brandSystem'
import { axesForPalette, vetoBreaches } from '../lib/brand/colourAxes'
import { contrastTargetFor } from '../lib/contrast/contrastMatrix'
import { axesForTypeface, missingFonts } from '../lib/brand/typeMetrics'
import { POMODORO_WORK_MIN } from '../lib/helper/forcedBreak'
import {
  DEFAULT_PALETTE,
  normalizeHex,
  buildPassPairs,
  bestTextOn,
  formatRatio,
  BRAND_ROLE_KEYS,
  BRAND_ROLE_LABELS,
  mapPaletteRoles,
  TYPE_PAIRS,
  typePairIdFromLabels,
  tintsAndShades,
  extractPaletteFromPins,
  suggestRoleAaFixes,
  mergeRolesIntoPalette,
  paletteHealthScore,
  paletteIsUntouched,
  healthLabel,
  healthScopeLabels,
  suggestRoleColor,
} from '../lib/color'
import { loadTypePairFont, loadBrandFamilies } from '../lib/book/fontLoader'
import { downscaleDataUrl } from '../lib/moodPins'
import { applyBrandCssVars, clearBrandCssVars } from '../lib/brandCssVars'
import ReadabilityRows from '../features/palette/ReadabilityRows'
import MarkColourCheck from '../features/brand/MarkColourCheck'
import TypeSpecimen from '../features/brand/TypeSpecimen'
import '../styles/lazy-design.css'

/** User-facing labels for palette role chips (store keys stay cover/text/…). */
/* Labels and the job list both come from color.js now. They were a private
   copy here, which is how "Primary" on screen and `cover` in the store drifted
   apart from the store's own whitelist — a role could be offered in the UI and
   silently rejected on save. One list, one set of names. */
const ROLE_LABELS = BRAND_ROLE_LABELS

/* What the health meter reads, said out loud. The palette offers nine jobs
   and the score looks at four of them; without this line, filling in the
   other five and seeing the number not move reads as the meter being
   broken. Written once and shown in both states — a scored panel and an
   unscored one need the same explanation. */
const HEALTH_SCOPE_NOTE = (() => {
  const names = healthScopeLabels()
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
      : names[0]
  /* The second clause was "Your other colours don't count against it" — a
     denial, which makes the reader construct the penalty in order to
     discard it, and the only place on this screen that raised the idea of
     being penalised at all. It also answered the wrong question: after
     writing five rationales the live question is "did that land anywhere?",
     not "was I punished?". It lands — `colorRoles` is copied wholesale into
     both the version snapshot and the export payload, so all nine jobs
     reach the client's files. "Jobs" matches the "Color jobs" heading
     below rather than introducing a second word for the same thing. */
  return `Reads ${list}, plus how the palette sits together. Your other jobs are saved with the brand — they just don't move this number.`
})()

/**
 * Sizes to look at the mark at, so "smallest size" is a judgement rather than
 * a guess. Named for what they ARE in the world — a favicon, an app icon, a
 * business card — because "16px" answers a question nobody asked. Rendered at
 * CSS pixels, which is honest for the digital rows and indicative for print.
 */
const MARK_TEST_SIZES = [
  { px: 16, label: 'Favicon' },
  { px: 32, label: 'App icon' },
  { px: 48, label: 'Card' },
  { px: 96, label: 'Letterhead' },
]

/** Stable empty array — a fresh `[]` each render would defeat memo children. */
const EMPTY_CONCEPTS = []

const BrandArtboard = lazy(() => import('../components/BrandArtboard'))

export default function DesignView({
  navDir = 'none',
  journeyNext = null,
  activeProject = null,
  deskMood = [],
  projectPalette = [],
  studioName = '',
  setActiveView,
  flashToast,
  offerUndo,
  flashMicro,
  /** One-shot deep link from Review/Deliver readiness — cleared after apply */
  brandEditSectionProp = null,
  setBrandEditSectionProp = null,
  // Focus timer props
}) {
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const setBrandTokenTags = useAppStore((s) => s.setBrandTokenTags)
  const setProjectPalette = useAppStore((s) => s.setProjectPalette)
  const updatePaletteColor = useAppStore((s) => s.updatePaletteColor)
  const addPaletteColor = useAppStore((s) => s.addPaletteColor)
  const removePaletteColor = useAppStore((s) => s.removePaletteColor)
  const bumpDesignVersion = useAppStore((s) => s.bumpDesignVersion)
  const bumpDesignVersionIfV1 = useAppStore((s) => s.bumpDesignVersionIfV1)
  const setColorRole = useAppStore((s) => s.setColorRole)
  const seedStrategyAttributes = useAppStore((s) => s.seedStrategyAttributes)
  const addLogoConcept = useAppStore((s) => s.addLogoConcept)
  const chooseLogoConcept = useAppStore((s) => s.chooseLogoConcept)
  const updateLogoConcept = useAppStore((s) => s.updateLogoConcept)
  const removeLogoConcept = useAppStore((s) => s.removeLogoConcept)
  const setLogoConcepts = useAppStore((s) => s.setLogoConcepts)
  const setLogoImage = useAppStore((s) => s.setLogoImage)

  /* Resume from project; sub-nav / Next / deep link all write identitySubstep. */
  const identitySubstep = resolveIdentitySubstep(activeProject?.identitySubstep)
  /* Tags for the typeface being chosen. Open the comparison by default once
     it has been tagged — before that it is an empty box asking for work, and
     an empty box that opens itself is a chore, not help. */
  const typeTags = activeProject?.brandTokenTags?.typeface || {}
  const typeTagged = Object.values(typeTags).some(
    (v) => v !== null && v !== undefined && v !== ''
  )
  /* Fonts the project names that this browser cannot render. Everything
     previewed or exported with one of these is silently substituted, which
     is how a client ends up looking at a specimen of the wrong typeface. */
  const absentFonts = useMemo(
    () => missingFonts(activeProject),
    [activeProject?.typeHeading, activeProject?.typeBody]
  )
  /* Only weight is honestly readable from a font. The rest come back null
     and remain the designer's to place. */
  const typeRead = useMemo(() => {
    const a = axesForTypeface(activeProject?.typeHeading)
    return a.weight === null ? {} : { weight: a.weight }
  }, [activeProject?.typeHeading])
  /* Read from the palette itself rather than from sliders the designer
     moved. Formality and Era come back null on purpose — nothing in a hex
     makes a colour formal or retro, and guessing is what made the old panel
     call a forbidden orange a match. */
  const paletteAxes = useMemo(
    () => axesForPalette(projectPalette || []),
    [projectPalette]
  )
  /* The bar this project's colour is held to, read from the client's own
     accessibility answer. Derived once and threaded into every consumer —
     the rows, the health score, the pass-pair list and the Fix button — so
     they cannot be held to different bars. A Fix that aims lower than the
     meter it feeds is a named defect in color.js. */
  const contrastTarget = useMemo(
    () => contrastTargetFor(activeProject?.detective),
    [activeProject?.detective?.accessibilityNeeds]
  )

  const concepts = Array.isArray(activeProject?.logoConcepts)
    ? activeProject.logoConcepts
    : EMPTY_CONCEPTS

  /* What the lockups print when the Wordmark field is blank. */
  const wordmarkFallback = wordmarkName(
    { ...(activeProject || {}), logoWordmark: '' },
    ''
  )

  /* The client's own existing artwork, shown on Mark when it is relevant.
     `existingAssetsFiles` is the array-shaped attachment the brief collects
     (`[{ name, url }]`), and it is only design material when there IS a
     previous identity — on a from-scratch job there is nothing to replace. */
  const existingMarks = useMemo(() => {
    const kind = activeProject?.detective?.engagementType
    if (kind !== 'rebrand' && kind !== 'extend') return []
    const files = activeProject?.detective?.existingAssetsFiles
    return (Array.isArray(files) ? files : []).filter((f) => f?.url)
  }, [
    activeProject?.detective?.engagementType,
    activeProject?.detective?.existingAssetsFiles,
  ])
  /* The client's own stated vetoes, read back against the palette. The
     cheapest useful second opinion in the app: no judgement required,
     because the client already said it. */
  const colourVetoes = useMemo(
    () =>
      vetoBreaches(
        projectPalette || [],
        [
          activeProject?.detective?.avoid,
          activeProject?.detective?.colorNotes,
          activeProject?.brief,
          activeProject?.positioning,
        ]
          .filter(Boolean)
          .join('\n')
      ),
    [
      projectPalette,
      activeProject?.detective?.avoid,
      activeProject?.brief,
      activeProject?.positioning,
    ]
  )
  const setIdentitySubstep = (id) => {
    const next = resolveIdentitySubstep(id)
    if (next === identitySubstep) return
    updateBrandField('identitySubstep', next)
  }
  const [deepLinkFocus, setDeepLinkFocus] = useState(null)
  const [brandRoleAssign, setBrandRoleAssign] = useState('cover')
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

  /* The client's positioning answers, placed on the rulers before the bars
     are read. Idempotent and one-shot in the store — see
     `seedStrategyAttributes`. Called from both Strategy and here because a
     designer who skipped Strategy would otherwise meet five empty bars
     while four of the answers behind them were already in the brief. */
  useEffect(() => {
    if (!activeProject?.id) return
    seedStrategyAttributes(activeProject.id)
  }, [activeProject?.id, seedStrategyAttributes])


  const restoreSelectedVersion = async () => {
    if (!selectedVersion?.id || restoringVersion) return
    const label = selectedVersion.versionLabel || 'this version'
    const ok =
      typeof window !== 'undefined'
        ? window.confirm(
            `Restore identity to ${label}? Current mark, words, color and type will be replaced. Use Bump first if you want a save point.`
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
    /* The words moved onto the artboard, which is on every screen — so a
       "add your voice" pointer has to highlight the SHEET, not a panel on the
       tool side that no longer contains it. Without this, every retired
       section id would land on Mark with nothing marked, and a pointer that
       resolves to a generic place teaches the user to stop trusting the
       resume affordance. */
    const focus = isArtboardDeepLink(brandEditSectionProp) ? 'artboard' : target
    setBrandEditSectionProp?.(null)
    setDeepLinkFocus(focus)
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

  /* hex → the job that hex holds, so the mark check can say "Uses your
     Primary" rather than "Uses your #1B4C7E". Memoised because it is passed
     as a prop into a memo dependency — rebuilt on every render it would
     recompute the reading on every keystroke elsewhere on the screen. */
  const roleLabelForHex = useCallback(
    (hex) => {
      const want = String(hex || '').toLowerCase()
      if (!want) return null
      const key = BRAND_ROLE_KEYS.find(
        (k) =>
          String(activeProject?.colorRoles?.[k] || '').toLowerCase() === want
      )
      return key ? ROLE_LABELS[key] : null
    },
    [activeProject?.colorRoles]
  )

  const effectiveRoles = useMemo(() => {
    const o = activeProject?.colorRoles || {}
    /* Every job the vocabulary knows, not just the original four. The extra
       slots (Secondary, further Accents, Neutrals) have NO fallback on
       purpose: an unassigned job is unanswered, not wrong, and inventing a
       default for it would put a colour in a role the designer never chose
       and then measure them against it. `roleContrastPairs` already filters
       unassigned roles out rather than failing them. */
    const out = {}
    for (const key of BRAND_ROLE_KEYS) {
      out[key] = normalizeHex(o[key]) || paletteRoles[key] || ''
    }
    return out
  }, [activeProject?.colorRoles, paletteRoles])

  const passPairs = useMemo(
    () =>
      buildPassPairs(projectPalette, contrastTarget.strict ? 7 : 4.5).slice(
        0,
        12
      ),
    [projectPalette, contrastTarget.strict]
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

  /* A typeface name is typed one letter at a time, and every letter used to be
     a saved brand decision. A designer who typed half of "Plus Jakarta Sans"
     and moved on had `Plus Jakart` in the project, on the type page of the
     brand book, and quoted back to their client on the handoff sheet. The
     store is not where a half-finished word belongs.

     Same shape as the hex fields above: the draft lives here while the field
     has focus, the store keeps the last settled value, and blur commits. Blur
     fires on unmount too, so nothing is lost by navigating away. */
  const [faceDrafts, setFaceDrafts] = useState({})

  const commitFace = (field) => {
    const draft = faceDrafts[field]
    setFaceDrafts((d) => {
      const next = { ...d }
      delete next[field]
      return next
    })
    if (draft == null) return
    /* Blank means "put it back", not "the brand has no heading face". The
       field shows a default when empty and committing the empty string would
       persist a decision the designer did not make. */
    if (draft.trim()) updateBrandField(field, draft.trim())
  }

  const headingFace =
    faceDrafts.typeHeading ?? (activeProject?.typeHeading || 'Plus Jakarta Sans Bold')
  const bodyFace =
    faceDrafts.typeBody ?? (activeProject?.typeBody || 'Plus Jakarta Sans Regular')

  /* A face the catalogue does not know still works — a designer may have
     licensed something the app has never heard of — so this is a note and
     nothing is blocked. The cost is specific and worth naming: the typography
     sheet in the client package takes its source and licence line from the
     catalogue, so an unrecognised name ships without one. It also catches a
     name that is simply half-typed, which is how `Plus Jakart` reached a
     client sheet. */
  const unknownFace = (label) => {
    const family = parseLabel(label).family
    return family && !familyByName(family) ? family : ''
  }
  const unknownHeading = unknownFace(headingFace)
  const unknownBody = unknownFace(bodyFace)

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

  /**
   * Apply one suggested route from a readability row.
   *
   * Fixes at ROLE level, never per pair. A colour holds a job, and the same
   * colour appears in more than one pairing — nudging it for one row silently
   * rewrites the verdict of the others, which is how a designer ends up
   * chasing the same problem around the screen. Setting the role keeps the
   * palette and the export in step, the way `applyAaRoleFix` already does.
   *
   * Undo, not a confirmation. CLAUDE.md §2: "every destructive or reordering
   * action gets a 5-second undo toast rather than a confirmation dialog —
   * confirmation dialogs are a decision; undo is not." An adjustment that
   * cannot be taken back is not a suggestion, whatever the button says.
   */
  const applyReadabilityRoute = (route) => {
    if (!route?.role || !route?.to) return
    const previous = (activeProject?.colorRoles || {})[route.role]
    setColorRole(route.role, route.to)
    const nextPal = projectPalette.map((c) =>
      c?.toLowerCase() === String(route.from).toLowerCase() ? route.to : c
    )
    if (nextPal.length >= 2) setProjectPalette(nextPal)
    offerUndo?.(`${route.role} color`, () => {
      if (previous) setColorRole(route.role, previous)
      setProjectPalette(projectPalette)
    })
    flashToast?.(
      route.newColour
        ? `${route.role} changed — check it still reads as your brand`
        : `${route.role} adjusted`
    )
  }

  const applyAaRoleFix = () => {
    const { roles, changes } = suggestRoleAaFixes(
      projectPalette,
      activeProject?.colorRoles,
      { strict: contrastTarget.strict }
    )
    if (!changes.length) {
      flashMicro?.(
        contrastTarget.strict
          ? 'Roles already pass the stricter AAA targets'
          : 'Roles already pass AA targets'
      )
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

  /* `fixPairFg` lived here: a per-PAIR nudge that rewrote one palette entry.
     Removed with the pairwise list it served. A colour appears in several
     pairings, so fixing one silently rewrote the verdict of the others — it
     could not be idempotent by construction, and the designer's model of
     "what I already fixed" was destroyed by their own next fix, with nothing
     on screen recording it. Adjustments now happen at ROLE level via
     `applyReadabilityRoute`, which settles. */

  const fmtDiffVal = (v) => {
    if (v === null || v === undefined) return '—'
    if (Array.isArray(v)) return v.join(', ')
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  // The one field the brand book's "Direction Decision" page depends on
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
            </div>

            {/* Labels only. The screens were numbered 01–04, which asserts a
                sequence the app does not enforce and reads as a four-part
                completion contract — most jobs legitimately never fill all
                four, so the numbering quietly reported an unfinished
                obligation on every visit. */}
            <nav className="identity-subnav" aria-label="Identity screens">
              {IDENTITY_SUBSTEPS.map((step) => {
                const active = identitySubstep === step.id
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`identity-subnav-btn${active ? ' is-active' : ''}`}
                    aria-current={active ? 'step' : undefined}
                    onClick={() => setIdentitySubstep(step.id)}
                  >
                    {step.label}
                  </button>
                )
              })}</nav>

            <div className="design-workspace">
            {/* THE ARTBOARD IS THE WORKSPACE, not a preview of it.
                Persistent on every tool screen, and editable: the words a
                brand needs — tagline, positioning, voice, promise, proof,
                personality, do/don't — are typed onto the sheet they appear
                on, beside the mark and the palette they have to work with.
                There is no "Words" screen any more, and no Preview
                destination; a preview is not an activity.

                Order matters and is load-bearing. On wide screens the sheet
                is the left column and the tools are the right; on mobile it
                is FIRST, before the tools. PRD §12 asks for exactly that and
                the five-way split had broken it — the sheet had been
                quarantined behind a fifth tab, so four of five screens showed
                no picture of the brand at all.

                Palette ROLES are deliberately not assignable here. The
                artboard's role control is a two-step mode (arm a role, then
                click a swatch), and a mode that stays armed across a screen
                change means an identical click means different things
                depending on something invisible. Roles stay on Color, where
                the control is direct. One input site per field. */}
            <div
              className={`design-artboard-column${
                deepLinkFocus === 'artboard' ? ' is-deep-link-focus' : ''
              }`}
              role="region"
              aria-label="Brand direction sheet"
            >
              <Suspense fallback={<div className="panel-hint">Loading…</div>}>
                <BrandArtboard
                  id="system-artboard"
                  project={activeProject || {}}
                  palette={projectPalette}
                  pins={deskMood.filter((m) => m.inPack)}
                  editable
                  studio={studioName}
                  onTaglineChange={(v) => updateBrandField('tagline', v)}
                  onPositioningChange={(v) => updateBrandField('positioning', v)}
                  onVoiceChange={(v) => updateBrandField('voice', v)}
                  onDoChange={(v) => updateBrandField('doUse', v)}
                  onDontChange={(v) => updateBrandField('dontUse', v)}
                  onPromiseChange={(v) => updateBrandField('messagingPromise', v)}
                  onProofChange={(v) => updateBrandField('messagingProof', v)}
                  onPersonalityChange={(v) =>
                    updateBrandField('messagingPersonality', v)
                  }
                />
              </Suspense>
            </div>

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

              {/* ADD A CONCEPT IS THE FIRST CONTROL ON THE SCREEN.
                  It used to be a file input at the very bottom, under six
                  text fields asking you to describe a mark you had not
                  uploaded yet — "if it's at the bottom, I won't see it or use
                  it" (PRD §2), applied to the one action this screen exists
                  for. The describing moved to Handover, where it belongs:
                  after there is something to describe. */}
              <div className="mark-concepts" role="group" aria-label="Concepts">
                <div className="mark-concepts-head">
                  <p className="field-label" style={{ margin: 0 }}>
                    Concepts
                  </p>
                  {concepts.length > 0 && (
                    <span className="mark-concepts-hint">
                      {concepts.length === 1
                        ? 'Add another to compare them side by side'
                        : 'Star the one you are taking forward'}
                    </span>
                  )}
                </div>

                <ul className="mark-concept-grid">
                  {concepts.map((concept, i) => (
                    <li
                      key={concept.id}
                      className={`mark-concept${concept.chosen ? ' is-chosen' : ''}`}
                    >
                      <div className="mark-concept-frame">
                        {concept.image ? (
                          <img src={concept.image} alt="" />
                        ) : (
                          <span className="mark-concept-blank" aria-hidden="true" />
                        )}
                      </div>
                      {/* One gesture, no ranking and no archive-the-rejects
                          chore. Starring writes `logoImage`, so the chosen
                          mark flows to the pack, the book, the portal and the
                          mocks with nothing else to remember. */}
                      <button
                        type="button"
                        className={`mark-concept-star${concept.chosen ? ' is-on' : ''}`}
                        aria-pressed={concept.chosen}
                        onClick={() => {
                          if (concept.chosen) return
                          chooseLogoConcept(concept.id, activeProject?.id)
                          flashMicro(
                            `${concept.label?.trim() || `Concept ${i + 1}`} is the one`
                          )
                        }}
                      >
                        {concept.chosen ? '★ Chosen' : '☆ Choose this'}
                      </button>
                      <input
                        className="field-input mark-concept-name"
                        value={concept.label || ''}
                        placeholder={`Concept ${i + 1}`}
                        aria-label={`Name for concept ${i + 1}`}
                        onChange={(e) =>
                          updateLogoConcept(
                            concept.id,
                            { label: e.target.value },
                            activeProject?.id
                          )
                        }
                      />
                      {/* The route's reasoning, on the route. This was a
                          disconnected "How the mark behaves" box that could
                          not tell you which concept it described.

                          ONE CONCEPT → ONE RATIONALE. This box shows the
                          concept's OWN `why`, never the project's mirrored
                          `logoDirection`. Reading the mirror is what let
                          concept A's rationale appear under concept B: star A,
                          write a why, star B, and B's card showed A's sentence
                          because the mirror had not moved. The store keeps
                          `logoDirection` in step for the brand book's Logo
                          page; the card does not read it back. */}
                      <input
                        className="field-input mark-concept-why"
                        value={concept.why || ''}
                        placeholder="Why this one"
                        aria-label={`Why concept ${i + 1}`}
                        onChange={(e) =>
                          updateLogoConcept(
                            concept.id,
                            { why: e.target.value },
                            activeProject?.id
                          )
                        }
                      />
                      <button
                        type="button"
                        className="text-link mark-concept-remove"
                        onClick={() => {
                          const before = concepts
                          const beforeMark = activeProject?.logoImage
                          removeLogoConcept(concept.id, activeProject?.id)
                          offerUndo?.('Concept removed', () => {
                            setLogoConcepts(before, activeProject?.id)
                            setLogoImage(beforeMark, activeProject?.id)
                          })
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}

                  <li className="mark-concept is-add">
                    <label className="mark-concept-add">
                      <span className="mark-concept-add-plus" aria-hidden="true">
                        +
                      </span>
                      <span className="mark-concept-add-label">
                        {concepts.length === 0 ? 'Add your first mark' : 'Add a concept'}
                      </span>
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
                          /* Capture the project NOW, not when the read
                             finishes — the downscale is async and on a large
                             image the gap is long enough to switch projects
                             in. */
                          const ownerProjectId = activeProject?.id
                          const reader = new FileReader()
                          reader.onerror = () =>
                            flashToast('Could not read that image. Try another file.')
                          reader.onload = async () => {
                            let img = reader.result
                            try {
                              img = await downscaleDataUrl(reader.result, file.type)
                            } catch {
                              /* keep the original */
                            }
                            addLogoConcept(img, ownerProjectId)
                            const bump = bumpDesignVersionIfV1()
                            flashMicro(
                              bump?.bumped ? `Concept added · ${bump.version}` : 'Concept added'
                            )
                          }
                          reader.readAsDataURL(file)
                        }}
                      />
                    </label>
                  </li>
                </ul>
              </div>

              {/* The old mark, when there IS an old mark. On a rebrand this is
                  the single most relevant image on the screen and the app was
                  hiding it inside the brief: the client attached it, and the
                  designer working on its replacement could not see it without
                  leaving Identity. Shown only for `rebrand`/`extend`, because
                  on a from-scratch job there is nothing to show. */}
              {existingMarks.length > 0 && (
                <div className="mark-existing" role="group" aria-label="What they have now">
                  <p className="field-label" style={{ margin: 0 }}>
                    What they have now
                  </p>
                  <div className="mark-existing-row">
                    {existingMarks.map((f) => (
                      <figure key={f.url} className="mark-existing-item">
                        <img src={f.url} alt={f.name || 'Existing brand asset'} />
                      </figure>
                    ))}
                  </div>
                </div>
              )}

              <div className="field-block" style={{ marginTop: '0.85rem' }}>
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
                  /* Says what the lockups will actually show when this is
                     blank. It used to promise `project.name` while the lockups
                     used the same field — both wrong once the client has
                     answered "Client / company name". `wordmarkFallback` is
                     `wordmarkName` with this field taken out of the running,
                     which is exactly what the lockups fall back to. */
                  placeholder={
                    wordmarkFallback
                      ? `Defaults to “${wordmarkFallback}”`
                      : 'Brand wordmark'
                  }
                />
              </div>

              {/* Judged by looking, not by typing a number.
                  Handover asks for a minimum size; this is where that answer
                  comes from. The app does NOT ship a default — a minimum size
                  is a legibility outcome of one specific mark, not a
                  convention, so a pre-filled number would be an invented
                  measurement with the studio's name on it. */}
              {activeProject?.logoImage ? (
                <div className="mark-sizes" role="group" aria-label="The mark at size">
                  <p className="field-label" style={{ margin: 0 }}>
                    At size
                  </p>
                  <div className="mark-size-row">
                    {MARK_TEST_SIZES.map((s) => (
                      <figure key={s.px} className="mark-size-item">
                        <img
                          src={activeProject.logoImage}
                          alt=""
                          style={{ height: `${s.px}px` }}
                        />
                        <figcaption>{s.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : null}

              <MarkColourCheck
                logoImage={activeProject?.logoImage}
                /* THE COLORS THE DESIGNER HAS ACTUALLY CHOSEN — which is not
                   the same as "the palette". Every project is created
                   carrying the four stone defaults, so `palette.length` is
                   never 0 and an untouched project looks identical to a
                   decided one. Checking a mark against four colors nobody
                   picked reports the designer's own logo as an intruder. */
                palette={
                  paletteIsUntouched(activeProject?.palette)
                    ? []
                    : activeProject?.palette || []
                }
                paletteFull={(activeProject?.palette || []).length >= 8}
                typeHeading={activeProject?.typeHeading}
                typeBody={activeProject?.typeBody}
                labelFor={roleLabelForHex}
                onUsePalette={(hexes) => {
                  const before = activeProject?.palette || []
                  const owner = activeProject?.id
                  setProjectPalette(hexes, owner)
                  offerUndo?.('Palette from mark', () =>
                    setProjectPalette(before, owner)
                  )
                  flashMicro('Palette started from your mark')
                }}
                onAddColour={(hex) => {
                  const before = activeProject?.palette || []
                  const owner = activeProject?.id
                  addPaletteColor(hex)
                  offerUndo?.('Color added', () =>
                    setProjectPalette(before, owner)
                  )
                  flashMicro(`${hex} added to palette`)
                }}
              />
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
                <h2 className="design-section-title">Color</h2>
                <span className="design-section-rule" aria-hidden="true" />
              </header>

              {/* Same loop as Type: the words from Strategy come back here,
                  at the moment colour is chosen. One component, because a
                  second way of drawing the same comparison is a second thing
                  to keep in step. */}
              {/* Reads the ACTUAL hex values, not sliders. Swapping the
                  palette moves these bars; that is the whole point. */}
              <details className="design-align" open>
                <summary>How this palette compares to your strategy</summary>
                {colourVetoes.length > 0 && (
                  <p className="align-veto" role="status">
                    Your brief says no {[...new Set(colourVetoes.map((v) => v.family))].join(' or ')}.
                    {' '}
                    {colourVetoes.map((v) => v.hex).join(', ')} is in the palette.
                  </p>
                )}
                <AlignmentBars
                  target={strategyProfile(activeProject?.strategyAttributes || [])}
                  token={paletteAxes}
                  thingLabel="this palette"
                  derived
                />
              </details>
              {(() => {
                const health = paletteHealthScore({
                  palette: projectPalette,
                  colorRoles: activeProject?.colorRoles || {},
                  colorRoleWhy: activeProject?.colorRoleWhy || {},
                  strict: contrastTarget.strict,
                })
                /* Nothing picked yet is not a failing grade. The score used
                   to open at 20% in red on an untouched project — a mark
                   against you for not having started, which is the exact
                   shape of feedback this app exists to remove. Until there
                   is something to measure it reads as a dash.

                   One panel, two states — not two panels. The scope note has
                   to appear in both, and the earlier version of this that
                   returned early duplicated the head markup, which is how a
                   line ends up on one branch only. */
                const idle = health.score === null
                const { word, band } = healthLabel(health)
                return (
                  <div className="palette-health">
                    <div className="palette-health-head">
                      <span className="field-label" style={{ margin: 0 }}>
                        Palette health
                      </span>
                      <span
                        className={`palette-health-score ${band}`}
                        title={idle ? undefined : `${health.score}%`}
                      >
                        {word}
                      </span>
                    </div>
                    {!idle && (
                      <div className="palette-health-bar" aria-hidden="true">
                        <div
                          className="palette-health-bar-fill"
                          style={{ width: `${health.score}%` }}
                        />
                      </div>
                    )}
                    {/* The hue verdict is 20% of the score and was rendered
                        NOWHERE — the panel named a judgment ("how the whole
                        palette sits together") that the designer had no way
                        to see, check or act on. It is already written in the
                        app's voice; it shows at the one moment it is the
                        thing to act on, rather than as a permanent row. */}
                    {health.weakest === 'harmony' && health.harmony?.note && (
                      <p className="palette-health-scope">
                        {health.harmony.note}
                      </p>
                    )}
                    <p className="palette-health-scope">{HEALTH_SCOPE_NOTE}</p>
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
                    Color jobs
                  </p>
                </div>
                {/* A mode switch, and it must say so. Every subsequent click on
                    the palette row writes into whichever job is armed, so a
                    screen-reader user could overwrite Primary while intending
                    Accent 2 with no feedback at all — the selected state lived
                    only in a CSS class. Nine jobs multiply the number of wrong
                    destinations. */}
                <div
                  className="system-role-assign"
                  role="group"
                  aria-label="Which job to assign next"
                  style={{ marginTop: '0.45rem' }}
                >
                  {BRAND_ROLE_KEYS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`role-pick-chip${brandRoleAssign === role ? ' is-active' : ''}`}
                      onClick={() => setBrandRoleAssign(role)}
                      aria-pressed={brandRoleAssign === role}
                      title={`${ROLE_LABELS[role]} · ${effectiveRoles[role] || 'not chosen yet'}`}
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
                    title={`Nudge text / accent / quiet / cover until ${
                      contrastTarget.strict ? 'AAA' : 'AA'
                    } targets pass`}
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

                {/* Four pairings a reader will actually meet, each shown as real type
                    on real colour. Replaced a Background dropdown of raw hex strings
                    plus a row per remaining colour — that asked the designer to hold a
                    swatch-to-hex mapping in their head, then judged mostly combinations
                    nobody would ever set type in. See ReadabilityRows.jsx. */}
                <div className="palette-checker" style={{ marginTop: '0.85rem' }}>
                  {/* RAW colorRoles, not effectiveRoles. effectiveRoles fills
                      the four legacy keys from `mapPaletteRoles`, so passing it
                      here made a brand-new project open reporting two contrast
                      failures for roles the designer had never assigned —
                      white-on-cream at 1.0:1 among them. Worse, each phantom
                      failure offered an Adjust button that WRITES a real role,
                      so acting on the illusion created state.
                      `ReadabilityRows` states the invariant in its own header
                      ("an unassigned role is absent, never failed") and this
                      argument was quietly breaking it. The health score two
                      panels up already passes the raw map, so the same screen
                      was reporting "0 roles assigned" and two role failures at
                      the same time. effectiveRoles stays for the chip swatch
                      previews, which genuinely do want a fallback to show. */}
                  <ReadabilityRows
                    roles={activeProject?.colorRoles || {}}
                    onApply={applyReadabilityRoute}
                    strict={contrastTarget.strict}
                    strictNote={contrastTarget.note}
                  />

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

              {/* The font check comes FIRST and is the useful part here. A
                  specimen set in a substitute misleads the client rather
                  than informing them, and it reaches the client-facing
                  artboard and the PDFs, not just this screen. */}
              {absentFonts.length > 0 && (
                <p className="align-veto" role="status">
                  {absentFonts.join(' and ')}{' '}
                  {absentFonts.length === 1 ? 'is' : 'are'} not available on
                  this computer. Previews and exports will substitute another
                  face, so anything you show a client from here will not be
                  set in the type you specified.
                </p>
              )}

              {/* Decision memory, closing the loop: the words set in
                  Strategy reappear HERE, at the moment type is chosen,
                  rather than sitting in a document nobody reopens. It
                  states and never advises — the designer decides. */}
              <details className="design-align" open={typeTagged}>
                <summary>How this compares to your strategy</summary>
                <AlignmentBars
                  target={strategyProfile(activeProject?.strategyAttributes || [])}
                  token={{ ...typeTags, ...typeRead }}
                  thingLabel="this pairing"
                />
                {/* Letterforms give up far less than hex does. Weight is
                    measurable from the rendered font; warmth, formality and
                    era are cultural readings of letterforms, so they stay
                    the designer's to place rather than being guessed. */}
                {/* Say which it is. Claiming "Weight is read from the font"
                    unconditionally was false whenever the font is absent —
                    which is most of the time, since the specified faces are
                    usually not installed. A cold-start run found it stating
                    that while every bar read "not placed yet". */}
                <p className="align-tag-lead">
                  {typeRead.weight === undefined
                    ? `Nothing here is read from the letterforms — where would you put ${activeProject?.typeHeading || 'this typeface'}?`
                    : `Weight is read from the font. Where would you put ${activeProject?.typeHeading || 'this typeface'} on the rest?`}
                </p>
                <AxisTagger
                  idPrefix="type-axis"
                  value={typeTags}
                  onChange={(next) =>
                    setBrandTokenTags(activeProject?.id, 'typeface', next)
                  }
                />
              </details>
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
                    value={headingFace}
                    onChange={(e) =>
                      setFaceDrafts((d) => ({
                        ...d,
                        typeHeading: e.target.value,
                      }))
                    }
                    onBlur={() => commitFace('typeHeading')}
                  />
                  {unknownHeading && (
                    <p className="panel-hint">
                      No match for “{unknownHeading}” in the app’s font list,
                      so the handoff won’t say where to get it. Fine if it’s a
                      font you own.
                    </p>
                  )}
                </div>
                <div className="field-block" style={{ marginBottom: 0 }}>
                  <label className="field-label" htmlFor="type-body">
                    Body face
                  </label>
                  <input
                    id="type-body"
                    className="field-input"
                    value={bodyFace}
                    onChange={(e) =>
                      setFaceDrafts((d) => ({ ...d, typeBody: e.target.value }))
                    }
                    onBlur={() => commitFace('typeBody')}
                  />
                  {unknownBody && (
                    <p className="panel-hint">
                      No match for “{unknownBody}” in the app’s font list, so
                      the handoff won’t say where to get it. Fine if it’s a
                      font you own.
                    </p>
                  )}
                </div>
              </div>

              {/* THE BENCH. Two faces set as an actual hierarchy, at real
                  sizes, in the brand's own ink on paper — which is the thing
                  being decided. What was here before was each face's name set
                  in itself, which proves a font loaded and nothing else. */}
              <TypeSpecimen
                project={activeProject || {}}
                paper={
                  normalizeHex(activeProject?.colorRoles?.quiet) || undefined
                }
                ink={normalizeHex(activeProject?.colorRoles?.text) || undefined}
              />
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

            {identitySubstep === 'handover' && (
            <section
              id="design-section-content-handover"
              data-section="handover"
              className={`panel brand-section design-handover${
                deepLinkFocus === 'handover' ? ' is-deep-link-focus' : ''
              }`}
            >
              <header className="design-section-head">
                <h2 className="design-section-title">Handover</h2>
                <span className="design-section-rule" aria-hidden="true" />
              </header>

              {/* WHAT THIS SCREEN IS, and why it is a screen rather than the
                  bottom of Mark.

                  Clearspace, minimum size, misuse, imagery direction, writing
                  and print are DOCUMENTATION — they describe decisions
                  already made, and they only make sense once a mark and a
                  palette exist. They used to open the Mark screen, so the
                  first thing the identity workspace asked for was a
                  description of a mark that had not been made yet.

                  It is always present and always in the same place, never
                  conditional on a mark existing. A destination that
                  materialises when some other field becomes truthy is a
                  screen nobody ever learns the location of, and coming back
                  to find a section you have never seen is worse than finding
                  an empty one. */}
              <p className="design-handover-lead">
                What ships with the mark. Fill in what is true; blank prints
                nothing.
              </p>

              <div className="brand-two-up">
                <div className="field-block">
                  <label className="field-label" htmlFor="logo-clearspace">
                    Clearspace
                  </label>
                  <input
                    id="logo-clearspace"
                    className="field-input"
                    value={activeProject?.logoClearspace || ''}
                    onChange={(e) =>
                      updateBrandField('logoClearspace', e.target.value)
                    }
                    placeholder={'e.g. height of the “x” all around'}
                  />
                </div>
                <div className="field-block">
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
                  {/* No default, deliberately. Clearspace has a real
                      convention behind it (one cap-height, near-universal in
                      published standards) — a minimum size does not. It is a
                      legibility outcome of one particular mark, so a
                      pre-filled number would be a measurement the app
                      invented. Mark has the mark at real sizes; that is where
                      this answer comes from. */}
                  <p className="field-hint">
                    Check it on Mark, at size — there is no standard number.
                  </p>
                </div>
              </div>

              <div className="field-block">
                <label className="field-label" htmlFor="logo-donts">
                  Mark mistakes to avoid
                </label>
                <textarea
                  id="logo-donts"
                  className="field-input field-textarea"
                  rows={4}
                  value={
                    activeProject?.logoDonts || DEFAULT_LOGO_DONTS.join('\n')
                  }
                  onChange={(e) => updateBrandField('logoDonts', e.target.value)}
                  placeholder="One rule per line"
                  aria-describedby="logo-donts-defaults"
                />
                {/* The defaults are the value now, not a hint plus a button
                    that asks you to accept them. `DEFAULT_LOGO_DONTS` is what
                    the handoff ships when this is blank, so a "Start from
                    these" press was a decision about something the app
                    already knew the answer to. Written in on first sight of
                    this screen; edit or clear to override. */}
                <p className="field-hint" id="logo-donts-defaults">
                  Standard rules are filled in — edit or clear them.
                </p>
              </div>

<h3 className="design-handover-title">Imagery</h3>
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
              <h3 className="design-handover-title">Writing and print</h3>
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
              {/* Versions live here, not on a Preview tab.
                  `bumpDesignVersionIfV1` fires by itself on a mark upload and
                  a type change and toasts "Concept added · v2" — announcing a
                  version from a screen with nowhere to go and look at it.
                  This is the "what ships" screen, so it is where the question
                  gets asked. */}
              <div className="design-handover-versions">
                <p className="field-label" style={{ margin: 0 }}>
                  Versions
                </p>
                <div className="version-controls">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      const r = bumpDesignVersion()
                      if (r?.ok) flashMicro(`Version ${r.version}`)
                      await loadVersionHistory()
                    }}
                  >
                    Save a version · {activeProject?.designVersion || 'v1'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
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
                    onClick={async () => {
                      await loadTemplates()
                      setShowTemplateModal(true)
                    }}
                  >
                    Templates
                  </button>
                </div>
              </div>
            </section>
            )}
            </div>
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