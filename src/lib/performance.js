// performance monitoring utilities
import { PerformanceObserver } from 'perf_hooks';

let onPerfCallback = null;
let debugFlag = false;

/**
 * Initialize performance monitoring
 * @param {Object} options - Configuration options
 * @param {Function} options.onPerfEntry - Callback for performance entries
 * @param {boolean} options.debug - Whether to log debug info
 */
export const initPerformanceMonitoring = ({ onPerfEntry, debug = false } = {}) => {
  if (typeof window === 'undefined') return;

  onPerfCallback = onPerfEntry;
  debugFlag = debug;

  // Measure Core Web Vitals
  const getCLS = (onReport) => {
    let clsValue = 0;
    let clsEntries = [];

    let sessionSummary = {
      value: 0,
      entries: [],
      delta: 0,
    };

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count layout shifts without recent user input
        if (!entry.hadRecentInput) {
          const firstEntry = clsEntries[0];
          const lastEntry = clsEntries[clsEntries.length - 1];

          if (
            entry.startTime - lastEntry.startTime < 1000 &&
            entry.startTime - firstEntry.startTime < 5000
          ) {
            sessionSummary.value += entry.value;
            sessionSummary.entries.push(entry);
            sessionSummary.delta = entry.value;
          } else {
            sessionSummary = {
              value: entry.value,
              entries: [entry],
              delta: entry.value,
            };
          }

          clsEntries = [...sessionSummary.entries];
          clsValue = sessionSummary.value;

          if (onReport) {
            onReport({
              name: 'CLS',
              value: clsValue.toFixed(3),
              delta: sessionSummary.delta,
              id: clsEntries[clsEntries.length - 1]?.startTime,
              entries: [...sessionSummary.entries],
            });
          }
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Do nothing if the browser doesn't support this API
    }
  };

  const getFID = (onReport) => {
    const fidPromise = new Promise((resolve) => {
      const handler = (event) => {
        const fid = event.processingStart - event.startTime;
        if (fid < 0) return;
        // Remove listener after first input
        window.removeEventListener('pointerdown', handler, true);
        window.removeEventListener('pointerup', handler, true);
        window.removeEventListener('mousedown', handler, true);
        window.removeEventListener('mouseup', handler, true);
        window.removeEventListener('keydown', handler, true);
        window.removeEventListener('keyup', handler, true);
        resolve(fid);
      };

      window.addEventListener('pointerdown', handler, true);
      window.addEventListener('pointerup', handler, true);
      window.addEventListener('mousedown', handler, true);
      window.addEventListener('mouseup', handler, true);
      window.addEventListener('keydown', handler, true);
      window.addEventListener('keyup', handler, true);
    });

    fidPromise.then((fid) => {
      if (onReport) {
        onReport({
          name: 'FID',
          value: fid,
          id: performance.now(),
        });
      }
    });
  };

  const getLCP = (onReport) => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (onReport) {
        onReport({
          name: 'LCP',
          value: Math.round(lastEntry.startTime),
          id: lastEntry.startTime,
        });
      }
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // Do nothing if the browser doesn't support this API
    }
  };

  // Measure time to interactive
  const getTTI = (onReport) => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (onReport) {
        onReport({
          name: 'TTI',
          value: Math.round(lastEntry.startTime),
          id: lastEntry.startTime,
        });
      }
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // Fallback to load event
      if (document.readyState === 'complete') {
        const tti = performance.timing.loadEventEnd - performance.timing.navigationStart;
        if (onReport) {
          onReport({
            name: 'TTI',
            value: tti,
            id: performance.now(),
          });
        }
      } else {
        window.addEventListener('load', () => {
          const tti = performance.timing.loadEventEnd - performance.timing.navigationStart;
          if (onReport) {
            onReport({
              name: 'TTI',
              value: tti,
              id: performance.now(),
            });
          }
        });
      }
    }
  };

  // Start measuring
  if (typeof PerformanceObserver !== 'undefined') {
    getCLS((entry) => {
      if (onPerfCallback) onPerfCallback(entry);
    });
    getFID((entry) => {
      if (onPerfCallback) onPerfCallback(entry);
    });
    getLCP((entry) => {
      if (onPerfCallback) onPerfCallback(entry);
    });
    getTTI((entry) => {
      if (onPerfCallback) onPerfCallback(entry);
    });
  }
};

// Expose measure function for manual measurements
export const measure = (name, startTime, endTime) => {
  const duration = endTime - startTime;
  if (onPerfCallback) {
    onPerfCallback({
      name,
      value: duration,
      id: Date.now(),
      timestamp: startTime,
    });
  }
  if (debugFlag) {
    console.debug(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
  }
};

// Alias for measure
export const recordMetric = measure;

// Hook for measuring component render times
export const useMeasureRender = (componentName) => {
  const { measure } = usePerformanceMonitor();
  const renderCount = useRef(0);

  useEffect(() => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      measure(`${componentName}_render_${renderCount.current++}`, start, end);
    };
  }, [componentName, measure]);
};

// Custom hook to access the measure function
export const usePerformanceMonitor = () => {
  // In a real app, this would use React context
  // For simplicity, we're returning a function that creates a monitor
  return {
    measure: (name, startTime, endTime) => {
      const duration = endTime - startTime;
      console.debug(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
    },
  };
};

export const measureTime = (name, fn) => {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const result = fn();
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (debugFlag) {
    console.debug(`[PERF] ${name}: ${(end - start).toFixed(2)}ms`);
  }
  return result;
};