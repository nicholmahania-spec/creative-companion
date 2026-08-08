import { useMemo, useRef, useState } from 'react'
import { sampleFileColours, CHECKABLE_TYPES } from '../../lib/brand/checkFile'
import {
  applicationColourLine,
  CHECK_SCOPE_NOTE,
  applicationColourReading,
} from '../../lib/brand/applicationCheck'

/**
 * The finished piece, checked against the brand's colours — on the surface
 * it belongs to, with no filing.
 *
 * WHY THIS IS NOT AN ASSET LIBRARY. The Touchpoints screen already lists
 * exactly the deliverables this project has, derived from the brief: Business
 * card, Social, Packaging, Signage. Each already has a card, a mock and a
 * note. So the slot the designer would have to CREATE in an asset library
 * already exists here, already named, already attached to the right project.
 * Dropping a file on it costs one click and zero decisions — no category to
 * pick, no name to type, no folder to choose, no tag. The surface IS the
 * filing, and it was already on screen.
 *
 * THE ARTWORK IS NOT KEPT. Only the READING is stored — five hexes and their
 * coverages, plus the file name, which is about two hundred bytes. That is
 * not a storage optimisation dressed up as a principle; it is the product
 * thesis. The work lives in Illustrator and Dropbox where the designer put
 * it. Keeping a copy would make this a filing system with two sources of
 * truth, and would put a multi-megabyte deliverable into a localStorage
 * budget that already carries several hundred kilobytes per project.
 *
 * A consequence worth stating: because the SAMPLE is stored rather than the
 * sentence, the reading is recomputed against the CURRENT palette on every
 * render. Change a role colour and the line updates without re-uploading —
 * the same rule `MarkColourCheck` follows, for the same reason.
 */
export default function ApplicationCheck({
  check = null,
  palette = [],
  labelFor,
  onChecked,
  onClear,
  label = 'this',
}) {
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  const reading = useMemo(
    () => (check ? applicationColourReading({ sample: check, palette, labelFor }) : null),
    [check, palette, labelFor]
  )

  const handle = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const sample = await sampleFileColours(file)
      onChecked?.({
        colours: sample.colours || [],
        readable: !!sample.readable,
        reason: sample.reason,
        pages: sample.pages,
        fileName: file.name || '',
        at: new Date().toISOString(),
      })
    } catch {
      /* A thrown sampler is still an answer, and it is the answer that must
         never look like a clean result. Phase 6 puts this in scope by name:
         silence must not read as "checked and fine". */
      onChecked?.({
        colours: [],
        readable: false,
        reason: 'decode-failed',
        fileName: file.name || '',
        at: new Date().toISOString(),
      })
    } finally {
      setBusy(false)
    }
  }

  const { line } = reading ? applicationColourLine(reading) : { line: '' }
  const swatches = reading
    ? [...(reading.intruders || []), ...(reading.present || [])].slice(0, 5)
    : []

  return (
    <div className="app-check">
      <input
        ref={inputRef}
        type="file"
        accept={CHECKABLE_TYPES}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          handle(file)
        }}
      />
      {!check && !busy && (
        /* The copy names the file, not the feature. "Check colours" asks the
           designer to work out what would be checked and against what; "Check
           the finished file" is the thing they just did in Illustrator. */
        <button
          type="button"
          className="btn btn-ghost btn-sm app-check-open"
          onClick={() => inputRef.current?.click()}
        >
          Check the finished file
        </button>
      )}

      {busy && (
        /* A spinner IS warranted here where it is not on the Mark screen: a
           six-page print PDF takes a second or two, and silence after a click
           reads as a click that did not land. */
        <p className="app-check-line" role="status">
          Reading {label}…
        </p>
      )}

      {check && !busy && (
        <div className="app-check-result">
          <p className="app-check-line">{line}</p>
          {/* Always, in every result state — including the clean one, which is
              the state most likely to be read as approval. */}
          <p className="app-check-scope">{CHECK_SCOPE_NOTE}</p>
          {swatches.length > 0 && (
            <div className="app-check-swatches" aria-hidden="true">
              {swatches.map((c) => (
                <span
                  key={c.hex}
                  className="app-check-swatch"
                  style={{ background: c.hex }}
                  title={c.hex}
                />
              ))}
            </div>
          )}
          <p className="app-check-file">
            {check.fileName || 'file'}
            {check.pages > 1 ? ` · ${check.pages} pages` : ''}
          </p>
          <div className="app-check-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => inputRef.current?.click()}
            >
              Check another file
            </button>
            {onClear && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onClear}
              >
                Clear result
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
