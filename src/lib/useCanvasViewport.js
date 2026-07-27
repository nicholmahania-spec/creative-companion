import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Pan/zoom transform for the mood canvas.
 *
 * The one rule this hook exists to guarantee: **a pin can never be lost.**
 * An infinite canvas is a surface where things drift off-screen and stop
 * existing, which is the same failure as burying something below the fold —
 * and that is a stated, non-negotiable problem for this user. So `fitAll` is
 * always one click away, the zoom is clamped so you cannot end up at a
 * magnification where nothing is findable, and the canvas auto-fits the first
 * time a board is opened rather than dropping you at an arbitrary origin.
 */

export const MIN_SCALE = 0.15
export const MAX_SCALE = 3

export function useCanvasViewport(viewportRef) {
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const panning = useRef(null)

  const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

  /** Zoom about a point in viewport coords, so the content under the cursor
   *  stays under the cursor — without this, zooming walks the board away
   *  from whatever you were looking at. */
  const zoomAt = useCallback(
    (nextScale, px, py) => {
      setScale((prev) => {
        const s = clampScale(nextScale)
        setTx((x) => px - ((px - x) * s) / prev)
        setTy((y) => py - ((py - y) * s) / prev)
        return s
      })
    },
    []
  )

  const zoomBy = useCallback(
    (factor) => {
      const el = viewportRef.current
      const rect = el?.getBoundingClientRect()
      const cx = rect ? rect.width / 2 : 0
      const cy = rect ? rect.height / 2 : 0
      setScale((prev) => {
        const s = clampScale(prev * factor)
        setTx((x) => cx - ((cx - x) * s) / prev)
        setTy((y) => cy - ((cy - y) * s) / prev)
        return s
      })
    },
    [viewportRef]
  )

  /** Jump to an exact zoom about the viewport centre — backs the percentage
   *  readout doubling as a "reset to 100%" button. */
  const zoomTo = useCallback(
    (target) => {
      const el = viewportRef.current
      const rect = el?.getBoundingClientRect()
      const cx = rect ? rect.width / 2 : 0
      const cy = rect ? rect.height / 2 : 0
      setScale((prev) => {
        const s = clampScale(target)
        setTx((x) => cx - ((cx - x) * s) / prev)
        setTy((y) => cy - ((cy - y) * s) / prev)
        return s
      })
    },
    [viewportRef]
  )

  /** Frame the whole board with a margin. The escape hatch. */
  const fitAll = useCallback(
    (bounds) => {
      const el = viewportRef.current
      if (!el || !bounds) return
      const rect = el.getBoundingClientRect()
      const pad = 48
      const sx = (rect.width - pad * 2) / bounds.w
      const sy = (rect.height - pad * 2) / bounds.h
      const s = clampScale(Math.min(sx, sy, 1))
      setScale(s)
      setTx(pad + (rect.width - pad * 2 - bounds.w * s) / 2 - bounds.x * s)
      setTy(pad + (rect.height - pad * 2 - bounds.h * s) / 2 - bounds.y * s)
    },
    [viewportRef]
  )

  const startPan = useCallback(
    (e) => {
      panning.current = { x: e.clientX, y: e.clientY, tx, ty }
    },
    [tx, ty]
  )

  useEffect(() => {
    if (!panning.current) return undefined
    const onMove = (e) => {
      const p = panning.current
      if (!p) return
      setTx(p.tx + (e.clientX - p.x))
      setTy(p.ty + (e.clientY - p.y))
    }
    const onUp = () => {
      panning.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  })

  /** Wheel zooms with ctrl/⌘ (and on trackpad pinch, which browsers report as
   *  ctrl+wheel); plain wheel scrolls the board like a page. */
  const onWheel = useCallback(
    (e) => {
      const el = viewportRef.current
      if (!el) return
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = el.getBoundingClientRect()
        setScale((prev) => {
          const s = clampScale(prev * (e.deltaY < 0 ? 1.12 : 1 / 1.12))
          const px = e.clientX - rect.left
          const py = e.clientY - rect.top
          setTx((x) => px - ((px - x) * s) / prev)
          setTy((y) => py - ((py - y) * s) / prev)
          return s
        })
      }
      /* No plain-wheel panning. It stole the page's own scroll for the whole
         height of the board, which put the add-a-pin toolbar below it out of
         reach. Zoom is ctrl/⌘+wheel (and trackpad pinch, which browsers
         report the same way); panning is drag, which is unambiguous. */
    },
    [viewportRef]
  )

  /** Convert a viewport point to stage coordinates. */
  const toStage = useCallback(
    (clientX, clientY) => {
      const el = viewportRef.current
      if (!el) return { x: 0, y: 0 }
      const rect = el.getBoundingClientRect()
      return {
        x: (clientX - rect.left - tx) / scale,
        y: (clientY - rect.top - ty) / scale,
      }
    },
    [viewportRef, tx, ty, scale]
  )

  return { scale, tx, ty, zoomAt, zoomBy, zoomTo, fitAll, startPan, onWheel, toStage }
}
