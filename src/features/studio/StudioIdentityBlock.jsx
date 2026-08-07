import { useRef, useState } from 'react'
import {
  LOGO_TYPES,
  logoProblemText,
  prepareStudioLogo,
  resolveStudioName,
} from '../../lib/studio/studioIdentity'
import { creditedFooter } from '../../lib/book/exportFiles'

/**
 * Who client work is credited to — the studio's own name and mark.
 *
 * Account-level, not per-project. One studio, one name, however many brands
 * pass through it. This block is the canonical home; the export screen shows
 * the resulting line and links here rather than keeping a second editor, so
 * there is exactly one place this value is written.
 *
 * THE PREVIEW IS THE POINT, and it is why there is no warning here. The old
 * design's real defect was not that the field was hard to find — it was that
 * an unset value had no representation anywhere, so a designer had no way to
 * notice their name was missing from work already sent. The fix is to render
 * the outcome, always, in both states:
 *
 *     Every page says:  Sparrow's Promise · 7 Aug 2026
 *     Every page says:  Sparrow's Promise · Mahania Studio · 7 Aug 2026
 *
 * A warning would be a claim about a deficiency, which is a decision to
 * decode and a thing to feel. A rendered output line is just information about
 * the file: the gap is self-evident because the name plainly is not in the
 * string, and the product never says anyone failed. PRODUCT.md §21 rules out
 * the badge/dot/percentage version of this outright.
 */
export default function StudioIdentityBlock({ prefs = {}, setPref, flashToast }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  const name = resolveStudioName(prefs)
  const logo = String(prefs.studioLogo || '').trim()
  /* Sample date, not today's — this line describes the shape of the footer,
     and a date that changes daily invites reading it as a live status. */
  const preview = creditedFooter(['Sparrow’s Promise', name, '7 Aug 2026'])

  /* An explicit name overrides; an empty field falls back to the invoice
     identity. Showing the fallback as the input's value would be a lie — the
     designer would edit a field they never set — so it is a placeholder. */
  const inherited = !String(prefs.studioName || '').trim() && Boolean(name)

  async function pickLogo(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProblem('')
    setBusy(true)
    try {
      const res = await prepareStudioLogo(file)
      if (!res.ok) {
        setProblem(logoProblemText(res.reason))
        return
      }
      setPref('studioLogo', res.dataUrl)
      flashToast?.('Logo saved')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel brand-section" id="settings-studio-identity">
      <div className="brand-section-label">Your studio</div>

      <div className="field-block">
        <label className="field-label" htmlFor="studio-identity-name">
          Business name
        </label>
        <input
          id="studio-identity-name"
          className="field-input"
          type="text"
          value={prefs.studioName || ''}
          placeholder={inherited ? name : 'Your studio name'}
          onChange={(e) => setPref('studioName', e.target.value)}
        />
        {inherited ? (
          <p className="book-setup-state">
            Using “{name}” from your invoice details. Type here to use something
            else.
          </p>
        ) : null}
      </div>

      <div className="field-block">
        <span className="field-label">Logo</span>
        {logo ? (
          <div className="studio-logo-row">
            <img className="studio-logo-preview" src={logo} alt="Your studio logo" />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setPref('studioLogo', '')
                flashToast?.('Logo removed')
              }}
            >
              Remove
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? 'Adding…' : logo ? 'Replace logo' : 'Add a logo'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={LOGO_TYPES}
          className="sr-only"
          aria-label="Choose a logo image"
          onChange={pickLogo}
        />
        {problem ? <p className="book-setup-state">{problem}</p> : null}
        {/* Says what happens to the file, because "it got smaller" is
            otherwise a surprise a designer would reasonably read as damage. */}
        <p className="book-setup-state">
          Stored at footer size, not print size — the original file on your
          machine is untouched.
        </p>
      </div>

      {/* "Every page you send says:" asserted this as fact, and the sample
          data made that assertion false for a new user — someone who has just
          set a password, has no studio name and one project called "My
          project" was told their outgoing pages carry a client they have
          never heard of. Rendering the outcome is still the point (see the
          note at the top of this file); it just has to read as the example it
          is. The sample name and fixed date are deliberate and unchanged. */}
      <p className="book-setup-state">
        For example, a page you send reads: {preview}
      </p>
    </section>
  )
}
