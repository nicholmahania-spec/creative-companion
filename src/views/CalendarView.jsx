import EmptyIllustration from '../components/EmptyIllustration'
/** Lazy-loaded CalendarView */
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
    daysUntil,
    toISODate,
    calendarEvents,
    selectProject,
    projectDeadline,
    setProjectDeadline,
    activeProject,
    upcomingDeadlines: upcomingProp,
  } = props

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
        <div className="calendar-view">
          <button
            type="button"
            className="back-link"
            onClick={() => setActiveView('flow')}
          >
            ← Work
          </button>

          <div className="flow-top">
            <div>
              <h1 className="page-title">Deadlines</h1>
              <p className="page-sub">
                Project due dates + step due dates. Simple calendar so time
                stays visible.
              </p>
            </div>
          </div>

          <section className="panel brand-section">
            <div className="brand-section-label">Active project due</div>
            <p className="panel-hint" style={{ marginBottom: '0.55rem' }}>
              {activeProject?.name || 'No project'}
            </p>
            <label className="field-label" htmlFor="project-deadline">
              Project deadline
            </label>
            <div className="deadline-edit-row">
              <input
                id="project-deadline"
                type="date"
                className="field-input"
                value={projectDeadline}
                onChange={(e) => setProjectDeadline(e.target.value)}
              />
              {projectDeadline && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setProjectDeadline('')}
                >
                  Clear
                </button>
              )}
            </div>
            {projectDeadline && (
              <p
                className={`deadline-chip urgency-${projectUrgency || 'later'}`}
              >
                {formatShortDate(projectDeadline)} ·{' '}
                {urgencyLabel(projectDeadline)}
              </p>
            )}
          </section>

          <section className="panel brand-section">
            <div className="brand-section-label">Month</div>
            <div className="cal-nav">
              <button
                type="button"
                className="btn btn-secondary"
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
                className="btn btn-secondary"
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
                className="btn btn-ghost"
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
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="cal-grid">
              {buildMonthGrid(calCursor.year, calCursor.month).map(
                (cell, i) => {
                  const events = cell.date
                    ? calendarEvents[cell.date] || []
                    : []
                  const isToday = cell.date === toISODate()
                  return (
                    <div
                      key={i}
                      className={`cal-cell${
                        cell.inMonth ? '' : ' is-pad'
                      }${isToday ? ' is-today' : ''}${
                        events.length ? ' has-events' : ''
                      }${
                        cell.date && projectDeadline === cell.date
                          ? ' is-deadline'
                          : ''
                      }`}
                    >
                      {cell.day != null && cell.date && cell.inMonth ? (
                        <button
                          type="button"
                          className="cal-daynum cal-daynum-btn"
                          title="Set project deadline to this day"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Set project deadline to ${formatShortDate(cell.date)}?`
                              )
                            ) {
                              setProjectDeadline(cell.date)
                            }
                          }}
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
                          {ev.label.slice(0, 18)}
                          {ev.label.length > 18 ? '…' : ''}
                        </button>
                      ))}
                      {events.length > 3 && (
                        <span className="cal-more">
                          +{events.length - 3}
                        </span>
                      )}
                    </div>
                  )
                }
              )}
            </div>
            <p className="panel-hint" style={{ marginTop: '0.75rem' }}>
              ◆ = project deadline · · = open step due date
            </p>
          </section>

          <section className="panel brand-section">
            <div className="brand-section-label">Upcoming</div>
            {upcomingDeadlines.length === 0 ? (
              <div className="empty-state empty-state-craft" style={{ paddingTop: '0.5rem' }}>
                <EmptyIllustration variant="calendar" />
                <p className="empty-state-body" style={{ margin: 0 }}>
                  No deadlines yet. Set a project deadline above, or add a due
                  date when capturing a step (Energy &amp; voice → Due).
                </p>
              </div>
            ) : (
              <ul className="deadline-list">
                {upcomingDeadlines.map((row) => (
                  <li
                    key={`${row.kind}-${row.id}`}
                    className={`deadline-list-item urgency-${row.urgency}`}
                  >
                    <div>
                      <strong>
                        {row.kind === 'project' ? 'Project' : 'Step'}:{' '}
                        {row.name}
                      </strong>
                      <span>
                        {formatShortDate(row.date)} ·{' '}
                        {urgencyLabel(row.date)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
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
