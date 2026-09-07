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

/* ────────────────────────────────────────────────────────────────────────
   THE CLIENT'S OWN WORDS, AS STRATEGY WORDS.

   The brief asks two questions whose answers ARE brand words:

     toneOfVoice  "If a customer described you in three words…"
     feel         "How should people feel when they come across your brand?"

   Until this bridge, those answers were read by the brief's renderer and by
   nobody else, while `StrategyWords` asked the designer "What should this
   brand feel like?" — the same question, in the same words, on the same
   page — and made them type the answer again before any alignment bar
   could move. A duplicate authoring location for one fact, which is the
   rule G1.5 exists to stop.

   Words are SPLIT, never composed. A three-word answer becomes three words;
   a sentence is not a word and is left alone (see `splitBriefWords`). The
   label is the client's own casing so the list reads as something they said.

   AXES ARE A ROUGH PLACEMENT, NOT A READING. A small lexicon puts the
   common adjectives on the one axis they most plainly name — "warm" is
   warmth, "modern" is era. That is the Expansion Spec's "system suggesting
   defaults", and it is the only kind of default worth shipping: one axis
   per word (the same discipline as the spectrums above, for the same
   double-weighting reason), a middling-not-extreme value, and NOTHING for a
   word the lexicon does not know. Rows carry `suggested: true` so the UI
   can say the placement was a guess and the designer's adjustment settles
   it. The brand-personality literature (Aaker's scale and its critics) is
   clear that one adjective does not mean one number across brands; the
   designer, not the lexicon, has the last word. */

/** The brief questions whose answers are read as words. */
export const WORD_SOURCES = Object.freeze(['toneOfVoice', 'feel'])

/**
 * Adjective → the single axis it most plainly names. Values sit inside the
 * poles on purpose: a lexicon cannot know how warm THIS brand's "warm" is,
 * so it never claims the extreme.
 */
const LEXICON = {
  /* formality — casual 0 · formal 1 */
  playful: { formality: 0.15 },
  fun: { formality: 0.15 },
  cheeky: { formality: 0.1 },
  casual: { formality: 0.15 },
  relaxed: { formality: 0.2 },
  informal: { formality: 0.15 },
  friendly: { formality: 0.25 },
  approachable: { formality: 0.25 },
  'down-to-earth': { formality: 0.2 },
  professional: { formality: 0.85 },
  formal: { formality: 0.9 },
  serious: { formality: 0.8 },
  refined: { formality: 0.8 },
  polished: { formality: 0.8 },
  elegant: { formality: 0.8 },
  luxurious: { formality: 0.85 },
  luxury: { formality: 0.85 },
  premium: { formality: 0.8 },
  authoritative: { formality: 0.85 },
  corporate: { formality: 0.9 },
  expert: { formality: 0.75 },
  /* energy — calm 0 · energetic 1 */
  calm: { energy: 0.1 },
  serene: { energy: 0.1 },
  peaceful: { energy: 0.1 },
  quiet: { energy: 0.15 },
  gentle: { energy: 0.2 },
  reassured: { energy: 0.25 },
  reassuring: { energy: 0.25 },
  steady: { energy: 0.3 },
  grounded: { energy: 0.25 },
  energetic: { energy: 0.9 },
  lively: { energy: 0.85 },
  dynamic: { energy: 0.85 },
  exciting: { energy: 0.9 },
  excited: { energy: 0.85 },
  vibrant: { energy: 0.85 },
  punchy: { energy: 0.8 },
  fast: { energy: 0.8 },
  quick: { energy: 0.75 },
  edgy: { energy: 0.8 },
  /* warmth — cool 0 · warm 1 */
  warm: { warmth: 0.9 },
  welcoming: { warmth: 0.85 },
  welcome: { warmth: 0.85 },
  caring: { warmth: 0.85 },
  kind: { warmth: 0.85 },
  nurturing: { warmth: 0.9 },
  cozy: { warmth: 0.9 },
  cosy: { warmth: 0.9 },
  human: { warmth: 0.75 },
  personal: { warmth: 0.7 },
  cool: { warmth: 0.15 },
  sleek: { warmth: 0.2 },
  clinical: { warmth: 0.1 },
  precise: { warmth: 0.25 },
  technical: { warmth: 0.2 },
  /* weight — light 0 · bold 1 */
  bold: { weight: 0.9 },
  strong: { weight: 0.85 },
  confident: { weight: 0.75 },
  powerful: { weight: 0.9 },
  loud: { weight: 0.9 },
  light: { weight: 0.1 },
  airy: { weight: 0.1 },
  delicate: { weight: 0.1 },
  subtle: { weight: 0.2 },
  minimal: { weight: 0.15 },
  minimalist: { weight: 0.15 },
  soft: { weight: 0.2 },
  understated: { weight: 0.2 },
  /* era — classic 0 · modern 1 */
  modern: { era: 0.9 },
  contemporary: { era: 0.85 },
  fresh: { era: 0.8 },
  innovative: { era: 0.85 },
  'cutting-edge': { era: 0.95 },
  futuristic: { era: 0.95 },
  ahead: { era: 0.85 },
  new: { era: 0.75 },
  classic: { era: 0.1 },
  traditional: { era: 0.1 },
  timeless: { era: 0.3 },
  heritage: { era: 0.1 },
  vintage: { era: 0.1 },
  retro: { era: 0.15 },
  established: { era: 0.3 },
}

/** The lexicon key for a word: lowercase, quotes and stray punctuation off. */
function lexiconKey(word) {
  return String(word)
    .toLowerCase()
    .replace(/[“”"'‘’.!?()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Split a brief answer into words.
 *
 * Splits on commas, semicolons, slashes, ampersands, line breaks and the
 * word "and". Keeps a chunk only when it is at most two words long: "warm",
 * "no nonsense" and "down to earth" are words a brand can feel like; "they
 * should feel like they can trust us" is a sentence, and turning a sentence
 * into a tag would be the app inventing a word with the client's name on
 * it. Duplicates collapse on the lexicon key, first spelling wins.
 *
 * @param {string} text
 * @returns {string[]} the client's words, in their own casing
 */
export function splitBriefWords(text) {
  const raw = String(text ?? '')
  if (!raw.trim()) return []
  const seen = new Set()
  const out = []
  for (const chunk of raw.split(/[,;/&\n]+|\band\b/i)) {
    const word = chunk.replace(/[“”"'‘’.!?()]/g, '').replace(/\s+/g, ' ').trim()
    if (!word) continue
    if (word.split(' ').length > 3 || word.length > 28) continue
    const key = lexiconKey(word)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(word)
  }
  return out
}

/** Stable id for a word from a brief question. */
export function briefWordId(sourceId, word) {
  return `brief:${sourceId}:${lexiconKey(word).replace(/\s/g, '-')}`
}

/**
 * Strategy words read from the client's own answers.
 *
 * @param {object} detective  the project's brief answers
 * @returns {Array<object>} attributes: `{ id, label, fromBrief, suggested?,
 *   [axis]? }` — `suggested` is present only when an axis was placed from
 *   the lexicon, so the list can say so.
 */
export function wordsFromBrief(detective) {
  const d = detective || {}
  const out = []
  const seen = new Set()
  for (const sourceId of WORD_SOURCES) {
    for (const word of splitBriefWords(d[sourceId])) {
      const key = lexiconKey(word)
      /* The same word in both answers is one word, credited to the first
         question that said it. */
      if (seen.has(key)) continue
      seen.add(key)
      const axes = LEXICON[key] || LEXICON[key.replace(/ /g, '-')]
      out.push({
        id: briefWordId(sourceId, word),
        label: word,
        fromBrief: sourceId,
        ...(axes ? { ...axes, suggested: true } : {}),
      })
    }
  }
  return out
}

/**
 * Everything the brief can put on the strategy list today: the spectrum
 * placements first (structured answers, honest axes), then the client's
 * words. One call for the store, so the two halves cannot be seeded on
 * different schedules.
 *
 * @param {object} detective
 * @param {Array<{id: string, poles: string[]}>} spectrumFields
 * @returns {Array<object>}
 */
export function strategyFromBrief(detective, spectrumFields = []) {
  return [
    ...attributesFromBrief(detective, spectrumFields),
    ...wordsFromBrief(detective),
  ]
}
