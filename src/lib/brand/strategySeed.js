/**
 * The client's positioning answers, placed on the rulers for them.
 *
 * THE DEFECT THIS CLOSES. The brief asks the client four positioning
 * questions — modern/traditional, playful/professional, high-end/affordable,
 * bold/minimal. Grepped across `src/`, those four answers were read by exactly
 * one module: the brief's own renderer. No design tool consumed them, ever.
 *
 * Meanwhile `StrategyWords` asked the DESIGNER "what should this brand feel
 * like?" and then asked them to place each word on five sliders by hand — and
 * that hand-tagged profile is what drives the alignment bars on Colour and
 * Type. So the client answered the question in the brief's vocabulary, and the
 * designer answered the same question again in the alignment engine's
 * vocabulary, because nothing translated between them.
 *
 * This is the translation. It is arithmetic over answers that already exist,
 * which is the only kind of derivation worth having: the designer adjusts a
 * result instead of authoring one.
 *
 * WHAT IS AND IS NOT MAPPED — the same discipline `colourAxes.js` applies to
 * hex values, for the same reason. An honest gap beats a confident invention.
 *
 *   Modern ↔ Traditional  → era      (modern is the high pole)
 *   Playful ↔ Professional → formality (professional is the high pole)
 *   Bold ↔ Minimal        → weight   (bold is the high pole)
 *   High-end ↔ Affordable → NOTHING. There is no axis for price position,
 *                           and bending it onto formality would assert that
 *                           expensive means formal, which is a claim about
 *                           taste, not a reading of the answer.
 *
 * ONE AXIS PER SPECTRUM, deliberately. "Playful" plausibly says something
 * about energy as well as formality, but `alignment.js` already records that
 * euclidean-style treatment of correlated axes silently double-weights
 * whichever ones co-vary. Writing one spectrum into two axes would manufacture
 * exactly that correlation rather than measure it.
 *
 * Unmapped axes stay ABSENT, not zero. `axisValue()` treats null as "not
 * said"; a 0 would read as the low pole and invent a strategy nobody wrote.
 */

/** Spectrum field id → the axis it lands on, and which pole is the high end. */
const SPECTRUM_AXES = {
  spectrumModernTraditional: { axis: 'era', highPole: 'a' }, // Modern = modern
  spectrumPlayfulProfessional: { axis: 'formality', highPole: 'b' }, // Professional = formal
  spectrumBoldMinimalist: { axis: 'weight', highPole: 'a' }, // Bold = bold
  // spectrumHighEndAffordable — no axis. See the header.
}

/** The five stored choices, as a position from pole A (0) to pole B (1). */
const CHOICE_POSITION = {
  a: 0,
  'mostly-a': 0.25,
  balanced: 0.5,
  'mostly-b': 0.75,
  b: 1,
}

/**
 * These fields were once a 0–100 slider and projects created then still hold
 * numbers — the same legacy `formatDetectiveAnswer` already handles. Read them
 * rather than discarding them, on the same five equal buckets.
 */
function positionFor(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  const key = String(raw)
  if (key in CHOICE_POSITION) return CHOICE_POSITION[key]
  const n = Number(key)
  if (!Number.isFinite(n) || n < 0 || n > 100) return null
  const bucket = Math.min(4, Math.floor(n / 20))
  return bucket / 4
}

/**
 * What to call the seeded attribute on the strategy list.
 *
 * The client's own words, so the list reads as something they said rather
 * than as a setting the app generated. `spectrumChoices` produces "Both
 * equally" for the midpoint, which is an answer to a question but not a word
 * a brand can feel like — the midpoint gets both poles instead.
 */
function labelFor(poles, choice) {
  const [a = '', b = ''] = poles
  switch (choice) {
    case 'a':
      return a
    case 'b':
      return b
    case 'mostly-a':
      return `Mostly ${a.toLowerCase()}`
    case 'mostly-b':
      return `Mostly ${b.toLowerCase()}`
    default:
      return `${a} / ${b.toLowerCase()}`
  }
}

/** The stored choice nearest a 0–1 position — legacy numbers get a word. */
function choiceFor(position) {
  const steps = ['a', 'mostly-a', 'balanced', 'mostly-b', 'b']
  return steps[Math.round(position * 4)] || 'balanced'
}

/**
 * Strategy attributes derived from the brief's positioning spectrums.
 *
 * Ids are STABLE and derived from the field id (`brief:spectrumBoldMinimalist`)
 * rather than the timestamp-random ids `StrategyWords` mints. Two consequences,
 * both wanted: seeding twice cannot produce a duplicate, and an attribute the
 * designer has since adjusted is recognisable as the one that came from this
 * question rather than as a stranger.
 *
 * @param {object} detective  the project's brief answers
 * @param {Array<{id: string, poles: string[]}>} spectrumFields
 *        the spectrum field definitions, passed in so this module does not
 *        import the brief schema and the poles cannot drift from it
 * @returns {Array<object>} strategy attributes, empty when nothing is answered
 */
export function attributesFromBrief(detective, spectrumFields = []) {
  const d = detective || {}
  const out = []
  for (const field of spectrumFields) {
    const mapping = SPECTRUM_AXES[field?.id]
    if (!mapping) continue
    const position = positionFor(d[field.id])
    if (position === null) continue
    /* `position` runs A→B. The axis runs low→high. When pole A is the high
       end of the axis, the two run opposite ways. */
    const value = mapping.highPole === 'a' ? 1 - position : position
    out.push({
      id: `brief:${field.id}`,
      label: labelFor(field.poles || [], choiceFor(position)),
      fromBrief: field.id,
      [mapping.axis]: Number(value.toFixed(2)),
    })
  }
  return out
}
