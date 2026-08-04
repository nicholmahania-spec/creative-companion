/**
 * Board (Research) — wall primary; ★ pack pins; sticky Next → System.
 * ADHD: short chrome, goal anchor, note focus without sibling blur.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { labelForStepId } from '../lib/journey/journey'
import useAppStore from '../store/useAppStore'
import { getProcessPhase } from '../lib/journey/processGuide'
import { pinFaceStyle, pinImageUrl, readImageFilesAsPins } from '../lib/moodPins'
import { extractDominantColors, sampleColorAt } from '../lib/extractColors'
import { useModalFocus } from '../lib/useModalFocus'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { validateBoardUrl } from '../lib/safeBoardUrl'
import { POMODORO_WORK_MIN } from '../lib/helper/forcedBreak'
import '../styles/lazy-mood.css'

export default function ResearchView({
  navDir = 'none',
  journeyNext = null,
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
  onAddPinModeChange,
  // Focus timer props
  startOrPauseFocus,
  resetFocus,
  isFocusRunning,
  focusLeft,
  sessionLabel,
  sessionComplete,
}) {
  const addMoodPin = useAppStore((s) => s.addMoodPin)
  const removeMoodPin = useAppStore((s) => s.removeMoodPin)
  const updateMoodPinNote = useAppStore((s) => s.updateMoodPinNote)
  const toggleMoodPinInPack = useAppStore((s) => s.toggleMoodPinInPack)
  const movePackPin = useAppStore((s) => s.movePackPin)
  const setMoodPinFocal = useAppStore((s) => s.setMoodPinFocal)
  const setPackHeroPin = useAppStore((s) => s.setPackHeroPin)
  const addPaletteColor = useAppStore((s) => s.addPaletteColor)
  const [pinSwatches, setPinSwatches] = useState({})

  const [boardUrl, setBoardUrl] = useState('')
  const [boardUrlBusy, setBoardUrlBusy] = useState(false)
  const [boardNote, setBoardNote] = useState('')
  const [boardAddMode, setBoardAddMode] = useState(null)

  // Suppress the running to-do popup while this view's own inline add-pin
  // form is open, so they don't compete for attention.
  useEffect(() => {
    onAddPinModeChange?.(Boolean(boardAddMode))
    return () => onAddPinModeChange?.(false)
  }, [boardAddMode, onAddPinModeChange])

  /** Dragging files over the grid — without feedback, "drop pictures here"
   *  is a claim the surface never confirms until after you let go. */
  const [boardDropActive, setBoardDropActive] = useState(false)
  const [boardLightbox, setBoardLightbox] = useState(null)
  const [lightboxFocalMode, setLightboxFocalMode] = useState(false)

  const getLightboxRoot = useCallback(
    () => document.querySelector('.board-lightbox-overlay'),
    []
  )
  useModalFocus(!!boardLightbox, getLightboxRoot, {
    initialSelector: '.board-lightbox-close',
  })

  // Leaving crop-focus mode whenever the lightbox pin changes/closes keeps
  // the click-to-pick-color behavior the default, expected action.
  useEffect(() => {
    setLightboxFocalMode(false)
  }, [boardLightbox?.id])

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
      if (k === 'g' || k === 'c' || k === 'n' || k === 'u' || /^[1-5]$/.test(e.key)) {
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
    /* Stamp the project the upload STARTED on. Reading and downscaling files
       is async, and addMoodPin resolves `pin.projectId ?? currentProjectId`
       when its reducer runs — so dropping an image on project A and switching
       to B before the read finished filed the pin under B, silently.
       reorderBoardPins already takes an explicit projectId for this reason. */
    const ownerProjectId = activeProjectId
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
      pins.forEach((pin) => {
        addMoodPin({ ...pin, projectId: ownerProjectId ?? pin.projectId })
      })
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

  const submitBoardUrl = async () => {
    const raw = boardUrl.trim()
    if (!raw || boardUrlBusy) return

    const gate = validateBoardUrl(raw)
    if (!gate.ok) {
      flashToast?.(gate.error, { important: true })
      return
    }
    const url = gate.url

    // Same capture-before-await rule as uploadMoodFiles: the link-preview
    // round-trip can outlive the user's stay on this project.
    const ownerProjectId = activeProjectId

    const addPinAndReset = (pin) => {
      addMoodPin({ ...pin, projectId: ownerProjectId ?? pin.projectId })
      setBoardUrl('')
      setBoardAddMode(null)
      notifyAction?.('Pin added', 'mood_pin', { label: 'URL pin' })
    }

    // Direct image links (or a misconfigured/offline backend) fall back to
    // the original behavior: treat the pasted URL as the image itself.
    const asDirectImagePin = () => ({ type: 'image', note: '', visual: url })

    if (!isSupabaseConfigured() || !supabase) {
      addPinAndReset(asDirectImagePin())
      return
    }

    setBoardUrlBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('link-preview', {
        body: { url },
      })
      if (error || !data?.ok) {
        // Fail soft for public images only — never invent a pin from a blocked host
        // (gate already ran). Preview errors → still pin as image URL if it looks like one.
        addPinAndReset(asDirectImagePin())
        return
      }
      if (data.isImage) {
        addPinAndReset(asDirectImagePin())
        return
      }
      /* Keep the preview fields as fields. They used to be squashed into one
         caption string — `title · host` — and `description` was fetched and
         thrown away entirely, so a link pin rendered as a bare image or a
         flat colour chip with no indication of where it came from. Storing
         them lets the card show what the link actually is, which is the
         whole reason for fetching a preview. */
      const previewPin = {
        note: data.title || data.host || '',
        link: data.url || url,
        linkHost: data.host || '',
        linkTitle: data.title || '',
        linkDescription: data.description || '',
      }
      // Only trust preview image URLs that also pass the client gate
      let imageVisual = ''
      if (data.image) {
        const imgGate = validateBoardUrl(String(data.image))
        if (imgGate.ok) imageVisual = imgGate.url
      }
      addPinAndReset(
        imageVisual
          ? { ...previewPin, type: 'image', visual: imageVisual }
          : { ...previewPin, type: 'quote', visual: 'var(--bg-muted, #EBEBEB)' }
      )
    } catch {
      addPinAndReset(asDirectImagePin())
    } finally {
      setBoardUrlBusy(false)
    }
  }

  const submitBoardNote = () => {
    /* An empty note used to fall back to 'Direction note' — which is also this
       field's placeholder, so pressing Add on an empty box produced a real pin
       that looked exactly like the hint text. Nothing distinguished it from a
       note you meant to write, and it counted toward the board either way.
       Say nothing, add nothing. */
    const note = boardNote.trim()
    if (!note) {
      flashToast?.('Write a note first')
      return
    }
    const pin = {
      type: 'quote',
      note,
      visual:
        projectPalette[0] ||
        'linear-gradient(135deg, #1C1917, #0F766E)',
    }
    addMoodPin(pin)
    setBoardNote('')
    setBoardAddMode(null)
    notifyAction?.('Pin added', 'mood_pin', { label: 'Note pin' })
  }

  const starred = deskMood.filter((m) => m.inPack).length
  const words = String(brandWords || '').trim()

  /* Arriving here starts the CLOCK, not the timer.
   *
   * The work clock runs itself in App for any stage view — that is clocking
   * in, and it is what makes the hours log honest without anyone having to
   * remember to press something. This used to auto-start the focus timer as
   * well, which quietly erased the distinction: the countdown appeared
   * because you walked in, so choosing the timer looked identical to simply
   * being at work, and turning it off looked like clocking off.
   *
   * The timer is a tool for time blindness and stays a deliberate act — the
   * ⏱ button, pressed on purpose. Only the source is claimed here, so the
   * clock knows which stage to bill. */
  /* Research ⏱ button sets source deliberately. Do not claim 'research' on
     every mount — sticky source used to mis-tag work-log hours on other stages.
     Work clock banks activeView only (App.jsx). */

  /* Only offer "Take photo" where a camera actually exists. `capture` is
     ignored by desktop browsers, which would silently turn the button into a
     second file picker — a control that lies about what it does is worse than
     no control. Feature-detect rather than sniff the user agent. */
  const canCapturePhoto = useMemo(() => {
    if (typeof document === 'undefined' || typeof navigator === 'undefined') return false
    const supportsCapture = 'capture' in document.createElement('input')
    const hasTouch = navigator.maxTouchPoints > 0
    return supportsCapture && hasTouch
  }, [])

  return (
    <>
          <div className="studio-view surface-wall view-enter research-studio" data-nav-dir={navDir}>
            <div className="flow-top research-studio-top">
              <div className="research-top-text">
                <h1 className="page-title">
                  {labelForStepId('research')}
                </h1>
                {/* Floor, not ratio. "★ 3/6" is a number to decode that
                    produces no next action, and it reads as a scoreboard
                    three-fifths empty — the same pattern the project sidebar
                    and the Define chapter rail both removed, with the
                    reasoning recorded in each. Say what is still open, or
                    say it is done. */}
                <p className="research-status" role="status">
                  {starred > 0
                    ? starred >= 6
                      ? '★ pack full'
                      : `★ ${starred} in pack · room for ${6 - starred}`
                    : `${deskMood.length} pin${deskMood.length === 1 ? '' : 's'}`}
                </p>
                {/* One button, never two, and only when it does something.
                    Showing both leaves one inert in most states, which is a
                    choice plus a dead end. The pack state already decides
                    which is useful, so the app answers instead of asking.

                    Nothing stands here on a fresh project: this is a capture
                    page, and the next action must always be "put another
                    picture on the wall". Bulk actions belong in the scan path
                    only once the wall is worth acting on in bulk. */}
                {starred >= 6 ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm research-pack-bulk"
                    onClick={() => {
                      deskMood
                        .filter((m) => m.inPack)
                        .forEach((p) => toggleMoodPinInPack(p.id))
                      flashToast('Pack cleared — pin notes are kept')
                    }}
                  >
                    Unstar all
                  </button>
                ) : deskMood.some((m) => !m.inPack) ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm research-pack-bulk"
                    onClick={() => {
                      const open = deskMood.filter((m) => !m.inPack)
                      let added = 0
                      for (const p of open) {
                        if (deskMood.filter((m) => m.inPack).length + added >= 6)
                          break
                        const r = toggleMoodPinInPack(p.id)
                        if (r.ok && r.inPack) added++
                      }
                      if (!added) flashToast('Client pack is full (6 pictures max)')
                    }}
                  >
                    Star the rest
                  </button>
                ) : null}
                {words ? (
                  <p className="research-goal-anchor" title={words}>
                    Words · {words.slice(0, 64)}
                    {words.length > 64 ? '…' : ''}
                  </p>
                ) : null}
              </div>
              <div className="research-studio-actions">
            {/* Focus Timer */}
            <div className="insights-timer" style={{ marginTop: '1rem' }}>
              {isFocusRunning || focusLeft < POMODORO_WORK_MIN * 60
                ? `${Math.floor(focusLeft / 60)}:${String(focusLeft % 60).padStart(2, '0')}`
                : 'not started'}
            </div>
            <div className="insights-focus-actions" style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={startOrPauseFocus}
                className={`btn ${!!forcedBreak || (focusLeft === 0 && !isFocusRunning) ? 'btn-secondary' : 'btn-primary'}`}
                disabled={!!forcedBreak || (focusLeft === 0 && !isFocusRunning)}
              >
                {isFocusRunning ? 'Pause' : focusLeft === 0 ? 'Start' : 'Resume'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerFocusSource?.(null)
                  resetFocus(25)
                }}
                className="btn btn-secondary btn-sm"
                disabled={!!forcedBreak}
              >
                25
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerFocusSource?.(null)
                  resetFocus(2)
                }}
                className="btn btn-ghost btn-sm"
                disabled={!!forcedBreak}
              >
                2
              </button>
            </div>
              </div>
            </div>

            {/* Above the grid, and never gated on pin count. This strip used
                to sit BELOW a 60vh canvas, so on a fresh board the only
                visible way in was one button inside the empty state: URL and
                Note were off-screen (258px of scrolling on a phone) and
                Upload was not rendered at all until a pin already existed.
                Every route in was hidden at exactly the moment you had
                nothing and needed one. */}
            <section className="panel brand-section board-add-compact">
              <div className="board-add-toolbar">
                {(
                  <label className="btn btn-secondary board-upload-btn">
                    Upload
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
                )}
                {/* Separate control, not a second option inside the picker.
                    `capture` asks the OS for the camera directly, so on a
                    phone this is one tap to a viewfinder instead of tapping
                    Upload and then hunting for "Take Photo" in a sheet —
                    which is the whole point when the reference you want is
                    the thing in front of you. Hidden where there is no
                    camera, so it is never a dead control. */}
                {canCapturePhoto && (
                  <label className="btn btn-secondary board-upload-btn">
                    Take photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => {
                        uploadMoodFiles(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm research-add-toggle${
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
                  className={`btn btn-ghost btn-sm research-add-toggle${
                    boardAddMode === 'note' ? ' is-on' : ''
                  }`}
                  onClick={() =>
                    setBoardAddMode((m) => (m === 'note' ? null : 'note'))
                  }
                >
                  Note
                </button>
                {/* The bulk pack actions used to live here, inside a closed
                    <details> labelled "Pack tools" — a word that does not say
                    what is under it, on a page you return to after days away.
                    The owner's own verdict on that pattern: "they are hidden
                    and my first thought was 'I have no idea what this is.'"
                    They now sit beside the pack status in the heading, where
                    the count they act on already is. */}
              </div>
              {boardAddMode === 'url' && (
                <div className="board-inline-form">
                  <label className="field-label sr-only" htmlFor="board-url">
                    URL
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
                      className="btn btn-secondary"
                      onClick={submitBoardUrl}
                      disabled={!boardUrl.trim() || boardUrlBusy}
                    >
                      {boardUrlBusy ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </div>
              )}
              {boardAddMode === 'note' && (
                <div className="board-inline-form">
                  <label className="field-label sr-only" htmlFor="board-note">
                    Note
                  </label>
                  <div className="capture-row">
                    <input
                      id="board-note"
                      className="field-input board-note-underline"
                      value={boardNote}
                      onChange={(e) => setBoardNote(e.target.value)}
                      placeholder="Direction note"
                      onKeyDown={(e) =>
                        e.key === 'Enter' && submitBoardNote()
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={submitBoardNote}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </section>
            <section className="panel brand-section board-wall-panel research-wall">
              {/* Newest first, always — deskMood already arrives sorted this
                  way (App.jsx sorts by boardOrder, and a fresh pin is filed
                  at boardOrder 0). Starring never reorders the wall: the ★
                  pack has its own order (packOrder), kept in the shortlist
                  strip below. */}
              <p className="research-grid-hint">
                Newest first. Drop an image anywhere below, or use Upload, URL
                or Note above.
              </p>
              <div
                className={`research-grid-wrap${boardDropActive ? ' is-drop-active' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer?.types?.includes('Files')) setBoardDropActive(true)
                }}
                onDragLeave={(e) => {
                  if (e.target === e.currentTarget) setBoardDropActive(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setBoardDropActive(false)
                  if (e.dataTransfer.files?.length) {
                    uploadMoodFiles(e.dataTransfer.files)
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
                  <div className="empty-state empty-state-craft research-empty">
                    <p className="empty-state-subtitle">
                      Nothing on the wall yet. Add an image, a colour, a link
                      or a note — anything the client sent lands here too.
                    </p>
                  </div>
                ) : (
                  <div className="research-grid">
                    {deskMood.map((item) => {
                      const imageUrl = pinImageUrl(item)
                      const isImage = Boolean(imageUrl)
                      const isColor = !isImage && item.type === 'color'
                      const isLink = !isImage && !isColor && Boolean(item.link)
                      const face = pinFaceStyle(item)
                      const starTitle = item.inPack
                        ? 'Remove from pack'
                        : 'Add to pack (max 6)'
                      return (
                        <article
                          key={item.id}
                          className={`research-pin-card${
                            item.inPack ? ' is-starred' : ''
                          }${item.packHero ? ' is-pack-hero' : ''}`}
                        >
                          <div className="research-pin-face">
                            {isImage ? (
                              <button
                                type="button"
                                className="research-pin-face-btn"
                                aria-label={`View pin${item.note ? `: ${item.note}` : ''}`}
                                onClick={() => setBoardLightbox(item)}
                              >
                                <img
                                  className="research-pin-img"
                                  src={imageUrl}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  draggable={false}
                                  onLoad={(e) => {
                                    if (pinSwatches[item.id]) return
                                    const colors = extractDominantColors(e.currentTarget, 4)
                                    if (colors.length) {
                                      setPinSwatches((prev) => ({ ...prev, [item.id]: colors }))
                                    }
                                  }}
                                />
                              </button>
                            ) : isColor ? (
                              <div className="research-pin-face-color" style={face}>
                                <span className="research-pin-hex-label">
                                  {item.visual}
                                </span>
                              </div>
                            ) : isLink ? (
                              <div className="research-pin-face-link" style={face}>
                                {item.linkHost ? (
                                  <p className="research-pin-eyebrow">{item.linkHost}</p>
                                ) : null}
                                <p className="research-pin-link-text">
                                  {item.linkTitle || item.note || item.link}
                                </p>
                              </div>
                            ) : (
                              <div className="research-pin-face-note" style={face}>
                                <p className="research-pin-note-text">
                                  {item.note || 'Note'}
                                </p>
                              </div>
                            )}
                            <button
                              type="button"
                              className={`research-pin-star${item.inPack ? ' is-on' : ''}`}
                              title={starTitle}
                              aria-label={
                                item.inPack ? 'In pack — remove' : 'Add to pack'
                              }
                              aria-pressed={!!item.inPack}
                              onClick={() => {
                                const r = toggleMoodPinInPack(item.id)
                                if (!r.ok)
                                  flashToast(
                                    r.error ||
                                      'Client pack is full (6 pictures max)'
                                  )
                                else
                                  flashMicro(r.inPack ? '★ pack' : '☆ pack')
                              }}
                            >
                              {item.inPack ? '★' : '☆'}
                            </button>
                          </div>

                          <div className="research-pin-body">
                            {isImage && pinSwatches[item.id]?.length ? (
                              <div
                                className="research-pin-swatches"
                                aria-label="Suggested colors from this image"
                              >
                                {pinSwatches[item.id].map((hex) => (
                                  <button
                                    key={hex}
                                    type="button"
                                    className="research-pin-swatch"
                                    style={{ backgroundColor: hex }}
                                    title={`Add ${hex} to palette`}
                                    aria-label={`Add ${hex} to palette`}
                                    onClick={() => {
                                      if ((projectPalette?.length || 0) >= 8) {
                                        flashToast('Palette is full (max 8)')
                                        return
                                      }
                                      addPaletteColor(hex)
                                      flashMicro(`+ ${hex} to palette`)
                                    }}
                                  />
                                ))}
                              </div>
                            ) : null}

                            {isColor && (
                              <div className="research-pin-color-row">
                                <input
                                  type="color"
                                  className="research-pin-color-input"
                                  value={/^#([0-9a-f]{3}){1,2}$/i.test(item.visual) ? item.visual : '#000000'}
                                  disabled
                                  aria-label="Pin color (read-only — no color editor yet)"
                                />
                                <input
                                  type="text"
                                  className="field-input research-pin-hex-input"
                                  value={item.visual || ''}
                                  readOnly
                                  aria-label="Pin hex value (read-only — no color editor yet)"
                                />
                              </div>
                            )}

                            {isLink && (
                              <input
                                type="text"
                                className="field-input research-pin-url-input"
                                value={item.link || ''}
                                readOnly
                                aria-label="Pin link (read-only)"
                              />
                            )}

                            {/* A pinned link should say what it is, even on an
                                image pin whose preview resolved a photo — without
                                this a reference from the web was an unlabelled
                                image and you could not tell a competitor's site
                                from a stock photo without opening it. */}
                            {isImage && item.link && (
                              <div className="research-pin-link-foot">
                                {item.linkDescription && (
                                  <p className="research-pin-link-desc">
                                    {item.linkDescription}
                                  </p>
                                )}
                                <a
                                  className="research-pin-link-host"
                                  href={item.link}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                >
                                  {item.linkHost || 'Open link'} ↗
                                </a>
                              </div>
                            )}

                            <div className="research-pin-tools-row">
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
                                        ↑
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-ghost mood-pin-order"
                                        onClick={() => movePackPin(item.id, 'down')}
                                      >
                                        ↓
                                      </button>
                                      <button
                                        type="button"
                                        className={`btn btn-ghost mood-pin-order${item.packHero ? ' is-on' : ''}`}
                                        onClick={() => {
                                          const r = setPackHeroPin(item.id)
                                          if (!r.ok)
                                            flashToast(r.error || 'Could not set hero')
                                          else flashMicro('Main picture set')
                                        }}
                                      >
                                        Hero
                                      </button>
                                    </>
                                  )}
                                </div>
                              </details>
                            </div>
                            <div className="research-pin-note-row">
                              <input
                                className={`mood-pin-note-input research-pin-note-input${
                                  item.inPack && !item.note?.trim()
                                    ? ' needs-why'
                                    : ''
                                }`}
                                value={item.note || ''}
                                onChange={(e) => {
                                  updateMoodPinNote(item.id, e.target.value)
                                }}
                                placeholder={item.inPack ? 'Why ★' : 'note'}
                                aria-label={
                                  item.inPack ? 'Why this pin fits' : 'Pin note'
                                }
                              />
                              <button
                                type="button"
                                className="research-pin-remove"
                                aria-label="Remove reference"
                                onClick={() => removeMoodPin(item.id)}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* The narrowed-down set, as an actual section. Starring already
                existed and already feeds Design and Deliver, but it was only
                ever an outline on a pin somewhere in the board — so the one
                thing the stage is FOR, the shortlist, was the one thing you
                could not look at. Deliberately not a second concept: this is
                the same ★ pack, finally visible. */}
            {starred > 0 && (
              <section className="panel brand-section research-shortlist">
                <div className="research-shortlist-head">
                  <h2 className="research-shortlist-title">Shortlist</h2>
                  <p className="research-shortlist-count">
                    {starred >= 6
                      ? 'Full — unstar one to swap'
                      : `Room for ${6 - starred} more`}
                  </p>
                </div>
                <ul className="research-shortlist-strip">
                  {deskMood
                    .filter((m) => m.inPack)
                    .map((pin) => (
                      <li key={pin.id} className="research-shortlist-item">
                        <button
                          type="button"
                          className="research-shortlist-face"
                          style={pinFaceStyle(pin)}
                          title={pin.note || 'Open'}
                          onClick={() => setBoardLightbox(pin)}
                        >
                          <span className="sr-only">
                            {pin.note || 'Shortlisted pin'}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="research-shortlist-drop"
                          onClick={() => toggleMoodPinInPack?.(pin.id)}
                          aria-label={`Remove ${pin.note || 'pin'} from shortlist`}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            )}
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
                  className={`board-lightbox-visual board-lightbox-img board-lightbox-eyedrop${
                    lightboxFocalMode ? ' is-focal-mode' : ''
                  }`}
                  src={pinImageUrl(boardLightbox)}
                  alt={boardLightbox.note || 'Research pin'}
                  decoding="async"
                  title={
                    lightboxFocalMode
                      ? 'Click the part of the image you want centered in the tile'
                      : 'Click anywhere on the image to add that color to your palette'
                  }
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const xRatio = (e.clientX - rect.left) / rect.width
                    const yRatio = (e.clientY - rect.top) / rect.height
                    if (lightboxFocalMode) {
                      setMoodPinFocal(
                        boardLightbox.id,
                        Math.round(xRatio * 100),
                        Math.round(yRatio * 100)
                      )
                      flashMicro('Crop focus set')
                      setLightboxFocalMode(false)
                      return
                    }
                    if ((projectPalette?.length || 0) >= 8) {
                      flashToast('Palette is full (max 8)')
                      return
                    }
                    const hex = sampleColorAt(e.currentTarget, xRatio, yRatio)
                    if (!hex) return
                    addPaletteColor(hex)
                    flashMicro(`+ ${hex} to palette`)
                  }}
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
              {pinImageUrl(boardLightbox) ? (
                <div className="board-lightbox-eyedrop-row">
                  <p className="board-lightbox-eyedrop-hint">
                    {lightboxFocalMode
                      ? 'Tap the image where you want it centered'
                      : 'Click the image to pick a color into your palette'}
                  </p>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-sm${lightboxFocalMode ? ' is-on' : ''}`}
                    onClick={() => setLightboxFocalMode((v) => !v)}
                  >
                    {lightboxFocalMode ? 'Cancel' : 'Adjust crop focus'}
                  </button>
                </div>
              ) : null}
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
                      flashToast(r.error || 'Client pack is full (6 pictures max)')
                    else {
                      setBoardLightbox((p) =>
                        p ? { ...p, inPack: r.inPack } : null
                      )
                    }
                  }}
                >
                  {boardLightbox.inPack ? '★ Pack' : '☆ Pack'}
                </button>
              </div>
            </div>
          </div>
        )}

      <div className="path-continue-row">
        <button
          type="button"
          className="btn btn-primary work-path-next"
          onClick={() => setActiveView?.(journeyNext?.view || 'brand')}
        >
          {`Next · ${journeyNext?.label || labelForStepId('design')}`}
        </button>
      </div>
    </>
  )
}
