/**
 * AppHeader — layout chrome extracted from App.jsx (memoized).
 * Receives a props bag `p` from App so the shell can split re-renders.
 */
import { memo, Suspense, lazy } from 'react'

import LogoLockup from '../LogoLockup'
import HeaderIcon from '../HeaderIcon'
import { ClientInboxChip } from '../ClientInbox'
import { JOURNEY_STEPS } from '../../lib/journey'
import { pathLabel } from '../../lib/i18n'
import { pathStepHasContent } from '../../lib/journeyProgress'


function AppHeader(p) {
  return (
    <header className="header header-redesign">
      <div className="header-content header-content-simple">
        <button
          type="button"
          className="header-menu-toggle"
          aria-label={p.navOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={p.navOpen}
          onClick={() => p.setNavOpen((v) => !v)}
        >
          <span aria-hidden="true">{p.navOpen ? '✕' : '☰'}</span>
        </button>
        <button
          type="button"
          className="brand-block brand-block-link"
          onClick={() => p.setActiveView('home')}
          aria-label="Home"
          title="Home"
        >
          <LogoLockup className="logo" locale={p.locale} reduceMotion={p.reduceMotion} />
        </button>
        {p.activeProject ? (
          <input
            className="header-mobile-title header-name-input"
            value={p.projectNameDraft}
            onChange={(e) => p.setProjectNameDraft(target.value)}
            onBlur={p.commitHeaderProjectRename}
            onKeyDown={(e) => {
              if (key === 'Enter') {
                e.preventDefault()
                p.commitHeaderProjectRename()
                e.currentTarget.blur()
              }
            }}
            aria-label="Project name"
          />
        ) : (
          <span className="header-mobile-title" aria-hidden="true">
            Creative Companion
          </span>
        )}
        <div className="header-actions">
          {/* Labelled, not a 5th identical glyph. This is the highest-
              frequency control in the app; as an icon among icons it would
              cost a five-way scan on every open, resolved only by hovering
              for a tooltip. The count is ambient evidence the list has
              something in it — otherwise the list doesn't exist between
              opens and re-checking it depends on remembering to. No badge
              at zero: a "0" reads as a scoreboard of nothing done. */}
          <button
            type="button"
            className="header-todo-pill"
            onClick={() => p.setRunningTodoPanelOpen(true)}
            aria-label={
              p.openTodoCount
                ? `To-do list, ${p.openTodoCount} open`
                : 'To-do list, nothing open'
            }
          >
            <HeaderIcon name="list" />
            <span>To-do</span>
            {p.openTodoCount > 0 && (
              <span className="header-todo-count" aria-hidden="true">
                {p.openTodoCount}
              </span>
            )}
          </button>
          {/* Same chip, same place, on every screen — whether or not this
              project has a client link yet. One p.target to learn, and the
              only entry point to client activity. */}
          <ClientInboxChip
            hasUnread={p.clientInbox.hasUnread}
            onOpen={() => p.setClientInboxOpen(true)}
          />
          {p.activeProject && (
            <input
              className="header-name-input header-name-input-desktop"
              value={p.projectNameDraft}
              onChange={(e) => p.setProjectNameDraft(target.value)}
              onBlur={p.commitHeaderProjectRename}
              onKeyDown={(e) => {
                if (key === 'Enter') {
                  e.preventDefault()
                  p.commitHeaderProjectRename()
                  e.currentTarget.blur()
                }
              }}
              aria-label="Project name"
            />
          )}
          {/* No project <select> here: it duplicated the rename input's text
              ("Test Project" twice, a which-one-do-I-use fork) while hiding
              every other project behind a dropdown. The sidebar list is the
              switcher — always visible, one click, with progress counts. */}
          {(workRunning || p.isFocusRunning || (CLOUD && p.syncState === 'error')) && (
          <div className="header-status-slot">
          {p.workRunning && (
            <button
              type="button"
              className="work-clock-chip"
              /* Opens the clock's OWN record. This opened the Timer view,
                 which undid the separation at the last step: you clicked a
                 readout of hours already worked and landed on a countdown,
                 which reads as the clock having started something. */
              onClick={() => p.setWorkLogPanelOpen(true)}
              title="Clocked work time — runs by itself while you work"
            >
              {/* The CLOCK: hours at work, kept automatically. Counts up,
                  in minutes not mm:ss — a seconds digit changing every
                  second is motion in the corner of the eye all day, and it
                  is finer than any decision it informs. No icon: this is
                  not a control, it is a readout. */}
              Working · {p.sessionLabel}
            </button>
          )}
          {/* The TIMER: separate chip, separate job, and only here because
              you switched it on. The clock records; the timer is the thing
              you reach for when time blindness needs help. They were one
              control, which made choosing the timer indistinguishable from
              simply being at work — and made stopping the timer look like
              clocking off. ⏱ marks it as the chosen tool. */}
          {p.isFocusRunning && (
            <button
              type="button"
              className="focus-timer-chip"
              onClick={() => p.setActiveView('insights')}
              title="Focus timer you started — separate from clocked hours"
            >
              ⏱ {focusMinutes}:{String(focusSeconds).padStart(2, '0')}
            </button>
          )}
          {CLOUD && p.syncState === 'error' && (
            <button
              type="button"
              className="sync-error-chip"
              title={p.syncError || 'Cloud save failed'}
              onClick={async () => {
                p.setSyncState('syncing')
                p.setSyncError('')
                try {
                  // A failed *pull* (resume) must retry the pull, not push
                  // local over the cloud copy it never actually loaded.
                  if (syncErrorSource === 'pull') {
                    const result = await pullWorkspace()
                    if (!result.ok) {
                      p.setSyncState('error')
                      p.setSyncError(result.error || 'Couldn’t load cloud desk')
                      p.flashToast(result.error || i18nT(p.locale, 'ui.syncFail'))
                      return
                    }
                    if (result.payload && Array.isArray(result.payload.projects)) {
                      p.skipNextCloudPush.current = true
                      const hydrated = p.hydrateFromPayload(result.payload)
                      if (hydrated.ok) {
                        p.setSyncState('ok')
                        p.flashToast(i18nT(p.locale, 'ui.syncedOk'))
                      } else {
                        p.skipNextCloudPush.current = false
                        p.setSyncState('error')
                        p.setSyncError(hydrated.error || 'Couldn’t load cloud desk')
                        p.flashToast(hydrated.error || i18nT(p.locale, 'ui.syncFail'))
                      }
                    } else {
                      p.setSyncState('ok')
                      p.flashToast(i18nT(p.locale, 'ui.syncedOk'))
                    }
                    return
                  }
                  const result = await pushWorkspace(exportAllData())
                  if (result.ok) {
                    p.setSyncState('ok')
                    p.setSyncError('')
                    p.applyImageUrlReplacements(result.replacements)
                    p.flashToast(i18nT(p.locale, 'ui.syncedOk'))
                  } else {
                    p.setSyncState('error')
                    p.setSyncError(result.error || 'Couldn’t sync')
                    p.flashToast(result.error || i18nT(p.locale, 'ui.syncFail'))
                  }
                } catch (e) {
                  p.setSyncState('error')
                  p.setSyncError(e?.message || 'Couldn’t sync')
                  p.flashToast(e?.message || i18nT(p.locale, 'ui.syncFail'))
                }
              }}
            >
              <span className="sync-error-chip-full">
                {p.syncErrorSource === 'pull' ? 'Retry load' : 'Retry save'}
              </span>
              <span className="sync-error-chip-short">Retry</span>
            </button>
          )}
          </div>
          )}

          <button
            type="button"
            className="header-icon-btn"
            onClick={() => p.setActiveView('calendar')}
            title="Calendar"
            aria-label="Calendar"
          >
            <HeaderIcon name="calendar" />
          </button>

          <button
            type="button"
            className="header-icon-btn"
            onClick={() => p.setActiveView('clients')}
            title="Clients"
            aria-label="Clients"
          >
            <HeaderIcon name="people" />
          </button>

          {/* Print moved into the Tools menu. It's genuinely low-frequency,
              and the header was about to gain a wider control — leaving the
              icon row to grow is how the to-do button ended up colliding
              with page content in the first place. */}

          <div className="more-wrap" ref={p.moreWrapRef}>
            <button
              type="button"
              className="header-tools-btn"
              aria-expanded={p.moreOpen}
              aria-haspopup="menu"
              // Set only while the menu exists: it is conditionally
              // rendered below, so a static aria-controls pointed at a
              // missing id whenever the menu was closed.
              aria-controls={p.moreOpen ? 'tools-menu' : undefined}
              id="tools-menu-button"
              onClick={() => p.setMoreOpen(!p.moreOpen)}
            >
              <HeaderIcon name="tools" />
              {/* Labelled in text, not icon-only. This menu is now the home
                  for Settings and Log out, and people are conditioned to
                  hunt for an avatar for those — a bare glyph makes finding
                  them a recall problem instead of a read. */}
              <span>{i18nT(p.locale, 'ui.tools')}</span>
            </button>
            {p.moreOpen && (
              <div className="more-menu" role="menu" id="tools-menu" aria-labelledby="tools-menu-button">
                <p className="more-menu-group-label">Go to</p>
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item"
                  onClick={() => {
                    p.setActiveView('insights')
                    p.setMoreOpen(false)
                  }}
                >
                  <HeaderIcon name="timer" /> {i18nT(p.locale, 'ui.timer')}
                </button>
                <p className="more-menu-group-label">This project</p>
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item"
                  onClick={() => {
                    p.openExportPanel()
                    p.setMoreOpen(false)
                  }}
                >
                  <span aria-hidden="true">⬇</span> Export
                </button>
                {/* The to-do list now has one door: the labelled pill in the
                    header. Two live triggers means two things to check and
                    an ambiguous "are these the same list?". */}
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item"
                  onClick={() => {
                    p.setMoreOpen(false)
                    const r = printCurrentPage()
                    if (!r.ok) p.flashToast(error || 'Print failed')
                  }}
                >
                  <HeaderIcon name="print" /> Print / Save as PDF
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item"
                  onClick={() => {
                    p.setHoursPanelOpen(true)
                    p.setMoreOpen(false)
                  }}
                >
                  <span aria-hidden="true">$</span> Hours &amp; invoice
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item"
                  onClick={() => {
                    p.setDiscoveryPanelOpen(true)
                    p.setMoreOpen(false)
                  }}
                >
                  <span aria-hidden="true">?</span> Discovery brief
                </button>
                {/* Archive/Delete moved here from the sidebar's hover-only
                    "⋯", which was invisible on touch and at a glance —
                    destructive actions need one learnable home. */}
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item"
                  onClick={() => {
                    p.handleArchiveProject()
                    p.setMoreOpen(false)
                  }}
                >
                  <span aria-hidden="true">□</span> Archive project
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item is-danger"
                  onClick={() => {
                    p.handleDeleteProject()
                    p.setMoreOpen(false)
                  }}
                >
                  <span aria-hidden="true">×</span> Delete project
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item"
                  onClick={() => {
                    p.setOverviewSharePanelOpen(true)
                    p.setMoreOpen(false)
                  }}
                >
                  <span aria-hidden="true">↗</span> Share project overview
                </button>
                {/* "Account", not "App" — that's the word you go looking
                    for when you want Settings or Log out. */}
                <p className="more-menu-group-label">Account</p>
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item"
                  onClick={() => {
                    p.setActiveView('settings')
                    p.setMoreOpen(false)
                  }}
                >
                  <span aria-hidden="true">⚙</span> {i18nT(p.locale, 'ui.settings')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item"
                  onClick={() => {
                    p.setMoreOpen(false)
                    p.setShortcutsOpen(true)
                  }}
                >
                  <span aria-hidden="true">⌨</span> Keyboard shortcuts
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item"
                  onClick={() => {
                    p.toggleTheme()
                    p.setMoreOpen(false)
                  }}
                >
                  <span aria-hidden="true">◐</span>{' '}
                  {p.theme === 'warm' ? 'Switch to dark' : 'Switch to light'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="more-menu-item more-menu-danger"
                  onClick={() => {
                    p.setMoreOpen(false)
                    handleSignOut()
                  }}
                >
                  <span aria-hidden="true">→</span>{' '}
                  {CLOUD ? 'Log out' : 'Log out / lock'}
                </button>
              </div>
            )}
          </div>

          {/* Absence of an error is not the same reassurance as "saved" —
              you can't tell "no error" from "nothing is happening". Not a
              button: it answers the question at a glance and costs no
              decision. Errors keep their own retry chip above. */}
          {CLOUD && p.syncState !== 'error' && (
            <span className="header-saved" aria-live="polite">
              <span className="header-saved-dot" aria-hidden="true" />
              {p.syncState === 'syncing' ? 'Saving…' : 'Saved'}
            </span>
          )}

        </div>
      </div>
    </header>
  )
}

export default memo(AppHeader)
