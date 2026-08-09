import { useMemo, useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { isFavorite, samplePinId } from '../../lib/brand/favorites'
import { nextPair } from '../../lib/discovery/samples'
import { discoveryObservations, MIN_CHOICES } from '../../lib/discovery/observations'
import { loadBrandFamilies } from '../../lib/book/fontLoader'
import '../../styles/lazy-discovery.css'

/**
 * Two things, one question: which is closer.
 *
 * The brief asks people to describe what they want. Visual Discovery asks them
 * to point at it. Everything on this block is either a sample or the choice
 * between two — the observation only appears once there is something honest to
 * say, and the methodology never appears at all.
 */

const CATEGORIES = [
  { id: 'type', label: 'Type' },
  { id: 'color', label: 'Color' },
]

function TypeSample({ sample }) {
  return (
    <span
      className="vd-type"
      style={{ fontFamily: `"${sample.family}", serif`, fontWeight: sample.weight }}
    >
      Aa
    </span>
  )
}

function ColorSample({ sample }) {
  return <span className="vd-color" style={{ background: sample.hex }} />
}

export default function VisualDiscovery({ project }) {
  const record = useAppStore((s) => s.recordDiscoveryChoice)
  const setVerdict = useAppStore((s) => s.setDiscoveryVerdict)
  const clear = useAppStore((s) => s.clearDiscovery)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const moodItems = useAppStore((s) => s.moodItems)
  const [category, setCategory] = useState('type')
  const [round, setRound] = useState(0)

  const choices = project?.visualDiscovery?.choices || []
  const verdict = project?.visualDiscovery?.verdict || null

  /* One stable seed per project, so a half-finished comparison does not
     change under a re-render. */
  const seed = useMemo(() => {
    const s = String(project?.id || 'seed')
    let h = 2166136261
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619) >>> 0
    }
    return h
  }, [project?.id])

  const seen = choices
    .filter((c) => c.category === category)
    .flatMap((c) => c.shown.map((k) => k.replace(/^sample:/, '')))

  const pair = nextPair(category, seed, round, seen)
  const observed = discoveryObservations(project)
  const done = choices.filter((c) => c.category === category).length

  /* Real letterforms or the comparison is meaningless. */
  useMemo(() => {
    if (!pair || category !== 'type') return
    loadBrandFamilies?.(pair.map((s) => s.family))
  }, [pair, category])

  /* THE HEART HAS TO SHOW. It used to pass a hardcoded `true` with no pressed
     state and no styling, so a press left no mark anywhere the designer was
     looking — which for someone who is choosing by reaction is the same as the
     button not existing. Read the state back and let a second press undo. */
  const kept = (sample) =>
    isFavorite(
      moodItems.find((m) => String(m.id) === samplePinId(sample.id))
    )

  const choose = (picked) => {
    if (!pair) return
    record({
      category,
      shown: pair.map((s) => `sample:${s.id}`),
      chose: `sample:${picked.id}`,
    })
    setRound((r) => r + 1)
  }

  return (
    <section className="vd" aria-labelledby="vd-heading">
      <div className="vd-head">
        <h3 className="vd-title" id="vd-heading">
          Which feels closer?
        </h3>
        <div className="vd-cats" role="group" aria-label="What to compare">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`vd-cat${category === c.id ? ' is-on' : ''}`}
              aria-pressed={category === c.id}
              onClick={() => {
                setCategory(c.id)
                setRound(0)
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {pair ? (
        <div className="vd-pair" role="group" aria-label="Choose one">
          {pair.map((s) => (
            <div className="vd-option" key={s.id}>
              <button
                type="button"
                className="vd-pick"
                onClick={() => choose(s)}
                aria-label={`Choose ${s.label}`}
              >
                {category === 'type' ? (
                  <TypeSample sample={s} />
                ) : (
                  <ColorSample sample={s} />
                )}
                <span className="vd-label">{s.label}</span>
              </button>
              {/* Favorite is private evidence, exactly as Phase 1 defined it.
                  It never puts anything in front of a client — it puts it on
                  the designer's own wall, where Directions reads it.

                  `dispose` because this screen is the only way back to a pin
                  it created: pressing the heart twice must leave nothing
                  behind. On the Research wall the same heart only turns off,
                  because there the card is visible and deleting it would be a
                  destructive act reported as a smaller one. */}
              <button
                type="button"
                className={`vd-fav${kept(s) ? ' is-on' : ''}`}
                aria-pressed={kept(s)}
                aria-label={`${kept(s) ? 'Remove' : 'Keep'} ${s.label}`}
                onClick={() =>
                  toggleFavorite(`sample:${s.id}`, undefined, { dispose: true })
                }
              >
                ♥
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="vd-empty">Nothing left to compare here.</p>
      )}

      {done > 0 && (
        <div className="vd-foot">
          <span className="vd-count">
            {done} {done === 1 ? 'choice' : 'choices'}
          </span>
          <button type="button" className="text-link" onClick={() => clear()}>
            Start over
          </button>
        </div>
      )}

      {/* The observation appears when there is one. Below the bar it says so
          plainly rather than reaching for a half-formed conclusion. */}
      {choices.length >= MIN_CHOICES && (
        <div className="vd-read">
          {observed.enough ? (
            <>
              <p className="vd-read-head">Your choices lean toward</p>
              <ul className="vd-lines">
                {observed.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <div className="vd-verdict">
                <button
                  type="button"
                  className={`btn btn-ghost${verdict?.status === 'accepted' ? ' is-on' : ''}`}
                  aria-pressed={verdict?.status === 'accepted'}
                  onClick={() => setVerdict('accepted')}
                >
                  That's right
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost${verdict?.status === 'rejected' ? ' is-on' : ''}`}
                  aria-pressed={verdict?.status === 'rejected'}
                  onClick={() => setVerdict('rejected')}
                >
                  Not quite
                </button>
              </div>
            </>
          ) : (
            <p className="vd-read-head">No clear lean yet.</p>
          )}
        </div>
      )}
    </section>
  )
}

