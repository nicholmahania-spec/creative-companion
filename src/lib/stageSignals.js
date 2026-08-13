/**
 * The two facts a stop may show from outside itself.
 *
 * WHY A CONTEXT AND NOT PROPS. A stage is a portal rendered from inside a
 * view, so getting a value to it by prop means threading it through
 * App → MainOutlet → the view → Workroom, once per stop. That is six copies
 * of one wire, and it is the exact shape of the dead 59-prop chain this pass
 * removed from SketchView. React context crosses portals, so the stage can
 * read what the shell already knows without anyone in between carrying it.
 *
 * WHY ONLY TWO. The stage hides the shell on purpose — `#root` is `inert` and
 * `visibility: hidden` while a stop owns the viewport, so the header, the nav
 * and every panel behind them are gone. That is the point of an immersive
 * workspace and is not being undone here. But two of the things it hides are
 * the ones whose whole value is being noticed while you are busy:
 *
 *   unread client activity — someone is waiting on you
 *   open to-dos           — you left yourself something
 *
 * Everything else the header carries can wait for the exit.
 *
 * READ-ONLY, DELIBERATELY. These are numbers, not buttons. The panels they
 * would open live inside `#root`, which is inert while the stage is up, so a
 * control here would open something the designer could not then use — worse
 * than not offering it. Noticing is the job; acting is one Escape away.
 */
import { createContext, useContext } from 'react'

/** @type {import('react').Context<{unreadClient?: boolean, todoCount?: number}|null>} */
export const StageSignalsContext = createContext(null)

/**
 * Signals for the stage edge, or null when nothing is providing them (tests,
 * storybook-style renders, any mount outside the shell). Every reader must
 * treat null as "say nothing" rather than as zero — an absent provider is not
 * the same fact as an empty inbox.
 */
export function useStageSignals() {
  return useContext(StageSignalsContext)
}

/**
 * What the edge should say, as plain lines, or [] for "say nothing".
 *
 * Pure on purpose. The component around it is three lines of JSX; this is
 * where the rules that can actually be got wrong live, so they can be tested
 * in node without a DOM:
 *
 *   · no provider is not the same fact as an empty inbox — both say nothing,
 *     but only one of them could ever have said something;
 *   · zero is never printed. "To-do · 0" is a scoreboard of nothing, the read
 *     `openTodoCount` already refuses on the header pill;
 *   · the client comes first, because it is the one with someone waiting at
 *     the other end of it.
 *
 * @param {{unreadClient?: boolean, todoCount?: number}|null|undefined} signals
 * @returns {string[]}
 */
export function stageSignalLines(signals) {
  if (!signals || typeof signals !== 'object') return []
  const lines = []
  if (signals.unreadClient) lines.push('Client · unread')
  const n = Number(signals.todoCount) || 0
  if (n > 0) lines.push(`To-do · ${n}`)
  return lines
}
