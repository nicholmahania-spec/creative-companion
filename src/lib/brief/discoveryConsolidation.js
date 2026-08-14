/**
 * The proven half of the retired Discovery schema, moved into the canonical
 * one.
 *
 * WHAT THIS IS FOR. Projects made before the intake consolidation hold answers
 * in `discoveryAnswers`, a 30-question schema the Brief never read. Eighteen of
 * those questions have a canonical home that was established by reading both
 * schemas' own wording, not by matching names — so those answers can live where
 * the rest of the app already looks. The other twelve cannot, and are left
 * exactly where they are.
 *
 * PRECEDENCE IS NOT INVENTED HERE. `mergeDiscoveryAnswers` already decides what
 * happens when a client's answer meets one the studio wrote, and has since the
 * public link existed: refuse a value of the wrong shape, ignore an empty one,
 * and never overwrite something already set. This applies the same three rules
 * to the same destination. Anything else would mean two different answers to
 * "who wins" depending on which door the value came through.
 *
 * IT NEVER TOUCHES `discoveryAnswers`. The historical object is returned
 * untouched, in full, including every field mapped out of it. Copying is not
 * moving: the notes surface still shows what the client actually wrote, and the
 * markdown hand-off still reads it. Nothing is deleted to make the model look
 * tidier.
 *
 * IDEMPOTENT BY CONSTRUCTION, not by a flag. Because it only ever fills a blank,
 * the second run finds every target already set and changes nothing. There is
 * no "migrated" marker to get out of step with the data.
 */
import { ALL_DETECTIVE_FIELDS, isWrongShapeForField } from './detectiveBrief'

/**
 * Discovery field id → canonical `detective` field id.
 *
 * ELEVEN ARE THE SAME QUESTION UNDER THE SAME NAME. Seven are the same question
 * under a different one, and those were settled individually against the two
 * schemas' wording:
 *
 *   targetAudience       → audience      "Who are your customers?"
 *   desiredFeeling       → feel          "How should people feel…"
 *   elementsToAvoid      → avoid         "…anything you definitely don't want?"
 *   mustHaveDeliverables → deliverables  "Anything else you need?"
 *   fileFormats          → technical     "Any file types you know you'll need?"
 *   offering             → usp           "What does your business do?"
 *
 * `offering` → `usp` IS THE ONE TO READ TWICE. Discovery had BOTH `offering`
 * ("What you offer") and `usp` ("What makes you different?"), while canonical
 * `usp` asks "What does your business do?" — which is `offering`'s question,
 * not Discovery `usp`'s. So the same-named pair is the one pair that must NOT
 * be joined: Discovery's `usp` is differentiation, canonical has no home for
 * it, and mapping by name would file a differentiator under "what you do" and
 * read back as though the client had said it.
 */
export const DISCOVERY_TO_DETECTIVE = Object.freeze({
  clientName: 'clientName',
  primaryContact: 'primaryContact',
  budgetRange: 'budgetRange',
  story: 'story',
  audiencePains: 'audiencePains',
  competitors: 'competitors',
  brandAsPerson: 'brandAsPerson',
  toneOfVoice: 'toneOfVoice',
  inspirationLinks: 'inspirationLinks',
  existingAssets: 'existingAssets',
  decisionMakers: 'decisionMakers',
  targetAudience: 'audience',
  desiredFeeling: 'feel',
  elementsToAvoid: 'avoid',
  mustHaveDeliverables: 'deliverables',
  offering: 'usp',
  fileFormats: 'technical',
})

/**
 * Discovery answers that stay put, and why — kept as a list so the reason
 * survives longer than the conversation it came from.
 *
 *   usp                  differentiation; canonical has no field for it, and
 *                        adding one would also mean changing the live delivery
 *                        whitelist. A separate decision.
 *   startDeadline        packs a start date AND a deadline into one free-text
 *                        box. Canonical has one date and no start-date concept
 *                        at all, so either half of it would be lost.
 *   launchDate           "ideal launch" is not "date this needs to be done by",
 *                        and would collide with startDeadline for that one slot.
 *   fiveYearVision       discovery-support; no canonical equivalent.
 *   admiredBrands        ditto — and not the same question as `competitors`.
 *   problem              ditto.
 *   coreValues           ditto.
 *   visualStyleKeywords  ditto.
 *   spectrum*            free text. Canonical spectra accept five tokens and
 *                        nothing else, so converting one means inventing a
 *                        position on a scale the client never used.
 */
export const DISCOVERY_DEFERRED = Object.freeze([
  'usp',
  'startDeadline',
  'launchDate',
  'fiveYearVision',
  'admiredBrands',
  'problem',
  'coreValues',
  'visualStyleKeywords',
  'spectrumModernTraditional',
  'spectrumPlayfulProfessional',
  'spectrumHighEndAffordable',
  'spectrumBoldMinimalist',
])

const DETECTIVE_IDS = new Set(ALL_DETECTIVE_FIELDS.map((f) => f.id))

/** Same emptiness test the client merge uses, arrays included. */
function isEmpty(v) {
  if (Array.isArray(v)) return v.length === 0
  return String(v ?? '').trim().length === 0
}

/**
 * Fill canonical blanks from a project's historical Discovery answers.
 *
 * @param {object} project
 * @returns {object} the project — the same object when nothing changed, so a
 *   caller can skip the write and a second run is visibly a no-op.
 */
export function consolidateDiscovery(project) {
  if (!project || typeof project !== 'object') return project
  const answers = project.discoveryAnswers
  if (!answers || typeof answers !== 'object') return project

  const detective = { ...(project.detective || {}) }
  let changed = false

  for (const [from, to] of Object.entries(DISCOVERY_TO_DETECTIVE)) {
    const incoming = answers[from]
    if (isEmpty(incoming)) continue
    /* Not a field this build knows — a schema that moved on should drop the
       value rather than write a key nothing renders. */
    if (!DETECTIVE_IDS.has(to)) continue
    /* The shape guard the client merge uses. It is what makes a free-text
       answer physically unable to land in a token-only field, so the rule
       survives even if this map is edited carelessly later. */
    if (isWrongShapeForField(to, incoming)) continue
    /* CANONICAL WINS. Only a blank is filled — which is also what makes this
       idempotent, since the second run finds the target set. */
    if (!isEmpty(detective[to])) continue
    detective[to] = incoming
    changed = true
  }

  /* The project's own name is not a `detective` field and never was. It is
     filled only when the project has no name at all, which in practice means
     never — a project is created with one. Present so the mapping is complete
     and honest rather than silently dropped. */
  const titleIncoming = answers.projectTitle
  const takeTitle = !isEmpty(titleIncoming) && isEmpty(project.name)

  if (!changed && !takeTitle) return project

  return {
    ...project,
    /* Untouched, in full. Copying is not moving. */
    discoveryAnswers: answers,
    detective,
    ...(takeTitle ? { name: String(titleIncoming).trim() } : null),
  }
}
