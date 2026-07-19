import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  buddyMood,
  confirmLine,
  greetingLine,
  idleLine,
  loadWellness,
  markWellness,
  overdueKinds,
  progressLine,
  wellnessLine,
} from '../lib/buddy'

/**
 * Interactive body-double buddy (rule-based, not AI chat).
 * Checks water / food / bathroom, comments on progress, sits with you.
 */
export default function BuddyMate({
  onClose,
  isFocusRunning = false,
  completedCount = 0,
  nextTaskTitle = '',
  reduceMotion = false,
  pulseWin = 0,
}) {
  const [wellness, setWellness] = useState(() => loadWellness())
  const [messages, setMessages] = useState(() => [
    { id: 1, from: 'buddy', text: greetingLine() },
  ])
  const [expanded, setExpanded] = useState(true)
  const [mood, setMood] = useState('idle')
  const [recentWin, setRecentWin] = useState(false)
  const listRef = useRef(null)
  const msgId = useRef(2)
  const lastCompleted = useRef(completedCount)
  const lastFocus = useRef(isFocusRunning)

  const overdue = useMemo(() => overdueKinds(wellness), [wellness])

  const pushBuddy = useCallback((text) => {
    const id = msgId.current++
    setMessages((m) => [...m.slice(-12), { id, from: 'buddy', text }])
  }, [])

  const pushYou = useCallback((text) => {
    const id = msgId.current++
    setMessages((m) => [...m.slice(-12), { id, from: 'you', text }])
  }, [])

  // Scroll chat
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, expanded])

  // Mood from context
  useEffect(() => {
    setMood(buddyMood({ overdue, isFocusRunning, recentWin }))
  }, [overdue, isFocusRunning, recentWin])

  // Progress: step completed
  useEffect(() => {
    if (completedCount > lastCompleted.current) {
      lastCompleted.current = completedCount
      setRecentWin(true)
      pushBuddy(progressLine('step'))
      const t = window.setTimeout(() => setRecentWin(false), 4000)
      return () => window.clearTimeout(t)
    }
    lastCompleted.current = completedCount
  }, [completedCount, pushBuddy])

  // External win pulse (e.g. complete step toast path)
  useEffect(() => {
    if (!pulseWin) return
    setRecentWin(true)
    pushBuddy(progressLine('step'))
    const t = window.setTimeout(() => setRecentWin(false), 4000)
    return () => window.clearTimeout(t)
  }, [pulseWin, pushBuddy])

  // Timer started
  useEffect(() => {
    if (isFocusRunning && !lastFocus.current) {
      pushBuddy(progressLine('timer'))
    }
    lastFocus.current = isFocusRunning
  }, [isFocusRunning, pushBuddy])

  // Periodic wellness + idle check-ins (every 3 min)
  useEffect(() => {
    const tick = () => {
      const w = loadWellness()
      setWellness(w)
      const od = overdueKinds(w)
      if (od.length) {
        pushBuddy(wellnessLine(od[0]))
      } else {
        pushBuddy(idleLine())
      }
    }
    const interval = window.setInterval(tick, 3 * 60 * 1000)
    // First wellness nudge after 90s if anything overdue
    const first = window.setTimeout(() => {
      const od = overdueKinds(loadWellness())
      if (od.length) pushBuddy(wellnessLine(od[0]))
    }, 90 * 1000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(first)
    }
  }, [pushBuddy])

  const logWellness = (kind, label) => {
    pushYou(label)
    const next = markWellness(kind)
    setWellness(next)
    pushBuddy(confirmLine(kind))
  }

  const reply = (key) => {
    if (key === 'stuck') {
      pushYou("I'm stuck")
      pushBuddy(progressLine('stuck'))
      return
    }
    if (key === 'ok') {
      pushYou("I'm okay for now")
      pushBuddy(
        nextTaskTitle
          ? `Cool. Current step is still: “${nextTaskTitle.slice(0, 60)}${
              nextTaskTitle.length > 60 ? '…' : ''
            }”. One action only.`
          : 'Cool. Dump one idea on Work or break the project into micro-steps.'
      )
      return
    }
    if (key === 'break') {
      pushYou('I need a break')
      pushBuddy(
        'Break allowed. Water + bathroom + stretch. Set a 2‑min timer when you return.'
      )
      return
    }
    if (key === 'progress') {
      pushYou('How am I doing?')
      pushBuddy(
        completedCount > 0
          ? `You've completed ${completedCount} step${
              completedCount === 1 ? '' : 's'
            } this desk session. That's real. ${
              nextTaskTitle
                ? `Next up: “${nextTaskTitle.slice(0, 48)}…”.`
                : 'Queue looks clear — capture or breakdown if you want more.'
            }`
          : nextTaskTitle
            ? `No completes yet — totally fine. Your job is just: “${nextTaskTitle.slice(
                0,
                56
              )}”.`
            : 'No open step yet. Capture one messy idea or run micro-steps.'
      )
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        className="buddy-fab"
        onClick={() => setExpanded(true)}
        aria-label="Open body double buddy"
      >
        <BuddyFace mood={mood} reduceMotion={reduceMotion} compact />
        {overdue.length > 0 && (
          <span className="buddy-fab-dot" aria-hidden="true" />
        )}
      </button>
    )
  }

  return (
    <div
      className={`buddy-panel${isFocusRunning ? ' is-focus' : ''}`}
      role="complementary"
      aria-label="Body double buddy"
    >
      <div className="buddy-panel-top">
        <div className="buddy-identity">
          <BuddyFace mood={mood} reduceMotion={reduceMotion} />
          <div>
            <strong className="buddy-name">Desk Buddy</strong>
            <span className="buddy-status">
              {isFocusRunning
                ? 'Focus mode · sitting with you'
                : 'Interactive body double · not AI chat'}
            </span>
          </div>
        </div>
        <div className="buddy-top-actions">
          <button
            type="button"
            className="buddy-icon-btn"
            onClick={() => setExpanded(false)}
            aria-label="Minimize buddy"
          >
            –
          </button>
          <button
            type="button"
            className="buddy-icon-btn"
            onClick={onClose}
            aria-label="Turn off body double"
          >
            ×
          </button>
        </div>
      </div>

      <div className="buddy-chat" ref={listRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`buddy-bubble buddy-bubble-${m.from}`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="buddy-wellness">
        <p className="buddy-wellness-label">Body check-ins</p>
        <div className="buddy-wellness-row">
          <button
            type="button"
            className={`buddy-check${overdue.includes('water') ? ' is-due' : ''}`}
            onClick={() => logWellness('water', 'I drank water')}
          >
            💧 Water
          </button>
          <button
            type="button"
            className={`buddy-check${overdue.includes('food') ? ' is-due' : ''}`}
            onClick={() => logWellness('food', 'I ate something')}
          >
            🍎 Food
          </button>
          <button
            type="button"
            className={`buddy-check${
              overdue.includes('bathroom') ? ' is-due' : ''
            }`}
            onClick={() => logWellness('bathroom', 'I went to the bathroom')}
          >
            🚻 Bathroom
          </button>
        </div>
      </div>

      <div className="buddy-quick">
        <button type="button" className="buddy-quick-btn" onClick={() => reply('progress')}>
          How am I doing?
        </button>
        <button type="button" className="buddy-quick-btn" onClick={() => reply('stuck')}>
          I&apos;m stuck
        </button>
        <button type="button" className="buddy-quick-btn" onClick={() => reply('break')}>
          Need a break
        </button>
        <button type="button" className="buddy-quick-btn" onClick={() => reply('ok')}>
          I&apos;m okay
        </button>
      </div>
    </div>
  )
}

function BuddyFace({ mood = 'idle', reduceMotion = false, compact = false }) {
  return (
    <div
      className={`buddy-face mood-${mood}${compact ? ' is-compact' : ''}${
        reduceMotion ? ' no-motion' : ''
      }`}
      aria-hidden="true"
    >
      <span className="buddy-antenna" />
      <span className="buddy-eye buddy-eye-l" />
      <span className="buddy-eye buddy-eye-r" />
      <span className="buddy-mouth" />
      <span className="buddy-blush buddy-blush-l" />
      <span className="buddy-blush buddy-blush-r" />
    </div>
  )
}
