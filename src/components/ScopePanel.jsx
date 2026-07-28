/**
 * Scope — the five things that have to be agreed before work starts.
 *
 * The research's worked example is the whole argument for this panel: without
 * a defined revision limit and a named approver, three people on the client
 * side sent different requests after the first draft, and nobody could say
 * which one counted. Two of the five (what you're making, file formats) the
 * brief already asks; this panel shows their state and owns the three that
 * had no home — the revision count, who signs off, and what is NOT included.
 *
 * It is a summary line until you open it. Closed, it says how many parts are
 * still unagreed and nothing else; there is no badge, no colour, and it never
 * blocks moving on. An unagreed scope is worth seeing, not worth stopping for.
 */
import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import { scopeGaps, REVISION_BILLING } from '../lib/revisions'
import { projectTermsText, hasProjectTerms } from '../lib/projectTerms'

export default function ScopePanel({ activeProject, onOpenChapter, flashMicro }) {
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const [open, setOpen] = useState(false)
  if (!activeProject) return null

  const gaps = scopeGaps(activeProject)
  const d = activeProject.detective || {}
  const picked = Array.isArray(d.deliverablesPicked) ? d.deliverablesPicked : []
  const billing = activeProject.scopeRevisionBilling || 'perRound'

  return (
    <div className="scope-panel">
      <button
        type="button"
        className="scope-panel-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="define-field-label">Scope</span>
        <span className="scope-panel-state">
          {gaps.length === 0
            ? 'All agreed'
            : `${gaps.length} still to agree`}
        </span>
      </button>

      {open ? (
        <div className="scope-panel-body">
          {/* At the top of the body, under the state line — the owner's own
              rule is "if it's at the bottom I won't see it or use it". It
              also sits next to the gap count on purpose: the count is what
              tells you, BEFORE you copy, that parts are missing. There is no
              toast afterwards naming what was left out — that fires when
              nothing can be done about it, which makes it a verdict rather
              than information, and its answer is always "yes, copy anyway". */}
          {hasProjectTerms(activeProject) ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm scope-terms-copy"
              onClick={async () => {
                const text = projectTermsText(activeProject)
                try {
                  await navigator.clipboard.writeText(text)
                  flashMicro?.('Project terms copied')
                } catch {
                  flashMicro?.('Couldn’t copy — check clipboard permissions')
                }
              }}
            >
              Copy project terms
            </button>
          ) : null}

          {/* The two the brief already owns. Shown, not duplicated — a second
              input for the same answer is a second place for it to be wrong. */}
          <div className="scope-row scope-row-static">
            <span className="scope-row-label">What you are making</span>
            <button
              type="button"
              className="text-link"
              onClick={() => onOpenChapter?.('constraints')}
            >
              {picked.length
                ? `${picked.length} picked`
                : String(d.deliverables || '').trim()
                  ? 'Written in the brief'
                  : 'Not agreed — open the brief'}
            </button>
          </div>

          {/* Read-only, and shown only so that what the panel DISPLAYS equals
              what the copy button EMITS. Deliberately NOT added to
              scopeGaps(): a sixth gap would raise the "still to agree" count
              on every existing project overnight, which reads as work
              appearing from nowhere. */}
          <div className="scope-row scope-row-static">
            <span className="scope-row-label">Delivery by</span>
            <button
              type="button"
              className="text-link"
              onClick={() => onOpenChapter?.('overview')}
            >
              {String(d.projectDeadline || activeProject.deadline || '').trim() ||
                'No date set'}
            </button>
          </div>

          <div className="scope-row scope-row-static">
            <span className="scope-row-label">File formats</span>
            <button
              type="button"
              className="text-link"
              onClick={() => onOpenChapter?.('constraints')}
            >
              {String(d.technical || '').trim() || 'Not agreed — open the brief'}
            </button>
          </div>

          {/* A number, never "as needed" — the one line the research is
              most insistent about. */}
          <div className="scope-row">
            <label className="scope-row-label" htmlFor="scope-revisions">
              Revision rounds included
            </label>
            <input
              id="scope-revisions"
              type="number"
              min="0"
              step="1"
              className="field-input scope-input-num"
              value={activeProject.scopeRevisionsIncluded ?? 2}
              onChange={(e) =>
                updateBrandField(
                  'scopeRevisionsIncluded',
                  Math.max(0, Number(e.target.value) || 0)
                )
              }
            />
          </div>

          <div className="scope-row">
            <label className="scope-row-label" htmlFor="scope-billing">
              Extra rounds billed
            </label>
            <select
              id="scope-billing"
              className="field-input"
              value={billing}
              onChange={(e) =>
                updateBrandField('scopeRevisionBilling', e.target.value)
              }
            >
              {REVISION_BILLING.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div className="scope-row">
            <label className="scope-row-label" htmlFor="scope-rate">
              {billing === 'hourly' ? 'Rate per hour' : 'Fee per extra round'}
            </label>
            <input
              id="scope-rate"
              type="number"
              min="0"
              step="0.01"
              className="field-input scope-input-num"
              value={activeProject.scopeRevisionRate ?? ''}
              onChange={(e) =>
                updateBrandField('scopeRevisionRate', e.target.value)
              }
              placeholder="0.00"
            />
          </div>

          {/* One name. The brief asks who ELSE approves, which is the plural
              question; this is the singular one — the person whose yes is the
              yes. Without it, every reviewer's note carries equal weight. */}
          <div className="scope-row">
            <label className="scope-row-label" htmlFor="scope-approver">
              Who signs it off
            </label>
            <input
              id="scope-approver"
              className="field-input"
              value={activeProject.scopeApprover || ''}
              onChange={(e) => updateBrandField('scopeApprover', e.target.value)}
              placeholder="One name"
            />
          </div>

          <div className="scope-row scope-row-stack">
            <label className="scope-row-label" htmlFor="scope-outof">
              What is not included
            </label>
            <textarea
              id="scope-outof"
              className="field-input"
              rows={2}
              value={activeProject.scopeOutOf || ''}
              onChange={(e) => updateBrandField('scopeOutOf', e.target.value)}
              placeholder="e.g. no website build, no copywriting"
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
