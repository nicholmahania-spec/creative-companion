/**
 * Live Helper coaching via SpaceXAI / xAI (OpenAI-compatible).
 * Falls back to scripted buddy.js replies when no key, offline, or API errors.
 *
 * SPA note: VITE_XAI_API_KEY is bundled into the client. Prefer a server proxy
 * for production secrets. For local/demo, set VITE_XAI_API_KEY in .env.local.
 *
 * Env (browser): import.meta.env.VITE_XAI_API_KEY
 * Server-style alias (if ever used): XAI_API_KEY
 */

import {
  classifyTask,
  coachOnTask,
  critiqueForTask,
  describeActivity,
  designProcessTip,
  progressLine,
  recommendForTask,
  activityTip,
  twoDirectionsTip,
} from './buddy'

const XAI_BASE = 'https://api.x.ai/v1'
const DEFAULT_MODEL = 'grok-4.5'

const SYSTEM_PROMPT = `You are Helper, the design buddy inside Creative Companion — a desk for ADHD-friendly UI/UX and brand work.

Voice: warm, slightly sassy, concise. Max ~120 words. No markdown headings. Prefer short paragraphs or 2–4 bullets with plain dashes.

Process spine: clarify → structure → visual → refine.
Product promise: one shippable step at a time, then brand pack export — not XP or productivity theatre.

Coach craft (hierarchy, type, color roles, contrast, copy clarity, scope). Never invent fake client names or fake project data. If context is thin, ask one sharp question and give one safe next move.

You are not a general chatbot. Stay on the design desk.`

/** @returns {string} */
export function getHelperApiKey() {
  try {
    const vite = String(import.meta.env?.VITE_XAI_API_KEY || '').trim()
    if (vite) return vite
  } catch {
    /* non-vite */
  }
  return ''
}

export function isHelperAiConfigured() {
  return Boolean(getHelperApiKey())
}

/**
 * Scripted fallback for a coach intent (always available offline).
 * @param {'recommend'|'critique'|'full'|'tip'|'stuck'|'clarify'|'structure'|'visual'|'refine'|'progress'} intent
 * @param {object} activity
 * @param {object} [extra]
 */
export function scriptedCoachReply(intent, activity = {}, extra = {}) {
  const a = activity || {}
  switch (intent) {
    case 'recommend':
      return `${describeActivity(a)} ${recommendForTask(a)}`
    case 'critique':
      return `${describeActivity(a)} ${critiqueForTask(a)}`
    case 'full':
      return `${describeActivity(a)} ${coachOnTask(a)}`
    case 'tip':
      return `${describeActivity(a)} ${activityTip(a)} ${recommendForTask(a)}`
    case 'stuck':
      return `${progressLine('stuck')} ${
        a.nextTaskTitle
          ? `Current step: "${String(a.nextTaskTitle).slice(0, 40)}".`
          : ''
      } ${recommendForTask(a)}`.trim()
    case 'clarify':
      return designProcessTip('clarify', a)
    case 'structure':
      return designProcessTip('structure', a)
    case 'visual':
      return designProcessTip('visual', a)
    case 'refine':
      return `${designProcessTip('refine', a)} ${twoDirectionsTip(a)}`
    case 'progress': {
      const desk = extra.deskLabel || ''
      const br = extra.breakLabel || ''
      const closed = extra.closedLabel || ''
      return [
        describeActivity(a),
        desk,
        br,
        closed,
        activityTip(a),
        recommendForTask(a),
      ]
        .filter(Boolean)
        .join(' ')
    }
    default:
      return activityTip(a)
  }
}

function intentUserPrompt(intent, activity = {}, extra = {}) {
  const domain = classifyTask(activity)
  const lines = [
    `Intent: ${intent}`,
    `Screen: ${activity.view || 'flow'}`,
    `Project: ${activity.projectName || '(none)'}`,
    `Current step: ${activity.nextTaskTitle || '(none open)'}`,
    `Energy: ${activity.nextTaskEnergy || 'med'}`,
    `Domain guess: ${domain}`,
    `Queue open: ${activity.queueCount ?? 0}`,
    `Steps done (session-ish): ${activity.doneCount ?? 0}`,
    `Mood pins: ${activity.pinsCount ?? 0}`,
    `Focus timer: ${activity.isFocusRunning ? 'running' : 'off'}`,
  ]
  if (extra.deskLabel) lines.push(`Desk time: ${extra.deskLabel}`)
  if (extra.breakLabel) lines.push(`Since break: ${extra.breakLabel}`)
  if (extra.closedLabel) lines.push(extra.closedLabel)
  if (extra.userNote) lines.push(`User note: ${extra.userNote}`)

  const jobs = {
    recommend: 'Give concrete next design moves for this step only.',
    critique: 'Critique risks and hierarchy failures for this task — protect quality without expanding scope.',
    full: 'Short recommend + critique for the current task.',
    tip: 'One sharp craft tip plus the single best next move.',
    stuck: 'Unstick them: one tiny action they can finish in under 10 minutes.',
    clarify: 'Coach the clarify phase: audience, outcome, constraint.',
    structure: 'Coach structure: blocks, primary action, path in words.',
    visual: 'Coach visual system: color roles, type pair, space.',
    refine: 'Coach refine: two directions, pick one, ship a slice.',
    progress: 'Honest status check + one next move. Do not lead with XP.',
  }
  lines.push(jobs[intent] || jobs.tip)
  return lines.join('\n')
}

/**
 * Call xAI chat completions. Throws on network/API failure.
 * @returns {Promise<string>}
 */
export async function callXaiChat({
  system = SYSTEM_PROMPT,
  user,
  model = DEFAULT_MODEL,
  temperature = 0.55,
  maxTokens = 320,
  signal,
} = {}) {
  const key = getHelperApiKey()
  if (!key) throw new Error('No API key')

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`xAI ${res.status}: ${errText.slice(0, 180) || res.statusText}`)
  }

  const data = await res.json()
  const text =
    data?.choices?.[0]?.message?.content ||
    data?.output_text ||
    data?.choices?.[0]?.text ||
    ''
  const cleaned = String(text).trim()
  if (!cleaned) throw new Error('Empty AI response')
  return cleaned
}

/**
 * Coach with live AI when configured; otherwise scripted.
 * Never throws — always returns a usable string.
 *
 * @returns {Promise<{ text: string, source: 'ai'|'scripted', error?: string }>}
 */
export async function coachWithHelper(intent, activity = {}, extra = {}) {
  const fallback = scriptedCoachReply(intent, activity, extra)

  if (!isHelperAiConfigured()) {
    return { text: fallback, source: 'scripted' }
  }

  try {
    const user = intentUserPrompt(intent, activity, extra)
    const text = await callXaiChat({ user })
    return { text, source: 'ai' }
  } catch (e) {
    return {
      text: fallback,
      source: 'scripted',
      error: e?.message || 'AI unavailable',
    }
  }
}
