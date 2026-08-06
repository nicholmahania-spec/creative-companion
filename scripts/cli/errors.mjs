/**
 * The difference between "you typed something I don't understand" and "I broke".
 *
 * A UserError prints as a sentence and nothing else. Everything else keeps its
 * stack — this tool writes files a client receives, so a silently swallowed
 * failure is the expensive kind.
 */
export class UserError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UserError'
    this.userFacing = true
  }
}
