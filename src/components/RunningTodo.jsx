/**
 * Running to-do list — a "fridge list" separate from desk tasks.
 * Stays flat/unsorted until Sort groups it by the 7 workflow stages;
 * after that, new items land pre-tagged into their stage automatically.
 */
import { useEffect, useState } from 'react'
import { RUNNING_TODO_STAGES } from '../lib/runningTodoStages'

/** Centered "anything to add?" popup.
 *
 * Unprompted (on opening a project) it opens as a plain yes/no question; the
 * input only appears after "Yes" (recognition, not recall/generation, at the
 * highest-friction moment). When the user came here by clicking "Add to
 * list" they have already answered that question, so `skipAsk` drops them
 * straight into the input rather than asking it again. */
export function RunningTodoAddModal({ open, onClose, onAdd, stageLabel, skipAsk = false }) {
  const [answered, setAnswered] = useState(skipAsk)
  const [text, setText] = useState('')
  const [added, setAdded] = useState([])

  useEffect(() => {
    if (open) setAnswered(skipAsk)
  }, [open, skipAsk])

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
    setAnswered(skipAsk)
    onClose()
  }

  // Esc must work on every modal, and it reuses the same safe close —
  // half-typed text is captured, never dropped.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, text])

  if (!open) return null

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
            {skipAsk ? 'Add to your list' : 'Anything to add?'}
          </h3>
        </div>

        {!skipAsk && (
          <p className="running-todo-prompt-hint">
            Loose tasks on your mind? They'll go on your running to-do list.
          </p>
        )}

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
                placeholder="e.g. Send the invoice"
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

        {/* Add is unconditional. It used to render only once the list had
            been sorted — but sorting needs items, and Sort is disabled while
            the list is empty, so an empty list had no way in at all. */}
        <div className="running-todo-panel-actions">
          <button type="button" className="btn btn-primary" onClick={onOpenAdd}>
            Add to list
          </button>
          {!sorted && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onSort}
              disabled={items.length === 0}
            >
              Sort
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
