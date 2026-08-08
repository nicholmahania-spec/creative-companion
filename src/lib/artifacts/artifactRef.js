/**
 * How one part of a project points at another without copying it.
 *
 * WHY THIS EXISTS. The architecture pass found that Directions, Presentations,
 * Brand Books, Templates, Approvals and Collections all need the same thing
 * first: a way to say "this one" about a creative artifact. Today they cannot.
 * `logoConcepts` and `moodItems` carry ids, but a palette is a bare array of
 * hex strings on the project and a type pairing is two strings — neither can
 * be named, so nothing can reference them and every future feature would have
 * had to copy their contents instead. Copies are what put the same brand fact
 * in two places, which is the defect this codebase keeps paying for.
 *
 * A REFERENCE IS `{ kind, id }`. Nothing more. It is not a pointer into the
 * store's shape, so a record can move without every reference breaking, and it
 * serialises to JSON with no revival step.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not build Directions, palettes-
 * as-records, or a document model. Kinds for those are declared so the grammar
 * is stable when they arrive, and `resolveRef` returns null for a kind nothing
 * stores yet. An honest null beats a kind added later with a different shape.
 */

/**
 * Every kind a reference may name.
 *
 * `stored: true`  — records that exist today and resolve now.
 * `stored: false` — declared so refs written by a future feature are valid
 *                   the day it ships, and so `refKey` strings never change
 *                   meaning underneath saved data.
 */
export const ARTIFACT_KINDS = Object.freeze({
  /** A mark the designer added on Identity → Mark. `logoConcepts[].id`. */
  markConcept: { stored: true, from: 'logoConcepts' },
  /** A pin on the Research wall — image, note, link or color. `moodItems[].id`. */
  evidence: { stored: true, from: 'moodItems' },
  /** An immutable palette snapshot in `project.artifacts`. */
  palette: { stored: true, from: 'artifacts' },
  /** An immutable heading+body pairing snapshot in `project.artifacts`. */
  typePairing: { stored: true, from: 'artifacts' },
  /**
   * A curated stimulus shown in Visual Discovery — a typeface at a weight, a
   * color. Resolves from `lib/discovery/samples.js`, not from project state:
   * a sample belongs to the app, not to one brand, so two projects that both
   * chose Fraunces reference the same id.
   */
  sample: { stored: true, from: 'samples' },
  /** Phase 3. A named combination of the above. Owns no brand content. */
  direction: { stored: false, from: 'artifacts' },
  /** Phase 5. */
  presentation: { stored: false, from: 'artifacts' },
  /** Phase 7. */
  book: { stored: false, from: 'artifacts' },
  /** Phase 4. Studio-level, not project-level. */
  template: { stored: false, from: 'studio' },
})

export const ARTIFACT_KIND_IDS = Object.freeze(Object.keys(ARTIFACT_KINDS))

const clean = (v) => String(v ?? '').trim()

/** True when `kind` is a declared artifact kind. */
export function isArtifactKind(kind) {
  return Object.hasOwn(ARTIFACT_KINDS, clean(kind))
}

/**
 * A reference to one artifact.
 *
 * @param {string} kind one of ARTIFACT_KIND_IDS
 * @param {string} id   the artifact's own id
 * @returns {{kind: string, id: string}}
 * @throws when the kind is not declared — a typo'd kind that silently became a
 *   dangling reference would be found months later by a blank book page.
 */
export function makeRef(kind, id) {
  const k = clean(kind)
  const i = clean(id)
  if (!isArtifactKind(k)) throw new Error(`Unknown artifact kind: "${kind}"`)
  if (!i) throw new Error(`Artifact ref needs an id (kind "${k}")`)
  return { kind: k, id: i }
}

/** True for a well-formed reference. Never throws — use for untrusted data. */
export function isRef(ref) {
  return (
    !!ref &&
    typeof ref === 'object' &&
    isArtifactKind(ref.kind) &&
    !!clean(ref.id)
  )
}

/**
 * A reference as one string — `palette:p_1f3a`.
 *
 * For Set/Map keys, dedupe and comparison. Two refs to the same artifact must
 * produce the same key, which is why ids are trimmed on the way in.
 */
export function refKey(ref) {
  if (!isRef(ref)) return ''
  return `${ref.kind}:${clean(ref.id)}`
}

/** The inverse of `refKey`. Returns null rather than a half-built ref. */
export function parseRefKey(key) {
  const s = clean(key)
  const at = s.indexOf(':')
  if (at < 1) return null
  const kind = s.slice(0, at)
  const id = s.slice(at + 1)
  if (!isArtifactKind(kind) || !clean(id)) return null
  return { kind, id }
}

export function sameRef(a, b) {
  const ka = refKey(a)
  return !!ka && ka === refKey(b)
}

/**
 * The artifact a reference names, or null.
 *
 * NULL IS A REAL ANSWER and callers must handle it: a referenced concept can
 * be deleted, and a kind can be declared before anything stores it. Returning
 * a placeholder here would put invented content into a brand book.
 *
 * @param {object} project
 * @param {{kind: string, id: string}} ref
 */
export function resolveRef(project, ref) {
  if (!isRef(ref) || !project) return null
  const { kind, id } = ref
  switch (kind) {
    case 'markConcept':
      return (project.logoConcepts || []).find((c) => c?.id === id) || null
    case 'sample':
      /* App-level, not project-level — resolved by the caller through
         `sampleById` so this module does not import the registry and the
         grammar stays free of content. */
      return null
    case 'evidence':
      /* Pins are workspace-wide with a projectId, not nested under the
         project, so this one takes the list from the caller's state. Use
         `resolveEvidenceRef` when you have `moodItems`. */
      return null
    default:
      return (project.artifacts || {})[id] || null
  }
}

/** `resolveRef` for samples, which belong to the app rather than a project. */
export function resolveSampleRef(index, ref) {
  if (!isRef(ref) || ref.kind !== 'sample') return null
  return index?.get?.(ref.id) || null
}

/** `resolveRef` for evidence, which lives on the workspace, not the project. */
export function resolveEvidenceRef(moodItems, ref) {
  if (!isRef(ref) || ref.kind !== 'evidence') return null
  return (moodItems || []).find((m) => String(m?.id) === ref.id) || null
}
