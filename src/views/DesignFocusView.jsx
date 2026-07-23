/**
 * 05 // Design — Focus Mode (Tactile Minimalist rework, opt-in preview).
 *
 * The blueprint's spec for this stage (auto-injected variation matrix
 * on a wireframe layout, shuffled with Spacebar) assumes a layout
 * engine this app doesn't have — DesignView edits brand fields
 * (tagline/palette/type/logo), it doesn't compose page layouts. What
 * *is* directly buildable here, and what the blueprint got right for
 * the domain, is the font-pairing showdown — DesignView is genuinely
 * where type gets chosen (updateBrandField('typeHeading'/'typeBody')),
 * unlike Ideate, where the same idea didn't fit. So this stage does:
 * one-line tagline, then a real head-to-head between this app's
 * curated TYPE_PAIRS, rendered with actual font-family specimens via
 * fontFamilyFromLabel — not placeholder text standing in for type.
 */
import { useEffect, useState } from 'react'
import FocusShell from '../components/focus/FocusShell'
import FocusCard from '../components/focus/FocusCard'
import useAppStore from '../store/useAppStore'
import { TYPE_PAIRS, fontFamilyFromLabel } from '../lib/color'

// Four curated pairs, challenger-style (bracket starts with 2, the
// remaining 2 join one at a time as each round's winner defends) — the
// other two entries in TYPE_PAIRS stay reachable from the standard
// Design → Type tab.
const BRACKET_PAIRS = TYPE_PAIRS.slice(0, 4)

export default function DesignFocusView({ activeProject, setActiveView }) {
  const updateBrandField = useAppStore((s) => s.updateBrandField)

  const [taglineDone, setTaglineDone] = useState(!!activeProject?.tagline)
  const [taglineDraft, setTaglineDraft] = useState(activeProject?.tagline || '')
  const [bracket, setBracket] = useState([BRACKET_PAIRS[0], BRACKET_PAIRS[1]])
  const [contenders, setContenders] = useState([BRACKET_PAIRS[2], BRACKET_PAIRS[3]])
  const [winner, setWinner] = useState(null)
  const [applied, setApplied] = useState(false)

  const pick = (chosenPair) => {
    if (contenders.length === 0) {
      setWinner(chosenPair)
      setBracket(null)
    } else {
      setBracket([chosenPair, contenders[0]])
      setContenders(contenders.slice(1))
    }
  }

  useEffect(() => {
    if (!taglineDone) return
    const onKey = (e) => {
      if (!bracket) return
      if (e.key === 'ArrowLeft') pick(bracket[0])
      else if (e.key === 'ArrowRight') pick(bracket[1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket, taglineDone])

  const applyWinner = () => {
    if (!winner) return
    updateBrandField('typeHeading', winner.heading)
    updateBrandField('typeBody', winner.body)
    setApplied(true)
  }

  if (!taglineDone) {
    return (
      <FocusShell stepLabel="05 // Design" stepIndex={0} stepCount={2}>
        <FocusCard cardKey="tagline">
          <p className="focus-prompt">One-line tagline:</p>
          <input
            className="focus-input-inline"
            style={{ display: 'block', width: '100%' }}
            value={taglineDraft}
            onChange={(e) => setTaglineDraft(e.target.value)}
            placeholder="e.g. Calm systems for busy teams"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && taglineDraft.trim()) {
                updateBrandField('tagline', taglineDraft.trim())
                setTaglineDone(true)
              }
            }}
          />
          <div className="focus-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!taglineDraft.trim()}
              onClick={() => {
                updateBrandField('tagline', taglineDraft.trim())
                setTaglineDone(true)
              }}
            >
              Next
            </button>
            <button type="button" className="focus-skip-btn" onClick={() => setTaglineDone(true)}>
              Skip
            </button>
          </div>
        </FocusCard>
      </FocusShell>
    )
  }

  if (applied) {
    return (
      <FocusShell stepLabel="05 // Design" stepIndex={2} stepCount={2}>
        <div className="focus-card" style={{ textAlign: 'center' }}>
          <p className="focus-prompt">Type set: {winner.label}</p>
          <div className="focus-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={() => setActiveView?.('review')}>
              Next · Review
            </button>
          </div>
        </div>
      </FocusShell>
    )
  }

  if (winner) {
    return (
      <FocusShell stepLabel="05 // Design" stepIndex={2} stepCount={2}>
        <div className="focus-card" style={{ textAlign: 'center' }}>
          <p className="focus-hint">Winner</p>
          <p
            style={{
              fontFamily: fontFamilyFromLabel(winner.heading),
              fontWeight: 700,
              fontSize: '2rem',
              margin: '0.5rem 0',
              color: 'var(--text-primary)',
            }}
          >
            Aa Bb Cc
          </p>
          <p className="focus-hint" style={{ marginBottom: '1.5rem' }}>{winner.label}</p>
          <button type="button" className="btn btn-primary" onClick={applyWinner}>
            Use this pairing
          </button>
        </div>
      </FocusShell>
    )
  }

  return (
    <FocusShell stepLabel="05 // Design" stepIndex={1} stepCount={2}>
      <div style={{ width: '100%', maxWidth: '40rem' }}>
        <p className="focus-prompt" style={{ textAlign: 'center' }}>Which pairing wins?</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {bracket.map((pair, i) => (
            <button
              key={pair.id}
              type="button"
              onClick={() => pick(pair)}
              style={{
                flex: 1,
                textAlign: 'left',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                minHeight: '11rem',
              }}
            >
              <span className="focus-hint">{i === 0 ? '← Left arrow' : 'Right arrow →'}</span>
              <p
                style={{
                  fontFamily: fontFamilyFromLabel(pair.heading),
                  fontWeight: 700,
                  fontSize: '1.75rem',
                  margin: '0.5rem 0 0.25rem',
                }}
              >
                Aa Bb
              </p>
              <p style={{ fontFamily: fontFamilyFromLabel(pair.body), fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {pair.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    </FocusShell>
  )
}
