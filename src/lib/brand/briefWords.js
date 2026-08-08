/**
 * The words on the direction sheet, and where each one comes from.
 *
 * THE PROBLEM THIS REPLACES. Identity's "Words" screen showed the designer
 * five empty boxes — Positioning, Voice, Promise, Proof, Personality — every
 * one of which the client had already answered in the brief. The app knew:
 * `exportFiles.js` resolves `p.messagingPromise || d.messagingPromise` at
 * export time, so the client's answer shipped while the designer stared at an
 * empty field and could not tell that anything was behind it.
 *
 * THE RULE HERE, and it is the whole design:
 *
 *   RESOLVE, NEVER COPY.
 *
 * The brief value is never written into the project field to "populate the
 * UI". That would fork one fact into two columns and populate both — later
 * brief edits would stop propagating, and nobody could tell which column the
 * export reads. Instead the project field stays empty and the brief value is
 * shown as the EFFECTIVE value, marked as the client's. Typing writes the
 * override; clearing the override falls back again. One fact, one storage
 * location, one visible resolution rule — the same order `buildBrandPackSnapshot`
 * already resolves in, so what you see is what ships.
 *
 * AND NO ACCEPT STEP. There is deliberately no "keep theirs" button, no
 * confirm, no unconfirmed tint. Five lines each offering a choice whose
 * answer is nearly always the same is five decisions per visit, which is the
 * recurring-prompt failure PRD §2 bans outright — and "the fix is never a
 * don't-ask-again checkbox" closes the obvious escape hatch. Provenance is a
 * quiet suffix that disappears by itself the moment the designer types,
 * because at that point the line is no longer from the brief. Reading costs
 * nothing; a control costs a decision.
 */

/**
 * Project field → the brief question that already answers it.
 *
 * Only DIRECT answers are mapped. Composing two brief fields into one line
 * (audience + feel → "positioning") would be the app writing a sentence
 * nobody said and attributing it to the client, so `positioning` maps to the
 * single nearest question and `doUse` maps to nothing at all.
 */
export const BRIEF_WORD_SOURCES = {
  /* "What does your business do?" — the nearest thing the brief holds to a
     positioning statement. Not composed from audience+feel; that would be an
     invention with a client's name on it. */
  positioning: 'usp',
  /* "If a customer described you in three words, what would they be?" */
  voice: 'toneOfVoice',
  /* Same question, same id — the brief has asked this since the Promise/Proof
     fix, and the designer-side field has been empty and unwritten ever since. */
  messagingPromise: 'messagingPromise',
  messagingProof: 'messagingProof',
  /* "If your business were a person, what would they be like?" */
  messagingPersonality: 'brandAsPerson',
  /* THE CLIENT'S CONTACT DETAILS, ASKED ONCE.
     `orgEmail`/`orgPhone` were typed into the stationery preview on Assets
     while the brief had already asked the same two questions in Chapter 01,
     so a project could print one number on the letterhead and hold another in
     the client directory. Resolved rather than copied, like every other line
     here: what the designer typed wins, the client's answer fills the gap. */
  orgEmail: 'clientEmail',
  orgPhone: 'clientPhone',
  /* "Is there anything you definitely don't want?" */
  dontUse: 'avoid',
  /* `doUse` and `tagline` have NO brief source, and that is correct — nothing
     in the brief asks what to do or supplies a tagline. They are the
     designer's own, and an empty box is the honest state for them. */
}

const clean = (v) => String(v ?? '').trim()

/**
 * What this line actually reads, and whose words they are.
 *
 * @param {object} project
 * @param {string} field  a project field id, e.g. 'voice'
 * @returns {{ value: string, fromBrief: boolean }}
 *   `value` is what to show and edit. `fromBrief` is true only when the
 *   designer has written nothing and the client has.
 */
export function effectiveWord(project, field) {
  const own = clean(project?.[field])
  if (own) return { value: own, fromBrief: false }
  const sourceId = BRIEF_WORD_SOURCES[field]
  if (!sourceId) return { value: '', fromBrief: false }
  const fromClient = clean(project?.detective?.[sourceId])
  if (!fromClient) return { value: '', fromBrief: false }
  return { value: fromClient, fromBrief: true }
}

/**
 * The suffix shown beside the label. Three words, no control, no colour of
 * its own — information, not a prompt.
 */
export const BRIEF_PROVENANCE = 'from the brief'
