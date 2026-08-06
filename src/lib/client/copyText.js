/**
 * Clipboard writes fail silently in non-secure contexts and on permission
 * denial. Reporting "copied" when nothing was copied is worse than saying
 * nothing — the user pastes stale content into a client email.
 *
 * Shared rather than redeclared: two surfaces now hand a client link to the
 * clipboard, and a second private copy of this is how one of them ends up
 * without the guard.
 */
export async function copyText(text) {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default copyText
