/**
 * Forced Pomodoro breaks — block the desk until break time is done.
 * Break length scales with continuous work (5–10 minutes).
 */

export const POMODORO_WORK_MIN = 25

/**
 * @param {number} workMinutes - continuous work since last real break
 * @returns {number} break length in minutes (5–10)
 */
export function breakMinutesForWork(workMinutes) {
  const m = Math.max(0, Number(workMinutes) || 0)
  if (m >= 75) return 10
  if (m >= 50) return 8
  if (m >= 40) return 7
  if (m >= 25) return 5
  if (m >= 15) return 5
  if (m >= 5) return 5
  return 5
}

export function formatBreakClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

/** ADHD: short lock message — no lecture */
export function breakReasonCopy(workMinutes, breakMin) {
  const w = Math.round(workMinutes)
  return {
    title: 'Break · desk locked',
    body: `~${w} min work · ${breakMin} min rest · water · stand`,
    tip: 'Unlocks when the clock hits zero',
  }
}
