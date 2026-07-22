import { useEffect, useRef, useState } from 'react'

/**
 * Single-question card with the shared advance/retreat transition.
 * `cardKey` must change whenever the question changes — that's what
 * triggers the slide-out/slide-in pair.
 */
export default function FocusCard({ cardKey, children }) {
  const [phase, setPhase] = useState('enter')
  const prevKey = useRef(cardKey)

  useEffect(() => {
    if (prevKey.current !== cardKey) {
      prevKey.current = cardKey
      setPhase('enter')
      const t = setTimeout(() => setPhase('idle'), 20)
      return () => clearTimeout(t)
    }
    setPhase('idle')
  }, [cardKey])

  return (
    <div className={`focus-card focus-card-${phase}`} key={cardKey}>
      {children}
    </div>
  )
}
