/**
 * Research step — mood board wall, leave-behind stars, 20-min timer entry.
 * Owns board add/lightbox local state so App stays lean.
 */
import {
  useState,
  useEffect,
  useCallback,
  Suspense,
  lazy,
} from 'react'
import useAppStore from '../store/useAppStore'
import { getProcessPhase } from '../lib/processGuide'
import InfoReveal from '../components/InfoReveal'
import {
  pinFaceStyle,
  pinImageUrl,
  readImageFilesAsPins,
} from '../lib/moodPins'
import {
  normalizeLocale,
  t as i18nT,
  pathLabel,
  tFormat,
} from '../lib/i18n'
import { useModalFocus } from '../lib/useModalFocus'

const EmptyIllustration = lazy(() => import('../components/EmptyIllustration'))

export default function ResearchView({
  locale: localeProp = 'en',
  navDir = 'none',
  deskMood = [],
  activeProjectId = null,
  brandWords = '',
  projectPalette = [],
  forcedBreak = null,
  setActiveView,
  flashToast,
  flashMicro,
  notifyAction,
  setSessionComplete,
  setFocusLeft,
  setPomodoroWorkStartedAt,
  setIsFocusRunning,
  setTimerFocusSource,
}) {
  const locale = normalizeLocale(localeProp)
  const addMoodPin = useAppStore((s) => s.addMoodPin)
  const removeMoodPin = useAppStore((s) => s.removeMoodPin)
  const updateMoodPinNote = useAppStore((s) => s.updateMoodPinNote)
  const toggleMoodPinInPack = useAppStore((s) => s.toggleMoodPinInPack)
  const movePackPin = useAppStore((s) => s.movePackPin)
  const setPackHeroPin = useAppStore((s) => s.setPackHeroPin)
  const reorderBoardPins = useAppStore((s) => s.reorderBoardPins)

  const [boardUrl, setBoardUrl] = useState('')
  const [boardNote, setBoardNote] = useState('')
  const [boardAddMode, setBoardAddMode] = useState(null)
  const [boardDragId, setBoardDragId] = useState(null)
  const [boardLightbox, setBoardLightbox] = useState(null)

  const getLightboxRoot = useCallback(
    () => document.querySelector('.board-lightbox-overlay'),
    []
  )
  useModalFocus(!!boardLightbox, getLightboxRoot, {
    initialSelector: '.board-lightbox-close',
  })

  // Esc / arrows / block path shortcuts while lightbox open (capture phase)
  useEffect(() => {
    if (!boardLightbox) return undefined
    const pins = deskMood || []
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setBoardLightbox(null)
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (pins.length < 2) return
        e.preventDefault()
        e.stopPropagation()
        const idx = pins.findIndex(
          (p) => String(p.id) === String(boardLightbox.id)
        )
        if (idx < 0) return
        const next =
          e.key === 'ArrowRight'
            ? pins[(idx + 1) % pins.length]
            : pins[(idx - 1 + pins.length) % pins.length]
        setBoardLightbox(next)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'g' || k === 'c' || k === 'n' || k === 'u' || /^[1-7]$/.test(e.key)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [boardLightbox, deskMood])

  const uploadMoodFiles = (fileList) => {
    const list = Array.from(fileList || [])
    if (!list.length) return
    void readImageFilesAsPins(list).then(({ pins, skipped }) => {
      if (!pins.length) {
        flashToast?.(
          skipped.length
            ? `Couldn’t add images · ${skipped[0]}${
                skipped.length > 1 ? ` (+${skipped.length - 1} more)` : ''
              }`
            : 'No images found — try PNG, JPG, WEBP, or GIF under 3.5MB'
        )
        return
      }
      pins.forEach((pin) => addMoodPin(pin))
      if (skipped.length) {
        flashToast?.(
          `Added ${pins.length} · skipped ${skipped.length} (size/type)`
        )
      }
      notifyAction?.(
        pins.length > 1
          ? `${pins.length} images pinned${skipped.length ? ` · ${skipped.length} skipped` : ''}`
          : `Image pinned${skipped.length ? ` · ${skipped.length} skipped` : ''}`,
        'mood_pin',
        { label: `${pins.length} image${pins.length > 1 ? 's' : ''}` }
      )
    })
  }

  const submitBoardUrl = () => {
    const url = boardUrl.trim()
    if (!url) return
    addMoodPin({
      type: 'image',
      note: '',
      visual: url,
    })
    setBoardUrl('')
    setBoardAddMode(null)
    notifyAction?.('Pin added', 'mood_pin', { label: 'URL pin' })
  }

  const submitBoardNote = () => {
    const note = boardNote.trim() || 'Direction note'
    addMoodPin({
      type: 'quote',
      note,
      visual:
        projectPalette[0] ||
        'linear-gradient(135deg, #1C1917, #0F766E)',
    })
    setBoardNote('')
    setBoardAddMode(null)
    notifyAction?.('Pin added', 'mood_pin', { label: 'Note pin' })
  }

  return (
    <>
          <div className="studio-view surface-wall view-enter research-studio" data-nav-dir={navDir}>
            <div className="flow-top research-studio-top">
              <div>
                <h1 className="page-title">
                  {i18nT(locale, 'path.research')}
                </h1>
                <p className="page-sub">
                  {deskMood.filter((m) => m.inPack).length > 0
                    ? `★ ${deskMood.filter((m) => m.inPack).length}/6`
                    : `${deskMood.length} pin${deskMood.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="research-studio-actions">
                <span className="panel-count">
                  {deskMood.length} pin{deskMood.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (forcedBreak) {
                      flashToast(i18nT(locale, 'ui.breakLockFirst'))
                      return
                    }
                    setSessionComplete(false)
                    setTimerFocusSource?.('research')
                    setFocusLeft(20 * 60)
                    setPomodoroWorkStartedAt(Date.now())
                    setIsFocusRunning(true)
                    setActiveView('insights')
                    notifyAction('Focus on', 'focus_start', {
                      label: 'Research timer',
                    })
                    flashToast(i18nT(locale, 'ui.researchTimerOn'))
                  }}
                >
                  20‑min timer
                </button>
                <InfoReveal>
                  {(getProcessPhase('research')?.checks || []).join(' · ')}
                  {getProcessPhase('research')?.prompt
                    ? ` — ${getProcessPhase('research').prompt}`
                    : ''}
                </InfoReveal>
              </div>
            </div>

            {/* Wall is the stage — masonry when pins exist */}
            <section className="panel brand-section board-wall-panel research-wall">
              <div className="board-wall-head">
                <div className="brand-section-label" style={{ margin: 0 }}>
                  Wall
                </div>
                {deskMood.length > 0 && (
                  <span className="panel-hint board-pack-count" style={{ margin: 0 }}>
                    Leave-behind {deskMood.filter((m) => m.inPack).length}/6
                    {deskMood.filter((m) => m.inPack).length >= 6
                      ? ' · full'
                      : ''}
                  </span>
                )}
              </div>
              <div
                className={`mood-board${deskMood.length ? ' has-pins is-masonry' : ''}${
                  deskMood.length === 1 ? ' single-pin' : ''
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.length) {
                    uploadMoodFiles(e.dataTransfer.files)
                    return
                  }
                  const pinId = e.dataTransfer.getData('text/cc-pin-id')
                  if (pinId) {
                    const target = e.target.closest('[data-pin-id]')
                    const targetId = target?.getAttribute('data-pin-id')
                    if (targetId && targetId !== pinId) {
                      const ids = deskMood.map((m) => m.id)
                      const from = ids.findIndex(
                        (id) => String(id) === String(pinId)
                      )
                      const to = ids.findIndex(
                        (id) => String(id) === String(targetId)
                      )
                      if (from >= 0 && to >= 0) {
                        const next = [...ids]
                        const [moved] = next.splice(from, 1)
                        next.splice(to, 0, moved)
                        reorderBoardPins(next, activeProjectId)
                        // Keep pack order aligned when both are starred
                        const packIds = next.filter((id) =>
                          deskMood.find(
                            (m) => String(m.id) === String(id) && m.inPack
                          )
                        )
                        if (packIds.length > 1) {
                          useAppStore.getState().reorderPackPins(packIds)
                        }
                        flashMicro(i18nT(locale, 'ui.refOrderUpdated'))
                      }
                    }
                    return
                  }
                  const data =
                    e.dataTransfer.getData('text/uri-list') ||
                    e.dataTransfer.getData('text')
                  if (data?.trim()) {
                    addMoodPin({
                      type: 'image',
                      note: '',
                      visual: data.trim(),
                    })
                    notifyAction('Pin added', 'mood_pin', {
                      label: 'Dropped pin',
                    })
                  }
                }}
              >
                {deskMood.length === 0 ? (
                  <div className="empty-state empty-state-craft">
                    <Suspense fallback={null}>
                      <EmptyIllustration variant="board" />
                    </Suspense>
                    <p className="empty-state-title">
                      {i18nT(locale, 'ui.noPinsYet')}
                    </p>
                    <p className="empty-state-body">
                      {i18nT(locale, 'ui.emptyPinsBody')}
                    </p>
                  </div>
                ) : (
                  deskMood.map((item, index) => {
                    const isHero = index === 0
                    const face = pinFaceStyle(item)
                    const isImageFace = Boolean(face.backgroundImage?.includes('url('))
                    const isQuote =
                      !isImageFace ||
                      item.type === 'quote' ||
                      item.type === 'spark' ||
                      item.type === 'color' ||
                      item.type === 'note'
                    return (
                      <article
                        key={item.id || index}
                        data-pin-id={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'text/cc-pin-id',
                            String(item.id)
                          )
                          e.dataTransfer.effectAllowed = 'move'
                          setBoardDragId(item.id)
                        }}
                        onDragEnd={() => setBoardDragId(null)}
                        className={`mood-card${isQuote && !isImageFace ? ' is-quote' : ''}${
                          index === 0 ? ' is-hero' : ''
                        }${item.inPack ? ' is-pack-pin' : ''}${
                          boardDragId === item.id ? ' is-dragging' : ''
                        }${item.packHero ? ' is-pack-hero' : ''}`}
                      >
                        {isImageFace ? (
                          <button
                            type="button"
                            className="mood-pin-media mood-pin-media-btn"
                            style={
                              pinImageUrl(item)
                                ? { backgroundColor: '#e7e5e4' }
                                : face
                            }
                            aria-label={`View pin${item.note ? `: ${item.note}` : ''}`}
                            onClick={() => setBoardLightbox(item)}
                          >
                            {pinImageUrl(item) ? (
                              <img
                                className="mood-pin-img"
                                src={pinImageUrl(item)}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                              />
                            ) : null}
                          </button>
                        ) : (
                          <div
                            className="mood-pin-face"
                            style={face}
                          >
                            <p className="mood-pin-caption">
                              {item.note || 'Note'}
                            </p>
                          </div>
                        )}
                        <div className="mood-pin-tools">
                          <div className="mood-pin-tools-row">
                            <button
                              type="button"
                              className={`mood-pin-star${item.inPack ? ' is-on' : ''}${item.packHero ? ' is-hero' : ''}`}
                              title={
                                item.inPack
                                  ? 'Remove from client pack'
                                  : 'Add to client pack (max 6)'
                              }
                              aria-pressed={!!item.inPack}
                              onClick={() => {
                                const r = toggleMoodPinInPack(item.id)
                                if (!r.ok)
                                  flashToast(
                                    r.error ||
                                      i18nT(locale, 'ui.leaveBehindFull')
                                  )
                                else
                                  flashMicro(
                                    r.inPack
                                      ? 'In client pack'
                                      : 'Not in client pack'
                                  )
                              }}
                            >
                              {item.inPack ? '★ Leave-behind' : '☆ Leave-behind'}
                            </button>
                            <details className="mood-pin-more">
                              <summary
                                className="mood-pin-more-sum"
                                aria-label="More pin actions"
                              >
                                ⋯
                              </summary>
                              <div className="mood-pin-more-menu">
                                {item.inPack && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-ghost mood-pin-order"
                                      onClick={() => movePackPin(item.id, 'up')}
                                    >
                                      ↑ Earlier in pack
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-ghost mood-pin-order"
                                      onClick={() =>
                                        movePackPin(item.id, 'down')
                                      }
                                    >
                                      ↓ Later in pack
                                    </button>
                                    <button
                                      type="button"
                                      className={`btn btn-ghost mood-pin-order${item.packHero ? ' is-on' : ''}`}
                                      onClick={() => {
                                        const r = setPackHeroPin(item.id)
                                        if (!r.ok)
                                          flashToast(
                                            r.error || 'Could not set hero'
                                          )
                                        else flashMicro(i18nT(locale, 'ui.heroPinSet'))
                                      }}
                                    >
                                      Hero pin
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-ghost mood-pin-remove"
                                  onClick={() => removeMoodPin(item.id)}
                                >
                                  Remove pin
                                </button>
                              </div>
                            </details>
                          </div>
                          <input
                            className={`mood-pin-note-input${
                              item.inPack && !item.note?.trim()
                                ? ' needs-why'
                                : ''
                            }`}
                            value={item.note || ''}
                            onChange={(e) =>
                              updateMoodPinNote(item.id, e.target.value)
                            }
                            placeholder={
                              item.inPack
                                ? brandWords.trim()
                                  ? `Why does this fit "${brandWords.trim()}"?`
                                  : 'Why does this fit the brand?'
                                : 'Caption…'
                            }
                            aria-label={
                              item.inPack ? 'Why this pin fits the brand' : 'Pin note'
                            }
                          />
                          {item.inPack && !item.note?.trim() && (
                            <p className="mood-pin-why-hint">
                              Needs a why before Research counts as done.
                            </p>
                          )}
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
              <p className="panel-hint board-drop-hint">
                Drop images here · drag pins to reorder
              </p>
            </section>

            {/* Compact add — below the wall */}
            <section className="panel brand-section board-add-compact">
              <div className="board-add-toolbar">
                <label className="btn btn-primary board-upload-btn">
                  Upload images
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      uploadMoodFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm${
                    boardAddMode === 'url' ? ' is-on' : ''
                  }`}
                  onClick={() =>
                    setBoardAddMode((m) => (m === 'url' ? null : 'url'))
                  }
                >
                  URL
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm${
                    boardAddMode === 'note' ? ' is-on' : ''
                  }`}
                  onClick={() =>
                    setBoardAddMode((m) => (m === 'note' ? null : 'note'))
                  }
                >
                  Note
                </button>
                {deskMood.length > 0 && (
                  <details className="board-pack-bulk">
                    <summary className="text-link">Leave-behind tools</summary>
                    <div className="board-pack-bulk-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          const open = deskMood.filter((m) => !m.inPack)
                          let added = 0
                          for (const p of open) {
                            if (
                              deskMood.filter((m) => m.inPack).length + added >=
                              6
                            )
                              break
                            const r = toggleMoodPinInPack(p.id)
                            if (r.ok && r.inPack) added++
                          }
                          if (!added) {
                            flashToast(
                              deskMood.filter((m) => m.inPack).length >= 6
                                ? i18nT(locale, 'ui.leaveBehindFull')
                                : 'Nothing left to star'
                            )
                          }
                        }}
                      >
                        Star next
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          deskMood
                            .filter((m) => m.inPack)
                            .forEach((p) => toggleMoodPinInPack(p.id))
                        }}
                      >
                        Clear stars
                      </button>
                    </div>
                  </details>
                )}
              </div>
              {boardAddMode === 'url' && (
                <div className="board-inline-form">
                  <label className="field-label" htmlFor="board-url">
                    Image URL
                  </label>
                  <div className="capture-row">
                    <input
                      id="board-url"
                      className="field-input"
                      value={boardUrl}
                      onChange={(e) => setBoardUrl(e.target.value)}
                      placeholder="https://…"
                      onKeyDown={(e) =>
                        e.key === 'Enter' && submitBoardUrl()
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={submitBoardUrl}
                      disabled={!boardUrl.trim()}
                    >
                      Add pin
                    </button>
                  </div>
                </div>
              )}
              {boardAddMode === 'note' && (
                <div className="board-inline-form">
                  <label className="field-label" htmlFor="board-note">
                    Note / direction
                  </label>
                  <div className="capture-row">
                    <input
                      id="board-note"
                      className="field-input"
                      value={boardNote}
                      onChange={(e) => setBoardNote(e.target.value)}
                      placeholder="e.g. Soft twilight, no hard sell"
                      onKeyDown={(e) =>
                        e.key === 'Enter' && submitBoardNote()
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={submitBoardNote}
                    >
                      Add pin
                    </button>
                  </div>
                </div>
              )}
            </section>

            <div className="path-continue-row work-below-tools">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveView('spark')}
              >
                {tFormat(locale, 'ui.continueNext', {
                  label: pathLabel(locale, 'ideate') || 'Ideate',
                })}
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => setActiveView('project')}
              >
                ← Define
              </button>
            </div>
          </div>
        {boardLightbox && (
          <div
            className="board-lightbox-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Pin preview"
            onClick={(e) => {
              if (e.target === e.currentTarget) setBoardLightbox(null)
            }}
          >
            <div className="board-lightbox-card">
              <button
                type="button"
                className="btn btn-ghost board-lightbox-close"
                autoFocus
                onClick={() => setBoardLightbox(null)}
              >
                Close
              </button>
              {pinImageUrl(boardLightbox) ? (
                <img
                  className="board-lightbox-visual board-lightbox-img"
                  src={pinImageUrl(boardLightbox)}
                  alt={boardLightbox.note || 'Research pin'}
                  decoding="async"
                />
              ) : (
                <div
                  className="board-lightbox-visual"
                  style={pinFaceStyle(boardLightbox)}
                />
              )}
              {boardLightbox.note ? (
                <p className="board-lightbox-note">{boardLightbox.note}</p>
              ) : null}
              <p className="board-lightbox-meta">
                {(() => {
                  const i = deskMood.findIndex(
                    (p) => String(p.id) === String(boardLightbox.id)
                  )
                  return i >= 0
                    ? `${i + 1} / ${deskMood.length} · ← → to move · Esc to close`
                    : 'Esc to close'
                })()}
              </p>
              <div className="board-lightbox-actions">
                {deskMood.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        const pins = deskMood
                        const idx = pins.findIndex(
                          (p) => String(p.id) === String(boardLightbox.id)
                        )
                        if (idx < 0) return
                        setBoardLightbox(
                          pins[(idx - 1 + pins.length) % pins.length]
                        )
                      }}
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        const pins = deskMood
                        const idx = pins.findIndex(
                          (p) => String(p.id) === String(boardLightbox.id)
                        )
                        if (idx < 0) return
                        setBoardLightbox(pins[(idx + 1) % pins.length])
                      }}
                    >
                      Next →
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={`btn btn-secondary${boardLightbox.inPack ? ' is-on' : ''}`}
                  onClick={() => {
                    const r = toggleMoodPinInPack(boardLightbox.id)
                    if (!r.ok)
                      flashToast(r.error || i18nT(locale, 'ui.leaveBehindFull'))
                    else {
                      setBoardLightbox((p) =>
                        p ? { ...p, inPack: r.inPack } : null
                      )
                    }
                  }}
                >
                  {boardLightbox.inPack
                    ? '★ In client pack'
                    : '☆ Add to client pack'}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  )
}
