#!/usr/bin/env node
/**
 * Fail CI if main bundle exceeds budget (raw bytes, post-build dist/).
 *
 * Budgets are soft product gates for ADHD desk SPA — keep main chunk lean.
 * Adjust only with intentional product tradeoffs.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = join(root, 'dist', 'assets')

/**
 * Main app chunk (index-*.js) raw max — excludes jspdf/html2canvas/supabase lazy chunks.
 * 440 KB (v1.47): design/UX flow honesty chrome + leave-behind thin copy.
 */
const MAIN_JS_RAW_MAX = 440 * 1024
/**
 * Main CSS raw max — shell only after lazy view CSS split (v1.50.4).
 * View styles load with route chunks (lazy-*.css); main index-*.css is shell.
 * Target ≤200 KB; currently ~151 KB.
 */
const MAIN_CSS_RAW_MAX = 200 * 1024
/** Main JS gzipped advisory max (warn only if over, still fail on raw) */
const MAIN_JS_GZIP_WARN = 140 * 1024

/**
 * Everything the browser is told to fetch before the app can run — the main
 * chunk plus every <link rel="modulepreload"> in dist/index.html.
 *
 * The budget above measures index-*.js alone, so a library becoming eager was
 * invisible to it. That is not hypothetical: lottie-web (300 KB raw) was
 * pulled onto the login screen by a hardcoded prop, and the gate stayed green
 * because the bytes were in their own chunk. Measuring the entry set closes
 * the gap the single-chunk budget left open.
 *
 * Seeded above today's measured total with room to breathe, not at it — this
 * is a ceiling to catch a regression, not a ratchet.
 */
const EAGER_JS_RAW_MAX = 900 * 1024

function pickMain(files, re) {
  return files.filter((f) => re.test(f)).sort((a, b) => {
    // Prefer the largest matching "index-" entry as main
    return statSync(join(assetsDir, b)).size - statSync(join(assetsDir, a)).size
  })[0]
}

try {
  const files = readdirSync(assetsDir)
  const mainJs = pickMain(files, /^index-.*\.js$/)
  const mainCss = pickMain(files, /^index-.*\.css$/)

  if (!mainJs) {
    console.error('perf-budget: no dist/assets/index-*.js — run npm run build first')
    process.exit(1)
  }

  /* The entry set: the main chunk plus everything index.html preloads. */
  const html = readFileSync(join(root, 'dist', 'index.html'), 'utf8')
  const preloaded = [...html.matchAll(/modulepreload"[^>]*href="[^"]*\/assets\/([^"]+)"/g)]
    .map((m) => m[1])
    .filter((f) => f.endsWith('.js'))
  const eagerFiles = [...new Set([mainJs, ...preloaded])]
  const eagerRaw = eagerFiles.reduce(
    (sum, f) => sum + statSync(join(assetsDir, f)).size,
    0
  )

  const jsPath = join(assetsDir, mainJs)
  const jsRaw = statSync(jsPath).size
  const jsGzip = gzipSync(readFileSync(jsPath)).length

  console.log(`perf-budget: ${mainJs}`)
  console.log(`  raw  ${(jsRaw / 1024).toFixed(1)} KB (max ${MAIN_JS_RAW_MAX / 1024} KB)`)
  console.log(`  gzip ${(jsGzip / 1024).toFixed(1)} KB (warn > ${MAIN_JS_GZIP_WARN / 1024} KB)`)

  let failed = false
  console.log(
    `perf-budget: eager entry set (${eagerFiles.length} files) ` +
      `raw ${(eagerRaw / 1024).toFixed(1)} KB (max ${EAGER_JS_RAW_MAX / 1024} KB)`
  )
  if (eagerRaw > EAGER_JS_RAW_MAX) {
    console.error(
      'FAIL: eager entry set over budget — something became non-lazy.\n' +
        eagerFiles
          .map((f) => `  ${(statSync(join(assetsDir, f)).size / 1024).toFixed(1)} KB  ${f}`)
          .join('\n')
    )
    process.exitCode = 1
  }

  if (jsRaw > MAIN_JS_RAW_MAX) {
    console.error(`FAIL: main JS raw over budget`)
    failed = true
  }
  if (jsGzip > MAIN_JS_GZIP_WARN) {
    console.warn(`WARN: main JS gzip above advisory budget`)
  }

  if (mainCss) {
    const cssRaw = statSync(join(assetsDir, mainCss)).size
    console.log(`perf-budget: ${mainCss}`)
    console.log(`  raw  ${(cssRaw / 1024).toFixed(1)} KB (max ${MAIN_CSS_RAW_MAX / 1024} KB)`)
    if (cssRaw > MAIN_CSS_RAW_MAX) {
      console.error(`FAIL: main CSS raw over budget`)
      failed = true
    }
  }

  // Report heaviest lazy chunks (info only)
  const heavies = files
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({ f, size: statSync(join(assetsDir, f)).size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 6)
  console.log('perf-budget: top JS assets')
  for (const h of heavies) {
    console.log(`  ${(h.size / 1024).toFixed(1).padStart(7)} KB  ${h.f}`)
  }

  process.exit(failed ? 1 : 0)
} catch (e) {
  console.error('perf-budget:', e.message || e)
  process.exit(1)
}
