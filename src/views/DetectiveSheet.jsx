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

function FieldIcon({ name }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
  }
  switch (name) {
    case 'target':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
        </svg>
      )
    case 'people':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M15 15.2c1.8.3 3.2 1.4 3.8 3.8" />
        </svg>
      )
    case 'heart':
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
        </svg>
      )
    case 'spark':
      return (
        <svg {...common}>
          <path d="M12 2.5 13.8 9l6.7.3-5.2 4.2 1.8 6.5L12 16.5 6.9 20l1.8-6.5L3.5 9.3 10.2 9 12 2.5Z" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common}>
          <path d="M5 12.5 10 17.5 19 7" />
          <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
        </svg>
      )
    case 'star':
      return (
        <svg {...common}>
          <path d="M12 3.5 14.2 9l5.8.4-4.5 3.7 1.4 5.7L12 15.8 7.1 18.8l1.4-5.7L4 9.4 9.8 9 12 3.5Z" />
        </svg>
      )
    case 'frame':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M4 9h16" />
        </svg>
      )
    case 'block':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M7 7l10 10" />
        </svg>
      )
    case 'box':
      return (
        <svg {...common}>
          <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
          <path d="M4 8.5 12 13l8-4.5M12 13v7" />
        </svg>
      )
    case 'gear':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.5 6.5l1.4 1.4M16.1 16.1l1.4 1.4M17.5 6.5l-1.4 1.4M7.9 16.1l-1.4 1.4" />
        </svg>
      )
    case 'flag':
      return (
        <svg {...common}>
          <path d="M6 21V4.5h.5c2.5 0 3.5 1.5 6 1.5s3.5-1.5 6-1.5V14c-2.5 0-3.5 1.5-6 1.5s-3.5-1.5-6-1.5H6" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      )
  }
}

export default function DetectiveSheet({
  detective = {},
  updateDetective,
  applyDetectiveToBrief,
  flashToast,
  addMilestone,
  updateMilestone,
  removeMilestone,
  onContinue,
  continueLabel = 'Next · Research',
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
   * all three, which reads as wrong once some of them are filled in. */
  return (
    <div className={`define-workbook${splitMode ? ' is-split' : ''}`}>
      {!splitMode && (
        <header className="define-workbook-head">
          <div className="define-workbook-head-text">
            <p className="define-workbook-kicker">Brief</p>
            <h2 className="define-workbook-title">Brief builder</h2>
            <p className="define-workbook-lede">
              Three chapters. Fill before polish.
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
                      }${
                        focusField && !focused && openChapter === ch.id
                          ? ' is-dimmed'
                          : ''
                      }`}
                    >
                      <div className="define-field-label-row">
                        <span
                          className={`define-field-icon define-icon-${f.icon}`}
                          aria-hidden="true"
                        >
                          <FieldIcon name={f.icon} />
                        </span>
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
                  >
                    <div className="define-field-label-row">
                      <span
                        className="define-field-icon define-icon-flag"
                        aria-hidden="true"
                      >
                        <FieldIcon name="flag" />
                      </span>
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

      <div
        className={`define-fab-bar path-continue-row${requiredReady ? ' is-ready' : ''}`}
        role="region"
        aria-label="Continue"
      >
        <button
          type="button"
          className={`define-fab btn btn-primary work-path-next${requiredReady ? ' is-ready' : ' is-quiet'}`}
          onClick={() => {
            if (!requiredReady) {
              openNextIncomplete()
              flashToast?.('Need * fields first')
              return
            }
            applyDetectiveToBrief?.()
            onContinue?.()
            // Track completing the detective sheet
            trackFeatureUsage('detective_sheet', 'completed')
          }}
        >
          {continueLabel}
        </button>
      </div>
    </div>
  )
}
