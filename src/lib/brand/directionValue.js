/**
 * When a direction-sheet line counts as answered.
 *
 * Pulled out of the component so the rule is testable in this repo's node
 * test environment — there is no React render-test setup here (149 test
 * files, all node), and adding jsdom plus testing-library to assert one CSS
 * class would be a new testing paradigm bought for a single class name.
 *
 * An `isArrival(prev, next)` companion lived here briefly, for animating the
 * empty -> filled moment. It is gone: the artboard never renders beside the
 * fields that feed it, so that moment is never watched. Speculative code kept
 * for a screen that does not exist is the thing this codebase's comments keep
 * warning about.
 */

/**
 * An answer, or not. Whitespace is not an answer — a stray space typed into
 * an empty field must not read as a decision having been made.
 */
export function hasAnswer(value) {
  return String(value ?? '').trim().length > 0
}
