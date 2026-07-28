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
        id: 'existingAssets',
        label: 'Do you have anything already?',
        tip: 'Old logo, colours, or attach it',
        area: true,
        attach: true,
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
/**
 * Map a 0–100 (or 0–1) spectrum slider value onto the five worded tokens.
 * Legacy projects stored numbers; the UI now stores tokens. Both must export
 * as human labels — never raw "42".
 */
export function spectrumTokenFromNumeric(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  // 0–1 float → 0–100
  const pct = n > 0 && n <= 1 ? n * 100 : n
  if (pct < 0 || pct > 100) return null
  if (pct <= 15) return 'a'
  if (pct <= 35) return 'mostly-a'
  if (pct <= 65) return 'balanced'
  if (pct <= 85) return 'mostly-b'
  return 'b'
}

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
    const choices = spectrumChoices(field.poles || [])
    const hit = choices.find((c) => c.value === s)
    if (hit) return hit.label
    // Legacy numeric sliders (0–100 or 0–1)
    const token = spectrumTokenFromNumeric(raw)
    if (token) {
      const mapped = choices.find((c) => c.value === token)
      if (mapped) return mapped.label
    }
  }
  if ((field?.type === 'choice' || field?.type === 'select') && field.options) {
    const hit = field.options.find((o) => o.id === s || o.value === s)
    if (hit) return hit.label
  }
  return s
}

/**
 * Filled detective chapters for export (labels + human answers only).
 * Never includes tips/placeholders — those are form chrome, not content.
 * @param {Record<string, unknown>} detective
 * @returns {Array<{ num: string, title: string, rows: Array<{ id: string, label: string, answer: string }> }>}
 */
export function filledDetectiveChapters(detective = {}) {
  return DETECTIVE_CHAPTERS.map((ch) => {
    const rows = (ch.fields || [])
      .map((f) => {
        const answer = formatDetectiveAnswer(f, detective?.[f.id])
        return answer ? { id: f.id, label: f.label, answer } : null
      })
      .filter(Boolean)
    return rows.length ? { num: ch.num, title: ch.title, rows } : null
  }).filter(Boolean)
}

/** Fields worth a leave-behind highlight — strategy signal, not admin contact. */
const BRIEF_HIGHLIGHT_IDS = [
  'goal',
  'audience',
  'feel',
  'brandWords',
  'brandAsPerson',
  'usp',
  'toneOfVoice',
  'competitors',
  'audiencePains',
  'inspirationLinks',
  'avoid',
  'spectrumModernTraditional',
  'spectrumPlayfulProfessional',
  'spectrumHighEndAffordable',
  'spectrumBoldMinimalist',
]

/**
 * Compact strategy highlights for the brand book (not a form dump).
 * @param {Record<string, unknown>} detective
 * @param {number} [limit=6]
 * @returns {Array<{ label: string, answer: string }>}
 */
export function briefHighlightsForPack(detective = {}, limit = 6) {
  const all = filledDetectiveChapters(detective).flatMap((ch) => ch.rows)
  const byId = new Map(all.map((r) => [r.id, r]))
  const picked = []
  for (const id of BRIEF_HIGHLIGHT_IDS) {
    const row = byId.get(id)
    if (row) picked.push({ label: row.label, answer: row.answer })
    if (picked.length >= limit) break
  }
  // If strategy fields empty, fall back to non-contact filled rows
  if (!picked.length) {
    const skip = new Set([
      'clientName',
      'primaryContact',
      'clientEmail',
      'clientPhone',
      'budgetRange',
      'projectDeadline',
      'engagementType',
      'decisionMakers',
    ])
    for (const row of all) {
      if (skip.has(row.id)) continue
      picked.push({ label: row.label, answer: row.answer })
      if (picked.length >= limit) break
    }
  }
  return picked
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
