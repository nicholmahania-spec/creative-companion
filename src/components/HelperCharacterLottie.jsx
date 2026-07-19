import { useEffect, useRef, useState } from 'react'
import { reelForMood } from '../lib/helperLottieReels'

/**
 * Helper character Lottie reels — mood-driven face animation.
 * Falls back to static image when reduceMotion or load fails.
 */
export default function HelperCharacterLottie({
  mood = 'idle',
  reduceMotion = false,
  size = 64,
  fallbackSrc = '',
  className = '',
}) {
  const hostRef = useRef(null)
  const animRef = useRef(null)
  const [useFallback, setUseFallback] = useState(!!reduceMotion)

  useEffect(() => {
    if (reduceMotion) {
      setUseFallback(true)
      return undefined
    }
    let cancelled = false
    const host = hostRef.current
    if (!host) return undefined

    ;(async () => {
      try {
        const lottieMod = await import('lottie-web')
        if (cancelled || !hostRef.current) return
        const lottie = lottieMod.default || lottieMod
        if (animRef.current) {
          try {
            animRef.current.destroy()
          } catch {
            /* ignore */
          }
          animRef.current = null
        }
        host.innerHTML = ''
        animRef.current = lottie.loadAnimation({
          container: host,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: reelForMood(mood),
          rendererSettings: {
            progressiveLoad: true,
            preserveAspectRatio: 'xMidYMid meet',
          },
        })
        setUseFallback(false)
      } catch {
        if (!cancelled) setUseFallback(true)
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
  }, [mood, reduceMotion])

  if (useFallback && fallbackSrc) {
    return (
      <img
        className={className}
        src={fallbackSrc}
        alt=""
        width={size}
        height={size}
        draggable={false}
      />
    )
  }

  return (
    <span
      ref={hostRef}
      className={`helper-character-lottie ${className}`.trim()}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        borderRadius: '50%',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    />
  )
}
