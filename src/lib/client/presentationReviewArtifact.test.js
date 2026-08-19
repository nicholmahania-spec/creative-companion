import { describe, expect, it } from 'vitest'
import { buildReviewArtifact, currentFingerprint } from './reviewArtifact'

/**
 * THE PRESENTATION A CLIENT SEES COMES OUT OF THE FREEZE, NOT OUT OF THE DESK.
 *
 * Phase 5 froze a Presentation Document Version so that what was sent could not
 * change afterwards. That guarantee is only worth something if the surface the
 * client actually looks at reads the frozen copy — a projection that quietly
 * fell back to live Directions or live Identity would give back exactly the
 * problem the freeze was built to prevent, and would do it invisibly.
 *
 * So the tests below are mostly one test written several ways: change the
 * project after the send, and prove the artifact does not move.
 */

const MARK_ID = 'mk_1'
const PAL_ID = 'pal_frozen'
const TYPE_ID = 'type_frozen'
const SNAP_ID = 'idsnap_1'
const VER_ID = 'dver_1'

/** A project that has sent one presentation of two directions for review. */
const PROJECT = (over = {}) => ({
  id: 'p1',
  /* LIVE state, deliberately different from everything frozen below, so any
     leak shows up as the wrong value rather than as a coincidence. */
  directions: [
    { recordId: 'dir_a', title: 'LIVE TITLE A' },
    { recordId: 'dir_b', title: 'LIVE TITLE B' },
  ],
  logoConcepts: [{ id: MARK_ID, chosen: true, image: 'data:image/png;base64,LIVE' }],
  palette: ['#111111'],
  typeHeading: 'Live Heading',
  typeBody: 'Live Body',

  artifacts: {
    [PAL_ID]: { kind: 'palette', id: PAL_ID, hexes: ['#aabbcc', '#ddeeff'], roles: { primary: '#aabbcc' } },
    [TYPE_ID]: { kind: 'typePairing', id: TYPE_ID, heading: 'Frozen Heading', body: 'Frozen Body' },
  },

  identitySnapshots: [
    {
      v: 1,
      kind: 'identitySnapshot',
      snapshotId: SNAP_ID,
      payload: {
        presentedMarks: [{ id: MARK_ID, image: 'data:image/png;base64,FROZEN' }],
      },
    },
  ],

  documentVersions: [
    {
      documentVersionId: VER_ID,
      documentId: 'doc_p',
      freezeEvent: 'sentForReview',
      identitySnapshotId: SNAP_ID,
      composition: [
        {
          itemId: 'pitem_1',
          sourceKind: 'direction',
          sourceId: 'dir_a',
          label: 'Frozen Title A',
          contentRefs: {
            markConcept: { kind: 'markConcept', id: MARK_ID },
            palette: { kind: 'palette', id: PAL_ID },
            typePairing: { kind: 'typePairing', id: TYPE_ID },
          },
        },
        {
          itemId: 'pitem_2',
          sourceKind: 'direction',
          sourceId: 'dir_b',
          label: 'Frozen Title B',
          contentRefs: { palette: { kind: 'palette', id: PAL_ID } },
        },
      ],
    },
  ],
  ...over,
})

describe('the presentation review artifact', () => {
  it('builds from a project that has sent one', () => {
    const r = buildReviewArtifact(PROJECT(), 'ideate')
    expect(r.ok).toBe(true)
    expect(r.artifact.unit).toBe('ideate')
    expect(r.artifact.payload.items).toHaveLength(2)
  })

  /* The Version id IS the identity of what was reviewed. It is already durable
     and already minted by Phase 5, so nothing new is invented to name it — the
     same principle as `design` composing its fingerprint from existing refs. */
  it('is identified by the Presentation Version it came from', () => {
    const r = buildReviewArtifact(PROJECT(), 'ideate')
    expect(r.artifact.fingerprint).toBe(VER_ID)
    expect(currentFingerprint(PROJECT(), 'ideate')).toBe(VER_ID)
  })

  it('keeps the frozen order of the send', () => {
    const r = buildReviewArtifact(PROJECT(), 'ideate')
    expect(r.artifact.payload.items.map((i) => i.itemId)).toEqual(['pitem_1', 'pitem_2'])
  })

  // ── The four ways live state could leak in, each shut ──

  it('shows the frozen title, not the one the designer has since typed', () => {
    const r = buildReviewArtifact(PROJECT(), 'ideate')
    const labels = r.artifact.payload.items.map((i) => i.label)
    expect(labels).toEqual(['Frozen Title A', 'Frozen Title B'])
    expect(labels.join(' ')).not.toMatch(/LIVE/)
  })

  it('shows the mark image from the snapshot, not the live concept', () => {
    const r = buildReviewArtifact(PROJECT(), 'ideate')
    expect(r.artifact.payload.items[0].mark.image).toContain('FROZEN')
    expect(r.artifact.payload.items[0].mark.image).not.toContain('LIVE')
  })

  it('shows the referenced palette and type, not the live ones', () => {
    const item = buildReviewArtifact(PROJECT(), 'ideate').artifact.payload.items[0]
    expect(item.palette.hexes).toEqual(['#aabbcc', '#ddeeff'])
    expect(item.type).toEqual({ heading: 'Frozen Heading', body: 'Frozen Body' })
  })

  /* The strongest form of the same claim: rewrite every live field the project
     has and the artifact must come back byte-identical. */
  it('does not move when the whole live project is rewritten', () => {
    const before = buildReviewArtifact(PROJECT(), 'ideate').artifact
    const after = buildReviewArtifact(
      PROJECT({
        directions: [{ recordId: 'dir_a', title: 'RENAMED' }],
        logoConcepts: [{ id: MARK_ID, chosen: true, image: 'data:image/png;base64,NEW' }],
        palette: ['#000000', '#ffffff'],
        typeHeading: 'Something Else',
        typeBody: 'Also Different',
      }),
      'ideate'
    ).artifact
    expect(after).toEqual(before)
  })

  /* Accepted Phase 5 finding, held rather than quietly improved: a ref that
     resolves to nothing renders as missing. Substituting live Identity would
     show the client work that was never in the send. */
  it('leaves a missing artifact missing rather than substituting live Identity', () => {
    const p = PROJECT({ artifacts: {} })
    const item = buildReviewArtifact(p, 'ideate').artifact.payload.items[0]
    expect(item.palette).toBeNull()
    expect(item.type).toBeNull()
  })

  it('leaves a mark missing when the snapshot did not freeze it', () => {
    const p = PROJECT({
      identitySnapshots: [
        { v: 1, kind: 'identitySnapshot', snapshotId: SNAP_ID, payload: { presentedMarks: [] } },
      ],
    })
    expect(buildReviewArtifact(p, 'ideate').artifact.payload.items[0].mark).toBeNull()
  })

  /* Kind-checked resolution. A palette id that somehow named a type pairing
     must resolve to nothing rather than to the wrong thing. */
  it('will not resolve a reference to the wrong kind of artifact', () => {
    const p = PROJECT({
      artifacts: { [PAL_ID]: { kind: 'typePairing', id: PAL_ID, heading: 'Wrong' } },
    })
    expect(buildReviewArtifact(p, 'ideate').artifact.payload.items[0].palette).toBeNull()
  })

  // ── Refusals ──

  it('refuses when nothing has been sent for review', () => {
    const r = buildReviewArtifact(PROJECT({ documentVersions: [] }), 'ideate')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/send the presentation for review first/i)
  })

  /**
   * A Book Version is not a Presentation Version. Only `sentForReview` counts,
   * or showing Directions would start rendering the brand book.
   *
   * THE FIXTURE CARRIES A FULL, PRESENTABLE COMPOSITION, and that is the whole
   * point of it. An earlier version of this test gave the Book Version
   * `composition: []`, which made the assertion vacuous: a mutation that
   * dropped the `sentForReview` filter and took the last Version regardless
   * still refused — on "that send had no directions" — so the test passed while
   * the guard it exists to prove was gone.
   *
   * With a real composition here, the only thing that can refuse this project
   * is the freeze-event filter itself.
   */
  it('does not treat a Book Version as something to present', () => {
    const p = PROJECT({
      documentVersions: [
        {
          documentVersionId: 'dver_book',
          documentId: 'doc_book',
          templateId: 'dtpl_builtin_book',
          freezeEvent: 'sent',
          identitySnapshotId: SNAP_ID,
          /* Identical in shape to the presentable composition above, so nothing
             about this record except its freeze event can disqualify it. */
          composition: [
            {
              itemId: 'pitem_book',
              sourceKind: 'direction',
              sourceId: 'dir_a',
              label: 'Book Page A',
              contentRefs: {
                markConcept: { kind: 'markConcept', id: MARK_ID },
                palette: { kind: 'palette', id: PAL_ID },
                typePairing: { kind: 'typePairing', id: TYPE_ID },
              },
            },
          ],
        },
      ],
    })
    const r = buildReviewArtifact(p, 'ideate')
    expect(r.ok, 'a Book Version was presented to a client').toBe(false)
    /* Refused for the right reason: nothing was sent for REVIEW. Not "no
       directions" — it has one. */
    expect(r.reason).toMatch(/send the presentation for review first/i)
  })

  it('refuses a send that had no directions in it', () => {
    const p = PROJECT({
      documentVersions: [
        { documentVersionId: VER_ID, freezeEvent: 'sentForReview', identitySnapshotId: SNAP_ID, composition: [] },
      ],
    })
    const r = buildReviewArtifact(p, 'ideate')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/no directions/i)
  })

  /* The newest send is the one under review. An older Version is history. */
  it('presents the most recent send when there have been several', () => {
    const p = PROJECT()
    p.documentVersions = [
      ...p.documentVersions,
      {
        documentVersionId: 'dver_2',
        freezeEvent: 'sentForReview',
        identitySnapshotId: SNAP_ID,
        composition: [
          { itemId: 'pitem_9', sourceId: 'dir_b', label: 'Round Two', contentRefs: {} },
        ],
      },
    ]
    const r = buildReviewArtifact(p, 'ideate')
    expect(r.artifact.fingerprint).toBe('dver_2')
    expect(r.artifact.payload.items.map((i) => i.label)).toEqual(['Round Two'])
  })

  /* The size ceiling is not raised for presentations, and it needs saying: a
     presentation carries up to one mark image per direction where `design`
     carries one, so this is the unit that will actually reach the limit. */
  it('refuses a presentation too large to send', () => {
    const huge = `data:image/png;base64,${'A'.repeat(1_600_000)}`
    const p = PROJECT({
      identitySnapshots: [
        {
          v: 1,
          kind: 'identitySnapshot',
          snapshotId: SNAP_ID,
          payload: { presentedMarks: [{ id: MARK_ID, image: huge }] },
        },
      ],
    })
    const r = buildReviewArtifact(p, 'ideate')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/too large/i)
  })

  /* The client's "I'm drawn to this one" answer names a Direction by its
     durable recordId, and the server checks the name against this list. If the
     id stopped travelling, every preference would be rejected as unknown. */
  it('carries the durable recordId the preference answer refers to', () => {
    const items = buildReviewArtifact(PROJECT(), 'ideate').artifact.payload.items
    expect(items.map((i) => i.sourceId)).toEqual(['dir_a', 'dir_b'])
  })

  /* Nothing about the studio's working material may ride along. */
  it('carries no studio-side material', () => {
    const json = JSON.stringify(buildReviewArtifact(PROJECT(), 'ideate').artifact)
    for (const leak of ['note', 'evidence', 'rationale', 'refs":{"mark', 'sourceKind']) {
      expect(json, `${leak} reached the client payload`).not.toContain(leak)
    }
  })
})
