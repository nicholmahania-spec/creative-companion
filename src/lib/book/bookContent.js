import { filledDetectiveChapters } from '../brief/detectiveBrief'
import { bookPlan } from './bookDocument'
import { touchpointLabel } from '../journey/touchpoints'
import { labelForStepId } from '../journey/journey'
import { IDENTITY_SUBSTEPS } from '../journey/identitySubsteps'

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
 * Every editable field the book prints, per page, declared once.
 *
 * `blocksFor` derives the printed blocks from this, and the builder derives
 * its editing panel from it too. That is the point: a field added here appears
 * on the page AND becomes editable, in one edit. The alternative — a page
 * renderer with its own field list and an editor with another — is the same
 * two-copies defect that let the book and the PDF drift apart in the first
 * place, and it fails the worse way round: an editor for a field the book
 * never prints, or a printed field you cannot edit.
 *
 * `scope` says where the answer actually lives, which is not guessable from
 * the name. Most are project-level; Story, USP and tone of voice live on the
 * detective (the brief), and `buildBrandPackSnapshot` hoists them. Writing to
 * the wrong one silently does nothing, because the read prefers the other.
 *
 * A field with no entry here is derived, not answered — the decision line, the
 * applications list and the agreed brief are computed from elsewhere, so they
 * print but cannot be typed into. Offering an edit box that quietly recomputes
 * over your typing would be a control that does not do its thing.
 */
/**
 * WHERE EACH ANSWER IS AUTHORED.
 *
 * Every field below already has exactly one home — the brief for the client's
 * answers, Identity for the brand's own words and mark notes, Assets for the
 * handoff. The builder used to render a second editable copy of all of them,
 * which made it a fourth place to type the same fact (brief → Identity →
 * builder) and left "which box does the PDF read?" unanswerable from the
 * screen. Owner, 2026-08-08: *the Brand Book builder should become an
 * OUTPUT/DOCUMENTATION surface, not another authoring location.*
 *
 * So the builder now SHOWS the resolved value and links here. `view` is a
 * view id App accepts; `section` is an Identity deep link resolved by
 * `resolveIdentitySubstep`.
 */
/* Labels are DERIVED, never spelled. A path stop's words live in
   `journey.js` and an Identity screen's in `identitySubsteps.js`; restating
   either here is the defect `journeySingleSource.test.js` exists to catch,
   and it caught this line. */
const identityLabel = (id) =>
  IDENTITY_SUBSTEPS.find((s) => s.id === id)?.label || labelForStepId('design')

export const FIELD_HOMES = {
  /* The brief — the client's own answers. */
  detective: { view: 'project', label: labelForStepId('define') },
  /* THE BUSINESS NAME IS THE CLIENT'S, AND THE BRIEF ASKS FOR IT.
     The book's own "Brand name" box read `detective.clientName || project.name`
     and wrote `project.name` — two different fields — so on any project where
     the client had answered chapter 01 the box displayed their answer, accepted
     typing, renamed the project underneath, and then re-rendered the client's
     answer over the top. A control that silently discards what you type is
     worse than a duplicate; this is why it is read-only now. Renaming the
     PROJECT still lives on the client record, which is a different fact. */
  clientName: { view: 'project', label: labelForStepId('define') },
  /* Palette rows are named on the Colour bench, beside the hexes they name.
     The book listed, added, removed and renamed them — a full second editor
     for the canonical palette on an output surface. */
  palette: { view: 'brand', section: 'colors', label: identityLabel('colors') },
  /* Identity: the words live on the direction sheet, which renders on every
     Identity screen, so they all point at the sheet. */
  /* Positioning is the designer's synthesis of the client's "what does your
     business do?", not a copy of it, so it is still written on the sheet.
     See BRIEF_OWNED_WORDS for why the lines below are not. */
  positioning: { view: 'brand', section: 'positioning', label: 'the sheet' },
  /* THE BRIEF ASKS THESE, SO THE BRIEF IS WHERE THEY ARE WRITTEN.
     They pointed at the sheet while the sheet had a box for each. It reports
     them now, so "Write it on the sheet" would land the designer on a line
     they cannot type in — a link that names a destination where the thing
     cannot be done, which is the dead-pointer defect this file's own
     `identityLabel` comment was added to prevent. */
  voice: { view: 'project', label: labelForStepId('define') },
  messagingPromise: { view: 'project', label: labelForStepId('define') },
  messagingProof: { view: 'project', label: labelForStepId('define') },
  messagingPersonality: { view: 'project', label: labelForStepId('define') },
  dontUse: { view: 'project', label: labelForStepId('define') },
  /* No brief question asks what TO do — this one stays the designer's. */
  doUse: { view: 'brand', section: 'words', label: 'the sheet' },
  /* The tagline is on the sheet with the rest of the brand's words. The book
     used to carry its own input for it — an output authoring a decision. */
  tagline: { view: 'brand', section: 'tagline', label: 'the sheet' },
  /* The two faces belong to the Type bench. The book's font pickers wrote
     them, so choosing a face for the document renamed the brand's typeface. */
  typeHeading: { view: 'brand', section: 'type', label: identityLabel('type') },
  typeBody: { view: 'brand', section: 'type', label: identityLabel('type') },
  /* Identity: the mark and its handover notes. */
  logoDirection: { view: 'brand', section: 'logo', label: identityLabel('logo') },
  logoWordmark: { view: 'brand', section: 'logo', label: identityLabel('logo') },
  logoClearspace: {
    view: 'brand',
    section: 'handover',
    label: identityLabel('handover'),
  },
  imageryStyle: {
    view: 'brand',
    section: 'imagery',
    label: identityLabel('handover'),
  },
  imageryDo: {
    view: 'brand',
    section: 'imagery',
    label: identityLabel('handover'),
  },
  imageryDont: {
    view: 'brand',
    section: 'imagery',
    label: identityLabel('handover'),
  },
  /* The last stop — written at the end, with the pack. */
  handoffNote: { view: 'finish', label: labelForStepId('deliver') },
  learnings: { view: 'finish', label: labelForStepId('deliver') },
}

/**
 * The home for one PAGE_FIELDS row.
 * Brief-scoped fields all live on the brief; project-scoped ones are looked
 * up by name. A field with no entry returns null and the builder shows it
 * read-only with no link rather than inventing a destination.
 */
export function fieldHome(f) {
  if (!f) return null
  if (f.scope === 'detective') return FIELD_HOMES.detective
  return FIELD_HOMES[f.field] || null
}

export const PAGE_FIELDS = {
  voice: [
    /* Prints on the page, but the builder already has a Tagline input at the
       top of its panel — a second box for one answer is two places to change
       one thing and one more decision on screen. */
    { label: 'Tagline', scope: 'project', field: 'tagline', editedElsewhere: true },
    { label: 'Positioning', scope: 'project', field: 'positioning' },
    { label: 'Promise', scope: 'project', field: 'messagingPromise' },
    { label: 'Proof', scope: 'project', field: 'messagingProof' },
    { label: 'Personality', scope: 'project', field: 'messagingPersonality' },
    { label: 'Tone of voice', scope: 'detective', field: 'toneOfVoice' },
    { label: 'Voice', scope: 'project', field: 'voice' },
  ],
  story: [
    { label: 'What makes it different', scope: 'detective', field: 'usp' },
    { label: 'Brand words', scope: 'detective', field: 'brandWords' },
    { label: 'The goal', scope: 'detective', field: 'goal' },
  ],
  audience: [
    { label: 'Who it is for', scope: 'detective', field: 'audience' },
    { label: 'How it should feel', scope: 'detective', field: 'feel' },
    { label: 'What they struggle with', scope: 'detective', field: 'audiencePains' },
    { label: 'If the brand were a person', scope: 'detective', field: 'brandAsPerson' },
  ],
  logo: [
    { label: 'Direction', scope: 'project', field: 'logoDirection' },
    { label: 'Wordmark', scope: 'project', field: 'logoWordmark' },
    { label: 'Clearspace', scope: 'project', field: 'logoClearspace' },
  ],
  imagery: [
    { label: 'Style', scope: 'project', field: 'imageryStyle' },
    { label: 'Do', scope: 'project', field: 'imageryDo' },
    { label: "Don't", scope: 'project', field: 'imageryDont' },
  ],
  usage: [
    { label: 'Do', scope: 'project', field: 'doUse' },
    { label: "Don't", scope: 'project', field: 'dontUse' },
  ],
  handoff: [
    { label: 'Handoff note', scope: 'project', field: 'handoffNote' },
    { label: 'What we learned', scope: 'project', field: 'learnings' },
    { label: 'Technical notes', scope: 'detective', field: 'technical' },
    { label: 'Accessibility', scope: 'detective', field: 'accessibilityNeeds' },
  ],
}

/** What a field currently reads, following the same fallbacks the book does. */
export function readField({ scope, field }, x) {
  const { pack: p, d } = x
  if (scope === 'detective') return clean(d[field] ?? p[field])
  /* Project-first, detective as the older home — the same order
     buildBrandPackSnapshot resolves them in, so the editor shows what will
     actually print rather than a stale copy underneath it. */
  return clean(p[field] ?? d[field])
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

  /* Declared fields first, in declaration order, so the page and the editor
     cannot disagree about what is on it. */
  const declared = (PAGE_FIELDS[id] || [])
    .map((f) => ({ label: f.label, text: readField(f, x) }))
    .filter((r) => r.text)
    .map((r) => ({ kind: 'field', label: r.label, text: r.text }))

  switch (id) {
    case 'voice':
      /* The decision line is computed from the chosen direction, so it prints
         but is not typed — see the note on PAGE_FIELDS. */
      return [...declared, ...fields([['The decision', x.decision]])]

    case 'story':
      return [...(x.story ? [{ kind: 'prose', text: x.story }] : []), ...declared]

    case 'apps': {
      /* The mocks the book will actually draw, named the way the PDF names
         them — so the page on screen lists what the reader will see, rather
         than the raw brief answer that only implies it. Derived, not typed.

         Each surface now carries the note the designer wrote about it on the
         Touchpoints screen. The page used to print bare labels, so "how it
         shows up" — the one sentence that makes an applications page worth
         reading — was written into the project and reached nobody.
         "Business card" tells a client nothing that "logo at 12mm, never on
         the reverse" does not tell them better. A surface with no note still
         appears: the list of where the brand lives is useful on its own, and
         omitting the unnoted ones would misrepresent the scope. */
      const apps = x.touchpointApps || {}
      const items = x.touchpoints
        .map((id) => {
          const label = touchpointLabel(id)
          if (!label) return null
          const note = String(apps[id]?.note || '').trim()
          return note ? `${label} — ${note}` : label
        })
        .filter(Boolean)
      return items.length ? [{ kind: 'list', items }] : []
    }

    case 'brief':
      /* Composed from the brief's own answers, which have their own editor.
         A second editor for the same text is two places to change one thing. */
      return filledDetectiveChapters(d).map((ch) => ({
        kind: 'group',
        title: `${ch.num} · ${ch.title}`,
        rows: ch.rows.map((r) => ({ label: r.label, text: r.answer })),
      }))

    default:
      return declared
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
    sub: 'The record of what was agreed.',
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
