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
    const count = execSync('git rev-list --count HEAD', {
      encoding: 'utf8',
      cwd: root,
    }).trim()
    const sha = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      cwd: root,
    }).trim()
    return { count: parseInt(count, 10) || 0, sha: sha || 'dev' }
  } catch {
    return { count: 0, sha: 'dev' }
  }
}

/**
 * Display version auto-advances with every commit:
 * package.json major.minor + git commit count as patch
 * e.g. package 0.2.0 + 5 commits → 0.2.5
 *
 * Bump major/minor in package.json for product waves:
 *   npm run bump -- --minor
 */
function resolveAppVersion() {
  const pkgVer = readPkgVersion()
  const { count, sha } = gitMeta()
  const [maj, min] = pkgVer.split('.')
  const major = maj || '0'
  const minor = min || '0'
  // +1 so the commit that ships this code counts after it's on main
  const patch = Math.max(count, 0)
  return {
    version: `${major}.${minor}.${patch}`,
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
  define: {
    __APP_VERSION__: JSON.stringify(meta.version),
    __APP_BUILD__: JSON.stringify(meta.build),
    __APP_BUILD_DATE__: JSON.stringify(meta.date),
  },
})
