/**
 * Check my brand — the two questions a project can now answer about itself.
 *
 *   “What am I missing?”   → lib/brain/completeness
 *   “What did we decide?”  → lib/brain/brandBrain
 *
 * Collapsed by default, and it opens on a deliberate press. A permanent list
 * of everything undone is an ambient reproach on a screen whose job is to get
 * you back to work, so what shows unasked is the count and at most three
 * things — and each of those is a button that goes straight to where the
 * thing gets written, never a bare label you then have to hunt for.
 *
 * Nothing here judges the work. The check states what has no answer on
 * record; the memory repeats what the designer and client already wrote.
 * Neither says a decision is wrong — that call stays with the designer.
 */
import { useMemo, useState } from 'react'
import {
  brandCompleteness,
  completenessHeadline,
  topGaps,
} from '../lib/brain/completeness'
import { clearLine, looseEnds } from '../lib/brain/looseEnds'
import {
  buildBrandBrain,
  factLine,
  recall,
  suggestedQuestions,
} from '../lib/brain/brandBrain'

export default function BrandCheckPanel({
  project = null,
  moodItems = [],
  palette = [],
  tasks = [],
  clientRows = [],
  onOpenView,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [asked, setAsked] = useState('')

  /* Answered first because it is the question being asked at the end of a
     session, and because it is the only one that can come back "nothing".
     Undocumented work is NOT counted here — see looseEnds for why. */
  const ends = useMemo(
    () => looseEnds({ project, tasks, clientRows }),
    [project, tasks, clientRows]
  )
  const check = useMemo(
    () => brandCompleteness({ project, moodItems, palette }),
    [project, moodItems, palette]
  )
  const brain = useMemo(
    () => buildBrandBrain({ project, moodItems }),
    [project, moodItems]
  )
  const answer = useMemo(
    () => (asked ? recall(brain, asked) : null),
    [brain, asked]
  )
  const questions = useMemo(() => suggestedQuestions(brain), [brain])

  const go = (row) => onOpenView?.(row.view, row.section)
  const ask = (q) => {
    setQuery(q)
    setAsked(q)
  }

  const short = topGaps(check, 3)

  return (
    <section className="desk-panel desk-check" aria-label="Check my brand">
      <div className="desk-panel-head">
        <span className="desk-eyebrow">Check my brand</span>
        <span className="desk-check-status" role="status">
          {completenessHeadline(check)}
        </span>
      </div>

      <div
        className={`desk-clear${ends.clear ? ' is-clear' : ''}`}
        role="status"
      >
        <span className="desk-clear-head">{ends.headline}</span>
        {ends.clear ? (
          <span className="desk-clear-line">{clearLine(ends)}</span>
        ) : (
          <ul className="desk-clear-list">
            {ends.ends.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className="desk-check-gap"
                  onClick={() => onOpenView?.(e.view)}
                >
                  {e.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!open && short.length > 0 && (
        <ul className="desk-check-short">
          {short.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="desk-check-gap"
                onClick={() => go(row)}
              >
                {row.todo}
              </button>
              <span className="desk-check-group">{row.groupLabel}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="btn btn-secondary desk-check-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide the full check' : `Check all ${check.total}`}
      </button>

      {open && (
        <div className="desk-check-body">
          {check.groups.map((g) => (
            <div key={g.id} className="desk-check-group-block">
              <div className="desk-check-group-head">
                <span className="desk-check-group-name">{g.label}</span>
                <span className="desk-check-group-count">
                  {g.done}/{g.total}
                </span>
              </div>
              <ul className="desk-check-list">
                {g.rows.map((row) => (
                  <li
                    key={row.id}
                    className={`desk-check-row${row.ok ? ' is-ok' : ''}`}
                  >
                    <span className="desk-check-tick" aria-hidden="true">
                      {row.ok ? '✓' : '·'}
                    </span>
                    {row.ok ? (
                      <span className="desk-check-label">{row.label}</span>
                    ) : (
                      <button
                        type="button"
                        className="desk-check-gap"
                        onClick={() => go(row)}
                      >
                        {row.label}
                        <span className="desk-check-todo">{row.todo}</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="desk-check-brain">
            <div className="desk-panel-head">
              <span className="desk-eyebrow">What did we decide?</span>
            </div>

            {questions.length > 0 && (
              <div
                className="desk-check-chips"
                role="group"
                aria-label="Questions this project can answer"
              >
                {questions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="desk-check-chip"
                    onClick={() => ask(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form
              className="desk-check-ask"
              onSubmit={(e) => {
                e.preventDefault()
                setAsked(query)
              }}
            >
              <label className="field-label sr-only" htmlFor="brand-brain-ask">
                Ask this project a question
              </label>
              <input
                id="brand-brain-ask"
                type="text"
                className="field-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Why did we choose this?"
              />
              <button type="submit" className="btn btn-secondary">
                Ask
              </button>
            </form>

            {answer && (
              <div className="desk-check-answer" aria-live="polite">
                {answer.matches.length === 0 ? (
                  <p className="desk-empty">
                    Nothing on record about that yet. The memory only repeats
                    what is written down somewhere in this project.
                  </p>
                ) : (
                  <ul className="desk-check-facts">
                    {answer.matches.map((f) => (
                      <li key={f.id} className="desk-check-fact">
                        <span className="desk-check-fact-line">
                          {factLine(f)}
                        </span>
                        <span className="desk-check-fact-source">
                          {f.source}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
