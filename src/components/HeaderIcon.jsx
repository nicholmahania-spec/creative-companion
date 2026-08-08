/**
 * Flat line icons for header chrome buttons — matches PathStepIcon's
 * stroke style. Real icons, not emoji (emoji render as colorful
 * platform glyphs and break the flat grayscale system).
 */
const ICONS = {
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9h12v-9" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 9.5h16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8 3.5v3.5M16 3.5v3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3.5 19.5c.6-3.4 2.8-5 5.5-5s4.9 1.6 5.5 5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="16.5" cy="9.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M14.8 15c1.9.3 3.4 1.5 4 4.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 9v4l2.8 1.6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 2.5h5M12 4.5V2.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  helper: (
    <>
      <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4.5 19.5c.9-4.3 3.6-6.5 7.5-6.5s6.6 2.2 7.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  list: (
    <>
      <circle cx="5.5" cy="7" r="1.15" fill="currentColor" />
      <circle cx="5.5" cy="12" r="1.15" fill="currentColor" />
      <circle cx="5.5" cy="17" r="1.15" fill="currentColor" />
      <path d="M9.5 7h9M9.5 12h9M9.5 17h9" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  print: (
    <>
      <path d="M6.5 8.5v-5h11v5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3.5" y="8.5" width="17" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <rect x="6.5" y="14" width="11" height="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </>
  ),
  tools: (
    <path
      d="M14.7 6.3a3.5 3.5 0 0 0-4.62 4.62L4.5 16.5a1.5 1.5 0 0 0 2.12 2.12l5.58-5.58a3.5 3.5 0 0 0 4.62-4.62l-2.2 2.2-1.9-.6-.6-1.9 2.2-2.2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  account: (
    <>
      <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4.5 19.5c.9-4.3 3.6-6.5 7.5-6.5s6.6 2.2 7.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  /* ---- Added 2026-08-07 --------------------------------------------------
     These nine replace typographic characters that were standing in for
     icons in the sidebar and the Tools menu — ⚙ ▦ ✦ ◎ ↗ ⬇ ☰ ✕ and the
     literal ASCII `$` and `?`. A character is not an icon: it carries the
     font's weight and baseline rather than the 1.75 stroke every real icon
     here uses, so the Tools menu was drawing three icons and six letters in
     one column. Same 24-box, same stroke, same caps as the set above.
     `book` and `library` exist because Brand book and Asset library — two
     different destinations — were both drawing `print`. */
  settings: (
    <>
      <path d="M4 7h6M14 7h6M4 17h10M18 17h2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16" cy="17" r="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </>
  ),
  directory: (
    <>
      <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4.5 19.5c.9-4.3 3.6-6.5 7.5-6.5s6.6 2.2 7.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  desk: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3.5 9.5h17M10 9.5v10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  ideate: (
    <path
      d="M12 3.2l1.9 4.9 4.9 1.9-4.9 1.9L12 16.8l-1.9-4.9L5.2 10l4.9-1.9L12 3.2ZM18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  review: (
    <>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </>
  ),
  share: (
    <>
      <path d="M14 4.5h5.5V10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 4.5 11 13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M18 14.5v3.7a2 2 0 0 1-2 2H6.3a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </>
  ),
  download: (
    <>
      <path d="M12 3.8v10.4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="m7.8 10.2 4.2 4.2 4.2-4.2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 17.5v1.2a1.8 1.8 0 0 0 1.8 1.8h11.4a1.8 1.8 0 0 0 1.8-1.8v-1.2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  invoice: (
    <>
      <path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-2.4-1.6L8.4 20.5 6 18.9V3.5Z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9.5 8.5h5M9.5 12.5h5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9.6 9.6a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.6" r="1.05" fill="currentColor" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5h9.5a3 3 0 0 1 3 3v12H8a3 3 0 0 0-3 3V4.5Z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M8.5 8.5h6M8.5 12h6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  library: (
    <>
      <rect x="3.5" y="4" width="5" height="16" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <rect x="10" y="4" width="4.4" height="16" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="m16.6 5.6 3.4 14.1" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  menu: (
    <path d="M4.5 7h15M4.5 12h15M4.5 17h15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  ),
  close: (
    <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  ),
  /* Client-inbox row kinds. Three of these six were emoji (💬 📋 📖), which
     is the exact case this file's own header warns about: emoji render as
     colourful platform glyphs and break the flat grayscale system. */
  check: (
    <path d="m5 12.5 4.6 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  ),
  pencil: (
    <>
      <path d="M4.5 19.5h3.2L18.4 8.8a1.9 1.9 0 0 0 0-2.7l-.5-.5a1.9 1.9 0 0 0-2.7 0L4.5 16.3v3.2Z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="m13.9 7.4 2.7 2.7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  message: (
    <path
      d="M20 12.4c0 3.9-3.6 7-8 7a9 9 0 0 1-2.6-.4L4.5 20.5l1.3-3.5A6.6 6.6 0 0 1 4 12.4c0-3.9 3.6-7 8-7s8 3.1 8 7Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
  ),
  form: (
    <>
      <rect x="5" y="4.5" width="14" height="15.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9.2 3.3h5.6v2.6H9.2z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 11h6M9 15h4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </>
  ),
  quote: (
    <path
      d="M9.5 6.5C6.8 8 5.5 10.2 5.5 13v4.5h5V12H8c0-1.9.7-3.3 2.4-4.3l-.9-1.2Zm9 0C15.8 8 14.5 10.2 14.5 13v4.5h5V12H17c0-1.9.7-3.3 2.4-4.3l-.9-1.2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
}

export default function HeaderIcon({ name, className = '' }) {
  const body = ICONS[name]
  if (!body) return null
  return (
    <svg
      className={`header-icon-svg ${className}`.trim()}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  )
}
