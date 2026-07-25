/**
 * Custom pull-to-refresh — needed because the app can run installed as a
 * standalone PWA (manifest.webmanifest: display: "standalone"), where the
 * browser's native pull-to-refresh gesture doesn't apply.
 */
import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 72

export default function PullToRefresh({ reduceMotion = false }) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const pulling = useRef(false)

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY > 0 || refreshing) return
      if (e.target.closest?.('[role="dialog"]')) return
      startY.current = e.touches[0].clientY
      pulling.current = true
    }

    const onTouchMove = (e) => {
      if (!pulling.current || startY.current == null) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) {
        setPull(0)
        return
      }
      // Diminishing return past the threshold so it doesn't feel infinite
      const eased = delta < THRESHOLD ? delta : THRESHOLD + (delta - THRESHOLD) * 0.3
      setPull(eased)
    }

    const onTouchEnd = () => {
      if (!pulling.current) return
      pulling.current = false
      startY.current = null
      if (pull >= THRESHOLD) {
        setRefreshing(true)
        window.setTimeout(() => window.location.reload(), 250)
      } else {
        setPull(0)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [pull, refreshing])

  if (pull <= 0 && !refreshing) return null

  const ready = pull >= THRESHOLD || refreshing

  return (
    <div
      className={`pull-refresh-indicator${ready ? ' is-ready' : ''}`}
      style={{ transform: `translate(-50%, ${Math.min(pull, THRESHOLD + 24)}px)` }}
      aria-hidden="true"
    >
      <span
        className={`pull-refresh-spinner${refreshing && !reduceMotion ? ' is-spinning' : ''}`}
      />
    </div>
  )
}
