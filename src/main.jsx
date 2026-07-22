import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { versionLabel, APP_BUILD_DATE } from './lib/version'

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
