/**
 * Research — board wall primary; ★ pack pins; sticky Next → Ideate.
 * ADHD: short chrome, goal anchor, focus lock on pin notes.
 */
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import useAppStore from '../store/useAppStore'
import { getProcessPhase } from '../lib/processGuide'
import InfoReveal from '../components/InfoReveal'
import {
  pinFaceStyle,
  pinImageUrl,
  readImageFilesAsPins,
  pinGeometry,
  boardBounds,
  PIN_MIN_W,
  PIN_MAX_W,
} from '../lib/moodPins'
import { useCanvasViewport } from '../lib/useCanvasViewport'
import { extractDominantColors, sampleColorAt } from '../lib/extractColors'
import {
  normalizeLocale,
  t as i18nT,
  pathLabel,
  tFormat,
} from '../lib/i18n'
import { useModalFocus } from '../lib/useModalFocus'
import { trackMoodPinOperation, trackBoardSubmission, trackTimerOperation } from '../lib/analytics'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

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
  onAddPinModeChange,
}) {
  const locale = normalizeLocale(localeProp)
  const addMoodPin = useAppStore((s) => s.addMoodPin)
  const removeMoodPin = useAppStore((s) => s.removeMoodPin)
  const updateMoodPinNote = useAppStore((s) => s.updateMoodPinNote)
  const toggleMoodPinInPack = useAppStore((s) => s.toggleMoodPinInPack)
  const movePackPin = useAppStore((s) => s.movePackPin)
  const setMoodPinFocal = useAppStore((s) => s.setMoodPinFocal)
  const setPackHeroPin = useAppStore((s) => s.setPackHeroPin)
  const reorderBoardPins = useAppStore((s) => s.reorderBoardPins)
  const addPaletteColor = useAppStore((s) => s.addPaletteColor)
  const setMoodPinLayout = useAppStore((s) => s.setMoodPinLayout)
  const bringMoodPinToFront = useAppStore((s) => s.bringMoodPinToFront)
  const sendMoodPinToBack = useAppStore((s) => s.sendMoodPinToBack)
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
  const [boardDragId, setBoardDragId] = useState(null)
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
        trackMoodPinOperation('add', pin)
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
    const url = boardUrl.trim()
    if (!url || boardUrlBusy) return

    // Same capture-before-await rule as uploadMoodFiles: the link-preview
    // round-trip can outlive the user's stay on this project.
    const ownerProjectId = activeProjectId

    const addPinAndReset = (pin) => {
      addMoodPin({ ...pin, projectId: ownerProjectId ?? pin.projectId })
      trackBoardSubmission('url')
      trackMoodPinOperation('add', pin)
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
      addPinAndReset(
        data.image
          ? { ...previewPin, type: 'image', visual: data.image }
          : { ...previewPin, type: 'quote', visual: '#44403C' }
      )
    } catch {
      addPinAndReset(asDirectImagePin())
    } finally {
      setBoardUrlBusy(false)
    }
  }

  const submitBoardNote = () => {
    const note = boardNote.trim() || 'Direction note'
    const pin = {
      type: 'quote',
      note,
      visual:
        projectPalette[0] ||
        'linear-gradient(135deg, #1C1917, #0F766E)',
    }
    addMoodPin(pin)
    trackBoardSubmission('note')
    trackMoodPinOperation('add', pin)
    setBoardNote('')
    setBoardAddMode(null)
    notifyAction?.('Pin added', 'mood_pin', { label: 'Note pin' })
  }

  const starred = deskMood.filter((m) => m.inPack).length
  const words = String(brandWords || '').trim()

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

  /* ── Canvas ─────────────────────────────────────────────────────────────
     The board is a free canvas rather than a grid. Pins that have never been
     moved are auto-placed from their board order, so a new pin never asks
     "where does this go?" and an existing board opens already arranged —
     positioning is available, never required. */
  const viewportRef = useRef(null)
  const { scale, tx, ty, zoomBy, fitAll, startPan, onWheel, toStage } =
    useCanvasViewport(viewportRef)
  const [selectedPinId, setSelectedPinId] = useState(null)
  const dragRef = useRef(null)
  const didInitialFit = useRef(false)

  const bounds = useMemo(() => boardBounds(deskMood), [deskMood])

  // Frame the whole board on first open, so nobody lands on empty canvas with
  // their pins somewhere off-screen.
  useEffect(() => {
    if (didInitialFit.current || !deskMood.length) return
    didInitialFit.current = true
    const id = requestAnimationFrame(() => fitAll(bounds))
    return () => cancelAnimationFrame(id)
  }, [deskMood.length, bounds, fitAll])

  const beginPinDrag = (e, item, index) => {
    if (e.button != null && e.button !== 0) return
    const g = pinGeometry(item, index)
    const start = toStage(e.clientX, e.clientY)
    dragRef.current = {
      id: item.id,
      mode: 'move',
      originX: g.x,
      originY: g.y,
      startX: start.x,
      startY: start.y,
    }
    setSelectedPinId(item.id)
    bringMoodPinToFront?.(item.id)
    e.stopPropagation()
    e.preventDefault()
  }

  const beginPinResize = (e, item, index) => {
    const g = pinGeometry(item, index)
    const start = toStage(e.clientX, e.clientY)
    dragRef.current = {
      id: item.id,
      mode: 'resize',
      originW: g.w,
      startX: start.x,
    }
    setSelectedPinId(item.id)
    e.stopPropagation()
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current
      if (!d) return
      const p = toStage(e.clientX, e.clientY)
      if (d.mode === 'move') {
        setMoodPinLayout?.(d.id, {
          x: Math.round(d.originX + (p.x - d.startX)),
          y: Math.round(d.originY + (p.y - d.startY)),
        })
      } else {
        const next = d.originW + (p.x - d.startX)
        setMoodPinLayout?.(d.id, {
          w: Math.round(Math.min(PIN_MAX_W, Math.max(PIN_MIN_W, next))),
        })
      }
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [toStage, setMoodPinLayout])

  /* Arrow keys nudge the selected pin. The pointer path is a mouse-only
     capability otherwise, and dragging is the whole interaction here. */
  useEffect(() => {
    if (!selectedPinId) return undefined
    const onKey = (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const idx = deskMood.findIndex((m) => m.id === selectedPinId)
      if (idx < 0) return
      const g = pinGeometry(deskMood[idx], idx)
      const step = e.shiftKey ? 40 : 8
      e.preventDefault()
      setMoodPinLayout?.(selectedPinId, {
        x: g.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0),
        y: g.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0),
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedPinId, deskMood, setMoodPinLayout])

  return (
    <>
          <div className="studio-view surface-wall view-enter research-studio" data-nav-dir={navDir}>
            <div className="flow-top research-studio-top">
              <div className="research-top-text">
                <h1 className="page-title">
                  {i18nT(locale, 'path.research')}
                </h1>
                <p className="research-status" role="status">
                  {starred > 0
                    ? `★ ${starred}/6`
                    : `${deskMood.length} pin${deskMood.length === 1 ? '' : 's'}`}
                </p>
                {words ? (
                  <p className="research-goal-anchor" title={words}>
                    Words · {words.slice(0, 64)}
                    {words.length > 64 ? '…' : ''}
                  </p>
                ) : null}
              </div>
              <div className="research-studio-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm research-timer-btn"
                  title="20-min timer"
                  aria-label="Start 20-minute research timer"
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
                  ⏱
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveView('research-focus')}
                >
                  Try Focus Mode (beta)
                </button>
                <InfoReveal>
                  {(getProcessPhase('research')?.checks || []).join(' · ')}
                </InfoReveal>
              </div>
            </div>

            {/* The canvas is the stage. Fit all is deliberately always
                visible and never behind a menu — it is the guarantee that a
                pin dragged out of view can always be found again, which is
                what makes a free canvas safe here at all. */}
            <section className="panel brand-section board-wall-panel research-wall">
              {deskMood.length > 0 && (
                <div className="mood-canvas-bar">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => fitAll(bounds)}
                  >
                    Fit all
                  </button>
                  <div className="mood-canvas-zoom">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => zoomBy(1 / 1.2)}
                      aria-label="Zoom out"
                    >
                      −
                    </button>
                    <span className="mood-canvas-zoom-level">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => zoomBy(1.2)}
                      aria-label="Zoom in"
                    >
                      +
                    </button>
                  </div>
                  {selectedPinId && (
                    <div className="mood-canvas-layer">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => bringMoodPinToFront?.(selectedPinId)}
                      >
                        Bring to front
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => sendMoodPinToBack?.(selectedPinId)}
                      >
                        Send to back
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div
                ref={viewportRef}
                className={`mood-canvas-viewport${deskMood.length ? ' has-pins' : ''}`}
                onWheel={onWheel}
                onPointerDown={(e) => {
                  // Dragging empty canvas pans; clicking it clears selection.
                  if (e.target === e.currentTarget || e.target.classList.contains('mood-canvas-stage')) {
                    setSelectedPinId(null)
                    startPan(e)
                  }
                }}
              >
              <div
                className={`mood-board mood-canvas-stage${deskMood.length ? ' has-pins' : ''}`}
                style={{
                  transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                  transformOrigin: '0 0',
                }}
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
                  <div className="empty-state empty-state-craft research-empty">
                    <p className="empty-state-title">Your mood board is empty</p>
                    <p className="empty-state-subtitle">
                      Add references that capture the feel you’re after — upload
                      images, drag one in, or paste an image URL. Star up to 6 to
                      carry them into your brand direction.
                    </p>
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
                  </div>
                ) : (
                  deskMood.map((item, index) => {
                    const face = pinFaceStyle(item)
                    const isImageFace = Boolean(face.backgroundImage?.includes('url('))
                    const isQuote =
                      !isImageFace ||
                      item.type === 'quote' ||
                      item.type === 'spark' ||
                      item.type === 'color' ||
                      item.type === 'note'
                    const geo = pinGeometry(item, index)
                    return (
                      <article
                        key={item.id || index}
                        data-pin-id={item.id}
                        onPointerDown={(e) => beginPinDrag(e, item, index)}
                        style={{
                          left: `${geo.x}px`,
                          top: `${geo.y}px`,
                          width: `${geo.w}px`,
                          zIndex: geo.z,
                        }}
                        className={`mood-card is-canvas-pin${
                          isQuote && !isImageFace ? ' is-quote' : ''
                        }${item.inPack ? ' is-pack-pin' : ''}${
                          selectedPinId === item.id ? ' is-selected' : ''
                        }${item.packHero ? ' is-pack-hero' : ''}`}
                      >
                        {isImageFace ? (
                          <>
                          <button
                            type="button"
                            className="mood-pin-media mood-pin-media-btn"
                            style={
                              pinImageUrl(item)
                                ? { backgroundColor: 'var(--bg-muted)' }
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
                                onLoad={(e) => {
                                  if (pinSwatches[item.id]) return
                                  const colors = extractDominantColors(e.currentTarget, 4)
                                  if (colors.length) {
                                    setPinSwatches((prev) => ({ ...prev, [item.id]: colors }))
                                  }
                                }}
                              />
                            ) : null}
                          </button>
                          {pinSwatches[item.id]?.length ? (
                            <div className="mood-pin-swatches" aria-label="Suggested colors from this image">
                              {pinSwatches[item.id].map((hex) => (
                                <button
                                  key={hex}
                                  type="button"
                                  className="mood-pin-swatch"
                                  style={{ backgroundColor: hex }}
                                  title={`Add ${hex} to palette`}
                                  aria-label={`Add ${hex} to palette`}
                                  onClick={(e) => {
                                    e.stopPropagation()
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
                          </>
                        ) : (
                          <div
                            className="mood-pin-face"
                            style={face}
                          >
                            <p className="mood-pin-caption">
                              {item.linkTitle || item.note || 'Note'}
                            </p>
                          </div>
                        )}
                        {/* A pinned link should say what it is. Without this a
                            reference from the web was an unlabelled image or a
                            grey rectangle, and you could not tell a competitor's
                            site from a stock photo without opening it. */}
                        {item.link && (
                          <div className="mood-pin-link">
                            {item.linkDescription && (
                              <p className="mood-pin-link-desc">
                                {item.linkDescription}
                              </p>
                            )}
                            <a
                              className="mood-pin-link-host"
                              href={item.link}
                              target="_blank"
                              rel="noreferrer noopener"
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              {item.linkHost || 'Open link'} ↗
                            </a>
                          </div>
                        )}
                        <div className="mood-pin-tools">
                          <div className="mood-pin-tools-row">
                            <button
                              type="button"
                              className={`mood-pin-star${item.inPack ? ' is-on' : ''}${item.packHero ? ' is-hero' : ''}`}
                              title={
                                item.inPack
                                  ? 'Remove from pack'
                                  : 'Add to pack (max 6)'
                              }
                              aria-label={
                                item.inPack
                                  ? 'In pack — remove'
                                  : 'Add to pack'
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
                                    r.inPack ? '★ pack' : '☆ pack'
                                  )
                                // Track the operation
                                trackMoodPinOperation(
                                  r.inPack ? 'toggle_pack_on' : 'toggle_pack_off',
                                  { ...item, inPack: r.inPack }
                                )
                              }}
                            >
                              {item.inPack ? '★' : '☆'}
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
                                      onClick={() => {
                                    movePackPin(item.id, 'up')
                                    // Track the operation
                                    trackMoodPinOperation('move_pack_up', item)
                                  }}
                                    >
                                      ↑
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-ghost mood-pin-order"
                                      onClick={() =>
                                        movePackPin(item.id, 'down')
                                      }
                                    >
                                      ↓
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
                                        else {
                                          flashMicro(i18nT(locale, 'ui.heroPinSet'))
                                          // Track the operation
                                          trackMoodPinOperation('set_hero', { ...item, packHero: r.inPack })
                                        }
                                      }}
                                    >
                                      Hero
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-ghost mood-pin-remove"
                                  onClick={() => {
                              removeMoodPin(item.id)
                              // Track mood pin removal
                              trackMoodPinOperation('remove', { ...item })
                            }}
                                >
                                  Remove
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
                            onChange={(e) => {
                              updateMoodPinNote(item.id, e.target.value)
                              trackMoodPinOperation('update_note', { ...item, note: e.target.value })
                            }}
                            placeholder={
                              item.inPack ? 'Why ★' : 'Caption…'
                            }
                            aria-label={
                              item.inPack ? 'Why this pin fits' : 'Pin note'
                            }
                          />
                        </div>
                        {/* Resize grip. Only on the selected pin, so a board
                            at rest shows none of them — the handle is a tool,
                            not decoration on every card. */}
                        {selectedPinId === item.id && (
                          <span
                            className="mood-card-resize"
                            role="presentation"
                            onPointerDown={(e) => beginPinResize(e, item, index)}
                          />
                        )}
                      </article>
                    )
                  })
                )}
              </div>
              </div>
            </section>

            {/* Compact add — below the wall */}
            <section className="panel brand-section board-add-compact">
              <div className="board-add-toolbar">
                {deskMood.length > 0 && (
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
                {deskMood.length > 0 && (
                  <details className="board-pack-bulk research-advanced">
                    <summary>Pack tools</summary>
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
                        Clear ★
                      </button>
                    </div>
                  </details>
                )}
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
                      className="field-input"
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
                      flashToast(r.error || i18nT(locale, 'ui.leaveBehindFull'))
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

    </>
  )
}
