/**
 * Define — Design Detective Sheet as chaptered studio workspace.
 * Three focus cards · micro-icons · hyper-focus fields · clean inputs.
 */
import { useMemo, useState, useEffect, useRef } from 'react'
import {
  DETECTIVE_CHAPTERS,
  getDetectiveProgress,
  getRequiredEmpty,
  isFilled,
} from '../lib/detectiveBrief'
import useIsMobile from '../lib/useIsMobile'
import DefineStartHere from '../components/DefineStartHere'
import BriefSpectrum from '../components/BriefSpectrum'
import '../styles/lazy-define.css'

export { DETECTIVE_CHAPTERS, getDetectiveProgress, isFilled }

/** Smooth scrolling is a vestibular trigger for some users; honor the OS pref. */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches


/** Checkboxes, not a dropdown or a text box: the whole list has to be
 *  visible at once — a client can't tick what they can't see, and a closed
 *  control is a memory test. Items quoted separately are labelled inline so
 *  ticking one never turns into a surprise on the invoice. */
function ChecklistField({ field, selected, onToggle }) {
  const picked = Array.isArray(selected) ? selected : []
  /* Only render a group that has something in it. "Where will this be used?"
     draws from BRAND_SURFACE_OPTIONS, where nothing is marked `extra`, so an
     unconditional split rendered a "Quoted separately" legend above zero
     checkboxes — a heading that can never reflect a tick because it has no
     rows. On the client-facing routes that reads as "some of this costs
     extra" on a question about where the brand appears. Same reasoning
     already written down in projectTerms.js: an empty heading in something
     headed for a contract reads as a term agreed to be nothing. */
  const groups = [
    { key: 'included', label: 'Included', items: field.options.filter((o) => !o.extra) },
    { key: 'extra', label: 'Quoted separately', items: field.options.filter((o) => o.extra) },
  ].filter((g) => g.items.length > 0)
  return (
    <div className="define-checklist">
      {groups.map((g) => (
        <fieldset key={g.key} className="define-checklist-group">
          <legend className="define-checklist-legend">{g.label}</legend>
          {g.items.map((o) => {
            const on = picked.includes(o.id)
            return (
              <label key={o.id} className={`define-check-row${on ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    onToggle(on ? picked.filter((x) => x !== o.id) : [...picked, o.id])
                  }
                />
                <span>{o.label}</span>
              </label>
            )
          })}
        </fieldset>
      ))}
    </div>
  )
}

/** Radio group rendered as visible rows, not a <select>: a closed dropdown
 *  hides its own options until opened, which is a memory test — and this is
 *  the question that frames the whole project. */
function ChoiceField({ field, value, onPick }) {
  return (
    <div className="define-choice" role="radiogroup" aria-label={field.label}>
      {field.options.map((o) => {
        const on = value === o.id
        return (
          <label key={o.id} className={`define-check-row${on ? ' is-on' : ''}`}>
            <input
              type="radio"
              name={`detective-${field.id}`}
              checked={on}
              onChange={() => onPick(o.id)}
            />
            <span>{o.label}</span>
          </label>
        )
      })}
    </div>
  )
}

export default function DetectiveSheet({
  detective = {},
  updateDetective,
  /** Hide internal progress chrome when parent owns the dopamine timeline */
  splitMode = false,
  openChapter: openChapterProp,
  onOpenChapter,
  /** DefineView renders "Start with these" itself, up in the header band
   *  above the milestone list — see components/DefineStartHere. Standalone
   *  uses of this sheet keep their own copy. */
  showStartHere = true,
  /** The deadline lives on the project record, not in `detective` — it drives
   *  the calendar and the relative label — so it is threaded in rather than
   *  read from the answers object. */
  projectDeadline = '',
  setProjectDeadline,
}) {
  const [openChapterLocal, setOpenChapterLocal] = useState('core')
  const openChapter = openChapterProp ?? openChapterLocal
  const setOpenChapter = onOpenChapter ?? setOpenChapterLocal
  const [focusField, setFocusField] = useState(null)
  const isMobile = useIsMobile()
  const accordion = true

  const progress = useMemo(() => getDetectiveProgress(detective), [detective])
  const chapterStats = progress.chapters

  /** Shared with DefineStartHere — the sheet needs it to decide which
   * chapter to open on arrival, the header band needs it for the jump
   * buttons, and two copies of "which required fields are still empty"
   * would eventually disagree. */
  const requiredEmpty = useMemo(() => getRequiredEmpty(detective, projectDeadline), [detective, projectDeadline])

  /** On arrival, open the chapter that still needs answers — but never
   * scroll or steal focus. The page moving on its own before the user has
   * read anything forces re-orientation as the first act, re-fired on every
   * return visit, and duplicated what "Start with these" does better (an
   * explicit, user-chosen jump). Opening the right chapter is enough. */
  const didAutoStart = useRef(false)
  useEffect(() => {
    // Only when this sheet owns its own chapter state. When a parent supplies
    // `openChapter` it has already decided: DefineView resolves the stored
    // `defineOpenChapter` first and only falls back to the first incomplete
    // chapter when nothing is stored. Running anyway did not just lose that
    // race, it destroyed the record — `setOpenChapter` is the parent's
    // persisting callback, so every arrival wrote chapter 01 over wherever
    // the user actually left off. Verified before this guard: a stored
    // "constraints" came back as "overview" after a reload, which made the
    // resume feature dead for any project with an unfilled required field —
    // nearly all of them, since clientName is required.
    if (openChapterProp != null) return
    if (didAutoStart.current) return
    const first = requiredEmpty[0]
    if (!first) return
    didAutoStart.current = true
    setOpenChapter(first.chapterId)
  }, [requiredEmpty, setOpenChapter, openChapterProp])

  return (
    <div className={`define-workbook${splitMode ? ' is-split' : ''}`}>
      {/* One implementation, shared with DefineView. This used to be a second
          inlined copy of the block plus its own jumpToField — dead in the
          only live call path, since DefineView passes showStartHere={false}
          and renders the component itself. Two copies of the page's only
          anti-stall control, one of them unreachable, is exactly how a
          regression lands somewhere nobody looks. */}
      {showStartHere && (
        <DefineStartHere detective={detective} onOpenChapter={setOpenChapter} />
      )}

      {!isMobile && (
      <nav className="define-chapter-rail" aria-label="Brief chapters">
          {DETECTIVE_CHAPTERS.map((ch, i) => {
            const st = chapterStats[i]
            const active = openChapter === ch.id
            return (
              <button
                key={ch.id}
                type="button"
                className={`define-chapter-tab${active ? ' is-active' : ''}${
                  st.complete ? ' is-complete' : ''
                }${st.requiredDone && !st.complete ? ' is-ready' : ''}`}
                onClick={() => {
                  setOpenChapter(ch.id)
                  // Master-scroll mode renders every chapter at once, so the
                  // rail has to move the page, not just change which is open.
                  if (!accordion) {
                    requestAnimationFrame(() => {
                      document
                        .getElementById(`define-chapter-content-${ch.id}`)
                        ?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
                    })
                  }
                }}
                aria-current={active ? 'step' : undefined}
                aria-controls={`define-chapter-content-${ch.id}`}
              >
                {/* The tick fires when the chapter's REQUIRED work is done,
                    not when every optional field is filled. `complete` counts
                    all fields, so chapter 04 — eight fields, none required —
                    could never earn it, and adding the four spectrums pushed
                    the mark further away for work the user had already
                    finished. Reward what the page actually gates on. */}
                <span className="define-chapter-tab-num" aria-hidden="true">
                  {st.requiredDone ? '✓' : ch.num}
                </span>
                <span className="define-chapter-tab-label">{ch.railLabel || ch.title}</span>
                {/* Just the floor, no ratio. "0/5" is a number to decode
                    that produces no action, and the zero reads as a
                    scoreboard of nothing done — the same reason the sidebar
                    dropped n/7. What's left to do is the whole message. */}
                <span className="define-chapter-tab-count">
                  <span className="define-chapter-tab-need">
                    {st.requiredRemaining > 0
                      ? `${st.requiredRemaining} needed`
                      : st.requiredTotal > 0
                        ? 'needed ones done'
                        : 'none needed'}
                  </span>
                </span>
              </button>
            )
          })}
      </nav>
      )}

      <div className="define-chapters">
        {DETECTIVE_CHAPTERS.map((ch) => {
          const isOpen = openChapter === ch.id
          const st = chapterStats.find((s) => s.id === ch.id)
          // Desktop split shows every chapter's fields at once (master scroll);
          // accordion mode (standalone OR mobile split) shows one at a time.
          const showFields = accordion ? isOpen : true
          // Only fully hide the article in non-split accordion; split keeps the
          // header visible so mobile users can tap between chapters.
          const articleHidden = !splitMode && !isOpen
          return (
            <article
              key={ch.id}
              id={`define-chapter-content-${ch.id}`}
              // `is-current` carries the panel surface. Desktop split shows
              // every chapter's fields at once, so without it all five cards
              // sit at identical weight and none of them reads as "the one
              // you're in" — which is also where a Start-with-these jump lands.
              className={`define-chapter${showFields ? ' is-open' : ''}${
                isOpen ? ' is-current' : ''
              }`}
              data-chapter={ch.id}
              hidden={articleHidden}
            >
              {splitMode && accordion ? (
                <button
                  type="button"
                  className="define-chapter-head define-chapter-toggle"
                  onClick={() => setOpenChapter(ch.id)}
                  aria-expanded={isOpen}
                  aria-controls={`define-chapter-fields-${ch.id}`}
                >
                  <span className="define-chapter-badge">{ch.num}</span>
                  <h2 className="define-chapter-title">{ch.title}</h2>
                  {st?.requiredDone && (
                    <span className="define-chapter-done-chip" aria-label="Complete">
                      ✓
                    </span>
                  )}
                  {/* The rail is not rendered below 768px, so without this the
                      phone has no per-chapter "how much is left" at all — and
                      scrolling back to check costs more there, not less.
                      Reuses the string the rail already computes. */}
                  {st?.requiredRemaining > 0 && (
                    <span className="define-chapter-head-need">
                      {st.requiredRemaining} needed
                    </span>
                  )}
                  <span className="define-chapter-caret" aria-hidden="true">
                    {isOpen ? '▾' : '▸'}
                  </span>
                </button>
              ) : (
                <header className="define-chapter-head">
                  <span className="define-chapter-badge">{ch.num}</span>
                  <div>
                    <h2 className="define-chapter-title">{ch.title}</h2>
                  </div>
                  {st?.complete && (
                    <span className="define-chapter-done-chip" aria-label="Complete">
                      ✓
                    </span>
                  )}
                </header>
              )}

              <div
                className="define-fields"
                id={`define-chapter-fields-${ch.id}`}
                hidden={!showFields}>
                {ch.fields.map((f) => {
                  const focused = focusField === f.id
                  const filled = isFilled(detective?.[f.id])
                  return (
                    <div
                      key={f.id}
                      id={`detective-field-${f.id}`}
                      className={`define-field${focused ? ' is-focused' : ''}${
                        filled ? ' is-filled' : ''
                      }`}
                      data-span={f.gridSpan || 'full'}
                    >
                      {/* A spectrum is a radio group: it carries its own
                          legend, because <label for=…> can only point at one
                          control. The tick still rides along beside it. */}
                      {f.type === 'spectrum' ? (
                        <div className="define-field-control">
                          {/* No tick here. A spectrum already says it is
                              answered twice — the filled dot and the worded
                              answer line beneath it — and the tick could only
                              sit past the whole scale at the cell's right
                              edge, which is the far-edge placement removed
                              from .define-field-check for the same reason. */}
                          <BriefSpectrum
                            field={f}
                            value={detective?.[f.id] || ''}
                            onChange={(v) => {
                              updateDetective?.(f.id, v)
                            }}
                            idPrefix="detective"
                          />
                        </div>
                      ) : (
                      <>
                      <div className="define-field-label-row">
                        <label
                          className="define-field-label"
                          htmlFor={`detective-${f.id}`}
                        >
                          {f.label}
                          {/* No required asterisk. It's a convention you have
                              to already know, its tooltip never appears on
                              touch, and this view is only ever seen by the
                              person who set the brief up. The chapter rail
                              already says how many fields are needed. */}
                        </label>
                        {filled && (
                          <span className="define-field-check" aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="define-field-control">
                        {f.type === 'choice' ? (
                          <ChoiceField
                            field={f}
                            value={detective?.[f.id]}
                            onPick={(v) => {
                              updateDetective?.(f.id, v)
                            }}
                          />
                        ) : f.type === 'date' ? (
                          <input
                            id={`detective-${f.id}`}
                            type="date"
                            className="define-input field-input"
                            value={projectDeadline}
                            onChange={(e) => setProjectDeadline?.(e.target.value)}
                            onFocus={() => setFocusField(f.id)}
                            onBlur={() => setFocusField(null)}
                          />
                        ) : f.type === 'checklist' ? (
                          <ChecklistField
                            field={f}
                            selected={detective?.[f.id]}
                            onToggle={(next) => {
                              updateDetective?.(f.id, next)
                            }}
                          />
                        ) : f.area ? (
                          <textarea
                            id={`detective-${f.id}`}
                            className="define-input field-input"
                            rows={3}
                            value={detective?.[f.id] || ''}
                            onChange={(e) => {
                              updateDetective?.(f.id, e.target.value)
                            }}
                            onFocus={() => setFocusField(f.id)}
                            onBlur={() => setFocusField(null)}
                            placeholder={f.tip || undefined}
                          />
                        ) : (
                          <input
                            id={`detective-${f.id}`}
                            className="define-input field-input"
                            value={detective?.[f.id] || ''}
                            onChange={(e) => {
                              updateDetective?.(f.id, e.target.value)
                            }}
                            onFocus={() => setFocusField(f.id)}
                            onBlur={() => setFocusField(null)}
                            placeholder={f.tip || undefined}
                          />
                        )}
                        {/* Read-only — the designer doesn't re-upload here.
                            Inspiration images already landed on the Research
                            wall on submit; existing-asset files (the old
                            identity) stay reference-only in the brief. */}
                        {f.attach && Array.isArray(detective?.[`${f.id}Files`]) &&
                          detective[`${f.id}Files`].length > 0 && (
                            <div className="define-attach-thumbs">
                              {detective[`${f.id}Files`].map((file) => (
                                <a
                                  key={file.url}
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="define-attach-thumb"
                                  title={file.name || 'Attachment'}
                                >
                                  <img src={file.url} alt={file.name || 'Attachment'} />
                                </a>
                              ))}
                              {f.id === 'inspirationLinks' && (
                                <span className="define-attach-note">Also on the Research wall</span>
                              )}
                            </div>
                          )}
                      </div>
                      </>
                      )}
                    </div>
                  )
                })}
              </div>

            </article>
          )
        })}
      </div>

    </div>
  )
}
