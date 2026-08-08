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
} from '../../lib/brief/detectiveBrief'
import useIsMobile from '../../lib/useIsMobile'
import DefineStartHere from './DefineStartHere'
import BriefSpectrum from './BriefSpectrum'
import '../../styles/lazy-define.css'
import VisualDiscovery from '../discovery/VisualDiscovery'
import useAppStore from '../../store/useAppStore'

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
  /** DefineView renders "Start with these" itself, up in the header band
   *  above the milestone list — see components/DefineStartHere. Standalone
   *  uses of this sheet keep their own copy. */
  showStartHere = true,
  /**
   * Chapter rail = second map of the same five chapters. The brief page
   * passes false: form headings already number chapters, and a dual map
   * is decision-fatigue clutter (2026-08-03 declutter). Standalone / other
   * surfaces can keep the rail.
   */
  showChapterRail = true,
  /** The deadline lives on the project record, not in `detective` — it drives
   *  the calendar and the relative label — so it is threaded in rather than
   *  read from the answers object. */
  projectDeadline = '',
  setProjectDeadline,
}) {
  /* FLAT, not an accordion (adhd-executive-function-advisor ruling for the
     2026 design handoff). The accordion billed a five-way chapter decision
     on every arrival, made four chapters a memory test ("hidden, not one
     click away" — the owner's own words), broke find-in-page on unmounted
     fields, and needed persisted open-chapter state that raced arrivals.
     Everything is mounted; the rail below is a scroll INDEX (a map, not a
     fork) whose active tab follows scroll position. The whole open-chapter
     apparatus — the flag, the persisted defineOpenChapter, the auto-open
     effect — is deleted, not parked behind a toggle: an expand/collapse
     control would just bill a decision to undo the layout's default. */
  /* Visual Discovery writes its own log on the project; the sheet itself
     stays a presentation of `detective`. */
  const activeProject = useAppStore((st) =>
    st.projects.find((p) => p.id === st.currentProjectId)
  )
  const [currentChapter, setCurrentChapter] = useState(DETECTIVE_CHAPTERS[0].id)
  const [focusField, setFocusField] = useState(null)
  const isMobile = useIsMobile()

  const progress = useMemo(() => getDetectiveProgress(detective), [detective])
  const chapterStats = progress.chapters

  /** Shared with DefineStartHere — two copies of "which required fields are
   * still empty" would eventually disagree. */
  const requiredEmpty = useMemo(() => getRequiredEmpty(detective, projectDeadline), [detective, projectDeadline])

  /* The rail highlight follows scroll, so it is always true — a chapter tab
     that only changes on click is a promise that goes stale the moment the
     user scrolls. rootMargin biases to the band under the sticky chrome. */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = e.target.dataset.chapter
            if (id) setCurrentChapter(id)
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    for (const ch of DETECTIVE_CHAPTERS) {
      const el = document.getElementById(`define-chapter-content-${ch.id}`)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [])

  return (
    <div className={`define-workbook${splitMode ? ' is-split' : ''}`}>
      {/* One implementation, shared with DefineView. This used to be a second
          inlined copy of the block plus its own jumpToField — dead in the
          only live call path, since DefineView passes showStartHere={false}
          and renders the component itself. Two copies of the page's only
          anti-stall control, one of them unreachable, is exactly how a
          regression lands somewhere nobody looks. */}
      {showStartHere && <DefineStartHere detective={detective} />}

      {showChapterRail && !isMobile && (
      <nav className="define-chapter-rail" aria-label="Brief chapters">
          {DETECTIVE_CHAPTERS.map((ch, i) => {
            const st = chapterStats[i]
            const active = currentChapter === ch.id
            return (
              <button
                key={ch.id}
                type="button"
                className={`define-chapter-tab${active ? ' is-active' : ''}${
                  st.complete ? ' is-complete' : ''
                }${st.requiredDone && !st.complete ? ' is-ready' : ''}`}
                onClick={() => {
                  // A scroll index, not a switcher: everything is mounted,
                  // so clicking only moves the page.
                  setCurrentChapter(ch.id)
                  requestAnimationFrame(() => {
                    document
                      .getElementById(`define-chapter-content-${ch.id}`)
                      ?.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
                  })
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
          const st = chapterStats.find((s) => s.id === ch.id)
          const isCurrent = currentChapter === ch.id
          return (
            <article
              key={ch.id}
              id={`define-chapter-content-${ch.id}`}
              // `is-current` mirrors the rail highlight so the chapter under
              // the reading position reads as "the one you're in".
              className={`define-chapter is-open${isCurrent ? ' is-current' : ''}`}
              data-chapter={ch.id}
            >
              {/* Numbered section head with a rule line (2026 design) — a
                  heading over always-visible fields, never a toggle. The
                  "N needed" chip stays: on phones the rail doesn't render,
                  so this is the only per-chapter "how much is left". */}
              <header className="define-chapter-head">
                <span className="define-chapter-badge">{ch.num}</span>
                <h2 className="define-chapter-title">{ch.title}</h2>
                {st?.requiredDone && (
                  <span className="define-chapter-done-chip" aria-label="Complete">
                    ✓
                  </span>
                )}
                {st?.requiredRemaining > 0 && (
                  <span className="define-chapter-head-need">
                    {st.requiredRemaining} needed
                  </span>
                )}
                <span className="define-chapter-rule" aria-hidden="true" />
              </header>

              <div
                className="define-fields"
                id={`define-chapter-fields-${ch.id}`}>
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
                        </label>
                        {/* A worded "Needed" badge, not an asterisk — the
                            asterisk is a convention you have to already know
                            and its tooltip never appears on touch. On a flat
                            page only these five fields are load-bearing;
                            marking them is the whole anti-overwhelm
                            mechanism (everything unbadged reads as
                            optional). Gone once answered — a badge that
                            stays after the work is done is a debt notice on
                            a paid bill. */}
                        {f.required && !filled && (
                          <span className="define-field-needed">Needed</span>
                        )}
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

              {/* Visual Discovery sits with the other look-and-feel questions
                  because it answers the same thing a different way: the
                  spectrums ask you to place yourself on a scale, this asks you
                  to point at what you like. It adds no brief field — the
                  choices are their own log and everything read from them is
                  derived. */}
              {ch.id === 'identity' && <VisualDiscovery project={activeProject} />}
            </article>
          )
        })}
      </div>

    </div>
  )
}
