// Design Token Service for managing and synchronizing design tokens
import { get, set } from 'idb-keyval'
import { buildColorSystem, buildCssTokens, colorSpec } from '../lib/brandSystem'
import { defaultProjectPaletteHealthScore} from '../lib/color'
import { useAppStore } from '../store/useAppStore'

/**
 * Design Token Service
 * Handles creation, synchronization, and versioning of design tokens
 */
class DesignTokenService {
  constructor() {
    this.DB_NAME = 'design-tokens-db'
    this.STORE_NAME = 'token-sets'
    this.VERSION_KEY = 'schema-version'
    this.CURRENT_VERSION = '1.0'
  }

  /**
   * Initialize the IndexedDB database for token storage
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Save a token set to local IndexedDB
   * @param {Object} tokenSet - The token set to save
   * @returns {Promise<string>} ID of the saved token set
   */
  async saveTokenSet(tokenSet) {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite')
        const store = transaction.objectStore(this.STORE_NAME)

        const record = {
          ...tokenSet,
          id: tokenSet.id || crypto.randomUUID(),
          version: this.CURRENT_VERSION,
          updatedAt: new Date().toISOString()
        }

        const request = store.put(record)

        request.onsuccess = () => resolve(record.id)
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => db.close()
      })
    } catch (error) {
      console.error('Error saving token set:', error)
      throw error
    }
  }

  /**
   * Load a token set from local IndexedDB
   * @param {string} id - ID of the token set to load
   * @returns {Promise<Object|null>} The token set or null if not found
   */
  async loadTokenSet(id) {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readonly')
        const store = transaction.objectStore(this.STORE_NAME)

        const request = store.get(id)

        request.onsuccess = () => {
          db.close()
          resolve(request.result || null)
        }
        request.onerror = () => {
          db.close()
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('Error loading token set:', error)
      throw error
    }
  }

  /**
   * Get all token sets from local storage
   * @returns {Promise<Array<Object>>} Array of token sets
   */
  async getAllTokenSets() {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readonly')
        const store = transaction.objectStore(this.STORE_NAME)

        const request = store.getAll()

        request.onsuccess = () => {
          db.close()
          resolve(request.result || [])
        }
        request.onerror = () => {
          db.close()
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('Error getting token sets:', error)
      throw error
    }
  }

  /**
   * Delete a token set from local storage
   * @param {string} id - ID of the token set to delete
   * @returns {Promise<void>}
   */
  async deleteTokenSet(id) {
    try {
      const db = await this.initDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite')
        const store = transaction.objectStore(this.STORE_NAME)

        const request = store.delete(id)

        request.onsuccess = () => {
          db.close()
          resolve()
        }
        request.onerror = () => {
          db.close()
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('Error deleting token set:', error)
      throw error
    }
  }

  /**
   * Generate a token set from current app state
   * @returns {Object} Token set ready for storage/synchronization
   */
  async generateTokenSetFromState() {
    const store = useAppStore.getState()
    const { projects, currentProjectId } = store

    if (!currentProjectId) return null

    const project = projects.find(p => p.id === currentProjectId)
    if (!project) return null

    // Build color system from current palette and roles
    const colorSystem = buildColorSystem(
      project.palette || [],
      project.colorRoles || null
    )

    // Create token set
    const tokenSet = {
      id: `project-${currentProjectId}-tokens`,
      projectId: currentProjectId,
      projectName: project.name || 'Unnamed Project',
      version: project.designVersion || 'v1',
      tokens: {
        colors: {
          // Role-based colors
          ...Object.fromEntries(
            colorSystem.roleRows.map(role => [
              role.role.toLowerCase(),
              {
                value: role.hex,
                alpha: 1,
                description: role.job || ''
              }
            ])
          ),
          // Swatch colors
          swatches: colorSystem.swatches.map((swatch, index) => ({
            name: `swatch-${index + 1}`,
            value: swap.hex,
            alpha: 1
          }))
        },
        typography: {
          // Convert type scale to tokens
          ...Object.fromEntries(
            TYPE_SCALE.map(style => [
              style.id,
              {
                value: `${style.size} ${style.weight}`,
                fontFamily: style.fontFamily || '',
                lineHeight: '1.5',
                letterSpacing: '0'
              }
            ])
          )
        },
        // Spacing, radius, etc. could be added here
        spacing: {
          'xs': '4px',
          'sm': '8px',
          'md': '16px',
          'lg': '24px',
          'xl': '32px'
        },
        borderRadius: {
          'none': '0px',
          'sm': '2px',
          'md': '4px',
          'lg': '8px',
          'full': '9999px'
        }
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        paletteHealth: this.calculatePaletteHealth(project.palette || []),
        tokenCount: Object.keys(colorSystem.roleRows).length +
                   Object.keys(colorSystem.swatches).length +
                   Object.keys(TYPE_SCALE).length
      }
    }

    return tokenSet
  }

  /**
   * Calculate palette health score
   * @param {Array<string>} palette - Array of hex colors
   * @returns {Object} Health score object
   */
  calculatePaletteHealth(palette) {
    if (!palette || palette.length === 0) return { score: 0, issues: ['No colors in palette'] }

    // Import the palette health function from color.js
    // For now, we'll return a basic assessment
    const uniqueColors = [...new Set(palette.map(p => p.toUpperCase()))]
    const hasEnoughColors = uniqueColors.length >= 2
    const hasTooManyColors = uniqueColors.length > 10

    let score = 100
    const issues = []

    if (!hasEnoughColors) {
      score -= 30
      issues.push('Need at least 2 colors for a functional palette')
    }

    if (hasTooManyColors) {
      score -= 20
      issues.push('Palette has too many colors (>10), consider simplifying')
    }

    // Check for adequate contrast (basic check)
    if (uniqueColors.length >= 2) {
      // This is a simplified check - in reality we'd check all combinations
      const lightColors = uniqueColors.filter(c =>
        parseInt(c.substring(1), 16) > 0x808080
      ).length
      const darkColors = uniqueColors.length - lightColors

      if (lightColors === 0 || darkColors === 0) {
        score -= 25
        issues.append('Poor contrast: need both light and dark colors')
      }
    }

    return {
      score: Math.max(0, score),
      issues: issues.length === 0 ? ['Palette looks good!'] : issues,
      suggestions: this.generatePaletteSuggestions(issues)
    }
  }

  /**
   * Generate palette improvement suggestions
   * @param {Array<string>} issues - Array of identified issues
   * @returns {Array<string>} Suggestions for improvement
   */
  generatePaletteSuggestions(issues) {
    const suggestions = []

    if (issues.some(i => i.includes('Need at least 2 colors'))) {
      suggestions.push('Add a secondary color to complement your primary')
    }

    if (issues.some(i => i.includes('too many colors'))) {
      suggestions.push('Consider creating a primary/secondary/tertiary hierarchy')
    }

    if (issues.some(i => i.includes('Poor contrast'))) {
      suggestions.push('Add both light and dark variants for better accessibility')
    }

    if (suggestions.length === 0) {
      suggestions.push('Your palette is well-balanced! Consider documenting usage guidelines')
    }

    return suggestions
  }

  /**
   * Export token set as JSON for sharing/backup
   * @param {Object} tokenSet - The token set to export
   * @returns {string} JSON string representation
   */
  exportTokenSet(tokenSet) {
    return JSON.stringify({
      ...tokenSet,
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0'
    }, null, 2)
  }

  /**
   * Import token set from JSON
   * @param {string} jsonString - JSON string to import
   * @returns {Object} Parsed token set
   */
  importTokenSet(jsonString) {
    try {
      const parsed = JSON.parse(jsonString)
      // Validate basic structure
      if (!parsed.tokens || !parsed.projectId) {
        throw new Error('Invalid token set format')
      }
      return parsed
    } catch (error) {
      throw new Error(`Failed to parse token set: ${error.message}`)
    }
  }

  /**
   * Sync token set with remote storage (Supabase)
   * @param {Object} tokenSet - Token set to sync
   * @param {string} syncDirection - 'push', 'pull', or 'bidirectional'
   * @returns {Promise<Object>} Result of sync operation
   */
  async syncWithRemote(tokenSet, syncDirection = 'push') {
    if (!supabase) {
      throw new Error('Supabase not configured for synchronization')
    }

    try {
      if (syncDirection === 'push' || syncDirection === 'bidirectional') {
        // Push local changes to remote
        const { data, error } = await supabase
          .from('design_token_sets')
          .upsert({
            id: tokenSet.id,
            project_id: tokenSet.projectId,
            project_name: tokenSet.projectName,
            version: tokenSet.version,
            token_data: tokenSet.tokens,
            metadata: tokenSet.metadata,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })

        if (error) throw error
      }

      if (syncDirection === 'pull' || syncDirection === 'bidirectional') {
        // Pull remote changes (if newer)
        const { data, error } = await supabase
          .from('design_token_sets')
          .select('*')
          .eq('project_id', tokenSet.projectId)
          .order('updated_at', { ascending: false })
          .limit(1)

        if (error) throw error

        if (data && data.length > 0) {
          const remoteTokenSet = data[0]
          // Compare versions and merge if needed
          // For now, we'll just return the remote version if it's newer
          // In a real implementation, we'd do proper 3-way merge
          return {
            ...remoteTokenSet,
            syncedAt: new Date().toISOString()
          }
        }
      }

      return { success: true, timestamp: new Date().toISOString() }
    } catch (error) {
      console.error('Error syncing token set:', error)
      throw error
    }
  }
}

// Create singleton instance
const designTokenService = new DesignTokenService()

// Initialize storage buckets when module loads
if (typeof window !== 'undefined') {
  // We'll initialize storage when needed, not on import
}

// Export the service
export default designTokenService

// Also export the class for manual instantiation if needed
export { DesignTokenService }