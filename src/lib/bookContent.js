import { filledDetectiveChapters } from './detectiveBrief'

/**
 * The brand book's content pages, built only from answers that exist.
 *
 * The page list is derived, never declared: a page appears because the
 * project holds the text it would print, and is absent otherwise. That is
 * the whole point — a Story page with invented prose, or a Usage page of
 * sample do/don'ts, is the Promise/Proof bug again (a tile bound to a field
 * nothing ever wrote). Rather than drop the missing ones silently, the
 * omitted list says which pages exist and what each one is waiting for, so
 * absence is visible in the builder instead of being something the user has
 * to notice.
 *
 * Field sources mirror `buildPack` in exportFiles.js and the sections in
 * brandBookPdf.js, so the on-screen book and the exported PDF are reading
 * the same answers rather than two drifting copies.
 */

const clean = (v) => String(v ?? '').trim()

/** A page's blocks, minus the ones with nothing in them. */
function fields(pairs) {
  return pairs
    .filter(([, text]) => clean(text))
    .map(([label, text]) => ({ kind: 'field', label, text: clean(text) }))
}

export const BOOK_SECTIONS = [
  { id: 'story', label: 'Story', sub: 'Why this brand exists, in their own words.', needs: 'the Story answer, or the brief' },
  { id: 'direction', label: 'Direction', sub: 'What we want the reader to do.', needs: 'a saved direction, or what makes it different' },
  { id: 'brief', label: 'Agreed brief', sub: 'The answers that shaped this system.', needs: 'answers in the brief' },
  { id: 'logo', label: 'Logo system', sub: 'Direction, wordmark, and clearspace.', needs: 'the logo notes on Identity' },
  { id: 'writing', label: 'Writing', sub: 'How the words are set.', needs: 'tone of voice, or the voice note' },
  { id: 'applications', label: 'Applications', sub: 'Where this brand shows up.', needs: 'the surfaces picked in the brief' },
  { id: 'usage', label: 'Usage', sub: "Do and don't.", needs: 'the do / don’t notes' },
  { id: 'handoff', label: 'Handoff', sub: 'What to take into your design tool next.', needs: 'the handoff note, or what you learned' },
]

function blocksFor(id, p, d) {
  switch (id) {
    case 'story': {
      /* The brief is the fallback the PDF uses too — an older project wrote
         its story there before the question existed. */
      const text = clean(d.story) || clean(p.brief)
      return text ? [{ kind: 'prose', text }] : []
    }
    case 'direction': {
      const all = Array.isArray(p.directions) ? p.directions : []
      const picked = all.filter((x) => x?.chosen)
      /* Chosen wins, but before anything is chosen the routes on the table
         are still the direction — showing them beats an empty page. */
      /* Same filter the PDF applies: a route needs a title or a note to be
         content. `label` is only its slot name ("A", "B") — carrying a row on
         that alone would print an empty direction under a bare letter. */
      const rows = (picked.length ? picked : all)
        .filter((x) => clean(x?.title) || clean(x?.note))
        .map((x) => ({
          kind: 'field',
          label: clean(x?.title) || clean(x?.label) || 'Direction',
          text: clean(x?.note),
        }))
      return [...rows, ...fields([['What makes it different', d.usp]])]
    }
    case 'brief': {
      const chapters = filledDetectiveChapters(d)
      return chapters.map((ch) => ({
        kind: 'group',
        title: `${ch.num} · ${ch.title}`,
        rows: ch.rows.map((r) => ({ label: r.label, text: r.answer })),
      }))
    }
    case 'logo':
      return fields([
        ['Direction', p.logoDirection],
        ['Wordmark', p.logoWordmark],
        ['Clearspace', p.logoClearspace],
      ])
    case 'writing':
      return fields([
        ['Tone of voice', d.toneOfVoice],
        ['Voice', p.voice],
      ])
    case 'applications': {
      const items = (Array.isArray(d.brandSurfaces) ? d.brandSurfaces : [])
        .map(clean)
        .filter(Boolean)
      return items.length ? [{ kind: 'list', items }] : []
    }
    case 'usage':
      return fields([
        ['Do', p.doUse],
        ["Don't", p.dontUse],
      ])
    case 'handoff':
      return fields([
        ['Handoff note', p.handoffNote],
        ['What we learned', p.learnings],
        ['Technical notes', d.technical],
        ['Accessibility', d.accessibilityNeeds],
      ])
    default:
      return []
  }
}

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

/** The section list expanded into the actual printed pages. */
export function paginatedBookPages(project) {
  const { pages, omitted } = bookContentPages(project)
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

export function bookContentPages(project) {
  const p = project || {}
  const d = p.detective || {}
  const pages = []
  const omitted = []
  BOOK_SECTIONS.forEach((s) => {
    const blocks = blocksFor(s.id, p, d)
    if (blocks.length) pages.push({ ...s, blocks })
    else omitted.push({ id: s.id, label: s.label, needs: s.needs })
  })
  return { pages, omitted }
}
