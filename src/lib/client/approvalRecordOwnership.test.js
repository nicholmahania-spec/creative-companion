import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * WHERE A CLIENT'S APPROVAL LIVES, AND WHERE IT MUST NOT.
 *
 * Phase 6's whole claim is that one fact — "the client said yes to this
 * version, on this date" — has exactly one home, and that the home is
 * append-only. Every failure mode this codebase has hit before is a second
 * copy of a fact drifting away from the first, so the assertions here are
 * mostly about absence: places the approval must NOT have been written to.
 *
 * Deliberately textual, like `portalRpcGates.test.js` and the Phase 0 ownership
 * tests. It cannot prove the SQL is correct; it can prove that the rules are
 * still stated in the code that ships, which is the failure the history shows.
 */

const ROOT = new URL('../../..', import.meta.url).pathname
const MIGRATIONS = join(ROOT, 'supabase/migrations')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const ALL_SQL = readdirSync(MIGRATIONS)
  .filter((n) => n.endsWith('.sql'))
  .sort()
  .map((n) => readFileSync(join(MIGRATIONS, n), 'utf8'))
  .join('\n')

const PHASE6 = read('supabase/migrations/20260819120000_review_rounds.sql')

/**
 * Source with its comments removed.
 *
 * Every assertion about "this file does not touch X" has to run against code,
 * not prose. Two of the checks below first failed on their own documentation —
 * the migration's header explains that it deliberately leaves `delivery_pack`
 * alone, and saying so tripped a rule about mentioning it. A guard that a
 * comment can break is a guard that will be silenced by deleting the comment,
 * which is the wrong thing to teach.
 */
const codeOnly = (src, sql = false) =>
  (sql ? src.replace(/^\s*--.*$/gm, '') : src)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

const PHASE6_CODE = codeOnly(PHASE6, true)

/** Every JS/JSX file under src, for the "nobody else writes this" sweeps. */
function allSource() {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (/\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name)) {
        out.push(rel)
      }
    }
  }
  walk('src')
  return out
}

const SOURCES = allSource().map((rel) => [rel, read(rel)])

describe('the approval record has one home', () => {
  it('the extractor found the migration it is checking', () => {
    /* Guards the guard. Every assertion below is a `toMatch` on this text, so a
       path that stopped resolving would turn the file into 20 silent passes. */
    expect(PHASE6).toContain('client_portal_review_responses')
    expect(SOURCES.length).toBeGreaterThan(100)
  })

  /* THE CORE INVARIANT. A response is written once and never rewritten — no
     UPDATE, and no unique key that would force one answer to replace another.
     The owner's decision D1 is append-only, latest wins; a `unique (round_id)`
     would silently convert that into first-answer-wins. */
  it('a response is never updated', () => {
    expect(
      ALL_SQL.match(/update\s+public\.client_portal_review_responses/gi),
      'an approval was rewritten — the earlier answer is gone'
    ).toBeNull()
    expect(ALL_SQL).not.toMatch(
      /delete\s+from\s+public\.client_portal_review_responses/i
    )
  })

  it('nothing forces one response per round', () => {
    /* The one uniqueness rule in this migration is on OPEN ROUNDS, not on
       responses — one open round per step, any number of answers inside it. */
    const uniques = PHASE6.match(/create unique index[\s\S]*?;/gi) || []
    expect(uniques).toHaveLength(1)
    expect(uniques[0]).toContain('client_portal_review_rounds')
    expect(uniques[0]).toContain("status = 'open'")
  })

  /* Latest-wins has to be decided by something the client cannot influence and
     that cannot tie. `created_at` is a timestamp and two rows can share one. */
  it('the latest response is chosen by the database-s own sequence', () => {
    expect(PHASE6).toMatch(/seq\s+bigint\s+generated\s+always\s+as\s+identity/i)
    expect(PHASE6).toMatch(/order\s+by\s+seq\s+desc/i)
    expect(
      PHASE6,
      'ordering by a timestamp lets two answers tie, and the tie-break would be arbitrary'
    ).not.toMatch(/order\s+by\s+created_at\s+desc/i)
  })

  /* An identical retry is one decision. A different answer is a real change of
     mind and gets its own immutable row. */
  it('an identical repeat writes nothing and still succeeds', () => {
    expect(PHASE6).toMatch(/latest\.verdict\s*=\s*status_in/i)
    expect(PHASE6).toMatch(/latest\.note\s*=\s*clean_note/i)
    expect(PHASE6).toMatch(/latest\.preferred_ref\s+is\s+not\s+distinct\s+from\s+clean_pref/i)
    expect(PHASE6).toMatch(/'ok',\s*true,\s*'duplicate',\s*true/i)
  })

  /* The mirror is allowed to exist; it is not allowed to be the record. Written
     in the same function call as its source so it cannot lag or disagree. */
  it('step_status is written only alongside the response it mirrors', () => {
    const body = PHASE6.slice(PHASE6.indexOf('create function public.respond_client_portal_step'))
    const insertAt = body.indexOf('insert into public.client_portal_review_responses')
    const mirrorAt = body.indexOf('update public.client_portals')
    expect(insertAt).toBeGreaterThan(-1)
    expect(mirrorAt).toBeGreaterThan(insertAt)
  })

  /* No local second home. The approval belongs to the client, is authored on a
     surface the studio does not control, and must not be copied into the
     project blob where a restore or a sync could resurrect a stale one. */
  it('no approval field is written onto the project, identity, or a version', () => {
    for (const [rel, src] of SOURCES) {
      if (rel.includes('client/clientPortal.js')) continue
      expect(codeOnly(src), `${rel} writes a local approval field`).not.toMatch(
        /\b(clientApprovedAt|approvalRecord|approvedVersionId|clientApproval\s*:)/
      )
    }
  })

  /* The three fields the completeness check used to accept. None of them is a
     client approval; see completeness.test.js for the full argument. */
  it('the completeness check reads the client-s answer and nothing else', () => {
    const src = read('src/lib/brain/completeness.js')
    const check = src.slice(src.indexOf("id: 'approval'"), src.indexOf("id: 'approval'") + 2400)
    expect(check).toMatch(/c\.clientApproval\?\.approved/)
    for (const substitute of ['logoClientChose', 'revisionRounds', 'feedbackLog']) {
      expect(check, `${substitute} is not a client approval`).not.toMatch(
        new RegExp(`ok:[\\s\\S]*?${substitute}`)
      )
    }
  })
})

describe('approval is not a document version', () => {
  /* The Master Plan's version model lists `changes requested` and `approved`
     among the events that could freeze a document. The locked Phase 6 contract
     does not write them, and that is a decision rather than an oversight: an
     approval is a judgement ABOUT a frozen composition, and minting a second
     Version whose contents equal the first would be a duplicate source of truth
     for the same composition. The Presentation Version under review is the one
     Phase 5 already froze. */
  it('the freeze events for review outcomes stay unwritten', () => {
    for (const [rel, src] of SOURCES) {
      if (rel.includes('documents/documentModel.js')) continue
      expect(codeOnly(src), `${rel} writes a review outcome as a freeze event`).not.toMatch(
        /freezeEvent:\s*['"](changesRequested|approved|delivered)['"]/
      )
    }
  })

  it('nothing in the review path mints a version or a snapshot', () => {
    for (const rel of [
      'src/lib/client/clientPortal.js',
      'src/lib/client/reviewArtifact.js',
      'src/features/client-portal/PublicClientPortal.jsx',
      'src/features/client-portal/ProjectOverviewShare.jsx',
    ]) {
      const src = read(rel)
      expect(codeOnly(src), `${rel} mints a version`).not.toMatch(
        /mintDocumentVersionId|buildDocumentVersionData|buildPresentationVersionData|buildIdentitySnapshot/
      )
    }
  })

  it('the review tables are not another version store', () => {
    /* A Version carries a composition. These rows carry a reference to one. */
    expect(PHASE6).not.toMatch(/composition\s+jsonb/i)
    expect(PHASE6).toMatch(/target_ref\s+text\s+not\s+null/i)
  })
})

describe('delivery is untouched', () => {
  /* VERIFIED ≠ DELIVERED. Approval is not a delivery gate, does not flip a
     delivery status, and does not reach the pack. Phase 8 is where delivery
     consumes approved state; this phase only makes that state exist. */
  it('the migration goes nowhere near delivery', () => {
    for (const word of ['delivery_pack', 'delivery_status', 'delivery_note', 'delivery_viewed_at']) {
      expect(PHASE6_CODE, `Phase 6 touched ${word}`).not.toContain(word)
    }
  })

  it('no review code calls the delivery publisher', () => {
    for (const rel of [
      'src/lib/client/clientPortal.js',
      'src/lib/client/reviewArtifact.js',
      'src/features/client-portal/PublicClientPortal.jsx',
      'src/features/client-portal/ProjectOverviewShare.jsx',
      'src/lib/brain/completeness.js',
    ]) {
      expect(codeOnly(read(rel)), `${rel} reaches into delivery`).not.toMatch(
        /publishDelivery/
      )
    }
  })

  /* The reverse direction matters just as much: delivery must not start asking
     whether an approval exists, or approval becomes a gate by the back door. */
  it('delivery does not read the approval record', () => {
    for (const rel of [
      'src/lib/client/brandDelivery.js',
      'src/features/client-portal/DeliverToClient.jsx',
    ]) {
      expect(codeOnly(read(rel)), `${rel} gates on approval`).not.toMatch(
        /client_portal_review_(rounds|responses)|latestIdentityApproval/
      )
    }
  })
})
