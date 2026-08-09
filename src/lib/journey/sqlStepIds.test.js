import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { JOURNEY_STEPS, PORTAL_PUSHABLE_STEP_IDS } from './journey'

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
 * WHAT THIS ACTUALLY GUARDS, restated 2026-08-09 because the old wording had
 * become the wrong invariant.
 *
 * It used to assert SQL ⊇ every declared path stop. That held only while every
 * stop was also pushable to a client. Directions and Brand book joined the
 * path and neither is pushable — the portal cannot show their artifact yet, so
 * `PORTAL_PUSHABLE_STEP_IDS` withholds them and no Approve button for either
 * ever reaches a client.
 *
 * The invariant that matters is the one the failure describes: **every step a
 * studio can push must be accepted by the RPC.** That is asserted below
 * against `PORTAL_PUSHABLE_STEP_IDS`, which is what the portal actually reads,
 * so the guard now tracks the thing it was always protecting rather than a
 * proxy that happened to coincide.
 *
 * This is not a weakening, and the second test is why: a step that becomes
 * pushable without a migration fails here. Making `book` pushable — the
 * obvious next change — trips it immediately.
 *
 * The SQL list may still contain MORE than is pushable. 'ideate' and 'review'
 * have been in it for a long time and stay; an id the RPC accepts but nothing
 * sends is harmless.
 */
const SUPABASE = new URL('../../../supabase', import.meta.url).pathname

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

  it('every step a studio can push is accepted by every SQL list', () => {
    const problems = []
    for (const { path, ids } of lists) {
      const missing = PORTAL_PUSHABLE_STEP_IDS.filter((id) => !ids.includes(id))
      if (missing.length) {
        problems.push(
          `${path.split('/supabase/')[1]}: missing ${missing.join(', ')}`
        )
      }
    }
    expect(
      problems,
      'A pushable step exists that the database will reject.\n' +
        'A client approving it gets "This link isn\'t valid".\n' +
        'Add the id to the SQL list in a new migration:\n  ' +
        problems.join('\n  ')
    ).toEqual([])
  })

  /**
   * The stops deliberately held back, and the reason, so that making one
   * pushable is a decision rather than an accident.
   *
   * `book` is the live case: it is a path stop, it is NOT in any SQL list, and
   * the test above passes only because it is not pushable. Add it to
   * PORTAL_PUSHABLE_STEP_IDS without a migration and the assertion above fails
   * — which is exactly the alarm that should sound.
   */
  it('names the declared stops that are withheld from clients', () => {
    const declared = JOURNEY_STEPS.map((s) => s.id)
    const withheld = declared.filter(
      (id) => !PORTAL_PUSHABLE_STEP_IDS.includes(id)
    )
    expect(withheld).toEqual(['ideate', 'book'])

    const sqlKnows = (id) => lists.every(({ ids }) => ids.includes(id))
    /* Not a requirement either way — recorded so the asymmetry is visible.
       'ideate' has been in the SQL lists since before it was a path stop;
       'book' has never been in them, which is why it cannot be pushed. */
    expect(sqlKnows('ideate')).toBe(true)
    expect(sqlKnows('book')).toBe(false)
  })
})
