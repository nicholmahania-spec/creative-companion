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

export const DETECTIVE_CHAPTERS = [
  {
    id: 'overview',
    num: '01',
    title: 'Project Overview & Administration',
    railLabel: 'Client',
    fields: [
      {
        id: 'clientName',
        label: 'Client / company name',
        tip: 'Who this is for.',
        placeholder: 'Client or company name',
        area: false,
        required: true,
        gridSpan: 'half',
      },
      {
        id: 'primaryContact',
        label: 'Primary contact & role',
        tip: 'Who signs off.',
        placeholder: 'Name & role',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'clientEmail',
        label: 'Client email',
        tip: 'For tap-to-email from the directory.',
        placeholder: 'Email address',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'clientPhone',
        label: 'Client phone',
        tip: 'For tap-to-call from the directory.',
        placeholder: 'Phone number',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'budgetRange',
        label: 'Budget range',
        tip: 'Ballpark is fine.',
        placeholder: 'Budget range',
        area: false,
        required: false,
        gridSpan: 'half',
      },
    ],
  },
  {
    id: 'core',
    num: '02',
    title: 'Company Background & Strategy',
    railLabel: 'Company',
    fields: [
      {
        id: 'goal',
        label: 'Goal',
        tip: 'One outcome that matters — the problem this solves.',
        placeholder: 'One clear goal',
        area: true,
        required: true,
        gridSpan: 'full',
      },
      {
        id: 'story',
        label: 'The story',
        tip: 'How it started, why it exists.',
        placeholder: 'Origin & mission',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'usp',
        label: 'What makes this different',
        tip: 'Why choose this over a competitor.',
        placeholder: 'Unique selling proposition',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'brandWords',
        label: 'Three to five words',
        tip: '3–5 adjectives / core values.',
        placeholder: '3–5 words',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'fiveYearVision',
        label: 'In 5 years…',
        tip: 'Where this brand is headed.',
        placeholder: '5-year vision',
        area: false,
        required: false,
        gridSpan: 'half',
      },
    ],
  },
  {
    id: 'market',
    num: '03',
    title: 'Target Audience & Market',
    railLabel: 'Audience',
    fields: [
      {
        id: 'audience',
        label: "Who it's for",
        tip: 'Not "everyone." Age, lifestyle, interests.',
        placeholder: "Who it's for",
        area: false,
        required: true,
        gridSpan: 'half',
      },
      {
        id: 'feel',
        label: 'How it should feel',
        tip: 'How they should feel using this.',
        placeholder: 'Feeling',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'audiencePains',
        label: 'Their biggest frustration or desire',
        tip: '',
        placeholder: 'Pains / desires',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'competitors',
        label: 'Competitors',
        tip: '2–3 direct competitors — what you like/dislike about their branding.',
        placeholder: 'Competitors',
        area: true,
        required: false,
        gridSpan: 'half',
      },
    ],
  },
  {
    id: 'identity',
    num: '04',
    title: 'Brand Voice & Creative Direction',
    railLabel: 'Direction',
    fields: [
      {
        id: 'toneOfVoice',
        label: 'Tone of voice',
        tip: 'Playful, serious, formal, casual?',
        placeholder: 'Tone of voice',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'visualStyleKeywords',
        label: 'Visual style keywords',
        tip: 'e.g. minimalist, bold, vintage, modern.',
        placeholder: 'Style keywords',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'brandAsPerson',
        label: 'If this brand was a person…',
        tip: 'How would you describe their personality?',
        placeholder: 'Brand personality',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'brandSpectrum',
        label: 'Where it sits',
        tip: 'Modern↔Traditional · Playful↔Professional · High-end↔Affordable · Bold↔Minimalist.',
        placeholder: 'Spectrum notes',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'admiredBrands',
        label: 'Brands you admire',
        tip: 'Links + why.',
        placeholder: 'Admired brands',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'inspirationLinks',
        label: 'Inspiration / mood board links',
        tip: '',
        placeholder: 'Links or references',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'avoid',
        label: 'Avoid',
        tip: 'Words, colors, styles, or clichés to avoid.',
        placeholder: 'What to avoid',
        area: true,
        required: false,
        gridSpan: 'full',
      },
    ],
  },
  {
    id: 'constraints',
    num: '05',
    title: 'Deliverables & Technical Scope',
    railLabel: 'Deliverables',
    fields: [
      {
        id: 'deliverables',
        label: 'What we deliver',
        tip: 'Must-have deliverables — logo, cards, social kit, packaging…',
        placeholder: 'Final files',
        area: true,
        required: true,
        gridSpan: 'half',
      },
      {
        id: 'mustHaves',
        label: 'Non-negotiables',
        tip: 'Non-negotiables.',
        placeholder: 'Non-negotiables',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'technical',
        label: 'File formats',
        tip: 'File formats — vector .AI/.EPS, raster .PNG/.JPG, guidelines PDF.',
        placeholder: 'Specs',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'niceToHaves',
        label: 'Nice to have',
        tip: 'Nice-to-have extras.',
        placeholder: 'Optional items',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'existingAssets',
        label: 'Existing assets to keep',
        tip: 'Current logo, colors, photography we must keep.',
        placeholder: 'Existing assets',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'decisionMakers',
        label: 'Key decision-makers',
        tip: 'Who approves the final concepts.',
        placeholder: 'Decision-makers',
        area: false,
        required: false,
        gridSpan: 'half',
      },
    ],
  },
]

export function isFilled(val) {
  return String(val || '').trim().length > 0
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
