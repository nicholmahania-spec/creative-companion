/**
 * Define — Design Detective Sheet as chaptered studio workspace.
 * Three focus cards · micro-icons · hyper-focus fields · clean inputs.
 */
import { useMemo, useState, useCallback, useRef } from 'react'
import {
  DETECTIVE_CHAPTERS,
  getDetectiveProgress,
  isFilled,
} from '../lib/detectiveBrief'
import useIsMobile from '../lib/useIsMobile'
import {
  trackDetectiveFieldUpdate,
  trackMilestoneOperation,
  trackChapterNavigation,
  startPerformanceTimer,
  endPerformanceTimer
} from '../lib/analytics'

export { DETECTIVE_CHAPTERS, getDetectiveProgress, isFilled }

export default function DetectiveSheet({
  detective = {},
  updateDetective,
  addMilestone,
  updateMilestone,
  removeMilestone,
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

      {!splitMode && (
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
                }}
                aria-current={active ? 'step' : undefined}
                aria-controls={`define-chapter-content-${ch.id}`}
              >
                <span className="define-chapter-tab-num" aria-hidden="true">
                  {st.complete ? '✓' : ch.num}
                </span>
                <span className="define-chapter-tab-label">{ch.title}</span>
                <span className="define-chapter-tab-count">
                  {st.done}/{st.total}
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
              className={`define-chapter${showFields ? ' is-open' : ''}${
                focusField && showFields ? ' has-focus' : ''
              }`}
              data-chapter={ch.id}
              style={{ '--chapter-accent': ch.accent }}
              hidden={articleHidden}
            >
              {splitMode && accordion ? (
                <button
                  type="button"
                  className="define-chapter-head define-chapter-toggle"
                  onClick={() => setOpenChapter(isOpen ? null : ch.id)}
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
                      }${
                        focusField && !focused && openChapter === ch.id
                          ? ' is-dimmed'
                          : ''
                      }`}
                      data-span={f.gridSpan || 'full'}
                    >
                      <div className="define-field-label-row">
                        <label
                          className="define-field-label"
                          htmlFor={`detective-${f.id}`}
                        >
                          {f.label}
                          {f.required && (
                            <span className="define-required" title="Needed">
                              *
                            </span>
                          )}
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
                            placeholder={f.placeholder}
                            title={f.tip}
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
                            placeholder={f.placeholder}
                            title={f.tip}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}

                {ch.id === 'constraints' && (
                  <div
                    className={`define-field define-milestones${
                      focusField === 'milestones' ? ' is-focused' : ''
                    }${
                      focusField &&
                      focusField !== 'milestones' &&
                      openChapter === ch.id
                        ? ' is-dimmed'
                        : ''
                    }`}
                    data-span="full"
                  >
                    <div className="define-field-label-row">
                      <span className="define-field-label">Milestones</span>
                    </div>
                    <div
                      className="define-milestones-list"
                      onFocusCapture={() => setFocusField('milestones')}
                      onBlurCapture={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setFocusField(null)
                        }
                      }}
                    >
                      {(detective?.milestones || []).map((m) => (
                        <div key={m.id} className="detective-milestone-row">
                          <input
                            className="define-input field-input"
                            value={m.label}
                            onChange={(e) => {
                              const timerId = `milestone_update_${m.id}_label`;
                              startPerformanceTimer(timerId);
                              updateMilestone?.(m.id, 'label', e.target.value);
                              trackMilestoneOperation('update', { id: m.id, label: e.target.value, date: m.date });
                              endPerformanceTimer(timerId, { milestoneId: m.id, field: 'label' });
                            }}
                            placeholder="Milestone"
                            aria-label="Milestone name"
                          />
                          <input
                            type="date"
                            className="define-input field-input detective-milestone-date"
                            value={m.date}
                            onChange={(e) => {
                              const timerId = `milestone_update_${m.id}_date`;
                              startPerformanceTimer(timerId);
                              updateMilestone?.(m.id, 'date', e.target.value);
                              trackMilestoneOperation('update', { id: m.id, label: m.label, date: e.target.value });
                              endPerformanceTimer(timerId, { milestoneId: m.id, field: 'date' });
                            }}
                            aria-label="Milestone date"
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              const timerId = `milestone_remove_${m.id}`;
                              startPerformanceTimer(timerId);
                              removeMilestone?.(m.id);
                              // Track milestone removal
                              trackMilestoneOperation('remove', { id: m.id, label: m.label, date: m.date });
                              endPerformanceTimer(timerId, { milestoneId: m.id });
                            }}
                            aria-label="Remove milestone"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                              const timerId = `milestone_add_${Date.now()}`;
                              startPerformanceTimer(timerId);
                              addMilestone?.('', '');
                              // Track adding a new milestone (empty initially)
                              trackMilestoneOperation('add', { id: Date.now(), label: '', date: '' });
                              endPerformanceTimer(timerId, { action: 'add' });
                            }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </article>
          )
        })}
      </div>

    </div>
  )
}
