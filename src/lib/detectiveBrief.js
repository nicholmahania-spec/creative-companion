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
        tip: 'Trading name is fine — whatever customers call you.',
        area: false,
        required: true,
        gridSpan: 'half',
      },
      {
        id: 'primaryContact',
        label: 'Primary contact & role',
        tip: 'e.g. Sarah Whitton, Owner',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'clientEmail',
        label: 'Client email',
        tip: 'Best address for project updates.',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'clientPhone',
        label: 'Client phone',
        tip: 'Optional — only if something needs a quick answer.',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'budgetRange',
        label: 'Budget range',
        tip: 'A range is fine. Say “not sure” if you’d rather talk it through.',
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
        tip: 'e.g. “People keep mistaking us for a much smaller company.”',
        area: true,
        required: true,
        gridSpan: 'full',
      },
      {
        id: 'story',
        label: 'The story',
        tip: 'Even a couple of lines — who started it, and why.',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'usp',
        label: 'What the company does',
        tip: 'e.g. “Small-batch coffee roastery — we sell online and wholesale to cafés.”',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'brandWords',
        label: 'Core values',
        tip: 'e.g. honesty over polish, no hard sell, everything made locally.',
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
        label: 'Who is your target audience',
        tip: 'e.g. new parents, 25–40, buying gifts they can’t find on the high street.',
        area: false,
        required: true,
        gridSpan: 'half',
      },
      {
        id: 'feel',
        label: 'How it should feel',
        tip: 'e.g. reassured, curious, like they’ve found something before everyone else.',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'audiencePains',
        label: 'Their biggest frustration or desire',
        tip: 'The thing they complain about, or wish existed.',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'competitors',
        label: 'Competitors',
        tip: 'Two or three names, and what you think of how they look.',
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
        label: 'Three words that describe the brand',
        tip: 'e.g. “quick, honest, no nonsense”',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'brandAsPerson',
        label: 'The brand as a person',
        tip: 'e.g. the friend who always knows a good restaurant — warm, a bit blunt, never showy.',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'inspirationLinks',
        label: 'The look and feel you want',
        tip: 'Paste any links, or just describe it — other brands, packaging, a colour you keep coming back to.',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'avoid',
        label: 'What to avoid',
        tip: 'e.g. “nothing pastel”, “no stock photos of people in headsets”.',
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
        tip: 'Logo, business cards, social graphics, packaging — list whatever you know you need.',
        area: true,
        required: true,
        gridSpan: 'half',
      },
      {
        id: 'technical',
        label: 'File formats',
        tip: 'Leave blank if you’re not sure — standard print and web formats are included either way.',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'existingAssets',
        label: 'Existing assets',
        tip: 'An old logo, brand colours, fonts, photos — anything you’ve got, even if you don’t like it.',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'decisionMakers',
        label: 'Anyone else to include',
        tip: 'Names and emails — they’ll get the same link. Leave blank if it’s just you.',
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
