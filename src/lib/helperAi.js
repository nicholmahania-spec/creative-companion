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
import { HELPER_ASK_SYSTEM_PROMPT, HELPER_SYSTEM_PROMPT } from './helperPersona'
import { actionCatalogueForPrompt, parseProposals } from './helperActions'
import { supabase } from './supabase'

const DEFAULT_MODEL = 'grok-4.5'

/** @deprecated use HELPER_SYSTEM_PROMPT — kept as local alias for callXaiChat default */
const SYSTEM_PROMPT = HELPER_SYSTEM_PROMPT

/** @returns {string} */
/**
 * Prefer same-origin proxy (no browser key). Client key only for local demos.
 * Proxy: VITE_XAI_USE_PROXY | VITE_XAI_BASE_URL | window.__CC_XAI_BASE__
 * Dev Vite: /api/xai → api.x.ai with XAI_API_KEY on the machine.
 * Netlify + Vercel: /api/xai/chat/completions → serverless proxy.
 * Prod builds with base `/` (not GitHub Pages subpath) default to proxy;
 * set VITE_XAI_USE_PROXY=false to force scripted-only on those hosts.
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
    const flag = String(import.meta.env?.VITE_XAI_USE_PROXY || '')
      .trim()
      .toLowerCase()
    if (flag === 'false' || flag === '0' || flag === 'off') return false
    if (flag === 'true' || flag === '1' || flag === 'on') return true
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
    // Production SPA at site root (Vercel/Netlify) — same-origin /api/xai.
    // GitHub Pages uses base `/creative-companion/` and has no serverless.
    if (import.meta.env?.PROD) {
      const viteBase = String(import.meta.env?.BASE_URL || '/')
      if (viteBase === '/' || viteBase === '') return true
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
      return recommendForTask(a)
    case 'critique':
      return critiqueForTask(a)
    case 'full':
      return coachOnTask(a)
    case 'tip':
      return `${activityTip(a)} · ${recommendForTask(a)}`
    case 'stuck':
      // One line only — Coach is a separate control
      return progressLine('stuck')
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
      return `${designProcessTip('review', a)} · ${twoDirectionsTip(a)}`
    case 'deliver':
      return designProcessTip('deliver', a)
    case 'progress': {
      const bits = [
        describeActivity(a),
        extra.deskLabel,
        extra.breakLabel,
        extra.closedLabel,
        recommendForTask(a),
      ].filter(Boolean)
      return bits.join(' · ')
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
    lines.push(`Process fill: ${activity.pathDoneCount}/5 steps have content`)
  if (activity.nextGapLabel)
    lines.push(`Next process gap: ${activity.nextGapLabel}`)
  if (extra.deskLabel) lines.push(`Desk time: ${extra.deskLabel}`)
  if (extra.breakLabel) lines.push(`Since break: ${extra.breakLabel}`)
  if (extra.closedLabel) lines.push(extra.closedLabel)
  if (extra.userNote) lines.push(`User note: ${extra.userNote}`)

  const jobs = {
    recommend: 'One concrete next move only. ≤2 sentences.',
    critique: 'One main risk only. ≤2 sentences.',
    full: 'One do + one risk. ≤3 sentences total.',
    tip: 'One tip + one move. ≤2 sentences.',
    stuck: 'One action under 10 minutes.',
    define: 'Goal · who · one must. Short.',
    research: 'Pins · why · one decision. Short.',
    ideate: 'Quantity · shortlist. Short.',
    sketch: '2–3 roughs · low detail. Short.',
    design: 'Type · roles · hierarchy. Short.',
    review: 'Specific Q · one fix. Short.',
    deliver: 'PDF · handoff · one learn. Short.',
    clarify: 'Goal · who. Short.',
    structure: 'Structure in words. Short.',
    visual: 'Color roles · type. Short.',
    refine: 'One direction · one fix. Short.',
    progress: 'Status + one move. No XP talk.',
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
  /**
   * Prior turns, oldest first: `[{ role: 'user'|'assistant', content }]`.
   *
   * Without these every message is the model's first: "make it shorter" has
   * nothing to shorten, and "no, the other one" has no other one. That is
   * not a conversation, it is a series of unrelated answers, and it is why
   * the Helper could only ever be driven by canned prompts.
   */
  history = [],
  model = DEFAULT_MODEL,
  temperature = 0.45,
  maxTokens = 160,
  signal,
} = {}) {
  const key = getHelperApiKey()
  if (!key) throw new Error('No API key')
  const base = getHelperApiBase()
  const headers = { 'Content-Type': 'application/json' }
  // Proxy injects Authorization server-side; only send client key for direct api.x.ai
  if (key !== 'proxy') {
    headers.Authorization = `Bearer ${key}`
  } else {
    /* Prove who we are with the Supabase session, not a shared secret.
       This used to send VITE_XAI_PROXY_SECRET in X-CC-Proxy-Key. Vite inlines
       VITE_ values into the shipped bundle, so that secret was public and the
       guard it fed was decorative — anyone who viewed source could bill xAI
       calls to this project. The access token is per-user, short-lived and
       refreshed by the client, and the proxy verifies it against Supabase. */
    try {
      const { data } = (await supabase?.auth.getSession()) || {}
      const token = data?.session?.access_token
      if (token) headers.Authorization = `Bearer ${token}`
    } catch {
      /* No session — the proxy will answer 401 and the Helper degrades to its
         scripted lines, which is the correct outcome rather than a silent
         unauthenticated call. */
    }
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        /* Trimmed to the last 8 turns. The whole thread would grow the
           request without bound — cost and latency rising on every reply,
           on a control whose whole promise is "a result in a few seconds". */
        ...(Array.isArray(history) ? history : [])
          .filter(
            (m) =>
              m &&
              (m.role === 'user' || m.role === 'assistant') &&
              String(m.content || '').trim()
          )
          .slice(-8)
          .map((m) => ({ role: m.role, content: String(m.content).trim() })),
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
 * A free-text question, with the thread so far.
 *
 * The Helper had ~12 canned intents behind buttons and no way to type. You
 * could press "I'm stuck" but not say what you were stuck on, and nothing
 * you pressed was aware of anything you had pressed before — so it could
 * answer, but it could not be asked.
 *
 * Deliberately text-only: it returns words and touches nothing. Letting it
 * add a task or edit a brief needs a permission model, and "it changed my
 * brief without asking" is a worse failure than "it did not help". That is
 * a separate decision, not an implementation detail of this one.
 *
 * Returns the same `{ text, source, error }` shape as `coachWithHelper`, so
 * a scripted fallback stays distinguishable from a real answer.
 *
 * @param {string} question
 * @param {Array<{role:'user'|'assistant',content:string}>} history
 * @param {object} activity
 */
export async function askHelper(question, history = [], activity = {}) {
  const q = String(question || '').trim()
  if (!q) return { text: '', source: 'scripted' }

  if (!isHelperAiConfigured()) {
    return {
      text: "I can't answer questions without a connection — the buttons below still work offline.",
      source: 'scripted',
    }
  }

  try {
    /* The activity line gives the model the same situational context the
       canned intents get, so a bare "what now?" is answerable. */
    const ctx = describeActivity(activity)
    const user = ctx ? `${q}\n\n(Context: ${ctx})` : q
    /* The catalogue rides in the system prompt rather than as provider
       tool-calling: it is testable without a live API, it works the same on
       any OpenAI-compatible endpoint, and — the reason that matters — the
       model returns a *proposal*, never a call. Nothing can execute. */
    const raw = await callXaiChat({
      system: `${HELPER_ASK_SYSTEM_PROMPT}\n\n${actionCatalogueForPrompt()}`,
      user,
      history,
      maxTokens: 320,
    })
    const { text, proposals } = parseProposals(raw)
    return { text, proposals, source: 'ai' }
  } catch (e) {
    return {
      text: activityTip(activity),
      source: 'scripted',
      error: e?.message || 'AI unavailable',
    }
  }
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
