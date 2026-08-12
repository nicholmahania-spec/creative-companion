import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { MAX_UPLOAD_BYTES } from './clientUploads'

/**
 * The half of the attachment trust boundary that lives in SQL.
 *
 * WHAT THIS CAN AND CANNOT DO, stated up front so nobody reads a green tick
 * here as more than it is. There is no Postgres in this test runner, so these
 * are assertions about the TEXT of the migrations, not about a database. They
 * cannot prove `sanitize_client_attachments()` returns the right JSON. What
 * they can do is fail the moment someone rewrites a submit RPC — which happens
 * often in this repo, because `create or replace` restates the whole body
 * every time a gate is added — and drops the sanitiser on the way past.
 *
 * That is the failure worth catching. 20260801120000 had to re-add the
 * liveness gate to five functions for exactly this reason: a `create or
 * replace` is a full rewrite, and anything the author forgets to carry
 * forward is silently deleted. The sanitiser is one line inside two of those
 * bodies, and losing it would reopen P2-1 with nothing on screen to say so.
 *
 * The behavioural half is in attachmentUrl.test.js, which covers what the
 * browser will dereference. Neither file substitutes for the other.
 */

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations')

function migration(match) {
  const file = readdirSync(MIGRATIONS).find((f) => f.includes(match))
  if (!file) throw new Error(`no migration matching "${match}"`)
  return readFileSync(join(MIGRATIONS, file), 'utf8')
}

/** The body of one `create or replace function` block, up to its `$$;` close. */
function functionBody(sql, name) {
  const start = sql.indexOf(`function public.${name}(`)
  if (start === -1) return ''
  const rest = sql.slice(start)
  const end = rest.search(/\$(function)?\$;/)
  return end === -1 ? rest : rest.slice(0, end)
}

describe('client attachment sanitising is wired into both submit RPCs', () => {
  const sql = migration('client_attachment_url_trust')

  for (const fn of ['submit_client_portal_form', 'submit_discovery_share']) {
    it(`${fn} routes its payload through sanitize_client_attachments`, () => {
      const body = functionBody(sql, fn)
      expect(body, `${fn} is not defined in this migration`).not.toBe('')
      expect(
        body,
        `${fn} no longer sanitises attachments — a create-or-replace elsewhere has probably dropped the call, reopening audit finding P2-1`
      ).toContain('public.sanitize_client_attachments(')
    })

    it(`${fn} writes the sanitised value, not the raw one`, () => {
      /* Calling the sanitiser and then storing the original is the shape of
         this mistake that a "does it mention the function" check would miss. */
      const body = functionBody(sql, fn)
      expect(body).toMatch(/(submitted_answers|answers)\s*=\s*cleaned/)
    })

    it(`${fn} keeps its liveness and single-use gates`, () => {
      const body = functionBody(sql, fn)
      expect(body).toContain('revoked_at is null')
      expect(body).toContain('expires_at is null or expires_at > now()')
      expect(body).toContain('get diagnostics')
    })
  }
})

describe('the sanitiser proves bucket, folder and existence', () => {
  const body = functionBody(
    migration('client_attachment_url_trust'),
    'sanitize_client_attachments'
  )

  it('binds the object folder to the target id', () => {
    /* This is the check that stops one portal referencing another portal's
       object — the cross-tenant half of P2-1. */
    expect(body).toContain("(storage.foldername(object_name))[1] is distinct from target::text")
  })

  it('requires the object to actually exist in the client-uploads bucket', () => {
    expect(body).toContain('from storage.objects o')
    expect(body).toContain("o.bucket_id = 'client-uploads'")
    expect(body).toContain('o.name = object_name')
  })

  it('stamps the verified key onto the entry as `path`', () => {
    expect(body).toContain("'path', object_name")
  })

  it('is not reachable directly by anon or authenticated', () => {
    const sql = migration('client_attachment_url_trust')
    expect(sql).toContain(
      'revoke all on function public.sanitize_client_attachments(jsonb, uuid) from public'
    )
    expect(sql).not.toMatch(
      /grant execute on function public\.sanitize_client_attachments[^;]*to[^;]*anon/
    )
  })
})

/**
 * The verified live configuration, read from project `shzkqbtoepqqdkjgupry` on
 * 2026-08-12 via `storage.buckets` and `pg_policies`.
 *
 * This is a TRANSCRIPT, not an intention. It is what the database actually
 * said, and the migration's whole job is to reproduce it — so the assertions
 * below compare the migration against this, rather than against what someone
 * thought the config was. An earlier draft was written from schema.sql's
 * comment and got the policy name, its roles, and a size limit wrong; all
 * three would have passed a test written from the same wrong assumption.
 *
 * If this ever needs updating, update it from a query, never from a migration.
 */
const VERIFIED = {
  buckets: {
    'client-uploads': {
      public: true,
      fileSizeLimit: 8388608,
      mime: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'],
    },
    'workspace-images': {
      public: true,
      fileSizeLimit: 8388608,
      mime: [
        'image/png', 'image/jpeg', 'image/gif',
        'image/webp', 'image/avif', 'image/svg+xml',
      ],
    },
  },
  /* Policy names exactly as production spells them. The name is load-bearing:
     `drop policy if exists` on the wrong name leaves the real policy standing
     and the `create` adds a second permissive one beside it. */
  policies: [
    'client-uploads anon insert',
    'workspace-images owner read',
    'workspace-images owner insert',
    'workspace-images owner update',
    'workspace-images owner delete',
  ],
}

describe('storage configuration reproduces the verified live project', () => {
  const sql = migration('storage_config_reproducible')

  for (const [bucket, cfg] of Object.entries(VERIFIED.buckets)) {
    it(`declares ${bucket} with its verified limit and MIME list`, () => {
      const start = sql.indexOf(`'${bucket}',\n  '${bucket}',`)
      expect(start, `${bucket} is not declared`).toBeGreaterThan(-1)
      const block = sql.slice(start, sql.indexOf(';', start))
      expect(block).toContain(String(cfg.fileSizeLimit))
      for (const type of cfg.mime) expect(block).toContain(`'${type}'`)
    })
  }

  it('keeps SVG and PDF out of the anonymous bucket', () => {
    /* Anonymous writes + Supabase serving the stored content-type means a
       stored .svg runs script on the supabase.co origin (20260731130000).
       workspace-images legitimately allows SVG; client-uploads must not. */
    const start = sql.indexOf("'client-uploads',\n  'client-uploads',")
    const block = sql.slice(start, sql.indexOf(';', start))
    expect(block).not.toContain("'image/svg+xml'")
    expect(block).not.toContain("'application/pdf'")
  })

  for (const name of VERIFIED.policies) {
    it(`restates the live policy "${name}" under its real name`, () => {
      expect(sql).toContain(`drop policy if exists "${name}" on storage.objects`)
      expect(sql).toContain(`create policy "${name}"`)
    })
  }

  it('declares no policy production does not have', () => {
    const declared = [...sql.matchAll(/create policy "([^"]+)"/g)].map((m) => m[1])
    expect(declared.sort()).toEqual([...VERIFIED.policies].sort())
  })

  it('never sets bucket visibility on an existing bucket', () => {
    /* The `on conflict` clauses must not carry `public`. Flipping a live
       bucket's visibility from a migration whose stated job is "write down
       what already exists" is how a config change becomes an outage — every
       URL already stored in an answers document would 404 at once. Making
       client-uploads private is P2-2's decision, not this file's. */
    const conflictBlocks = sql.match(/on conflict \(id\) do update[\s\S]*?;/g) || []
    expect(conflictBlocks.length).toBe(Object.keys(VERIFIED.buckets).length)
    for (const block of conflictBlocks) {
      expect(block, 'an on-conflict clause is setting `public`').not.toMatch(
        /\bset\b[\s\S]*\bpublic\s*=/
      )
    }
  })

  it('leaves brand-assets to the migration that already owns it', () => {
    /* Two migrations with authority over one bucket is how they drift.
       Comments are stripped first — this file names brand-assets in prose to
       explain why it stays out of it, and that sentence is the point. */
    const statements = sql.replace(/--[^\n]*/g, '')
    expect(statements).not.toContain('brand-assets')
  })

  it('does not add a SELECT policy for client-uploads', () => {
    expect(sql).not.toMatch(/create policy[^;]*client-uploads[^;]*for select/i)
  })
})

describe('the anonymous upload size cap is enforced at the storage boundary', () => {
  const sql = migration('storage_config_reproducible')

  it('pins client-uploads to exactly the browser limit', () => {
    /* Audit P2-5. The two numbers must agree to the byte in both directions: a
       file storage would refuse but the browser accepts fails in front of a
       stranger on a phone, and a file the browser refuses but storage accepts
       is the client-side-only cap this finding was about.

       Note the finding's premise was half wrong and the live check corrected
       it — production already carried this limit. What was missing was the
       repo's ability to reproduce it, and anything to notice if it vanished.
       This test is that something. */
    expect(MAX_UPLOAD_BYTES).toBe(8 * 1024 * 1024)
    expect(VERIFIED.buckets['client-uploads'].fileSizeLimit).toBe(MAX_UPLOAD_BYTES)
    const start = sql.indexOf("'client-uploads',\n  'client-uploads',")
    expect(sql.slice(start, sql.indexOf(';', start))).toContain(String(MAX_UPLOAD_BYTES))
  })

  it('carries the limit through on conflict, so an existing bucket gets it too', () => {
    expect(sql).toMatch(/on conflict \(id\) do update[\s\S]*file_size_limit = excluded\.file_size_limit/)
  })
})

describe('P2-2 — client-uploads is private and stays that way', () => {
  const sql = migration('client_uploads_private')

  it('makes the bucket non-public', () => {
    expect(sql).toMatch(/update storage\.buckets\s+set public = false\s+where id = 'client-uploads'/)
  })

  it('adds NO anonymous SELECT policy, in this or any other migration', () => {
    /* The contract, not the wording. An anon SELECT on storage.objects would
       hand read access back to exactly the audience revocation is about, and
       — because POST /storage/v1/object/list/<bucket> runs storage.search() as
       SECURITY INVOKER — would return a directory of every live share and
       portal id. Scanned across ALL migrations so a later file cannot quietly
       reintroduce it. */
    const all = readdirSync(MIGRATIONS)
      .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
      .join('\n')
      .replace(/--[^\n]*/g, '')

    const policies = [...all.matchAll(/create policy\s+"([^"]+)"([\s\S]*?);/g)]
    for (const [body, name] of policies.map((m) => [m[0], m[1]])) {
      const anon = /\bto\b[^(]*\banon\b/.test(body)
      const select = /\bfor\s+select\b/.test(body)
      expect(
        anon && select,
        `policy "${name}" grants anonymous SELECT on storage — this is the listing hole 20260731120000 closed`
      ).toBe(false)
    }
  })

  it('keeps the anonymous INSERT path intact, so /f/ and /c/ can still attach', () => {
    /* Making the bucket private must not stop a client attaching a photo. The
       write gate is unchanged and still lives in 20260812121000. */
    const parity = migration('storage_config_reproducible')
    expect(parity).toContain('create policy "client-uploads anon insert"')
    expect(parity).toContain('to anon, authenticated')
    expect(sql).not.toContain('client-uploads anon insert')
  })

  it('gives authenticated owners a scoped read, which signing requires', () => {
    expect(sql).toContain('create policy "client-uploads owner read"')
    expect(sql).toContain('for select')
    expect(sql).toContain('to authenticated')
    expect(sql).toContain('public.is_client_upload_owner((storage.foldername(name))[1])')
  })

  it('scopes that read by real ownership, not by holding the folder id', () => {
    const body = functionBody(sql, 'is_client_upload_owner')
    expect(body).toContain('auth.uid() is null')
    expect(body).toContain('p.owner_id = auth.uid()')
    expect(body).toContain('s.owner_id = auth.uid()')
  })

  it('does not let anon reach the ownership oracle', () => {
    expect(sql).toContain('revoke execute on function public.is_client_upload_owner(text) from anon')
    expect(sql).toContain('grant execute on function public.is_client_upload_owner(text) to authenticated')
  })

  it('migrates no existing objects or references, because there are none', () => {
    /* Verified live 2026-08-12: 0 objects in the bucket, 0 attachment entries
       across all seven storage locations. A data migration here would be
       inventing work — and, worse, would be code nobody could test. */
    expect(sql).not.toMatch(/\binsert into\b|\bdelete from\b/i)
    expect(sql.replace(/--[^\n]*/g, '')).not.toMatch(/update public\./i)
  })

  it('touches no other bucket', () => {
    const statements = sql.replace(/--[^\n]*/g, '')
    expect(statements).not.toContain('workspace-images')
    expect(statements).not.toContain('brand-assets')
  })
})

describe('P2-2 — the anonymous surface cannot read the bucket', () => {
  it('BriefAttach imports no signing path', () => {
    /* The strongest available guard on "/f/ and /c/ never read
       client-uploads": the anonymous component cannot reach the module that
       mints URLs. A future edit that renders a stored URL there has to add an
       import, and this fails when it does. */
    const src = readFileSync(
      join(process.cwd(), 'src/features/brief/BriefAttach.jsx'),
      'utf8'
    )
    expect(src).not.toContain('attachmentAccess')
    expect(src).not.toContain('useAttachmentUrls')
    expect(src).not.toMatch(/createSignedUrl|getPublicUrl/)
    /* And it must not fall back to the raw stored string either. */
    expect(src).not.toMatch(/<img\s+src=\{f\.url\}/)
  })
})

describe('P2-3 — link RPCs are closed to anon', () => {
  const sql = migration('revoke_links_on_project_delete')

  for (const fn of [
    'public.revoke_project_links(text)',
    'public.restore_project_links(uuid[], uuid[])',
  ]) {
    it(`${fn} revokes execute from anon by name`, () => {
      /* `revoke ... from public` does NOT remove Supabase's explicit grant to
         anon — verified live, has_function_privilege('anon', …) was true for
         seven functions in this directory that only revoke from PUBLIC. */
      expect(sql).toContain(`revoke execute on function ${fn} from anon`)
    })

    it(`${fn} still grants execute to authenticated`, () => {
      expect(sql).toContain(`grant execute on function ${fn} to authenticated`)
    })
  }

  it('leaves both function bodies untouched by the grant fix', () => {
    /* The defect was in the grants, not the logic. Both bodies keep their own
       independent refusal of an anonymous caller, which is why this was never
       exploitable — and why it must not be the ONLY refusal. */
    for (const fn of ['revoke_project_links', 'restore_project_links']) {
      expect(functionBody(sql, fn)).toContain('auth.uid() is null')
    }
    expect(functionBody(sql, 'revoke_project_links')).toContain('revoked_at = now()')
    expect(functionBody(sql, 'restore_project_links')).toContain('revoked_at = null')
  })
})

describe('every function this workstream grants is closed to anon', () => {
  /* The generalising invariant, so the next helper added here cannot repeat
     the defect. Any function granted to `authenticated` in one of this
     audit's migrations must also revoke execute from `anon` by name — the
     PUBLIC revoke that reads as if it does this does not. */
  const ours = readdirSync(MIGRATIONS).filter((f) => f.startsWith('202608121'))

  for (const file of ours) {
    const sql = readFileSync(join(MIGRATIONS, file), 'utf8')
    const granted = [
      ...sql.matchAll(/grant execute on function (public\.[^;]+?) to ([^;]+);/g),
    ]
    for (const [, signature, roles] of granted) {
      if (roles.includes('anon')) continue
      it(`${file}: ${signature.trim()} revokes anon explicitly`, () => {
        expect(sql).toContain(`revoke execute on function ${signature.trim()} from anon`)
      })
    }
  }
})

describe('new SECURITY DEFINER helpers are closed to the API roles', () => {
  const sql = migration('client_attachment_url_trust')

  /* Verified 2026-08-12: `revoke all ... from public` does NOT remove
     Supabase's explicit EXECUTE grant to anon/authenticated —
     has_function_privilege('anon','public.cap_rows_per_project()','EXECUTE')
     is true despite 20260805140000 revoking it from PUBLIC. Every helper this
     audit adds must name the roles. */
  for (const fn of [
    'public.client_upload_object_name(text)',
    'public.sanitize_client_attachments(jsonb, uuid)',
  ]) {
    it(`${fn} revokes execute from anon and authenticated by name`, () => {
      expect(sql).toContain(`revoke execute on function ${fn} from anon, authenticated`)
    })
  }
})

describe('deleting a project revokes its client links', () => {
  const sql = migration('revoke_links_on_project_delete')

  it('revokes both link tables, scoped to the caller', () => {
    const body = functionBody(sql, 'revoke_project_links')
    expect(body).toContain('update public.client_portals')
    expect(body).toContain('update public.discovery_shares')
    /* Owner scoping is the whole tenant boundary here — the argument is a
       local project id, which is a client-supplied string. */
    const owners = body.match(/owner_id = auth\.uid\(\)/g) || []
    expect(owners.length).toBe(2)
  })

  it('revokes rather than deletes, keeping the answers', () => {
    /* The retention contract, from the revoke button's own copy: "the
       client's answers, chat and approvals are kept". */
    expect(sql).not.toMatch(/delete from public\.(client_portals|discovery_shares)/)
    expect(sql).toContain('revoked_at = now()')
  })

  it('only reports links that were live, so undo cannot resurrect an old revoke', () => {
    const body = functionBody(sql, 'revoke_project_links')
    const liveOnly = body.match(/revoked_at is null/g) || []
    expect(liveOnly.length).toBe(2)
  })

  it('restores only the ids it is given, still owner-scoped', () => {
    const body = functionBody(sql, 'restore_project_links')
    expect(body).toContain('id = any (coalesce(p_portal_ids')
    expect(body).toContain('id = any (coalesce(p_share_ids')
    const owners = body.match(/owner_id = auth\.uid\(\)/g) || []
    expect(owners.length).toBe(2)
  })

  it('is not reachable by anon', () => {
    expect(sql).toContain('revoke all on function public.revoke_project_links(text) from public')
    expect(sql).toMatch(/grant execute on function public\.revoke_project_links\(text\) to authenticated/)
    expect(sql).not.toMatch(/grant execute on function public\.revoke_project_links[^;]*anon/)
    expect(sql).not.toMatch(/grant execute on function public\.restore_project_links[^;]*anon/)
  })
})
