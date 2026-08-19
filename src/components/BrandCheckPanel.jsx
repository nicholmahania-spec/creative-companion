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
} from '../lib/brain/completeness'
import { clearLine, looseEnds } from '../lib/brain/looseEnds'
import { latestIdentityApproval } from '../lib/client/clientInbox'
import {
  buildBrandBrain,
  factLine,
  recallWithFallback,
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
  /* The client's approval is not project state and is deliberately not copied
     into it — it is read from the inbox rows this panel already receives, which
     are themselves a projection of the client's own response row. */
  const clientApproval = useMemo(
    () => latestIdentityApproval(clientRows, project?.id),
    [clientRows, project?.id]
  )
  const check = useMemo(
    () => brandCompleteness({ project, moodItems, palette, clientApproval }),
    [project, moodItems, palette, clientApproval]
  )
  const brain = useMemo(
    () => buildBrandBrain({ project, moodItems }),
    [project, moodItems]
  )
  const answer = useMemo(
    () => (asked ? recallWithFallback(brain, asked) : null),
    [brain, asked]
  )
  const questions = useMemo(() => suggestedQuestions(brain), [brain])

  const go = (row) => onOpenView?.(row.view, row.section)
  const ask = (q) => {
    setQuery(q)
    setAsked(q)
  }

  return (
    <section className="desk-panel desk-check" aria-label="Check my brand">
      {/* No count in the head. "29 things not documented yet" is the
          magnitude of undone work with no plan attached — a backlog line,
          which is the one thing DEVELOPMENT.md says turns "I'm working" into
          "I'm behind". The three rows below are the same information WITH a
          plan and a route, which is what makes them usable. The full tally
          appears once you deliberately open the check. */}
      <div className="desk-panel-head">
        <span className="desk-eyebrow">Check my brand</span>
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

      {/* The unasked three-gap list is gone (2026-08-08).
          This panel's own header comment argued that a permanent list of
          everything undone is an ambient reproach on a screen whose job is to
          get you back to work — and then rendered three of them unasked
          anyway, directly under the loose-ends list, which is a second list
          of open items in the same box. The full check is one press away and
          is still exactly as reachable; what changed is that it no longer
          greets you — the opened panel renders every group in full, so
          nothing became less visible on request. */}

      <div className="desk-check-brain">
        <div className="desk-panel-head">
          <span className="desk-eyebrow">Decisions on record</span>
        </div>
        {/* Name the mechanism in the section, not in the prompt.
            The heading was the question the feature answers ("What did we
            decide?"), which reads as the app asking the user — and on an
            empty project it asked about a typeface they had not chosen. A
            stranger could not tell whether the box below was AI, search, or
            a note field. One line saying what this IS, once, above it. */}
        <p className="desk-check-brain-lede">
          Search what you have already settled, so you don’t decide it twice.
        </p>

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
            Search this project’s decisions
          </label>
          <input
            id="brand-brain-ask"
            type="text"
            className="field-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Why did we choose this?"
          />
          {/* `Ask` promised an answerer. This searches what the project has
              already recorded and falls back to browsing on a miss — say
              that, so nobody waits for a reply that was never coming. */}
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>

        {answer && (
          <div className="desk-check-answer" aria-live="polite">
            {/* A miss degrades to a browse, never to a denial. Saying
                "nothing on record" when the words simply did not match
                tells the designer their own decision was never written
                down — false on any project where it was, and the kind of
                false that stops anyone asking a second question. */}
            {answer.fellBack && (
              <p className="desk-empty">
                {answer.matches.length
                  ? 'Nothing matched those words — here is what this project remembers.'
                  : 'This project has not recorded anything yet.'}
              </p>
            )}
            {answer.matches.length > 0 && (
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

      <button
        type="button"
        className="btn btn-secondary desk-check-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {/* `Check all 21` counted 21 of something it never named. */}
        {open ? 'Hide the full check' : `Check all ${check.total} brand items`}
      </button>

      {open && (
        <div className="desk-check-body">
          <p className="desk-check-status" role="status">
            {completenessHeadline(check)}
          </p>
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

        </div>
      )}
    </section>
  )
}
