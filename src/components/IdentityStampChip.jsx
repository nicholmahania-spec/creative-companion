/**
 * Identity version stamp — always-visible, read-only, words only.
 *
 * Answers "is there identity work I haven't saved a version of?" without
 * making the user reconstruct it from memory of what they edited. That
 * reconstruction is the working-memory cost this exists to remove, and it is
 * also a task-initiation blocker: you cannot decide whether to save a version
 * until you have done it, so the save does not happen.
 *
 * Renders no version number and no time. The stored `identityEditedAt` /
 * `identitySavedAt` are real ISO strings, but the owner has stated they have
 * no concept of time and numbers do not register, so a "v4" or a "3 days ago"
 * is a value that has to be translated before it means anything.
 *
 * Silent until there is genuinely something to report — a chip that always
 * shows a state is a scoreboard, same reasoning as the client-state chip.
 */
import { identityStamp } from '../lib/identityStamp'

export default function IdentityStampChip({ project }) {
  if (!project) return null
  const { state, label } = identityStamp(project)
  if (state === 'none') return null

  return (
    <p
      className={`identity-stamp-chip is-${state}`}
      role="status"
      aria-live="polite"
    >
      {label}
    </p>
  )
}
