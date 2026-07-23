import { useState } from 'react'

/** Deadlines — month grid + project due. ADHD: short chrome, no legend essay. */
export default function CalendarView(props) {
  const {
    setActiveView,
    calCursor,
    setCalCursor,
    buildMonthGrid,
    formatMonthYear,
    formatShortDate,
    urgencyLabel,
    deadlineUrgency,
    toISODate,
    calendarEvents,
    selectProject,
    projectDeadline,
    setProjectDeadline,
    activeProject,
    upcomingDeadlines: upcomingProp,
  } = props

  const [pendingDeadline, setPendingDeadline] = useState(null)

  const projectUrgency = projectDeadline
    ? deadlineUrgency(projectDeadline)
    : null

  const upcomingDeadlines =
    upcomingProp ||
    Object.entries(calendarEvents || {})
      .flatMap(([date, items]) =>
        (items || []).map((it) => ({ ...it, date }))
      )
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 24)

  return (
    <div className="calendar-view calendar-studio">
      <button
        type="button"
        className="back-link"
        onClick={() => setActiveView('flow')}
      >
        ← Path
      </button>

      <div className="flow-top">
        <h1 className="page-title">Deadlines</h1>
      </div>

      {pendingDeadline && (
        <div
          className="desk-confirm-banner cal-deadline-confirm"
          role="status"
        >
          <p className="desk-confirm-body">
            Due {formatShortDate(pendingDeadline)}?
          </p>
          <div className="desk-confirm-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setProjectDeadline(pendingDeadline)
                setPendingDeadline(null)
              }}
            >
              Set
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setPendingDeadline(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <section className="panel brand-section">
        <div className="brand-section-label">
          {activeProject?.name || 'Project'} · due
        </div>
        <div className="deadline-edit-row">
          <input
            id="project-deadline"
            type="date"
            className="field-input"
            value={projectDeadline}
            onChange={(e) => setProjectDeadline(e.target.value)}
            aria-label="Deadline"
          />
          {projectDeadline && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setProjectDeadline('')}
            >
              Clear
            </button>
          )}
        </div>
        {projectDeadline && (
          <p className={`deadline-chip urgency-${projectUrgency || 'later'}`}>
            {formatShortDate(projectDeadline)} · {urgencyLabel(projectDeadline)}
          </p>
        )}
      </section>

      <section className="panel brand-section">
        <div className="brand-section-label">Month</div>
        <div className="cal-nav">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label="Previous month"
            onClick={() =>
              setCalCursor((c) => {
                const m = c.month - 1
                if (m < 0) return { year: c.year - 1, month: 11 }
                return { ...c, month: m }
              })
            }
          >
            ←
          </button>
          <h2 className="cal-month-title">
            {formatMonthYear(calCursor.year, calCursor.month)}
          </h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label="Next month"
            onClick={() =>
              setCalCursor((c) => {
                const m = c.month + 1
                if (m > 11) return { year: c.year + 1, month: 0 }
                return { ...c, month: m }
              })
            }
          >
            →
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const n = new Date()
              setCalCursor({
                year: n.getFullYear(),
                month: n.getMonth(),
              })
            }}
          >
            Today
          </button>
        </div>
        <div className="cal-weekdays" aria-hidden="true">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {buildMonthGrid(calCursor.year, calCursor.month).map((cell, i) => {
            const events = cell.date ? calendarEvents[cell.date] || [] : []
            const isToday = cell.date === toISODate()
            return (
              <div
                key={i}
                className={`cal-cell${cell.inMonth ? '' : ' is-pad'}${
                  isToday ? ' is-today' : ''
                }${events.length ? ' has-events' : ''}${
                  cell.date && projectDeadline === cell.date
                    ? ' is-deadline'
                    : ''
                }`}
              >
                {cell.day != null && cell.date && cell.inMonth ? (
                  <button
                    type="button"
                    className="cal-daynum cal-daynum-btn"
                    title="Set deadline"
                    onClick={() => setPendingDeadline(cell.date)}
                    aria-pressed={pendingDeadline === cell.date}
                  >
                    {cell.day}
                  </button>
                ) : cell.day != null ? (
                  <span className="cal-daynum">{cell.day}</span>
                ) : null}
                {events.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    className={`cal-event cal-event-${ev.type}`}
                    title={ev.label}
                    onClick={() => {
                      if (ev.projectId != null) {
                        selectProject(ev.projectId)
                      }
                      setActiveView(
                        ev.type === 'project' ? 'project' : 'flow'
                      )
                    }}
                  >
                    {ev.type === 'project' ? '◆ ' : '· '}
                    {ev.label.slice(0, 14)}
                    {ev.label.length > 14 ? '…' : ''}
                  </button>
                ))}
                {events.length > 3 && (
                  <span className="cal-more">+{events.length - 3}</span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel brand-section">
        <div className="brand-section-label">Upcoming</div>
        {upcomingDeadlines.length === 0 ? (
          <p className="settings-meta" style={{ margin: 0 }}>
            None
          </p>
        ) : (
          <ul className="deadline-list">
            {upcomingDeadlines.map((row) => (
              <li
                key={`${row.kind}-${row.id}`}
                className={`deadline-list-item urgency-${row.urgency}`}
              >
                <div>
                  <strong>
                    {row.kind === 'project' ? 'Project' : 'Step'}: {row.name}
                  </strong>
                  <span>
                    {formatShortDate(row.date)} · {urgencyLabel(row.date)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (row.kind === 'project') {
                      selectProject(row.id)
                      setActiveView('project')
                    } else if (row.projectId != null) {
                      selectProject(row.projectId)
                      setActiveView('flow')
                    }
                  }}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
