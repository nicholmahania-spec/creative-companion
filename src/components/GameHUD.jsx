import { useEffect, useMemo, useState } from 'react'
import {
  BADGES,
  DAILY_XP_GOAL,
  dailyGoalProgress,
  gameSummaryLine,
  questStatus,
  refreshGameDay,
  xpProgress,
} from '../lib/buddyGame'
import { ProgressRing } from './PathStepIcon'

/**
 * Optional quiet progress strip (opt-in via Settings).
 * Secondary to shipping work — not a game dashboard.
 */
export default function GameHUD({ compact = false }) {
  const [game, setGame] = useState(() => refreshGameDay())
  const [open, setOpen] = useState(false)
  const [burst, setBurst] = useState(null)

  useEffect(() => {
    const onGame = (e) => {
      const detail = e.detail
      if (detail?.game) setGame({ ...detail.game })
      if (detail?.gained > 0) {
        setBurst({
          id: Date.now(),
          text: `+${detail.gained}`,
          levelUp: detail.levelUp,
          combo: detail.combo,
        })
        window.setTimeout(() => setBurst(null), 1600)
      }
    }
    window.addEventListener('cc-buddy-game', onGame)
    const tick = window.setInterval(() => setGame(refreshGameDay()), 60000)
    return () => {
      window.removeEventListener('cc-buddy-game', onGame)
      window.clearInterval(tick)
    }
  }, [])

  const xp = useMemo(() => xpProgress(game.xp || 0), [game.xp])
  const daily = useMemo(() => dailyGoalProgress(game), [game])
  const quests = useMemo(() => questStatus(game), [game])
  const badgeList = useMemo(
    () =>
      (game.badges || [])
        .map((id) => BADGES[id])
        .filter(Boolean)
        .slice(-8),
    [game.badges]
  )
  const questsDone = quests.filter((q) => q.done).length

  return (
    <div className={`game-hud${open ? ' is-open' : ''}${compact ? ' is-compact' : ''}`}>
      <button
        type="button"
        className="game-hud-bar"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={gameSummaryLine(game)}
      >
        <ProgressRing
          value={xp.into}
          max={xp.span || 1}
          size={32}
          stroke={3}
          className="game-hud-xp-ring"
        >
          <span className="game-hud-level">{xp.level}</span>
        </ProgressRing>
        <span className="game-hud-xp-wrap" aria-hidden="true">
          <span className="game-hud-xp-fill" style={{ width: `${xp.percent}%` }} />
        </span>
        <span className="game-hud-xp-num">{game.xp || 0}</span>
        <span className="game-hud-chip" title="Day streak">
          {game.dayStreak || 0}d
        </span>
        {(game.combo || 0) > 1 && (
          <span className="game-hud-chip is-combo" title="Step combo">
            ×{game.combo}
          </span>
        )}
        <span
          className={`game-hud-chip is-daily${daily.done ? ' is-done' : ''}`}
          title={`Today ${daily.xp}/${DAILY_XP_GOAL}`}
        >
          Today {daily.xp}/{DAILY_XP_GOAL}
        </span>
        <span className="game-hud-chip is-quests" title="Today checklist">
          {questsDone}/{quests.length}
        </span>
        <span className="game-hud-chevron" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
        {burst && (
          <span
            key={burst.id}
            className={`game-hud-burst${burst.levelUp ? ' is-level' : ''}`}
          >
            {burst.levelUp ? 'Up ' : ''}
            {burst.text}
            {burst.combo > 1 ? ` · ×${burst.combo}` : ''}
          </span>
        )}
      </button>

      {open && (
        <div className="game-hud-panel" role="region" aria-label="Optional progress">
          <p className="game-hud-promise">
            Meter only — finish a step, then export the brand book.
          </p>
          <div className="game-hud-panel-grid">
            <div className="game-hud-stat">
              <span className="game-hud-stat-label">Band</span>
              <strong>
                {xp.level} · {xp.into}/{xp.span}
              </strong>
            </div>
            <div className="game-hud-stat">
              <span className="game-hud-stat-label">Streak</span>
              <strong>
                {game.dayStreak || 0} day
                {(game.dayStreak || 0) === 1 ? '' : 's'}
              </strong>
            </div>
            <div className="game-hud-stat">
              <span className="game-hud-stat-label">Steps</span>
              <strong>
                {game.todaySteps || 0} today · {game.totalSteps || 0} all
              </strong>
            </div>
            <div className="game-hud-stat">
              <span className="game-hud-stat-label">Focus</span>
              <strong>
                {game.todayPomodoros || 0} today · {game.totalPomodoros || 0} all
              </strong>
            </div>
          </div>

          <div className="game-hud-daily">
            <div className="game-hud-daily-top">
              <span>Today</span>
              <strong>
                {daily.xp}/{DAILY_XP_GOAL}
                {daily.done ? ' · done' : ''}
              </strong>
            </div>
            <div className="game-hud-daily-bar">
              <div
                className="game-hud-daily-fill"
                style={{ width: `${daily.percent}%` }}
              />
            </div>
          </div>

          <p className="game-hud-section-label">Today</p>
          <ul className="game-hud-quests">
            {quests.map((q) => (
              <li
                key={q.id}
                className={`game-hud-quest${q.done ? ' is-done' : ''}`}
              >
                <span className="game-hud-quest-check" aria-hidden="true">
                  {q.done ? '✓' : '○'}
                </span>
                <span className="game-hud-quest-body">
                  <strong>{q.label}</strong>
                  <span>
                    {q.progress}/{q.target}
                    {q.done ? ` · +${q.bonusXp}` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {badgeList.length > 0 && (
            <>
              <p className="game-hud-section-label">Marks</p>
              <div className="game-hud-badges">
                {badgeList.map((b) => (
                  <span
                    key={b.id}
                    className="game-hud-badge"
                    title={`${b.name}: ${b.desc}`}
                  >
                    {b.icon} {b.name}
                  </span>
                ))}
              </div>
            </>
          )}

          {(game.recent || []).length > 0 && (
            <>
              <p className="game-hud-section-label">Recent</p>
              <ul className="game-hud-recent">
                {(game.recent || []).slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <span>{r.text}</span>
                    <strong>+{r.xp}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="game-hud-foot">
            Tracks real work (steps, focus, pins, export). Turn off in Settings
            anytime.
          </p>
        </div>
      )}
    </div>
  )
}
