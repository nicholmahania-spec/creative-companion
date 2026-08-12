import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import useAppStore, { blankWorkspaceState } from '../../store/useAppStore'
import { normaliseIngest, assetStorageKey, currentAssets } from './assetLibrary.js'
import { assetShelf } from './assetShelf.js'
import { isRef, isArtifactKind } from '../artifacts/artifactRef.js'

/**
 * THE ASSET LIBRARY'S OWNERSHIP AND LIFECYCLE CONTRACT.
 *
 * Written as characterization tests during the integrity audit, when several
 * of them pinned behaviour that was WRONG and said so at the assertion. That
 * worked as designed: remediation pass 1 turned each of those red, and each is
 * now rewritten as the contract it was waiting for. The ones still marked
 * DEFECT are findings this pass deliberately did not take (P2/P3), left
 * failing-on-fix so the next pass is handed the line.
 *
 * A DEFECT assertion is a statement about today, not a rule for tomorrow. Do
 * not "repair" one by loosening it; repair the code and rewrite the assertion
 * to the intended contract, as the four below were.
 *
 * WHAT THIS FILE DOES NOT TOUCH. `packageAssets` (Delivery's produced-artifact
 * store) is a different workstream's contract. It appears here only where the
 * two models are compared, and only by reading.
 */

const s = () => useAppStore.getState()

function fakeLS() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

/** A reload: partialize → migrate → rehydrate, the same path the app takes. */
const reload = () => {
  const opts = useAppStore.persist.getOptions()
  const stored = JSON.parse(JSON.stringify(opts.partialize(s())))
  return opts.migrate(stored, 9)
}

/** One ingested row, exactly as `ingestFiles` would hand it to `addAssets`. */
function ingestedRow(projectId, { id, name = 'Card.pdf', mime = 'application/pdf' } = {}) {
  const result = normaliseIngest({
    name,
    projectId,
    mimeType: mime,
    byteSize: 1024,
    sourceApp: 'upload',
  })
  expect(result.ok).toBe(true)
  return {
    ...result.asset,
    id,
    storage_path: null,
    local_key: `local/${id}`,
    created_at: '2026-08-12T00:00:00.000Z',
  }
}

beforeEach(() => {
  globalThis.localStorage = fakeLS()
  /* Clears every slice these tests touch, `assets` included — which it did
     not before this pass, and which the reset test below now holds it to. */
  s().clearToEmpty()
})
afterEach(() => {
  delete globalThis.localStorage
})

/* ------------------------------------------------------------- ownership --- */

describe('ownership: an asset belongs to a project, and to nothing else', () => {
  it('refuses a file with no project to land in', () => {
    const result = normaliseIngest({ name: 'orphan.png', mimeType: 'image/png' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('The asset needs a project to land in.')
  })

  it('carries project ownership on the row, not on the container', () => {
    /* `assets` is a FLAT workspace-level array — it is not nested under the
       project. Ownership therefore lives entirely in `project_id`, which is
       why every reader must filter and why an unfiltered read is a leak. */
    const row = ingestedRow('project-a', { id: 'a-1' })
    expect(row.project_id).toBe('project-a')
    s().addAssets([row])
    expect(Array.isArray(s().assets)).toBe(true)
    expect(s().assets[0].project_id).toBe('project-a')
  })

  it('never invents an owner id locally — that only exists after a durable save', () => {
    /* owner_id is minted server-side from auth.uid() in assetStorage.save().
       A local row has no owner, and must not pretend to: a fabricated owner
       would be the one field storage policies key on. */
    const row = ingestedRow('project-a', { id: 'a-1' })
    expect(row.owner_id).toBeUndefined()
  })
})

/* ------------------------------------------------------------ provenance --- */

describe('provenance: where a file came from survives ingest', () => {
  it('records a plain drop as an upload, not as unknown', () => {
    expect(ingestedRow('p', { id: 'a-1' }).source_app).toBe('upload')
  })

  it('keeps a bridge push distinguishable from a drop', () => {
    const pushed = normaliseIngest({
      name: 'Mark.svg',
      projectId: 'p',
      mimeType: 'image/svg+xml',
      sourceApp: 'illustrator',
      sourceRef: 'artboard-7',
    })
    expect(pushed.asset.source_app).toBe('illustrator')
    expect(pushed.asset.source_ref).toBe('artboard-7')
  })

  it('defaults role to source and origin to client', () => {
    /* These two are the whole SOURCE-vs-PRODUCED distinction, and the default
       is the conservative one: an arriving file is material until someone
       says it is output. */
    const row = ingestedRow('p', { id: 'a-1' })
    expect(row.role).toBe('source')
    expect(row.origin).toBe('client')
  })

  it('starts every asset as a draft that nothing has approved', () => {
    const row = ingestedRow('p', { id: 'a-1' })
    expect(row.status).toBe('draft')
    expect(row.approved_at).toBeNull()
  })

  it('keeps a forward-compatible category rather than dropping the file', () => {
    const result = normaliseIngest({ name: 'Box.png', projectId: 'p', category: 'packaging' })
    expect(result.ok).toBe(true)
    /* Unknown slug files as unfiled — the file is kept, the vocabulary is not
       widened. Both halves matter. */
    expect(result.asset.category).toBe('other')
  })
})

/* ------------------------------------------------------- project isolation --- */

describe('project isolation', () => {
  it('keeps two projects’ assets apart in one flat list', () => {
    s().addAssets([
      ingestedRow('project-a', { id: 'a-1', name: 'A logo' }),
      ingestedRow('project-b', { id: 'b-1', name: 'B logo' }),
    ])
    const mine = s().assets.filter((a) => a.project_id === 'project-a')
    expect(mine.map((a) => a.name)).toEqual(['A logo'])
  })

  it('a restore brings back only the deleted project’s assets', () => {
    /* Undo must not resurrect a row belonging to a project that was never
       deleted, and must not drop one that was. */
    const keep = s().createNewProject('Keep Co')
    const drop = s().createNewProject('Drop Co')
    s().addAssets([
      ingestedRow(keep.id, { id: 'a-keep', name: 'Kept' }),
      ingestedRow(drop.id, { id: 'a-drop', name: 'Dropped' }),
    ])

    const result = s().deleteProject(drop.id)
    expect(s().assets.map((a) => a.id)).toEqual(['a-keep'])
    result.restore()
    expect(s().assets.map((a) => a.id).sort()).toEqual(['a-drop', 'a-keep'])
  })

  it('a shelf read never reaches another project’s rows', () => {
    /* The shelf is handed one project's rows; the filter is the caller's, and
       this pins that the view model itself adds nothing back. */
    const a = ingestedRow('project-a', { id: 'a-1', name: 'A logo' })
    const b = ingestedRow('project-b', { id: 'b-1', name: 'B logo' })
    const all = [a, b]
    const mine = all.filter((x) => x.project_id === 'project-a')

    const shelf = assetShelf(mine, { online: true })
    const names = shelf.groups.flatMap((g) => g.cards.map((c) => c.name))
    expect(names).toEqual(['A logo'])
    expect(shelf.total).toBe(1)
  })

  it('a version chain cannot be joined across projects by the shelf', () => {
    /* `replaces_id` alignment is enforced by a composite FK in the database.
       Locally, a row in project B naming a row in project A as its
       predecessor must not hide project A's row from project A's shelf. */
    const a = ingestedRow('project-a', { id: 'a-1', name: 'A logo' })
    const b = { ...ingestedRow('project-b', { id: 'b-1', name: 'B logo' }), replaces_id: 'a-1' }
    const mine = [a, b].filter((x) => x.project_id === 'project-a')

    const names = assetShelf(mine, { online: true }).groups.flatMap((g) =>
      g.cards.map((c) => c.name)
    )
    expect(names).toEqual(['A logo'])
  })

  it('refiles an asset that belongs to the open project', () => {
    const p = s().createNewProject('Open Co')
    s().addAssets([ingestedRow(p.id, { id: 'a-1', name: 'Mine' })])
    s().setAssetCategory('a-1', 'logo')
    expect(s().assets.find((a) => a.id === 'a-1').category).toBe('logo')
  })

  it('will not refile an asset belonging to another project', () => {
    /* THE NEGATIVE CASE. Both mutations used to match on asset id alone, and
       `state.assets` is one flat list holding every project's rows — so
       knowing an id was enough to write into a project the designer did not
       have open. Local ids are `a-<timestamp>-<index>-<filename-slug>`, which
       two projects handed the same file in the same millisecond collide on. */
    const open = s().createNewProject('Open Co')
    s().addAssets([
      ingestedRow(open.id, { id: 'a-mine', name: 'Mine' }),
      ingestedRow('some-other-project', { id: 'a-theirs', name: 'Theirs' }),
    ])

    s().setAssetCategory('a-theirs', 'logo')

    const theirs = s().assets.find((a) => a.id === 'a-theirs')
    expect(theirs.category).toBe('other')
    expect(theirs.project_id).toBe('some-other-project')
  })

  it('will not delete an asset belonging to another project', () => {
    const open = s().createNewProject('Open Co')
    s().addAssets([
      ingestedRow(open.id, { id: 'a-mine', name: 'Mine' }),
      ingestedRow('some-other-project', { id: 'a-theirs', name: 'Theirs' }),
    ])

    s().removeAsset('a-theirs')

    expect(s().assets.map((a) => a.id).sort()).toEqual(['a-mine', 'a-theirs'])
  })

  it('deletes an asset that does belong to the open project', () => {
    const open = s().createNewProject('Open Co')
    s().addAssets([
      ingestedRow(open.id, { id: 'a-mine', name: 'Mine' }),
      ingestedRow('some-other-project', { id: 'a-theirs', name: 'Theirs' }),
    ])

    s().removeAsset('a-mine')

    expect(s().assets.map((a) => a.id)).toEqual(['a-theirs'])
  })

  it('mutates nothing when no project is open', () => {
    /* An empty workspace has no current project, so no row can belong to it.
       Failing closed here is what stops a stale id from acting on whatever
       happens to be in the list. */
    s().addAssets([ingestedRow('project-a', { id: 'a-1', name: 'Orphan' })])
    expect(s().currentProjectId).toBeNull()

    s().setAssetCategory('a-1', 'logo')
    s().removeAsset('a-1')

    expect(s().assets).toHaveLength(1)
    expect(s().assets[0].category).toBe('other')
  })

  it('matches ownership loosely enough for a numeric project id', () => {
    /* Same comparison the projects filter uses. A `<select>` value is a
       string; an old project's id is a number. The guard must not lock a
       designer out of their own asset over that. */
    const p = s().createNewProject('Numeric Co')
    useAppStore.setState({
      projects: s().projects.map((x) => (x.id === p.id ? { ...x, id: 1234 } : x)),
      currentProjectId: '1234',
    })
    s().addAssets([{ ...ingestedRow('1234', { id: 'a-1' }), project_id: 1234 }])

    s().setAssetCategory('a-1', 'logo')
    expect(s().assets[0].category).toBe('logo')
  })

  it('local and remote rows are guarded identically', () => {
    /* The scoping rule is about ownership, not about where the bytes are. A
       durable row must not become mutable-by-id just because it has a
       storage_path. */
    const open = s().createNewProject('Open Co')
    s().addAssets([
      {
        ...ingestedRow('some-other-project', { id: 'a-remote' }),
        local_key: null,
        storage_path: 'owner/uuid/a-remote.pdf',
      },
    ])
    expect(open.id).not.toBe('some-other-project')

    s().setAssetCategory('a-remote', 'logo')
    s().removeAsset('a-remote')

    expect(s().assets).toHaveLength(1)
    expect(s().assets[0].category).toBe('other')
  })

  it('refuses a storage key whose segments are not bare identifiers', () => {
    /* The key is `${owner}/${project}/${asset}.${ext}` and every storage
       policy on the bucket reads `(storage.foldername(name))[1] = auth.uid()`.
       A segment carrying a separator adds folders the policy never
       anticipated. Local ids cannot contain one today, but an IMPORTED
       workspace payload sets project ids verbatim, so the value is not wholly
       app-controlled — and a pure exported function must hold its invariant
       structurally rather than by luck about its current callers. */
    expect(
      assetStorageKey({
        ownerId: 'owner-1',
        projectId: '../other',
        assetId: 'a-1',
        mimeType: 'image/png',
      })
    ).toBeNull()
  })
})

/* ------------------------------------------ asset / reference distinction --- */

describe('asset versus reference', () => {
  it('DEFECT: `{kind:"asset"}` is not a declared artifact kind', () => {
    /* `adoptBriefAttachments` writes `{ kind: 'asset', id }` onto Brief
       attachments and calls it "the canonical identity from this point
       onward". The artifact-reference grammar has never heard of it, so
       `isRef` rejects it and `makeRef('asset', id)` throws. Two reference
       vocabularies for one job, and only one of them is validated. */
    expect(isArtifactKind('asset')).toBe(false)
    expect(isRef({ kind: 'asset', id: 'a-1' })).toBe(false)
  })

  it('an artifact snapshot reference is validated where an assetRef is not', () => {
    expect(isRef({ kind: 'palette', id: 'pal_0001' })).toBe(true)
  })

  it('a reference is stored, the bytes are not', () => {
    /* The rule the whole model rests on: `project.artifacts` and any ref into
       it hold tens of bytes. Anything image-shaped stays out. */
    s().addAssets([ingestedRow('p', { id: 'a-1' })])
    const serialised = JSON.stringify(s().assets)
    expect(serialised).not.toMatch(/^data:/m)
    expect(serialised).not.toContain(';base64,')
  })
})

/* ------------------------------------- produced / package vs source asset --- */

describe('produced artifacts are a different store from source assets', () => {
  it('keeps package output off the asset shelf entirely', () => {
    const p = s().createNewProject('Sparrow')
    s().addAssets([ingestedRow(p.id, { id: 'a-1', name: 'Client supplied logo' })])
    s().addPackageAsset({ name: 'Business card', dataUrl: 'data:application/pdf;base64,AAAA', deliverable: 'businessCard' })

    const project = s().projects.find((x) => x.id === p.id)
    /* Two lists, two shapes, two storage strategies. A produced artifact is a
       data URL inside the project inside the localStorage blob; a source
       asset is a metadata row with its bytes elsewhere. Nothing crosses. */
    expect(project.packageAssets).toHaveLength(1)
    expect(project.packageAssets[0].dataUrl).toContain('base64,')
    expect(s().assets.map((a) => a.name)).toEqual(['Client supplied logo'])
    expect(s().assets.some((a) => 'dataUrl' in a)).toBe(false)
  })

  it('the two models do not even agree on how big a file may be', () => {
    /* assetLibrary caps at the bucket's 50MB; ClientPackagePanel caps at 4MB
       because its bytes go into localStorage. Same concept, same constant
       name, different number — which is what a second storage model costs. */
    const packagePanel = require('node:fs').readFileSync(
      new URL('../../components/ClientPackagePanel.jsx', import.meta.url),
      'utf8'
    )
    expect(packagePanel).toContain('const MAX_ASSET_BYTES = 4 * 1024 * 1024')
  })
})

/* --------------------------------------------------------------- deletion --- */

describe('deletion', () => {
  it('removes a row from the shelf when the asset itself is deleted', () => {
    const p = s().createNewProject('Open Co')
    s().addAssets([ingestedRow(p.id, { id: 'a-1' }), ingestedRow(p.id, { id: 'a-2' })])
    s().removeAsset('a-1')
    expect(s().assets.map((a) => a.id)).toEqual(['a-2'])
  })

  it('takes the project’s assets with it', () => {
    /* `deleteProject`'s docstring names the slices deletion touches and says
       the restore closure must grow if a new one appears. `assets` was that
       slice and was missed, so rows outlived the project carrying a dead
       project_id — persisted, synced, and invisible in every UI because the
       library filters on the CURRENT project. Nothing could surface them and
       nothing could remove them. */
    const p = s().createNewProject('Doomed Co')
    s().addAssets([ingestedRow(p.id, { id: 'a-1', name: 'Unreleased mark' })])

    expect(s().deleteProject(p.id).ok).toBe(true)
    expect(s().projects.find((x) => x.id === p.id)).toBeUndefined()
    expect(s().assets).toEqual([])
  })

  it('takes ONLY that project’s assets', () => {
    const keep = s().createNewProject('Keep Co')
    const drop = s().createNewProject('Drop Co')
    s().addAssets([
      ingestedRow(keep.id, { id: 'a-keep', name: 'Kept' }),
      ingestedRow(drop.id, { id: 'a-drop', name: 'Dropped' }),
    ])

    s().deleteProject(drop.id)
    expect(s().assets.map((a) => a.name)).toEqual(['Kept'])
  })

  it('keeps a row that names no project at all', () => {
    /* An unattributed row is not evidence of belonging to the project being
       deleted, and deleting on a guess is the one mistake undo cannot make
       safe. */
    const p = s().createNewProject('Doomed Co')
    const stray = { ...ingestedRow(p.id, { id: 'a-stray', name: 'Stray' }), project_id: null }
    s().addAssets([stray])

    s().deleteProject(p.id)
    expect(s().assets.map((a) => a.name)).toEqual(['Stray'])
  })

  it('matches asset ownership the same loose way the project filter does', () => {
    /* Ids arrive as numbers on old rows and strings on new ones. Strict
       inequality here would leave an asset behind for exactly the project
       whose id had gone through a `<select>`. */
    const p = s().createNewProject('Numeric Co')
    useAppStore.setState({
      projects: s().projects.map((x) => (x.id === p.id ? { ...x, id: 1234 } : x)),
      currentProjectId: 1234,
    })
    s().addAssets([{ ...ingestedRow('1234', { id: 'a-1', name: 'Numeric' }), project_id: 1234 }])

    expect(s().deleteProject('1234').ok).toBe(true)
    expect(s().assets).toEqual([])
  })

  it('undo puts the project’s assets back, at their original values', () => {
    /* The restore closure is what lets deletion be offered without a
       confirmation dialog. A restore that silently drops a slice is worse
       than the dialog it replaced. */
    const p = s().createNewProject('Undone Co')
    s().addAssets([ingestedRow(p.id, { id: 'a-1', name: 'Unreleased mark' })])
    const before = JSON.parse(JSON.stringify(s().assets))

    const result = s().deleteProject(p.id)
    expect(s().assets).toEqual([])
    expect(result.restore().ok).toBe(true)
    expect(s().assets).toEqual(before)
  })

  it('DEFECT: nothing deletes the bytes when the row goes', () => {
    /* `deleteAssetBytes` exists in assetBytes.js and is imported by nothing
       outside its own test, and `removeAsset` is a pure metadata filter. The
       IndexedDB blob and any bucket object survive the row that named them,
       and once the row is gone the key is unrecoverable. */
    const src = require('node:fs').readFileSync(
      new URL('../../store/useAppStore.js', import.meta.url),
      'utf8'
    )
    const action = src.slice(
      src.indexOf('removeAsset: (assetId)'),
      src.indexOf('/** Server rows are canonical')
    )
    expect(action).toContain('filter')
    expect(action).not.toContain('deleteAssetBytes')
    expect(action).not.toContain('local_key')
  })

  it('clearing the workspace to empty clears the asset library too', () => {
    /* `blankWorkspaceState()` declared no `assets` key and `clearToEmpty` set
       none, so "start over with nothing" kept every asset row from the
       workspace just discarded, attached to project ids that no longer
       existed. Same missed slice as project deletion, reached by a different
       door — which is why both are tested. */
    s().addAssets([ingestedRow('project-a', { id: 'a-1', name: 'Survivor' })])
    s().clearToEmpty()
    expect(s().projects).toEqual([])
    expect(s().assets).toEqual([])
  })

  it('a blank workspace declares the asset slice rather than omitting it', () => {
    /* Omission is what let every reset path miss it. A key that is present
       and empty cannot be forgotten by the next writer of a reset. */
    expect(blankWorkspaceState().assets).toEqual([])
  })
})

/* ------------------------------------------------------ byte reclamation --- */

/**
 * THE LIFECYCLE BYTES NEED, AND THE PART OF IT THAT EXISTS.
 *
 * Deleting a row does not delete its bytes. That is deliberate in two places
 * and owed in a third, and the three have to be read together or the
 * deliberate parts look like the bug:
 *
 *   1. `deleteProject` must not reclaim, because it returns a `restore`
 *      closure and the app offers undo INSTEAD of a confirmation dialog. A
 *      reclaim inside deletion makes that undo a lie — it hands back rows
 *      whose bytes it cannot bring back. The action is also synchronous while
 *      both byte stores are async, so there is nowhere honest to await.
 *   2. `removeAsset` must not reclaim for the same undo reason, and because
 *      the bucket object may still be referenced by a superseded version in
 *      the same chain.
 *   3. Nothing else reclaims either, and that IS the gap. PHASES.md Phase 7
 *      has recorded it since the table landed: "on delete cascade drops asset
 *      rows and leaves their objects in the bucket — still stored, still
 *      billed, still reachable by any signed URL already minted. Needs a
 *      reaping path; there is none yet."
 *
 * THE LIFECYCLE THIS WORKSTREAM OWES:
 *
 *   delete  →  undo window (rows gone, bytes retained, restore still whole)
 *          →  expiry (the undo can no longer be offered)
 *          →  asynchronous reclamation (IndexedDB key, then bucket object)
 *
 * Not built here, and deliberately not invented here. The repo has no
 * scheduled job, no pg_cron, no storage-cleanup edge function and no retention
 * sweep of any kind — the only durable "this is gone" record in the app is the
 * `deletedProjects` tombstone list, which carries ids and not byte keys.
 * Building the missing half would mean inventing a background-job system on
 * the way past, which is a larger decision than this pass is scoped to make.
 *
 * What these tests do is pin the two deliberate refusals so nobody closes the
 * gap in the wrong place, and record what a reclaimer will need when it is
 * built: the keys are recoverable from the row, and the row is the only thing
 * that knows them.
 */
describe('byte reclamation', () => {
  it('deleting a project drops rows and leaves bytes alone', () => {
    const p = s().createNewProject('Doomed Co')
    s().addAssets([ingestedRow(p.id, { id: 'a-1' })])

    const result = s().deleteProject(p.id)
    expect(s().assets).toEqual([])
    /* The undo the refusal exists to protect. */
    result.restore()
    expect(s().assets[0].local_key).toBe('local/a-1')
  })

  it('the store never reaches a byte store from a metadata action', () => {
    /* Structural, because the cost of getting this wrong is a broken undo
       rather than a failing assertion. If a byte call ever appears in one of
       these actions, the undo contract above has been quietly abandoned. */
    const src = readFileSync(
      new URL('../../store/useAppStore.js', import.meta.url),
      'utf8'
    )
    for (const [name, end] of [
      ['removeAsset: (assetId)', '/** Server rows are canonical'],
      ['deleteProject: (id) =>', 'archiveProject:'],
    ]) {
      const body = src.slice(src.indexOf(name), src.indexOf(end))
      expect(body.length).toBeGreaterThan(0)
      expect(body).not.toMatch(/deleteAssetBytes|openAssetCache|\.remove\(/)
    }
  })

  it('a row carries both byte keys a reclaimer would need', () => {
    /* The reclaimer does not exist; the information it needs does, and it
       lives only on the row. Anything that drops a row without first reading
       these two fields has made its bytes unreachable forever — which is the
       real reason reclamation cannot simply be bolted on later without a
       retention record. */
    const local = ingestedRow('p', { id: 'a-1' })
    expect(local.local_key).toBe('local/a-1')

    const durable = { ...local, local_key: null, storage_path: 'owner/uuid/a-1.pdf' }
    expect(durable.storage_path).toBe('owner/uuid/a-1.pdf')
  })

  it('is recorded as owed rather than silently absent', () => {
    /* A gap nobody wrote down is indistinguishable from a gap nobody noticed.
       This is the one place a reader of the deletion code is likely to look. */
    const phases = readFileSync(new URL('../../../PHASES.md', import.meta.url), 'utf8')
    expect(phases).toMatch(/Orphaned bytes/)
    expect(phases).toMatch(/Needs a reaping path; there is none yet/)
  })
})

/* ------------------------------------------------------ reload persistence --- */

describe('reload persistence', () => {
  it('keeps asset metadata across a reload', () => {
    s().createNewProject('Sparrow')
    s().addAssets([ingestedRow('project-a', { id: 'a-1', name: 'Kept' })])
    const after = reload()
    expect(after.assets.map((a) => a.name)).toEqual(['Kept'])
  })

  it('a workspace payload carries assets out and puts them back', () => {
    /* `exportAllData` always included `assets`; `hydrateFromPayload` set
       fifteen other slices and never this one, so a cloud pull or a JSON
       restore silently dropped the whole shelf — precisely the `templates`
       bug the payload's own comment memorialises, recurring in the slice
       added next to it. */
    const p = s().createNewProject('Sparrow')
    s().addAssets([
      {
        ...ingestedRow(p.id, { id: 'a-1', name: 'Exported' }),
        storage_path: 'owner-1/uuid/a-1.pdf',
      },
    ])
    const payload = s().exportAllData()
    expect(payload.assets.map((a) => a.name)).toEqual(['Exported'])

    s().clearToEmpty()
    expect(s().hydrateFromPayload(payload).ok).toBe(true)

    const [restored] = s().assets
    expect(restored.id).toBe('a-1')
    expect(restored.name).toBe('Exported')
    expect(restored.project_id).toBe(p.id)
  })

  it('a restore preserves provenance, status and the version chain', () => {
    const p = s().createNewProject('Sparrow')
    const v1 = ingestedRow(p.id, { id: 'a-1', name: 'v1' })
    const v2 = {
      ...ingestedRow(p.id, { id: 'a-2', name: 'v2' }),
      replaces_id: 'a-1',
      source_app: 'illustrator',
      source_ref: 'artboard-7',
      role: 'produced',
      origin: 'designer',
      status: 'approved',
      approved_at: '2026-08-12T00:00:00.000Z',
    }
    s().addAssets([v1, v2])
    const payload = s().exportAllData()

    s().clearToEmpty()
    s().hydrateFromPayload(payload)

    const head = s().assets.find((a) => a.id === 'a-2')
    expect(head.replaces_id).toBe('a-1')
    expect(head.source_app).toBe('illustrator')
    expect(head.source_ref).toBe('artboard-7')
    expect(head.role).toBe('produced')
    expect(head.origin).toBe('designer')
    expect(head.status).toBe('approved')
    /* And the chain still reads as a chain, so the restored shelf shows one
       card rather than two. */
    expect(assetShelf(s().assets, { online: true }).total).toBe(1)
  })

  it('a restore does not claim local bytes it could not carry', () => {
    /* The payload is JSON; the bytes are in IndexedDB and were never in it.
       Keeping `local_key` would make the card say "Saved on this desk" about
       a desk that has never seen the file — the same class of lie, pointed
       the other way, as the one that made a filed file look like a failed
       upload. */
    const p = s().createNewProject('Sparrow')
    s().addAssets([ingestedRow(p.id, { id: 'a-1', name: 'Local only' })])
    expect(s().assets[0].local_key).toBe('local/a-1')

    const payload = s().exportAllData()
    s().clearToEmpty()
    s().hydrateFromPayload(payload)

    const [restored] = s().assets
    expect(restored.local_key).toBeUndefined()
    const card = assetShelf(s().assets, { online: true }).groups[0].cards[0]
    expect(card.bytes.state).toBe('missing')
    expect(card.bytes.label).toBe(
      'The file itself isn’t in this workspace. Add it again from the original.'
    )
  })

  it('a restore drops rows whose project did not come back', () => {
    /* A payload row pointing at a project this device has tombstoned must not
       reintroduce the project's assets through a side door. */
    const p = s().createNewProject('Sparrow')
    s().addAssets([ingestedRow(p.id, { id: 'a-1', name: 'Orphan' })])
    const payload = s().exportAllData()
    payload.assets = [{ ...payload.assets[0], project_id: 'a-project-that-is-gone' }]

    s().clearToEmpty()
    s().hydrateFromPayload(payload)
    expect(s().assets).toEqual([])
  })
})

/* ------------------------------------------------- broken-reference handling --- */

describe('broken references', () => {
  it('a version chain pointing at a missing predecessor still yields one head', () => {
    const rows = [
      { ...ingestedRow('p', { id: 'a-2' }), replaces_id: 'a-1-which-is-gone' },
    ]
    expect(currentAssets(rows).map((a) => a.id)).toEqual(['a-2'])
  })

  it('a superseded row is hidden from the shelf, not deleted from the list', () => {
    const older = ingestedRow('p', { id: 'a-1', name: 'v1' })
    const newer = { ...ingestedRow('p', { id: 'a-2', name: 'v2' }), replaces_id: 'a-1' }
    const shelf = assetShelf([older, newer], { online: true })
    const names = shelf.groups.flatMap((g) => g.cards.map((c) => c.name))
    expect(names).toEqual(['v2'])
    expect(shelf.total).toBe(1)
  })

  it('a filed local file is reported as filed, not as a failed upload', () => {
    /* The ingest path writes the bytes to IndexedDB, records `local_key`, and
       deliberately leaves `storage_path` null because nothing was uploaded.
       `assetCard` asked `assetByteState` about `storage_path` ONLY, so every
       successfully filed file rendered as "did not finish uploading" moments
       after the toast said "Filed 1 file" — and the accusatory one was the
       one that stayed on screen. */
    const row = ingestedRow('p', { id: 'a-1', name: 'Filed fine' })
    expect(row.local_key).toBe('local/a-1')
    const card = assetShelf([row], { online: true }).groups[0].cards[0]
    expect(card.bytes.state).toBe('local')
    expect(card.bytes.label).toBe('Saved on this desk.')
    expect(card.bytes.canRetry).toBe(false)
  })

  it('says it once when every file is on this desk, not once per card', () => {
    /* The same collapse `allRemote` gets. A reassurance repeated across
       twenty cards stops being read; the view says it above the shelf and
       drops the per-card line. */
    const shelf = assetShelf(
      [ingestedRow('p', { id: 'a-1' }), ingestedRow('p', { id: 'a-2' })],
      { online: true }
    )
    expect(shelf.allLocal).toBe(true)
    expect(shelf.allRemote).toBe(false)
  })

  it('keeps the per-card line in the mixed case, where it distinguishes', () => {
    const shelf = assetShelf(
      [
        ingestedRow('p', { id: 'a-1' }),
        { ...ingestedRow('p', { id: 'a-2' }), local_key: null, storage_path: 'o/p/a-2.pdf' },
      ],
      { online: true }
    )
    expect(shelf.allLocal).toBe(false)
    expect(shelf.allRemote).toBe(false)
  })

  it('does not describe a local copy as cloud storage', () => {
    const card = assetShelf([ingestedRow('p', { id: 'a-1' })], { online: true })
      .groups[0].cards[0]
    expect(card.bytes.label).not.toMatch(/cloud|upload|back(ed)? ?up|sync/i)
    /* And it is a different state from a durable copy, so the two can never
       be shown as the same thing. */
    const durable = assetShelf(
      [{ ...ingestedRow('p', { id: 'a-2' }), local_key: null, storage_path: 'o/p/a-2.pdf' }],
      { online: true }
    ).groups[0].cards[0]
    expect(durable.bytes.state).toBe('remote')
    expect(durable.bytes.state).not.toBe(card.bytes.state)
  })

  it('a durable row is never presented as if the file were on this device', () => {
    /* THE INVARIANT THE DEFERRED READ PATH MUST NOT BREAK.

       `assetStorage.list()` and `signedUrl()` exist and are wired to nothing;
       hydrating the shelf from the server is deferred infrastructure. When it
       lands, every row it brings back will have a `storage_path` and no local
       bytes, and the tempting shortcut is to treat "the server says this file
       exists" as "this file is available". It is not: the bytes are in a
       private bucket behind a signed URL, and the designer may be on a plane.

       A row that says `remote` must keep saying `remote` until something has
       actually fetched the bytes and can prove it — which is what `cached`
       means, and why `cached` is the only thing that upgrades a card to
       `ready`. */
    const durable = {
      ...ingestedRow('p', { id: 'a-1' }),
      local_key: null,
      storage_path: 'owner/uuid/a-1.pdf',
    }
    const card = assetShelf([durable], { online: true }).groups[0].cards[0]
    expect(card.bytes.state).toBe('remote')
    expect(card.bytes.label).toBe('Not on this device yet.')
    expect(card.bytes.state).not.toBe('ready')
    expect(card.bytes.state).not.toBe('local')
  })

  it('a storage_path does not override bytes that really are on this device', () => {
    /* The other direction of the same rule. Once a fetch has cached the
       bytes, the card is `ready` and says nothing — a file that is genuinely
       here must not be described as absent because it also lives remotely. */
    const durable = {
      ...ingestedRow('p', { id: 'a-1' }),
      local_key: null,
      storage_path: 'owner/uuid/a-1.pdf',
    }
    const cachedKeys = new Set(['owner/uuid/a-1.pdf'])
    const card = assetShelf([durable], { online: true, cachedKeys }).groups[0].cards[0]
    expect(card.bytes.state).toBe('ready')
    expect(card.bytes.label).toBeNull()
  })

  it('a row with no copy anywhere is still shown as unavailable', () => {
    /* The new local state must not swallow the genuinely-absent case. */
    const row = { ...ingestedRow('p', { id: 'a-1' }), local_key: null, storage_path: null }
    const card = assetShelf([row], { online: true }).groups[0].cards[0]
    expect(card.bytes.state).toBe('missing')
    expect(card.bytes.canRetry).toBe(true)
  })
})
