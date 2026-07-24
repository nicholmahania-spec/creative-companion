import { useState, useEffect, useCallback } from 'react';
import figmaService from '../services/figmaService';

/**
 * Hook for integrating with Figma API
 * Handles authentication, file operations, and data synchronization
 */
export const useFigma = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Figma service on mount
  useEffect(() => {
    const initFigma = async () => {
      try {
        figmaService.initializeFigmaService();
        setIsInitialized(true);

        // Check if we have an existing session
        if (figmaService.hasFigmaSession()) {
          try {
            const currentUser = await figmaService.getCurrentUser();
            setUser(currentUser);
            setIsAuthenticated(true);
          } catch (err) {
            // Session might be expired, clear it
            figmaService.logoutFromFigma();
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        setError('Failed to initialize Figma integration');
        console.error('Figma initialization error:', err);
      }
    };

    if (figmaService.isFigmaConfigured()) {
      initFigma();
    } else {
      setError('Figma integration not configured. Please set VITE_FIGMA_CLIENT_ID and VITE_FIGMA_CLIENT_SECRET in .env.local');
    }
  }, []);

  // Login to Figma
  const login = useCallback(async () => {
    if (!figmaService.isFigmaConfigured()) {
      throw new Error('Figma integration not configured');
    }

    setIsLoading(true);
    setError(null);

    try {
      const authUrl = figmaService.getFigmaAuthUrl();
      // In a real app, you'd redirect to this URL
      // For SPA, we might open a popup or redirect
      window.location.href = authUrl;
    } catch (err) {
      setError('Failed to initiate Figma login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle callback from Figma OAuth
  const handleCallback = useCallback(async (code) => {
    setIsLoading(true);
    setError(null);

    try {
      await figmaService.handleFigmaCallback(code);
      const currentUser = await figmaService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (err) {
      setError('Failed to authenticate with Figma');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout from Figma
  const logout = useCallback(() => {
    figmaService.logoutFromFigma();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Get a Figma file
  const getFile = useCallback(async (fileKey) => {
    setIsLoading(true);
    setError(null);

    try {
      return await figmaService.getFigmaFile(fileKey);
    } catch (err) {
      setError('Failed to fetch Figma file');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Import a design from Figma
  const importDesign = useCallback(async (fileKey, options = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      return await figmaService.importDesignFromFigma(fileKey, options);
    } catch (err) {
      setError('Failed to import design from Figma');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    isInitialized,
    isAuthenticated,
    user,
    error,
    isLoading,

    // Actions
    login,
    handleCallback,
    logout,
    getFile,
    importDesign,

    // Utils
    isConfigured: figmaService.isFigmaConfigured(),
    hasSession: figmaService.hasFigmaSession(),
    logout: figmaService.logoutFromFigma.bind(figmaService)
  };
};

export default useFigma;