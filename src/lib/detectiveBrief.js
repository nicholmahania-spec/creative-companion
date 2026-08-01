/**
 * Define = Discovery. Merged brand-identity project brief + client
 * questionnaire, reorganized into 5 sections matching the discovery-call
 * structure. Shared by DefineView timeline and DetectiveSheet form.
 *
 * Gating: only `required: true` fields block progress into Research→
 * Deliver (see getDetectiveProgress().requiredReady) — kept to a minimal
 * core subset (client name, goal, audience, must-have deliverables) so
 * the rest of the ~25 fields stay available without blocking task
 * initiation on a huge form.
 */

/** Standard brand-identity scope. `extra` marks what is quoted separately —
 *  saying so on the form itself prevents the awkward conversation later. */
/**
 * Where a brand actually shows up. Separate from DELIVERABLE_OPTIONS on
 * purpose: what to MAKE and where it LIVES are different answers, and only
 * the second one tells you whether the mark has to survive a shop sign or a
 * 32px avatar. Nothing asked this before, so the Touchpoints stop had no
 * client input at all.
 */
export const BRAND_SURFACE_OPTIONS = [
  { id: 'website', label: 'Website' },
  { id: 'social', label: 'Social media' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'print', label: 'Print — cards, brochures, posters' },
  { id: 'signage', label: 'Signage or a physical space' },
  { id: 'merch', label: 'Merchandise' },
  { id: 'app', label: 'An app or digital product' },
  { id: 'email', label: 'Email' },
]

export const DELIVERABLE_OPTIONS = [
  { id: 'logoPrimary', label: 'Primary logo' },
  { id: 'logoVariations', label: 'Logo variations (stacked, horizontal, icon)' },
  { id: 'colourPalette', label: 'Colour palette' },
  { id: 'typography', label: 'Typefaces' },
  { id: 'guidelines', label: 'Brand guidelines document' },
  { id: 'businessCard', label: 'Business cards' },
  { id: 'socialKit', label: 'Social media profile graphics' },
  { id: 'stationery', label: 'Letterhead and stationery', extra: true },
  { id: 'emailSignature', label: 'Email signature', extra: true },
  { id: 'packaging', label: 'Packaging', extra: true },
  { id: 'signage', label: 'Signage or vehicle graphics', extra: true },
  { id: 'merch', label: 'Apparel or merchandise', extra: true },
  { id: 'printCollateral', label: 'Brochures or print material', extra: true },
  { id: 'illustration', label: 'Custom icons or illustration', extra: true },
  { id: 'website', label: 'Website design', extra: true },
]

/**
 * NOTE ON FIELD IDS: several no longer match their question, because the
 * wording moved to plain language while the ids stayed put (renaming an id
 * orphans every answer already saved on a real project). Do not "fix" a
 * label back toward its id:
 *   usp          → asks what the business does, not a unique selling point
 *   brandWords   → asks what matters most in how they do business
 *   toneOfVoice  → asks for three words a customer would use
 *   constraints  → the chapter is "What you need"
 *
 * `designerOnly: true` keeps a field out of the client's portal view — use it
 * only where a client genuinely cannot answer (budget, file formats), never
 * to hide something merely inconvenient.
 *
 * Every `tip` must carry a worked example, a format, or an explicit
 * permission. A tip that restates its label is a bug: the client portal
 * renders label and tip stacked, so a restatement prints the same sentence
 * twice and reads as broken.
 *
 * `tip` is capped at FIVE WORDS. DetectiveSheet renders it as the input's
 * placeholder, where a long sentence is truncated by the field width, is
 * unreadable at placeholder contrast, and disappears the moment typing
 * starts — so length there buys nothing. Say the example, the format, or
 * the permission, and stop. The same string is the client portal's helper
 * text; if a field genuinely needs a longer explanation for clients, give
 * it its own key rather than growing this one back.
 */
export const DETECTIVE_CHAPTERS = [
  {
    id: 'overview',
    num: '01',
    title: 'Your details',
    railLabel: 'Details',
    fields: [
      {
        id: 'clientName',
        label: 'Business name',
        tip: 'Trading name is fine',
        area: false,
        required: true,
        gridSpan: 'half',
      },
      {
        id: 'engagementType',
        label: 'Where are you starting from?',
        tip: 'Closest one is fine.',
        type: 'choice',
        options: [
          { id: 'new', label: 'Starting from scratch — no brand yet' },
          { id: 'rebrand', label: 'Rebranding — replacing what exists now' },
          { id: 'extend', label: 'Adding to a brand that already works' },
        ],
        required: true,
        gridSpan: 'full',
      },
      {
        id: 'projectDeadline',
        label: 'Is there a date this needs to be done by?',
        tip: 'Leave blank if open.',
        type: 'date',
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'primaryContact',
        label: 'Your name and job title',
        tip: 'e.g. Sarah Whitton, Owner',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'clientEmail',
        label: 'Email',
        tip: 'e.g. you@studio.com',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'clientPhone',
        label: 'Phone',
        tip: 'Optional — for quick questions',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'budgetRange',
        label: 'What budget do you have in mind?',
        tip: 'A range is fine',
        area: false,
        designerOnly: true,
        required: false,
        gridSpan: 'half',
      },
    ],
  },
  {
    id: 'core',
    num: '02',
    title: 'Your business',
    railLabel: 'Business',
    fields: [
      {
        id: 'goal',
        label: 'What do you want this project to change?',
        tip: 'e.g. “We look too small”',
        area: true,
        required: true,
        gridSpan: 'full',
      },
      {
        id: 'story',
        label: 'How did the business start?',
        tip: 'Two lines is plenty',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'usp',
        label: 'What does your business do?',
        tip: 'e.g. small-batch coffee roastery',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'brandWords',
        label: 'What matters most in how you do business?',
        tip: 'e.g. honesty over polish',
        area: false,
        required: false,
        gridSpan: 'half',
      },
    ],
  },
  {
    id: 'market',
    num: '03',
    title: 'Your customers',
    railLabel: 'Customers',
    fields: [
      {
        id: 'audience',
        label: 'Who are your customers?',
        tip: 'e.g. new parents buying gifts',
        area: false,
        required: true,
        gridSpan: 'half',
      },
      {
        id: 'feel',
        label: 'How should people feel when they come across your brand?',
        tip: 'e.g. reassured, curious, ahead',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'audiencePains',
        label: 'What frustrates your customers most?',
        tip: 'e.g. slow replies, no return',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'competitors',
        label: 'Who else does what you do?',
        tip: 'Two or three names',
        area: true,
        required: false,
        gridSpan: 'half',
      },
    ],
  },
  {
    id: 'identity',
    num: '04',
    title: 'Look and feel',
    railLabel: 'Look',
    fields: [
      {
        id: 'messagingPromise',
        label: 'What do you promise your customers?',
        tip: 'e.g. same-day, or made by hand',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'messagingProof',
        label: 'What proves it?',
        tip: 'A result, a review, a number',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      /* StoryBrand's last two elements. Promise and Proof (above) were already
         here; the plan and the single call to action were not, and they are
         the two that tell a designer what every piece of collateral has to
         end in. A brand book that never says what the reader should DO is a
         mood board with rules. */
      {
        id: 'messagingPlan',
        label: 'What steps does someone take to work with you?',
        tip: 'e.g. quote, visit, fixed price',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'messagingCta',
        label: 'What is the one thing you want people to do?',
        tip: 'Just one — e.g. call us',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'toneOfVoice',
        label: 'If a customer described you in three words, what would they be?',
        tip: 'e.g. “quick, honest, no nonsense”',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'brandAsPerson',
        label: 'If your business were a person, what would they be like?',
        tip: 'e.g. warm, blunt, never showy',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      /* Four picks instead of four sentences. Every other question here asks
         the client to compose prose; these ask them to point at a spot on a
         line, which is far less work per unit of signal and gives answers
         that can be compared across projects. Ids are the ones the old
         discovery schema used, so anything a client already answered there
         carries over untouched rather than being orphaned. */
      {
        id: 'spectrumModernTraditional',
        label: 'Modern or traditional?',
        type: 'spectrum',
        poles: ['Modern', 'Traditional'],
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'spectrumPlayfulProfessional',
        label: 'Playful or professional?',
        type: 'spectrum',
        poles: ['Playful', 'Professional'],
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'spectrumHighEndAffordable',
        label: 'High-end or affordable?',
        type: 'spectrum',
        poles: ['High-end', 'Affordable'],
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'spectrumBoldMinimalist',
        label: 'Bold or minimal?',
        type: 'spectrum',
        poles: ['Bold', 'Minimal'],
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'inspirationLinks',
        label: 'What look are you drawn to?',
        tip: 'Describe it, or attach images',
        area: true,
        attach: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'avoid',
        label: 'Is there anything you definitely don’t want?',
        tip: 'e.g. “nothing pastel, no headsets”',
        area: true,
        required: false,
        gridSpan: 'full',
      },
    ],
  },
  {
    id: 'constraints',
    num: '05',
    title: 'What you need',
    railLabel: 'Needs',
    fields: [
      {
        id: 'deliverablesPicked',
        label: 'What do you need made?',
        tip: 'Core pack first is fine',
        type: 'checklist',
        options: DELIVERABLE_OPTIONS,
        required: true,
        gridSpan: 'full',
      },
      {
        id: 'deliverables',
        label: 'Anything else you need?',
        tip: 'e.g. shop sign, menus',
        area: true,
        required: false,
        gridSpan: 'full',
      },
      {
        id: 'technical',
        label: 'Any file types you know you’ll need?',
        tip: 'Leave blank if unsure',
        area: true,
        designerOnly: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'brandSurfaces',
        label: 'Where will this be used?',
        tip: 'Pick all that apply',
        type: 'checklist',
        options: BRAND_SURFACE_OPTIONS,
        required: false,
        gridSpan: 'full',
      },
      {
        /* Split out of the old catch-all "Do you have anything already?".
           A style guide and a logo branch differently: a guide means you are
           extending a system, a logo alone means you are building one around
           an existing mark. One box could not say which. */
        id: 'existingStyleGuide',
        label: 'Is there a brand style guide already?',
        tip: 'Attach it, or say no',
        area: true,
        attach: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'existingAssets',
        label: 'Any existing logo or artwork?',
        tip: 'Old logo, colours, or attach it',
        area: true,
        attach: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'accessibilityNeeds',
        label: 'Any accessibility needs we should design to?',
        tip: 'e.g. large type, high contrast',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'decisionMakers',
        label: 'Who else needs to approve this?',
        tip: 'Names and emails, or blank',
        area: false,
        required: false,
        gridSpan: 'half',
      },
    ],
  },
]

export function isFilled(val) {
  if (Array.isArray(val)) return val.length > 0
  return String(val || '').trim().length > 0
}

/**
 * Capped at three. A row of eight equally-loud buttons is another list to
 * read, which is the scanning cost the "Start with these" block exists to
 * remove. The count in the heading must match what is rendered.
 */
export const START_HERE_CAP = 3

/**
 * The five points of a `type: 'spectrum'` field, built from its two poles.
 *
 * Words, never numbers. The user has stated plainly that "numbers mean
 * nothing" to them, and a 1–5 scale would make every answer a translation
 * step for the person reading the finished brief as well as the client
 * filling it in. "Mostly playful" needs no key.
 *
 * The stored value is a stable token, not the label, so the wording can be
 * rewritten later without orphaning answers already saved on real projects —
 * the same rule the id note at the top of this file describes.
 */
export function spectrumChoices(poles = []) {
  const [a = '', b = ''] = poles
  return [
    { value: 'a', label: a },
    { value: 'mostly-a', label: `Mostly ${a.toLowerCase()}` },
    { value: 'balanced', label: 'Both equally' },
    { value: 'mostly-b', label: `Mostly ${b.toLowerCase()}` },
    { value: 'b', label: b },
  ]
}

/**
 * Human-readable answer for export / overview PDF / MD.
 * Spectrum tokens → pole labels; checklist ids → option labels;
 * never dump raw internal tokens in client-facing files.
 *
 * @param {{ type?: string, options?: Array<{id?: string, value?: string, label?: string}>, poles?: string[] }} field
 * @param {unknown} raw
 * @returns {string}
 */
export function formatDetectiveAnswer(field, raw) {
  if (raw == null) return ''
  if (Array.isArray(raw)) {
    if (!raw.length) return ''
    const opts = field?.options || []
    return raw
      .map((id) => {
        const hit = opts.find((o) => o.id === id || o.value === id)
        return hit?.label || String(id)
      })
      .join(', ')
  }
  const s = String(raw).trim()
  if (!s) return ''
  if (field?.type === 'spectrum') {
    const hit = spectrumChoices(field.poles || []).find((c) => c.value === s)
    if (hit) return hit.label
  }
  if ((field?.type === 'choice' || field?.type === 'select') && field.options) {
    const hit = field.options.find((o) => o.id === s || o.value === s)
    if (hit) return hit.label
  }
  return s
}

/**
 * Filled detective chapters for export (labels + human answers only).
 * `tip` carries the field's worked example — the Agreed Brief PDF section
 * renders it as the example line beneath the question, per the "a question
 * is never asked bare" pattern (see todo.md's brief-PDF reference notes).
 * @param {Record<string, unknown>} detective
 * @returns {Array<{ num: string, title: string, rows: Array<{ label: string, answer: string, tip: string }> }>}
 */
export function filledDetectiveChapters(detective = {}) {
  return DETECTIVE_CHAPTERS.map((ch) => {
    const rows = (ch.fields || [])
      .map((f) => {
        const answer = formatDetectiveAnswer(f, detective?.[f.id])
        return answer ? { label: f.label, answer, tip: f.tip || '' } : null
      })
      .filter(Boolean)
    return rows.length ? { num: ch.num, title: ch.title, rows } : null
  }).filter(Boolean)
}

/**
 * The required fields actually still empty — not a static list of all of
 * them, which reads as wrong the moment some are filled in.
 *
 * Lives here rather than in a component because two surfaces need it: the
 * sheet opens the first incomplete chapter from it, and the header band
 * renders the jump buttons from it.
 */
export function getRequiredEmpty(detective = {}, projectDeadline = '') {
  return DETECTIVE_CHAPTERS.flatMap((ch) =>
    ch.fields
      .filter(
        (f) =>
          f.required &&
          // The date field lives on the project record, not in `detective`.
          !isFilled(f.type === 'date' ? projectDeadline : detective?.[f.id])
      )
      .map((f) => ({ id: f.id, label: f.label, chapterId: ch.id }))
  )
}


export function getDetectiveProgress(detective = {}) {
  const chapters = DETECTIVE_CHAPTERS.map((ch) => {
    const total = ch.fields.length
    const done = ch.fields.filter((f) => isFilled(detective?.[f.id])).length
    const required = ch.fields.filter((f) => f.required)
    const requiredDone = required.every((f) => isFilled(detective?.[f.id]))
    return {
      id: ch.id,
      num: ch.num,
      title: ch.title,
      total,
      done,
      requiredDone,
      // Split out separately from `total` so the rail can say how many of a
      // chapter's fields actually gate anything. Most chapters gate nothing;
      // without this every field reads as mandatory and 30 empty boxes look
      // like 30 failures.
      requiredTotal: required.length,
      requiredRemaining: required.filter((f) => !isFilled(detective?.[f.id])).length,
      complete: done === total && total > 0,
      pct: total ? Math.round((done / total) * 100) : 0,
    }
  })
  const fieldTotal = chapters.reduce((n, c) => n + c.total, 0)
  const filledCount = chapters.reduce((n, c) => n + c.done, 0)
  const requiredReady = chapters.every((c) => c.requiredDone)
  return {
    chapters,
    fieldTotal,
    filledCount,
    pct: fieldTotal ? Math.round((filledCount / fieldTotal) * 100) : 0,
    requiredReady,
  }
}

/** Every declared field, flattened. */
export const ALL_DETECTIVE_FIELDS = DETECTIVE_CHAPTERS.flatMap((c) => c.fields)

const normalise = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * Coerce answers arriving as free text into the shape their field declares.
 *
 * The blank "Project overview" PDF draws a plain text box for every field
 * regardless of type — there is no checkbox for a checklist, no radio for a
 * choice, no worded scale for a spectrum — and both read paths
 * (readOverviewPdfForm, parseOverviewOcrText) return Record<string,string>
 * with no per-type handling. So a client filling the page in by hand writes
 * "logo, cards, colours" into a field the whole app treats as an array of
 * option ids.
 *
 * Written straight through, that string is silently wrong everywhere: the
 * Define checklist renders every box unchecked for a value that is sitting
 * right there, the spectrum control shows no position, composeBriefFromDetective
 * drops the deliverables line, isFilled() still counts it so progress reads
 * further along than it is — and touchpointsFor() falls back to
 * LEGACY_TOUCHPOINTS, which means the brand book PDF handed to the client
 * prints stock applications instead of the ones they asked for. Every consumer
 * guards with `Array.isArray(x) ? x : []`, which is why none of it throws.
 *
 * So: match what can be matched, and never write what cannot. Anything left
 * over is handed back as text so the review screen can show it and the human
 * can tick the right boxes — losing the client's words would be its own bug.
 *
 * @param {Record<string, unknown>} answers
 * @returns {{ answers: Record<string, unknown>, unmatched: Record<string, string> }}
 */
export function coerceScannedAnswers(answers = {}) {
  const out = {}
  const unmatched = {}

  for (const [id, raw] of Object.entries(answers || {})) {
    const field = ALL_DETECTIVE_FIELDS.find((f) => f.id === id)

    // Unknown field, or already the right shape — nothing to do.
    if (!field || Array.isArray(raw)) {
      out[id] = raw
      continue
    }
    const text = String(raw ?? '')
    if (!text.trim()) continue

    if (field.type === 'checklist') {
      const options = field.options || []
      /* Match whole labels against the whole string, longest first, rather
         than splitting on commas and matching the pieces. Several real option
         labels contain commas themselves — "Logo variations (stacked,
         horizontal, icon)" is the most likely thing a client writes — and
         splitting shreds exactly those into fragments that match nothing. */
      let rest = ` ${normalise(text)} `
      const picked = []
      const byLength = [...options].sort(
        (a, b) => normalise(b.label).length - normalise(a.label).length
      )
      for (const o of byLength) {
        for (const candidate of [normalise(o.label), normalise(o.id)]) {
          if (!candidate) continue
          if (rest.includes(` ${candidate} `) || rest.includes(candidate)) {
            if (!picked.includes(o.id)) picked.push(o.id)
            rest = rest.replace(candidate, ' ')
            break
          }
        }
      }
      // Keep declaration order, not match order — this is a scope list.
      if (picked.length) {
        out[id] = options.filter((o) => picked.includes(o.id)).map((o) => o.id)
      }
      const leftover = rest
        .split(/[,;\n·•]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 2)
        .join(', ')
      if (leftover) unmatched[id] = leftover
      continue
    }

    if (field.type === 'choice') {
      const n = normalise(text)
      const hit = (field.options || []).find(
        (o) => normalise(o.id) === n || normalise(o.label) === n
      )
      if (hit) out[id] = hit.id
      else unmatched[id] = text.trim()
      continue
    }

    if (field.type === 'spectrum') {
      const n = normalise(text)
      const hit = spectrumChoices(field.poles).find(
        (c) => normalise(c.value) === n || normalise(c.label) === n
      )
      if (hit) out[id] = hit.value
      else unmatched[id] = text.trim()
      continue
    }

    out[id] = raw
  }

  return { answers: out, unmatched }
}

/**
 * True when a value cannot legally be stored in this field.
 *
 * Deliberately narrow: it only rejects the case that has actually caused
 * silent damage — free text arriving for a field the schema declares as a
 * checklist, a choice or a spectrum. Unknown fields, correct shapes and empty
 * values all pass, because a guard that rejects too much loses real answers,
 * which is the bug it exists to prevent, pointed the other way.
 *
 * @param {string} fieldId
 * @param {unknown} value
 * @returns {boolean}
 */
export function isWrongShapeForField(fieldId, value) {
  const field = ALL_DETECTIVE_FIELDS.find((f) => f.id === fieldId)
  if (!field) return false

  if (field.type === 'checklist') {
    // Must be an array of declared option ids.
    if (!Array.isArray(value)) return true
    const ids = new Set((field.options || []).map((o) => o.id))
    return value.some((v) => !ids.has(v))
  }

  if (field.type === 'choice') {
    if (Array.isArray(value)) return true
    const v = String(value ?? '').trim()
    if (!v) return false
    return !(field.options || []).some((o) => o.id === v)
  }

  if (field.type === 'spectrum') {
    if (Array.isArray(value)) return true
    const v = String(value ?? '').trim()
    if (!v) return false
    return !spectrumChoices(field.poles).some((c) => c.value === v)
  }

  return false
}

/**
 * Which brand-element progress items a picked deliverable brings into scope.
 *
 * Keyed by the progress-item ids that brandProgressSummary and packReadiness
 * already use ('palette' = colours, 'tagline', 'voice'). An item listed here
 * counts only if the brief picked a deliverable that needs it. Everything NOT
 * listed — the logo itself, and the process items (goal, research pins,
 * positioning, handoff note, learnings) — always counts, because they apply to
 * any identity job including a logo-only one.
 *
 * This is what lets a finished logo-only job read as finished: the client
 * picked logoPrimary, so colours/tagline/voice are simply not counted, and
 * there is nothing left "to go". No "logo only" mode, no toggle — the answer
 * was already given in the brief's deliverablesPicked.
 */
const SCOPE_BY_ITEM = {
  palette: ['colourPalette', 'guidelines'],
  tagline: ['guidelines'],
  voice: ['guidelines'],
}

/**
 * @param {string} itemId  a progress-item id (e.g. 'palette', 'logo', 'voice')
 * @param {string[]} deliverablesPicked  the brief's deliverablesPicked
 * @returns {boolean} whether this item should count toward progress/readiness
 */
export function progressItemInScope(itemId, deliverablesPicked) {
  const picked = Array.isArray(deliverablesPicked) ? deliverablesPicked : []
  /* No brief filled yet → count everything. An unstarted brief must not read
     as scoped-down-and-done; the full set is the honest default until the job
     actually says otherwise. This also keeps every existing full-identity
     project behaving exactly as before. */
  if (!picked.length) return true
  const needs = SCOPE_BY_ITEM[itemId]
  if (!needs) return true // logo + process items — always in scope
  return needs.some((d) => picked.includes(d))
}
