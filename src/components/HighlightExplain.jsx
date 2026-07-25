import { useEffect, useState } from 'react'
import { lookupGlossaryTerm } from '../lib/glossary'

/**
 * Highlight-to-explain — selecting a known design/brand term anywhere in the
 * app shows a small, centered, plain-language explanation. Unmatched
 * selections do nothing (no popover, no "not found" message) so the feature
 * can never read as a failure.
 */
export default function HighlightExplain() {
  const [match, setMatch] = useState(null)

  useEffect(() => {
    const onSelectionChange = () => {
      // Once a popover is open, further selection changes (e.g. focus
      // moving to the close button, which collapses the selection) must
      // not immediately dismiss it — only closing/backdrop/Escape should.
      setMatch((current) => {
        const selection = window.getSelection()
        const text = selection ? String(selection.toString() || '').trim() : ''
        if (!text) return current
        const explanation = lookupGlossaryTerm(text)
        if (!explanation) return current
        return { term: text, explanation }
      })
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMatch(null)
    }
    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  if (!match) return null

  return (
    <div
      className="export-overlay glossary-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Term explained simply"
      onClick={(e) => {
        if (e.target === e.currentTarget) setMatch(null)
      }}
    >
      <div className="export-panel glossary-panel">
        <button
          type="button"
          className="btn btn-ghost btn-sm glossary-close"
          onClick={() => setMatch(null)}
          aria-label="Close"
        >
          ×
        </button>
        <p className="glossary-term">{match.term}</p>
        <p className="glossary-explanation">{match.explanation}</p>
      </div>
    </div>
  )
}
