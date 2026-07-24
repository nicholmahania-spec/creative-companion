// Figma API Service for handling file operations, authentication, and data sync
import { v4 as uuidv4 } from 'uuid';

// Figma API configuration
const FIGMA_API_BASE = 'https://api.figma.com/v1';
const FIGMA_OAUTH_AUTHORIZE = 'https://www.figma.com/oauth';
const FIGMA_OAUTH_TOKEN = 'https://www.figma.com/api/oauth/token';

// Client ID should be stored in environment variables
// For now, we'll use a placeholder - in production this should come from VITE_FIGMA_CLIENT_ID
const FIGMA_CLIENT_ID = import.meta.env.VITE_FIGMA_CLIENT_ID || '';

// Store for token management (in production, use secure storage)
let accessToken = null;
let refreshToken = null;
let tokenExpiry = null;

/**
 * Initialize figma service with client ID from environment
 */
export function initializeFigmaService() {
  const clientId = import.meta.env.VITE_FIGMA_CLIENT_ID;
  if (!clientId) {
    console.warn('Figma Client ID not configured. Set VITE_FIGMA_CLIENT_ID in .env');
  }
  return !!clientId;
}

/**
 * Check if Figma is configured
 */
export function isFigmaConfigured() {
  return !!import.meta.env.VITE_FIGMA_CLIENT_ID;
}

/**
 * Store tokens securely (in production, use httpOnly cookies or secure storage)
 */
function setTokens(access_token, refresh_token, expires_in) {
  accessToken = access_token;
  refreshToken = refresh_token;
  tokenExpiry = Date.now() + (expires_in * 1000);

  // Also store in localStorage for persistence across sessions (with encryption in prod)
  try {
    localStorage.setItem('figma_token_data', JSON.stringify({
      access_token,
      refresh_token,
      expires_in: tokenExpiry
    }));
  } catch (e) {
    console.warn('Failed to store figma tokens:', e);
  }
}

/**
 * Load tokens from storage
 */
function loadTokens() {
  try {
    const tokenData = localStorage.getItem('figma_token_data');
    if (tokenData) {
      const { access_token, refresh_token, expires_in } = JSON.parse(tokenData);
      if (access_token && refresh_token && expires_in > Date.now()) {
        accessToken = access_token;
        refreshToken = refresh_token;
        tokenExpiry = expires_in;
        return true;
      }
    }
  } catch (e) {
    console.warn('Failed to load figma tokens:', e);
  }
  return false;
}

/**
 * Clear stored tokens
 */
function clearTokens() {
  accessToken = null;
  refreshToken = null;
  tokenExpiry = null;
  try {
    localStorage.removeItem('figma_token_data');
  } catch (e) {
    console.warn('Failed to clear figma tokens:', e);
  }
}

/**
 * Check if token is expired or about to expire
 */
function isTokenExpired() {
  return !tokenExpiry || Date.now() >= (tokenExpiry - 30000); // 30s buffer
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(FIGMA_OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: FIGMA_CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();
    setTokens(data.access_token, data.refresh_token, data.expires_in);
    return data.access_token;
  } catch (error) {
    clearTokens();
    throw error;
  }
}

/**
 * Get valid access token, refreshing if necessary
 */
async function getAccessToken() {
  // Try to load tokens if not in memory
  if (!accessToken) {
    loadTokens();
  }

  // If no token or expired, throw error to trigger re-authentication
  if (!accessToken || isTokenExpired()) {
    throw new Error('No valid access token available');
  }

  return accessToken;
}

/**
 * Get authorization URL for Figma OAuth
 */
export function getFigmaAuthUrl(redirectUri, state = '') {
  if (!FIGMA_CLIENT_ID) {
    throw new Error('Figma Client ID not configured');
  }

  const params = new URLSearchParams({
    client_id: FIGMA_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'files_read files_write',
    response_type: 'code',
    state: state || Math.random().toString(36).substring(2),
  });

  return `${FIGMA_OAUTH_AUTHORIZE}?${params.toString()}`;
}

/**
 * Handle OAuth callback and exchange code for tokens
 */
export async function handleFigmaCallback(code) {
  if (!FIGMA_CLIENT_ID) {
    throw new Error('Figma Client ID not configured');
  }

  try {
    const response = await fetch(FIGMA_OAUTH_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: FIGMA_CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
      })
    });

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    setTokens(data.access_token, data.refresh_token, data.expires_in);
    return data;
  } catch (error) {
    throw new Error(`Figma OAuth error: ${error.message}`);
  }
}

/**
 * Get current user profile from Figma
 */
export async function getCurrentUser() {
  const token = await getAccessToken();

  const response = await fetch(`${FIGMA_API_BASE}/me`, {
    headers: {
      'X-Figma-Token': token,
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearTokens();
      throw new Error('Figma authentication expired');
    }
    throw new Error(`Failed to get user: ${response.status}`);
  }

  return response.json();
}

/**
 * Get a file from Figma by file key
 */
export async function getFigmaFile(fileId) {
  const token = await getAccessToken();

  const response = await fetch(`${FIGMA_API_BASE}/files/${fileId}`, {
    headers: {
      'X-Figma-Token': token,
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearTokens();
      throw new Error('Figma authentication expired');
    }
    if (response.status === 404) {
      throw new Error('Figma file not found');
    }
    throw new Error(`Failed to get figma file: ${response.status}`);
  }

  return response.json();
}

/**
 * Get nodes from a Figma file
 */
export async function getFigmaFileNodes(fileId, nodeIds) {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    ids: nodeIds.join(',')
  });

  const response = await fetch(`${FIGMA_API_BASE}/files/${fileId}/nodes?${params}`, {
    headers: {
      'X-Figma-Token': token,
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearTokens();
      throw new Error('Figma authentication expired');
    }
    throw new Error(`Failed to get figma file nodes: ${response.status}`);
  }

  return response.json();
}

/**
 * Search for files in user's Figma account
 */
export async function searchFigmaFiles(query, limit = 20) {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    q: query,
    limit: limit.toString()
  });

  const response = await fetch(`${FIGMA_API_BASE}/files/search?${params}`, {
    headers: {
      'X-Figma-Token': token,
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearTokens();
      throw new Error('Figma authentication expired');
    }
    throw new Error(`Failed to search figma files: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a new component in a Figma file (basic implementation)
 */
export async function createComponentInFile(fileId, componentData) {
  // Note: Figma API has limited write capabilities via REST
  // Most creation/modification requires using the Plugin API
  // This is a placeholder for future implementation when Figma opens more endpoints
  throw new Error('Figma file modification not yet implemented via REST API');
}

/**
 * Convert Figma node data to our internal format
 */
export function figmaNodeToInternal(node) {
  // Basic conversion - would need to be expanded based on actual needs
  const result = {
    id: node.id || `${Date.now()}-${Math.random()}`,
    name: node.name,
    type: node.type,
    visible: node.visible !== false,
    // Extract relevant properties based on node type
    ...(node.fills && { fills: node.fills }),
    ...(node.strokes && { strokes: node.strokes }),
    ...(node.strokeWeight && { strokeWeight: node.strokeWeight }),
    ...(node.cornerRadius && { cornerRadius: node.cornerRadius }),
    // Children would be processed recursively
    ...(node.children && { children: node.children.map(figmaNodeToInternal) })
  };

  // Add absoluteBoundingBox if available
  if (node.absoluteBoundingBox) {
    result.absoluteBoundingBox = node.absoluteBoundingBox;
  }

  return result;
}

/**
 * Extract color styles from a Figma file
 */
export async function extractColorStylesFromFile(fileId) {
  try {
    const fileData = await getFigmaFile(fileId);

    // Extract colors from document
    const colors = new Set();

    function extractColorsFromNode(node) {
      if (node.fills) {
        node.fills.forEach(fill => {
          if (fill.type === 'SOLID' && fill.color) {
            const { r, g, b, a = 1 } = fill.color;
            const hex = Math.round(r * 255).toString(16).padStart(2, '0') +
                        Math.round(g * 255).toString(16).padStart(2, '0') +
                        Math.round(b * 255).toString(16).padStart(2, '0') +
                        Math.round(a * 255).toString(16).padStart(2, '0');
            colors.add(`#${hex}`);
          }
        });
      }

      if (node.strokes) {
        node.strokes.forEach(stroke => {
          if (stroke.type === 'SOLID' && stroke.color) {
            const { r, g, b, a = 1 } = stroke.color;
            const hex = Math.round(r * 255).toString(16).padStart(2, '0') +
                        Math.round(g * 255).toString(16).padStart(2, '0') +
                        Math.round(b * 255).toString(16).padStart(2, '0') +
                        Math.round(a * 255).toString(16).padStart(2, '0');
            colors.add(`#${hex}`);
          }
        });
      }

      if (node.children) {
        node.children.forEach(extractColorsFromNode);
      }
    }

    extractColorsFromNode(fileData.document);
    return Array.from(colors);
  } catch (error) {
    console.error('Failed to extract colors from Figma file:', error);
    throw error;
  }
}

/**
 * Export our design data to Figma format (placeholder for future implementation)
 */
export async function exportToFigmaFormat(designData) {
  // This would convert our internal format to Figma-compatible JSON
  // For now, we'll return a basic structure
  return {
    document: {
      // This would need significant implementation to be useful
      // For MVP, we might export as a simple frame with basic elements
    },
    components: [],
    // ... other Figma file structures
  };
}

export default {
  initializeFigmaService,
  isFigmaConfigured,
  getFigmaAuthUrl,
  handleFigmaCallback,
  getCurrentUser,
  getFigmaFile,
  getFigmaFileNodes,
  searchFigmaFiles,
  createComponentInFile,
  figmaNodeToInternal,
  extractColorStylesFromFile,
  exportToFigmaFormat,
  // Token management (for internal use)
  _setTokens: setTokens,
  _clearTokens: clearTokens,
  _loadTokens: loadTokens,
};