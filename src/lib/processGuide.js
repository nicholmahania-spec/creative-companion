/**
 * Design process modes that change the Work desk (not only Helper chat).
 * clarify → structure → visual → refine
 */

export const PROCESS_PHASES = [
  {
    id: 'clarify',
    label: '1 Clarify',
    short: 'Clarify',
    title: 'Clarify before you decorate',
    prompt: 'Who is this for, what should they feel/do, and what’s the constraint?',
    checks: [
      'Who is this for (one sentence)',
      'What they should feel or do',
      'Hard constraint (time, format, brand, tech)',
      'Step title is a decision or deliverable — not a vibe',
    ],
  },
  {
    id: 'structure',
    label: '2 Structure',
    short: 'Structure',
    title: 'Structure in words',
    prompt: 'List the blocks top to bottom before visual polish.',
    checks: [
      'Top-to-bottom blocks written (header → main → proof → CTA)',
      'One primary action only',
      'Entry → action → success path clear',
      'Step maps to a specific block or screen',
    ],
  },
  {
    id: 'visual',
    label: '3 Visual',
    short: 'Visual',
    title: 'Visual with rules',
    prompt: 'Taste needs constraints: color roles, type, space.',
    checks: [
      '1 accent for actions (not a rainbow)',
      'Display + body type pair chosen',
      'Contrast readable for body text',
      'Whitespace used on purpose (not cluttered)',
    ],
  },
  {
    id: 'refine',
    label: '4 Refine',
    short: 'Refine',
    title: 'Refine with two directions',
    prompt: 'Pick A or B — ship one complete slice.',
    checks: [
      'Two directions named (e.g. calmer vs bolder)',
      'One direction chosen',
      'Contrast + focus order checked',
      'Ready to Complete step or export',
    ],
  },
]

export function getProcessPhase(id) {
  return PROCESS_PHASES.find((p) => p.id === id) || null
}
