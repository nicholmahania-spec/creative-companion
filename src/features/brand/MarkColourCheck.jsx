import { useEffect, useMemo, useState } from 'react'
import { sampleImageColours } from '../../lib/brand/sampleImage'
import {
  markColourLine,
  markColourReading,
} from '../../lib/brand/markColourCheck'

/**
 * What colours the uploaded mark is actually made of, against the palette.
 *
 * ONE SLOT, ONE SENTENCE. It is always in the same place with the same
 * heading once a mark exists, so an unusual sentence reads as a different
 * fact rather than as the tool malfunctioning. There is no score, no pass,
 * no badge and no red — the Mark screen is not a place anything should be
 * flagged as wrong.
 *
 * IT NEVER SAYS "ALL GOOD". The clean state reports what it SAW ("Uses your
 * Primary and Accent") rather than vouching for the artwork, and that is
 * deliberate: this check is heavily miss-prone by design — it ignores
 * anything under 10% coverage, discards every near-white, near-black and
 * near-neutral pixel, and reads at most five colours. A designer offloading
 * vigilance onto a quiet panel would be trusting a check that never ran.
 * Naming what it found is the honest form of the same sentence, and it
 * scopes itself without a paragraph of explanation.
 *
 * NOTHING IS PERSISTED. The reading depends on the mark AND the palette, so
 * a stored result goes stale the moment a colour changes — it is recomputed
 * whenever either moves, which also means it survives a reload without a
 * schema change.
 */
export default function MarkColourCheck({
  logoImage,
  palette = [],
  labelFor,
  onUsePalette,
  onAddColour,
  paletteFull = false,
}) {
  /* ONLY THE SAMPLING IS ASYNC. The reading is pure and cheap, so it is
     derived at render rather than computed inside the effect — otherwise
     assigning a role after the check ran would leave the panel saying
     "Uses your #1B4C7E" until something else happened to remount it. */
  /* The sample carries the image it came FROM. Clearing state at the top of
     the effect instead would be a synchronous setState inside an effect —
     a cascading render, and one the lint gate rejects — and it would still
     leave a frame where a new mark is on screen beside the old mark's
     sentence. Comparing `src` makes a stale reading unrepresentable. */
  const [sample, setSample] = useState(null)

  useEffect(() => {
    if (!logoImage) return undefined
    /* Capture-before-await: sampling is long enough to switch project or
       replace the image in, and a late result must not overwrite a newer
       one. Same rule the upload handler in DesignView follows. */
    let live = true
    sampleImageColours(logoImage)
      .then((s) => live && setSample({ src: logoImage, result: s }))
      .catch(
        () =>
          live &&
          setSample({
            src: logoImage,
            result: { readable: false, reason: 'decode-failed' },
          })
      )
    return () => {
      live = false
    }
  }, [logoImage])

  const fresh = sample?.src === logoImage ? sample.result : null

  const reading = useMemo(
    () => (fresh ? markColourReading({ sample: fresh, palette, labelFor }) : null),
    [fresh, palette, labelFor]
  )

  if (!logoImage) return null
  // Nothing yet: no skeleton, no spinner. Sampling is milliseconds, and a
  // placeholder that flashes is more noticeable than the sentence arriving.
  if (!reading) return null

  const { line, action } = markColourLine(reading, { paletteFull })

  return (
    <div className="mark-colour-check">
      <span className="field-label" style={{ margin: 0 }}>
        In this mark
      </span>
      <p className="mark-colour-line">{line}</p>
      {action === 'use-palette' && onUsePalette && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onUsePalette(reading.found.map((c) => c.hex))}
        >
          Use as starting palette
        </button>
      )}
      {action === 'add-colour' && onAddColour && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onAddColour(reading.intruders[0].hex)}
        >
          Add to palette
        </button>
      )}
    </div>
  )
}
