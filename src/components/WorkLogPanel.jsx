/**
 * Your hours — the work clock's own record.
 *
 * Its own panel, deliberately not a page and deliberately not the Timer.
 * The clock chip used to open the Timer view, which put the two things the
 * app had just spent effort separating back on one screen: you clicked a
 * readout of hours you had already worked and landed on a countdown, which
 * reads as the clock having started something.
 *
 * Nothing here is billable. `timeLog` and the invoice are hand-entered.
 */
export function WorkLogPanel({ open, onClose, workLog = [], onRemoveEntry }) {
  if (!open) return null

  const total = workLog.reduce((s, e) => s + (Number(e.hours) || 0), 0)
  const byDate = [...workLog].sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  )

  return (
    <>
      <div
        className="running-todo-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="running-todo-panel work-log-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Your hours"
      >
        <div className="running-todo-panel-head">
          <span className="journey-projects-heading">Your hours</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {byDate.length === 0 ? (
          <p className="work-log-empty">
            The clock fills this in while you work. Just for you — nothing here
            goes on an invoice.
          </p>
        ) : (
          <>
            <ul className="work-log-list">
              {byDate.map((e) => (
                <li key={e.id} className="work-log-row">
                  <span className="work-log-date">{e.date}</span>
                  <span className="work-log-stage">{e.stage || e.note}</span>
                  <span className="work-log-hours">
                    {Number(e.hours).toFixed(2)}h
                  </span>
                  {onRemoveEntry && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => onRemoveEntry(e.id)}
                      aria-label={`Remove ${e.stage || 'entry'} on ${e.date}`}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="work-log-total">{total.toFixed(2)}h logged</p>
          </>
        )}
      </aside>
    </>
  )
}

export default WorkLogPanel
