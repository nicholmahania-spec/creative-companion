/**
 * Where this project's time went — one bar, always on screen, nothing to click.
 *
 * Built on the owner's explicit ask for "hours logged", routed through the
 * adhd-executive-function-advisor because the owner has also said "I have no
 * concept of time and numbers mean nothing". The advisor's ruling, followed
 * here: change the AXIS. The design handoff measured attendance on a calendar
 * (M T W T F S S, "16h this week"); this measures where effort went, by stage,
 * across the project's whole life.
 *
 * Why the swap, so it isn't undone later as a stylistic call:
 * - A weekday chart's empty bars are absence rendered as evidence, with no
 *   undo available on a past day. The only reading is "look at the days you
 *   didn't work" — rejection sensitivity, attached to no action.
 * - "This week" resets every Monday, which throws away the very record the
 *   work clock exists to keep (object permanence).
 * - Proportion is comparative and needs no unit: "most of this went into
 *   Research" lands without decoding a number, which is the ambient
 *   before/after evidence the owner asked for.
 *
 * Deliberately absent, all per the same ruling: any goal, target, average or
 * streak (invents a standard to fall short of); any comparison against other
 * projects (turns a private note into a ranking); any styling that echoes the
 * invoice UI (workLog and timeLog must stay visibly different things).
 *
 * Renders nothing until the clock has actually recorded something. A permanent
 * "0 hours" is a scold on every project open, and a bar of nothing is a UI in
 * front of no data.
 */
import { useMemo } from 'react'
import { summarizeWorkLog, stageLabel, isUnstaged } from '../lib/workLogSummary'

/** Whole hours only. The owner is time-blind; "16.33h" is noise, and the
 *  figure is a caption here rather than the thing carrying the meaning. */
function hoursCaption(totalHours) {
  const h = Math.round(totalHours)
  if (h < 1) return 'under an hour on this project so far'
  return `${h} ${h === 1 ? 'hour' : 'hours'} on this project so far`
}

export default function WorkStageStrip({ workLog = [] }) {
  const { byStage, totalHours } = useMemo(
    () => summarizeWorkLog(workLog),
    [workLog]
  )

  if (!byStage.length || totalHours <= 0) return null

  return (
    <section className="work-strip" aria-label="Where this project's time went">
      <div className="work-strip-bar">
        {byStage.map(([stage, hours], i) => {
          const pct = (hours / totalHours) * 100
          /* Graduated shades of one token rather than five arbitrary colours —
             heaviest stage darkest. Colour is never the sole carrier: every
             segment wide enough to read carries its own visible label.
             Range capped at 55% deliberately. At 78% the mix lands near
             #7A7A7A in light mode, where the 12px label measures ~4.1:1
             against --text-primary and misses the 4.5:1 floor. 55% is the
             worst case in BOTH themes and clears it: ~6.4:1 on light,
             ~6.0:1 on dark. */
          const mix = Math.max(19, 55 - i * 9)
          return (
            <div
              key={stage}
              className={`work-strip-seg${isUnstaged(stage) ? ' is-unstaged' : ''}`}
              style={{
                width: `${pct}%`,
                background: isUnstaged(stage)
                  ? 'var(--bg-muted)'
                  : `color-mix(in srgb, var(--dopamine) ${mix}%, var(--bg-muted))`,
              }}
            >
              <span className="work-strip-seg-label">{stageLabel(stage)}</span>
            </div>
          )
        })}
      </div>
      <p className="work-strip-caption">{hoursCaption(totalHours)}</p>
    </section>
  )
}
