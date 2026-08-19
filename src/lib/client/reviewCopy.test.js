import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { reasonToClientCopy } from './clientFacingError'
import { stalenessLine } from './reviewArtifact'

/**
 * THE WORDS ON THE TWO SCREENS A CLIENT AND A DESIGNER ACTUALLY READ.
 *
 * This product is built for people whose executive function is the thing under
 * strain, and the ADHD brief is explicit about what that rules out: no red
 * badges for a thing that is merely waiting, no counts of lateness, no
 * gamified rewards, no language that reads as a verdict on the person. A
 * client who taps twice has not done anything wrong, and a designer whose
 * client has not replied is not behind.
 *
 * Copy is the one part of this phase with no runtime guard behind it, so the
 * guard is here.
 */

const ROOT = new URL('../../..', import.meta.url).pathname
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8')

/** Words that turn a fact into an accusation or an alarm. */
const ALARMING = [
  /\bfail(ed|ure)?\b/i,
  /\berror\b/i,
  /\binvalid\b/i,
  /\bexpired\b/i,
  /\bdenied\b/i,
  /\brejected\b/i,
  /\bforbidden\b/i,
  /\bnot allowed\b/i,
  /\byou must\b/i,
  /\bwarning\b/i,
  /!/,
]

describe('what a refused response says to a client', () => {
  const REASONS = [
    'link_dead',
    'not_shown',
    'no_artifact',
    'no_open_round',
    'stale_round',
    'not_approvable',
    'unknown_direction',
    'preference_not_allowed',
    'too_many',
  ]

  it('has a sentence for every reason the database can return', () => {
    const sql = read('supabase/migrations/20260819120000_review_rounds.sql')
    /* Every reason the SQL emits, except the shape checks a client cannot
       cause through the page — those fall through to the generic recovery
       line on purpose. */
    const emitted = [...sql.matchAll(/'reason',\s*'([a-z_]+)'/g)].map((m) => m[1])
    const clientReachable = [...new Set(emitted)].filter(
      /* Excluded because no client can reach them. The shape checks
         (`bad_*`) are only reachable by a caller constructing its own request,
         and `not_owner` / `concurrent_open` are raised by the round-opening
         function, which is granted to `authenticated` and never to anon — a
         studio sees those, not a client. */
      (r) =>
        ![
          'bad_status',
          'bad_step',
          'bad_unit',
          'bad_target',
          'not_owner',
          'concurrent_open',
        ].includes(r)
    )
    expect(
      clientReachable.sort(),
      'a reason with no copy shows the generic line and tells the client nothing'
    ).toEqual([...REASONS].sort())
  })

  /**
   * ONE EXEMPTION, AND IT IS WORTH STATING RATHER THAN SOFTENING.
   *
   * "Expired" and "invalid" are banned from anything describing the client's
   * ANSWER or the WORK — that is the staleness rule in `reviewArtifact.js`, and
   * its reason is that an approval given in good faith is never invalid, the
   * work simply moved on. A LINK is a different subject. Links really do
   * expire, the client can do something about it, and rewording that into "this
   * isn't working right now" would trade an accurate sentence with a next step
   * for a vague one without. So the word is allowed exactly here, and the test
   * below pins what that line has to contain instead.
   */
  it('never blames the reader or raises an alarm', () => {
    for (const reason of REASONS.filter((r) => r !== 'link_dead')) {
      const copy = reasonToClientCopy(reason)
      expect(copy.length).toBeGreaterThan(0)
      for (const bad of ALARMING) {
        expect(copy, `"${copy}" reads as an alarm`).not.toMatch(bad)
      }
    }
  })

  it('tells a client with a dead link the one thing they can act on', () => {
    const copy = reasonToClientCopy('link_dead')
    expect(copy).toMatch(/ask your contact/i)
    /* Still not a verdict on them, even here. */
    for (const bad of [/\byou must\b/i, /\bdenied\b/i, /\bforbidden\b/i, /!/]) {
      expect(copy, `"${copy}" blames the reader`).not.toMatch(bad)
    }
  })

  /* The two that matter most, because they are the two a client will actually
     hit: their designer moved on, or they answered something twice. */
  it('tells a client whose designer moved on what to do next', () => {
    expect(reasonToClientCopy('stale_round')).toMatch(/newer version/i)
    expect(reasonToClientCopy('stale_round')).toMatch(/refresh/i)
  })

  it('does not tell a client their link is broken when it is not', () => {
    /* The single-`false` era answered all nine refusals with "This link isn't
       valid". Only one of them is about the link. */
    const linkish = REASONS.filter((r) => /link/i.test(reasonToClientCopy(r)))
    expect(linkish).toEqual(['link_dead'])
  })

  it('an unknown reason still gives a way forward rather than a dead end', () => {
    expect(reasonToClientCopy('something_new')).toMatch(/ask your contact/i)
  })
})

describe('what the studio reads', () => {
  const share = read('src/features/client-portal/ProjectOverviewShare.jsx')

  /* Neutral by rule: the client's answer was not wrong, the work moved. */
  it('says a stale approval without scoring it', () => {
    const line = stalenessLine({ stale: true })
    expect(line).toMatch(/show them the current one/i)
    for (const bad of [...ALARMING, /\byour fault\b/i, /\d+/]) {
      expect(line, `"${line}" is not neutral`).not.toMatch(bad)
    }
    expect(stalenessLine({ stale: false })).toBe('')
  })

  /* ADDITIONS 5.6 asked for a milestone. PRODUCT.md §21 asked for it not to be
     gamified. One sentence, no ornament. */
  it('states the approval milestone plainly', () => {
    expect(share).toMatch(/Your client approved the identity/)
    const milestone = share.slice(
      share.indexOf('const milestone'),
      share.indexOf('const toggleStep')
    )
    for (const bad of [/🎉|🎊|⭐|🏆|✨/, /congrat/i, /well done/i, /streak/i, /\bpoints\b/i]) {
      expect(milestone, 'the milestone is gamified').not.toMatch(bad)
    }
  })

  /* A superseded round is history, not a mistake. */
  it('describes a replaced round without implying anything went wrong', () => {
    expect(share).toMatch(/replaced by a newer send/)
    expect(share).not.toMatch(/round .*(expired|invalid|abandoned|failed)/i)
  })

  /* "Changes requested" reads as a verdict on a presentation, where the client
     was only ever asked to react. */
  it('does not read a presentation reply back as a rejection', () => {
    const portal = read('src/features/client-portal/PublicClientPortal.jsx')
    expect(portal).toMatch(/canApprove\s*\?\s*'Changes requested'\s*:\s*'Thanks — sent'/)
    expect(portal).toMatch(/canApprove \? 'Request changes' : 'Send my thoughts'/)
  })
})
