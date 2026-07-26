/**
 * Define — Design Detective Sheet as chaptered studio workspace.
 * Three focus cards · micro-icons · hyper-focus fields · clean inputs.
 */
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
  DETECTIVE_CHAPTERS,
  getDetectiveProgress,
  isFilled,
} from '../lib/detectiveBrief'
import useIsMobile from '../lib/useIsMobile'
import {
  trackDetectiveFieldUpdate,
  trackChapterNavigation,
  startPerformanceTimer,
  endPerformanceTimer
} from '../lib/analytics'

export { DETECTIVE_CHAPTERS, getDetectiveProgress, isFilled }

export default function DetectiveSheet({
  detective = {},
  updateDetective,
  /** Hide internal progress chrome when parent owns the dopamine timeline */
  splitMode = false,
  openChapter: openChapterProp,
  onOpenChapter,
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
  const requiredReady = progress.requiredReady
  const filledCount = progress.filledCount
  const fieldTotal = progress.fieldTotal
  const progressPct = progress.pct

  const openNextIncomplete = useCallback(() => {
    const next = DETECTIVE_CHAPTERS.find((ch) => {
      const st = chapterStats.find((s) => s.id === ch.id)
      return st && !st.requiredDone
    })
    if (next) {
      setOpenChapter(next.id)
      trackChapterNavigation(next.id, 'open')
    }
  }, [chapterStats, setOpenChapter])

  /** Only the required fields actually still empty — not a static list of
   * all of them, which reads as wrong once some are filled in. */
  const requiredEmpty = useMemo(
    () =>
      DETECTIVE_CHAPTERS.flatMap((ch) =>
        ch.fields
          .filter((f) => f.required && !isFilled(detective?.[f.id]))
          .map((f) => ({ id: f.id, label: f.label, chapterId: ch.id }))
      ),
    [detective]
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
        const el = document.getElementById(`detective-${fieldId}`)
        if (!el) return
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
    if (didAutoStart.current) return
    const first = requiredEmpty[0]
    if (!first) return
    didAutoStart.current = true
    setOpenChapter(first.chapterId)
  }, [requiredEmpty, setOpenChapter])

  return (
    <div className={`define-workbook${splitMode ? ' is-split' : ''}`}>
      {!splitMode && (
        <header className="define-workbook-head">
          <div className="define-workbook-head-text">
            <p className="define-workbook-kicker">Brief</p>
            <h2 className="define-workbook-title">Brief builder</h2>
            <p className="define-workbook-lede">
              Fill before polish.
            </p>
          </div>
          <div
            className="define-workbook-progress"
            role="status"
            aria-label={`${filledCount} of ${fieldTotal} fields filled`}
          >
            <div className="define-progress-ring" style={{ '--p': progressPct }}>
              <span className="define-progress-num">{progressPct}%</span>
            </div>
            <span className="define-progress-meta">
              {filledCount}/{fieldTotal} notes
            </span>
          </div>
        </header>
      )}

      {/* Named remaining work, front and centre. Four labels to read instead
          of thirty-five, and each one is a jump, not a reminder to go find it. */}
      <div className={`define-start-here${requiredEmpty.length === 0 ? ' is-done' : ''}`}>
        {requiredEmpty.length > 0 ? (
          <>
            <p className="define-start-here-title">
              Start with {requiredEmpty.length === 1 ? 'this one' : `these ${requiredEmpty.length}`}
            </p>
            <div className="define-start-here-list">
              {requiredEmpty.slice(0, 3).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="btn btn-primary btn-sm"
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
                        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
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
                <span className="define-chapter-tab-count">
                  {st.done}/{st.total}
                  {/* Name the real floor. "0/7" alone reads as seven
                      obligations; most chapters gate nothing at all. */}
                  <span className="define-chapter-tab-need">
                    {st.requiredRemaining > 0
                      ? ` · ${st.requiredRemaining} needed`
                      : st.requiredTotal > 0
                        ? ' · needed ones done'
                        : ' · none needed'}
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
              }${focusField && showFields ? ' has-focus' : ''}`}
              data-chapter={ch.id}
              style={{ '--chapter-accent': ch.accent }}
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
                  <h3 className="define-chapter-title">{ch.title}</h3>
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
                    <h3 className="define-chapter-title">{ch.title}</h3>
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
                      className={`define-field${focused ? ' is-focused' : ''}${
                        filled ? ' is-filled' : ''
                      }`}
                      data-span={f.gridSpan || 'full'}
                    >
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
                        {f.area ? (
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
