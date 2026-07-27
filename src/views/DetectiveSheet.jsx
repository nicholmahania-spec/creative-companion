/**
 * Define — Design Detective Sheet as chaptered studio workspace.
 * Three focus cards · micro-icons · hyper-focus fields · clean inputs.
 */
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
  DETECTIVE_CHAPTERS,
  getDetectiveProgress,
  getRequiredEmpty,
  isFilled,
  START_HERE_CAP,
} from '../lib/detectiveBrief'
import useIsMobile from '../lib/useIsMobile'
import BriefSpectrum from '../components/BriefSpectrum'
import {
  trackDetectiveFieldUpdate,
  trackChapterNavigation,
  startPerformanceTimer,
  endPerformanceTimer
} from '../lib/analytics'

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
  const groups = [
    { key: 'included', label: 'Included', items: field.options.filter((o) => !o.extra) },
    { key: 'extra', label: 'Quoted separately', items: field.options.filter((o) => o.extra) },
  ]
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
}) {
  const [openChapterLocal, setOpenChapterLocal] = useState('core')
  const openChapter = openChapterProp ?? openChapterLocal
  const setOpenChapter = onOpenChapter ?? setOpenChapterLocal
  const [focusField, setFocusField] = useState(null)
  const isMobile = useIsMobile()
  /** Desktop split = one continuous master scroll; mobile split = accordion */
  const accordion = !splitMode || isMobile

  const progress = useMemo(() => getDetectiveProgress(detective), [detective])
  const chapterStats = progress.chapters

  /** Shared with DefineStartHere — the sheet needs it to decide which
   * chapter to open on arrival, the header band needs it for the jump
   * buttons, and two copies of "which required fields are still empty"
   * would eventually disagree. */
  const requiredEmpty = useMemo(() => getRequiredEmpty(detective), [detective])

  const startHere = useMemo(
    () => requiredEmpty.slice(0, START_HERE_CAP),
    [requiredEmpty]
  )

  /** Jump straight to one named field. Opening the chapter first matters in
   * accordion mode, where the input is not mounted until it opens. */
  const jumpToField = useCallback(
    (fieldId, chapterId) => {
      if (chapterId) {
        setOpenChapter(chapterId)
        trackChapterNavigation(chapterId, 'open')
      }
      requestAnimationFrame(() => {
        const el =
          document.getElementById(`detective-${fieldId}`) ||
          // Checklist fields have no single input to focus — land on the
          // first checkbox so the jump still puts the cursor on the work.
          document
            .getElementById(`detective-field-${fieldId}`)
            ?.querySelector('input[type="checkbox"]')
        if (!el) return
        el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
        el.focus()
      })
    },
    [setOpenChapter]
  )

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
      {/* Named remaining work, front and centre. Four labels to read instead
          of thirty-five, and each one is a jump, not a reminder to go find it. */}
      {showStartHere && (
        <div className={`define-start-here${requiredEmpty.length === 0 ? ' is-done' : ''}`}>
          {startHere.length > 0 ? (
            <>
              <p className="define-start-here-title">
                Start with {startHere.length === 1 ? 'this one' : `these ${startHere.length}`}
              </p>
              <div className="define-start-here-list">
                {startHere.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="btn btn-primary"
                    onClick={() => jumpToField(f.id, f.chapterId)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="define-start-here-title">
              Everything needed is answered — the rest is optional detail.
            </p>
          )}
        </div>
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
                  trackChapterNavigation(ch.id, 'open')
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
                <span className="define-chapter-tab-num" aria-hidden="true">
                  {st.complete ? '✓' : ch.num}
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
                  {st?.complete && (
                    <span className="define-chapter-done-chip" aria-label="Complete">
                      ✓
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
                          <div className="define-spectrum-row">
                            <BriefSpectrum
                              field={f}
                              value={detective?.[f.id] || ''}
                              onChange={(v) => {
                                updateDetective?.(f.id, v)
                                trackDetectiveFieldUpdate(f.id, v, ch.id)
                              }}
                              idPrefix="detective"
                            />
                            {filled && (
                              <span className="define-field-check" aria-hidden="true">
                                ✓
                              </span>
                            )}
                          </div>
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
                        {f.type === 'checklist' ? (
                          <ChecklistField
                            field={f}
                            selected={detective?.[f.id]}
                            onToggle={(next) => {
                              updateDetective?.(f.id, next)
                              trackDetectiveFieldUpdate(f.id, next.join(', '), ch.id)
                            }}
                          />
                        ) : f.area ? (
                          <textarea
                            id={`detective-${f.id}`}
                            className="define-input field-input"
                            rows={3}
                            value={detective?.[f.id] || ''}
                            onChange={(e) => {
                              const fieldId = f.id;
                              const startTime = `detective_field_${fieldId}_${Date.now()}`;
                              startPerformanceTimer(startTime);
                              updateDetective?.(f.id, e.target.value);
                              trackDetectiveFieldUpdate(f.id, e.target.value, ch.id);
                              endPerformanceTimer(startTime, { fieldId, chapterId: ch.id });
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
                              const fieldId = f.id;
                              const startTime = `detective_field_${fieldId}_${Date.now()}`;
                              startPerformanceTimer(startTime);
                              updateDetective?.(f.id, e.target.value);
                              trackDetectiveFieldUpdate(f.id, e.target.value, ch.id);
                              endPerformanceTimer(startTime, { fieldId, chapterId: ch.id });
                            }}
                            onFocus={() => setFocusField(f.id)}
                            onBlur={() => setFocusField(null)}
                            placeholder={f.tip || undefined}
                          />
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
