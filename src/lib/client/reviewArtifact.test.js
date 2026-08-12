/**
 * THE CLIENT SEES THE THING, APPROVES THE THING, AND THE RECORD SAYS WHICH.
 *
 * Before R4 the portal rendered a step label and two buttons, and
 * `step_status` recorded `{status, note}` against a step id. A client approved
 * the word "Identity"; the record could not distinguish that from approving a
 * completely different identity a month later.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  APPROVAL_CAPABLE_STEP_IDS,
  APPROVAL_UNITS,
  approvalStaleness,
  buildReviewArtifact,
  currentFingerprint,
  isApprovalCapable,
  REVIEW_ARTIFACT_FIELDS,
  REVIEW_ARTIFACT_LIMIT,
  stalenessLine,
} from './reviewArtifact'
import { paletteSnapshot, typePairingSnapshot } from '../artifacts/artifactSnapshot'
import { PORTAL_PUSHABLE_STEP_IDS } from '../journey/journey'

const PROJECT = () => ({
  name: 'Sparrow',
  palette: ['#1B4C7E', '#FAFAF9', '#E8B04B'],
  colorRoles: { primary: '#1B4C7E' },
  typeHeading: 'Fraunces SemiBold',
  typeBody: 'Inter Regular',
  logoConcepts: [
    { id: 'c1', image: 'data:image/png;base64,AAAA', why: 'first try', chosen: false },
    { id: 'c2', image: 'data:image/svg+xml;base64,PHN2Zy8+', why: 'the perched one', chosen: true },
  ],
  logoImage: 'data:image/svg+xml;base64,PHN2Zy8+',

  // ── none of this may travel ──
  feedbackNotes: 'PRIVATE-CRITIQUE',
  packageAssets: [{ id: 'a1', name: 'PRIVATE-STOCK', dataUrl: 'data:image/png;base64,ZZ', rights: 'thirdParty' }],
  directions: [
    { id: 'r1', label: 'A', title: 'The perched mark', note: 'chosen', chosen: true },
    { id: 'r2', label: 'B', title: 'PRIVATE-REJECTED', note: 'PRIVATE-CLIENT-HATED-IT' },
  ],
  decisionLog: [{ id: 'd1', kind: 'direction', title: 'PRIVATE-LOG-ENTRY', why: 'PRIVATE-WHY' }],
  moodItems: [{ id: 'p1', note: 'PRIVATE-RESEARCH' }],
  handoffNote: 'PRIVATE-HANDOFF',
  learnings: 'PRIVATE-LEARNINGS',
  scopeOutOf: 'PRIVATE-SCOPE',
  detective: { goal: 'PRIVATE-BRIEF-GOAL', deliverablesPicked: ['logoPrimary'] },
})

describe('approval attaches to a showable artifact, or does not exist', () => {
  /**
   * One unit. That is the finding, not an omission — every other stop either
   * has nothing renderable or has an artifact that is private by an earlier
   * decision this workstream is not allowed to reopen.
   */
  it('is capable only where an artifact can be built', () => {
    expect(APPROVAL_CAPABLE_STEP_IDS).toEqual(['design'])
    expect(isApprovalCapable('design')).toBe(true)
    for (const id of ['define', 'research', 'ideate', 'sketch', 'review', 'deliver', 'book']) {
      expect(isApprovalCapable(id)).toBe(false)
    }
  })

  /* The portal offers exactly what can be approved — no stop pushable with
     nothing behind it, which is the state G10.5 forbids. */
  it('the pushable set and the approval-capable set are the same list', () => {
    expect([...PORTAL_PUSHABLE_STEP_IDS]).toEqual([...APPROVAL_CAPABLE_STEP_IDS])
  })

  it('refuses to build an artifact for a stop that cannot show one', () => {
    for (const id of ['research', 'sketch', 'deliver', 'define']) {
      const r = buildReviewArtifact(PROJECT(), id)
      expect(r.ok).toBe(false)
      expect(r.reason).toMatch(/nothing a client can look at/i)
    }
  })

  it('names what the client is looking at, never the stage', () => {
    expect(APPROVAL_UNITS.design.noun).toBe('the identity')
    expect(APPROVAL_UNITS.design.noun).not.toMatch(/identity stage|design step|stage/i)
  })
})

describe('the artifact carries the design and nothing else', () => {
  const built = buildReviewArtifact(PROJECT(), 'design')

  it('builds from a project that has something to show', () => {
    expect(built.ok).toBe(true)
    expect(Object.keys(built.artifact.payload).sort()).toEqual(
      [...REVIEW_ARTIFACT_FIELDS.design].sort()
    )
  })

  it('carries the mark, the colors and the type', () => {
    const { mark, palette, type } = built.artifact.payload
    expect(mark.image).toBe('data:image/svg+xml;base64,PHN2Zy8+')
    expect(mark.id).toBe('c2')
    expect(palette.hexes).toEqual(['#1B4C7E', '#FAFAF9', '#E8B04B'])
    expect(type).toEqual({ heading: 'Fraunces SemiBold', body: 'Inter Regular' })
  })

  /**
   * THE ALLOW-LIST, proved by output rather than by reading it. Every private
   * value in the fixture is a distinctive string; none may appear anywhere in
   * the serialized artifact, through any path.
   *
   * This is the shape pass 2 had to reach for after a source scan missed
   * `decisionLineFromPack` — a reader in a module the scan did not walk. An
   * output assertion cannot be fooled by where the code lives.
   */
  it('carries no private value, by any route', () => {
    const wire = JSON.stringify(built.artifact)
    for (const secret of [
      'PRIVATE-CRITIQUE',
      'PRIVATE-STOCK',
      'PRIVATE-REJECTED',
      'PRIVATE-CLIENT-HATED-IT',
      'PRIVATE-LOG-ENTRY',
      'PRIVATE-WHY',
      'PRIVATE-RESEARCH',
      'PRIVATE-HANDOFF',
      'PRIVATE-LEARNINGS',
      'PRIVATE-SCOPE',
      'PRIVATE-BRIEF-GOAL',
    ]) {
      expect(wire, `${secret} reached the review artifact`).not.toContain(secret)
    }
  })

  /* The specific indirect path pass 2 found. Unselected Directions and the
     decision log are reachable from `decisionLineFromPack`; the review artifact
     must not touch that helper at all. */
  it('cannot leak an unselected direction through the decision line', () => {
    const wire = JSON.stringify(built.artifact)
    expect(wire).not.toContain('decisionLine')
    expect(wire).not.toContain('PRIVATE-REJECTED')
    expect(wire).not.toContain('directions')
  })

  /* A field added to the project tomorrow does not travel, because the payload
     is composed key by key rather than filtered. */
  it('ignores a field it has never heard of', () => {
    const p = PROJECT()
    p.futureInternalField = { secret: 'SENTINEL-FUTURE' }
    const r = buildReviewArtifact(p, 'design')
    expect(JSON.stringify(r.artifact)).not.toContain('SENTINEL-FUTURE')
  })

  it('refuses an empty Identity rather than showing a blank', () => {
    const r = buildReviewArtifact({ detective: {} }, 'design')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/add a mark, colors or type/i)
  })

  it('refuses a mark too large to send, with the size ceiling stated', () => {
    const p = PROJECT()
    p.logoConcepts = [
      { id: 'big', image: `data:image/png;base64,${'A'.repeat(REVIEW_ARTIFACT_LIMIT)}`, chosen: true },
    ]
    const r = buildReviewArtifact(p, 'design')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/too large/i)
  })
})

describe('the approval records which artifact', () => {
  /**
   * Identity is COMPOSED from ids the app already mints — owner decision 8:
   * do not invent content hashes where an immutable reference already exists.
   */
  it('is built from existing artifact references, not a new hash', () => {
    const p = PROJECT()
    const { artifact } = buildReviewArtifact(p, 'design')
    expect(artifact.refs).toEqual([
      'markConcept:c2',
      `palette:${paletteSnapshot(p).id}`,
      `typePairing:${typePairingSnapshot(p).id}`,
    ])
    expect(artifact.fingerprint).toBe(artifact.refs.join('+'))
  })

  it('is stable for unchanged work', () => {
    expect(currentFingerprint(PROJECT(), 'design')).toBe(
      currentFingerprint(PROJECT(), 'design')
    )
  })

  it('changes when any part of the design changes', () => {
    const base = currentFingerprint(PROJECT(), 'design')
    const newPalette = PROJECT()
    newPalette.palette = ['#000000']
    const newType = PROJECT()
    newType.typeHeading = 'Playfair Display Bold'
    const newMark = PROJECT()
    newMark.logoConcepts = [{ id: 'c9', image: 'data:image/png;base64,BBBB', chosen: true }]
    for (const changed of [newPalette, newType, newMark]) {
      expect(currentFingerprint(changed, 'design')).not.toBe(base)
    }
  })

  it('survives a mark that predates concept ids, with less identity not invented identity', () => {
    const legacy = PROJECT()
    legacy.logoConcepts = []
    const { artifact } = buildReviewArtifact(legacy, 'design')
    expect(artifact.payload.mark.image).toBeTruthy()
    expect(artifact.payload.mark.id).toBe('')
    expect(artifact.refs.some((r) => r.startsWith('markConcept:'))).toBe(false)
    expect(artifact.fingerprint).toBeTruthy()
  })
})

describe('an approval of an earlier version is surfaced as stale', () => {
  const project = PROJECT()
  const fp = currentFingerprint(project, 'design')
  const row = (status, artifact) => ({ step_status: { design: { status, artifact } } })

  it('is not stale while the work is unchanged', () => {
    const s = approvalStaleness(row('approved', fp), project, 'design')
    expect(s.stale).toBe(false)
    expect(s.approvedFingerprint).toBe(fp)
  })

  /**
   * The CLAUDE.md §17 gap, closed: "prevent confusion about which version was
   * approved". The designer swaps the mark after sign-off; the record no longer
   * describes the current work and now says so.
   */
  it('is stale once the design moves on', () => {
    const changed = PROJECT()
    changed.palette = ['#222222', '#EEEEEE']
    const s = approvalStaleness(row('approved', fp), changed, 'design')
    expect(s.stale).toBe(true)
    expect(s.currentFingerprint).not.toBe(fp)
  })

  /* A change request is already a request to change something — the work
     moving on is the point, not a problem. */
  it('never calls a change request stale', () => {
    const changed = PROJECT()
    changed.palette = ['#222222']
    expect(approvalStaleness(row('changes_requested', fp), changed, 'design').stale).toBe(false)
  })

  /* Approvals recorded before artifacts existed have no fingerprint. Marking
     every one of them stale on release day would be a badge on history. */
  it('leaves a pre-artifact approval alone rather than badging history', () => {
    expect(approvalStaleness(row('approved', undefined), PROJECT(), 'design').stale).toBe(false)
    expect(approvalStaleness({ step_status: {} }, PROJECT(), 'design').stale).toBe(false)
    expect(approvalStaleness(null, PROJECT(), 'design').stale).toBe(false)
  })

  /* Non-punitive by rule: no count, no second person, no shame word, and one
     obvious action. */
  it('says it without blaming anyone', () => {
    const line = stalenessLine({ stale: true })
    expect(line).toBe('Approved an earlier version — show them the current one')
    expect(line).not.toMatch(/you|invalid|expired|outdated|stale|\d/i)
    expect(stalenessLine({ stale: false })).toBe('')
  })
})

describe('the portal shows the thing before it asks the question', () => {
  const src = readFileSync(
    new URL('../../features/client-portal/PublicClientPortal.jsx', import.meta.url).pathname,
    'utf8'
  )

  /* There is no DOM test environment in this project (`vitest.config.js` sets
     `environment: 'node'` and no testing-library is installed), so the render
     order is asserted structurally. The binding guarantee is not this test — it
     is the RPC, which refuses a response to a step with no artifact stamped
     regardless of what any UI does. See portalRpcGates.test.js. */
  it('renders the artifact above the approve controls', () => {
    const artifactAt = src.indexOf('<ReviewArtifact')
    const actionsAt = src.indexOf('client-portal-step-actions')
    expect(artifactAt).toBeGreaterThan(-1)
    expect(actionsAt).toBeGreaterThan(-1)
    expect(artifactAt).toBeLessThan(actionsAt)
  })

  it('offers no step without an artifact to look at', () => {
    expect(src).toMatch(
      /stepVisibility\?\.\[s\.id\]\s*&&\s*portal\.reviewArtifacts\?\.\[s\.id\]/
    )
  })

  /* Read-only: the artifact renderer must not write studio-owned design data. */
  it('the artifact renderer holds no control that writes anything', () => {
    const start = src.indexOf('function ReviewArtifact')
    const end = src.indexOf('export default function PublicClientPortal')
    const body = src.slice(start, end)
    expect(body).not.toMatch(/onChange|onClick|onSubmit|<input|<button|<textarea/)
  })
})
