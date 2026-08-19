/**
 * WHAT THE CLIENT IS ACTUALLY LOOKING AT WHEN THEY PRESS APPROVE.
 *
 * Until this module existed, the portal rendered a step LABEL and two buttons.
 * A client approved the word "Identity". `DESIGN_GRAMMAR` G10.5 has forbidden
 * that since it was written — "approvals attach to showable artifacts, not bare
 * stage names" — and `docs/PRD.md` §4.8 says the same thing in more words:
 * "gates attach to things you *show* — three logo concepts, a design, a final
 * pack". The rule was applied to exactly two stops (Directions, Brand book,
 * both withheld) and to none of the six that were pushable.
 *
 * THREE THINGS THIS FIXES, AND ONE IT DELIBERATELY DOES NOT.
 *
 * 1. The client sees the thing. A review artifact carries the mark, the palette
 *    and the type pairing — enough to render the design being approved.
 *
 * 2. The studio SHOWS it, explicitly. An artifact is stamped by a deliberate
 *    act, never derived from whatever the project happens to contain at the
 *    moment a client opens the page. A portal that re-derived on read would let
 *    the artwork change under an approval already in progress.
 *
 * 3. The approval records WHICH artifact. `fingerprint` is composed from the
 *    ids the app already mints — `logoConcepts[].id`, `paletteSnapshot().id`,
 *    `typePairingSnapshot().id` — so it is a composition of existing immutable
 *    references, not a new hashing scheme invented here. Change the palette and
 *    the fingerprint changes, which is what makes staleness detectable at all.
 *
 * WHAT IT DOES NOT DO: it does not make every stop showable again. A stage with
 * nothing showable loses the ability to collect a response rather than gaining a
 * fake artifact to justify one. See REVIEW_UNITS.
 *
 * TWO UNITS SINCE PHASE 6. `design` collects an approval; `ideate` shows the
 * frozen Presentation and collects feedback only. The rule above is what admits
 * the second one — Phase 5 gave Directions a file to send — and what still keeps
 * the other five out.
 */

import { paletteSnapshot, typePairingSnapshot } from '../artifacts/artifactSnapshot'
import { makeRef, refKey } from '../artifacts/artifactRef'
import { frozenPresentedMarkImage, isIdentitySnapshot } from '../artifacts/identitySnapshot'
import { latestSentPresentationVersion } from '../documents/documentModel'

/**
 * The stops a studio may SHOW to a client, and what each one collects.
 *
 * TWO UNITS, AND THE DIFFERENCE BETWEEN THEM IS THE PRODUCT, NOT A DETAIL.
 * `docs/PRD.md` §4.8 names them in one sentence — "gates attach to things you
 * *show* — three logo concepts, a design, a final pack" — and PRODUCT.md §07
 * puts them in order: `… Design → Review → Revision → Approval → …`. Review
 * and Approval are different moments, so they are different units here.
 *
 *   ideate  REVIEW. Several frozen Directions, shown together so the client
 *           can say which way to go and what to change. It collects FEEDBACK.
 *           There is no Approve button, because a presentation of options is
 *           not a thing to say yes to — choosing between them is the studio's
 *           job, informed by what the client said.
 *
 *   design  APPROVAL. The one settled identity — mark, colors, type. This is
 *           the yes, and the only unit that collects one.
 *
 * WHY `ideate` WAS ABSENT UNTIL NOW, AND WHAT CHANGED. Until Phase 5 the
 * exclusion read: "A Direction renders as CSS in the studio and has no file
 * behind it; there is nothing to send." That was true and is now false. Phase 5
 * introduced the Presentation Document Version — an immutable freeze of the
 * selected Directions, carrying its own Identity Snapshot and content-addressed
 * palette/type refs. There is now a file behind it, so the RULE that kept
 * `ideate` out (DESIGN_GRAMMAR G10.5: approvals attach to showable artifacts)
 * is what lets it in. `journey.js` and `ProjectOverviewShare.jsx` both said so
 * in advance: Directions "join this list when the portal can show the
 * composition". This is that.
 *
 * WHY EACH OF THE OTHERS IS STILL ABSENT — unchanged, and every one checked
 * against what the app actually holds rather than what a stage is called:
 *
 *   research    Private working space, by explicit product statement
 *               (`docs/PRD.md` §4.8: "Research is private working space").
 *   sketch      The only real Touchpoints artifacts are produced files in
 *               `packageAssets`, which is private — it carries uploads whose
 *               usage rights forbid handing them over, and routing it to a
 *               client is the exact P0 leak this workstream closed.
 *   review      A Tool, not a client-facing stage. Its subject is the identity,
 *               which is already approved under `design`.
 *   deliver     `delivery_pack` is gated on delivery_status='delivered' and
 *               stays that way. Delivery has its own moment, its own page and
 *               its own reaction — approving it early would collapse
 *               VERIFIED ≠ DELIVERED.
 *   book        Withheld, and absent from the RPC's step allowlist. It joins
 *               when the portal can show the book, which is not this phase.
 *   define      The brief is the CLIENT'S OWN WORK. They author it and submit
 *               it, and `form_status` already records that they did. An
 *               approval on top would be asking someone to sign off their own
 *               answers — a second gesture for a fact the app already has.
 *
 * Adding a stop here still means building its artifact first. That is the whole
 * point: the list is downstream of what can be shown.
 */
export const REVIEW_UNITS = Object.freeze({
  ideate: Object.freeze({
    stepId: 'ideate',
    /* What this unit gathers. `feedback` units never accept an approval —
       enforced here, in the portal, and in the RPC. */
    collects: 'feedback',
    /* What the client is looking at, in their words — never the stage name. */
    noun: 'the directions',
    shows: Object.freeze(['each direction', 'its colors', 'its type']),
  }),
  design: Object.freeze({
    stepId: 'design',
    collects: 'approval',
    noun: 'the identity',
    /* The parts a reader has to see before the question is fair. */
    shows: Object.freeze(['the mark', 'the colors', 'the type']),
  }),
})

/** Every stop the studio may show. Derived — never restated. */
export const REVIEW_UNIT_STEP_IDS = Object.freeze(Object.keys(REVIEW_UNITS))

/**
 * The units that collect an APPROVAL, which is a smaller set than the units
 * that can be shown. Kept separate on purpose: `ideate` is showable and is not
 * approvable, and collapsing the two ideas is exactly how a presentation of
 * options would acquire a yes/no it has no business carrying.
 */
export const APPROVAL_UNITS = Object.freeze(
  Object.fromEntries(
    Object.entries(REVIEW_UNITS).filter(([, u]) => u.collects === 'approval')
  )
)

/** Step ids that may collect an approval. Derived — never restated. */
export const APPROVAL_CAPABLE_STEP_IDS = Object.freeze(Object.keys(APPROVAL_UNITS))

/** Can this stop be shown to a client at all? */
export function isReviewUnit(stepId) {
  return Object.hasOwn(REVIEW_UNITS, String(stepId || ''))
}

/** Can this stop collect a client approval at all? */
export function isApprovalCapable(stepId) {
  return Object.hasOwn(APPROVAL_UNITS, String(stepId || ''))
}

/** What a shown stop gathers: 'approval' | 'feedback' | '' when not showable. */
export function collectsFor(stepId) {
  return REVIEW_UNITS[String(stepId || '')]?.collects || ''
}

/**
 * Bytes. Smaller than the delivery pack's ceiling on purpose: a delivery is one
 * payload at the end of a project, while review artifacts are stamped
 * repeatedly through it, and every one of them sits on the same row.
 */
export const REVIEW_ARTIFACT_LIMIT = 1_500_000

/**
 * THE ALLOW-LIST, per unit.
 *
 * Named field by field rather than filtered out of the project, for the reason
 * pass 2 recorded at length: a deny-list fails open, and the two fields that
 * leaked for months were both fields nobody had thought about. Anything not
 * listed here cannot reach a client through this path, including anything added
 * to the project tomorrow.
 */
const IDENTITY_FIELDS = Object.freeze(['mark', 'palette', 'type'])

/* The presentation payload is a list, and the allow-list names what one ROW of
   it may carry. `label` is the Direction title as frozen at send; `sourceId` is
   its durable recordId, which the client's preferred-direction answer refers to
   and the server validates against. No note, no evidence, no rationale — a
   Direction's working material is studio-side and stays there. */
const PRESENTATION_ITEM_FIELDS = Object.freeze([
  'itemId',
  'sourceId',
  'label',
  'mark',
  'palette',
  'type',
])

export const REVIEW_ARTIFACT_FIELDS = Object.freeze({
  design: IDENTITY_FIELDS,
  ideate: PRESENTATION_ITEM_FIELDS,
})

const clean = (v) => String(v ?? '').trim()

const bytes = (value) => {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? null)).length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

/** The mark the project has settled on, with its id where there is one. */
function chosenMark(project) {
  const concepts = Array.isArray(project?.logoConcepts) ? project.logoConcepts : []
  const hit = concepts.find((c) => c?.chosen) || null
  if (hit) return { id: clean(hit.id), image: clean(hit.image) }
  /* A project that set `logoImage` before concepts existed still has a mark to
     show; it simply has no id to name it by. The fingerprint falls back to the
     palette and type refs, which is honest — less identity, not invented
     identity. */
  const legacy = clean(project?.logoImage)
  return legacy ? { id: '', image: legacy } : null
}

/**
 * THE FROZEN PRESENTATION, PROJECTED FOR A CLIENT.
 *
 * Every value here comes from something already immutable, and that is the
 * whole design:
 *
 *   composition        the Presentation Document Version's own frozen list —
 *                      NOT `expandPresentationComposition`, which reads live
 *                      Directions. A title edited after the send must not
 *                      change what the client is looking at.
 *   mark images        `frozenPresentedMarkImage`, which reads the Identity
 *                      Snapshot taken by that same send and never live
 *                      `logoConcepts`.
 *   palette / type     `project.artifacts[id]`, the content-addressed store.
 *                      Its ids ARE its contents, so a "stale" read is not
 *                      possible — a changed palette is a different id.
 *
 * A ref that resolves to nothing renders as missing rather than falling back to
 * live Identity. That is the accepted Phase 5 finding, held on purpose: a
 * silent substitution would show the client work that was never sent.
 */
function frozenArtifactValue(project, ref) {
  if (!ref?.kind || !ref?.id) return null
  const hit = project?.artifacts?.[ref.id] || null
  /* Kind-checked, so a palette id can never resolve as a type pairing. */
  if (!hit || hit.kind !== ref.kind) return null
  return hit
}

function buildPresentationArtifact(project) {
  const version = latestSentPresentationVersion(project)
  if (!version) {
    return {
      ok: false,
      reason: 'Send the presentation for review first — there is nothing frozen to show',
    }
  }
  const items = Array.isArray(version.composition) ? version.composition : []
  if (!items.length) {
    return { ok: false, reason: 'That send had no directions in it' }
  }

  const snapshots = Array.isArray(project?.identitySnapshots)
    ? project.identitySnapshots
    : []
  const snapshot =
    snapshots.find(
      (sn) => isIdentitySnapshot(sn) && sn.snapshotId === version.identitySnapshotId
    ) || null

  const rows = items.map((item) => {
    const markRef = item?.contentRefs?.markConcept || null
    const image = markRef ? frozenPresentedMarkImage(snapshot, markRef.id) : ''
    const pal = frozenArtifactValue(project, item?.contentRefs?.palette)
    const type = frozenArtifactValue(project, item?.contentRefs?.typePairing)
    return {
      itemId: clean(item?.itemId),
      /* The Direction's durable recordId. The client's "I lean toward this
         one" answer names it, and the RPC checks the name against this list —
         which is why it has to travel. */
      sourceId: clean(item?.sourceId),
      label: clean(item?.label),
      mark: markRef && image ? { id: clean(markRef.id), image } : null,
      palette: pal?.hexes?.length ? { hexes: pal.hexes, roles: pal.roles || {} } : null,
      type:
        clean(type?.heading) || clean(type?.body)
          ? { heading: clean(type?.heading), body: clean(type?.body) }
          : null,
    }
  })

  return {
    ok: true,
    artifact: {
      v: 1,
      unit: 'ideate',
      /* WHICH presentation. The Version id is already durable and already
         minted by Phase 5, so this composes nothing new — the same principle
         as `design`'s joined refs, applied to a thing that has its own id. */
      fingerprint: clean(version.documentVersionId),
      refs: rows
        .flatMap((r) => [
          r.mark?.id ? refKey(makeRef('markConcept', r.mark.id)) : '',
        ])
        .filter(Boolean),
      payload: { items: rows },
    },
  }
}

/**
 * Build the artifact for one approval unit.
 *
 * Pure. Returns a reason rather than throwing when there is nothing to show —
 * "the studio pressed Show with an empty Identity" is an ordinary state and the
 * caller has to say something useful about it.
 *
 * @param {object} project
 * @param {string} stepId
 * @returns {{ok: true, artifact: object} | {ok: false, reason: string}}
 */
export function buildReviewArtifact(project, stepId) {
  if (!isReviewUnit(stepId)) {
    return { ok: false, reason: 'That stop has nothing a client can look at' }
  }
  if (stepId === 'ideate') {
    const built = buildPresentationArtifact(project)
    if (!built.ok) return built
    if (bytes(built.artifact) > REVIEW_ARTIFACT_LIMIT) {
      return {
        ok: false,
        reason: 'That presentation is too large to send — use smaller mark files',
      }
    }
    return built
  }
  const mark = chosenMark(project)
  const pal = paletteSnapshot(project)
  const type = typePairingSnapshot(project)
  const hasPalette = pal.hexes.length > 0
  const hasType = !!(clean(type.heading) || clean(type.body))

  /* Nothing to show is a refusal, not an empty artifact. A client sent a card
     with no mark, no colors and no type would be asked to approve a blank. */
  if (!mark && !hasPalette && !hasType) {
    return {
      ok: false,
      reason: 'Nothing on Identity to show yet — add a mark, colors or type first',
    }
  }

  /* Composed from ids the app already mints. `refKey` is the existing
     serialisation and `makeRef` throws on an undeclared kind, so a typo here
     cannot become a dangling reference. */
  const refs = [
    mark?.id ? refKey(makeRef('markConcept', mark.id)) : '',
    hasPalette ? refKey(makeRef('palette', pal.id)) : '',
    hasType ? refKey(makeRef('typePairing', type.id)) : '',
  ].filter(Boolean)

  const artifact = {
    v: 1,
    unit: 'design',
    /* WHICH artifact, as one comparable string. Identity comes from the
       existing snapshot ids; this only joins them. */
    fingerprint: refs.join('+'),
    refs,
    payload: {
      mark: mark ? { id: mark.id, image: mark.image } : null,
      palette: hasPalette ? { hexes: pal.hexes, roles: pal.roles } : null,
      type: hasType ? { heading: clean(type.heading), body: clean(type.body) } : null,
    },
  }

  if (bytes(artifact) > REVIEW_ARTIFACT_LIMIT) {
    return {
      ok: false,
      reason: 'That mark is too large to send for review — use a smaller file',
    }
  }
  return { ok: true, artifact }
}

/**
 * The fingerprint the project would produce right now, or '' when it has
 * nothing to show. Used to compare a stored approval against today's work.
 */
export function currentFingerprint(project, stepId) {
  const built = buildReviewArtifact(project, stepId)
  return built.ok ? built.artifact.fingerprint : ''
}

/**
 * HAS AN APPROVAL GONE STALE?
 *
 * The gap `CLAUDE.md` §17 named and nothing implemented: "prevent confusion
 * about which version was approved". Before this, a client approved the
 * identity, the designer replaced the mark, rewrote the palette and swapped the
 * typeface, and `step_status.design.status` still read `approved` — with
 * nothing on any screen able to tell the difference between that and a fresh
 * approval.
 *
 * Stale is not an error and must never be scored or coloured as one. It is a
 * fact with one obvious action behind it: show them again.
 *
 * @param {object|null} portal   a client_portals row
 * @param {object|null} project
 * @param {string} stepId
 * @returns {{stale: boolean, approvedFingerprint: string, currentFingerprint: string}}
 */
export function approvalStaleness(portal, project, stepId) {
  const entry = portal?.step_status?.[stepId] || null
  const approvedFingerprint = clean(entry?.artifact)
  const current = currentFingerprint(project, stepId)
  return {
    /* Only an APPROVAL can go stale. A change request is already a request to
       change something, so the work moving on is the point rather than a
       problem. And an approval recorded before artifacts existed has no
       fingerprint to compare — reporting that as stale would put a badge on
       every historical approval in the app on the day this ships. */
    stale:
      entry?.status === 'approved' &&
      !!approvedFingerprint &&
      !!current &&
      approvedFingerprint !== current,
    approvedFingerprint,
    currentFingerprint: current,
  }
}

/**
 * One line for the studio. Neutral by rule — no count, no colour word, no
 * second person, and never "expired" or "invalid": the approval happened, and
 * what changed is the work, not their answer.
 */
export function stalenessLine({ stale } = {}) {
  return stale ? 'Approved an earlier version — show them the current one' : ''
}
