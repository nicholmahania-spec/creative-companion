import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import AxisTagger from './AxisTagger'
import { AXIS_IDS, strategyProfile } from '../lib/brand/alignment'
import { BRIEF_PROVENANCE } from '../lib/brand/briefWords'
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
 *
 * THE LIST STARTS FULL, NOT EMPTY. The brief already asks the client what
 * the brand should feel like — "three words", "how should people feel", and
 * the four positioning spectrums — and `seedStrategyAttributes` hands those
 * answers over here as words. So this is a review surface: the designer
 * reads what the client said, adjusts a placement, removes a word, or adds
 * one of their own. It used to open with the same question the brief had
 * just asked, in the same words, above an empty box — the form-dump this
 * product exists to prevent. Provenance is a quiet suffix, and a placement
 * the lexicon guessed says so, because one adjective is not one number
 * across brands and the designer's adjustment is what settles it.
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

  const fromBrief = list.filter((a) => a.fromBrief).length

  return (
    <div className="strategy-words">
      <h2 className="strategy-title">Words this brand should feel like</h2>
      <p className="strategy-lede">
        {fromBrief > 0
          ? 'Started from the brief. Adjust a placement, remove a word, or add your own.'
          : 'Answers to the feel and three-words questions above land here on their own.'}
      </p>

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
                  <strong>
                    {a.label}
                    {a.fromBrief ? (
                      <span className="strategy-from-brief">
                        {` · ${BRIEF_PROVENANCE}${
                          a.suggested && tagged ? ', rough placement' : ''
                        }`}
                      </span>
                    ) : null}
                  </strong>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setOpenId(openId === a.id ? null : a.id)}
                  >
                    {tagged ? 'Adjust' : 'Place it'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => commit(list.filter((x) => x.id !== a.id))}
                  >
                    Remove
                  </button>
                </div>
                {openId === a.id && (
                  <AxisTagger
                    idPrefix={`sa-${a.id}`}
                    value={a}
                    onChange={(next) =>
                      commit(
                        list.map((x) =>
                          x.id === a.id
                            ? { ...x, ...next, suggested: false }
                            : x
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

      {/* The designer's own word, after the client's. Secondary on purpose:
          most lists are complete before anyone types here. */}
      <div className="strategy-add">
        <label className="field-label" htmlFor="strategy-word">
          Add a word of your own
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
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
