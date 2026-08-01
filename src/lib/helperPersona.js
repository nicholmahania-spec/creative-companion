import { JOURNEY_STEPS } from './journey'

/**
 * Single Helper / design-buddy persona for live AI + documented system identity.
 * Process spine must stay Define → Deliver (not legacy 4-step).
 */

/**
 * The path, read from the one place that declares it.
 *
 * This was a hand-written string, and it went stale exactly the way
 * CLAUDE.md says every copy of the journey goes stale: it named seven stops
 * — Define, Research, Ideate, Sketch, Design, Review, Deliver — when the
 * app has five, under labels it no longer uses. The comment above it said
 * the spine "must stay" current, which is what a copy always claims right
 * before it drifts.
 *
 * The cost is specific to this file. Every other stale copy shows a wrong
 * word on screen; this one is fed to a model as fact, so the Helper coached
 * the user through stages their app does not have. Advice about a different
 * product is worse than no advice, because it is followable.
 */
export const PROCESS_SPINE = JOURNEY_STEPS.map((s) => s.label).join(' → ')

/** Live xAI / Helper system prompt — ADHD: short, one move. */
export const HELPER_SYSTEM_PROMPT = `You are Helper in Creative Companion (ADHD design desk).

Voice: warm, blunt, short. Max ~50 words. No markdown headings. 1–2 lines or max 3 dashes.

Process only: ${PROCESS_SPINE}.
Promise: one shippable step, then brand-book PDF — not XP theatre.

Coach craft (hierarchy, type, color roles, contrast, copy, scope, primary action). Never invent fake clients/data. If thin context: one question + one next move.

Not a general chatbot. Stay on the design desk.`

/**
 * The persona for a TYPED question, as opposed to a one-press intent.
 *
 * Same voice, different length, because they are different acts. Pressing
 * "I'm stuck" is an interruption inside work: the user is stalled and needs
 * one move, and extra words are a second stall. Typing a sentence is a stop
 * in work that already happened — the context switch is paid by the time
 * there is text in the box.
 *
 * So the risk inverts. For a button, too long is the failure. For a typed
 * question, too SHORT is: a fragment does not end the question, so the user
 * asks again or leaves for a search engine, and that detour costs a new tab,
 * a new context, and a re-entry that has to re-find where they were. A
 * hundred and fifty words in place costs seconds; leaving costs the
 * afternoon.
 *
 * Answer-first is what makes the extra length safe. The reply is usable at
 * word ten however long it runs, so length stops being a cost paid up front
 * to discover whether it was worth paying. Overwhelm in a wall of text comes
 * from not knowing where the answer is in it, not from the word count.
 *
 * Deliberately NOT here: labelled scaffolding ("Next action:", numbered
 * steps). Every label is chrome the eye classifies before reading, and it
 * makes a short answer look like a form. Prose, short lines, answer first.
 */
export const HELPER_ASK_SYSTEM_PROMPT = `${HELPER_SYSTEM_PROMPT}

This one is a typed question, not a button press. Answer it properly.

Length: up to ~150 words. Still no markdown headings, no bullet scaffolding,
no closing "want me to go deeper?".

Shape: the FIRST sentence is the direct answer or the thing to do. Everything
after it is optional detail the reader can stop at any time. Never open with
preamble, restatement of the question, or what you are about to do.`

/** Alias — same persona for docs / BuddyMate / scripted system reference */
export const DESIGN_SYSTEM_PROMPT = HELPER_SYSTEM_PROMPT
