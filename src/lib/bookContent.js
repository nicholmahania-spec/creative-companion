import { filledDetectiveChapters } from './detectiveBrief'
import { bookPlan } from './bookDocument'
import { touchpointLabel } from './touchpoints'

/**
 * The brand book's content, page by page, built only from answers that exist.
 *
 * The page list is not declared here — it comes from `bookDocument.js`, the
 * same plan the PDF draws. This file answers only the second question: given
 * that a page exists, what text goes on it. Splitting it that way is the whole
 * point. The page list used to be stated here *and* in brandBookPdf.js, the
 * two drifted, and the book on screen ended up showing different pages in a
 * different order from the one the client received.
 *
 * A page still appears only because the project holds the text it would print.
 * A Story page over invented prose, or a Usage page of sample do/don'ts, is the
 * Promise/Proof bug again — a surface bound to a field nothing ever wrote. The
 * `omitted` list says which pages are missing and what each is waiting for, so
 * absence is visible in the builder rather than something the user has to
 * notice.
 *
 * The input is the pack, not the raw project, because the pack is what gets
 * delivered — reading round it would put a second field mapping back in.
 */

const clean = (v) => String(v ?? '').trim()

/** A page's blocks, minus the ones with nothing in them. */
function fields(pairs) {
  return pairs
    .filter(([, text]) => clean(text))
    .map(([label, text]) => ({ kind: 'field', label, text: clean(text) }))
}

/**
 * The text for one page id.
 *
 * Ids are the plan's ids, so this switch and the PDF's drawing code answer for
 * the same pages. Colour and Typography are absent on purpose: the builder
 * draws those from its own controls and the PDF from the palette and scale, so
 * neither has prose for this to supply.
 */
function blocksFor(id, x) {
  const { pack: p, d } = x

  switch (id) {
    case 'voice':
      return fields([
        ['Tagline', p.tagline],
        ['Promise', p.messagingPromise],
        ['Proof', p.messagingProof],
        ['Personality', p.messagingPersonality],
        ['Tone of voice', d.toneOfVoice || p.toneOfVoice],
        ['Voice', p.voice],
        ['The decision', x.decision],
      ])

    case 'story':
      return [
        ...(x.story ? [{ kind: 'prose', text: x.story }] : []),
        ...fields([
          ['What makes it different', p.usp],
          ['Brand words', d.brandWords],
          ['The goal', d.goal],
        ]),
      ]

    case 'audience':
      return fields([
        ['Who it is for', d.audience],
        ['How it should feel', d.feel],
        ['What they struggle with', d.audiencePains],
        ['If the brand were a person', d.brandAsPerson],
      ])

    case 'logo':
      return fields([
        ['Direction', p.logoDirection],
        ['Wordmark', p.logoWordmark],
        ['Clearspace', p.logoClearspace],
      ])

    case 'imagery':
      return fields([
        ['Style', p.imageryStyle],
        ['Do', p.imageryDo],
        ["Don't", p.imageryDont],
      ])

    case 'apps': {
      /* The mocks the book will actually draw, named the way the PDF names
         them — so the page on screen lists what the reader will see, rather
         than the raw brief answer that only implies it. */
      const items = x.touchpoints.map(touchpointLabel).filter(Boolean)
      return items.length ? [{ kind: 'list', items }] : []
    }

    /* ---- appendix ----------------------------------------------------
       The fifteen-page design has no page for these, but they are things the
       user wrote for this client, and a deliverable that silently stops
       including them is the same failure as a page that clips its own text.
       They travel at the back of the book, exactly as the PDF prints them. */

    case 'usage':
      return fields([
        ['Do', p.doUse],
        ["Don't", p.dontUse],
      ])

    case 'brief':
      return filledDetectiveChapters(d).map((ch) => ({
        kind: 'group',
        title: `${ch.num} · ${ch.title}`,
        rows: ch.rows.map((r) => ({ label: r.label, text: r.answer })),
      }))

    case 'handoff':
      return fields([
        ['Handoff note', p.handoffNote],
        ['What we learned', p.learnings],
        ['Technical notes', d.technical || p.technical],
        ['Accessibility', d.accessibilityNeeds || p.accessibilityNeeds],
      ])

    default:
      return []
  }
}

/**
 * The appendix pages, in the order the PDF prints them.
 *
 * Declared here rather than in bookDocument.js because the appendix is not
 * part of the numbered design — no divider, no number, no entry in the
 * contents. It is still one list, read by both surfaces.
 */
export const APPENDIX_PAGES = [
  { id: 'usage', label: 'Usage', sub: "Do and don't.", needs: 'the do / don’t notes' },
  {
    id: 'brief',
    label: 'Agreed brief',
    sub: 'The answers that shaped this system.',
    needs: 'answers in the brief',
  },
  {
    id: 'handoff',
    label: 'Handoff',
    sub: 'What to take into your design tool next.',
    needs: 'the handoff note, or what you learned',
  },
]

/* ------------------------------------------------------------ pagination

   A .bbb-page is a fixed aspect ratio with overflow:hidden, so anything past
   the bottom edge is not shortened — it disappears, with nothing on screen to
   say it did. A book that silently drops the answers you wrote is worse than
   one that runs long, so content is split across continuation pages instead,
   the same way brandBookPdf paginates its sections.

   The budget is an estimate of rendered lines rather than a measurement:
   measuring means rendering, reading heights, then re-rendering, and the
   error here costs a slightly under-filled page, while the error the old way
   costs a paragraph. Erring small is the cheap direction. `noPageOverflows`
   in the browser check is what actually holds this honest. */

/* Calibrated against the rendered preview rather than reasoned from font
   metrics: the page is ~320px wide with 9% padding, so a body line holds far
   fewer characters than a Letter sheet would suggest, and every label and
   gap costs vertical space the character count alone does not see. Units are
   "body lines", fractional so margins can be counted honestly. */
const LINES_PER_PAGE = 9
const CHARS_PER_LINE = 26
const ROW_GAP = 0.7 // the flex gap between blocks
const LABEL = 1.3 // an uppercase field label plus its margin

const wrapped = (text) => Math.max(1, Math.ceil(clean(text).length / CHARS_PER_LINE))

function blockLines(b) {
  if (b.kind === 'prose') return wrapped(b.text) + ROW_GAP
  if (b.kind === 'list') return b.items.length * 1.25 + ROW_GAP
  if (b.kind === 'group') return groupLines(b.rows) + LABEL + ROW_GAP
  return LABEL + wrapped(b.text) + ROW_GAP
}

const rowLines = (r) => LABEL + wrapped(r.text) + 0.35
const groupLines = (rows) => rows.reduce((n, r) => n + rowLines(r), 0)

/** Split one section's blocks into as many pages as its content needs. */
export function paginateBlocks(blocks, budget = LINES_PER_PAGE) {
  const pages = []
  let cur = []
  let used = 0
  const flush = () => {
    if (cur.length) pages.push(cur)
    cur = []
    used = 0
  }
  blocks.forEach((b) => {
    /* A group can be taller than a whole page on its own, so it splits by
       row — otherwise the page budget is respected everywhere except the one
       place that actually overflows. */
    if (b.kind === 'group') {
      let head = b.title
      let rows = []
      let n = LABEL + ROW_GAP
      b.rows.forEach((r) => {
        const rl = rowLines(r)
        /* `cur.length` matters as much as `rows.length`: without it a new
           group's first row was always appended to whatever page was open,
           however full — so consecutive chapters piled onto one page, each
           adding a title, and the page ran to half again its height. Only
           a genuinely single oversized row now exceeds a page, and the
           grow-don't-clip rule covers that. */
        if ((rows.length || cur.length) && used + n + rl > budget) {
          if (rows.length) {
            cur.push({ ...b, title: head, rows })
            head = `${b.title} (cont.)`
          }
          flush()
          rows = []
          n = LABEL + ROW_GAP
        }
        rows.push(r)
        n += rl
      })
      if (rows.length) {
        cur.push({ ...b, title: head, rows })
        used += n
      }
      return
    }
    const lines = blockLines(b)
    if (cur.length && used + lines > budget) flush()
    cur.push(b)
    used += lines
  })
  flush()
  return pages.length ? pages : [[]]
}

/**
 * The book's prose pages for one pack, in plan order.
 *
 * Foundations first, then the numbered sections, then the appendix — the same
 * sequence the PDF draws. Colour and Typography carry no prose, so they are
 * absent here and supplied by the builder's own page components; the plan is
 * still what decides whether they exist at all.
 */
export function bookContentPages(packIn) {
  const plan = bookPlan(packIn)
  const x = plan.inputs
  const pages = []
  const omitted = [...plan.omitted]

  const take = (meta) => {
    const blocks = blocksFor(meta.id, x)
    if (blocks.length) pages.push({ ...meta, blocks })
    else if (meta.needs) omitted.push({ id: meta.id, label: meta.label, needs: meta.needs })
  }

  plan.foundations.forEach((f) =>
    take({ id: f.id, label: f.title, sub: f.sub, needs: f.needs, kind: 'foundation' })
  )
  plan.sections.forEach((s) =>
    take({ id: s.id, label: s.name, sub: s.page, num: s.num, needs: s.needs, kind: 'section' })
  )
  APPENDIX_PAGES.forEach((a) => take({ ...a, kind: 'appendix' }))

  return { pages, omitted }
}

/** The section list expanded into the actual printed pages. */
export function paginatedBookPages(packIn) {
  const { pages, omitted } = bookContentPages(packIn)
  const out = []
  pages.forEach((pg) => {
    const chunks = paginateBlocks(pg.blocks)
    chunks.forEach((blocks, i) => {
      out.push({
        ...pg,
        id: i === 0 ? pg.id : `${pg.id}-${i + 1}`,
        sectionId: pg.id,
        blocks,
        /* Continuation pages keep the section's name — a reader landing on
           page 2 of the brief should not have to page back to learn what
           they are looking at — and say plainly that they continue. */
        sub: i === 0 ? pg.sub : 'Continued.',
      })
    })
  })
  return { pages: out, omitted }
}
