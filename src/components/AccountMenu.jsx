/**
 * Header Account menu — identity + theme + Settings + sign out/lock.
 * Not a second Settings page: only account-shaped shortcuts.
 *
 * WHY THIS IS A MENU AND NOT A DIALOG. It used to carry role="dialog" +
 * aria-modal="true" wrapped around a role="menu" of role="menuitem" buttons,
 * with no keyboard handling at all — no Escape, no arrows. Those two roles
 * promise different things. A dialog promises focus is held inside until you
 * dismiss it; a menu promises Up/Down move between items and Tab leaves. It
 * delivered neither, so a screen-reader user was told "modal dialog" and then
 * handed a control that behaved like loose page content.
 *
 * A menu is what this actually is — a short list of account shortcuts hung off
 * a button — so it now follows the WAI-ARIA APG menu button pattern
 * (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/): arrows to move,
 * Home/End to jump, Escape or Tab to leave, roving tabindex, and focus
 * returned to the trigger on dismissal. Adding a focus trap instead would have
 * been the wrong half of a different pattern.
 */
import { useEffect, useRef } from 'react'
import HeaderIcon from './HeaderIcon'

export default function AccountMenu({
  open,
  onOpen,
  onClose,
  accessName,
  theme,
  toggleTheme,
  onOpenSettings,
  onSignOut,
  cloud,
}) {
  const signLabel = cloud ? 'Sign out' : 'Lock'
  const themeLabel = theme === 'warm' ? 'Switch to dark' : 'Switch to light'

  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  const items = () =>
    Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])

  /* Opening a menu puts focus on its first item (APG). Deferred a frame so the
     items exist to be focused. */
  useEffect(() => {
    if (!open) return undefined
    const raf = window.requestAnimationFrame(() => items()[0]?.focus())
    return () => window.cancelAnimationFrame(raf)
  }, [open])

  /* Dismissal — Escape, Close, backdrop — returns focus to the trigger, so the
     keyboard user lands where they were rather than at the top of the page.
     Activating an item deliberately does NOT restore: Settings and Sign out
     both navigate, and yanking focus back to the header afterwards would undo
     wherever that destination puts it. */
  const dismiss = () => {
    onClose()
    buttonRef.current?.focus()
  }

  const onMenuKeyDown = (e) => {
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
           should still take focus to whatever follows the trigger. */
        onClose()
        break
      default:
        break
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="header-account-pill"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? 'account-menu' : undefined}
        id="account-menu-button"
        onClick={() => (open ? onClose() : onOpen())}
      >
        <HeaderIcon name="account" />
        <span>Account</span>
      </button>

      {open ? (
        <div
          className="export-overlay account-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismiss()
          }}
        >
          <div className="export-panel account-panel">
            <div className="export-panel-header">
              <h3 id="account-menu-title" style={{ margin: 0 }}>
                Account
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Close account menu"
                onClick={dismiss}
              >
                ×
              </button>
            </div>
            {/* Identity sits outside role="menu": the only children a menu may
                own are menuitem, group and separator, so a loose <p> in there
                was invalid and could be dropped or misread by AT. */}
            {accessName ? (
              <p className="account-menu-identity" id="account-menu-identity">
                {accessName}
              </p>
            ) : null}
            <div
              ref={menuRef}
              className="more-menu account-menu"
              role="menu"
              id="account-menu"
              aria-labelledby="account-menu-button"
              onKeyDown={onMenuKeyDown}
            >
              {/* Roving tabindex: the menu is entered by focusing its first
                  item, and moved through with arrows — not Tab. */}
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="more-menu-item"
                onClick={() => {
                  toggleTheme()
                  dismiss()
                }}
              >
                {themeLabel}
              </button>
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="more-menu-item"
                onClick={() => {
                  onOpenSettings()
                  onClose()
                }}
              >
                Settings
              </button>
              <div className="account-menu-sep" role="separator" />
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="more-menu-item"
                onClick={() => {
                  onSignOut()
                  onClose()
                }}
              >
                {signLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
