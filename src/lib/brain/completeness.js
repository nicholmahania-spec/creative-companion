/**
 * “What am I missing?” — element-level completeness for one project.
 *
 * The path bar answers a coarser question (has this STOP been reached), and
 * packReadiness answers a narrower one (can the pack be exported). Neither
 * says the thing a designer actually asks before handing a brand over: which
 * pieces of the identity are documented, and which are still assumed.
 * Clearspace, minimum size, the reason a type pair was chosen, whether any
 * text/background pair in the palette passes AA — all of those can be missing
 * from a project that reads 5/5 and “Ready” everywhere else.
 *
 * Two rules this module holds to:
 *
 * 1. NOTHING IS COUNTED THAT THE JOB DID NOT BUY. A logo-only project must
 *    never be told it is 40% complete because it has no type pair — that is
 *    the app inventing work. Scope is read from the brief's
 *    `deliverablesPicked`, the same field progressItemInScope reads, so this
 *    and the pack counter can't disagree. An empty pick means full scope,
 *    which is that field's existing meaning everywhere else.
 *
 * 2. A GAP IS STATED, NEVER SUBTRACTED. Every row is additive — “clearspace
 *    not written yet” with a button that opens the place to write it. There
 *    is no failing state, no red, and no gate: this is a checklist you can
 *    ignore, not a permission system.
 */

import { progressItemInScope } from '../brief/detectiveBrief'
import { isStockProjectPalette } from '../journey/journeyProgress'
import { labelForStepId } from '../journey/journey'
import { IDENTITY_SUBSTEPS } from '../journey/identitySubsteps'
import { buildColorSystem } from '../brandSystem'

/* Group names are DERIVED, never typed. Each group is an area the app has
   already named once — a path stop, or one of Identity's sub-screens — and a
   second spelling of any of them is the copy that goes stale on the next
   rename (see journeySingleSource.test.js for the nine that did). */
const substepLabel = (id) =>
  IDENTITY_SUBSTEPS.find((s) => s.id === id)?.label || id

const text = (v) => String(v ?? '').trim()
const filled = (v) => text(v).length > 0

/**
 * Deliverable ids that bring a whole area of the check into scope.
 * `guidelines` appears in most of them because a brand guidelines document
 * has to state colour, type and logo rules whatever else was bought.
 */
const APPLICATION_DELIVERABLES = [
  'businessCard',
  'socialKit',
  'stationery',
  'emailSignature',
  'packaging',
  'signage',
  'merch',
  'printCollateral',
  'illustration',
  'website',
]

/**
 * Every check, grouped the way a designer thinks about a brand rather than
 * the way the app stores it.
 *
 * `needs`  — deliverable ids that put this row in scope; null = always.
 * `ok`     — reads the project; must be a pure function of ctx.
 * `todo`   — what to do about it, in the imperative, five to eight words.
 * `view`   — where that happens (App view id), for the jump button.
 */
export const COMPLETENESS_GROUPS = [
  {
    id: 'strategy',
    label: labelForStepId('define'),
    checks: [
      {
        id: 'goal',
        label: 'What the project has to change',
        todo: 'Write the goal in the brief',
        view: 'project',
        ok: (c) => filled(c.detective.goal),
      },
      {
        id: 'audience',
        label: 'Who it is for',
        todo: 'Name the audience in the brief',
        view: 'project',
        ok: (c) => filled(c.detective.audience),
      },
      {
        id: 'personality',
        label: 'Brand personality words',
        todo: 'Add the three words a customer would use',
        view: 'project',
        ok: (c) =>
          filled(c.detective.toneOfVoice) ||
          filled(c.detective.brandAsPerson) ||
          filled(c.project.voice),
      },
      {
        id: 'promise',
        label: 'What the brand promises',
        todo: 'Write the promise on Identity',
        view: 'brand',
        section: 'voice',
        ok: (c) =>
          filled(c.project.messagingPromise) ||
          filled(c.detective.messagingPromise),
      },
      {
        id: 'avoid',
        label: 'What is off the table',
        todo: 'Record what the client ruled out',
        view: 'project',
        ok: (c) => filled(c.detective.avoid),
      },
    ],
  },
  {
    id: 'research',
    label: labelForStepId('research'),
    checks: [
      {
        id: 'references',
        label: 'Starred references, each with a reason',
        todo: 'Star a few pins and say why',
        view: 'studio',
        ok: (c) => {
          const starred = c.moodItems.filter((m) => m?.inPack)
          return starred.length > 0 && starred.every((m) => filled(m.note))
        },
      },
    ],
  },
  {
    id: 'ideate',
    label: labelForStepId('ideate'),
    checks: [
      {
        id: 'chosen',
        label: 'The direction you chose, and why',
        todo: 'Log the direction and the reason',
        view: 'spark',
        ok: (c) => {
          const logged = (c.project.decisionLog || []).some(
            (d) => d?.kind === 'direction' && filled(d.why)
          )
          const chosen = (c.project.directions || []).some(
            (d) => d?.chosen && filled(d.note)
          )
          return logged || chosen
        },
      },
    ],
  },
  {
    id: 'logo',
    label: substepLabel('logo'),
    checks: [
      {
        id: 'mark',
        label: 'A mark or wordmark',
        todo: 'Add the mark on Identity',
        view: 'brand',
        section: 'logo',
        ok: (c) =>
          filled(c.project.logoImage) || filled(c.project.logoWordmark),
      },
      {
        id: 'clearspace',
        /* Deliberately in scope even for a logo-only job: clearspace and
           minimum size are what stop the mark being wrecked the first time
           someone drops it into a sign layout, and they are the two rules a
           one-page logo guide exists to carry. */
        label: 'Clearspace rule',
        todo: 'Write the clearspace rule',
        view: 'brand',
        section: 'logo',
        ok: (c) => filled(c.project.logoClearspace),
      },
      {
        id: 'minSize',
        label: 'Minimum size',
        todo: 'Say how small the mark may go',
        view: 'brand',
        section: 'logo',
        ok: (c) => filled(c.project.logoMinSize),
      },
      {
        id: 'donts',
        label: 'Incorrect usage',
        todo: 'List what must not be done to the mark',
        view: 'brand',
        section: 'logo',
        ok: (c) => filled(c.project.logoDonts),
      },
    ],
  },
  {
    id: 'colour',
    label: substepLabel('colors'),
    needs: ['colourPalette', 'guidelines'],
    checks: [
      {
        id: 'palette',
        label: 'A palette of your own',
        todo: 'Set the palette on Identity',
        view: 'brand',
        section: 'colors',
        ok: (c) => c.palette.length >= 2 && !isStockProjectPalette(c.palette),
      },
      {
        id: 'roles',
        label: 'Each colour has a job',
        todo: 'Assign the colour roles',
        view: 'brand',
        section: 'colors',
        ok: (c) =>
          Object.values(c.project.colorRoles || {}).some((v) => filled(v)),
      },
      {
        id: 'roleWhy',
        label: 'Why those colours',
        todo: 'Say why each role fits the brand words',
        view: 'brand',
        section: 'colors',
        ok: (c) => {
          const roles = c.project.colorRoles || {}
          const why = c.project.colorRoleWhy || {}
          const assigned = Object.keys(roles).filter((k) => filled(roles[k]))
          if (!assigned.length) return false
          return assigned.every((r) => filled(why[r]))
        },
      },
      {
        id: 'contrast',
        label: 'A text pair that passes AA',
        todo: 'Check contrast on Identity · colour',
        view: 'brand',
        section: 'colors',
        ok: (c) =>
          buildColorSystem(c.palette, c.project.colorRoles).passPairs.length > 0,
      },
    ],
  },
  {
    id: 'type',
    label: substepLabel('type'),
    needs: ['typography', 'guidelines'],
    checks: [
      {
        id: 'heading',
        label: 'Heading face',
        todo: 'Pick the heading face',
        view: 'brand',
        section: 'type',
        ok: (c) => filled(c.project.typeHeading),
      },
      {
        id: 'body',
        label: 'Body face',
        todo: 'Pick the body face',
        view: 'brand',
        section: 'type',
        ok: (c) => filled(c.project.typeBody),
      },
      {
        id: 'typeWhy',
        label: 'Why that pairing',
        todo: 'Say why the pair fits the brand words',
        view: 'brand',
        section: 'type',
        ok: (c) => filled(c.project.typeWhy),
      },
    ],
  },
  {
    id: 'touchpoints',
    label: labelForStepId('sketch'),
    needs: APPLICATION_DELIVERABLES,
    checks: [
      {
        id: 'oneSurface',
        label: 'At least one surface worked through',
        todo: 'Note one touchpoint from the brief',
        view: 'flow',
        ok: (c) =>
          Object.values(c.project.touchpointApps || {}).some(
            (row) => row && (row.done || filled(row.note))
          ),
      },
    ],
  },
  {
    id: 'handoff',
    label: labelForStepId('deliver'),
    checks: [
      {
        id: 'handoffNote',
        label: 'A note saying what the client is getting',
        todo: 'Write the handoff note',
        view: 'finish',
        ok: (c) => filled(c.project.handoffNote),
      },
      {
        id: 'approval',
        /* An approval record, in any of the three forms this app already
           keeps one: a closed revision round, a logged client verdict, or
           the designer's own note of which mark the client chose. */
        label: 'A record of what the client approved',
        todo: 'Record the approval on Review',
        view: 'review',
        ok: (c) =>
          filled(c.project.logoClientChose) ||
          (c.project.revisionRounds || []).some((r) => r?.closedAt) ||
          (c.project.feedbackLog || []).some((f) => filled(f?.decision)),
      },
    ],
  },
]

/**
 * Whether a group applies to this job.
 * Mirrors progressItemInScope: no brief picks yet means full scope.
 */
export function groupInScope(group, deliverablesPicked) {
  const picked = Array.isArray(deliverablesPicked) ? deliverablesPicked : []
  if (!picked.length) return true
  if (!group?.needs) return true
  return group.needs.some((d) => picked.includes(d))
}

const pct = (done, total) => (total ? Math.round((done / total) * 100) : 100)

/**
 * Run every in-scope check against one project.
 *
 * @param {{ project?: object, moodItems?: array, palette?: array }} input
 * @returns {{
 *   groups: Array<{ id: string, label: string, rows: array, done: number, total: number, pct: number }>,
 *   rows: array, gaps: array, done: number, total: number, pct: number,
 * }}
 */
export function brandCompleteness({ project = null, moodItems = [], palette } = {}) {
  const p = project || {}
  const ctx = {
    project: p,
    detective: p.detective || {},
    moodItems: Array.isArray(moodItems) ? moodItems.filter(Boolean) : [],
    palette: Array.isArray(palette) ? palette : Array.isArray(p.palette) ? p.palette : [],
  }
  const picked = ctx.detective.deliverablesPicked

  const groups = COMPLETENESS_GROUPS.filter((g) => groupInScope(g, picked)).map(
    (g) => {
      const rows = g.checks.map((c) => {
        let ok
        try {
          ok = !!c.ok(ctx)
        } catch {
          /* A check that throws on an odd project shape must not take the
             panel down with it — an unreadable check simply reads as a gap. */
          ok = false
        }
        return {
          id: `${g.id}.${c.id}`,
          groupId: g.id,
          groupLabel: g.label,
          label: c.label,
          todo: c.todo,
          view: c.view,
          section: c.section || null,
          ok,
        }
      })
      const done = rows.filter((r) => r.ok).length
      return {
        id: g.id,
        label: g.label,
        rows,
        done,
        total: rows.length,
        pct: pct(done, rows.length),
      }
    }
  )

  const rows = groups.flatMap((g) => g.rows)
  const done = rows.filter((r) => r.ok).length
  return {
    groups,
    rows,
    gaps: rows.filter((r) => !r.ok),
    done,
    total: rows.length,
    pct: pct(done, rows.length),
  }
}

/**
 * The few gaps worth showing without opening the full list.
 * Ordered by group, which is already brief → direction → mark → system →
 * handoff, so the first one is the earliest unfinished thing.
 */
export function topGaps(result, limit = 3) {
  return (result?.gaps || []).slice(0, Math.max(0, limit))
}

/**
 * One honest line for the panel head.
 *
 * Says the count, not a grade. “72%” alone invites reading a partly-specified
 * brand as a partly-failed one, and several of these rows are things a job
 * may legitimately never need.
 */
export function completenessHeadline(result) {
  const total = result?.total || 0
  if (!total) return 'Nothing to check yet'
  const gaps = result.gaps.length
  if (!gaps) return `Nothing missing · ${result.done}/${total} documented`
  return `${gaps} thing${gaps === 1 ? '' : 's'} not documented yet · ${result.done}/${total}`
}

/** Only the deliverable ids the scope filter actually reads (for tests/docs). */
export { APPLICATION_DELIVERABLES }

/**
 * Whether a single progress item is in scope — re-exported so callers that
 * need both this and the pack counter import one scope rule, not two.
 */
export { progressItemInScope }
