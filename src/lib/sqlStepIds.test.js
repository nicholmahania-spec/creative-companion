import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { JOURNEY_STEPS } from './journey'

/**
 * The journey's step ids are restated in SQL, where nothing was watching.
 *
 * respond_client_portal_step() validates the incoming step against a hardcoded
 * list before it will record a client's approval. journeySingleSource.test.js
 * exists to catch exactly this kind of copy — and it walks `src/` only, so a
 * copy living in supabase/ is invisible to the one guard built to prevent
 * copies.
 *
 * What that costs, concretely: add a stop to journey.js — the missing Analysis
 * stage is the obvious candidate — and the studio can push it to a client, the
 * client can see it, and their approval click returns false from the RPC.
 * clientPortal.js maps a false return to "This link isn't valid", so the client
 * is told their link is broken when it is not, on the one action the portal
 * exists for. Everything about that failure points away from the cause.
 *
 * A database function cannot import from JavaScript, so the copy is
 * unavoidable. What is avoidable is it going stale silently: this fails the
 * moment the two disagree, naming the migration to update.
 *
 * The SQL list is allowed to contain MORE than the path declares — 'ideate'
 * and 'review' are Tools views the studio can also push for review, which is
 * deliberate. It may not contain LESS.
 */
const SUPABASE = new URL('../../supabase', import.meta.url).pathname

function sqlFiles() {
  const out = []
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name)
      if (name.isDirectory()) walk(full)
      else if (name.name.endsWith('.sql')) out.push(full)
    }
  }
  walk(SUPABASE)
  return out
}

/** Every `step_id_in not in ( ... )` list found, as arrays of ids. */
function declaredStepLists() {
  const found = []
  for (const path of sqlFiles()) {
    const sql = readFileSync(path, 'utf8')
    for (const m of sql.matchAll(/step_id_in\s+not\s+in\s*\(([^)]*)\)/gi)) {
      const ids = [...m[1].matchAll(/'([a-z0-9_-]+)'/gi)].map((x) => x[1])
      if (ids.length) found.push({ path, ids })
    }
  }
  return found
}

describe('SQL step-id lists track journey.js', () => {
  const lists = declaredStepLists()

  /* Guards the guard. If the pattern stops matching, every assertion below
     passes vacuously and the drift this exists to catch sails through. */
  it('finds the step lists it is meant to check', () => {
    expect(lists.length).toBeGreaterThan(0)
  })

  it('every declared path stop is accepted by every SQL list', () => {
    const declared = JOURNEY_STEPS.map((s) => s.id)
    const problems = []
    for (const { path, ids } of lists) {
      const missing = declared.filter((id) => !ids.includes(id))
      if (missing.length) {
        problems.push(
          `${path.split('/supabase/')[1]}: missing ${missing.join(', ')}`
        )
      }
    }
    expect(
      problems,
      'A stop exists in journey.js that the database will reject.\n' +
        'A client approving it gets "This link isn\'t valid".\n' +
        'Add the id to the SQL list in a new migration:\n  ' +
        problems.join('\n  ')
    ).toEqual([])
  })
})
