/**
 * Step-by-step concept package → Brand identity mapping.
 * Smooth path: sketches → develop → iterate → lock → package → Brand.
 */

export const CONCEPT_STAGES = [
  {
    id: 'sketch',
    label: '1 · Sketches',
    hint: 'Upload roughs, photos of paper, thumbnails',
  },
  {
    id: 'develop',
    label: '2 · Develop',
    hint: 'Select sketches worth pushing further',
  },
  {
    id: 'iteration',
    label: '3 · Iterations',
    hint: 'Upload refined versions tied to a work step',
  },
  {
    id: 'locked',
    label: '4 · Locked plan',
    hint: 'Ideas locked into the concept plan',
  },
  {
    id: 'package',
    label: '5 · Package',
    hint: 'Fill the concept pack — then push into Brand identity',
  },
]

/** Fields collected in the package wizard (before Brand) */
export const PACKAGE_FIELDS = [
  {
    id: 'audience',
    label: 'Who is this for?',
    placeholder: 'e.g. Foster families looking for hope, not a campaign',
    brandMap: null, // feeds brief
    briefPrefix: 'Audience',
  },
  {
    id: 'outcome',
    label: 'What should they feel or do?',
    placeholder: 'e.g. Feel invited and not alone; share the booklet',
    brandMap: null,
    briefPrefix: 'Outcome',
  },
  {
    id: 'concept',
    label: 'Core concept (one sentence)',
    placeholder: 'e.g. Quiet belonging made visible',
    brandMap: 'tagline',
  },
  {
    id: 'voice',
    label: 'How does it sound?',
    placeholder: 'e.g. Warm, plain-spoken, hopeful — never corporate',
    brandMap: 'voice',
  },
  {
    id: 'visualDirection',
    label: 'Visual / logo direction',
    placeholder: 'e.g. Soft monoline mark, no drop shadows, invitation not sell',
    brandMap: 'logoDirection',
  },
  {
    id: 'doUse',
    label: 'Do',
    placeholder: 'Behaviors, materials, tone that fit',
    brandMap: 'doUse',
  },
  {
    id: 'dontUse',
    label: 'Don’t',
    placeholder: 'Clichés and traps to avoid',
    brandMap: 'dontUse',
  },
]

export function emptyPackageDraft() {
  return {
    audience: '',
    outcome: '',
    concept: '',
    voice: '',
    visualDirection: '',
    doUse: '',
    dontUse: '',
    notes: '',
  }
}

/** Build brand + brief patch from package draft + locked items */
export function packageToBrandPatch(draft, lockedItems = []) {
  const d = draft || emptyPackageDraft()
  const briefParts = []
  if (d.audience?.trim()) briefParts.push(`Audience: ${d.audience.trim()}`)
  if (d.outcome?.trim()) briefParts.push(`Outcome: ${d.outcome.trim()}`)
  if (d.notes?.trim()) briefParts.push(d.notes.trim())

  const lockedNotes = lockedItems
    .map((i) => i.note || i.title)
    .filter(Boolean)
    .slice(0, 8)
  if (lockedNotes.length) {
    briefParts.push(`Locked concepts: ${lockedNotes.join(' · ')}`)
  }

  return {
    brief: briefParts.join('\n\n') || '',
    tagline: (d.concept || '').trim(),
    voice: (d.voice || '').trim(),
    logoDirection: (d.visualDirection || '').trim(),
    doUse: (d.doUse || '').trim(),
    dontUse: (d.dontUse || '').trim(),
  }
}

export function packageProgress(draft) {
  const d = draft || emptyPackageDraft()
  const keys = PACKAGE_FIELDS.map((f) => f.id)
  const filled = keys.filter((k) => String(d[k] || '').trim()).length
  return {
    filled,
    total: keys.length,
    percent: Math.round((filled / keys.length) * 100),
  }
}
