// Version Service for managing project versions and diffing capabilities
import useAppStore from '../store/useAppStore'
import { buildColorSystem } from '../lib/brandSystem'

/**
 * Version Service
 * Handles versioning, diffing, and history tracking for design projects
 */
class VersionService {
  constructor() {
    this.storageKey = 'project-versions'
    this.maxVersionsPerProject = 50 // Keep last 50 versions
  }

  /**
   * Create a version snapshot of the current project state
   * @returns {Promise<Object>} Version snapshot
   */
  async createVersionSnapshot() {
    const store = useAppStore.getState()
    const { projects, currentProjectId } = store

    if (!currentProjectId) return null

    const project = projects.find(p => p.id === currentProjectId)
    if (!project) return null

    // Create a deep copy of the relevant project data for versioning
    const versionData = {
      id: `${project.id}-v${project.designVersion}-${Date.now()}`,
      projectId: project.id,
      versionLabel: project.designVersion || 'v1',
      timestamp: new Date().toISOString(),
      // Store only the design-relevant parts of the project
      data: {
        // Brand identity
        tagline: project.tagline,
        voice: project.voice,
        typeHeading: project.typeHeading,
        typeBody: project.typeBody,
        logoWordmark: project.logoWordmark,
        logoDirection: project.logoDirection,
        logoImage: project.logoImage,
        logoClearspace: project.logoClearspace,
        logoMinSize: project.logoMinSize,
        logoDonts: project.logoDonts,

        // Color system
        palette: [...project.palette], // Copy array
        colorRoles: project.colorRoles ? { ...project.colorRoles } : null,

        // Messaging
        messagingPromise: project.messagingPromise,
        messagingProof: project.messagingProof,
        messagingPersonality: project.messagingPersonality,

        // Imagery
        imageryStyle: project.imageryStyle,
        imageryDo: project.imageryDo,
        imageryDont: project.imageryDont,

        // Detective sheet (Define phase)
        detective: project.detective ? {
          goal: project.detective.goal,
          audience: project.detective.audience,
          feel: project.detective.feel,
          mustHaves: project.detective.mustHaves,
          niceToHaves: project.detective.niceToHaves,
          format: project.detective.format,
          avoid: project.detective.avoid,
          deliverables: project.detective.deliverables,
          technical: project.detective.technical,
          milestones: project.detective.milestones ? [...project.detective.milestones] : [],
          brandWords: project.detective.brandWords
        } : null,

        // Concept package (Ideate phase)
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

        // Directions (Ideate phase)
        directions: project.directions ? [...project.directions].map(d => ({ ...d })) : [],

        // Tasks and mood items (for context)
        tasks: project.tasks ? [...project.tasks].map(t => ({ ...t })) : [],
        moodItems: project.moodItems ? [...project.moodItems].map(m => ({ ...m })) : []
      },

      // Metadata about what changed since last version (to be filled by diff)
      changeSummary: {
        fieldsChanged: [],
        severity: 'patch' // patch, minor, major
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
        b.hasOwnProperty(key) && this.valuesEqual(a[key], b[key])
      )
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
      const newVersion = await this.createVersionSnapshot()
      if (!newVersion) return null

      // If we have a previous version, calculate what changed
      if (latestVersion) {
        const diff = this.diffVersions(latestVersion, newVersion)
        newVersion.changeSummary = {
          fieldsChanged: [...diff.added, ...diff.removed, ...diff.modified].map(c => c.field),
          severity: diff.severity
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
   * Restore a project to a specific version
   * @param {string} versionId - ID of the version to restore
   * @returns {Promise<boolean>} True if successful
   */
  async restoreVersion(versionId) {
    try {
      const version = await this.getVersionById(versionId)
      if (!version) {
        throw new Error('Version not found')
      }

      // Get current state
      const store = useAppStore.getState()
      const { currentProjectId, setProjectPalette, updateBrandField, updateDetective,
              updateDirection, setProjectDeadline, setLogoDirection, setLogoImage,
              updateProjectBrief } = store

      // Verify this version belongs to current project
      if (version.projectId !== currentProjectId) {
        throw new Error('Version does not belong to current project')
      }

      // Restore the data
      const data = version.data || {}

      // Restore basic project info
      await updateProjectBrief(data.brief || '')
      await setProjectDeadline(data.deadline || '')
      await setLogoDirection(data.logoDirection || '')
      await setLogoImage(data.logoImage || '')

      // Restore brand fields
      await updateBrandField('tagline', data.tagline || '')
      await updateBrandField('voice', data.voice || '')
      await updateBrandField('typeHeading', data.typeHeading || 'Plus Jakarta Sans Bold')
      await updateBrandField('typeBody', data.typeBody || 'Plus Jakarta Sans Regular')
      await updateBrandField('logoWordmark', data.logoWordmark || '')
      await updateBrandField('logoClearspace', data.logoClearspace || '')
      await updateBrandField('logoMinSize', data.logoMinSize || '')
      await updateBrandField('logoDonts', data.logoDonts || '')

      // Restore color system
      if (data.palette) {
        await setProjectPalette(data.palette)
      }
      if (data.colorRoles) {
        // Update each color role individually
        Object.entries(data.colorRoles).forEach(([role, color]) => {
          // This would need a specific method in the store, for now we'll skip
          // In a real implementation, we'd have updateColorRole or similar
        })
      }

      // Restore messaging
      await updateBrandField('messagingPromise', data.messagingPromise || '')
      await updateBrandField('messagingProof', data.messagingProof || '')
      await updateBrandField('messagingPersonality', data.messagingPersonality || '')

      // Restore imagery guidelines
      await updateBrandField('imageryStyle', data.imageryStyle || '')
      await updateBrandField('imageryDo', data.imageryDo || '')
      await updateBrandField('imageryDont', data.imageryDont || '')

      // Restore detective sheet
      if (data.detective) {
        // Update each detective field
        Object.entries(data.detective).forEach(([field, value]) => {
          // Again, would need specific update methods
        })
      }

      // Restore concept package
      if (data.conceptPackage) {
        // Update concept package fields
      }

      // Restore directions
      if (data.directions) {
        // Update directions - would need specific methods
      }

      return true
    } catch (error) {
      console.error('Error restoring version:', error)
      return false
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