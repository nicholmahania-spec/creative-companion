/**
 * Phase 1a — the walking skeleton of project sync.
 *
 * One project, one direction (local → Supabase), manually triggered. No
 * background loop, no conflict handling, no sync-state machine. Those are
 * Phase 1b, and building them before this round trip is proven end to end is
 * how the original Phase 1 got cut in review.
 *
 * The cloud shape is Client → Brand → Project (decided 2026-08-05, resolving
 * PRODUCT.md §26.2): a brand outlives the project that created it, so colour,
 * type and decisions later live on the BRAND and a 2027 packaging job already
 * knows them. The local store predates that hierarchy — one flat project with
 * a client name on it — so this pushes by ensuring the chain exists:
 *
 *   client (by name)  →  brand (one per client for now)  →  project row
 *
 * "One brand per client" is a 1a simplification, not the model. When the UI
 * learns to distinguish brands, rows created here are already in the right
 * shape and nothing needs migrating — that is the point of doing the
 * hierarchy now.
 *
 * The project row is matched by (owner, local_id) — the local store id —
 * so pushing twice updates the same row instead of minting a duplicate.
 * `data` carries the whole local project document; Phase 3 lifts structured
 * pieces out of it, and nothing should read it as a stable schema.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

/** Fields that never belong in the cloud copy.
 *  workLog is the private clocked-work record ("Never billed, never
 *  exported"); keeping it device-local is the conservative reading of that
 *  promise until the owner decides otherwise. */
const LOCAL_ONLY_FIELDS = ['workLog']

export function projectToCloudData(project) {
  const data = { ...project }
  for (const f of LOCAL_ONLY_FIELDS) delete data[f]
  return data
}

/**
 * Push one local project to Supabase.
 *
 * @param {object} project - a project from the local store
 * @param {{ clientName?: string }} [opts]
 * @returns {Promise<{ ok: boolean, reason?: string, projectRowId?: string }>}
 *   Failures return { ok:false, reason } rather than throwing: the caller is
 *   a button handler, and "why not" belongs on screen, not in the console.
 */
export async function pushProject(project, opts = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, reason: 'Cloud is not configured on this desk.' }
  }
  if (!project || !project.id) {
    return { ok: false, reason: 'No project to send.' }
  }

  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) {
    return { ok: false, reason: 'Sign in to send this project to the cloud.' }
  }

  /* The client's name comes from intake when present; the project name is
     the fallback because for most single-brand work they are the same words,
     and a wrong-but-editable grouping beats a blocked push. */
  const clientName = String(
    opts.clientName || project.clientName || project.name || 'My client'
  ).trim()

  // 1. Client row, by (owner, name). Select-then-insert rather than upsert:
  //    there is no unique constraint on name (two real clients may share
  //    one), so upsert has nothing to land on.
  let { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id')
    .eq('owner_id', user.id)
    .eq('name', clientName)
    .limit(1)
    .maybeSingle()
  if (clientErr) return { ok: false, reason: clientErr.message }

  if (!client) {
    const ins = await supabase
      .from('clients')
      .insert({ owner_id: user.id, name: clientName })
      .select('id')
      .single()
    if (ins.error) return { ok: false, reason: ins.error.message }
    client = ins.data
  }

  // 2. Brand row — one per client in 1a.
  let { data: brand, error: brandErr } = await supabase
    .from('brands')
    .select('id')
    .eq('owner_id', user.id)
    .eq('client_id', client.id)
    .limit(1)
    .maybeSingle()
  if (brandErr) return { ok: false, reason: brandErr.message }

  if (!brand) {
    const ins = await supabase
      .from('brands')
      .insert({ owner_id: user.id, client_id: client.id, name: clientName })
      .select('id')
      .single()
    if (ins.error) return { ok: false, reason: ins.error.message }
    brand = ins.data
  }

  // 3. Project row, keyed by the local id. This one CAN upsert: the partial
  //    unique index on (owner_id, local_id) gives it a real conflict target.
  const row = {
    owner_id: user.id,
    brand_id: brand.id,
    local_id: String(project.id),
    name: project.name || 'My project',
    stage: project.lastView || null,
    data: projectToCloudData(project),
  }
  const up = await supabase
    .from('projects')
    .upsert(row, { onConflict: 'owner_id,local_id' })
    .select('id')
    .single()
  if (up.error) return { ok: false, reason: up.error.message }

  return { ok: true, projectRowId: up.data.id }
}
