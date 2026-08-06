/**
 * Reading a workspace file, and picking a project out of it.
 *
 * The file format is the app's own backup payload — what Settings → Backup
 * writes, what cloud sync pushes, and what `public/demos/*.json` are. The CLI
 * deliberately reads that rather than the zustand store: the store is a browser
 * object with a localStorage adapter, and a CLI that needed one would need a
 * fake browser. The payload is the seam the app already exports through.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'
import { PROJECT_ROOT } from './runtime.mjs'
import { UserError } from './errors.mjs'

export const DEMOS = {
  harbor: 'public/demos/harbor-hearth-workspace.json',
  'soft-signal': 'public/demos/soft-signal-workspace.json',
}

export class WorkspaceError extends UserError {}

/**
 * Where to read from when the user names no file.
 *
 * Looks for the file the app actually writes — `creative-companion-backup-
 * <date>.json` — in the working directory, newest first, then a bare
 * `workspace.json`. Guessing wrong is cheap because the chosen path is always
 * printed back.
 */
function discoverWorkspacePath(cwd) {
  let entries
  try {
    entries = readdirSync(cwd)
  } catch {
    return null
  }
  const backups = entries
    .filter((n) => /^creative-companion-backup-.*\.json$/.test(n))
    .map((n) => ({ n, t: statSync(join(cwd, n)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
  if (backups.length) return join(cwd, backups[0].n)
  if (entries.includes('workspace.json')) return join(cwd, 'workspace.json')
  return null
}

/**
 * @param {string|null} pathArg  explicit path, a demo name, or null to discover
 * @returns {{ workspace: object, path: string, label: string }}
 */
export function readWorkspace(pathArg, { cwd = process.cwd() } = {}) {
  let path = pathArg
  if (path && DEMOS[path]) path = resolve(PROJECT_ROOT, DEMOS[path])
  if (!path) {
    path = discoverWorkspacePath(cwd)
    if (!path) {
      throw new WorkspaceError(
        [
          'No workspace file given, and none found here.',
          '',
          'Pass one:      cc <command> path/to/backup.json',
          'Or a demo:     cc <command> harbor',
          '',
          'A workspace file is what Settings → Backup downloads',
          '(creative-companion-backup-YYYY-MM-DD.json).',
        ].join('\n')
      )
    }
  }

  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch (e) {
    throw new WorkspaceError(`Cannot read ${path} — ${e.message}`)
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    throw new WorkspaceError(`${basename(path)} is not valid JSON — ${e.message}`)
  }

  /* The same three rules `hydrateFromPayload` enforces on import. Failing here
     with the reason beats failing later inside a PDF generator, where the
     message would be about a missing property on undefined. */
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new WorkspaceError(`${basename(path)} is not a workspace file.`)
  }
  if (!Array.isArray(data.projects) || data.projects.length === 0) {
    throw new WorkspaceError(
      `${basename(path)} has no projects — it may be an empty or partial backup.`
    )
  }
  if (data.tasks != null && !Array.isArray(data.tasks)) {
    throw new WorkspaceError(`${basename(path)} has a malformed tasks list.`)
  }

  return {
    workspace: data,
    path,
    label: data.demoLabel || basename(path),
  }
}

const sameId = (a, b) => (a == null || b == null ? a == b : String(a) === String(b))

/**
 * Resolve one project from a selector.
 *
 * Accepts an exact id, a 1-based position (`#2`), or a case-insensitive name
 * match — exact first, then unique substring. An ambiguous substring is an
 * error rather than a silent first-match, because the wrong project exported
 * under the right filename is a mistake that reaches a client.
 */
export function resolveProject(workspace, selector) {
  const projects = workspace.projects || []
  if (!selector) {
    const current = projects.find((p) => sameId(p.id, workspace.currentProjectId))
    return current || projects[0]
  }

  const byId = projects.find((p) => sameId(p.id, selector))
  if (byId) return byId

  const pos = /^#(\d+)$/.exec(String(selector))
  if (pos) {
    const p = projects[Number(pos[1]) - 1]
    if (!p) {
      throw new WorkspaceError(
        `No project at position ${pos[1]} — the file has ${projects.length}.`
      )
    }
    return p
  }

  const needle = String(selector).toLowerCase()
  const exact = projects.filter((p) => String(p.name || '').toLowerCase() === needle)
  if (exact.length === 1) return exact[0]

  const partial = projects.filter((p) =>
    String(p.name || '').toLowerCase().includes(needle)
  )
  if (partial.length === 1) return partial[0]
  if (partial.length > 1) {
    throw new WorkspaceError(
      [
        `"${selector}" matches ${partial.length} projects:`,
        ...partial.map((p) => `  ${p.name} (${p.id})`),
        '',
        'Use the full name or the id.',
      ].join('\n')
    )
  }

  throw new WorkspaceError(
    [
      `No project matching "${selector}".`,
      '',
      'In this file:',
      ...projects.map((p, i) => `  #${i + 1}  ${p.name || 'Untitled'}  (${p.id})`),
    ].join('\n')
  )
}

/**
 * The tasks and pins that belong to one project.
 *
 * Unscoped rows (`projectId == null`) count as the current project's — the
 * same rule `buildPathProgressCtx` uses in the app, kept identical so the CLI's
 * progress reading and the app's rail cannot disagree.
 */
export function scopeTo(workspace, project) {
  const pid = project?.id
  return {
    tasks: (workspace.tasks || []).filter(
      (t) => t.projectId == null || sameId(t.projectId, pid)
    ),
    moodItems: (workspace.moodItems || []).filter(
      (m) => m.projectId == null || sameId(m.projectId, pid)
    ),
  }
}

/** A per-project state object shaped the way `buildPathProgressCtx` expects. */
export function progressStateFor(workspace, project) {
  return {
    ...workspace,
    currentProjectId: project?.id,
  }
}
