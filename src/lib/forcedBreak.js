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
  // Short pomodoro (e.g. 2-min test) still gets a real pause
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

export function breakReasonCopy(workMinutes, breakMin) {
  const w = Math.round(workMinutes)
  return {
    title: 'Nope. Break time. Desk locked.',
    body: `You worked about ${w} minute${w === 1 ? '' : 's'}. Congrats on the grind—and also: sit down… wait, stand up. ${breakMin} minutes. Water. Bathroom. Eyes off the glowing rectangle. The app unlocks when I say so (when the timer ends).`,
    tip: "This isn't a suggestion, it's an intervention. Hyperfocus doesn't get a veto. See you after the stretch.",
  }
}
