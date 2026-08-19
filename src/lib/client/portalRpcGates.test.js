import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * THE AUTHORIZATION GATES ON EVERY ANONYMOUS SURFACE, asserted against the SQL
 * that actually runs.
 *
 * There is no login on /f/, /c/ or /d/. The whole authorization model is: the
 * link id is the credential, and a SECURITY DEFINER function decides what a
 * holder of that id may see or do. Those functions are the entire boundary
 * between one studio's clients and another's — RLS cannot help, because these
 * run as the definer precisely so anon never touches the tables.
 *
 * Every one of them is written more than once. `get_client_portal` has been
 * defined in three migrations, `respond_client_portal_step` in three, and each
 * rewrite restates the gates by hand. Migration 20260728024000 exists because
 * one such restatement lost a NULL check and let a client approve a step that
 * had never been pushed to them; migration 20260801120000 exists because
 * another restatement was still carrying the pre-fix form months later. A
 * `create or replace` that drops a `revoked_at is null` would be the same
 * class of mistake, would apply cleanly, and nothing in this repo would notice.
 *
 * So this reads the migrations in filename order, keeps the LAST definition of
 * each function — the one the database ends up with — and asserts the gates on
 * it. It is deliberately textual: it cannot prove the SQL is correct, only that
 * each gate is still present in the body that ships. That is the failure mode
 * the history actually shows.
 *
 * sqlStepIds.test.js reads these same files for a different invariant.
 */

const MIGRATIONS = new URL('../../../supabase/migrations', import.meta.url).pathname

/**
 * name → { file, header, body } for the last definition of every
 * `public.<fn>` in migration order. `header` is everything from `create` to the
 * dollar-quote (where `security definer` and `set search_path` live); `body` is
 * what is between the quotes.
 */
function effectiveFunctions() {
  const out = new Map()
  const files = readdirSync(MIGRATIONS).filter((n) => n.endsWith('.sql')).sort()
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), 'utf8')
    for (const m of sql.matchAll(
      /create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\(/gi
    )) {
      const rest = sql.slice(m.index)
      const tag = /\$function\$|\$\$/.exec(rest)
      if (!tag) continue
      const open = tag.index + tag[0].length
      const close = rest.indexOf(tag[0], open)
      if (close < 0) continue
      out.set(m[1], {
        file,
        header: rest.slice(0, tag.index),
        body: rest.slice(open, close),
      })
    }
  }
  return out
}

const FNS = effectiveFunctions()
const ALL_SQL = readdirSync(MIGRATIONS)
  .filter((n) => n.endsWith('.sql'))
  .map((n) => readFileSync(join(MIGRATIONS, n), 'utf8'))
  .join('\n')

/** Every function an unauthenticated visitor can call. */
const ANON_RPCS = [
  'get_discovery_share',
  'submit_discovery_share',
  'get_client_portal',
  'get_client_portal_messages',
  'post_client_portal_message',
  'respond_client_portal_step',
  'submit_client_portal_form',
  'submit_client_portal_survey',
  'get_brand_delivery',
  'mark_brand_delivery_viewed',
  'submit_brand_delivery_reaction',
  'is_client_upload_target',
]

/** The three that read or write a published brand book. */
const DELIVERY_RPCS = [
  'get_brand_delivery',
  'mark_brand_delivery_viewed',
  'submit_brand_delivery_reaction',
]

describe('the extractor finds what it is meant to check', () => {
  /* Guards the guard: a parser that silently matches nothing turns every
     assertion below into a pass. Same reasoning as sqlStepIds.test.js. */
  it('resolves every anon RPC to a definition', () => {
    const missing = ANON_RPCS.filter((n) => !FNS.has(n))
    expect(missing, 'the SQL parser stopped matching — every gate below is now vacuous').toEqual([])
  })

  it('keeps the last definition, not the first', () => {
    /* get_client_portal is now defined in four migrations. The review-artifact
       one ships, and it is the only one returning `review_artifacts` — while
       still returning `delivery_status`, which the definition before it added.
       A rewrite that dropped an earlier OUT column would show up here as a
       missing match rather than as a blank field on a client's screen. */
    expect(FNS.get('get_client_portal').file).toBe('20260812120000_review_artifacts.sql')
    expect(FNS.get('get_client_portal').header).toMatch(/delivery_status\s+text/)
    expect(FNS.get('get_client_portal').header).toMatch(/review_artifacts\s+jsonb/)
  })

  /**
   * G10.5 AT THE ONE LAYER THAT CANNOT BE ROUTED AROUND.
   *
   * "Approvals attach to showable artifacts, not bare stage names." The portal
   * UI enforces it too, but a UI rule is a rule about one caller — the RPC is
   * reachable by anyone holding the link. A response to a step with nothing
   * stamped against it is refused in the database.
   */
  /* Phase 6 changed the return type from boolean to jsonb, so a refusal is now
     `{ok:false, reason:...}` rather than a bare `false`. The GATES are the same
     lines in the same order — only the shape of "no" changed, and this helper
     is what keeps the assertions about the gate rather than about the literal.

     `REFUSES` deliberately requires `false`: matching `jsonb_build_object` alone
     would pass on a success return and quietly turn each check below vacuous.

     It also requires the refusal to sit IMMEDIATELY after its condition. A
     first draft allowed any gap, and a mutation check proved that vacuous too:
     with a wildcard between them, flipping one gate to return success still
     matched, because the pattern scanned on to the next refusal further down
     the function. Every assertion below was passing for the wrong reason. */
  const REFUSES = (cond) =>
    new RegExp(
      `${cond}\\s*then\\s*return\\s+jsonb_build_object\\(\\s*'ok',\\s*false`,
      'i'
    )

  it('an approval requires an artifact that was actually shown', () => {
    const body = FNS.get('respond_client_portal_step').body
    expect(body).toMatch(/shown\s*:=\s*coalesce\(\s*arts\s*,\s*'\{\}'::jsonb\s*\)\s*->\s*step_id_in/i)
    expect(body).toMatch(REFUSES(String.raw`if\s+shown\s+is\s+null`))
    expect(body).toMatch(REFUSES(String.raw`if\s+fingerprint\s*=\s*''`))
  })

  /**
   * PHASE 6 GATES, asserted the same way and for the same reason: each one is
   * restated by hand in whatever migration redefines this function next.
   */
  it('a response needs an open round whose target is what is on screen', () => {
    const body = FNS.get('respond_client_portal_step').body
    /* The round is selected by the server from the portal and step — never
       named by the caller — and only an OPEN one qualifies. */
    expect(body).toMatch(/from\s+public\.client_portal_review_rounds[\s\S]*?status\s*=\s*'open'/i)
    expect(body).toMatch(REFUSES(String.raw`if\s+rnd\.id\s+is\s+null`))
    /* Work the studio has moved on from cannot be answered: the stamped
       fingerprint must still be the one this round was opened against. */
    expect(body).toMatch(
      REFUSES(String.raw`rnd\.target_ref\s+is\s+distinct\s+from\s+fingerprint`)
    )
  })

  it('the stored response carries the round-s target, not the caller-s', () => {
    const { header, body } = FNS.get('respond_client_portal_step')
    expect(body).toMatch(/values\s*\([\s\S]*?rnd\.target_ref/i)
    // No target parameter exists to be spoofed through.
    expect(header).not.toMatch(/target_ref_in/i)
  })

  /* A presentation of options is shown and answered; it is not approved. The
     portal hides the button, and this is the half a caller cannot skip. */
  it('a feedback-only unit cannot be approved', () => {
    const body = FNS.get('respond_client_portal_step').body
    expect(body).toMatch(
      REFUSES(String.raw`unit_name\s*=\s*'ideate'\s+and\s+status_in\s*=\s*'approved'`)
    )
  })

  /* The client's preferred Direction has to be one they were actually shown,
     checked against the stamped artifact rather than against live Directions. */
  it('a named direction must appear in the artifact that was shown', () => {
    const body = FNS.get('respond_client_portal_step').body
    /* Type-guarded, not just null-guarded. `coalesce` alone catches SQL NULL and
       not JSON `null` or an object, both of which make `jsonb_array_elements`
       RAISE — turning an intended refusal into a 500 on a public endpoint. */
    expect(body).toMatch(/jsonb_typeof\(\s*shown\s*->\s*'payload'\s*->\s*'items'\s*\)\s*=\s*'array'/i)
    expect(body).toMatch(REFUSES(String.raw`if\s+not\s+known_direction`))
    expect(body).toMatch(REFUSES(String.raw`unit_name\s*<>\s*'ideate'`))
  })

  /* Append-only, in the one place it can be enforced. An UPDATE against the
     responses table anywhere in the migrations would be the whole defect back:
     a client's earlier answer overwritten by their later one. */
  it('a response is never updated, only appended', () => {
    const updates = ALL_SQL.match(
      /update\s+public\.client_portal_review_responses/gi
    )
    expect(updates, 'a response was rewritten somewhere — the history is the record').toBeNull()
  })

  /* Opening a round is publication, and publication is the studio's. A link
     holder may answer what they were shown and may never decide what is shown. */
  it('only an account holder can open a review round', () => {
    const { header, body } = FNS.get('open_client_portal_review_round')
    expect(header.toLowerCase()).toContain('security definer')
    expect(header.toLowerCase()).toMatch(/set\s+search_path/)
    expect(body).toMatch(/p\.owner_id\s*=\s*auth\.uid\(\)/i)
    /* `owns is null`, not `not owns`: the ownership read is a `select … into`
       that returns no row for a portal this account does not own. */
    expect(body).toMatch(REFUSES(String.raw`if\s+owns\s+is\s+null`))
    expect(ALL_SQL).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.open_client_portal_review_round\s*\(/i
    )
    /* Granted to authenticated and NOT to anon — the one grant in this file
       that must not include it. */
    const grants = ALL_SQL.match(
      /grant\s+execute\s+on\s+function\s+public\.open_client_portal_review_round\s*\([^)]*\)\s+to\s+([^;]*);/i
    )
    expect(grants).not.toBeNull()
    expect(grants[1]).not.toMatch(/anon/i)
  })

  /* WHICH artifact, observed by the server rather than claimed by the caller.
     A fingerprint taken from the client would be an approval describing
     itself. */
  it('records the fingerprint from the row, never from the caller', () => {
    const { header, body } = FNS.get('respond_client_portal_step')
    expect(body).toMatch(/fingerprint\s*:=\s*coalesce\(\s*shown\s*->>\s*'fingerprint'/i)
    expect(body).toMatch(/'artifact',\s*fingerprint/i)
    // No fingerprint parameter exists to be spoofed through.
    expect(header).not.toMatch(/fingerprint/i)
  })

  /* An artifact for a stop the studio has switched off must not travel. A
     withdrawn stop that kept showing its artwork would be work the client was
     told to stop looking at. */
  it('serves artifacts only for steps that are currently visible', () => {
    expect(FNS.get('get_client_portal').body).toMatch(
      /coalesce\(\s*step_visibility\s*->\s*key\s*,\s*'false'::jsonb\s*\)\s*=\s*'true'::jsonb/i
    )
  })
})

describe('every anonymous entry point is hardened the same way', () => {
  for (const name of ANON_RPCS) {
    it(`${name} runs as definer with a pinned search_path`, () => {
      const { header } = FNS.get(name)
      expect(header.toLowerCase()).toContain('security definer')
      expect(header.toLowerCase()).toMatch(/set\s+search_path/)
    })

    it(`${name} is taken off public and granted only to anon/authenticated`, () => {
      expect(ALL_SQL).toMatch(
        new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${name}\\s*\\(`, 'i')
      )
      expect(ALL_SQL).toMatch(
        new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${name}\\s*\\([^)]*\\)\\s+to\\s+[^;]*anon`, 'i')
      )
    })
  }
})

describe('a revoked or expired link stops resolving', () => {
  for (const name of ANON_RPCS) {
    it(`${name} refuses a revoked link`, () => {
      expect(
        FNS.get(name).body,
        `${name} would keep serving a link the designer has killed`
      ).toMatch(/revoked_at\s+is\s+null/i)
    })

    it(`${name} honours expires_at`, () => {
      expect(FNS.get(name).body).toMatch(/expires_at\s+is\s+null\s+or\s+\w*\.?expires_at\s*>\s*now\(\)/i)
    })
  }
})

describe('unpublished material cannot be reached', () => {
  for (const name of DELIVERY_RPCS) {
    it(`${name} requires delivery_status = 'delivered'`, () => {
      expect(
        FNS.get(name).body,
        `${name} would expose a brand book the designer has not sent`
      ).toMatch(/delivery_status\s*=\s*'delivered'/i)
    })
  }

  /**
   * The portal and the reveal are deliberately different payloads. /c/ may
   * learn THAT a delivery exists so it can offer the link; it must never carry
   * the note or the pack, or a client with the portal page already open would
   * hold the book before it was handed over.
   */
  it('the portal payload carries the delivery status and nothing else about it', () => {
    const { header, body } = FNS.get('get_client_portal')
    const returned = `${header} ${body}`
    expect(returned).toMatch(/delivery_status/)
    expect(returned).not.toMatch(/delivery_note/)
    expect(returned).not.toMatch(/delivery_pack/)
  })

  /* Taking a delivery back is `delivery_status = 'not_delivered'`, and the gate
     above is what makes that a real retraction rather than a label change. */
  it('the reveal payload is the only place the pack is selected', () => {
    const packReaders = [...FNS.entries()]
      .filter(([, v]) => /\bdelivery_pack\b/.test(v.body))
      .map(([k]) => k)
    expect(packReaders).toEqual(['get_brand_delivery'])
  })

  /* A step the studio never pushed cannot be approved — the bug migration
     20260728024000 was written for, restated in 20260801120000. */
  it('a step that was never pushed cannot be responded to', () => {
    const body = FNS.get('respond_client_portal_step').body
    expect(body).toMatch(/coalesce\(\s*vis\s*->\s*step_id_in\s*,\s*'false'::jsonb\s*\)\s*=\s*'true'::jsonb/i)
  })

  /* The brief snapshot is withheld until the form is actually sent, so a
     portal id alone does not read the studio's working answers. */
  it('the brief snapshot is empty until the form has been sent', () => {
    expect(FNS.get('get_client_portal').body).toMatch(
      /when\s+form_status\s+in\s*\(\s*'pending'\s*,\s*'submitted'\s*\)\s+then\s+detective_answers\s+else\s+'\{\}'::jsonb/i
    )
  })
})

describe('one link reaches exactly one record', () => {
  /**
   * Isolation on these surfaces is not RLS — it is the WHERE clause. Each
   * function must constrain to the single id it was handed; a body that
   * selected without one would return every studio's portals to any caller.
   */
  const ID_BOUND = /where[\s\S]*?\b(id|portal_id|share_id|m\.portal_id|p\.id|s\.id)\s*=\s*(portal_id|portal_id_in|share_id|target)\b/i
  for (const name of ANON_RPCS.filter((n) => n !== 'is_client_upload_target')) {
    it(`${name} constrains to the id it was given`, () => {
      expect(FNS.get(name).body).toMatch(ID_BOUND)
    })
  }

  /* The upload gate takes a storage folder name rather than an id, so it has
     to prove the folder IS a live share or portal before allowing a write. */
  it('the upload target must be a uuid naming a live share or portal', () => {
    const body = FNS.get('is_client_upload_target').body
    expect(body).toMatch(/\[0-9a-f\]\{8\}-/)
    expect(body).toMatch(/from\s+public\.discovery_shares/i)
    expect(body).toMatch(/from\s+public\.client_portals/i)
    // …and be still accepting input, not merely existing.
    expect(body).toMatch(/form_status\s+not\s+in\s*\(\s*'submitted'\s*,\s*'not_sent'\s*\)/i)
  })
})

describe('the one-shot writes stay one-shot', () => {
  /**
   * Every client-side write is a single atomic UPDATE with its state gate in
   * the WHERE clause, then GET DIAGNOSTICS — never SELECT-then-UPDATE, which
   * two concurrent submits both pass. Migration 20260728023723 is the record of
   * that being got wrong once.
   */
  const cases = [
    ['submit_client_portal_form', /form_status\s+not\s+in\s*\(\s*'submitted'\s*,\s*'not_sent'\s*\)/i],
    ['submit_client_portal_survey', /survey_status\s*=\s*'sent'/i],
    ['submit_brand_delivery_reaction', /delivery_reaction\s+is\s+null/i],
    ['mark_brand_delivery_viewed', /delivery_viewed_at\s+is\s+null/i],
    ['submit_discovery_share', /status\s*=\s*'pending'/i],
  ]
  for (const [name, gate] of cases) {
    it(`${name} gates in the UPDATE, not before it`, () => {
      const body = FNS.get(name).body
      expect(body).toMatch(gate)
      expect(body).toMatch(/get\s+diagnostics\s+\w+\s*=\s*row_count/i)
      expect(
        body,
        'a read-then-write here lets two concurrent submits both succeed'
      ).not.toMatch(/select[\s\S]*into[\s\S]*from\s+public\.(client_portals|discovery_shares)[\s\S]*update/i)
    })
  }

  it('client writes are rate limited so a link holder cannot loop', () => {
    for (const name of ['post_client_portal_message', 'respond_client_portal_step']) {
      expect(FNS.get(name).body).toMatch(/interval\s+'5 minutes'/i)
    }
  })

  it('client payloads are size-bounded server-side, not only in the app', () => {
    for (const name of ['submit_client_portal_form', 'submit_client_portal_survey', 'submit_discovery_share']) {
      expect(FNS.get(name).body).toMatch(/pg_column_size\([\s\S]*?\)\s*>\s*\d+/i)
    }
  })
})

describe('the owner tables are never reachable without an account', () => {
  const schema = readFileSync(
    new URL('../../../supabase/schema.sql', import.meta.url).pathname,
    'utf8'
  )

  it('client_portals has RLS on, scoped to the owner on every verb', () => {
    expect(schema).toMatch(/alter table public\.client_portals enable row level security/i)
    for (const verb of ['view', 'insert', 'update', 'delete']) {
      expect(schema.toLowerCase()).toContain(`can ${verb} own client portals`)
    }
    /* Four policies, five owner checks: update carries both `using` (which row
       may be touched) and `with check` (what it may be changed to). Without the
       second, an owner could reassign owner_id and hand a portal to someone
       else's account. */
    const block = schema.slice(
      schema.indexOf('alter table public.client_portals enable row level security'),
      schema.indexOf('create table if not exists public.client_portal_messages')
    )
    expect([...block.matchAll(/auth\.uid\(\)\s*=\s*owner_id/g)]).toHaveLength(5)
    expect(block).toMatch(
      /for update using \(auth\.uid\(\) = owner_id\) with check \(auth\.uid\(\) = owner_id\)/i
    )
  })

  it('a message is only visible to the owner of its portal', () => {
    expect(schema).toMatch(
      /Owners can view messages on own portals[\s\S]*?auth\.uid\(\)\s*=\s*\(select owner_id from public\.client_portals where id = portal_id\)/i
    )
  })

  it('the studio cannot post as the client', () => {
    expect(schema).toMatch(/Owners can insert studio messages on own portals[\s\S]*?sender\s*=\s*'studio'/i)
  })
})
