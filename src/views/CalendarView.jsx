import '../styles/lazy-clients.css'

/** Deadlines — month grid + project due. ADHD: short chrome, no legend essay. */
export default function CalendarView(props) {
  const {
    setActiveView,
    calCursor,
    setCalCursor,
    buildMonthGrid,
    formatMonthYear,
    toISODate,
    calendarEvents,
    selectProject,
    projectDeadline,
  } = props

  return (
    <div className="calendar-view calendar-studio">
      {/* No local back link — the app header's back affordance carries the
          return. */}
      <div className="flow-top">
        <h1 className="page-title">Calendar</h1>
      </div>

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
                  <span className="cal-daynum">{cell.day}</span>
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
                      // Project due → Strategy brief. Task due → Desk
                      // (where desk tasks with due dates actually live),
                      // not the running to-do panel (different list).
                      if (ev.type === 'project') {
                        setActiveView('project')
                      } else {
                        setActiveView('desk')
                      }
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

    </div>
  )
}
