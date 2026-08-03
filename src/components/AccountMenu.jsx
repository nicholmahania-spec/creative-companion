/**
 * Header Account menu — identity + theme + Settings + sign out/lock.
 * Not a second Settings page: only account-shaped shortcuts.
 */
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

  return (
    <>
      <button
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
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <div
            className="export-panel account-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-menu-title"
          >
            <div className="export-panel-header">
              <h3 id="account-menu-title" style={{ margin: 0 }}>
                Account
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Close account menu"
                onClick={onClose}
              >
                ×
              </button>
            </div>
            <div
              className="more-menu account-menu"
              role="menu"
              id="account-menu"
              aria-labelledby="account-menu-button"
            >
              {accessName ? (
                <p className="account-menu-identity" role="status">
                  {accessName}
                </p>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="more-menu-item"
                onClick={() => {
                  toggleTheme()
                  onClose()
                }}
              >
                {themeLabel}
              </button>
              <button
                type="button"
                role="menuitem"
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
