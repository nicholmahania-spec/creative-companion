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
 * Optional quiet progress strip (Settings → Progress strip).
 * Compact meter — expand for quests only.
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
        .slice(-6),
    [game.badges]
  )
  const questsDone = quests.filter((q) => q.done).length

  return (
    <div
      className={`game-hud game-hud-studio${open ? ' is-open' : ''}${
        compact ? ' is-compact' : ''
      }`}
    >
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
          size={28}
          stroke={3}
          className="game-hud-xp-ring"
        >
          <span className="game-hud-level">{xp.level}</span>
        </ProgressRing>
        <span className="game-hud-xp-wrap" aria-hidden="true">
          <span
            className="game-hud-xp-fill"
            style={{ width: `${xp.percent}%` }}
          />
        </span>
        <span className="game-hud-chip" title="Streak">
          {game.dayStreak || 0}d
        </span>
        {(game.combo || 0) > 1 && (
          <span className="game-hud-chip is-combo" title="Combo">
            ×{game.combo}
          </span>
        )}
        <span
          className={`game-hud-chip is-daily${daily.done ? ' is-done' : ''}`}
          title={`Today ${daily.xp}/${DAILY_XP_GOAL}`}
        >
          {daily.xp}/{DAILY_XP_GOAL}
        </span>
        <span className="game-hud-chip is-quests" title="Quests">
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
        <div
          className="game-hud-panel"
          role="region"
          aria-label="Progress"
        >
          <div className="game-hud-panel-grid">
            <div className="game-hud-stat">
              <span className="game-hud-stat-label">Band</span>
              <strong>
                {xp.level} · {xp.into}/{xp.span}
              </strong>
            </div>
            <div className="game-hud-stat">
              <span className="game-hud-stat-label">Steps</span>
              <strong>
                {game.todaySteps || 0}/{game.totalSteps || 0}
              </strong>
            </div>
          </div>

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
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {badgeList.length > 0 && (
            <div className="game-hud-badges">
              {badgeList.map((b) => (
                <span
                  key={b.id}
                  className="game-hud-badge"
                  title={b.name}
                >
                  {b.icon}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
