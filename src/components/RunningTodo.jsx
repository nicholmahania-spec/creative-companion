/**
 * Running to-do list — a "fridge list" separate from desk tasks.
 * Stays flat/unsorted until Sort groups it by the 7 workflow stages;
 * after that, new items land pre-tagged into their stage automatically.
 */
import { useState } from 'react'
import { RUNNING_TODO_STAGES } from '../lib/runningTodoStages'

/** Centered "anything to add?" popup — shown on opening a project.
 * Opens as a plain yes/no question; the input only appears after "Yes"
 * (recognition, not recall/generation, at the highest-friction moment). */
export function RunningTodoAddModal({ open, onClose, onAdd, stageLabel }) {
  const [answered, setAnswered] = useState(false)
  const [text, setText] = useState('')
  const [added, setAdded] = useState([])

  if (!open) return null

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setAdded((prev) => [...prev, trimmed])
    setText('')
  }

  const close = () => {
    // Never silently drop something half-typed.
    const trimmed = text.trim()
    if (trimmed) {
      onAdd(trimmed)
      setText('')
    }
    setAnswered(false)
    onClose()
  }

  return (
    <div
      className="export-overlay running-todo-prompt-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="running-todo-prompt-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="export-panel running-todo-prompt-panel">
        <div className="export-panel-header">
          <h3 id="running-todo-prompt-title" style={{ margin: 0 }}>
            Anything to add?
          </h3>
        </div>

        {!answered ? (
          <div className="running-todo-prompt-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAnswered(true)}>
              Yes
            </button>
            <button type="button" className="btn btn-primary" onClick={close}>
              Not now
            </button>
          </div>
        ) : (
          <>
            <div className="capture-row">
              <input
                autoFocus
                className="field-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                aria-label="New to-do item"
              />
              <button type="button" className="btn btn-secondary" onClick={submit} disabled={!text.trim()}>
                Add
              </button>
            </div>
            {added.length > 0 && (
              <ul className="running-todo-prompt-added">
                {added.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
            <div className="running-todo-prompt-actions">
              <button type="button" className="btn btn-primary" onClick={close}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Sidebar-styled drawer listing the running to-do, grouped by stage once sorted. */
export function RunningTodoPanel({
  open,
  onClose,
  runningTodo,
  onToggle,
  onRemove,
  onSort,
  onOpenAdd,
}) {
  if (!open) return null
  const items = runningTodo?.items || []
  const sorted = !!runningTodo?.sorted

  const grouped = sorted
    ? RUNNING_TODO_STAGES.map((stage) => ({
        stage,
        items: items.filter((it) => it.stage === stage.id),
      })).filter((g) => g.items.length > 0)
    : null

  return (
    <>
      <div className="running-todo-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="running-todo-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Running to-do list"
      >
        <div className="running-todo-panel-head">
          <span className="journey-projects-heading">To-do list</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <p className="running-todo-empty">
            Nothing on the list yet — items you add will show up here.
          </p>
        ) : !sorted ? (
          <ul className="running-todo-list">
            {items.map((it) => (
              <RunningTodoRow key={it.id} item={it} onToggle={onToggle} onRemove={onRemove} />
            ))}
          </ul>
        ) : (
          grouped.map(({ stage, items: stageItems }) => {
            const firstOpenId = stageItems.find((it) => !it.completed)?.id
            return (
              <div key={stage.id} className="running-todo-group">
                <p className="running-todo-group-label">{stage.label}</p>
                <ul className="running-todo-list">
                  {stageItems.map((it) => (
                    <RunningTodoRow
                      key={it.id}
                      item={it}
                      onToggle={onToggle}
                      onRemove={onRemove}
                      recommended={it.id === firstOpenId}
                    />
                  ))}
                </ul>
              </div>
            )
          })
        )}

        <div className="running-todo-panel-actions">
          {!sorted ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSort}
              disabled={items.length === 0}
            >
              Sort
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={onOpenAdd}>
              Add to list
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

function RunningTodoRow({ item, onToggle, onRemove, recommended }) {
  return (
    <li className={`running-todo-row${item.completed ? ' is-done' : ''}`}>
      <button
        type="button"
        className="running-todo-check"
        aria-pressed={item.completed}
        aria-label={item.completed ? 'Mark not done' : 'Mark done'}
        onClick={() => onToggle(item.id)}
      >
        {item.completed ? '✓' : ''}
      </button>
      <span className="running-todo-row-text">
        {item.text}
        {recommended && !item.completed ? (
          <span className="running-todo-recommend">Start here</span>
        ) : null}
      </span>
      <button
        type="button"
        className="running-todo-remove"
        aria-label={`Remove "${item.text}"`}
        onClick={() => onRemove(item.id)}
      >
        ×
      </button>
    </li>
  )
}
