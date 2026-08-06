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
 * a button — so it now follows the WAI-ARIA APG menu button pattern: arrows to
 * move, Home/End to jump, Escape or Tab to leave, roving tabindex, and focus
 * returned to the trigger on dismissal. Adding a focus trap instead would have
 * been the wrong half of a different pattern. The behaviour itself lives in
 * useMenuKeyboard, shared with the Tools menu.
 */
import { useRef } from 'react'
import { useMenuKeyboard } from '../lib/useMenuKeyboard'
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

  const { onKeyDown, dismiss } = useMenuKeyboard(open, {
    menuRef,
    triggerRef: buttonRef,
    onClose,
  })

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
              onKeyDown={onKeyDown}
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
