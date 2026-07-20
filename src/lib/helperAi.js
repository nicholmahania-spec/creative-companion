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
import { HELPER_SYSTEM_PROMPT } from './helperPersona'

const DEFAULT_MODEL = 'grok-4.5'

/** @deprecated use HELPER_SYSTEM_PROMPT — kept as local alias for callXaiChat default */
const SYSTEM_PROMPT = HELPER_SYSTEM_PROMPT

/** @returns {string} */
/**
 * Prefer same-origin proxy (no browser key). Client key only for local demos.
 * Proxy: VITE_XAI_USE_PROXY=true | VITE_XAI_BASE_URL | window.__CC_XAI_BASE__
 * Dev Vite: /api/xai → api.x.ai with XAI_API_KEY on the machine.
 * Netlify: /api/xai/chat/completions → function with XAI_API_KEY.
 */
export function getHelperApiKey() {
  try {
    if (typeof window !== 'undefined' && window.__CC_XAI_API_KEY__) {
      return String(window.__CC_XAI_API_KEY__).trim()
    }
    // When using proxy, do not require a client key
    if (usesHelperProxy()) return 'proxy'
    const vite = String(import.meta.env?.VITE_XAI_API_KEY || '').trim()
    if (vite) return vite
  } catch {
    /* non-vite */
  }
  return ''
}

export function usesHelperProxy() {
  try {
    if (typeof window !== 'undefined' && window.__CC_XAI_BASE__) return true
    if (String(import.meta.env?.VITE_XAI_USE_PROXY || '').trim() === 'true') {
      return true
    }
    const base = String(import.meta.env?.VITE_XAI_BASE_URL || '').trim()
    if (base) return true
    // Dev only: try Vite /api/xai proxy when no browser key (see docs/DEPLOY_AI.md)
    if (
      import.meta.env?.DEV &&
      typeof window !== 'undefined' &&
      !import.meta.env?.VITE_XAI_API_KEY
    ) {
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

/** OpenAI-compatible base URL (…/v1 style for direct; /api/xai for proxy) */
export function getHelperApiBase() {
  try {
    if (typeof window !== 'undefined' && window.__CC_XAI_BASE__) {
      return String(window.__CC_XAI_BASE__).replace(/\/$/, '')
    }
    const vite = String(import.meta.env?.VITE_XAI_BASE_URL || '').trim()
    if (vite) return vite.replace(/\/$/, '')
    if (usesHelperProxy()) return '/api/xai'
  } catch {
    /* ignore */
  }
  return 'https://api.x.ai/v1'
}

/**
 * Honest mode for UI: Live only when a real path is configured.
 * GH Pages without proxy → scripted (no failed network spam).
 */
export function helperAiStatus() {
  try {
    const k = getHelperApiKey()
    const hasDirectKey = Boolean(k && k !== 'proxy')
    if (hasDirectKey) {
      return {
        mode: 'live',
        label: 'Live AI',
        short: 'Live',
        detail: 'Replies use the configured model; falls back if offline.',
      }
    }
    if (usesHelperProxy()) {
      return {
        mode: 'live',
        label: 'Live AI',
        short: 'Live',
        detail: 'Via same-origin proxy when available; scripted fallback if it fails.',
      }
    }
  } catch {
    /* ignore */
  }
  return {
    mode: 'scripted',
    label: 'Scripted desk coach',
    short: 'Scripted',
    detail: 'Local craft tips on this host — no live model configured.',
  }
}

export function isHelperAiConfigured() {
  return helperAiStatus().mode === 'live'
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
    case 'define':
    case 'clarify':
      return designProcessTip('define', a)
    case 'research':
      return designProcessTip('research', a)
    case 'ideate':
      return designProcessTip('ideate', a)
    case 'sketch':
    case 'structure':
      return designProcessTip('sketch', a)
    case 'design':
    case 'visual':
      return designProcessTip('design', a)
    case 'review':
    case 'refine':
      return `${designProcessTip('review', a)} ${twoDirectionsTip(a)}`
    case 'deliver':
      return designProcessTip('deliver', a)
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
  if (activity.goal) lines.push(`Goal (detective): ${String(activity.goal).slice(0, 120)}`)
  if (activity.audience)
    lines.push(`Audience: ${String(activity.audience).slice(0, 80)}`)
  if (activity.pathDoneCount != null)
    lines.push(`Process fill: ${activity.pathDoneCount}/7 steps have content`)
  if (activity.nextGapLabel)
    lines.push(`Next process gap: ${activity.nextGapLabel}`)
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
    define: 'Coach Define: audience, goal in one sentence, must-haves.',
    research: 'Coach Research: refs, mood, timed discovery.',
    ideate: 'Coach Ideate: many directions, shortlist A/B/C, no judging yet.',
    sketch: 'Coach Sketch: 2–3 rough drafts, low detail.',
    design: 'Coach Design: type, color roles, hierarchy, space.',
    review: 'Coach Review: specific feedback questions, revise for the goal.',
    deliver: 'Coach Deliver: files, handoff, one-line evaluation.',
    clarify: 'Coach Define: audience, goal, constraint.',
    structure: 'Coach Sketch: structure in words before polish.',
    visual: 'Coach Design: color roles, type, space.',
    refine: 'Coach Review: pick direction, fix from feedback.',
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
  const base = getHelperApiBase()
  const headers = { 'Content-Type': 'application/json' }
  // Proxy injects Authorization server-side; only send client key for direct api.x.ai
  if (key !== 'proxy') {
    headers.Authorization = `Bearer ${key}`
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
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
