/**
 * Phase 4B / 5 — Document / Document Template / Document Version.
 *
 * A Document is a mutable composition instance for one project.
 * This plane holds the Book (4B) and the Presentation (5).
 * A Document Template is structure only.
 * A Document Version is an immutable freeze at a named event.
 *
 * Identity stays on the project. Versions reference it; they do not own it.
 */

import { makeRef, parseRefKey } from '../artifacts/artifactRef'
import { paletteSnapshot, typePairingSnapshot } from '../artifacts/artifactSnapshot'
import {
  bookBuilderFor,
  bookCompositionOf,
  legacyCompositionFrom,
  pickBookOverrides,
} from '../book/bookBuilder'
import { presentationBuilderFor } from './presentationBuilder'

export const DTPL_BUILTIN_BOOK = 'dtpl_builtin_book'
export const DTPL_BUILTIN_PRESENTATION = 'dtpl_builtin_presentation'

export const DOCUMENT_KIND_BOOK = 'book'
export const DOCUMENT_KIND_PRESENTATION = 'presentation'

export const FREEZE_SENT = 'sent'
export const FREEZE_SENT_FOR_REVIEW = 'sentForReview'

/**
 * Representable events. Book Send writes `sent`.
 * Presentation Send writes `sentForReview`. Later events are not written here.
 */
export const DOCUMENT_VERSION_FREEZE_EVENTS = Object.freeze([
  'sent',
  'sentForReview',
  'changesRequested',
  'approved',
  'delivered',
])

export const DOCUMENT_VERSION_CONTENT_REF_KINDS = Object.freeze([
  'markConcept',
  'palette',
  'typePairing',
])

export const DOCUMENT_VERSION_FORBIDDEN_KEYS = Object.freeze([
  'detective',
  'brief',
  'directions',
  'tasks',
  'logoImage',
  'pageOrder',
  'delivery_pack',
  'pack',
])

function copyJson(value) {
  if (value == null || typeof value !== 'object') return value
  return JSON.parse(JSON.stringify(value))
}

function mint(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function mintDocumentId() {
  return mint('doc')
}

export function mintDocumentVersionId() {
  return mint('dver')
}

export function emptyDocumentVersions() {
  return []
}

export function emptyDocuments() {
  return []
}

export function documentsOf(project) {
  return Array.isArray(project?.documents) ? project.documents.filter(Boolean) : []
}

export function upsertDocumentList(list, doc) {
  const next = Array.isArray(list) ? list.slice() : []
  if (!doc?.kind) return next
  const i = next.findIndex((d) => d?.kind === doc.kind)
  if (i >= 0) next[i] = doc
  else next.push(doc)
  return next
}

/** Additive hydrate: keep Book alias, seed documents[] from it, never invent Presentation. */
export function hydrateProjectDocuments(p) {
  const document = p?.document && typeof p.document === 'object' ? p.document : null
  let documents = Array.isArray(p?.documents)
    ? p.documents.filter((d) => d && typeof d === 'object')
    : []
  if (
    isBookDocument(document) &&
    !documents.some((d) => d?.kind === DOCUMENT_KIND_BOOK && d.documentId === document.documentId)
  ) {
    documents = [...documents, document]
  }
  return {
    document,
    documents,
    documentVersions: Array.isArray(p?.documentVersions) ? p.documentVersions : [],
    presentationBuilder: presentationBuilderFor(p),
  }
}

/**
 * Presentation chrome from the live Book. Working state stays on
 * `project.bookBuilder`; this is a snapshot for a Version.
 */
export function overridesFromBookBuilder(project) {
  const bb = bookBuilderFor(project)
  return copyJson({
    pageSize: bb.pageSize,
    edgeSpace: bb.edgeSpace,
    printShop: bb.printShop,
    type: bb.type,
    typeColor: bb.typeColor,
    pageBg: bb.pageBg,
    running: bb.running,
  })
}

/**
 * Identity artifact refs at this moment. Values stay on the project /
 * identity snapshot; the Version only stores { kind, id }.
 */
export function contentRefsFromProject(project) {
  const refs = {}
  const chosen = (project?.logoConcepts || []).find((c) => c?.chosen)
  if (chosen?.id) {
    refs.markConcept = makeRef('markConcept', String(chosen.id))
  }
  const pal = paletteSnapshot(project)
  if ((pal.hexes || []).length) {
    refs.palette = makeRef('palette', pal.id)
  }
  const type = typePairingSnapshot(project)
  if (String(type.heading || '').trim() || String(type.body || '').trim()) {
    refs.typePairing = makeRef('typePairing', type.id)
  }
  return refs
}

export function isBookDocument(value) {
  return !!(
    value &&
    typeof value === 'object' &&
    value.kind === DOCUMENT_KIND_BOOK &&
    value.documentId &&
    value.templateId === DTPL_BUILTIN_BOOK
  )
}

/** One Book Document for this project. Does not mint if one already exists. */
/**
 * The Book Document for a project, creating and migrating it if needed.
 *
 * THE MIGRATION LIVES HERE, not in the persist `migrate` step, and the reason
 * is a hole this repo has already been bitten by: `migrate` runs only for a
 * stored payload below the current version number, so a workspace restored
 * from an older JSON backup never passes through it. `bookBuilderFor` already
 * reads a legacy key at read time for exactly that case. Doing the same at
 * ensure time means every path that reaches a Book Document — opening the
 * editor, sending — migrates it, once, whatever route the data arrived by.
 *
 * IDEMPOTENT, ADDITIVE, NON-DESTRUCTIVE. A Document that already carries
 * overrides is returned untouched; `project.bookBuilder` is never deleted, so
 * a project that migrates and is then opened by an older build still has its
 * settings. Running this twice produces the same object.
 */
export function ensureBookDocumentData(project, now = new Date().toISOString()) {
  const existing = isBookDocument(project?.document)
    ? project.document
    : documentsOf(project).find(isBookDocument) || null

  if (existing) {
    const hasOverrides = existing.overrides && typeof existing.overrides === 'object'
    const hasComposition = Array.isArray(existing.composition)
    if (hasOverrides && hasComposition) return existing
    /* An identity minted by 4B, before the Document owned anything. Fill it
       from the legacy bag rather than from defaults, or a project that had a
       laid-out book would silently reset to a fresh one. */
    return {
      ...existing,
      overrides: hasOverrides
        ? existing.overrides
        : pickBookOverrides(project?.bookBuilder),
      composition: hasComposition
        ? existing.composition
        : legacyCompositionFrom(project?.bookBuilder),
      updatedAt: now,
    }
  }

  return {
    documentId: mintDocumentId(),
    projectId: project?.id,
    kind: DOCUMENT_KIND_BOOK,
    templateId: DTPL_BUILTIN_BOOK,
    createdAt: now,
    updatedAt: now,
    overrides: pickBookOverrides(project?.bookBuilder),
    composition: legacyCompositionFrom(project?.bookBuilder),
  }
}

export function isPresentationDocument(value) {
  return !!(
    value &&
    typeof value === 'object' &&
    value.kind === DOCUMENT_KIND_PRESENTATION &&
    value.documentId &&
    value.templateId === DTPL_BUILTIN_PRESENTATION
  )
}

/** One Presentation Document. Looks only at documents[]. Never writes the Book alias. */
export function ensurePresentationDocumentData(project, now = new Date().toISOString()) {
  const listed = documentsOf(project).find(isPresentationDocument)
  if (listed) return listed
  return {
    documentId: mintDocumentId(),
    projectId: project?.id,
    kind: DOCUMENT_KIND_PRESENTATION,
    templateId: DTPL_BUILTIN_PRESENTATION,
    createdAt: now,
    updatedAt: now,
  }
}

const DIRECTION_REF_SLOTS = Object.freeze([
  ['mark', 'markConcept'],
  ['palette', 'palette'],
  ['typePairing', 'typePairing'],
])

/**
 * Expand working Presentation contents into freeze-time composition items.
 * Copies Direction title as label. Does not store note, evidence, or payload.
 */
export function expandPresentationComposition(project) {
  const builder = presentationBuilderFor(project)
  const dirs = Array.isArray(project?.directions) ? project.directions : []
  return builder.contents.map((row) => {
    const dir = dirs.find((d) => d?.recordId && d.recordId === row.id) || null
    const contentRefs = {}
    const refs = dir?.refs && typeof dir.refs === 'object' ? dir.refs : {}
    for (const [slot, kind] of DIRECTION_REF_SLOTS) {
      const parsed = parseRefKey(refs[slot])
      if (!parsed || parsed.kind !== kind || !parsed.id) continue
      contentRefs[kind] = makeRef(kind, parsed.id)
    }
    return {
      itemId: row.itemId,
      sourceKind: 'direction',
      sourceId: row.id,
      label: String(dir?.title || '').trim(),
      contentRefs,
    }
  })
}

/** Mark images to freeze onto an Identity Snapshot for this composition. */
export function presentedMarksFromComposition(project, composition) {
  const concepts = Array.isArray(project?.logoConcepts) ? project.logoConcepts : []
  const out = []
  const seen = new Set()
  for (const item of composition || []) {
    const id = String(item?.contentRefs?.markConcept?.id || '').trim()
    if (!id || seen.has(id)) continue
    const hit = concepts.find((c) => String(c?.id) === id)
    const image = String(hit?.image || '').trim()
    if (!image) continue
    seen.add(id)
    out.push({ id, image })
  }
  return out
}

export function latestSentPresentationVersion(project, documentId) {
  const list = Array.isArray(project?.documentVersions) ? project.documentVersions : []
  const id = String(documentId || '').trim()
  const hits = list.filter(
    (v) =>
      v?.freezeEvent === FREEZE_SENT_FOR_REVIEW &&
      (!id || v.documentId === id)
  )
  return hits.length ? hits[hits.length - 1] : null
}

/**
 * Immutable Presentation Version for a successful send-for-review.
 * identitySnapshotId is required. freezeEvent is always sentForReview.
 */
export function buildPresentationVersionData(
  project,
  { identitySnapshotId } = {}
) {
  const snapshotId = String(identitySnapshotId || '').trim()
  if (!snapshotId) {
    return { ok: false, error: 'identitySnapshotId is required' }
  }
  const doc = documentsOf(project).find(isPresentationDocument)
  if (!isPresentationDocument(doc)) {
    return { ok: false, error: 'No Presentation Document on this project' }
  }
  const builder = presentationBuilderFor(project)
  if (!builder.contents.length) {
    return { ok: false, error: 'Select at least one direction' }
  }
  const version = copyJson({
    documentVersionId: mintDocumentVersionId(),
    documentId: doc.documentId,
    projectId: project.id,
    templateId: DTPL_BUILTIN_PRESENTATION,
    freezeEvent: FREEZE_SENT_FOR_REVIEW,
    createdAt: new Date().toISOString(),
    identitySnapshotId: snapshotId,
    overrides: {},
    contentRefs: {},
    composition: expandPresentationComposition(project),
  })
  return { ok: true, version }
}

/**
 * A pack for a FROZEN Book Version — the adapter, and the whole of it.
 *
 * PURE OVER (version, snapshot). No project argument, and that is the test
 * rather than a convention: a function that cannot see the live project cannot
 * accidentally read it. Everything comes from the Version's own frozen content,
 * composition and overrides, and from the Identity Snapshot that Send required.
 *
 * ONE RENDERER. This produces the same pack shape `buildBrandPackSnapshot`
 * produces, so the existing generator and `BrandBookPreview` render a Version
 * with no second implementation — different input adapter, same pipeline.
 *
 * `detective` is deliberately empty. `readField` falls through to the flat
 * value for detective-scoped fields, which is where the frozen answer already
 * is; leaving it empty makes it impossible for a live brief to leak in.
 */
export function packFromBookVersion(version, snapshot) {
  const v = version || {}
  const overrides = v.overrides || {}
  const identity = snapshot?.payload || {}
  const missing = []

  const mark = identity.mark || null
  if (!mark?.image) missing.push('mark')
  const palette = identity.palette || null
  if (!palette?.hexes?.length) missing.push('palette')
  const type = identity.type || null
  if (!type?.heading && !type?.body) missing.push('typePairing')

  return copyJson({
    ...(v.content || {}),
    /* Empty on purpose — see above. */
    detective: {},
    /* Identity from the snapshot the Send took, never from today's project. */
    palette: palette?.hexes ? [...palette.hexes] : [],
    colorRoles: palette?.roles ? { ...palette.roles } : {},
    typeHeading: type?.heading || '',
    typeBody: type?.body || '',
    typeWhy: type?.why || '',
    logoImage: mark?.image || '',
    logoWordmark: identity.wordmark || '',
    logoDirection: identity.logoDirection || '',
    /* The Book's own presentation choices, as frozen. */
    bookPageBg: overrides.pageBg || {},
    bookTypeScale: overrides.type || {},
    bookTypeColor: overrides.typeColor || {},
    bookGrid: overrides.grid || {},
    bookRunning: overrides.running || {},
    pageSize: overrides.pageSize,
    edgeSpace: overrides.edgeSpace,
    printShop: overrides.printShop,
    /* Which pages, in what order, as sent — and, since 10C, where the
       designer placed their elements on them. A Version has carried its own
       composition since Phase 7, so a frozen book already had everything an
       authored placement needs; only the LIVE pack was missing it. */
    bookComposition: Array.isArray(v.composition) ? v.composition : [],
    /* THE SAME KEY THE LIVE PACK USES, holding the Version's own copies.
       `appAssetFor` resolves `packageAssets` without caring which it has, so
       one resolver serves the working book and the frozen one — and a frozen
       render has no path back to the live shelf, because this list is all it
       can see. A Version frozen before Phase 9 has none and renders exactly as
       it did. */
    packageAssets: Array.isArray(v.appAssets) ? v.appAssets : [],
    /* Same keys the live pack uses, so one resolver serves both. */
    touchpoints: Array.isArray(v.appPlacement?.touchpoints) ? [...v.appPlacement.touchpoints] : [],
    touchpointApps: v.appPlacement?.apps && typeof v.appPlacement.apps === 'object'
      ? v.appPlacement.apps
      : {},
    /* NEVER a fallback. A reference the snapshot cannot answer for is named
       here so the surface can say so out loud; substituting today's mark would
       show work that was never in this send. */
    missingRefs: missing,
    frozen: true,
    documentVersionId: v.documentVersionId || '',
    exportedAt: v.createdAt || '',
  })
}

/**
 * THE FROZEN BOOK EXPORT PATH.
 *
 * Everything the existing generator needs to draw one frozen Version, and
 * nothing else. `downloadBrandPackVectorPdf(pack, handle, { book })` and
 * `<BrandBookPreview pack={pack} book={book} />` are the SAME two calls the
 * working Book already makes — this only swaps the input adapter, which is
 * what "one rendering architecture, two adapters" has to mean if it is to mean
 * anything. A second generator for frozen books is the defect this shape
 * exists to prevent.
 *
 * `book` is separate from `pack` because the generator has always taken page
 * setup that way (`resolveBookSetup(options.book)`); it is the frozen
 * overrides, not a live read.
 *
 * The project argument LOOKS like a live read and is not: `documentVersions`
 * and `identitySnapshots` are the append-only immutable stores, so this is a
 * lookup by id in a record that cannot change, and the render itself stays
 * pure over (version, snapshot). Anything mutable is refused rather than
 * resolved — see `missingRefs`.
 */
export function bookVersionRenderInputs(project, documentVersionId) {
  const wanted = String(documentVersionId || '').trim()
  if (!wanted) return { ok: false, error: 'documentVersionId is required' }

  const versions = Array.isArray(project?.documentVersions) ? project.documentVersions : []
  const version = versions.find((v) => v?.documentVersionId === wanted) || null
  if (!version) return { ok: false, error: 'No such Version on this project' }
  /* A Presentation Version has its own projector and its own client surface.
     Rendering one as a book would draw the wrong document from real data,
     which is worse than refusing. */
  if (version.templateId !== DTPL_BUILTIN_BOOK) {
    return { ok: false, error: 'That Version is not a Book Version' }
  }

  /* The snapshot the Send took. Absent is a MISSING STATE, not a reason to
     read today's Identity — `packFromBookVersion` names what it could not
     resolve and the surface says so out loud. */
  const snapshots = Array.isArray(project?.identitySnapshots) ? project.identitySnapshots : []
  const snapshot =
    snapshots.find((s) => s?.snapshotId === version.identitySnapshotId) || null

  const pack = packFromBookVersion(version, snapshot)
  const overrides = version.overrides || {}
  return {
    ok: true,
    version,
    pack,
    book: {
      pageSize: overrides.pageSize,
      edgeSpace: overrides.edgeSpace,
      printShop: overrides.printShop,
    },
    missingRefs: pack.missingRefs,
  }
}

/**
 * ── PHASE 8 · WHAT A DELIVERY IS MADE OF ──────────────────────────────────
 *
 * THE ONE THING DELIVERY MAY READ. Before this, the client's copy was built
 * from `buildCurrentBrandPack()` — the LIVE project — and the Document Version
 * was minted afterwards, from live state again, with its failure caught and
 * logged. So the delivery and the Version were two independent freezes of the
 * same moment, neither naming the other, and the one the client actually
 * received was the one nothing could later identify. A delivery could exist
 * with no Version at all.
 *
 * This resolves the OPPOSITE way round: name a Version, and everything the
 * client gets comes out of it.
 *
 * NAMED REFUSALS, NEVER A FALLBACK. Every branch below returns a sentence a
 * designer can act on. There is deliberately no "…or the live project" arm:
 * the whole point of the phase is that a delivery which cannot say which
 * Version it is has nothing to be honest about.
 *
 * STRICTER THAN THE RENDERER ON PURPOSE. `bookVersionRenderInputs` reports an
 * unresolvable reference in `missingRefs` and renders the rest, which is right
 * for a studio surface looking at history — showing what survives is more
 * useful than showing nothing. A DELIVERY is a different act: sending a client
 * a book with the mark missing is worse than not sending it, so the same
 * `missingRefs` becomes a refusal here.
 *
 * NO APPROVAL GATE. Phase 8 locked D1=C / D2=E: Delivery records what was
 * delivered, it does not adjudicate it. Nothing here reads a review round, a
 * response, or `step_status`, and nothing should be added that does.
 */

/** What a missing reference is called when a designer has to fix it. */
const MISSING_REF_LABEL = Object.freeze({
  mark: 'the mark',
  palette: 'the colors',
  typePairing: 'the type',
})

/**
 * The frozen inputs for delivering ONE named Book Version.
 *
 * @param {object} project  holds the immutable Version and Snapshot stores
 * @param {string} documentVersionId  the exact Version being delivered
 * @returns {{ok: true, version, pack, book, source} | {ok: false, error: string}}
 */
export function deliverySourceFor(project, documentVersionId) {
  const wanted = String(documentVersionId || '').trim()
  if (!wanted) {
    return { ok: false, error: 'Couldn’t send it — no book version to send' }
  }

  const built = bookVersionRenderInputs(project, wanted)
  if (!built.ok) {
    /* `bookVersionRenderInputs` already refuses an unknown id and a
       Presentation Version. Its wording is the studio's; keep it. */
    return { ok: false, error: built.error }
  }

  const { version } = built
  const snapshotId = String(version.identitySnapshotId || '').trim()
  if (!snapshotId) {
    /* Cannot happen through `recordSentBookVersion`, which requires one. A
       hand-edited or imported payload can still get here, and delivering it
       would send a book with no identity in it. */
    return {
      ok: false,
      error: 'Couldn’t send it — that book version has no identity recorded',
    }
  }

  /* NOT a fallback to today's Identity. The snapshot this Version froze is the
     only identity this delivery may carry; if it is gone, the send is refused
     rather than quietly re-pointed at whatever Identity looks like now. */
  const missing = Array.isArray(built.missingRefs) ? built.missingRefs : []
  if (missing.length) {
    const named = missing.map((k) => MISSING_REF_LABEL[k] || k)
    return {
      ok: false,
      error: `Couldn’t send it — that book version is missing ${joinWords(named)}`,
    }
  }

  return {
    ok: true,
    version,
    pack: built.pack,
    book: built.book,
    /* IDS ONLY. This travels to the client inside the delivery envelope, so it
       carries names for things and never the things themselves — no
       composition, no contentRefs, no palette, type or mark data, and never
       `project_local_id`, which is the studio's own key for its own row. */
    source: {
      documentVersionId: version.documentVersionId,
      identitySnapshotId: snapshotId,
    },
  }
}

/** "a, b and c" — for a sentence, not a list. */
function joinWords(list) {
  const items = (list || []).filter(Boolean)
  if (items.length <= 1) return items[0] || ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * Immutable Version payload for a successful Send.
 * `identitySnapshotId` is required — the snapshot from that same Send.
 */
export function buildDocumentVersionData(
  project,
  { identitySnapshotId, freezeEvent = FREEZE_SENT, content = null, appAssets = null, appPlacement = null } = {}
) {
  const snapshotId = String(identitySnapshotId || '').trim()
  if (!snapshotId) {
    return { ok: false, error: 'identitySnapshotId is required' }
  }
  if (!isBookDocument(project?.document)) {
    return { ok: false, error: 'No Book Document on this project' }
  }
  const event = freezeEvent || FREEZE_SENT
  if (!DOCUMENT_VERSION_FREEZE_EVENTS.includes(event)) {
    return { ok: false, error: `Unknown freeze event: ${event}` }
  }
  const version = copyJson({
    documentVersionId: mintDocumentVersionId(),
    documentId: project.document.documentId,
    projectId: project.id,
    templateId: project.document.templateId,
    freezeEvent: event,
    createdAt: new Date().toISOString(),
    identitySnapshotId: snapshotId,
    overrides: overridesFromBookBuilder(project),
    contentRefs: contentRefsFromProject(project),
    /* Which pages were sent, in what order. Without this a re-render produced
       the natural order rather than the designer's. */
    composition: bookCompositionOf(project),
    /* The resolved words that were printed. Supplied by the caller, which is
       the layer that can build a pack; passing it in keeps this module free of
       the export pipeline. */
    content: content && typeof content === 'object' ? copyJson(content) : {},
    /* THE PRODUCED ARTWORK THIS BOOK SHOWS, BY VALUE.
       A reference into `packageAssets` would let a re-produce tomorrow change
       a book delivered yesterday, so the bytes are copied here — the same
       thing `buildIdentitySnapshot` does for the mark. Only what the book
       REFERENCES and only what the rights gate clears; `frozenAppAssetsFrom`
       applies both filters, so a withheld file never enters the Version and
       therefore never reaches the client. */
    appAssets: Array.isArray(appAssets) ? copyJson(appAssets) : [],
    /* Which surface each of those assets was placed on, and which surfaces the
       book had. A frozen pack's `detective` is empty on purpose, so without
       this the Version cannot rebuild its own Applications pages. */
    appPlacement: appPlacement && typeof appPlacement === 'object'
      ? { touchpoints: copyJson(appPlacement.touchpoints || []), apps: copyJson(appPlacement.apps || {}) }
      : { touchpoints: [], apps: {} },
  })
  return { ok: true, version }
}

export function versionHasForbiddenKeys(version) {
  if (!version || typeof version !== 'object') return DOCUMENT_VERSION_FORBIDDEN_KEYS.slice()
  return DOCUMENT_VERSION_FORBIDDEN_KEYS.filter((k) => Object.hasOwn(version, k))
}

export function contentRefKindsOf(version) {
  const refs = version?.contentRefs || {}
  return Object.values(refs)
    .map((r) => r?.kind)
    .filter(Boolean)
}
