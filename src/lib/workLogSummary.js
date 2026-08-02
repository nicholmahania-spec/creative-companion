/**
 * One definition of "where did this project's time go".
 *
 * Extracted from WorkLogPanel so the desk strip and the panel cannot drift
 * apart. Two copies of this aggregation would eventually disagree, and the
 * one place that must stay trustworthy is the record of your own hours.
 *
 * Nothing here is billable. `workLog` is the private work clock; `timeLog` is
 * hand-entered invoice time and never passes through this file.
 */
import { JOURNEY_STEPS } from './journey'

/** Labels for both journey view ids (`studio`) and step ids (`research`). */
const STAGE_TO_LABEL = Object.fromEntries([
  ...JOURNEY_STEPS.map((s) => [s.view, s.label]),
  ...JOURNEY_STEPS.map((s) => [s.id, s.label]),
])

/**
 * 'Work', not a stage name. This once read 'Touchpoints' because a bulk
 * rename swept the neutral default along with the stop it renamed, turning a
 * fallback into a specific stop and misattributing unlabelled hours.
 */
export function stageLabel(stage) {
  if (!stage) return 'Work'
  return STAGE_TO_LABEL[stage] || stage
}

/** True when a row carries no real stage — kept as its own neutral segment
 *  rather than dropped or attributed, or the bar quietly lies. */
export function isUnstaged(stage) {
  return !stage || !STAGE_TO_LABEL[stage]
}

/**
 * @param {Array} workLog rows of `{ date, stage, hours, note }`
 * @returns {{byStage: Array<[string, number]>, totalHours: number,
 *            sessionCount: number, dominant: string|null, max: number,
 *            sorted: Array}}
 *   `byStage` is sorted heaviest-first, so rank is meaningful to callers.
 */
export function summarizeWorkLog(workLog = []) {
  const list = Array.isArray(workLog) ? workLog : []
  const byStageMap = {}
  let totalHours = 0
  list.forEach((e) => {
    const h = Number(e.hours) || 0
    totalHours += h
    const key = String(e.stage || e.note || 'work')
    byStageMap[key] = (byStageMap[key] || 0) + h
  })
  const byStage = Object.entries(byStageMap).sort((a, b) => b[1] - a[1])
  const sorted = [...list].sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  )
  return {
    byStage,
    totalHours,
    sessionCount: list.length,
    dominant: byStage[0] ? stageLabel(byStage[0][0]) : null,
    max: byStage[0]?.[1] || 0,
    sorted,
  }
}
