import { useEffect, useRef, useState } from 'react'
import {
  HELPER_BODY_ASSETS_PATH,
  reelForMood,
} from '../lib/helperLottieReels'

/** Character art aspect (560×662). */
const BODY_ASPECT = 560 / 662

/**
 * Photoreal full-body Helper Lottie reels — mood-driven body motion.
 * Falls back to static image when reduceMotion or load fails.
 *
 * @param {'circle'|'body'} shape — circle crops for FAB/avatar; body keeps full figure
 */
export default function HelperCharacterLottie({
  mood = 'idle',
  reduceMotion = false,
  size = 64,
  /** Height for body shape; width derived from aspect when shape="body" */
  height,
  fallbackSrc = '',
  className = '',
  shape = 'circle',
}) {
  const hostRef = useRef(null)
  const animRef = useRef(null)
  const [useFallback, setUseFallback] = useState(!!reduceMotion)

  const isBody = shape === 'body'
  const h = height ?? size
  const w = isBody ? Math.round(h * BODY_ASPECT) : size

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
        const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
        const assetsPath = `${base}${HELPER_BODY_ASSETS_PATH}`
        // Circle avatars crop upper body; full figure uses meet
        const preserve = isBody ? 'xMidYMid meet' : 'xMidYMin slice'
        animRef.current = lottie.loadAnimation({
          container: host,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: reelForMood(mood),
          assetsPath,
          rendererSettings: {
            progressiveLoad: true,
            preserveAspectRatio: preserve,
            hideOnTransparent: true,
          },
        })
        const onFail = () => {
          if (!cancelled) setUseFallback(true)
        }
        animRef.current.addEventListener('data_failed', onFail)
        animRef.current.addEventListener('error', onFail)
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
  }, [mood, reduceMotion, isBody])

  if (useFallback && fallbackSrc) {
    return (
      <img
        className={`helper-character-fallback ${className}`.trim()}
        src={fallbackSrc}
        alt=""
        width={w}
        height={h}
        draggable={false}
        style={
          isBody
            ? {
                width: w,
                height: h,
                objectFit: 'contain',
                objectPosition: 'center bottom',
              }
            : undefined
        }
      />
    )
  }

  return (
    <span
      ref={hostRef}
      className={`helper-character-lottie helper-character-lottie--${shape} ${className}`.trim()}
      style={{
        width: w,
        height: h,
        display: 'inline-block',
        borderRadius: isBody ? '0.75rem' : '50%',
        overflow: 'hidden',
        verticalAlign: 'middle',
      }}
      aria-hidden="true"
    />
  )
}
