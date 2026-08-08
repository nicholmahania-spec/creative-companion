import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import AxisTagger from './AxisTagger'
import { AXIS_IDS, strategyProfile } from '../lib/brand/alignment'
import '../styles/lazy-alignment.css'

/**
 * The words the brand should feel like, and where each sits on the rulers.
 *
 * This is the source end of decision memory: what is set here is what
 * reappears later, when type and colour are chosen. Kept deliberately small
 * — a word and five optional sliders — because it sits inside the brief,
 * and the brief must not become a form to be endured.
 *
 * Placing a word on the rulers is OPTIONAL. A word with no axes still
 * earns its place as a note to self, and forcing five sliders before a word
 * can be saved would turn a thirty-second thought into a five-decision
 * chore. Untagged words simply say nothing later, which is honest.
 */
export default function StrategyWords({ projectId, attributes = [] }) {
  const setStrategyAttributes = useAppStore((s) => s.setStrategyAttributes)
  const [draft, setDraft] = useState('')
  const [openId, setOpenId] = useState(null)

  const list = Array.isArray(attributes) ? attributes : []
  const profile = strategyProfile(list)
  const splits = AXIS_IDS.filter((a) => profile[a].split)

  const commit = (next) => setStrategyAttributes(projectId, next)

  const add = () => {
    const label = draft.trim()
    if (!label) return
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    commit([...list, { id, label }])
    setDraft('')
    setOpenId(id) // open the new word's rulers — the obvious next move
  }

  return (
    <div className="strategy-words">
      <div className="strategy-add">
        <label className="field-label" htmlFor="strategy-word">
          What should this brand feel like?
        </label>
        <div className="strategy-add-row">
          <input
            id="strategy-word"
            className="field-input"
            value={draft}
            placeholder="warm, playful, trustworthy…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={add}
            disabled={!draft.trim()}
          >
          Add word
          </button>
        </div>
      </div>

      {/* A split is worth saying HERE too, not only at the moment of choosing
          — it is a question for the client, and the brief is where client
          questions belong. */}
      {splits.length > 0 && (
        <p className="strategy-split" role="status">
          Your words pull both ways on{' '}
          {splits.map((a) => profile[a] && a).filter(Boolean).join(' and ')}.
          Worth asking which matters more.
        </p>
      )}

      {list.length > 0 && (
        <ul className="strategy-list">
          {list.map((a) => {
            const tagged = AXIS_IDS.some(
              (id) => a[id] !== null && a[id] !== undefined && a[id] !== ''
            )
            return (
              <li key={a.id} className="strategy-item">
                <div className="strategy-item-head">
                  <strong>{a.label}</strong>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setOpenId(openId === a.id ? null : a.id)}
                  >
            {tagged ? 'Adjust position' : 'Place on axis'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => commit(list.filter((x) => x.id !== a.id))}
                  >
            Remove word
                  </button>
                </div>
                {openId === a.id && (
                  <AxisTagger
                    idPrefix={`sa-${a.id}`}
                    value={a}
                    onChange={(next) =>
                      commit(
                        list.map((x) =>
                          x.id === a.id ? { ...x, ...next } : x
                        )
                      )
                    }
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
