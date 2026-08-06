import { useCallback, useLayoutEffect } from 'react'

/**
 * Keyboard behaviour for a WAI-ARIA APG menu button
 * (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/).
 *
 * WHY THIS EXISTS RATHER THAN A FOCUS TRAP. Both menus in this app used to
 * carry role="dialog" + aria-modal="true" wrapped around a role="menu" of
 * role="menuitem" buttons, with no key handling at all. Those two roles
 * promise different things — a dialog holds focus until dismissed, a menu
 * moves by arrows and leaves on Tab — and neither was delivered. Reaching for
 * the modal focus trap would have been the wrong half of the wrong pattern: a
 * menu that captures Tab and still ignores arrows is worse than one that
 * simply behaves like loose content.
 *
 * Menu items are found by query rather than registration, so a caller can add
 * or reorder items — or wrap them in role="group" — without re-wiring this.
 *
 * @param {boolean} open
 * @param {{
 *   menuRef: import('react').RefObject<HTMLElement>,
 *   triggerRef: import('react').RefObject<HTMLElement>,
 *   onClose: () => void,
 * }} opts
 * @returns {{ onKeyDown: (e: KeyboardEvent) => void, dismiss: () => void }}
 */
export function useMenuKeyboard(open, { menuRef, triggerRef, onClose }) {
  const items = useCallback(
    () =>
      Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || []),
    [menuRef]
  )

  /* Opening a menu puts focus on its first item (APG).

     Synchronously, in a layout effect, NOT in a requestAnimationFrame. The
     menu and its ref are committed before layout effects run, so the items are
     already there to focus — and deferring a frame opened a real gap: a key
     pressed inside it found document.activeElement outside the item list, so
     indexOf returned -1 and ArrowDown resolved to (-1 + 1) = the first item
     instead of the second. Fast keyboard users and tests both hit it, rarely
     and unreproducibly, which is the worst way for a bug to present. */
  useLayoutEffect(() => {
    if (!open) return
    items()[0]?.focus()
  }, [open, items])

  /* Dismissal — Escape, Close, backdrop — returns focus to the trigger, so a
     keyboard user lands where they were rather than at the top of the page.
     Activating an item deliberately does NOT restore: most of these navigate,
     and yanking focus back to the trigger afterwards would undo wherever the
     destination puts it. */
  const dismiss = useCallback(() => {
    onClose()
    triggerRef.current?.focus()
  }, [onClose, triggerRef])

  const onKeyDown = useCallback(
    (e) => {
      const list = items()
      if (!list.length) return
      const at = list.indexOf(document.activeElement)

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          list[(at + 1) % list.length]?.focus()
          break
        case 'ArrowUp':
          e.preventDefault()
          list[(at - 1 + list.length) % list.length]?.focus()
          break
        case 'Home':
          e.preventDefault()
          list[0]?.focus()
          break
        case 'End':
          e.preventDefault()
          list[list.length - 1]?.focus()
          break
        case 'Escape':
          e.preventDefault()
          dismiss()
          break
        case 'Tab':
          /* APG: Tab closes the menu and moves on. Not prevented — the browser
             should still carry focus to whatever follows the trigger. */
          onClose()
          break
        default:
          break
      }
    },
    [items, dismiss, onClose]
  )

  return { onKeyDown, dismiss }
}
