// Version Service for managing project versions and diffing capabilities
import useAppStore from '../store/useAppStore'
import { buildColorSystem } from '../lib/brandSystem'

/**
 * PHASE 4A — Project Identity Version.
 *
 * A Project Version is an immutable recovery snapshot of Identity-owned
 * design decisions for one project. It is not a Brief, Research, Direction,
 * task, package, Brand Book, Presentation, or published-Identity snapshot.
 *
 * Restore overlays these fields onto the current project through the
 * canonical Identity writers. It never replaces the whole project.
 *
 * Retention: local history is still capped at `maxVersionsPerProject` (24).
 * Raising or removing that cap is a product decision, not part of this slice.
 */

/** Fields a newly created Project Version stores and restore may write. */
export const PROJECT_VERSION_SNAPSHOT_KEYS = Object.freeze([
  'tagline',
  'positioning',
  'voice',
  'doUse',
  'typeHeading',
  'typeBody',
  'typeWhy',
  'typeSource',
  'typeLicenceNote',
  'fontFilesLicensed',
  'logoWordmark',
  'logoDirection',
  'logoClearspace',
  'logoMinSize',
  'logoDonts',
  'logoClientChose',
  'chosenMarkConceptId',
  'currentPaletteRef',
  'currentTypePairingRef',
  'palette',
  'paletteTokens',
  'colorRoles',
  'colorRoleWhy',
  'messagingPromise',
  'messagingProof',
  'messagingPersonality',
  'imageryStyle',
  'imageryDo',
  'imageryDont',
])

/**
 * Keys that older stored Versions may still carry. Restore must not crash
 * when they are present, and must not apply them.
 */
export const PROJECT_VERSION_LEGACY_IGNORE_KEYS = Object.freeze([
  'detective',
  'directions',
  'tasks',
  'brief',
  'deadline',
  'logoImage',
])

const IDENTITY_STRING_FIELDS = Object.freeze([
  'tagline',
  'positioning',
  'voice',
  'doUse',
  'typeWhy',
  'typeSource',
  'typeLicenceNote',
  'logoWordmark',
  'logoClearspace',
  'logoMinSize',
  'logoDonts',
  'logoClientChose',
  /* logoDirection is applied after mark choose so it cannot write onto
     the previously chosen concept before the star moves. */
  'messagingPromise',
  'messagingProof',
  'messagingPersonality',
  'imageryStyle',
  'imageryDo',
  'imageryDont',
])

function copyJson(value) {
  if (value == null || typeof value !== 'object') return value
  return JSON.parse(JSON.stringify(value))
}

function hasOwn(data, key) {
  return !!data && Object.hasOwn(data, key) && data[key] !== undefined
}

/** A real mark image — not empty, not the historical quota sentinel. */
export function isUsableLegacyMarkImage(value) {
  const s = String(value ?? '').trim()
  return !!s && !s.startsWith('[')
}

function chosenMarkConceptIdOf(project) {
  const hit = (project?.logoConcepts || []).find((c) => c?.chosen)
  return hit?.id ? String(hit.id) : ''
}

/**
 * Identity payload for a new Project Version. Deep-copied so later live
 * edits cannot mutate the saved record.
 */
export function buildProjectVersionData(project) {
  if (!project) return {}
  const ref = (value) =>
    value && typeof value === 'object' && value.kind && value.id
      ? { kind: value.kind, id: value.id }
      : null
  return {
    tagline: project.tagline ?? '',
    positioning: project.positioning ?? '',
    voice: project.voice ?? '',
    doUse: project.doUse ?? '',
    typeHeading: project.typeHeading ?? '',
    typeBody: project.typeBody ?? '',
    typeWhy: project.typeWhy ?? '',
    typeSource: project.typeSource ?? '',
    typeLicenceNote: project.typeLicenceNote ?? '',
    fontFilesLicensed: !!project.fontFilesLicensed,
    logoWordmark: project.logoWordmark ?? '',
    logoDirection: project.logoDirection ?? '',
    logoClearspace: project.logoClearspace ?? '',
    logoMinSize: project.logoMinSize ?? '',
    logoDonts: project.logoDonts ?? '',
    logoClientChose: project.logoClientChose ?? '',
    chosenMarkConceptId: chosenMarkConceptIdOf(project),
    currentPaletteRef: copyJson(ref(project.currentPaletteRef)),
    currentTypePairingRef: copyJson(ref(project.currentTypePairingRef)),
    palette: Array.isArray(project.palette) ? copyJson(project.palette) : [],
    paletteTokens: Array.isArray(project.paletteTokens)
      ? copyJson(project.paletteTokens)
      : [],
    colorRoles: project.colorRoles ? copyJson(project.colorRoles) : null,
    colorRoleWhy: project.colorRoleWhy ? copyJson(project.colorRoleWhy) : null,
    messagingPromise: project.messagingPromise ?? '',
    messagingProof: project.messagingProof ?? '',
    messagingPersonality: project.messagingPersonality ?? '',
    imageryStyle: project.imageryStyle ?? '',
    imageryDo: project.imageryDo ?? '',
    imageryDont: project.imageryDont ?? '',
  }
}

/** Map autoVersion changeType → short kind for the History list. */
export function versionKindFromChangeType(changeType = '') {
  const t = String(changeType || '').toLowerCase()
  if (t.includes('hourly')) return 'hourly'
  if (t.includes('template')) return 'template'
  if (t.includes('bump') || t.includes('version')) return 'bump'
  return 'save'
}

/** Human label for a version kind (no clocks). */
export function versionKindLabel(kind) {
  switch (kind) {
    case 'hourly':
      return 'Hourly save'
    case 'template':
      return 'Template'
    case 'bump':
      return 'Bump'
    default:
      return 'Save'
  }
}

/**
 * Glanceable identity snapshot for History cards — what you'd get if you restore.
 * Words and colour, not raw field dumps.
 * @param {object|null|undefined} data - version.data
 */
export function versionIdentityPreview(data) {
  const d = data || {}
  const wordmark = String(d.logoWordmark || '').trim()
  const direction = String(d.logoDirection || '').trim()
  const tagline = String(d.tagline || '').trim()
  const typeHeading = String(d.typeHeading || '').trim()
  const typeBody = String(d.typeBody || '').trim()
  const voice = String(d.voice || '').trim()
  const promise = String(d.messagingPromise || '').trim()
  const palette = Array.isArray(d.palette)
    ? d.palette
        .map((c) => (typeof c === 'string' ? c : c?.hex || c?.value || ''))
        .filter((h) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h))
        .slice(0, 8)
    : []
  const title =
    wordmark ||
    direction ||
    tagline ||
    (palette.length ? 'Color work' : '') ||
    typeHeading ||
    'Empty identity'
  const lines = []
  if (tagline && tagline !== title) lines.push(tagline)
  if (voice) lines.push(voice.length > 72 ? `${voice.slice(0, 70)}…` : voice)
  if (promise && !lines.includes(promise)) {
    lines.push(promise.length > 72 ? `${promise.slice(0, 70)}…` : promise)
  }
  if (typeHeading || typeBody) {
    lines.push([typeHeading, typeBody].filter(Boolean).join(' · '))
  }
  return {
    title,
    lines: lines.slice(0, 3),
    palette,
    hasMark: !!(
      wordmark ||
      direction ||
      d.chosenMarkConceptId ||
      isUsableLegacyMarkImage(d.logoImage)
    ),
  }
}

/**
 * Version Service
 * Handles versioning, diffing, and history tracking for design projects
 */
class VersionService {
  constructor() {
    this.storageKey = 'project-versions'
    /**
     * Local recovery cap. Master Plan "never destroy prior versions" is a
     * product decision for document versions; Phase 4A keeps the existing
     * 24-row local history until that decision is made.
     */
    this.maxVersionsPerProject = 24
    /** Min gap between hourly saves (ms). */
    this.hourlyMinGapMs = 55 * 60 * 1000
  }

  /**
   * Create a version snapshot of the current project state
   * @param {{ changeType?: string }} [opts]
   * @returns {Promise<Object>} Version snapshot
   */
  async createVersionSnapshot(opts = {}) {
    const store = useAppStore.getState()
    const { projects, currentProjectId } = store

    if (!currentProjectId) return null

    const project = projects.find(p => p.id === currentProjectId)
    if (!project) return null

    const kind = versionKindFromChangeType(opts.changeType)

    const versionData = {
      id: `${project.id}-v${project.designVersion}-${Date.now()}`,
      projectId: project.id,
      versionLabel: project.designVersion || 'v1',
      timestamp: new Date().toISOString(),
      kind,
      data: buildProjectVersionData(project),

      // Metadata about what changed since last version (to be filled by diff)
      changeSummary: {
        fieldsChanged: [],
        severity: 'patch',
        kind,
        summary: versionKindLabel(kind),
        changeCount: 0,
      }
    }

    return versionData
  }

  /**
   * Save a version to local storage
   * @param {Object} version - Version object to save
   */
  async saveVersion(version) {
    try {
      const versions = await this.getProjectVersions(version.projectId)

      // Add new version
      versions.unshift(version) // Most recent first

      // Limit to max versions
      if (versions.length > this.maxVersionsPerProject) {
        versions.length = this.maxVersionsPerProject
      }

      // Save back to storage
      const allVersions = await this.getAllVersions()
      allVersions[version.projectId] = versions
      localStorage.setItem(this.storageKey, JSON.stringify(allVersions))

      return version.id
    } catch (error) {
      console.error('Error saving version:', error)
      throw error
    }
  }

  /**
   * Get all versions for a specific project
   * @param {string} projectId - ID of the project
   * @returns {Promise<Array<Object>>} Array of version objects
   */
  async getProjectVersions(projectId) {
    try {
      const allVersions = await this.getAllVersions()
      return allVersions[projectId] || []
    } catch (error) {
      console.error('Error getting project versions:', error)
      return []
    }
  }

  /**
   * Get all versions for all projects
   * @returns {Promise<Object>} Object mapping project IDs to version arrays
   */
  async getAllVersions() {
    try {
      const json = localStorage.getItem(this.storageKey)
      return json ? JSON.parse(json) : {}
    } catch (error) {
      console.error('Error parsing version storage:', error)
      return {}
    }
  }

  /**
   * Get a specific version by ID
   * @param {string} versionId - ID of the version to retrieve
   * @returns {Promise<Object|null>} Version object or null if not found
   */
  async getVersionById(versionId) {
    try {
      const allVersions = await this.getAllVersions()

      // Search through all projects for this version ID
      for (const projectId in allVersions) {
        const versions = allVersions[projectId]
        const version = versions.find(v => v.id === versionId)
        if (version) return version
      }

      return null
    } catch (error) {
      console.error('Error getting version by ID:', error)
      return null
    }
  }

  /**
   * Calculate the difference between two versions
   * @param {Object} oldVersion - The older version
   * @param {Object} newVersion - The newer version
   * @returns {Object} Diff object showing what changed
   */
  diffVersions(oldVersion, newVersion) {
    if (!oldVersion || !newVersion) {
      return { error: 'Invalid version objects provided' }
    }

    const changes = {
      added: [],
      removed: [],
      modified: [],
      unchanged: []
    }

    // Compare the data sections
    const oldData = oldVersion.data || {}
    const newData = newVersion.data || {}

    // Get all keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldData),
      ...Object.keys(newData)
    ])

    for (const key of allKeys) {
      const oldValue = oldData[key]
      const newValue = newData[key]

      // Handle undefined/missing values
      if (oldValue === undefined && newValue !== undefined) {
        changes.added.push({
          field: key,
          value: newValue,
          type: typeof newValue
        })
      } else if (oldValue !== undefined && newValue === undefined) {
        changes.removed.push({
          field: key,
          value: oldValue,
          type: typeof oldValue
        })
      } else if (this.valuesEqual(oldValue, newValue)) {
        changes.unchanged.push({
          field: key,
          value: newValue,
          type: typeof newValue
        })
      } else {
        changes.modified.push({
          field: key,
          oldValue: oldValue,
          newValue: newValue,
          type: typeof newValue
        })
      }
    }

    // Determine overall change significance
    const changeCount = changes.added.length + changes.removed.length + changes.modified.length
    let severity = 'patch'

    if (changeCount > 10) {
      severity = 'major'
    } else if (changeCount > 5) {
      severity = 'minor'
    }

    // Create human-readable summary
    const summary = this.generateChangeSummary(changes)

    return {
      ...changes,
      summary,
      severity,
      changeCount,
      versionInfo: {
        oldVersion: {
          id: oldVersion.id,
          label: oldVersion.versionLabel,
          timestamp: oldVersion.timestamp
        },
        newVersion: {
          id: newVersion.id,
          label: newVersion.versionLabel,
          timestamp: newVersion.timestamp
        }
      }
    }
  }

  /**
   * Check if two values are deeply equal
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} True if values are equal
   */
  valuesEqual(a, b) {
    // Handle null/undefined
    if (a === null || b === null) return a === b
    if (a === undefined || b === undefined) return a === b

    // Handle primitives
    if (typeof a !== 'object' || typeof b !== 'object') return a === b

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, index) => this.valuesEqual(item, b[index]))
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a)
      const bKeys = Object.keys(b)

      if (aKeys.length !== bKeys.length) return false

      return aKeys.every(key =>
        b.hasOwnProperty(key) && this.valuesEqual(a[key], b[key]))
    }

    return false
  }

  /**
   * Generate a human-readable summary of changes
   * @param {Object} changes - Changes object from diffVersions
   * @returns {string} Human-readable summary
   */
  generateChangeSummary(changes) {
    const parts = []

    if (changes.added.length > 0) {
      parts.push(`${changes.added.length} field${changes.added.length === 1 ? '' : 's'} added`)
    }

    if (changes.removed.length > 0) {
      parts.push(`${changes.removed.length} field${changes.removed.length === 1 ? '' : 's'} removed`)
    }

    if (changes.modified.length > 0) {
      parts.push(`${changes.modified.length} field${changes.modified.length === 1 ? '' : 's'} modified`)
    }

    if (parts.length === 0) {
      return 'No changes detected'
    }

    return parts.join(', ')
  }

  /**
   * Automatically create and save a version when significant changes occur
   * @param {string} changeType - Type of change that occurred
   * @returns {Promise<string|null>} ID of created version or null
   */
  async autoVersion(changeType = 'edit') {
    try {
      // Get current state
      const store = useAppStore.getState()
      const { currentProjectId } = store

      if (!currentProjectId) return null

      // Get latest version to compare against
      const versions = await this.getProjectVersions(currentProjectId)
      const latestVersion = versions[0] // Most recent

      // Create new snapshot
      const kind = versionKindFromChangeType(changeType)
      const newVersion = await this.createVersionSnapshot({ changeType })
      if (!newVersion) return null

      // If we have a previous version, calculate what changed
      if (latestVersion) {
        const diff = this.diffVersions(latestVersion, newVersion)
        const fieldList = [
          ...diff.added,
          ...diff.removed,
          ...diff.modified,
        ].map((c) => c.field)
        newVersion.changeSummary = {
          fieldsChanged: fieldList,
          severity: diff.severity || 'patch',
          changeCount: diff.changeCount || 0,
          summary:
            kind === 'hourly'
              ? diff.changeCount
                ? `Hourly · ${diff.summary}`
                : 'Hourly save'
              : kind === 'bump'
                ? diff.changeCount
                  ? `Bump · ${diff.summary}`
                  : 'Bump'
                : diff.summary || versionKindLabel(kind),
          kind,
        }
      } else {
        newVersion.changeSummary = {
          fieldsChanged: [],
          severity: 'patch',
          changeCount: 0,
          summary: versionKindLabel(kind),
          kind,
        }
      }

      // Save the version
      const versionId = await this.saveVersion(newVersion)
      return versionId
    } catch (error) {
      console.error('Error in auto versioning:', error)
      return null
    }
  }

  /**
   * Hourly identity snapshot while the studio is open.
   * Skips if nothing identity-related changed since the last save, or if a
   * save already landed recently (avoids double-fire with Bump).
   * @returns {Promise<string|null>}
   */
  async maybeHourlyVersion() {
    try {
      const store = useAppStore.getState()
      const { currentProjectId, projects } = store
      if (!currentProjectId) return null
      const project = (projects || []).find((p) => p.id === currentProjectId)
      if (!project) return null

      const versions = await this.getProjectVersions(currentProjectId)
      const latest = versions[0]
      if (latest?.timestamp) {
        const age = Date.now() - Date.parse(latest.timestamp)
        if (!Number.isNaN(age) && age < this.hourlyMinGapMs) return null
      }

      const candidate = await this.createVersionSnapshot({
        changeType: 'hourly',
      })
      if (!candidate) return null

      if (latest) {
        const diff = this.diffVersions(latest, candidate)
        if (!diff.changeCount) return null
      } else {
        /* First ever snapshot: only if there is something to remember */
        const preview = versionIdentityPreview(candidate.data)
        const empty =
          preview.title === 'Empty identity' && preview.palette.length === 0
        if (empty) return null
      }

      return this.autoVersion('hourly')
    } catch (error) {
      console.error('Error in hourly versioning:', error)
      return null
    }
  }

  /**
   * Overlay a Project Version's Identity fields onto the current project.
   * Does not replace the project, Brief, Directions, tasks, or published
   * Identity snapshots. Does not create another Version.
   *
   * @param {string} versionId
   * @returns {Promise<{ ok: boolean, missingMarkConcept: boolean }>}
   */
  async restoreVersion(versionId) {
    const fail = () => ({ ok: false, missingMarkConcept: false })
    try {
      const version = await this.getVersionById(versionId)
      if (!version) {
        throw new Error('Version not found')
      }

      const store = useAppStore.getState()
      const {
        currentProjectId,
        setProjectPalette,
        updateBrandField,
        setLogoDirection,
        setLogoImage,
        setColorRole,
        setPaletteTokens,
        chooseLogoConcept,
      } = store

      if (version.projectId !== currentProjectId) {
        throw new Error('Version does not belong to current project')
      }

      const data = version.data || {}
      const project = (store.projects || []).find((p) => p.id === currentProjectId)

      /* A RESTORE MAY ONLY WRITE FIELDS THE VERSION REPRESENTS.
         Missing keys leave the live value. Empty type faces do not invent
         Plus Jakarta Sans. Brief, deadline, detective, Directions and tasks
         are never written — including when a legacy record still carries them. */

      for (const key of IDENTITY_STRING_FIELDS) {
        if (!hasOwn(data, key)) continue
        updateBrandField(key, data[key] ?? '')
      }

      if (hasOwn(data, 'fontFilesLicensed')) {
        updateBrandField('fontFilesLicensed', !!data.fontFilesLicensed)
      }

      const restoreFace = (field) => {
        if (!hasOwn(data, field)) return
        const face = String(data[field] ?? '').trim()
        if (!face) return
        updateBrandField(field, face)
      }
      restoreFace('typeHeading')
      restoreFace('typeBody')

      if (hasOwn(data, 'palette') && Array.isArray(data.palette)) {
        const tokens = hasOwn(data, 'paletteTokens') && Array.isArray(data.paletteTokens)
          ? data.paletteTokens
          : null
        if (
          tokens &&
          typeof setPaletteTokens === 'function' &&
          tokens.length >= 2 &&
          tokens.length === data.palette.length
        ) {
          setPaletteTokens(
            tokens.map((row, i) => ({
              id: row?.id || `swatch-${i}`,
              name: row?.name || '',
              hex: data.palette[i],
            }))
          )
        } else {
          setProjectPalette(data.palette)
        }
      }

      if (hasOwn(data, 'colorRoles') && data.colorRoles && typeof data.colorRoles === 'object') {
        if (typeof setColorRole === 'function') {
          Object.entries(data.colorRoles).forEach(([role, color]) => {
            if (color != null && color !== '') {
              try {
                setColorRole(role, color)
              } catch {
                /* skip unknown roles */
              }
            }
          })
        }
      }

      if (hasOwn(data, 'colorRoleWhy') && data.colorRoleWhy && typeof data.colorRoleWhy === 'object') {
        updateBrandField('colorRoleWhy', copyJson(data.colorRoleWhy))
      }

      let missingMarkConcept = false
      const hasChosenId = hasOwn(data, 'chosenMarkConceptId')
      const conceptId = hasChosenId
        ? String(data.chosenMarkConceptId || '').trim()
        : ''
      const liveChosen = (project?.logoConcepts || []).find((c) => c?.chosen)
      const applyLogoDirection = () => {
        if (hasOwn(data, 'logoDirection')) {
          setLogoDirection(data.logoDirection ?? '')
        }
      }
      if (conceptId) {
        const hit = (project?.logoConcepts || []).find((c) => c?.id === conceptId)
        if (hit && typeof chooseLogoConcept === 'function') {
          chooseLogoConcept(conceptId, currentProjectId)
          applyLogoDirection()
        } else {
          missingMarkConcept = true
        }
      } else if (hasChosenId) {
        /* New record, no chosen mark. Do not write direction onto a live
           chosen concept — that would author a different mark. */
        if (!liveChosen) applyLogoDirection()
      } else {
        if (isUsableLegacyMarkImage(data.logoImage)) {
          setLogoImage(data.logoImage, currentProjectId)
        }
        applyLogoDirection()
      }

      return { ok: true, missingMarkConcept }
    } catch (error) {
      console.error('Error restoring version:', error)
      return fail()
    }
  }

  /**
   * Export version history as JSON
   * @param {string} projectId - ID of the project to export
   * @returns {Promise<string>} JSON string of version history
   */
  async exportVersionHistory(projectId) {
    try {
      const versions = await this.getProjectVersions(projectId)
      return JSON.stringify({
        projectId,
        exportedAt: new Date().toISOString(),
        versionCount: versions.length,
        versions: versions
      }, null, 2)
    } catch (error) {
      console.error('Error exporting version history:', error)
      throw error
    }
  }

  /**
   * Import version history from JSON
   * @param {string} jsonString - JSON string containing version history
   * @param {string} projectId - ID of the project to import to
   * @returns {Promise<boolean>} True if successful
   */
  async importVersionHistory(jsonString, projectId) {
    try {
      const data = JSON.parse(jsonString)

      // Validate the data
      if (!data.versions || !Array.isArray(data.versions)) {
        throw new Error('Invalid version history format')
      }

      // Get existing versions
      const existingVersions = await this.getProjectVersions(projectId)

      // Merge with imported versions (avoiding duplicates by ID)
      const combined = [...existingVersions]

      for (const importedVersion of data.versions) {
        // Ensure it's for the correct project
        importedVersion.projectId = projectId

        // Check if we already have this version
        const exists = combined.some(v => v.id === importedVersion.id)
        if (!exists) {
          combined.push(importedVersion)
        }
      }

      // Sort by timestamp (newest first) and limit
      combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      if (combined.length > this.maxVersionsPerProject) {
        combined.length = this.maxVersionsPerProject
      }

      // Save back to storage
      const allVersions = await this.getAllVersions()
      allVersions[projectId] = combined
      localStorage.setItem(this.storageKey, JSON.stringify(allVersions))

      return true
    } catch (error) {
      console.error('Error importing version history:', error)
      return false
    }
  }
}

// Create singleton instance
const versionService = new VersionService()

// Export the service
export default versionService

// Also export the class for manual instantiation if needed
export { VersionService }