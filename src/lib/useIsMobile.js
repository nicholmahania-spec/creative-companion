import { useState, useEffect } from 'react'

/**
 * True when the viewport is at or below `maxWidth` (default 767px → phone).
 * SSR-safe; updates on resize/orientation via matchMedia.
 */
export default function useIsMobile(maxWidth = 767) {
  const query = `(max-width: ${maxWidth}px)`
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia(query)
    const onChange = (e) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [query])

  return isMobile
}
