#!/usr/bin/env node
/**
 * Bump package.json patch version (0.2.0 → 0.2.1).
 * Run before each ship: npm run bump
 * Major/minor: npm run bump -- --minor | --major
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = resolve(root, 'package.json')
const lockPath = resolve(root, 'package-lock.json')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const parts = String(pkg.version || '0.0.0')
  .split('.')
  .map((n) => parseInt(n, 10) || 0)
while (parts.length < 3) parts.push(0)

const flag = process.argv[2]
if (flag === '--major') {
  parts[0] += 1
  parts[1] = 0
  parts[2] = 0
} else if (flag === '--minor') {
  parts[1] += 1
  parts[2] = 0
} else {
  parts[2] += 1
}

const next = parts.join('.')
pkg.version = next
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

try {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  lock.version = next
  if (lock.packages?.['']) lock.packages[''].version = next
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
} catch {
  /* lock optional */
}

console.log(`version → ${next}`)
