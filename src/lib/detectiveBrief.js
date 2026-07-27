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
        tip: 'Best address for project updates.',
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
        tip: 'What they complain about',
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
        tip: 'Paste links or describe it',
        area: true,
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
        tip: 'Tick everything you want',
        type: 'checklist',
        options: DELIVERABLE_OPTIONS,
        required: true,
        gridSpan: 'full',
      },
      {
        id: 'deliverables',
        label: 'Anything else you need?',
        tip: 'Anything not listed above',
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
        tip: 'Old logo, colours, fonts, photos',
        area: true,
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
 * The required fields actually still empty — not a static list of all of
 * them, which reads as wrong the moment some are filled in.
 *
 * Lives here rather than in a component because two surfaces need it: the
 * sheet opens the first incomplete chapter from it, and the header band
 * renders the jump buttons from it.
 */
export function getRequiredEmpty(detective = {}) {
  return DETECTIVE_CHAPTERS.flatMap((ch) =>
    ch.fields
      .filter((f) => f.required && !isFilled(detective?.[f.id]))
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
