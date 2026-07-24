// Analytics service for tracking user interactions and feature usage
let analyticsInitialized = false;
let analyticsEndpoint = '/api/analytics'; // Default endpoint, can be configured
let analyticsEnabled = false;

/**
 * Initialize analytics with optional configuration
 * @param {Object} config - Configuration options
 * @param {string} config.endpoint - Analytics endpoint URL
 * @param {boolean} config.enabled - Whether analytics tracking is enabled
 */
export const initAnalytics = ({ endpoint, enabled = true } = {}) => {
  if (typeof window === 'undefined') return;

  if (endpoint) analyticsEndpoint = endpoint;
  analyticsEnabled = enabled !== false;
  analyticsInitialized = true;

  // Track page view on initialization
  trackPageView();
};

/**
 * Check if analytics is initialized and enabled
 * @returns {boolean}
 */
const isAnalyticsEnabled = () => {
  return analyticsInitialized && typeof window !== 'undefined';
};

/**
 * Track a page view
 * @param {string} path - Current path
 * @param {string} title - Page title
 */
export const trackPageView = (path = window.location.pathname, title = document.title) => {
  if (!isAnalyticsEnabled()) return;

  trackEvent('page_view', {
    path,
    title,
    timestamp: new Date().toISOString()
  });
};

/**
 * Track a custom event
 * @param {string} eventName - Name of the event
 * @param {Object} properties - Event properties
 */
export const trackEvent = (eventName, properties = {}) => {
  if (!isAnalyticsEnabled()) return;

  const eventData = {
    event: eventName,
    timestamp: new Date().toISOString(),
    ...properties
  };

  // In development, log to console
  if (import.meta.env.DEV) {
    console.debug('[ANALYTICS]', eventData);
    return;
  }

  // In production, send to analytics endpoint
  if (import.meta.env.PROD) {
    // Send asynchronously to avoid blocking UI
    navigator.sendBeacon && navigator.sendBeacon(
      analyticsEndpoint,
      JSON.stringify(eventData)
    ).catch(err => {
      console.warn('Failed to send analytics:', err);
    });

    // Fallback for browsers that don't support sendBeacon
    if (!navigator.sendBeacon) {
      fetch(analyticsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
        keepalive: true
      }).catch(err => {
        console.warn('Failed to send analytics:', err);
      });
    }
  }
};

/**
 * Track template usage
 * @param {string} action - save, apply, delete, update
 * @param {Object} template - Template object
 */
export const trackTemplateAction = (action, template) => {
  trackEvent('template_action', {
    action,
    templateId: template?.id,
    templateName: template?.name,
    hasDescription: !!template?.description
  });
};

/**
 * Track version history actions
 * @param {string} action - view, diff, restore
 * @param {Object} version - Version object
 */
export const trackVersionAction = (action, version) => {
  trackEvent('version_action', {
    action,
    versionId: version?.id,
    versionLabel: version?.versionLabel,
    projectId: version?.projectId
  });
};

/**
 * Track export actions
 * @param {string} format - pdf, json, html, md, kit, backup
 * @param {boolean} success - Whether export was successful
 */
export const trackExportAction = (format, success = true) => {
  trackEvent('export_action', {
    format,
    success
  });
};

/**
 * Track feature usage
 * @param {string} feature - figma, color-extraction, ai-assistant, etc.
 * @param {string} action - used, opened, completed
 */
export const trackFeatureUsage = (feature, action = 'used') => {
  trackEvent('feature_usage', {
    feature,
    action
  });
};

/**
 * Track workflow transitions
 * @param {string} fromView - Previous view
 * @param {string} toView - New view
 */
export const trackWorkflowTransition = (fromView, toView) => {
  trackEvent('workflow_transition', {
    from: fromView,
    to: toView,
    timestamp: new Date().toISOString()
  });
};

/**
 * Start a performance timer
 * @param {string} timerName - Name of the timer
 */
export const startPerformanceTimer = (timerName) => {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    performance.mark(`timer-${timerName}-start`);
  }
};

/**
 * End a performance timer and send the duration
 * @param {string} timerName - Name of the timer
 * @param {Object} properties - Additional properties to send with the timing event
 */
export const endPerformanceTimer = (timerName, properties = {}) => {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function' && typeof performance.measure === 'function') {
    performance.mark(`timer-${timerName}-end`);
    performance.measure(`timer-${timerName}`, `timer-${timerName}-start`, `timer-${timerName}-end`);
    const measure = performance.getEntriesByName(`timer-${timerName}`).pop();
    if (measure) {
      trackEvent('performance_timing', {
        name: timerName,
        duration: measure.duration,
        ...properties
      });
      // Clean up the marks and measures
      performance.clearMarks(`timer-${timerName}-start`);
      performance.clearMarks(`timer-${timerName}-end`);
      performance.clearMeasures(`timer-${timerName}`);
    }
  }
};

// Auto-track page visibility changes
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Page became visible
      trackPageView();
    }
  });
}