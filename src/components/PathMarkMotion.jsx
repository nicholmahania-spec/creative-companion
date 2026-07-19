import { useEffect, useRef, useState } from 'react'
import { pathMarkLottie } from '../lib/pathMarkLottie'

/**
 * Animated product mark — Lottie when motion allowed, static SVG fallback.
 * lottie-web is dynamically imported (code-split off main path).
 */
export default function PathMarkMotion({
  size = 22,
  reduceMotion = false,
  className = '',
}) {
  const hostRef = useRef(null)
  const animRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (reduceMotion || failed) return undefined
    let cancelled = false
    const host = hostRef.current
    if (!host) return undefined

    ;(async () => {
      try {
        const lottieMod = await import('lottie-web')
        if (cancelled || !hostRef.current) return
        const lottie = lottieMod.default || lottieMod
        host.innerHTML = ''
        animRef.current = lottie.loadAnimation({
          container: host,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          animationData: pathMarkLottie,
          rendererSettings: {
            progressiveLoad: true,
            preserveAspectRatio: 'xMidYMid meet',
          },
        })
        // Soft loop once settled — replay every 8s unless reduced
        const onComplete = () => {
          if (cancelled || reduceMotion) return
          window.setTimeout(() => {
            if (animRef.current && !cancelled) {
              animRef.current.goToAndPlay(0, true)
            }
          }, 8000)
        }
        animRef.current.addEventListener('complete', onComplete)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      if (animRef.current) {
        try {
          animRef.current.destroy()
        } catch {
          /* ignore */
        }
        animRef.current = null
      }
    }
  }, [reduceMotion, failed])

  if (reduceMotion || failed) {
    return (
      <svg
        className={`path-mark-static ${className}`.trim()}
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="3.5"
          y="3.5"
          width="25"
          height="25"
          rx="6"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          className={reduceMotion ? undefined : 'path-mark-draw'}
          d="M9 21.5h6.5M9 16.5h10M9 11.5h14"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <span
      ref={hostRef}
      className={`path-mark-lottie ${className}`.trim()}
      style={{ width: size, height: size, display: 'inline-block' }}
      aria-hidden="true"
    />
  )
}
