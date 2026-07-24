import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

function readPkgVersion() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
    return String(pkg.version || '0.0.0')
  } catch {
    return '0.0.0'
  }
}

function gitMeta() {
  try {
    // Try to get git SHA first
    const sha = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      cwd: root,
    }).trim()
    return { sha: sha || 'DEFAULT' }
  } catch (gitError) {
    try {
      // Fallback: try to get it from environment variables (common in CI)
      const envSha = process.env.VERCEL_GIT_COMMIT_SHA ||
                    process.env.GITHUB_SHA ||
                    process.env.GIT_COMMIT_SHA
      if (envSha) {
        return { sha: envSha.substring(0, 7) || 'DEFAULT' }
      }
    } catch (envError) {
      // Ignore errors from env var access
    }

    // Final fallback
    return { sha: 'DEFAULT' }
  }
}

/**
 * App version = package.json (source of truth).
 *
 * Bump before each update:
 *   npm run bump          → patch  0.2.0 → 0.2.1
 *   npm run bump:minor    → minor  0.2.1 → 0.3.0
 *   npm run bump:major    → major  0.3.0 → 1.0.0
 *
 * Footer shows v{package.json version}; git SHA + date are build metadata.
 */
function resolveAppVersion() {
  const { sha } = gitMeta()
  return {
    version: readPkgVersion(),
    build: sha,
    date: new Date().toISOString().slice(0, 10),
  }
}

const meta = resolveAppVersion()

// GitHub Pages project site: https://<user>.github.io/creative-companion/
const base =
  process.env.GITHUB_PAGES === 'true' ? '/creative-companion/' : './'

export default defineConfig({
  plugins: [react()],
  base,
  resolve: {
    alias: {
      '@': resolve(root, 'src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(meta.version),
    __APP_BUILD__: JSON.stringify(meta.build),
    __APP_BUILD_DATE__: JSON.stringify(meta.date),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('react')) {
            return 'react';
          }
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }
        },
      },
    },
  },
  preview: {
    port: 4274,
    strictPort: true,
  },
  // Dev: /api/xai/* → api.x.ai/v1/* with server-side XAI_API_KEY
  server: {
    port: 5274,
    strictPort: true,
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "img-src 'self' data: https:",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.x.ai",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "connect-src 'self' ws://localhost:* http://localhost:* https://*.supabase.co https://api.x.ai https://fonts.googleapis.com https://fonts.gstatic.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    },
    proxy: {
      '/api/xai': {
        target: 'https://api.x.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/xai/, '/v1'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const key = (process.env.XAI_API_KEY || '').trim()
            if (key) proxyReq.setHeader('Authorization', `Bearer ${key}`)
          })
        },
      },
    },
  },
})
