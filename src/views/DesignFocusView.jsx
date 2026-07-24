/**
 * 05 // Design — Focus Mode (Tactile Minimalist rework, opt-in preview).
 * Added: Intent-setting step at start (phase 4 UX consistency).
 * Then proceeds to tagline setting and font pairing as before.
 */
import { useEffect, useState } from 'react'
import FocusShell from '../components/focus/FocusShell'
import FocusCard from '../components/focus/FocusCard'
import useAppStore from '../store/useAppStore'
import Button from '../components/ui/Button'
import { TYPE_PAIRS, fontFamilyFromLabel } from '../lib/color'

// Four curated pairs, challenger-style (bracket starts with 2, the
// remaining 2 join one at a time as each round's winner defends) — the
// other two entries in TYPE_PAIRS stay reachable from the standard
// Design → Type tab.
const BRACKET_PAIRS = TYPE_PAIRS.slice(0, 4)

export default function DesignFocusView({ activeProject, setActiveView }) {
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const { brandFields } = useAppStore((s) => s)

  // Intent setting state
  const [intent, setIntent] = useState('')
  const [intentSet, setIntentSet] = useState(false)

  // Original DesignView state (moved inside intentSet conditional)
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

  const exitFocus = () => setActiveView?.('brand')

  // If intent not set, show intent input first
  if (!intentSet) {
    return (
      <FocusShell
        stepLabel="05 // Design"
        stepIndex={0}
        stepCount={3}
        showPreviewDrawer={false}
        onExit={exitFocus}
      >
        <div className="focus-card">
          <p id="design-intent-prompt" className="focus-prompt">What do you want to accomplish in your design session?</p>
          <input
            id="design-intent-input"
            className="focus-input-inline w-full border border-border rounded-md px-3 py-2 text-base focus-ring focus-ring-accent focus-ring-offset-0"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g., Choose heading and body fonts that feel trustworthy"
            autoFocus
            aria-labelledby="design-intent-prompt"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && intent.trim()) {
                setIntentSet(true)
              }
            }}
          />
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (intent.trim()) {
                  setIntentSet(true)
                }
              }}
              disabled={!intent.trim()}
            >
              Start Designing
            </Button>
          </div>
        </div>
      </FocusShell>
    )
  }

  // Main DesignView logic (only shown after intent is set)
  if (!taglineDone) {
    return (
      <FocusShell
        stepLabel="05 // Design"
        stepIndex={1}
        stepCount={3}
        showPreviewDrawer={true}
        onExit={exitFocus}
        drawerContent={
          <div>
            <h3 className="font-semibold mb-2">Current Brand Settings</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Tagline:</span>
                <span className="font-mono">{activeProject?.tagline || '(not set)'}</span>
              </div>
              <div className="flex justify-between">
                <span>Heading Font:</span>
                <span className="font-mono">{brandFields.typeHeading || '(not set)'}</span>
              </div>
              <div className="flex justify-between">
                <span>Body Font:</span>
                <span className="font-mono">{brandFields.typeBody || '(not set)'}</span>
              </div>
            </div>
          </div>
        }
        onDrawerToggle={(isOpen) => console.log('Drawer toggled:', isOpen)}
      >
        <FocusCard cardKey="tagline">
          <p className="focus-prompt">One-line tagline:</p>
          <input
            className="focus-input-inline w-full border border-border rounded-md px-3 py-2 text-base focus-ring focus-ring-accent focus-ring-offset-0"
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
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateBrandField('tagline', taglineDraft.trim())
                setTaglineDone(true)
              }}
              disabled={!taglineDraft.trim()}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTaglineDone(true)}
              className="ml-2"
            >
              Skip
            </Button>
          </div>
        </FocusCard>
      </FocusShell>
    )
  }

  if (applied) {
    return (
      <FocusShell
        stepLabel="05 // Design"
        stepIndex={2}
        stepCount={3}
        showPreviewDrawer={true}
        onExit={exitFocus}
        drawerContent={
          <div>
            <h3 className="font-semibold mb-2">Applied Brand Settings</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Tagline:</span>
                <span className="font-mono">{taglineDraft.trim()}</span>
              </div>
              <div className="flex justify-between">
                <span>Heading Font:</span>
                <span className="font-mono">{winner.heading}</span>
              </div>
              <div className="flex justify-between">
                <span>Body Font:</span>
                <span className="font-mono">{winner.body}</span>
              </div>
            </div>
          </div>
        }
        onDrawerToggle={(isOpen) => console.log('Drawer toggled:', isOpen)}
      >
        <div className="focus-card">
          <p className="focus-prompt text-center">Type set: {winner.label}</p>
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView?.('review')}
            >
              Next · Review
            </Button>
          </div>
        </div>
      </FocusShell>
    )
  }

  if (winner) {
    return (
      <FocusShell
        stepLabel="05 // Design"
        stepIndex={2}
        stepCount={3}
        showPreviewDrawer={true}
        onExit={exitFocus}
        drawerContent={
          <div>
            <h3 className="font-semibold mb-2">Preview Selection</h3>
            <div className="space-y-4">
              <p className="text-center font-semibold">Winner: {winner.label}</p>
              <div className="flex justify-center">
                <div className="space-x-4">
                  <div className="text-center">
                    <p className="font-semibold">Heading</p>
                    <p
                      style={{
                        fontFamily: fontFamilyFromLabel(winner.heading),
                        fontWeight: 700,
                        fontSize: '1.5rem',
                        margin: '0.5rem 0',
                      }}
                    >
                      Aa Bb
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">Body</p>
                    <p
                      style={{
                        fontFamily: fontFamilyFromLabel(winner.body),
                        fontSize: '1rem',
                        margin: '0.5rem 0',
                      }}
                    >
                      Aa Bb
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
        onDrawerToggle={(isOpen) => console.log('Drawer toggled:', isOpen)}
      >
        <div className="focus-card">
          <p className="focus-hint text-center">Winner</p>
          <p
            style={{
              fontFamily: fontFamilyFromLabel(winner.heading),
              fontWeight: 700,
              fontSize: 'clamp(1.5rem, 6vw, 2rem)',
              margin: '0.5rem 0',
              color: 'var(--text-primary)',
              textAlign: 'center',
            }}
          >
            Aa Bb Cc
          </p>
          <p className="focus-hint text-center" style={{ marginBottom: '1.5rem' }}>{winner.label}</p>
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={applyWinner}
            >
              Use this pairing
            </Button>
          </div>
        </div>
      </FocusShell>
    )
  }

  return (
    <FocusShell
      stepLabel="05 // Design"
      stepIndex={1}
      stepCount={3}
      showPreviewDrawer={true}
      onExit={exitFocus}
      drawerContent={
        <div>
          <h3 className="font-semibold mb-2">Current Comparison</h3>
          <div className="space-y-4">
            {bracket.map((pair, i) => (
              <div key={pair.id} className="border rounded p-3">
                <p className="font-semibold mb-1">{pair.label}</p>
                <div className="space-x-4">
                  <div className="text-center">
                    <p className="text-sm font-medium">Heading</p>
                    <p
                      style={{
                        fontFamily: fontFamilyFromLabel(pair.heading),
                        fontWeight: 700,
                        fontSize: '1.25rem',
                      }}
                    >
                      Aa Bb
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Body</p>
                    <p
                      style={{
                        fontFamily: fontFamilyFromLabel(pair.body),
                        fontSize: '0.875rem',
                      }}
                    >
                      Aa Bb
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      }
      onDrawerToggle={(isOpen) => console.log('Drawer toggled:', isOpen)}
    >
      <div className="w-full max-w-2xl">
        <p className="focus-prompt text-center">Which pairing wins?</p>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          {bracket.map((pair, i) => (
            <div
              key={pair.id}
              onClick={() => pick(pair)}
              className="flex-1 cursor-pointer border border-border rounded-md bg-white p-4 hover:bg-muted/50 transition-colors"
            >
              <span className="hidden sm:block text-xs text-muted mb-2">
                {i === 0 ? '← Left arrow' : 'Right arrow →'}
              </span>
              <p
                style={{
                  fontFamily: fontFamilyFromLabel(pair.heading),
                  fontWeight: 700,
                  fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                  margin: '0.5rem 0 0.25rem',
                  color: 'var(--text-primary)',
                }}
              >
                Aa Bb
              </p>
              <p style={{ fontFamily: fontFamilyFromLabel(pair.body), fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', color: 'var(--text-secondary)' }}>
                {pair.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </FocusShell>
  )
}
