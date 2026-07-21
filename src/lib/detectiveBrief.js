/**
 * Define / detective brief chapters + progress helpers.
 * Shared by DefineView timeline and DetectiveSheet form.
 */

export const DETECTIVE_CHAPTERS = [
  {
    id: 'core',
    num: '01',
    title: 'Core',
    blurb: '',
    accent: 'var(--define-ch-1)',
    fields: [
      {
        id: 'goal',
        label: 'One-sentence goal',
        tip: 'One outcome that matters.',
        placeholder: 'One clear goal',
        area: true,
        icon: 'target',
        required: true,
      },
      {
        id: 'audience',
        label: 'Who is this for?',
        tip: 'Not “everyone.”',
        placeholder: 'Who it\'s for',
        area: false,
        icon: 'people',
        required: true,
      },
      {
        id: 'feel',
        label: 'What should they feel or do?',
        tip: '3 words max.',
        placeholder: 'Feeling',
        area: true,
        icon: 'heart',
        required: false,
      },
    ],
  },
  {
    id: 'identity',
    num: '02',
    title: 'Identity',
    blurb: '',
    accent: 'var(--define-ch-2)',
    fields: [
      {
        id: 'brandWords',
        label: 'Brand words (3–5)',
        tip: '3–5 adjectives.',
        placeholder: '3–5 words',
        area: false,
        icon: 'spark',
        required: true,
      },
      {
        id: 'mustHaves',
        label: 'Must-haves',
        tip: 'Non-negotiables.',
        placeholder: 'Must include',
        area: true,
        icon: 'check',
        required: false,
      },
      {
        id: 'niceToHaves',
        label: 'Nice-to-haves',
        tip: 'Optional extras.',
        placeholder: 'Nice to have',
        area: true,
        icon: 'star',
        required: false,
      },
      {
        id: 'format',
        label: 'Format / size',
        tip: 'PDF, print, social…',
        placeholder: 'Format + size',
        area: false,
        icon: 'frame',
        required: false,
      },
    ],
  },
  {
    id: 'constraints',
    num: '03',
    title: 'Constraints',
    blurb: '',
    accent: 'var(--define-ch-3)',
    fields: [
      {
        id: 'avoid',
        label: 'What to avoid',
        tip: 'Hard nos.',
        placeholder: 'What to avoid',
        area: true,
        icon: 'block',
        required: false,
      },
      {
        id: 'deliverables',
        label: 'Deliverables — what ships',
        tip: 'What ships.',
        placeholder: 'Final files',
        area: true,
        icon: 'box',
        required: false,
      },
      {
        id: 'technical',
        label: 'Technical / production constraints',
        tip: 'Print / file limits.',
        placeholder: 'Specs',
        area: true,
        icon: 'gear',
        required: false,
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
