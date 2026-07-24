import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { versionLabel, APP_BUILD_DATE } from './lib/version'
import { initPerformanceMonitoring } from './lib/performance'
import { initAnalytics } from './lib/analytics'
// Sentry initialization
if (import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then(({ init }) => {
    init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: 1.0,
    })
  }).catch(err => {
    console.error('Failed to initialize Sentry', err)
  })
}
// Initialize analytics
initAnalytics({
  enabled: import.meta.env.PROD || import.meta.env.DEV === false // Enable in production and preview
});

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  initPerformanceMonitoring({
    onPerfEntry: (entry) => {
      // Send to analytics or logging service in production
      if (import.meta.env.PROD) {
        // Could send to analytics endpoint here
        console.debug('Performance:', entry);
      } else {
        console.info('Performance:', entry);
      }
    },
    debug: import.meta.env.DEV
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Log version in development to help with debugging
if (import.meta.env.DEV) {
  console.info(`🚀 Creative Companion ${versionLabel()} ${APP_BUILD_DATE ? `• ${APP_BUILD_DATE}` : ''} running in development mode`)
}

// PWA: offline shell + cached assets. Desk data is localStorage (works offline).
// Failures are silent so login still works without SW.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        // Pick up new shell when a fresh deploy is available
        if (reg && reg.update) reg.update().catch(() => {})
      })
      .catch(() => {})
  })
}
