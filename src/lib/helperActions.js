/**
 * What the Helper is allowed to propose, and what it can never touch.
 *
 * The Helper returns words. This module is the only route from those words
 * to your project, and it is deliberately narrow.
 *
 * THE RULE: it proposes, you apply. Nothing here runs from a model reply.
 * Each proposal renders as a button you press, or it does not happen. The
 * failure this exists to prevent is "it changed my brief without asking" —
 * silent state loss is the thing this app is supposed to be the opposite of,
 * and an assistant that edits your work while you read a paragraph is the
 * purest form of it.
 *
 * WHAT IS EXCLUDED, and why it stays excluded:
 *
 * - `updateDetective` / `updateProjectBrief` — these OVERWRITE. The brief is
 *   the client record; a wrong write loses what the client actually said,
 *   and there is no undo for it. A model that misreads "change the goal" as
 *   "replace the goal" costs real work.
 * - Anything destructive — delete, archive, clear. An additive mistake is a
 *   row you remove; a destructive one is a thing you no longer have.
 *
 * Everything permitted below is additive and reversible by hand in one step.
 * Widening this list is a decision to take deliberately: add the action here
 * with its own `describe`, and `helperActions.test.js` will hold the shape.
 */

/** Cap on how many proposals one reply may carry. */
export const MAX_PROPOSALS = 3

const clean = (v) => String(v ?? '').trim()

/**
 * The catalogue.
 *
 * `describe` is what the user reads on the button before pressing it, so it
 * must state the actual effect in their words — never "run add_task".
 */
export const HELPER_ACTIONS = {
  add_task: {
    id: 'add_task',
    /** Shown to the model so it knows what it may offer. */
    hint: 'add_task — add one to-do. args: { title }',
    parse(args) {
      const title = clean(args?.title).slice(0, 120)
      return title ? { title } : null
    },
    describe(args) {
      return `Add to-do: “${args.title}”`
    },
  },

  split_task: {
    id: 'split_task',
    hint: 'split_task — break the current top to-do into three smaller steps. args: {}',
    parse() {
      /* No arguments on purpose. The store picks the top open task itself, so
         the model cannot name the wrong one — it has no ids to get wrong. */
      return {}
    },
    describe() {
      return 'Split the next to-do into three steps'
    },
  },
}

/** The line handed to the model describing what it may propose. */
export function actionCatalogueForPrompt() {
  const lines = Object.values(HELPER_ACTIONS).map((a) => `- ${a.hint}`)
  return [
    'If, and only if, the user is asking you to change something, you may',
    'propose actions by ending your reply with a fenced json block:',
    '```json',
    '{"actions":[{"id":"add_task","args":{"title":"..."}}]}',
    '```',
    'Available actions:',
    ...lines,
    'Propose nothing for a question that only wants an answer. Never claim',
    'you have done something — the user applies proposals themselves.',
  ].join('\n')
}

/**
 * Pull proposals out of a model reply.
 *
 * Returns `{ text, proposals }` — `text` with the json block stripped, so the
 * user never sees the machinery.
 *
 * Unknown ids and malformed args are dropped rather than surfaced: a button
 * that cannot describe itself honestly must not be offered, and a proposal
 * the user cannot evaluate is worse than none.
 */
export function parseProposals(reply) {
  const raw = String(reply ?? '')
  const fence = /```json\s*([\s\S]*?)```/i.exec(raw)
  if (!fence) return { text: raw.trim(), proposals: [] }

  const text = raw.replace(fence[0], '').trim()
  let parsed
  try {
    parsed = JSON.parse(fence[1])
  } catch {
    return { text, proposals: [] }
  }

  const list = Array.isArray(parsed?.actions) ? parsed.actions : []
  const proposals = []
  for (const item of list) {
    const def = HELPER_ACTIONS[clean(item?.id)]
    if (!def) continue
    const args = def.parse(item?.args || {})
    if (!args) continue
    proposals.push({ id: def.id, args, label: def.describe(args) })
    if (proposals.length >= MAX_PROPOSALS) break
  }
  return { text, proposals }
}

/**
 * Apply one proposal.
 *
 * Takes the store actions as an argument rather than importing the store, so
 * this stays a pure decision table and can be tested without a store.
 *
 * @returns {{ ok: boolean, note: string }} `note` is shown to the user after.
 */
export function applyProposal(proposal, deps = {}) {
  const { addTask, breakIntoSteps, nextTaskId, projectId } = deps
  switch (proposal?.id) {
    case 'add_task': {
      if (typeof addTask !== 'function') return { ok: false, note: 'Cannot add to-dos here' }
      addTask({
        id: Date.now(),
        title: proposal.args.title,
        energy: 'med',
        meta: 'From the Helper',
        completed: false,
        seeded: false,
        projectId: projectId ?? null,
        dueDate: '',
        why: '',
      })
      return { ok: true, note: `Added “${proposal.args.title}”` }
    }
    case 'split_task': {
      if (typeof breakIntoSteps !== 'function')
        return { ok: false, note: 'Cannot split to-dos here' }
      if (!nextTaskId) return { ok: false, note: 'No open to-do to split' }
      breakIntoSteps(nextTaskId)
      return { ok: true, note: 'Split into three steps' }
    }
    default:
      return { ok: false, note: 'Unknown action' }
  }
}
