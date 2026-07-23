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
    const sha = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      cwd: root,
    }).trim()
    return { sha: sha || 'dev' }
  } catch {
    return { sha: 'dev' }
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
