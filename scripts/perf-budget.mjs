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

/** Main app chunk (index-*.js) raw max — excludes jspdf/html2canvas/supabase lazy chunks */
const MAIN_JS_RAW_MAX = 430 * 1024
/** Main CSS raw max */
const MAIN_CSS_RAW_MAX = 180 * 1024
/** Main JS gzipped advisory max (warn only if over, still fail on raw) */
const MAIN_JS_GZIP_WARN = 135 * 1024

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

  const jsPath = join(assetsDir, mainJs)
  const jsRaw = statSync(jsPath).size
  const jsGzip = gzipSync(readFileSync(jsPath)).length

  console.log(`perf-budget: ${mainJs}`)
  console.log(`  raw  ${(jsRaw / 1024).toFixed(1)} KB (max ${MAIN_JS_RAW_MAX / 1024} KB)`)
  console.log(`  gzip ${(jsGzip / 1024).toFixed(1)} KB (warn > ${MAIN_JS_GZIP_WARN / 1024} KB)`)

  let failed = false
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
