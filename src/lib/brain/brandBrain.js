/**
 * Brand brain — the project's memory, made askable.
 *
 * Everything here is already stored somewhere: the brief, the decision log,
 * the colour role reasons, the type rationale, the pins that got starred and
 * why, the directions that were NOT chosen, the client's feedback. What has
 * never existed is a way to ask it a question three weeks later — “why did we
 * choose this typeface”, “what did the client rule out” — without opening five
 * screens and reading them.
 *
 * Two things this is not:
 *
 * - It is not a model. Recall is keyword scoring over facts this project
 *   actually contains. It can only ever repeat something the designer or the
 *   client wrote down, which is the only answer worth trusting about why a
 *   decision was made.
 * - It does not judge. There is no “this typeface doesn't fit your strategy”
 *   verdict. It puts the strategy and the decision next to each other and
 *   lets the designer be the one who reads them.
 *
 * A fact with no `why` is still a fact — “Body face: Plus Jakarta Sans” is
 * worth recalling even when nobody wrote a rationale. But `why` is what makes
 * the memory worth having, so it is carried separately rather than mashed
 * into the value, and the UI can show which decisions have no reason on record.
 */

import {
  ALL_DETECTIVE_FIELDS,
  formatDetectiveAnswer,
} from '../brief/detectiveBrief'
import { labelForStepId } from '../journey/journey'

/* Where a fact came from, named by the screen the designer would open to
   change it — and DERIVED from the journey declaration rather than spelled,
   so a renamed stop renames its provenance too. Anything not a stage (the
   brief, the decision log) is its own name and has no other source. */
const SOURCE = {
  brief: 'Brief',
  decisions: 'Decision log',
  research: labelForStepId('research'),
  ideate: labelForStepId('ideate'),
  identity: labelForStepId('design'),
  touchpoints: labelForStepId('sketch'),
  review: labelForStepId('review'),
  assets: labelForStepId('deliver'),
}

const text = (v) => String(v ?? '').trim()

/** Topics a question can land on. Order is the order facts are collected. */
export const BRAIN_TOPICS = [
  'strategy',
  'audience',
  'direction',
  'rejected',
  'logo',
  'colour',
  'type',
  'touchpoint',
  'feedback',
  'handoff',
]

/**
 * Words that mean a topic. A designer asks “why this font”, not “type”.
 * Matching is on stems (see `tokens`), so `typography` also hits `typograph`.
 */
const TOPIC_WORDS = {
  strategy: ['strategy', 'goal', 'brief', 'promise', 'positioning', 'personality', 'word', 'voice', 'tone', 'brand'],
  audience: ['audience', 'customer', 'who', 'user', 'market', 'competitor'],
  direction: ['direction', 'concept', 'route', 'option', 'decision'],
  rejected: ['reject', 'rejected', 'dropped', 'discard', 'killed', 'avoid', 'dislike', 'disliked', 'hate', 'against', 'no', 'not', 'ruled'],
  logo: ['logo', 'mark', 'wordmark', 'icon', 'monogram', 'symbol', 'lockup', 'clearspace'],
  colour: ['colour', 'color', 'palette', 'hex', 'swatch', 'blue', 'green', 'red', 'contrast', 'accessib'],
  type: ['type', 'typeface', 'typograph', 'font', 'face', 'heading', 'body', 'lettering'],
  touchpoint: ['touchpoint', 'applicat', 'card', 'website', 'social', 'sign', 'packag', 'print', 'surface'],
  feedback: ['feedback', 'client', 'said', 'comment', 'revision', 'approve', 'approved', 'review', 'concern', 'worried', 'like', 'liked'],
  handoff: ['handoff', 'handover', 'deliver', 'ship', 'learn', 'package', 'final'],
}

/**
 * Question words that mean “show me the reasoning”, not a topic.
 *
 * The verbs of deciding live here rather than under the `direction` topic,
 * which is where they started. “Why did we CHOOSE this typeface” names its
 * subject once — typeface — and pointing `choose` at directions made the
 * question tie between the type rationale and whichever direction was picked,
 * then break the tie on recency. A verb says you are asking about a decision;
 * only the noun says which one.
 */
const WHY_WORDS = [
  'why',
  'reason',
  'because',
  'rationale',
  'justif',
  'thinking',
  'chose',
  'choose',
  'chosen',
  'decid',
  'pick',
  'select',
  'went',
]

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'we', 'i', 'did', 'do', 'does', 'was', 'were', 'is', 'are',
  'this', 'that', 'these', 'those', 'it', 'for', 'of', 'to', 'and', 'or', 'on',
  'in', 'with', 'about', 'what', 'which', 'our', 'my', 'their', 'them', 'they',
  'you', 'your', 'me', 'us', 'have', 'has', 'had', 'again', 'so', 'at', 'be',
])

/** Lowercase word stems, stop words dropped. */
export function tokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
}

let seq = 0
function fact({ topic, label, value, why = '', source, at = 0 }) {
  const v = text(value)
  const w = text(why)
  if (!v && !w) return null
  seq += 1
  return {
    id: `${topic}-${seq}`,
    topic,
    label: text(label),
    value: v,
    why: w,
    source: text(source),
    at: Number(at) || 0,
  }
}

/** Brief fields worth remembering, and the topic each one answers to. */
const BRIEF_FACTS = [
  ['goal', 'strategy'],
  ['usp', 'strategy'],
  ['brandWords', 'strategy'],
  ['messagingPromise', 'strategy'],
  ['messagingProof', 'strategy'],
  ['messagingCta', 'strategy'],
  ['toneOfVoice', 'strategy'],
  ['brandAsPerson', 'strategy'],
  ['audience', 'audience'],
  ['audiencePains', 'audience'],
  ['feel', 'audience'],
  ['competitors', 'audience'],
  ['avoid', 'rejected'],
  ['inspirationLinks', 'direction'],
  ['deliverablesPicked', 'handoff'],
  ['brandSurfaces', 'touchpoint'],
  ['accessibilityNeeds', 'colour'],
  ['existingAssets', 'logo'],
]

/**
 * Every fact this project can remember.
 *
 * @param {{ project?: object, moodItems?: array }} input
 * @returns {{ facts: Array<object>, byTopic: Record<string, Array<object>> }}
 */
export function buildBrandBrain({ project = null, moodItems = [] } = {}) {
  const p = project || {}
  const det = p.detective || {}
  const pins = (Array.isArray(moodItems) ? moodItems : []).filter(Boolean)
  const facts = []
  const push = (f) => {
    const row = fact(f)
    if (row) facts.push(row)
  }

  // ── The brief, in the client's own words ──────────────────────────────
  for (const [id, topic] of BRIEF_FACTS) {
    const field = ALL_DETECTIVE_FIELDS.find((f) => f.id === id)
    if (!field) continue
    push({
      topic,
      label: field.label,
      value: formatDetectiveAnswer(field, det[id]),
      source: SOURCE.brief,
    })
  }

  // ── Direction: what was chosen, and what was not ──────────────────────
  for (const d of p.decisionLog || []) {
    if (!d) continue
    push({
      topic: 'direction',
      label: d.label ? `Chose ${String(d.label).toUpperCase()}` : 'Decision',
      value: d.title,
      why: d.why,
      source: SOURCE.decisions,
      at: d.at,
    })
  }
  for (const d of p.directions || []) {
    if (!d || d.chosen) continue
    /* The routes NOT taken are the half of the record that always gets lost,
       and they are what stops the same dead end being walked twice. */
    push({
      topic: 'rejected',
      label: `Direction ${String(d.label || d.id || '').toUpperCase()} — not chosen`,
      value: d.title,
      why: d.note,
      source: SOURCE.ideate,
    })
  }

  // ── Identity decisions ────────────────────────────────────────────────
  push({ topic: 'logo', label: 'Wordmark', value: p.logoWordmark, source: SOURCE.identity })
  push({ topic: 'logo', label: 'Mark direction', value: p.logoDirection, source: SOURCE.identity })
  push({ topic: 'logo', label: 'Clearspace', value: p.logoClearspace, source: SOURCE.identity })
  push({ topic: 'logo', label: 'Minimum size', value: p.logoMinSize, source: SOURCE.identity })
  push({ topic: 'logo', label: 'What not to do to the mark', value: p.logoDonts, source: SOURCE.identity })
  /* Derived from the starred concept, with the old hand-typed note as the
     fallback for projects that recorded it before concepts existed. The note
     was a second place to keep a fact the workspace now holds directly, and
     a memory that reads the note instead of the star would start disagreeing
     with the mark that actually shipped. */
  push({
    topic: 'logo',
    label: 'The mark the client chose',
    value: (() => {
      const chosen = (Array.isArray(p.logoConcepts) ? p.logoConcepts : []).find(
        (c) => c?.chosen
      )
      const named = String(chosen?.label || '').trim()
      if (named) return named
      return p.logoClientChose
    })(),
    why: (() => {
      const chosen = (Array.isArray(p.logoConcepts) ? p.logoConcepts : []).find(
        (c) => c?.chosen
      )
      return String(chosen?.why || '').trim() || undefined
    })(),
    source: SOURCE.identity,
  })

  push({
    topic: 'type',
    label: 'Heading face',
    value: p.typeHeading,
    why: p.typeWhy,
    source: SOURCE.identity,
  })
  push({
    topic: 'type',
    label: 'Body face',
    value: p.typeBody,
    why: p.typeWhy,
    source: SOURCE.identity,
  })

  const roles = p.colorRoles || {}
  const roleWhy = p.colorRoleWhy || {}
  for (const role of Object.keys(roles)) {
    push({
      topic: 'colour',
      /* The topic KEY stays `colour` — an internal identifier, and renaming
         it would churn `TOPIC_WORDS`, `BRAIN_TOPICS` and the field map for no
         user-visible gain. The LABEL is what a designer reads, so that is
         American English. Same rule the brief follows for `colourPalette`:
         spelling is a UI concern, ids are data. */
      label: `${role.charAt(0).toUpperCase()}${role.slice(1)} color`,
      value: roles[role],
      why: roleWhy[role],
      source: SOURCE.identity,
    })
  }

  push({ topic: 'strategy', label: 'Tagline', value: p.tagline, source: SOURCE.identity })
  push({ topic: 'strategy', label: 'Voice', value: p.voice, source: SOURCE.identity })

  // ── Research: the references that were starred, and why ───────────────
  for (const m of pins) {
    if (!m.inPack) continue
    push({
      topic: 'direction',
      label: 'Starred reference',
      value: m.note || m.link || m.hex || 'Pinned reference',
      why: m.note && (m.link || m.hex) ? m.note : '',
      source: SOURCE.research,
    })
  }

  // ── Touchpoints ───────────────────────────────────────────────────────
  for (const [id, row] of Object.entries(p.touchpointApps || {})) {
    if (!row || typeof row !== 'object') continue
    push({
      topic: 'touchpoint',
      label: `Touchpoint · ${id}`,
      value: row.note || (row.done ? 'Looks right' : ''),
      source: SOURCE.touchpoints,
    })
  }

  // ── What the client actually said ─────────────────────────────────────
  for (const f of p.feedbackLog || []) {
    if (!f) continue
    push({
      topic: 'feedback',
      label: f.reviewer ? `${f.reviewer} said` : 'Feedback',
      value: f.issue,
      why: f.decision,
      source: SOURCE.review,
    })
  }
  for (const line of String(p.feedbackNotes || '').split('\n')) {
    push({
      topic: 'feedback',
      label: 'Review note',
      value: line.replace(/^[-•*]\s*/, ''),
      source: SOURCE.review,
    })
  }
  for (const r of p.revisionRounds || []) {
    if (!r) continue
    push({
      topic: 'feedback',
      label: r.closedAt ? 'Revision round (closed)' : 'Revision round (open)',
      value: r.note,
      source: SOURCE.review,
      at: Date.parse(r.openedAt || '') || 0,
    })
  }

  // ── Close ─────────────────────────────────────────────────────────────
  push({ topic: 'handoff', label: 'Handoff note', value: p.handoffNote, source: SOURCE.assets })
  push({ topic: 'handoff', label: 'What you learned', value: p.learnings, source: SOURCE.assets })

  const byTopic = {}
  for (const f of facts) {
    ;(byTopic[f.topic] ||= []).push(f)
  }
  return { facts, byTopic }
}

/**
 * Which topics a question is about. Empty when the question names none —
 * the caller then falls back to plain word matching across everything.
 */
export function topicsFor(query) {
  const qs = tokens(query)
  const hits = []
  for (const topic of BRAIN_TOPICS) {
    const words = TOPIC_WORDS[topic] || []
    if (qs.some((q) => words.some((w) => q.startsWith(w) || w.startsWith(q)))) {
      hits.push(topic)
    }
  }
  return hits
}

/** True when the question is asking for reasoning rather than a value. */
export function asksWhy(query) {
  return tokens(query).some((q) => WHY_WORDS.some((w) => q.startsWith(w)))
}

/**
 * Answer a question from what the project remembers.
 *
 * Scoring, in order of weight:
 *   topic hit          3   “typeface” → every type fact
 *   word in the value  2   the client's own words are the strongest signal
 *   word in the label  1
 *   has a `why`       +2   when the question asked why
 *
 * @param {{ facts: Array<object> }} brain
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 * @returns {{ matches: Array<object>, topics: string[], why: boolean }}
 */
export function recall(brain, query, { limit = 8 } = {}) {
  const facts = brain?.facts || []
  const topics = topicsFor(query)
  const why = asksWhy(query)
  const qs = tokens(query).filter(
    (q) => !WHY_WORDS.some((w) => q.startsWith(w))
  )

  /* No question yet: show the decisions that carry a reason, newest first.
     That is the memory at its most useful — “what did we decide, and why”. */
  if (!topics.length && !qs.length) {
    const withWhy = facts.filter((f) => f.why)
    const rest = facts.filter((f) => !f.why)
    return {
      matches: [...withWhy, ...rest].slice(0, limit),
      topics: [],
      why: false,
    }
  }

  const scored = facts
    .map((f) => {
      let score = 0
      if (topics.includes(f.topic)) score += 3
      const valueWords = tokens(`${f.value} ${f.why}`)
      const labelWords = tokens(f.label)
      for (const q of qs) {
        if (valueWords.some((w) => w.startsWith(q) || q.startsWith(w))) score += 2
        if (labelWords.some((w) => w.startsWith(q) || q.startsWith(w))) score += 1
      }
      if (why && f.why) score += score > 0 ? 2 : 0
      return { fact: f, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.fact.at - a.fact.at)

  return { matches: scored.slice(0, limit).map((r) => r.fact), topics, why }
}

/**
 * Recall, but never a dead end.
 *
 * `recall` answers the question asked. This answers the question the designer
 * was TRYING to ask, which is not the same thing and is the whole difficulty
 * of keyword access: two people pick the same word for a thing less than a
 * fifth of the time (Furnas, Landauer, Gomez & Dumais, CACM 1987), so “why is
 * it so round?” can miss a type rationale that is sitting right there.
 *
 * Missing it is survivable. Announcing it is not: “nothing on record about
 * that yet” tells the designer their own decision was never written down,
 * which on a project where it WAS is a confident lie, and it is the sort of
 * lie that stops anyone asking a second question. So a miss degrades to a
 * browse — what this project remembers, reasons first — and says which of
 * the two happened.
 *
 * @returns {{ matches: Array<object>, topics: string[], why: boolean, fellBack: boolean }}
 */
export function recallWithFallback(brain, query, opts = {}) {
  const hit = recall(brain, query, opts)
  if (hit.matches.length) return { ...hit, fellBack: false }
  const browse = recall(brain, '', opts)
  return { ...browse, topics: hit.topics, why: hit.why, fellBack: true }
}

/** One line for a fact — “Body face: Plus Jakarta Sans — because …”. */
export function factLine(f) {
  if (!f) return ''
  const head = f.label && f.value ? `${f.label}: ${f.value}` : f.label || f.value
  return f.why ? `${head} — because ${f.why}` : head
}

/**
 * Questions worth offering as one-tap chips.
 *
 * Only ones this project can actually answer: a chip that returns nothing
 * teaches the designer the feature is broken, and they will not tap a second.
 */
export function suggestedQuestions(brain) {
  const has = (topic) => (brain?.byTopic?.[topic] || []).length > 0
  const out = []
  if (has('direction')) out.push('Why did we choose this direction?')
  if (has('type')) out.push('Why this typeface?')
  if (has('colour')) out.push('Why these colors?')
  if (has('rejected')) out.push('What did the client rule out?')
  if (has('feedback')) out.push('What did the client say?')
  if (has('audience')) out.push('Who is this for?')
  return out.slice(0, 4)
}
