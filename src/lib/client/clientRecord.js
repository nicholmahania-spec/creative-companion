/**
 * Client-level memory — the things that belong to the CLIENT rather than to
 * any one project they hired you for.
 *
 * Today the whole client directory is derived: `buildClientGroups` reads
 * `detective.clientName` off each project and groups on it. That is why there
 * is nowhere to record "prefers email", "hated the serif", "new product line
 * in November" — a note has no object to hang on, so it ends up in whichever
 * project happened to be open, and is invisible from the next one.
 *
 * This adds that object without a migration. Records are keyed by the
 * normalised client name — the same key `buildClientGroups` already groups on
 * — so an existing workspace gains client memory the moment it is written,
 * and a workspace with none behaves exactly as before.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not make the client a real
 * entity with an id. `clients` and `brands` tables already exist in Supabase
 * (`20260805120000_clients_brands_projects.sql`) and `projectSync.js` writes
 * a row to both on every sync — rows nothing reads back. Keying to those ids
 * is the right end state and is a migration: it has to survive offline, where
 * no id has been minted yet, and it has to decide what happens to a record
 * when two spellings turn out to be one client. Name-keying is the step that
 * delivers the feature now and does not block that later.
 *
 * The cost of name-keying, stated rather than discovered: renaming the client
 * on a project moves it to a different key, so its notes would be orphaned.
 * `renameClientRecord` exists for exactly that and the store calls it, so the
 * rename carries the memory with it instead of quietly losing it.
 */

/**
 * The grouping key. Case- and space-insensitive, because "Sparrow's Promise"
 * typed twice with different spacing is one client, and a designer should
 * never be asked to spell it identically to keep their own notes.
 *
 * Matches what `buildClientGroups` does (`name.toLowerCase()`) plus whitespace
 * collapsing, so it can only ever merge groups the directory already merged —
 * never split one.
 */
export function clientKey(name = '') {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/** An empty record. Every field is optional and empty is the normal state. */
export function blankClientRecord() {
  return { notes: '', preferences: [], updatedAt: '' }
}

/**
 * Read a client's record, always returning a usable shape.
 *
 * Never returns null: a client with nothing written is not an error state,
 * and callers rendering "no record found" would be describing the ordinary
 * case as a gap.
 */
export function clientRecordFor(records, name) {
  const key = clientKey(name)
  if (!key) return blankClientRecord()
  return { ...blankClientRecord(), ...(records?.[key] || {}) }
}

/** True when there is genuinely something recorded. Used to decide whether to
 *  show a record at all — never to badge its absence. */
export function hasClientRecord(records, name) {
  const r = clientRecordFor(records, name)
  return !!r.notes.trim() || r.preferences.length > 0
}

/**
 * Preferences are short lines, not a taxonomy.
 *
 * The product doc asks for "likes warm colours / prefers email / decision
 * maker: Sarah". Offering categories for those would bill a classification
 * decision every time the designer wants to write one sentence down, which is
 * the friction this app exists to remove. So: free lines, deduped, capped.
 */
export const MAX_PREFERENCES = 12

export function addPreference(records, name, text) {
  const line = String(text || '').trim()
  if (!line) return records
  const key = clientKey(name)
  if (!key) return records
  const current = clientRecordFor(records, name)
  const exists = current.preferences.some(
    (p) => p.toLowerCase() === line.toLowerCase()
  )
  if (exists) return records
  return {
    ...records,
    [key]: {
      ...current,
      preferences: [...current.preferences, line].slice(-MAX_PREFERENCES),
    },
  }
}

export function removePreference(records, name, text) {
  const key = clientKey(name)
  const current = clientRecordFor(records, name)
  const next = current.preferences.filter((p) => p !== text)
  if (next.length === current.preferences.length) return records
  return { ...records, [key]: { ...current, preferences: next } }
}

export function setClientNotes(records, name, notes) {
  const key = clientKey(name)
  if (!key) return records
  return {
    ...records,
    [key]: { ...clientRecordFor(records, name), notes: String(notes || '') },
  }
}

/**
 * Carry a record across a rename.
 *
 * Without this, name-keying loses notes silently the first time a designer
 * fixes a typo in a client's name — the worst possible failure for a feature
 * whose whole promise is "you do not have to remember this".
 *
 * Merges rather than overwrites when both keys hold something, because the
 * destination may be a real client the rename is folding into. Notes are
 * joined; preferences are unioned and capped.
 */
export function renameClientRecord(records, fromName, toName) {
  const from = clientKey(fromName)
  const to = clientKey(toName)
  if (!from || !to || from === to) return records
  const moving = records?.[from]
  if (!moving) return records

  const src = clientRecordFor(records, fromName)
  const dest = clientRecordFor(records, toName)
  const notes = [dest.notes.trim(), src.notes.trim()].filter(Boolean).join('\n')
  const seen = new Set()
  const preferences = [...dest.preferences, ...src.preferences]
    .filter((p) => {
      const k = p.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(-MAX_PREFERENCES)

  const next = { ...records }
  delete next[from]
  next[to] = { ...dest, notes, preferences }
  return next
}

/** Drop a record entirely. Separate from project deletion on purpose: losing
 *  your last project for a client should not erase what you learned about
 *  them, because they may well come back. */
export function forgetClientRecord(records, name) {
  const key = clientKey(name)
  if (!records?.[key]) return records
  const next = { ...records }
  delete next[key]
  return next
}

/**
 * The name that goes on anything the client sees.
 *
 * THE DEFECT THIS CLOSES. `project.name` is the designer's internal job name —
 * "My project", "Roastery rebrand v2", "Sparrow — round 3". It is chosen for
 * finding the thing in a list, not for printing. It was nonetheless what the
 * brand pack put on the cover, in the running footer of every page, in the
 * markdown heading and in the downloaded filename. A designer who names their
 * projects the way designers actually name projects shipped files headed with
 * their own shorthand.
 *
 * `detective.clientName` is the client's own answer to "Client / company
 * name", and is already what the artboard, the client directory and the
 * discovery brief use. This makes the exports agree with them.
 *
 * The internal name remains the fallback, not the default: a project whose
 * brief has not been started yet has nothing else to print, and an empty
 * cover is worse than an internal one.
 *
 * @param {object} project
 * @param {string} fallback  used when neither name exists
 */
export function clientFacingName(project, fallback = 'Untitled project') {
  const client = String(project?.detective?.clientName || '').trim()
  if (client) return client
  return String(project?.name || '').trim() || fallback
}

/**
 * The name a WORDMARK LOCKUP should carry.
 *
 * THE LEAK THIS CLOSES. The four lockups on the direction sheet read
 * `logoWordmark || project.name`, consulting `detective.clientName` nowhere.
 * `clientFacingName` had already been threaded through the exports and the
 * sheet's own heading, so the heading said the client's name while the four
 * lockups directly beneath it said the designer's internal job label — on a
 * sheet the client receives.
 *
 * WHY NOT `clientFacingName` ITSELF. That resolver is `clientName || name`
 * and knows nothing about `logoWordmark`, which is a real brand decision a
 * designer may have typed. The order below keeps the client's own answer
 * first, then the designer's typed wordmark, then the job label as the last
 * resort — the same order the type specimen's display rung uses, so the two
 * renderings of the brand's name on one screen cannot disagree.
 *
 * @param {object} project
 * @param {string} fallback  used when the project has no name of any kind
 */
export function wordmarkName(project, fallback = 'Wordmark') {
  const client = String(project?.detective?.clientName || '').trim()
  if (client) return client
  const wordmark = String(project?.logoWordmark || '').trim()
  if (wordmark) return wordmark
  return String(project?.name || '').trim() || fallback
}
