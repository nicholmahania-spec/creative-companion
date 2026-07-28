/**
 * Case study export — the portfolio piece, built from what the project
 * already recorded.
 *
 * It lives on Deliver because that is when the story is complete and while
 * the details are still in your head. Writing case studies months later, from
 * memory, is why most freelance portfolios have three and they are all thin.
 *
 * Closed by default, and never a required step. If the project cannot answer
 * all five questions it exports the ones it can and names the rest — a case
 * study that stops early beats one with a blank heading in it.
 */
import { useState } from 'react'
import { DELIVERABLE_OPTIONS } from '../lib/detectiveBrief'
import { downloadBlob, slugifyFilename } from '../lib/exportFiles'
import {
  buildCaseStudy,
  caseStudyMarkdown,
  durationPhrase,
} from '../lib/caseStudy'

const LABELS = Object.fromEntries(
  DELIVERABLE_OPTIONS.map((o) => [o.id, o.label])
)

export default function CaseStudyExport({ activeProject, flashToast }) {
  const [busy, setBusy] = useState(false)
  if (!activeProject) return null

  const cs = buildCaseStudy({
    project: activeProject,
    deliverableLabels: LABELS,
  })

  const download = async () => {
    setBusy(true)
    try {
      const md = caseStudyMarkdown(cs)
      const blob = new Blob([md], { type: 'text/markdown' })
      const r = downloadBlob(
        blob,
        `${slugifyFilename(cs.title, 'case-study')}-case-study.md`
      )
      flashToast?.(r?.ok ? 'Case study downloaded' : 'Couldn’t export')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="deliver-case-study">
      <summary>Case study</summary>

      <p className="panel-hint">
        Built from the brief, your decision log and the work clock. Share the
        process — that is the part that shows there is no “design logo” button.
      </p>

      <ul className="case-study-answers">
        <li>
          <span className="case-study-q">Why it existed</span>
          <span>{cs.purpose || '—'}</span>
        </li>
        <li>
          <span className="case-study-q">What you made</span>
          <span>
            {cs.role.length
              ? cs.role.join(', ')
              : cs.freeformRole || '—'}
          </span>
        </li>
        <li>
          <span className="case-study-q">How you got there</span>
          <span>
            {cs.process.length
              ? `${cs.process.length} decision${cs.process.length === 1 ? '' : 's'} recorded`
              : '—'}
          </span>
        </li>
        <li>
          <span className="case-study-q">How long</span>
          {/* A span and where the effort went — never a total. The work clock
              is the private record; a total here hands a prospective client a
              number to divide your fee by. */}
          <span>{durationPhrase(cs.duration) || '—'}</span>
        </li>
        <li>
          <span className="case-study-q">How it turned out</span>
          <span>{cs.outcome || '—'}</span>
        </li>
      </ul>

      {cs.gaps.length > 0 && (
        <p className="panel-hint case-study-gaps">
          Exports without: {cs.gaps.map((g) => g.label).join(' · ')}
        </p>
      )}

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={download}
        disabled={busy}
      >
        {busy ? 'Exporting…' : 'Download case study'}
      </button>
    </details>
  )
}
