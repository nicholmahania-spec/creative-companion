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
  /** Dragging files over the canvas — without feedback, "drop pictures here"
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
  useEffect(() => {
    setTimerFocusSource?.('research')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  const { scale, tx, ty, zoomBy, zoomTo, fitAll, startPan, onWheel, toStage } =
    useCanvasViewport(viewportRef)
  /* A SET, not one id. Narrowing a board means acting on several pins at
     once — starring the four that belong together, pushing a cluster behind
     the rest — and doing that one pin at a time is the friction that makes
     people not bother. */
  const [selectedPinIds, setSelectedPinIds] = useState(() => new Set())
  const selectedPinId = selectedPinIds.size === 1 ? [...selectedPinIds][0] : null
  const selectPin = (id, additive) =>
    setSelectedPinIds((prev) => {
      if (!additive) return new Set([id])
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const clearSelection = () => setSelectedPinIds(new Set())

  /** Rubber-band rectangle in stage coords while shift-dragging empty canvas. */
  const [marquee, setMarquee] = useState(null)
  const marqueeRef = useRef(null)

  /** Shortlist everything selected, stopping cleanly at the cap rather than
   *  silently dropping the overflow — the store refuses past 6 and returns
   *  {ok:false}, which callers used to discard. */
  const starSelected = () => {
    const ids = [...selectedPinIds].filter((id) => {
      const pin = deskMood.find((m) => m.id === id)
      return pin && !pin.inPack
    })
    if (!ids.length) {
      flashToast?.('Already shortlisted')
      return
    }
    let added = 0
    let refused = 0
    ids.forEach((id) => {
      const r = toggleMoodPinInPack?.(id)
      if (r && r.ok === false) refused++
      else added++
    })
    if (refused) {
      flashToast?.(
        added
          ? `Shortlisted ${added} · ${refused} over the 6 limit`
          : 'Shortlist is full — unstar one to swap'
      )
    } else if (added) {
      flashToast?.(`Shortlisted ${added}`)
    }
  }
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
    const start = toStage(e.clientX, e.clientY)

    /* Cmd/Ctrl toggles this pin in the selection. A plain press on a pin that
       is ALREADY selected keeps the whole group, so dragging a multi-selection
       does not collapse to the one pin you happened to grab — otherwise every
       group move would silently become a single move. */
    const additive = e.metaKey || e.ctrlKey
    const alreadyIn = selectedPinIds.has(item.id)
    if (additive || !alreadyIn) selectPin(item.id, additive)

    // Freeze the group's starting geometry so each pin moves by the same
    // delta. Read now, because the selection state update is async.
    const groupIds =
      !additive && alreadyIn ? [...selectedPinIds] : [item.id]
    const group = groupIds
      .map((id) => {
        const idx = deskMood.findIndex((m) => m.id === id)
        if (idx < 0) return null
        const gg = pinGeometry(deskMood[idx], idx)
        return { id, x: gg.x, y: gg.y }
      })
      .filter(Boolean)

    dragRef.current = {
      id: item.id,
      mode: 'move',
      group,
      startX: start.x,
      startY: start.y,
      // Screen-space origin for the movement threshold below.
      startClientX: e.clientX,
      startClientY: e.clientY,
      armed: false,
    }
    bringMoodPinToFront?.(item.id)
    e.stopPropagation()
    e.preventDefault()
  }

  /* Any corner, not just the bottom-right. Which corner you reach for is
     decided by where the pin already is and where you want it to end up —
     forcing every resize through one corner means half of them have to be
     followed by a move to put the pin back. The corners anchored on the
     opposite edge (anything with n or w) also shift x/y as the size changes,
     so the corner you are NOT holding stays put — otherwise "resize" silently
     becomes "resize and slide", which is the thing that makes a board feel
     like it is fighting you. */
  const beginPinResize = (e, item, index, corner) => {
    const g = pinGeometry(item, index)
    const start = toStage(e.clientX, e.clientY)
    // Height is derived from the image's own ratio, so read it off the DOM
    // rather than assuming — the 4:3 clamp is gone and pins differ.
    const el = e.currentTarget.closest('.mood-card')
    const originH = el ? el.getBoundingClientRect().height / scale : g.w
    dragRef.current = {
      id: item.id,
      mode: 'resize',
      corner,
      originW: g.w,
      originH,
      originX: g.x,
      originY: g.y,
      startX: start.x,
    }
    selectPin(item.id, false)
    bringMoodPinToFront?.(item.id)
    e.stopPropagation()
    e.preventDefault()
  }

  /* Marquee: track the rectangle, then select every pin that INTERSECTS it —
     not only those fully enclosed. Requiring full containment means a large
     reference you clearly dragged across gets skipped, which reads as the
     selection being broken rather than strict. */
  useEffect(() => {
    if (!marquee) return undefined
    const onMove = (e) => {
      const start = marqueeRef.current
      if (!start) return
      const p = toStage(e.clientX, e.clientY)
      setMarquee({
        x: Math.min(start.x, p.x),
        y: Math.min(start.y, p.y),
        w: Math.abs(p.x - start.x),
        h: Math.abs(p.y - start.y),
      })
    }
    const onUp = () => {
      const m = marquee
      marqueeRef.current = null
      setMarquee(null)
      if (!m || (m.w < 4 && m.h < 4)) return
      const hit = deskMood.filter((pin, i) => {
        const g = pinGeometry(pin, i)
        const h = g.w * 0.95
        return (
          g.x < m.x + m.w && g.x + g.w > m.x && g.y < m.y + m.h && g.y + h > m.y
        )
      })
      if (hit.length) setSelectedPinIds(new Set(hit.map((p) => p.id)))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [marquee, deskMood, toStage])

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current
      if (!d) return
      const p = toStage(e.clientX, e.clientY)
      if (d.mode === 'move') {
        /* Don't move until the pointer has actually travelled. Dragging
           began on the first pixel of pointer-down, so simply clicking a pin
           to select it — or pressing one to reach its star — shifted it a few
           px, and a board you cannot touch without disturbing is a board you
           stop touching. 4px is below deliberate movement and above hand
           tremor and trackpad noise. */
        if (!d.armed) {
          const travelled = Math.hypot(
            e.clientX - d.startClientX,
            e.clientY - d.startClientY
          )
          if (travelled < 4) return
          d.armed = true
        }
        const dx = p.x - d.startX
        const dy = p.y - d.startY
        // Move the whole selection by the same delta, so a group keeps its
        // arrangement instead of collapsing onto the pin being dragged.
        d.group.forEach((g) => {
          setMoodPinLayout?.(g.id, {
            x: Math.round(g.x + dx),
            y: Math.round(g.y + dy),
          })
        })
      } else {
        // West-side corners grow as the pointer moves LEFT.
        const grows = d.corner === 'nw' || d.corner === 'sw' ? -1 : 1
        const w = Math.round(
          Math.min(PIN_MAX_W, Math.max(PIN_MIN_W, d.originW + grows * (p.x - d.startX)))
        )
        const patch = { w }
        // Keep the opposite corner pinned: shift x/y by whatever the size
        // actually changed by (after clamping, so hitting the min or max
        // stops the pin dead rather than letting it drift).
        const dw = w - d.originW
        const dh = d.originW > 0 ? dw * (d.originH / d.originW) : 0
        if (d.corner === 'nw' || d.corner === 'sw') patch.x = Math.round(d.originX - dw)
        if (d.corner === 'nw' || d.corner === 'ne') patch.y = Math.round(d.originY - dh)
        setMoodPinLayout?.(d.id, patch)
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
    if (!selectedPinIds.size) return undefined
    const onKey = (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const step = e.shiftKey ? 40 : 8
      e.preventDefault()
      // Every selected pin moves together, keeping their relative positions.
      selectedPinIds.forEach((id) => {
        const idx = deskMood.findIndex((m) => m.id === id)
        if (idx < 0) return
        const g = pinGeometry(deskMood[idx], idx)
        setMoodPinLayout?.(id, {
          x: g.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0),
          y: g.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0),
        })
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedPinIds, deskMood, setMoodPinLayout])

  return (
    <>
          <div className="studio-view surface-wall view-enter research-studio" data-nav-dir={navDir}>
            <div className="flow-top research-studio-top">
              <div className="research-top-text">
                <h1 className="page-title">
                  {i18nT(locale, 'path.research')}
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
                      : `★ ${starred} starred · room for ${6 - starred}`
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
                    /* No setActiveView('insights'). Starting the research
                       timer used to navigate off Research — you pressed a
                       timer for the work you were about to do and the page
                       carrying that work disappeared, so the first act of a
                       timed session was finding your way back. */
                    notifyAction('Focus on', 'focus_start', {
                      label: 'Research timer',
                    })
                    flashToast(i18nT(locale, 'ui.researchTimerOn'))
                  }}
                >
                  ⏱
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
            {/* Above the board, and never gated on pin count. This strip used
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
                  {/* Bigger steps and a reset. 1.2x per click meant crossing
                      a useful zoom range took a dozen presses on two small
                      ghost buttons, and there was no way back to 1:1 short of
                      counting clicks — the percentage was a read-only label
                      sitting between them, which is exactly where you would
                      expect to click to reset it. */}
                  <div className="mood-canvas-zoom">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => zoomBy(1 / 1.4)}
                      aria-label="Zoom out"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm mood-canvas-zoom-level"
                      onClick={() => zoomTo(1)}
                      title="Reset to 100%"
                    >
                      {Math.round(scale * 100)}%
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => zoomBy(1.4)}
                      aria-label="Zoom in"
                    >
                      +
                    </button>
                  </div>
                  <p className="mood-canvas-hint">
                    Drag a pin to move · drag the board to pan · ⌘/Ctrl-click or
                    Shift-drag to select several · ⌘/Ctrl + scroll to zoom
                  </p>
                  {selectedPinIds.size > 0 && (
                    <div className="mood-canvas-layer">
                      {/* Narrowing in one gesture. Starring a shortlist one
                          pin at a time is the friction that stops people
                          doing it at all. */}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => starSelected()}
                      >
                        ★ Shortlist
                        {selectedPinIds.size > 1 ? ` ${selectedPinIds.size}` : ''}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          selectedPinIds.forEach((id) => bringMoodPinToFront?.(id))
                        }
                      >
                        Bring to front
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          selectedPinIds.forEach((id) => sendMoodPinToBack?.(id))
                        }
                      >
                        Send to back
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={clearSelection}
                      >
                        Deselect
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div
                ref={viewportRef}
                className={`mood-canvas-viewport${deskMood.length ? ' has-pins' : ''}${
                  boardDropActive ? ' is-drop-active' : ''
                }`}
                // Pan offset for the dot grid, so the surface moves with the
                // board and panning is visible even on an empty canvas.
                style={{ '--canvas-pan-x': `${tx}px`, '--canvas-pan-y': `${ty}px` }}
                onWheel={onWheel}
                /* Drop target is the whole canvas, not the stage. It used to
                   be on the stage only, which worked by accident — the stage
                   is absolutely positioned over the viewport, so it happened
                   to catch drops aimed at the empty state. With the Upload
                   button gone from the canvas, dropping is the canvas's only
                   way in, and it should not depend on stacking order. */
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
                  if (e.dataTransfer.files?.length) uploadMoodFiles(e.dataTransfer.files)
                }}
                onPointerDown={(e) => {
                  const onEmpty =
                    e.target === e.currentTarget ||
                    e.target.classList.contains('mood-canvas-stage')
                  if (!onEmpty) return
                  /* Shift+drag draws a marquee; a plain drag still pans.
                     Figma has it the other way round, but pan-on-drag is what
                     this board already taught and what its hint line says, and
                     silently reassigning the primary gesture is worse than
                     putting the newer one on a modifier. */
                  if (e.shiftKey) {
                    const p = toStage(e.clientX, e.clientY)
                    marqueeRef.current = { x: p.x, y: p.y }
                    setMarquee({ x: p.x, y: p.y, w: 0, h: 0 })
                    e.preventDefault()
                    return
                  }
                  clearSelection()
                  startPan(e)
                }}
              >
              {/* Outside the transform, deliberately. Rendered as a stage
                  child it inherited pan and zoom — so on an empty board a
                  single trackpad gesture could push the only explanation of
                  what this page is for, and its only Upload button, off
                  screen for good. Fit all is hidden at zero pins, so there
                  was no way back. The one surface that must never move is
                  the one telling you how to start. */}
              {deskMood.length === 0 && (
                <div className="empty-state empty-state-craft research-empty">
                  <p className="empty-state-title">Your mood board is empty</p>
                  {/* The three routes in, named. I had cut this down to
                      "Drop pictures here, or upload" while moving the empty
                      state out of the canvas transform, which removed the
                      only place the page explained itself — what starring is
                      for, that URLs work, and that this is a board you
                      arrange rather than a list. */}
                  {/* No Upload button here. Upload now sits in the toolbar
                      above the board with URL and Note, so a second one on
                      the canvas was the same action offered twice, three
                      inches apart — and it made the canvas look like a
                      dropzone widget rather than the work surface it is. The
                      canvas keeps the drop target; the button lives with its
                      siblings. */}
                  <p className="empty-state-subtitle">
                    Drop pictures anywhere here, or use Upload, URL or Note
                    above. Drag pins to arrange them; star up to 6 to carry
                    into your brand direction.
                  </p>
                </div>
              )}
              <div
                className={`mood-board mood-canvas-stage${deskMood.length ? ' has-pins' : ''}`}
                style={{
                  transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                  transformOrigin: '0 0',
                  // Exposed so chrome can counter-scale — see .mood-card-resize
                  // and .is-selected in the canvas CSS block.
                  '--canvas-scale': scale,
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
                {marquee && (
                  <div
                    className="mood-marquee"
                    style={{
                      left: `${marquee.x}px`,
                      top: `${marquee.y}px`,
                      width: `${marquee.w}px`,
                      height: `${marquee.h}px`,
                    }}
                  />
                )}
                {deskMood.length === 0 ? null : (
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
                          selectedPinIds.has(item.id) ? ' is-selected' : ''
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
                        {selectedPinIds.has(item.id) &&
                          ['nw', 'ne', 'sw', 'se'].map((corner) => (
                            <span
                              key={corner}
                              className={`mood-card-resize is-${corner}`}
                              role="presentation"
                              onPointerDown={(e) =>
                                beginPinResize(e, item, index, corner)
                              }
                            />
                          ))}
                      </article>
                    )
                  })
                )}
              </div>
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
