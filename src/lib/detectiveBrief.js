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
        tip: 'Trading name is fine — whatever customers call you.',
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
        tip: 'Optional — only if something needs a quick answer.',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'budgetRange',
        label: 'What budget do you have in mind?',
        tip: 'A range is fine. Say “not sure” if you’d rather talk it through.',
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
        tip: 'e.g. “People keep mistaking us for a much smaller company.”',
        area: true,
        required: true,
        gridSpan: 'full',
      },
      {
        id: 'story',
        label: 'How did the business start?',
        tip: 'Even a couple of lines — who started it, and why.',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'usp',
        label: 'What does your business do?',
        tip: 'e.g. “Small-batch coffee roastery — we sell online and wholesale to cafés.”',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'brandWords',
        label: 'What matters most in how you do business?',
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
    title: 'Your customers',
    railLabel: 'Customers',
    fields: [
      {
        id: 'audience',
        label: 'Who are your customers?',
        tip: 'e.g. new parents, 25–40, buying gifts they can’t find on the high street.',
        area: false,
        required: true,
        gridSpan: 'half',
      },
      {
        id: 'feel',
        label: 'How should people feel when they come across your brand?',
        tip: 'e.g. reassured, curious, like they’ve found something before everyone else.',
        area: false,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'audiencePains',
        label: 'What frustrates your customers most?',
        tip: 'The thing they complain about, or wish existed.',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'competitors',
        label: 'Who else does what you do?',
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
        tip: 'e.g. the friend who always knows a good restaurant — warm, a bit blunt, never showy.',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'inspirationLinks',
        label: 'What look are you drawn to?',
        tip: 'Paste any links, or just describe it — other brands, packaging, a colour you keep coming back to.',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'avoid',
        label: 'Is there anything you definitely don’t want?',
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
    title: 'What you need',
    railLabel: 'Needs',
    fields: [
      {
        id: 'deliverables',
        label: 'What do you need made?',
        tip: 'Logo, business cards, social graphics, packaging — list whatever you know you need.',
        area: true,
        required: true,
        gridSpan: 'half',
      },
      {
        id: 'technical',
        label: 'Any file types you know you’ll need?',
        tip: 'Leave blank if you’re not sure — standard print and web formats are included either way.',
        area: true,
        designerOnly: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'existingAssets',
        label: 'Do you have anything already?',
        tip: 'An old logo, brand colours, fonts, photos — anything you’ve got, even if you don’t like it.',
        area: true,
        required: false,
        gridSpan: 'half',
      },
      {
        id: 'decisionMakers',
        label: 'Who else needs to approve this?',
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
