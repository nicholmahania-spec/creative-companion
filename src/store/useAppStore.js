import { DELIVERABLE_OPTIONS, DETECTIVE_CHAPTERS } from '../lib/detectiveBrief'
import { liftMeasuredRows } from './workLogSeparation'
import { revisionSummary, roundCharge } from '../lib/revisions'
import { FOCUS_MASK_MIN_PCT, deviceTheme } from '../lib/uiPrefs'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  appendDecision,
  decisionFromDirection,
} from '../lib/decisionLog'
import { addDays, toISODate } from '../lib/dates'
import { createBreakItem } from '../lib/breakKit'
import versionService from '../services/versionService'
import { trackVersionAction } from '../lib/analytics'

/**
 * Every field id the Define sheet knows about.
 *
 * Client submissions are mirrored onto `project.detective` for any id in
 * this set. Both public routes now send the detective schema, so in the
 * normal case every answered id is mirrored. Older submissions made against
 * the discovery schema still land correctly: the ids the two schemas share
 * are detective ids too, and the ones they do not share are ignored rather
 * than inventing keys the sheet cannot render.
 *
 * Derived rather than hard-coded so it cannot drift as the schema changes.
 */
const DETECTIVE_FIELD_IDS = new Set(
  DETECTIVE_CHAPTERS.flatMap((c) =>
    (c.fields || []).flatMap((f) => (f.attach ? [f.id, `${f.id}Files`] : [f.id]))
  )
)

/**
 * Ideate tool prompts (not fake client data).
 * ≥8 for energy UI. Opposites live in oppositeSparks only (no "Opposite day" here).
 * Mix brand leave-behind + UI/UX (empty state, primary action, hierarchy).
 */
export const sparkPrompts = [
  'Write three directions in six words each — no adjectives, only nouns + verbs.',
  'What is the one thing a viewer must understand in three seconds?',
  'Where does the finger go first on this screen — and why?',
  'What does the empty state show before any content loads?',
  'Strip one decorative layer. Does hierarchy still hold?',
  'Design a visual system that protects quiet attention, not hustle energy.',
  'Steal one rule from a project you admire — rewrite it for this audience.',
  'What if the mark worked in one color at sticker size and still felt human?',
  'Name the feeling the cover must land — one sentence, no jargon.',
  'What would you design if the budget only allowed one ink color and one font?',
]

/** Opposite-direction sparks (Ideate force-opposites challenge) */
export const oppositeSparks = [
  'Force the opposite: calm ↔ bold. Sketch both in one line each.',
  'Force the opposite: photo-heavy ↔ pure type. Which serves the goal?',
  'Force the opposite: warm/hand-made ↔ crisp/system. Name the tradeoff.',
  'Force the opposite: dense info ↔ almost empty. Where does hierarchy live?',
  'Force the opposite: literal metaphor ↔ abstract mark. Which feels truer?',
  'Force the opposite: loud accent color ↔ near-monochrome. What still reads?',
]

export const defaultProjectPalette = [
  '#1C1917',
  '#0F766E',
  '#A8A29E',
  '#FAFAF9',
]

/** Empty Design Detective Sheet (Define step) */
/** Blank detective object derived from DETECTIVE_CHAPTERS so factory cannot
 *  drift from the schema (spectra, *Files, checklist arrays stay in sync). */
export function blankDetective() {
  const d = {
    /** Milestones: [{ id, label, date }] — not a chapter field, store-only */
    milestones: [],
  }
  for (const ch of DETECTIVE_CHAPTERS) {
    for (const f of ch.fields || []) {
      if (f.type === 'checklist') d[f.id] = []
      else d[f.id] = ''
      if (f.attach) d[`${f.id}Files`] = []
    }
  }
  return d
}

/**
 * Compose the free-text brief from Detective Sheet answers. Pure function
 * so it can run on every keystroke (updateDetective) as well as from the
 * standalone applyDetectiveToBrief action, instead of only ever running
 * when a "Next"/continue button happens to be clicked.
 * @returns {string}
 */
export function composeBriefFromDetective(detective) {
  const d = { ...blankDetective(), ...(detective || {}) }
  const parts = []
  if (d.clientName?.trim()) parts.push(`Client: ${d.clientName.trim()}`)
  if (d.goal?.trim()) parts.push(`Goal: ${d.goal.trim()}`)
  if (d.story?.trim()) parts.push(`Story: ${d.story.trim()}`)
  if (d.usp?.trim()) parts.push(`Unique selling point: ${d.usp.trim()}`)
  if (d.brandWords?.trim()) parts.push(`Words: ${d.brandWords.trim()}`)
  if (d.audience?.trim()) parts.push(`Audience: ${d.audience.trim()}`)
  if (d.feel?.trim()) parts.push(`Feel: ${d.feel.trim()}`)
  if (d.audiencePains?.trim())
    parts.push(`Audience pains/desires: ${d.audiencePains.trim()}`)
  if (d.competitors?.trim()) parts.push(`Competitors: ${d.competitors.trim()}`)
  if (d.toneOfVoice?.trim()) parts.push(`Tone of voice: ${d.toneOfVoice.trim()}`)
  if (d.avoid?.trim()) parts.push(`Avoid: ${d.avoid.trim()}`)
  if (d.engagementType) {
    const names = {
      new: 'New brand, starting from scratch',
      rebrand: 'Rebrand, replacing what exists',
      extend: 'Adding to an existing brand',
    }
    parts.push(`Engagement: ${names[d.engagementType] || d.engagementType}`)
  }
  if (Array.isArray(d.deliverablesPicked) && d.deliverablesPicked.length) {
    const names = d.deliverablesPicked
      .map((id) => DELIVERABLE_OPTIONS.find((o) => o.id === id)?.label || id)
      .join(', ')
    parts.push(`Deliverables: ${names}`)
  }
  if (d.deliverables?.trim())
    parts.push(`Also needed: ${d.deliverables.trim()}`)
  if (d.technical?.trim()) parts.push(`Technical: ${d.technical.trim()}`)
  if (d.existingAssets?.trim())
    parts.push(`Existing assets to keep: ${d.existingAssets.trim()}`)
  if (d.decisionMakers?.trim())
    parts.push(`Decision-makers: ${d.decisionMakers.trim()}`)
  if ((d.milestones || []).length) {
    const ms = d.milestones
      .filter((m) => m.label?.trim())
      .map((m) => `${m.label.trim()}${m.date ? ` (${m.date})` : ''}`)
      .join(', ')
    if (ms) parts.push(`Milestones: ${ms}`)
  }
  return parts.join('\n\n')
}

/**
 * Default brand identity template fields on each project.
 * Factory so every project gets fresh nested objects (detective,
 * conceptPackage, colorRoleWhy, deliverWordsChecked) — never shared refs.
 */
export function brandIdentityDefaults() {
  return {
  tagline: '',
  voice: '',
  typeHeading: 'Plus Jakarta Sans Bold',
  typeBody: 'Plus Jakarta Sans Regular',
  doUse: '',
  dontUse: '',
  /** Org contact info — letterhead / envelope / email signature templates */
  orgAddress: '',
  orgPhone: '',
  orgEmail: '',
  orgWebsite: '',
  /** Business-card contacts: [{ id, name, title, phone, email }] */
  contacts: [],
  /** Optional overrides; null/empty keys fall back to mapPaletteRoles(palette) */
  colorRoles: null,
  /** Why each assigned color role fits the Define brand words */
  colorRoleWhy: { cover: '', text: '', accent: '', quiet: '' },
  /** Why the chosen type pair fits the Define brand words */
  typeWhy: '',
  /** data URL mark for pack cover */
  logoImage: '',
  /** Optional wordmark text (falls back to project name) */
  logoWordmark: '',
  /** Clearspace / min-size / lockup guidance */
  logoClearspace: '',
  /** Min reproduction size note */
  logoMinSize: '',
  /** Logo don'ts — one per line; defaults apply in export if empty */
  logoDonts: '',
  /** Messaging pillars */
  messagingPromise: '',
  messagingProof: '',
  messagingPersonality: '',
  /** Imagery guidelines */
  imageryStyle: '',
  imageryDo: '',
  imageryDont: '',
  /* Writing guidelines — the style-guide section this book never had.
     Two picks rather than a blank box, because every other question in this
     app that asks for composed prose gets skipped, and "sentence case, caps
     for short labels only" is a defensible default rather than an empty
     assertion. Defaults are applied at read time in the pack builder too, so
     projects saved before these keys existed still print a rule. */
  writingCase: 'sentence',
  writingCaps: 'sparing',
  writingNotes: '',
  /* Print and finish — what a printer asks for and this book could not
     answer. CMYK is already derived per swatch; these are the things no
     algorithm can infer. Printed only when filled. */
  printPantone: '',
  printStock: '',
  printFinish: '',
  /** Design version label (v1, v2...) */
  designVersion: 'v1',
  /* Scope — the five things the research says have to be agreed before work
     starts. Deliverables and file formats are already asked in the brief;
     these three had no home anywhere. `scopeOutOf` matters as much as the
     rest: what is NOT included is the half of a scope that gets argued
     about. */
  scopeRevisionsIncluded: 2,
  scopeRevisionBilling: 'perRound',
  scopeRevisionRate: '',
  scopeApprover: '',
  scopeOutOf: '',
  /** Revision rounds — [{ id, openedAt, note, closedAt, billedAmount }] */
  revisionRounds: [],
  /** Review: structured log — [{ id, reviewer, issue, decision, status }] */
  feedbackLog: [],
  /** Review: feedback notes from client / self */
  feedbackNotes: '',
  /** Deliver: short handover note for client */
  handoffNote: '',
  /** Deliver: one-paragraph evaluation / learnings */
  learnings: '',
  /** Deliver: per brand-word confirmation that the final piece delivers on it */
  deliverWordsChecked: {},
  /** Define: Design Detective Sheet */
  detective: blankDetective(),
  conceptPackage: {
    audience: '',
    outcome: '',
    concept: '',
    voice: '',
    visualDirection: '',
    doUse: '',
    dontUse: '',
    notes: '',
  },
  }
}

/** @deprecated shared instance — prefer brandIdentityDefaults() */
export const defaultBrandIdentity = brandIdentityDefaults()

/** Three Ideate direction slots (A/B/C) */
export function blankDirections() {
  return [
    { id: 'a', label: 'A', title: '', note: '', chosen: false },
    { id: 'b', label: 'B', title: '', note: '', chosen: false },
    { id: 'c', label: 'C', title: '', note: '', chosen: false },
  ]
}

/** Fresh real desk — no sample clients or fake tasks */
export function createBlankProject(name = 'My project', brief = '') {
  /* Date.now() alone collides for anything created inside the same
     millisecond, and every store action selects with `p.id === id` — so two
     projects sharing an id means a write to one silently writes to both.
     Same shape as the task/decision ids elsewhere in this file. Existing
     numeric ids keep working; only new projects get the suffix. */
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return {
    id,
    name: name || 'My project',
    active: true,
    brief: brief || '',
    logoDirection: '',
    directions: blankDirections(),
    /** Ideate diverge dump — cheap ideas before A/B/C shortlist (persisted). */
    roughIdeas: [],
    /** Ideate → Sketch external memory: chose X because Y */
    decisionLog: [],
    palette: [...defaultProjectPalette],
    deadline: '',
    /** Which Define chapter accordion is open; unset until the user opens one */
    defineOpenChapter: null,
    /** Last journey view opened in this project, so switching back resumes
     *  where you were instead of teleporting you to a computed "first gap". */
    lastView: null,
    ...brandIdentityDefaults(),
    tasks: [],
    runningTodo: blankRunningTodo(),
    /** Billable hours — hand-entered only. What a client gets charged is a
     *  claim you make deliberately, so nothing writes here automatically. */
    hourlyRate: '',
    timeLog: [],
    /** Private record of clocked work, written by the work clock. Never
     *  billed, never exported to a client. Yours. */
    workLog: [],
    /** Client discovery brief (pre-Define): answers keyed by field id,
     *  plus an optional completed-form file the client sent back. */
    discoveryAnswers: {},
    discoveryUpload: null,
    /** Public link token (discovery_shares.id) sent to the client, if any */
    discoveryShareId: null,
    discoveryShareStatus: null,
    /** Client portal (client_portals.id) — dashboard link with step
     *  push/approval, chat, and the fillable Project overview form. */
    clientPortalId: null,
  }
}

/** Fridge-list style running to-do, separate from desk tasks. */
export function blankRunningTodo() {
  return { items: [], sorted: false, lastResetDate: toISODate(new Date()) }
}

export function blankWorkspaceState() {
  const project = createBlankProject('My project', '')
  return {
    projects: [project],
    currentProjectId: project.id,
    tasks: [],
    moodItems: [],
    conceptItems: [],
    breakKit: [],
    theme: deviceTheme(),
    /* 'auto' until the user actually toggles. Without this there is no way
       to tell "chose dark" from "never chose anything and got the old
       hard-coded default", so a device set to light could never be
       followed. */
    themeSource: 'auto',
    bodyDoubling: false,
    onboarded: false,
    sparkIndex: 0,
    oppositeIndex: 0,
    sparksTried: 0,
    currentSpark: sparkPrompts[0],
    prefs: {
      soundEnabled: true,
      reduceMotion: false,
      bodyDoubleSilent: false,
      forceBreaksEnabled: true,
      forceBreaksConsented: false,
      queueCollapsed: true,
      showHowItWorks: false,
      /** Optional quiet progress strip — off by default (Tech-Studio) */
      showProgress: false,
      /** ADHD: no timed Helper pings — open Helper for Coach */
      helperQuiet: true,
      /**
       * Hyper-focus mask: inactive field opacity, as a percent, bounded by
       * FOCUS_MASK_MIN_PCT..FOCUS_MASK_MAX_PCT in lib/uiPrefs. The floor is
       * a legibility floor — see the note there. Was 25, a value the app
       * never actually applied.
       */
      focusMaskPct: FOCUS_MASK_MIN_PCT,
      /** Soft blur on masked peripherals (px); 0 = off */
      focusMaskBlur: 2,
      /** 'normal' (flat 1.5px border) or 'high' (2.5px + soft outer ring) */
      focusRingStrength: 'normal',
      /** Collapse the sidebar to zero-width while a field has focus */
      hideNavUntilBlur: false,
      /** Hide process tips / InfoReveal and instructional page-subs (Tech-Studio) */
      hideTips: true,
      /** Pack / PDF: hide Creative Companion footer watermark */
      hidePackWatermark: false,
      /**
       * Toasts: quiet (default) hides micro successes; all shows pin/role/helper chatter.
       * Errors and exports always show.
       */
      toastMode: 'quiet',
      /** Seconds non-error toasts queue before flushing together; 0 = instant (default) */
      toastBatchWindow: 0,
      /* Invoice identity and terms. In prefs, not on the project: your
         address and payment details are the same on every invoice you send,
         while `hourlyRate` is negotiated per client and stays on the project.
         An invoice with no number, no due date and no way to pay is one the
         client has to email you about before they can pay it. */
      invoiceFrom: '',
      invoicePaymentMethods: '',
      invoiceTerms: 14,
      invoiceNotes: '',
      invoiceTaxLabel: '',
      invoiceTaxPercent: 0,
      invoiceNextNumber: 1,
      invoicePrefix: '',
    },
    // Template management
    templates: [],
    currentTemplateId: null,
  }
}

/** @deprecated kept for migration only — never seed into new installs */
export const seedTasks = []
export const seedProjects = []
export const seedMoodItems = []

const initial = {
  ...blankWorkspaceState(),
  templates: [],
  currentTemplateId: null,
}


/**
 * Exactly what persistence keeps — and therefore exactly what a workspace
 * payload must carry.
 *
 * `PERSISTED_KEYS` exists so `partialize`, `exportAllData` and the round-trip
 * test can read ONE list instead of three copies. They were three copies:
 * `templates` was in partialize and missing from the payload, so every cloud
 * sync and every JSON backup silently destroyed the user's saved templates.
 * The test written to catch that then hard-coded its own sixteen-string copy
 * of the list, which would not have caught the next one — the same mistake,
 * inside its own fix.
 *
 * `defaults` are applied for keys whose stored value may be absent.
 */
export const PERSISTED_KEYS = [
  'projects',
  'currentProjectId',
  'tasks',
  'moodItems',
  'conceptItems',
  'breakKit',
  'theme',
  /* Must persist alongside `theme`, or an explicit choice survives only until
     reload — themeSource would reset to 'auto' and the device listener would
     quietly overwrite the theme the user picked. */
  'themeSource',
  'onboarded',
  'sparkIndex',
  'oppositeIndex',
  'sparksTried',
  'currentSpark',
  'prefs',
  'portalSeen',
  'templates',
  'currentTemplateId',
]

const PERSIST_DEFAULTS = {
  conceptItems: [],
  breakKit: [],
  oppositeIndex: 0,
  sparksTried: 0,
  portalSeen: {},
}

export function pickPersisted(state) {
  const out = {}
  for (const k of PERSISTED_KEYS) {
    out[k] = state[k] ?? PERSIST_DEFAULTS[k] ?? state[k]
  }
  return out
}

const useAppStore = create(
  persist(
    (set, get) => ({
      ...initial,
      projects: initial.projects,
      currentProjectId: initial.currentProjectId,
      tasks: [],
      moodItems: [],
      conceptItems: [],
      breakKit: [],
      theme: deviceTheme(),
      themeSource: 'auto',
      bodyDoubling: false,
      onboarded: false,
      sparkIndex: 0,
      currentSpark: sparkPrompts[0],
      prefs: { ...initial.prefs },

      addBreakKitItem: (payload) => {
        const item = createBreakItem(payload || {})
        if (!item) return { ok: false, error: 'Add a short title' }
        set((state) => ({
          breakKit: [item, ...(state.breakKit || [])],
        }))
        return { ok: true, item }
      },

      removeBreakKitItem: (id) =>
        set((state) => ({
          breakKit: (state.breakKit || []).filter((i) => i.id !== id),
        })),

      updateBreakKitItem: (id, patch) =>
        set((state) => ({
          breakKit: (state.breakKit || []).map((i) =>
            i.id === id ? { ...i, ...patch, id: i.id } : i
          ),
        })),

      /**
       * Mark a break-kit item done (during break or anytime).
       * Recurring → stamps lastDoneAt for today; one-shot → completed.
       */
      completeBreakKitItem: (id) => {
        const now = new Date().toISOString()
        let found = null
        set((state) => ({
          breakKit: (state.breakKit || []).map((i) => {
            if (i.id !== id) return i
            found = i
            if (i.recurring) {
              return { ...i, lastDoneAt: now }
            }
            return { ...i, completed: true, lastDoneAt: now }
          }),
        }))
        return { ok: Boolean(found), item: found }
      },

      addProject: (project) =>
        set((state) => ({
          projects: [
            ...state.projects.map((p) => ({ ...p, active: false })),
            {
              logoDirection: '',
              palette: [...defaultProjectPalette],
              deadline: '',
              ...brandIdentityDefaults(),
              ...project,
              active: true,
            },
          ],
          currentProjectId: project.id,
        })),

      setCurrentProject: (id) =>
        set((state) => ({
          currentProjectId: id,
          projects: state.projects.map((p) => ({
            ...p,
            active: p.id === id,
          })),
        })),

      updateProjectBrief: (brief) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId ? { ...p, brief } : p
          ),
        })),

      /** Partial update Design Detective Sheet fields */
      updateDetective: (field, value) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const det = { ...blankDetective(), ...(p.detective || {}), [field]: value }
            const brief = composeBriefFromDetective(det)
            return { ...p, detective: det, brief: brief || p.brief }
          }),
        })),

      /** Add a dated checkpoint (moodboard approval, sketches due, etc.) */
      addMilestone: (label, date) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const det = { ...blankDetective(), ...(p.detective || {}) }
            const milestones = [
              ...(det.milestones || []),
              // Not Date.now(): two adds in the same millisecond collided,
              // and update/remove match by id — an edit would hit both rows.
              {
                id:
                  typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                label: label || '',
                date: date || '',
              },
            ]
            const nextDet = { ...det, milestones }
            const brief = composeBriefFromDetective(nextDet)
            return { ...p, detective: nextDet, brief: brief || p.brief }
          }),
        })),

      updateMilestone: (id, field, value) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const det = { ...blankDetective(), ...(p.detective || {}) }
            const milestones = (det.milestones || []).map((m) =>
              m.id === id ? { ...m, [field]: value } : m
            )
            const nextDet = { ...det, milestones }
            const brief = composeBriefFromDetective(nextDet)
            return { ...p, detective: nextDet, brief: brief || p.brief }
          }),
        })),

      /* Takes the project the removal was scheduled against. The delete is
         deferred behind an undo window, so by the time it fires the user may
         have switched projects — and resolving against currentProjectId then
         meant the filter matched nothing, the row was never removed, and the
         milestone silently reappeared next time they opened that project. */
      removeMilestone: (id, projectId) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            const target = projectId ?? state.currentProjectId
            if (p.id !== target) return p
            const det = { ...blankDetective(), ...(p.detective || {}) }
            const milestones = (det.milestones || []).filter((m) => m.id !== id)
            const nextDet = { ...det, milestones }
            // Recompose like add/update do — without this, a deleted
            // milestone vanished from the UI but lived on in every export.
            const brief = composeBriefFromDetective(nextDet)
            return { ...p, detective: nextDet, brief: brief || p.brief }
          }),
        })),

      /** Compose free brief from detective sheet answers */
      /** @deprecated brief now auto-syncs from updateDetective(); kept for
       *  any external callers wanting an explicit one-shot recompute. */
      applyDetectiveToBrief: () => {
        const state = get()
        const p = state.projects.find((x) => x.id === state.currentProjectId)
        if (!p) return { ok: false }
        const brief = composeBriefFromDetective(p.detective)
        if (!brief) return { ok: false, error: 'Fill detective fields first' }
        set({
          projects: state.projects.map((proj) =>
            proj.id === state.currentProjectId ? { ...proj, brief } : proj
          ),
        })
        return { ok: true }
      },

      /** Project calendar deadline. Also mirrors detective.projectDeadline so
       *  overview chapter fill + getDetectiveProgress stay honest. */
      setProjectDeadline: (deadline) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? {
                  ...p,
                  deadline: deadline || '',
                  detective: {
                    ...blankDetective(),
                    ...(p.detective || {}),
                    projectDeadline: deadline || '',
                  },
                }
              : p
          ),
        })),

      /** Persist which Define chapter accordion is open per-project, so
       * leaving and returning restores it instead of resetting to the top. */
      setDefineOpenChapter: (projectId, chapterId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, defineOpenChapter: chapterId } : p
          ),
        })),

      /** Remember the view a project was last on. */
      setProjectLastView: (projectId, view) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId && p.lastView !== view ? { ...p, lastView: view } : p
          ),
        })),

      setLogoDirection: (direction) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, logoDirection: direction }
              : p
          ),
        })),

      /** Update one Ideate direction slot (a/b/c) */
      updateDirection: (dirId, patch) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const dirs = Array.isArray(p.directions)
              ? p.directions.map((d) => ({ ...d }))
              : blankDirections()
            const idx = dirs.findIndex(
              (d) => d.id === dirId || d.label?.toLowerCase() === String(dirId).toLowerCase()
            )
            if (idx < 0) return p
            dirs[idx] = { ...dirs[idx], ...patch }
            // Choosing one un-chooses others + log decision for Sketch resume
            let decisionLog = Array.isArray(p.decisionLog) ? p.decisionLog : []
            if (patch.chosen === true) {
              dirs.forEach((d, i) => {
                if (i !== idx) d.chosen = false
              })
              const entry = decisionFromDirection(dirs[idx])
              decisionLog = appendDecision(decisionLog, entry)
            } else if (
              dirs[idx].chosen &&
              (patch.title != null || patch.note != null)
            ) {
              // Keep log in sync while refining title/why on the winner
              decisionLog = appendDecision(
                decisionLog,
                decisionFromDirection(dirs[idx])
              )
            }
            return { ...p, directions: dirs, decisionLog }
          }),
        })),

      /**
       * Replace Ideate rough-idea dump for the current project.
       * Cap keeps the list from becoming a second infinite inbox.
       * @param {string[]} ideas
       */
      setRoughIdeas: (ideas) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const list = (Array.isArray(ideas) ? ideas : [])
              .map((t) => String(t || '').trim())
              .filter(Boolean)
              .slice(0, 30)
            return { ...p, roughIdeas: list }
          }),
        })),

      /**
       * Manual decision log entry (Ideate why, Sketch note).
       * @param {{ kind?: string, directionId?: string, label?: string, title?: string, why?: string }} entry
       */
      logDecision: (entry) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const decisionLog = appendDecision(p.decisionLog, entry)
            return { ...p, decisionLog }
          }),
        })),

      /** Replace full palette for active project (max 8) */
      /**
       * @param {string[]} palette
       * @param {string|number} [projectId] - the project the palette was
       *   extracted FROM. Extraction decodes every pinned image, so without
       *   this a project switch mid-extraction overwrote the new project's
       *   palette with the old one's colours.
       */
      setProjectPalette: (palette, projectId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === (projectId ?? state.currentProjectId)
              ? {
                  ...p,
                  palette: (palette || []).slice(0, 8),
                }
              : p
          ),
        })),

      updatePaletteColor: (index, hex) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const next = [
              ...(p.palette?.length ? p.palette : defaultProjectPalette),
            ]
            if (index < 0 || index >= next.length) return p
            next[index] = hex
            return { ...p, palette: next }
          }),
        })),

      addPaletteColor: (hex = '#888888') =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const next = [
              ...(p.palette?.length ? p.palette : defaultProjectPalette),
            ]
            if (next.length >= 8) return p
            next.push(hex)
            return { ...p, palette: next }
          }),
        })),

      removePaletteColor: (index) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const next = [
              ...(p.palette?.length ? p.palette : defaultProjectPalette),
            ]
            if (next.length <= 2) return p
            next.splice(index, 1)
            return { ...p, palette: next }
          }),
        })),

      /**
       * Running to-do ("fridge list") — separate from desk tasks. Items are
       * keyword-tagged to one of the 7 workflow stages at add time. Stays
       * flat/unsorted until sortRunningTodo() is called once; after that,
       * new items still land pre-sorted into their stage automatically.
       */
      addRunningTodoItem: (text, stage) =>
        set((state) => {
          const trimmed = String(text || '').trim()
          if (!trimmed) return state
          return {
            projects: state.projects.map((p) => {
              if (p.id !== state.currentProjectId) return p
              const rt = p.runningTodo || blankRunningTodo()
              const item = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                text: trimmed,
                stage,
                completed: false,
                createdAt: Date.now(),
              }
              return { ...p, runningTodo: { ...rt, items: [...rt.items, item] } }
            }),
          }
        }),

      toggleRunningTodoItem: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const rt = p.runningTodo
            if (!rt) return p
            return {
              ...p,
              runningTodo: {
                ...rt,
                items: rt.items.map((it) =>
                  it.id === id ? { ...it, completed: !it.completed } : it
                ),
              },
            }
          }),
        })),

      removeRunningTodoItem: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const rt = p.runningTodo
            if (!rt) return p
            return {
              ...p,
              runningTodo: { ...rt, items: rt.items.filter((it) => it.id !== id) },
            }
          }),
        })),

      sortRunningTodo: () =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const rt = p.runningTodo || blankRunningTodo()
            return { ...p, runningTodo: { ...rt, sorted: true } }
          }),
        })),

      /** Daily reset: clears completed items only; keeps sorted state and
       *  unfinished items as-is. Safe to call repeatedly — no-ops same-day. */
      resetRunningTodoIfNewDay: (projectId) =>
        set((state) => {
          const today = toISODate(new Date())
          return {
            projects: state.projects.map((p) => {
              if (p.id !== projectId) return p
              const rt = p.runningTodo
              if (!rt || rt.lastResetDate === today) return p
              return {
                ...p,
                runningTodo: {
                  ...rt,
                  items: rt.items.filter((it) => !it.completed),
                  lastResetDate: today,
                },
              }
            }),
          }
        }),

      /** Business-card contacts — letterhead/envelope stay single, org-wide */
      addContact: () =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const contact = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: '',
              title: '',
              phone: '',
              email: '',
            }
            return { ...p, contacts: [...(p.contacts || []), contact] }
          }),
        })),

      updateContact: (id, field, value) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              contacts: (p.contacts || []).map((c) =>
                c.id === id ? { ...c, [field]: value } : c
              ),
            }
          }),
        })),

      removeContact: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return { ...p, contacts: (p.contacts || []).filter((c) => c.id !== id) }
          }),
        })),

      /** Lightweight hours/invoice tracking — separate from creative workflow */
      setHourlyRate: (rate) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId ? { ...p, hourlyRate: rate } : p
          ),
        })),

      /**
       * Add a billable line. Either hours (billed at the project rate) or a
       * flat `amount`.
       *
       * This used to reject anything without `hours > 0`, so a fixed-price
       * project could not be invoiced at all — you had to invent hours that
       * multiplied out to the agreed number. The brief asks the client for a
       * budget and a list of deliverables, which is project pricing; the
       * invoice could only express hourly.
       */
      addTimeEntry: ({ date, hours, amount, note = '' }) =>
        set((state) => {
          const h = Number(hours)
          const amt = Number(amount)
          const hasHours = Number.isFinite(h) && h > 0
          const hasAmount = Number.isFinite(amt) && amt > 0
          if (!date || (!hasHours && !hasAmount)) return state
          return {
            projects: state.projects.map((p) => {
              if (p.id !== state.currentProjectId) return p
              const entry = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                date,
                note: String(note || '').trim(),
                ...(hasHours ? { hours: h } : {}),
                ...(hasAmount ? { amount: amt } : {}),
              }
              return { ...p, timeLog: [...(p.timeLog || []), entry] }
            }),
          }
        }),

      /** Claim the next invoice number and advance the counter. */
      takeInvoiceNumber: () => {
        const { prefs } = get()
        const n = Number(prefs?.invoiceNextNumber) || 1
        set((state) => ({
          prefs: { ...state.prefs, invoiceNextNumber: n + 1 },
        }))
        const prefix = String(prefs?.invoicePrefix || '').trim()
        return prefix ? `${prefix}${n}` : String(n)
      },

      removeTimeEntry: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return { ...p, timeLog: (p.timeLog || []).filter((t) => t.id !== id) }
          }),
        })),

      /**
       * Open a revision round. No-op if one is already open — two open rounds
       * would make "which round am I on" unanswerable, which is the exact
       * question this feature exists to answer.
       */
      startRevisionRound: (note = '') =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const rounds = Array.isArray(p.revisionRounds)
              ? p.revisionRounds
              : []
            if (rounds.some((r) => r && !r.closedAt)) return p
            return {
              ...p,
              revisionRounds: [
                ...rounds,
                {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  openedAt: new Date().toISOString(),
                  note: String(note || '').trim(),
                  closedAt: '',
                },
              ],
            }
          }),
        })),

      /**
       * Close the open round, and optionally bill it.
       *
       * `bill` is opt-in and never inferred. A round going over the agreed
       * count is a fact; charging for it is a decision, and an app that
       * quietly added a line to an invoice would be making that decision on
       * the studio's behalf against a client it cannot see.
       */
      closeRevisionRound: ({ bill = false, hours = 0 } = {}) =>
        set((state) => {
          const project = state.projects.find(
            (p) => p.id === state.currentProjectId
          )
          if (!project) return state
          const rounds = Array.isArray(project.revisionRounds)
            ? project.revisionRounds
            : []
          const openIdx = rounds.findIndex((r) => r && !r.closedAt)
          if (openIdx < 0) return state

          const summary = revisionSummary(
            rounds,
            project.scopeRevisionsIncluded
          )
          const charge = bill
            ? roundCharge({
                billing: project.scopeRevisionBilling,
                rate: project.scopeRevisionRate,
                hours,
                isBeyond: summary.isBeyond,
              })
            : null

          const nextRounds = rounds.map((r, i) =>
            i === openIdx
              ? {
                  ...r,
                  closedAt: new Date().toISOString(),
                  billedAmount: charge || 0,
                }
              : r
          )

          /* A billed round becomes an invoice line, not a separate ledger.
             The invoice is the one place money is counted; a second running
             total somewhere else is a number waiting to disagree. */
          const nextTimeLog =
            charge && charge > 0
              ? [
                  ...(project.timeLog || []),
                  {
                    id: `${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 7)}`,
                    date: new Date().toISOString().slice(0, 10),
                    note: `Revision round ${summary.number}`,
                    amount: charge,
                  },
                ]
              : project.timeLog || []

          return {
            projects: state.projects.map((p) =>
              p.id === project.id
                ? { ...p, revisionRounds: nextRounds, timeLog: nextTimeLog }
                : p
            ),
          }
        }),

      /**
       * Mark a decision as one that broke a convention on purpose.
       *
       * A one-tap toggle applied AFTER the fact, never a field on the capture
       * form. The rejected version added a "which rule are you breaking?" box
       * to the decision form plus a rule that filling it made the `why`
       * mandatory — which fires a decision on every entry (and most decisions
       * break nothing), and punishes the user with a blocked save for
       * volunteering information. Capture is the most initiation-fragile
       * moment in the workflow; nothing gets added to it.
       *
       * There is no accompanying text field. The existing `why` already says
       * what the break was — "Quiet teal — calm, not corporate" IS the
       * statement — so this only marks which entries the case study should
       * present as deliberate.
       */
      toggleDecisionRuleBreak: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              decisionLog: (p.decisionLog || []).map((d) =>
                d.id === id ? { ...d, breaksRule: !d.breaksRule } : d
              ),
            }
          }),
        })),

      /** Feedback log — Reviewer / Issue / Decision / Status. */
      addFeedbackEntry: ({ reviewer = '', issue = '', decision = '', status = 'open' }) =>
        set((state) => {
          if (!String(issue || '').trim()) return state
          return {
            projects: state.projects.map((p) => {
              if (p.id !== state.currentProjectId) return p
              return {
                ...p,
                feedbackLog: [
                  ...(Array.isArray(p.feedbackLog) ? p.feedbackLog : []),
                  {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    reviewer: String(reviewer || '').trim(),
                    issue: String(issue).trim(),
                    decision: String(decision || '').trim(),
                    status,
                  },
                ],
              }
            }),
          }
        }),

      updateFeedbackEntry: (id, patch = {}) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              feedbackLog: (p.feedbackLog || []).map((f) =>
                f.id === id ? { ...f, ...patch } : f
              ),
            }
          }),
        })),

      removeFeedbackEntry: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              feedbackLog: (p.feedbackLog || []).filter((f) => f.id !== id),
            }
          }),
        })),

      /** Drop a row from the private work log. A measured record you disagree
       *  with is still yours to correct. */
      removeWorkEntry: (id) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return { ...p, workLog: (p.workLog || []).filter((t) => t.id !== id) }
          }),
        })),

      /**
       * Record time actually worked, from the work clock.
       *
       * Writes to `workLog`, NOT to `timeLog`. These were the same array and
       * should never have been: the clock is the user clocking their own
       * hours, for themselves, and an invoice is a claim made to a client.
       * Wiring one into the other means every idle page you left open, every
       * stage you passed through, silently becomes something someone is
       * asked to pay for — and you would be reviewing a bill rather than
       * writing one. Billable hours stay hand-entered.
       *
       * Accumulates into ONE entry per stage per day rather than appending a
       * row every time you pause. A day of real work is dozens of
       * start/stops, and a log with sixty four-minute rows is not a record of
       * a day, it is a transcript of your attention.
       *
       * @param {number} ms - milliseconds worked, idle already excluded
       */
      logWorkedTime: (projectId, stage, ms) =>
        set((state) => {
          const minutes = Math.round((Number(ms) || 0) / 60000)
          // Under a minute is noise from a page you passed through.
          if (minutes < 1) return {}
          const target = projectId ?? state.currentProjectId
          const date = new Date().toISOString().slice(0, 10)
          const label = String(stage || 'work')
          return {
            projects: state.projects.map((p) => {
              if (p.id !== target) return p
              const log = [...(p.workLog || [])]
              const i = log.findIndex((e) => e.date === date && e.stage === label)
              if (i >= 0) {
                log[i] = {
                  ...log[i],
                  hours: Math.round((log[i].hours + minutes / 60) * 100) / 100,
                }
              } else {
                log.push({
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  date,
                  stage: label,
                  hours: Math.round((minutes / 60) * 100) / 100,
                  note: label,
                })
              }
              return { ...p, workLog: log }
            }),
          }
        }),

      /** Client discovery brief — merged project-brief + questionnaire */
      updateDiscoveryField: (fieldId, value) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              discoveryAnswers: { ...(p.discoveryAnswers || {}), [fieldId]: value },
            }
          }),
        })),

      setDiscoveryUpload: (upload) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId ? { ...p, discoveryUpload: upload } : p
          ),
        })),

      setClientPortalId: (portalId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId ? { ...p, clientPortalId: portalId } : p
          ),
        })),

      /** Snapshot of client activity already seen, keyed by portal id.
       *  Compared field-by-field to decide what's new — see clientInbox.js
       *  for why this is a content diff and not a timestamp. */
      portalSeen: {},

      /** Record a portal's activity as seen. Only ever called on an explicit
       *  open — never on a poll or a hover, so nothing silently stops being
       *  new while the user isn't looking. */
      markPortalSeen: (portalId, snapshot) =>
        set((state) => ({
          portalSeen: { ...(state.portalSeen || {}), [portalId]: snapshot },
        })),

      /** Merge answers that came from a client (portal form or an OCR'd
       *  paper form) into the project's own Define/detective answers.
       *  Only fills fields that actually have a value — never blanks
       *  something already filled in. */
      /**
       * @param {object} incoming - answers to merge
       * @param {string|number} [projectId] - the project the work STARTED on.
       *   Pass it whenever an await sits between the user's action and this
       *   call: OCR of a scanned form runs for seconds, and resolving
       *   `currentProjectId` at apply time merged a client's answers into
       *   whichever project happened to be open when it finished.
       */
      // Used by both the portal-answers review screen and the paper-scan/OCR
      // review screen. Client image attachments (`${id}Files` arrays) merge
      // additively rather than overwrite — same reasoning as
      // mergeDiscoveryAnswers below: the designer's own uploads and the
      // client's shouldn't be able to clobber each other. Inspiration images
      // also auto-pin onto the Research wall here, matching the /f/:shareId
      // path — a client attaching a look-reference via /c/:portalId gets the
      // same "the wall is where the designer actually looks" treatment
      // instead of the image sitting invisible inside a brief chapter.
      mergeDetectiveAnswers: (incoming, projectId) => {
        const inspirationFiles = Array.isArray(incoming?.inspirationLinksFiles)
          ? incoming.inspirationLinksFiles
          : []
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== (projectId ?? state.currentProjectId)) return p
            const merged = { ...(p.detective || {}) }
            Object.entries(incoming || {}).forEach(([k, v]) => {
              if (k.endsWith('Files') && Array.isArray(v)) {
                const existing = Array.isArray(merged[k]) ? merged[k] : []
                const seen = new Set(existing.map((f) => f.url))
                merged[k] = [...existing, ...v.filter((f) => !seen.has(f.url))]
                return
              }
              if (String(v || '').trim()) merged[k] = v
            })
            return { ...p, detective: merged }
          }),
        }))
        if (inspirationFiles.length) {
          const state = get()
          const target = projectId ?? state.currentProjectId
          inspirationFiles.forEach((f) => {
            get().addMoodPin({
              projectId: target,
              type: 'image',
              visual: f.url,
              note: 'From the client’s brief',
            })
          })
        }
      },

      setDiscoveryShare: (shareId, status = 'pending') =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, discoveryShareId: shareId, discoveryShareStatus: status }
              : p
          ),
        })),

      /** Bulk-merge answers the client submitted via their public link.
       *  Only fills fields the client actually answered — never blanks
       *  something the studio user already filled in.
       *
       *  Also mirrors the shared ids into `detective`. The two
       *  questionnaires are separate schemas stored under separate keys,
       *  so a client filling /f/:shareId wrote only to discoveryAnswers
       *  and the Define sheet — which reads `detective` — never showed a
       *  word of it. Mirroring is deliberately one-way and submit-only:
       *  ids are NOT renamed (detectiveBrief's header explains that
       *  renaming orphans saved answers), and a value the studio user has
       *  already entered always wins over the client's. */
      /* Takes the project id the check was started for. It used to write to
         whichever project was current when the promise resolved, which is a
         different project if the user switched while the fetch was in
         flight — and because the merge only fills blanks, one client's
         answers appearing on another client's brief would be silent. */
      mergeDiscoveryAnswers: (projectId, clientAnswers) => {
        // Images the client attached under "What look are you drawn to?" go
        // onto the Research wall, not just into the brief — a file three
        // scrolls into a chapter is invisible in practice, and the wall is
        // where the designer actually looks. Existing-asset files stay in
        // the brief only: they're the *old* identity, not new inspiration.
        const inspirationFiles = Array.isArray(clientAnswers?.inspirationLinksFiles)
          ? clientAnswers.inspirationLinksFiles
          : []
        set((state) => ({
          projects: state.projects.map((p) => {
            const target = projectId ?? state.currentProjectId
            if (p.id !== target) return p
            const merged = { ...(p.discoveryAnswers || {}) }
            Object.entries(clientAnswers || {}).forEach(([k, v]) => {
              if (String(v || '').trim()) merged[k] = v
            })
            const detective = { ...(p.detective || {}) }
            Object.entries(clientAnswers || {}).forEach(([id, incoming]) => {
              if (!DETECTIVE_FIELD_IDS.has(id)) return
              const filled = Array.isArray(incoming)
                ? incoming.length > 0
                : String(incoming || '').trim().length > 0
              if (!filled) return
              const existing = detective[id]
              // Attachment lists are additive, not a value to protect —
              // the designer's own uploads and the client's shouldn't be
              // able to clobber each other, only merge.
              if (id.endsWith('Files') && Array.isArray(incoming)) {
                const seen = new Set((existing || []).map((f) => f.url))
                detective[id] = [
                  ...(existing || []),
                  ...incoming.filter((f) => !seen.has(f.url)),
                ]
                return
              }
              const alreadySet = Array.isArray(existing)
                ? existing.length > 0
                : String(existing || '').trim().length > 0
              if (alreadySet) return
              detective[id] = incoming
            })
            // Client deadline → project.deadline (calendar) if studio empty
            const clientDeadline = String(
              clientAnswers?.projectDeadline || ''
            ).trim()
            const nextDeadline =
              clientDeadline && !String(p.deadline || '').trim()
                ? clientDeadline
                : p.deadline || ''
            if (clientDeadline && !String(detective.projectDeadline || '').trim()) {
              detective.projectDeadline = clientDeadline
            }
            return {
              ...p,
              deadline: nextDeadline,
              discoveryAnswers: merged,
              detective,
              discoveryShareStatus: 'submitted',
            }
          }),
        }))
        if (inspirationFiles.length) {
          const state = get()
          const target = projectId ?? state.currentProjectId
          inspirationFiles.forEach((f) => {
            get().addMoodPin({
              projectId: target,
              type: 'image',
              visual: f.url,
              note: 'From the client’s brief',
            })
          })
        }
      },

      /** Partial update of brand identity template fields */
      updateBrandField: (field, value) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId ? { ...p, [field]: value } : p
          ),
        })),

      /**
       * Bump designVersion vN → vN+1 (or set v2 if freeform).
       * Call before big design changes.
       */
      bumpDesignVersion: () => {
        const state = get()
        const p = state.projects.find((x) => x.id === state.currentProjectId)
        if (!p) return { ok: false }
        const cur = String(p.designVersion || 'v1').trim()
        const m = cur.match(/^v?(\d+)$/i)
        const n = m ? Number(m[1]) + 1 : 2
        const next = `v${n}`
        set({
          projects: state.projects.map((proj) =>
            proj.id === state.currentProjectId
              ? { ...proj, designVersion: next }
              : proj
          ),
        })
        // Fire-and-forget version snapshot — must not block the synchronous return
        versionService.autoVersion('version bump').then((versionId) => {
          if (versionId) {
            versionService.getVersionById(versionId).then((version) => {
              if (version) trackVersionAction('create', version)
            })
          }
        }).catch(() => {})
        return { ok: true, version: next }
      },

      /**
       * If still on v1, bump once after a major design action (kit, mark, type pair).
       * Avoids keystroke spam — only discrete intentional actions call this.
       */
      bumpDesignVersionIfV1: () => {
        const state = get()
        const p = state.projects.find((x) => x.id === state.currentProjectId)
        if (!p) return { ok: false, bumped: false }
        const cur = String(p.designVersion || 'v1').trim()
        if (!/^v?1$/i.test(cur) && cur !== '') {
          return { ok: true, bumped: false, version: cur }
        }
        const result = {...get().bumpDesignVersion(), bumped: true}
        // Fire-and-forget version snapshot — must not block the synchronous return
        versionService.autoVersion('initial version bump').then((versionId) => {
          if (versionId) {
            versionService.getVersionById(versionId).then((version) => {
              if (version) trackVersionAction('create', version)
            })
          }
        }).catch(() => {})
        return {...result, version: result.version}
      },

      /* Toggling is an explicit choice, so it pins the theme: the device is
         only followed until the user says otherwise, and then never again
         unless they reset it. */
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'warm' ? 'deep' : 'warm',
          themeSource: 'user',
        })),

      setTheme: (theme) => set({ theme, themeSource: 'user' }),

      /** Follow the OS again — used on load and on live scheme changes while
       *  the user has not pinned a theme. */
      applyDeviceTheme: () =>
        set((state) =>
          state.themeSource === 'user' ? {} : { theme: deviceTheme() }
        ),

      toggleBodyDoubling: () =>
        set((state) => ({ bodyDoubling: !state.bodyDoubling })),

      setBodyDoubling: (bodyDoubling) => set({ bodyDoubling }),

      setOnboarded: (onboarded) => set({ onboarded }),

      setPref: (key, value) =>
        set((state) => ({
          prefs: {
            soundEnabled: true,
            reduceMotion: false,
            bodyDoubleSilent: false,
            forceBreaksEnabled: true,
            queueCollapsed: true,
            showHowItWorks: false,
            ...state.prefs,
            [key]: value,
          },
        })),

      /**
       * Mirror pushWorkspace()'s image-offload results into local state so
       * the next sync sees Storage URLs instead of the original data URLs —
       * without this, every autosave would re-upload the same image bytes.
       * Also shrinks what gets persisted to localStorage.
       */
      applyImageUrlReplacements: (replacements = []) => {
        if (!Array.isArray(replacements) || !replacements.length) return
        set((state) => {
          const moodReps = new Map(
            replacements.filter((r) => r.kind === 'mood').map((r) => [r.id, r.url])
          )
          const logoReps = new Map(
            replacements
              .filter((r) => r.kind === 'logo')
              .map((r) => [r.projectId, r.url])
          )
          return {
            moodItems: moodReps.size
              ? state.moodItems.map((m) =>
                  moodReps.has(m.id) ? { ...m, visual: moodReps.get(m.id) } : m
                )
              : state.moodItems,
            projects: logoReps.size
              ? state.projects.map((p) =>
                  logoReps.has(p.id) ? { ...p, logoImage: logoReps.get(p.id) } : p
                )
              : state.projects,
          }
        })
      },

      exportAllData: () => {
        const s = get()
        return {
          version: 1,
          exportedAt: new Date().toISOString(),
          projects: s.projects,
          currentProjectId: s.currentProjectId,
          tasks: s.tasks,
          moodItems: s.moodItems,
          conceptItems: s.conceptItems || [],
          breakKit: s.breakKit || [],
          forms: s.forms || [],
          theme: s.theme,
          prefs: s.prefs,
          sparkIndex: s.sparkIndex,
          oppositeIndex: s.oppositeIndex ?? 0,
          sparksTried: s.sparksTried ?? 0,
          onboarded: s.onboarded,
          currentSpark: s.currentSpark,
          /* These are persisted by `partialize` but were missing here, so a
             cloud push or a JSON backup captured a workspace WITHOUT them and
             the matching pull/import wrote that back — silently destroying
             every saved template. Anything in `partialize` has to be in the
             payload too, or the round-trip is lossy by construction. */
          templates: s.templates || [],
          currentTemplateId: s.currentTemplateId ?? null,
          portalSeen: s.portalSeen || {},
          themeSource: s.themeSource,
        }
      },

      /**
       * Apply a workspace payload (cloud pull or import).
       * Empty / invalid payload returns { ok: false }.
       */
      hydrateFromPayload: (data) => {
        if (!data || typeof data !== 'object') {
          return { ok: false, error: 'Empty workspace' }
        }
        if (!Array.isArray(data.projects) || data.projects.length === 0) {
          return { ok: false, error: 'No projects in workspace' }
        }
        if (!Array.isArray(data.tasks)) {
          return { ok: false, error: 'No tasks in workspace' }
        }
        const projects = data.projects.map((p) => {
          const base = {
            logoDirection: '',
            palette: [...defaultProjectPalette],
            deadline: '',
            directions: blankDirections(),
            ...brandIdentityDefaults(),
            ...p,
          }
          // Merge detective so partial imports keep all keys
          base.detective = {
            ...blankDetective(),
            ...(p.detective || {}),
          }
          if (!Array.isArray(base.directions) || base.directions.length < 3) {
            base.directions = blankDirections()
          }
          if (!Array.isArray(base.roughIdeas)) {
            base.roughIdeas = []
          }
          if (!base.designVersion) base.designVersion = 'v1'
          return base
        })
        const currentProjectId =
          data.currentProjectId &&
          projects.some((p) => p.id === data.currentProjectId)
            ? data.currentProjectId
            : projects[0].id
        const sparkIndex =
          typeof data.sparkIndex === 'number' ? data.sparkIndex : 0
        const oppositeIndex =
          typeof data.oppositeIndex === 'number' ? data.oppositeIndex : 0
        const sparksTried =
          typeof data.sparksTried === 'number' ? data.sparksTried : 0
        set({
          projects: projects.map((p) => ({
            ...p,
            active: p.id === currentProjectId,
          })),
          currentProjectId,
          tasks: data.tasks,
          moodItems: Array.isArray(data.moodItems) ? data.moodItems : [],
          conceptItems: Array.isArray(data.conceptItems) ? data.conceptItems : [],
          breakKit: Array.isArray(data.breakKit) ? data.breakKit : [],
          forms: Array.isArray(data.forms) ? data.forms : [],
          theme: data.theme === 'deep' ? 'deep' : 'warm',
          // Full defaults first so payloads from older builds keep the
          // intended defaults for prefs they never knew about
          prefs: {
            ...blankWorkspaceState().prefs,
            ...(data.prefs || {}),
          },
          sparkIndex,
          oppositeIndex,
          sparksTried,
          currentSpark:
            data.currentSpark ||
            sparkPrompts[sparkIndex % sparkPrompts.length] ||
            sparkPrompts[0],
          onboarded: data.onboarded !== false,
          bodyDoubling: false,
          /* Restored defensively: a payload written by an older build has no
             these keys at all, and reading `undefined` back into the store
             would wipe what the user has locally. Absent means "keep what we
             have", not "the user deleted them". */
          ...(Array.isArray(data.templates) ? { templates: data.templates } : {}),
          ...(data.currentTemplateId !== undefined
            ? { currentTemplateId: data.currentTemplateId }
            : {}),
          ...(data.portalSeen && typeof data.portalSeen === 'object'
            ? { portalSeen: data.portalSeen }
            : {}),
          ...(data.themeSource === 'auto' || data.themeSource === 'user'
            ? { themeSource: data.themeSource }
            : {}),
        })
        return { ok: true }
      },

      /**
       * Restore a JSON backup from exportAllData.
       * Returns { ok: true } or { ok: false, error: string }.
       */
      importAllData: (raw) => {
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw
          return get().hydrateFromPayload(data)
        } catch {
          // Deliberately swallow the parser's own message. `JSON.parse` throws
          // things like "Unexpected token '<' ... is not valid JSON", which
          // names an internal format and a character offset — it reads as a
          // verdict on the user rather than on the file, and it tells them
          // nothing they can act on. Callers fall back to their own plain
          // wording ("Could not import that file"), localised.
          return { ok: false }
        }
      },

      renameProject: (id, name) => {
        const next = String(name || '').trim()
        if (!next) return
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name: next } : p
          ),
        }))
      },

      /** Delete a project and its tasks/pins. Keeps at least one project. */
      deleteProject: (id) => {
        const { projects, tasks, moodItems, conceptItems, currentProjectId } =
          get()
        if (projects.length <= 1) {
          return { ok: false, error: 'Keep at least one project' }
        }
        const remaining = projects.filter((p) => p.id !== id)
        if (remaining.length === projects.length) {
          return { ok: false, error: 'Project not found' }
        }
        const nextId =
          currentProjectId === id
            ? (remaining.find((p) => !p.archived) || remaining[0]).id
            : currentProjectId
        set({
          projects: remaining.map((p) => ({
            ...p,
            active: p.id === nextId,
          })),
          currentProjectId: nextId,
          tasks: tasks.filter((t) => t.projectId !== id),
          moodItems: moodItems.filter((m) => m.projectId !== id),
          conceptItems: (conceptItems || []).filter((c) => c.projectId !== id),
        })
        return { ok: true }
      },

      /** Soft-archive: hide from default lists, keep data. */
      archiveProject: (id) => {
        const { projects, currentProjectId } = get()
        const activeList = projects.filter((p) => !p.archived)
        if (activeList.length <= 1 && activeList[0]?.id === id) {
          return { ok: false, error: 'Keep at least one active project' }
        }
        const target = projects.find((p) => p.id === id)
        if (!target) return { ok: false, error: 'Project not found' }
        let nextId = currentProjectId
        if (currentProjectId === id) {
          nextId =
            projects.find((p) => p.id !== id && !p.archived)?.id ||
            projects.find((p) => p.id !== id)?.id
        }
        set({
          projects: projects.map((p) =>
            p.id === id
              ? { ...p, archived: true, active: false }
              : { ...p, active: p.id === nextId }
          ),
          currentProjectId: nextId,
        })
        return { ok: true }
      },

      unarchiveProject: (id) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, archived: false } : p
          ),
        }))
        return { ok: true }
      },

      clearAllData: () => {
        const blank = blankWorkspaceState()
        set({ ...blank, onboarded: false })
        try {
          localStorage.removeItem('cc-hide-howto')
          localStorage.removeItem('cc-onboarded')
          localStorage.removeItem('cc-desk')
        } catch {
          /* ignore */
        }
      },

      clearToEmpty: () => {
        const blank = blankWorkspaceState()
        set({
          ...blank,
          onboarded: true,
          projects: blank.projects.map((p) => ({
            ...p,
            name: 'My project',
          })),
        })
      },

      setTasks: (tasks) => set({ tasks }),

      addTask: (task) =>
        set((state) => ({ tasks: [task, ...state.tasks] })),

      toggleTask: (id) =>
        set((state) => {
          const updated = state.tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          )
          // Keep open work first, completed at the bottom
          const open = updated.filter((t) => !t.completed)
          const done = updated.filter((t) => t.completed)
          return { tasks: [...open, ...done] }
        }),

      /**
       * Reorder a set of open tasks to a specific sequence (Sketch Focus
       * Mode's 1-2-3 priority ranking) — everything not in orderedIds
       * keeps its existing relative order, appended after.
       */
      reorderOpenTasks: (orderedIds) =>
        set((state) => {
          const rank = new Map(orderedIds.map((id, i) => [id, i]))
          const ranked = state.tasks
            .filter((t) => rank.has(t.id))
            .sort((a, b) => rank.get(a.id) - rank.get(b.id))
          const rest = state.tasks.filter((t) => !rank.has(t.id))
          return { tasks: [...ranked, ...rest] }
        }),

      updateTaskTitle: (id, title) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, title: title.trim() || t.title } : t
          ),
        })),

      /** Status tag shown under a desk step (energy, source) — not the why */
      updateTaskMeta: (id, meta) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, meta: String(meta || '') } : t
          ),
        })),

      /** One-line "why it fits the goal" — distinct from meta's auto-tags */
      updateTaskWhy: (id, why) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, why: String(why || '') } : t
          ),
        })),

      setTaskDueDate: (id, dueDate) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, dueDate: dueDate || '' } : t
          ),
        })),

      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id && t.parentId !== id),
        })),

      breakIntoSteps: (taskId) => {
        const { tasks, currentProjectId } = get()
        const task = tasks.find((t) => t.id === taskId)
        if (!task) return
        const short =
          task.title.slice(0, 40) + (task.title.length > 40 ? '...' : '')
        const steps = [
          `Name the one feeling "${short}" must land (1 sentence)`,
          `Gather 3–5 refs that match that feeling (mood board)`,
          `Do a 15‑min messy first pass on "${short}" — ugly OK`,
        ]
        const newItems = steps.map((title, i) => ({
          id: Date.now() + i + 1,
          title,
          energy: 'low',
          meta: `Micro-step · from task`,
          completed: false,
          seeded: false,
          projectId: task.projectId ?? currentProjectId,
          parentId: taskId,
        }))
        // Parent moves to completed so micro-steps become the work queue
        const rest = tasks
          .filter((t) => t.id !== taskId)
          .map((t) => t)
        const parentDone = {
          ...task,
          completed: true,
          meta: 'Replaced by micro-steps',
        }
        set({
          tasks: [...newItems, ...rest.filter((t) => !t.completed), parentDone, ...rest.filter((t) => t.completed)],
        })
      },

      /** Add a batch of micro-steps for the active project (ADHD project breakdown) */
      addMicroStepsBatch: ({ steps, energy = 'low', goalLabel = '' }) => {
        const { currentProjectId, tasks, prefs } = get()
        const stamp = Date.now()
        const newItems = (steps || [])
          .map((title) => String(title || '').trim())
          .filter(Boolean)
          .map((title, i) => ({
            id: stamp + i + 1,
            title,
            energy,
            meta: goalLabel
              ? `Micro-step · ${goalLabel.slice(0, 32)}`
              : 'Micro-step · project breakdown',
            completed: false,
            seeded: false,
            projectId: currentProjectId,
            parentId: null,
            fromBreakdown: true,
          }))
        if (!newItems.length) return 0
        set({
          tasks: [...newItems, ...tasks],
          prefs: {
            ...prefs,
            queueCollapsed: true,
          },
        })
        return newItems.length
      },

      addMoodPin: (pin) =>
        set((state) => {
          const projectId = pin.projectId ?? state.currentProjectId
          const starred = (state.moodItems || []).filter(
            (m) =>
              m.inPack && (m.projectId == null || m.projectId === projectId)
          )
          const inPack = !!pin.inPack
          const shift = pin.boardOrder == null
          const newPin = {
            ...pin,
            id: pin.id || Date.now(),
            projectId,
            note: pin.note || '',
            inPack,
            boardOrder: pin.boardOrder != null ? pin.boardOrder : 0,
            packOrder:
              pin.packOrder != null
                ? pin.packOrder
                : inPack
                  ? starred.length
                  : 0,
            packHero: !!pin.packHero,
          }
          return {
            moodItems: [
              newPin,
              ...state.moodItems.map((m) => {
                if (!shift) return m
                if (m.projectId != null && m.projectId !== projectId) return m
                return { ...m, boardOrder: (m.boardOrder ?? 0) + 1 }
              }),
            ],
          }
        }),

      updateMoodPinNote: (id, note) =>
        set((state) => ({
          moodItems: state.moodItems.map((m) =>
            m.id === id ? { ...m, note } : m
          ),
        })),

      /** Reposition which part of an image pin shows through the cropped
       * tile/pack thumbnails (0-100 percentages, CSS background-position). */
      setMoodPinFocal: (id, focalX, focalY) =>
        set((state) => ({
          moodItems: state.moodItems.map((m) =>
            m.id === id ? { ...m, focalX, focalY } : m
          ),
        })),

      /**
       * Canvas geometry for one pin: position, size and stacking order.
       *
       * Additive and optional — a pin with no `x`/`y` has simply never been
       * moved, and the canvas auto-places it from `boardOrder`. That is what
       * makes this safe to add to boards that already exist, and it is also
       * the rule that keeps the canvas decision-free: arriving pins land
       * somewhere sensible, so arranging is something you may do, never
       * something you must do before you can work.
       *
       * @param {object} patch - any of { x, y, w, h, z }
       */
      setMoodPinLayout: (id, patch = {}) =>
        set((state) => ({
          moodItems: state.moodItems.map((m) =>
            m.id === id ? { ...m, ...patch } : m
          ),
        })),

      /** Raise a pin above every other pin in its own project. Scoped per
       *  project so one busy board cannot inflate z for the others. */
      bringMoodPinToFront: (id) =>
        set((state) => {
          const pin = (state.moodItems || []).find((m) => m.id === id)
          if (!pin) return {}
          const projectId = pin.projectId ?? state.currentProjectId
          const top = (state.moodItems || []).reduce((max, m) => {
            const same = m.projectId == null || m.projectId === projectId
            return same ? Math.max(max, m.z ?? 0) : max
          }, 0)
          if ((pin.z ?? 0) === top && top > 0) return {}
          return {
            moodItems: state.moodItems.map((m) =>
              m.id === id ? { ...m, z: top + 1 } : m
            ),
          }
        }),

      /** Drop a pin behind every other pin in its project. Uses a floor of 0
       *  rather than negative z so nothing can slip behind the canvas itself. */
      sendMoodPinToBack: (id) =>
        set((state) => {
          const pin = (state.moodItems || []).find((m) => m.id === id)
          if (!pin) return {}
          const projectId = pin.projectId ?? state.currentProjectId
          const scoped = (state.moodItems || []).filter(
            (m) => m.projectId == null || m.projectId === projectId
          )
          const bottom = scoped.reduce((min, m) => Math.min(min, m.z ?? 0), 0)
          return {
            moodItems: state.moodItems.map((m) => {
              if (m.id === id) return { ...m, z: bottom }
              const same = m.projectId == null || m.projectId === projectId
              return same ? { ...m, z: (m.z ?? 0) + 1 } : m
            }),
          }
        }),

      /**
       * Star/unstar a pin for the brand pack (max 6 per project).
       * @returns {{ ok: boolean, error?: string, inPack?: boolean }}
       */
      toggleMoodPinInPack: (id) => {
        const state = get()
        const pin = (state.moodItems || []).find((m) => m.id === id)
        if (!pin) return { ok: false, error: 'Pin not found' }
        const projectId = pin.projectId ?? state.currentProjectId
        if (pin.inPack) {
          const remaining = (state.moodItems || [])
            .filter(
              (m) =>
                m.id !== id &&
                m.inPack &&
                (m.projectId == null || m.projectId === projectId)
            )
            .sort((a, b) => (a.packOrder ?? 0) - (b.packOrder ?? 0))
          set({
            moodItems: state.moodItems.map((m) => {
              if (m.id === id) {
                return { ...m, inPack: false, packHero: false, packOrder: 0 }
              }
              const idx = remaining.findIndex((r) => r.id === m.id)
              if (idx >= 0) return { ...m, packOrder: idx }
              return m
            }),
          })
          return { ok: true, inPack: false }
        }
        const starred = (state.moodItems || []).filter(
          (m) =>
            m.inPack &&
            (m.projectId == null || m.projectId === projectId)
        )
        if (starred.length >= 6) {
          return { ok: false, error: 'Leave-behind is full (6 pins max)' }
        }
        set({
          moodItems: state.moodItems.map((m) =>
            m.id === id
              ? {
                  ...m,
                  inPack: true,
                  packOrder: starred.length,
                  packHero: starred.length === 0,
                }
              : m
          ),
        })
        return { ok: true, inPack: true }
      },

      /** Reorder starred pack pins; orderedIds = full starred list in new order */
      reorderPackPins: (orderedIds) => {
        const ids = (orderedIds || []).map(String)
        set((state) => {
          const heroId = (state.moodItems || []).find((m) => m.packHero)?.id
          return {
            moodItems: state.moodItems.map((m) => {
              const idx = ids.indexOf(String(m.id))
              if (idx < 0) return m
              return {
                ...m,
                inPack: true,
                packOrder: idx,
                // keep hero if still in list; else first becomes hero
                packHero: heroId
                  ? m.id === heroId
                  : idx === 0,
              }
            }),
          }
        })
        return { ok: true }
      },

      setPackHeroPin: (id) => {
        const state = get()
        const pin = (state.moodItems || []).find((m) => m.id === id)
        if (!pin?.inPack) return { ok: false, error: 'Star pin for pack first' }
        set({
          moodItems: state.moodItems.map((m) => ({
            ...m,
            packHero: m.id === id,
          })),
        })
        return { ok: true }
      },

      /**
       * Reorder all mood pins for a project (board grid order).
       * orderedIds = full list of pin ids in new visual order (project pins only).
       */
      reorderBoardPins: (orderedIds, projectId) => {
        const ids = (orderedIds || []).map(String)
        const pid = projectId ?? get().currentProjectId
        set((state) => {
          const mine = (state.moodItems || []).filter(
            (m) => m.projectId == null || m.projectId === pid
          )
          const others = (state.moodItems || []).filter(
            (m) => m.projectId != null && m.projectId !== pid
          )
          // Preserve any pin not in orderedIds at end
          const ordered = ids
            .map((id) => mine.find((m) => String(m.id) === id))
            .filter(Boolean)
          const leftover = mine.filter((m) => !ids.includes(String(m.id)))
          const nextMine = [...ordered, ...leftover].map((m, i) => ({
            ...m,
            boardOrder: i,
          }))
          return { moodItems: [...nextMine, ...others] }
        })
        return { ok: true }
      },

      movePackPin: (id, direction) => {
        const state = get()
        const pin = (state.moodItems || []).find((m) => m.id === id)
        if (!pin?.inPack) return { ok: false }
        const projectId = pin.projectId ?? state.currentProjectId
        const starred = (state.moodItems || [])
          .filter(
            (m) =>
              m.inPack && (m.projectId == null || m.projectId === projectId)
          )
          .sort((a, b) => (a.packOrder ?? 0) - (b.packOrder ?? 0))
        const idx = starred.findIndex((m) => m.id === id)
        if (idx < 0) return { ok: false }
        const swapWith = direction === 'up' ? idx - 1 : idx + 1
        if (swapWith < 0 || swapWith >= starred.length) return { ok: false }
        const ids = starred.map((m) => m.id)
        ;[ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]]
        get().reorderPackPins(ids)
        return { ok: true }
      },

      setColorRole: (role, hex) => {
        const key = String(role || '')
        if (!['cover', 'text', 'accent', 'quiet'].includes(key)) {
          return { ok: false, error: 'Unknown role' }
        }
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            return {
              ...p,
              colorRoles: {
                ...(p.colorRoles || {}),
                [key]: hex,
              },
            }
          }),
        }))
        return { ok: true }
      },

      setLogoImage: (dataUrl) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, logoImage: dataUrl || '' }
              : p
          ),
        })),

      removeMoodPin: (id) =>
        set((state) => ({
          moodItems: state.moodItems.filter((m) => m.id !== id),
        })),

      setMoodItems: (moodItems) => set({ moodItems }),

      // ——— Concept pipeline (sketches → develop → iterate → lock → package) ———

      addConceptItem: (item) =>
        set((state) => ({
          conceptItems: [
            {
              id: item.id || Date.now() + Math.random(),
              projectId: item.projectId ?? state.currentProjectId,
              stage: item.stage || 'sketch',
              visual: item.visual || '',
              title: item.title || '',
              note: item.note || '',
              stepId: item.stepId || null,
              parentId: item.parentId || null,
              createdAt: item.createdAt || new Date().toISOString(),
            },
            ...(state.conceptItems || []),
          ],
        })),

      updateConceptItem: (id, patch) =>
        set((state) => ({
          conceptItems: (state.conceptItems || []).map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        })),

      removeConceptItem: (id) =>
        set((state) => ({
          conceptItems: (state.conceptItems || []).filter(
            (c) => c.id !== id && c.parentId !== id
          ),
        })),

      /** Move sketch into develop lane */
      selectSketchToDevelop: (id) =>
        set((state) => ({
          conceptItems: (state.conceptItems || []).map((c) =>
            c.id === id ? { ...c, stage: 'develop' } : c
          ),
        })),

      /** Lock idea into concept plan */
      lockConceptItem: (id, planNote = '') =>
        set((state) => ({
          conceptItems: (state.conceptItems || []).map((c) =>
            c.id === id
              ? {
                  ...c,
                  stage: 'locked',
                  note: planNote?.trim() ? planNote.trim() : c.note,
                }
              : c
          ),
        })),

      updateConceptPackageField: (field, value) =>
        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== state.currentProjectId) return p
            const pack = {
              audience: '',
              outcome: '',
              concept: '',
              voice: '',
              visualDirection: '',
              doUse: '',
              dontUse: '',
              notes: '',
              ...(p.conceptPackage || {}),
              [field]: value,
            }
            return { ...p, conceptPackage: pack }
          }),
        })),

      /**
       * Apply concept package + locked notes into Brand identity fields.
       * Returns patch summary for toast/UI.
       */
      applyConceptPackageToBrand: () => {
        const { projects, currentProjectId, conceptItems } = get()
        const project = projects.find((p) => p.id === currentProjectId)
        if (!project) return { ok: false, error: 'No project' }

        const draft = {
          audience: '',
          outcome: '',
          concept: '',
          voice: '',
          visualDirection: '',
          doUse: '',
          dontUse: '',
          notes: '',
          ...(project.conceptPackage || {}),
        }
        const locked = (conceptItems || []).filter(
          (c) =>
            c.projectId === currentProjectId &&
            (c.stage === 'locked' || c.stage === 'develop')
        )

        const briefParts = []
        if (draft.audience?.trim())
          briefParts.push(`Audience: ${draft.audience.trim()}`)
        if (draft.outcome?.trim())
          briefParts.push(`Outcome: ${draft.outcome.trim()}`)
        if (draft.notes?.trim()) briefParts.push(draft.notes.trim())
        const lockedLines = locked
          .map((c) => c.note || c.title)
          .filter(Boolean)
          .slice(0, 10)
        if (lockedLines.length) {
          briefParts.push(`Concept plan: ${lockedLines.join(' · ')}`)
        }

        const nextBrief =
          briefParts.join('\n\n') || project.brief || ''

        set((state) => ({
          projects: state.projects.map((p) => {
            if (p.id !== currentProjectId) return p
            return {
              ...p,
              brief: nextBrief,
              tagline: draft.concept?.trim() || p.tagline || '',
              voice: draft.voice?.trim() || p.voice || '',
              logoDirection:
                draft.visualDirection?.trim() || p.logoDirection || '',
              doUse: draft.doUse?.trim() || p.doUse || '',
              dontUse: draft.dontUse?.trim() || p.dontUse || '',
            }
          }),
        }))
        return { ok: true }
      },

      nextSpark: () =>
        set((state) => {
          const next = (state.sparkIndex + 1) % sparkPrompts.length
          return {
            sparkIndex: next,
            sparksTried: (state.sparksTried || 0) + 1,
            currentSpark: sparkPrompts[next],
          }
        }),

      /**
       * Ideate: opposite-direction prompt. Separate oppositeIndex wrap;
       * does not pollute sparkIndex. sparksTried bumps for energy UI only.
       */
      oppositeSpark: () =>
        set((state) => {
          const oi = ((state.oppositeIndex ?? 0) + 1) % oppositeSparks.length
          return {
            oppositeIndex: oi,
            sparksTried: (state.sparksTried || 0) + 1,
            currentSpark: oppositeSparks[oi],
          }
        }),

      createNewProject: (name = 'My project', brief = '') => {
        const project = createBlankProject(
          name || 'My project',
          brief || ''
        )
        get().addProject(project)
        return project
      },

      // selectors helpers used via get in components
      getActiveProject: () => {
        const { projects, currentProjectId } = get()
        return projects.find((p) => p.id === currentProjectId)
      },
    }),
    {
      name: 'creative-companion-storage',
      /* Wrapped so a full localStorage cannot fail silently. The store
         persists as ONE blob, so a write that throws QuotaExceededError does
         not just lose the pin that overflowed it — the brief, the tasks and
         every project stop saving too, with no error anywhere and no sign
         until a reload shows the work gone. Images are the only realistic way
         to fill it (see MAX_STORED_IMAGE_DIM), so the message names them. */
      storage: {
        getItem: (key) => {
          try {
            const value = localStorage.getItem(key)
            return value ? JSON.parse(value) : null
          } catch {
            return null
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, JSON.stringify(value))
          } catch (err) {
            const quota =
              err?.name === 'QuotaExceededError' ||
              err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
              err?.code === 22
            console.error(
              quota
                ? '[store] Browser storage is full — changes are NOT being saved. Remove some mood board images.'
                : '[store] Could not save to browser storage.',
              err
            )
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('cc-storage-error', { detail: { quota } })
              )
            }
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key)
          } catch {
            /* nothing to remove */
          }
        },
      },
      version: 5,
      migrate: (persisted, fromVersion) => {
        // Keep real user data; only normalize missing arrays
        if (!persisted || typeof persisted !== 'object') {
          return blankWorkspaceState()
        }
        const blank = blankWorkspaceState()
        let moodItems = Array.isArray(persisted.moodItems)
          ? persisted.moodItems
          : []
        // v4: ensure boardOrder for stable board drag (old pins lacked it)
        if (fromVersion < 4 && moodItems.length) {
          const byProject = new Map()
          moodItems.forEach((m) => {
            const pid = m.projectId ?? '_none'
            if (!byProject.has(pid)) byProject.set(pid, [])
            byProject.get(pid).push(m)
          })
          const next = []
          byProject.forEach((list) => {
            list.forEach((m, i) => {
              next.push({
                ...m,
                boardOrder: m.boardOrder != null ? m.boardOrder : i,
              })
            })
          })
          moodItems = next
        }
        return {
          ...blank,
          ...persisted,
          // Deep-merge so prefs added after the workspace was first persisted
          // (helperQuiet, hideTips, toastMode...) keep their intended defaults
          prefs: { ...blank.prefs, ...(persisted.prefs || {}) },
          tasks: Array.isArray(persisted.tasks) ? persisted.tasks : [],
          moodItems,
          conceptItems: Array.isArray(persisted.conceptItems)
            ? persisted.conceptItems
            : [],
          breakKit: Array.isArray(persisted.breakKit)
            ? persisted.breakKit
            : [],
          projects:
            Array.isArray(persisted.projects) && persisted.projects.length
              ? persisted.projects.map((p) => ({
                  ...p,
                  /* v5: the work clock used to write into `timeLog`, the
                     array the invoice bills from. Lift those measured rows
                     out into the private `workLog` where they belong — an
                     invoice should contain only what was entered by hand. */
                  timeLog: (Array.isArray(p.timeLog) ? p.timeLog : []).filter(
                    (e) => !e?.auto
                  ),
                  workLog: [
                    ...(Array.isArray(p.workLog) ? p.workLog : []),
                    ...(Array.isArray(p.timeLog) ? p.timeLog : []).filter(
                      (e) => e?.auto
                    ),
                  ],
                  decisionLog: Array.isArray(p.decisionLog) ? p.decisionLog : [],
                  directions:
                    Array.isArray(p.directions) && p.directions.length >= 3
                      ? p.directions
                      : blankDirections(),
                }))
              : blank.projects,
        }
      },
      partialize: (state) => pickPersisted(state),
      onRehydrateStorage: () => (state) => {
        try {
          if (!state) return
          const onboardFlag = localStorage.getItem('cc-onboarded')
          if (onboardFlag === '1') state.onboarded = true
          if (!state.portalSeen || typeof state.portalSeen !== 'object') state.portalSeen = {}
          if (!Array.isArray(state.tasks)) state.tasks = []
          /* An invoice must never contain a row nobody typed. The v5 migration
             lifts measured rows out of `timeLog`, but a migration runs once —
             it cannot hold an invariant, only establish it. Any auto row that
             appears in `timeLog` afterwards (a stale tab still running the old
             writer, a synced payload from an older client) would sit there
             permanently, billable. So this is checked on every load. */
          /* Applied with setState rather than by assigning to `state`, so it
             both takes effect and is written back to storage. Mutating the
             rehydrated draft leaves the stored copy untouched: the row comes
             back on the next load, and any later write persists it again. */
          queueMicrotask(() => {
            const cur = useAppStore.getState().projects
            if (!Array.isArray(cur)) return
            const next = liftMeasuredRows(cur)
            if (next !== cur) useAppStore.setState({ projects: next })
          })
          if (!Array.isArray(state.moodItems)) state.moodItems = []
          if (!Array.isArray(state.conceptItems)) state.conceptItems = []
          if (!Array.isArray(state.breakKit)) state.breakKit = []
          // Normalize boardOrder for pins that predate board drag
          if (state.moodItems?.length) {
            const byProject = new Map()
            state.moodItems.forEach((m) => {
              const pid = m.projectId ?? '_none'
              if (!byProject.has(pid)) byProject.set(pid, [])
              byProject.get(pid).push(m)
            })
            const next = []
            byProject.forEach((list) => {
              list.forEach((m, i) => {
                next.push({
                  ...m,
                  boardOrder: m.boardOrder != null ? m.boardOrder : i,
                })
              })
            })
            state.moodItems = next
          }
          if (!Array.isArray(state.projects) || !state.projects.length) {
            const blank = blankWorkspaceState()
            state.projects = blank.projects
            state.currentProjectId = blank.currentProjectId
          }
          // Legacy bridge from earlier cc-desk shape (real user data only).
          // One-time: never clobber projects the new store already has.
          const legacy = localStorage.getItem('cc-desk')
          if (!legacy) return
          const data = JSON.parse(legacy)
          if (Array.isArray(data.tasks) && data.tasks.length && !state.tasks?.length) {
            state.tasks = data.tasks
          }
          if (Array.isArray(data.moodItems) && data.moodItems.length && !state.moodItems?.length) {
            state.moodItems = data.moodItems
          }
          const hasRealProjects = (state.projects || []).some(
            (p) =>
              (p.name && p.name !== 'My project') ||
              String(p.brief || '').trim() ||
              (Array.isArray(p.decisionLog) && p.decisionLog.length > 0)
          )
          if (
            Array.isArray(data.projects) &&
            data.projects.length &&
            !hasRealProjects
          ) {
            state.projects = data.projects.map((p) => ({
              logoDirection: '',
              ...brandIdentityDefaults(),
              ...p,
            }))
            if (data.activeProjectId) state.currentProjectId = data.activeProjectId
          }
        } catch {
          /* ignore */
        }
      },
      // Template Management
      saveAsTemplate: (name, description = '') => {
        const state = get()
        const { currentProjectId, projects } = state

        if (!currentProjectId) return { ok: false, error: 'No active project' }

        const project = projects.find(p => p.id === currentProjectId)
        if (!project) return { ok: false, error: 'Project not found' }

        // Create template from current project state
        const template = {
          id: `template-${Date.now()}`,
          name,
          description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Store the essential design elements that make up a template
          data: {
            tagline: project.tagline,
            voice: project.voice,
            typeHeading: project.typeHeading,
            typeBody: project.typeBody,
            logoWordmark: project.logoWordmark,
            logoDirection: project.logoDirection,
            // Omit binary mark from templates (localStorage quota)
            logoImage: '',
            logoClearspace: project.logoClearspace,
            logoMinSize: project.logoMinSize,
            logoDonts: project.logoDonts,
            palette: [...project.palette],
            colorRoles: project.colorRoles ? { ...project.colorRoles } : null,
            messagingPromise: project.messagingPromise,
            messagingProof: project.messagingProof,
            messagingPersonality: project.messagingPersonality,
            imageryStyle: project.imageryStyle,
            imageryDo: project.imageryDo,
            imageryDont: project.imageryDont,
            /* House style travels with the template. A studio that sets
               sentence case and a preferred stock once should not re-set them
               on every project started from this template. */
            writingCase: project.writingCase,
            writingCaps: project.writingCaps,
            writingNotes: project.writingNotes,
            printPantone: project.printPantone,
            printStock: project.printStock,
            printFinish: project.printFinish,
            // Full detective clone (no hand-whitelist) — required fields + spectra
            detective: project.detective
              ? {
                  ...blankDetective(),
                  ...JSON.parse(JSON.stringify(project.detective)),
                }
              : null,
            conceptPackage: project.conceptPackage ? {
              audience: project.conceptPackage.audience,
              outcome: project.conceptPackage.outcome,
              concept: project.conceptPackage.concept,
              voice: project.conceptPackage.voice,
              visualDirection: project.conceptPackage.visualDirection,
              doUse: project.conceptPackage.doUse,
              dontUse: project.conceptPackage.dontUse,
              notes: project.conceptPackage.notes
            } : null,
            directions: project.directions ? [...project.directions].map(d => ({ ...d })) : [],
            tasks: project.tasks ? [...project.tasks].map(t => ({ ...t })) : [],
            moodItems: project.moodItems ? [...project.moodItems].map(m => ({ ...m })) : []
          }
        }

        set(state => ({
          templates: [...state.templates, template]
        }))

        return { ok: true, templateId: template.id }
      },

      getTemplates: () => {
        const state = get()
        return [...state.templates].sort((a, b) =>
          new Date(b.updatedAt) - new Date(a.updatedAt)
        )
      },

      getTemplateById: (templateId) => {
        const state = get()
        return state.templates.find(t => t.id === templateId) || null
      },

      updateTemplate: (templateId, updates) => {
        set(state => ({
          templates: state.templates.map(template =>
            template.id === templateId
              ? { ...template, ...updates, updatedAt: new Date().toISOString() }
              : template
          )
        }))
        return { ok: true }
      },

      deleteTemplate: (templateId) => {
        set(state => ({
          templates: state.templates.filter(t => t.id !== templateId)
        }))
        return { ok: true }
      },

      applyTemplate: async (templateId) => {
        const state = get()
        const template = state.templates.find(t => t.id === templateId)
        if (!template) return { ok: false, error: 'Template not found' }

        const { currentProjectId, projects } = state
        if (!currentProjectId) return { ok: false, error: 'No active project' }

        // Apply template data to current project
        set(state => ({
          projects: state.projects.map(project =>
            project.id === currentProjectId
              ? {
                  ...project,
                  ...template.data,
                  // Increment version when applying template
                  designVersion: `v${parseInt(project.designVersion.replace('v', '')) + 1}`
                }
              : project
          )
        }))

        // Create a version when applying template
        const versionId = await versionService.autoVersion('template-applied')
        // Track version creation
        if (versionId) {
          const version = await versionService.getVersionById(versionId)
          if (version) {
            trackVersionAction('create', version)
          }
        }

        return { ok: true }
      },

      setCurrentTemplateId: (templateId) => {
        set({ currentTemplateId: templateId })
        return { ok: true }
      }
    }
  )
)

export default useAppStore
