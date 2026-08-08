/**
 * Brand-recognition-product templates — letterhead, business card,
 * envelope, email signature. Filled with the project's real palette,
 * type, logo, and org contact info; exportable as finished files.
 */
import { useRef, useState } from 'react'
import { fontFamilyFromLabel, mapPaletteRoles, normalizeHex, bestTextOn } from '../lib/color'
import { elementToPdf, elementToPng, PAGE_SIZES } from '../lib/book/stationery'
/* Stationery rules live in lazy-design.css; import here so Assets can load
   the kit without visiting Identity first. */
import '../styles/lazy-design.css'
import { effectiveWord } from '../lib/brand/briefWords'

export default function StationeryKit({
  activeProject = {},
  projectPalette = [],
  updateBrandField,
  addContact,
  updateContact,
  removeContact,
  flashToast,
}) {
  const roles = mapPaletteRoles(projectPalette)
  const cover = normalizeHex(activeProject.colorRoles?.cover) || roles.cover
  const accent = normalizeHex(activeProject.colorRoles?.accent) || roles.accent
  const headingFont = fontFamilyFromLabel(activeProject.typeHeading)
  const bodyFont = fontFamilyFromLabel(activeProject.typeBody)
  const orgName = activeProject.logoWordmark || activeProject.name || 'Organization'
  const contacts = activeProject.contacts || []

  const [activeContactId, setActiveContactId] = useState(contacts[0]?.id || '')
  const activeContact = contacts.find((c) => c.id === activeContactId) || contacts[0] || null

  const letterheadRef = useRef(null)
  const envelopeRef = useRef(null)
  const cardRef = useRef(null)
  const sigRef = useRef(null)

  const [busy, setBusy] = useState('')

  const runExport = async (key, fn) => {
    setBusy(key)
    try {
      const r = await fn()
      if (r?.ok) flashToast?.('Downloaded')
      else flashToast?.(r?.error || 'Could not export')
    } catch (err) {
      flashToast?.(err?.message || 'Could not export')
    } finally {
      setBusy('')
    }
  }

  const contactBlock = activeContact
    ? [activeContact.name, activeContact.title].filter(Boolean).join(' · ')
    : orgName

  return (
    <div className="stationery-kit">
      <div className="stationery-form">
        <div className="field-block">
          <label className="field-label" htmlFor="org-address">Address</label>
          <input
            id="org-address"
            className="field-input"
            value={activeProject.orgAddress || ''}
            onChange={(e) => updateBrandField('orgAddress', e.target.value)}
            placeholder="123 Main St, City, ST 00000"
          />
        </div>
        <div className="stationery-form-row">
          <div className="field-block">
            <label className="field-label" htmlFor="org-phone">Phone</label>
            <input
              id="org-phone"
              className="field-input"
              value={effectiveWord(activeProject, 'orgPhone').value}
              onChange={(e) => updateBrandField('orgPhone', e.target.value)}
              placeholder="(555) 555-0100"
            />
          </div>
          <div className="field-block">
            <label className="field-label" htmlFor="org-email">Email</label>
            <input
              id="org-email"
              className="field-input"
              value={effectiveWord(activeProject, 'orgEmail').value}
              onChange={(e) => updateBrandField('orgEmail', e.target.value)}
              placeholder="you@yourstudio.com"
            />
          </div>
          <div className="field-block">
            <label className="field-label" htmlFor="org-website">Website</label>
            <input
              id="org-website"
              className="field-input"
              value={activeProject.orgWebsite || ''}
              onChange={(e) => updateBrandField('orgWebsite', e.target.value)}
              placeholder="www.org.org"
            />
          </div>
        </div>

        <div className="stationery-contacts">
          <div className="stationery-contacts-head">
            <span className="field-label">Contacts (for business cards / signature)</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addContact}>
              + Add contact
            </button>
          </div>
          {contacts.map((c) => (
            <div key={c.id} className="stationery-contact-row">
              <input
                className="field-input"
                value={c.name}
                onChange={(e) => updateContact(c.id, 'name', e.target.value)}
                placeholder="Name"
              />
              <input
                className="field-input"
                value={c.title}
                onChange={(e) => updateContact(c.id, 'title', e.target.value)}
                placeholder="Title"
              />
              <input
                className="field-input"
                value={c.phone}
                onChange={(e) => updateContact(c.id, 'phone', e.target.value)}
                placeholder="Phone"
              />
              <input
                className="field-input"
                value={c.email}
                onChange={(e) => updateContact(c.id, 'email', e.target.value)}
                placeholder="Email"
              />
              <button
                type="button"
                className="asset-audit-remove"
                aria-label={`Remove ${c.name || 'contact'}`}
                onClick={() => removeContact(c.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="stationery-templates">
        {/* Letterhead */}
        <div className="stationery-card">
          <div className="stationery-card-head">
            <span>Letterhead</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy === 'letterhead'}
              onClick={() =>
                runExport('letterhead', () =>
                  elementToPdf(letterheadRef.current, {
                    ...PAGE_SIZES.letterhead,
                    filename: `${orgName}-letterhead.pdf`,
                  })
                )
              }
            >
              {busy === 'letterhead' ? 'Exporting…' : 'Download PDF'}
            </button>
          </div>
          <div className="stationery-preview-wrap">
            <div
              ref={letterheadRef}
              className="stationery-letterhead"
              style={{ fontFamily: bodyFont }}
            >
              <div className="stationery-letterhead-header" style={{ borderColor: accent }}>
                {activeProject.logoImage ? (
                  <img src={activeProject.logoImage} alt="" className="stationery-logo-img" />
                ) : (
                  <span style={{ fontFamily: headingFont, color: cover }}>{orgName}</span>
                )}
              </div>
              <div className="stationery-letterhead-body" />
              {(() => {
                const line = [
                  activeProject.orgAddress,
                  effectiveWord(activeProject, 'orgPhone').value,
                  effectiveWord(activeProject, 'orgEmail').value,
                  activeProject.orgWebsite,
                ]
                  .filter(Boolean)
                  .join('   ·   ')
                return (
                  <div
                    className="stationery-letterhead-footer"
                    style={{ borderColor: accent }}
                    data-placeholder={line ? undefined : 'true'}
                  >
                    {line || 'Address · Phone · Email · Website'}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Business card */}
        <div className="stationery-card">
          <div className="stationery-card-head">
            <span>Business card</span>
            {contacts.length > 1 && (
              <select
                className="asset-audit-status-select"
                value={activeContactId}
                onChange={(e) => setActiveContactId(e.target.value)}
                aria-label="Contact"
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || 'Untitled contact'}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy === 'card' || !contacts.length}
              onClick={() =>
                runExport('card', () =>
                  elementToPdf(cardRef.current, {
                    ...PAGE_SIZES.businessCard,
                    filename: `${activeContact?.name || orgName}-business-card.pdf`,
                  })
                )
              }
            >
              {busy === 'card' ? 'Exporting…' : 'Download PDF'}
            </button>
          </div>
          {!contacts.length ? (
            <p className="asset-audit-empty">Add a contact above to generate a business card.</p>
          ) : (
            <div className="stationery-preview-wrap">
              <div
                ref={cardRef}
                className="stationery-card-face"
                style={{ background: cover, color: bestTextOn(cover), fontFamily: bodyFont }}
              >
                <div
                  style={{ fontFamily: headingFont }}
                  className="stationery-card-name"
                  data-placeholder={activeContact?.name ? undefined : 'true'}
                >
                  {activeContact?.name || 'Name'}
                </div>
                <div
                  className="stationery-card-title"
                  data-placeholder={activeContact?.title ? undefined : 'true'}
                >
                  {activeContact?.title || 'Title'}
                </div>
                <div className="stationery-card-contact">
                  {[activeContact?.phone, activeContact?.email].filter(Boolean).join('  ·  ')}
                </div>
                <div className="stationery-card-org" style={{ color: accent }}>
                  {orgName}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Envelope */}
        <div className="stationery-card">
          <div className="stationery-card-head">
            <span>Envelope (#10)</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy === 'envelope'}
              onClick={() =>
                runExport('envelope', () =>
                  elementToPdf(envelopeRef.current, {
                    ...PAGE_SIZES.envelope,
                    filename: `${orgName}-envelope.pdf`,
                  })
                )
              }
            >
              {busy === 'envelope' ? 'Exporting…' : 'Download PDF'}
            </button>
          </div>
          <div className="stationery-preview-wrap">
            <div
              ref={envelopeRef}
              className="stationery-envelope"
              style={{ fontFamily: bodyFont }}
            >
              <div className="stationery-envelope-return">
                <strong style={{ fontFamily: headingFont, color: cover }}>{orgName}</strong>
                <span>{activeProject.orgAddress || 'Return address'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Email signature */}
        <div className="stationery-card">
          <div className="stationery-card-head">
            <span>Email signature</span>
            <div className="stationery-card-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  navigator.clipboard?.writeText(sigRef.current?.innerHTML || '')
                  flashToast?.('Signature HTML copied')
                }}
              >
                Copy HTML
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busy === 'sig'}
                onClick={() =>
                  runExport('sig', () =>
                    elementToPng(sigRef.current, `${activeContact?.name || orgName}-email-signature.png`)
                  )
                }
              >
                {busy === 'sig' ? 'Exporting…' : 'Download PNG'}
              </button>
            </div>
          </div>
          <div className="stationery-preview-wrap">
            <div ref={sigRef} className="stationery-signature" style={{ fontFamily: bodyFont }}>
              <div style={{ fontFamily: headingFont, color: cover }} className="stationery-sig-name">
                {contactBlock}
              </div>
              <div className="stationery-sig-org" style={{ color: accent }}>
                {orgName}
              </div>
              <div className="stationery-sig-contact">
                {[effectiveWord(activeProject, 'orgPhone').value, effectiveWord(activeProject, 'orgEmail').value, activeProject.orgWebsite]
                  .filter(Boolean)
                  .join('  ·  ')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
