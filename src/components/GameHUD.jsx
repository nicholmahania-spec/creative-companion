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
 * Optional progress strip (XP, quests, streak). Secondary to shipping work.
 * Micro-progress feedback: ring fill + strike-through quests — not a dashboard.
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
          <span className="game-hud-level">Lv {xp.level}</span>
        </ProgressRing>
        <span className="game-hud-xp-wrap" aria-hidden="true">
          <span className="game-hud-xp-fill" style={{ width: `${xp.percent}%` }} />
        </span>
        <span className="game-hud-xp-num">{game.xp || 0} XP</span>
        <span className="game-hud-chip" title="Day streak">
          🔥 {game.dayStreak || 0}d
        </span>
        {(game.combo || 0) > 1 && (
          <span className="game-hud-chip is-combo" title="Step combo">
            ⚡ {game.combo}x
          </span>
        )}
        <span
          className={`game-hud-chip is-daily${daily.done ? ' is-done' : ''}`}
          title={`Daily goal ${daily.xp}/${DAILY_XP_GOAL} XP`}
        >
          Today {daily.xp}/{DAILY_XP_GOAL}
        </span>
        <span className="game-hud-chip is-quests" title="Daily quests">
          ★ {questsDone}/{quests.length}
        </span>
        <span className="game-hud-chevron" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
        {burst && (
          <span
            key={burst.id}
            className={`game-hud-burst${burst.levelUp ? ' is-level' : ''}`}
          >
            {burst.levelUp ? 'LEVEL UP ' : ''}
            {burst.text}
            {burst.combo > 1 ? ` · ${burst.combo}x` : ''}
          </span>
        )}
      </button>

      {open && (
        <div className="game-hud-panel" role="region" aria-label="Progress extras">
          <p className="game-hud-promise">
            Real product: finish one step, then export a brand book PDF. XP is just a
            side meter.
          </p>
          <div className="game-hud-panel-grid">
            <div className="game-hud-stat">
              <span className="game-hud-stat-label">Level</span>
              <strong>
                {xp.level} · {xp.into}/{xp.span} to next
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
              <span>Daily XP goal</span>
              <strong>
                {daily.xp}/{DAILY_XP_GOAL}
                {daily.done ? ' · cleared' : ''}
              </strong>
            </div>
            <div className="game-hud-daily-bar">
              <div
                className="game-hud-daily-fill"
                style={{ width: `${daily.percent}%` }}
              />
            </div>
          </div>

          <p className="game-hud-section-label">Today&apos;s quests</p>
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
                    {q.done ? ` · +${q.bonusXp} XP` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {badgeList.length > 0 && (
            <>
              <p className="game-hud-section-label">Badges</p>
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
              <p className="game-hud-section-label">Recent XP</p>
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
            XP follows real work: closed steps, focus blocks, pins, breaks, and
            exports. Combos stack when you ship steps within 45 minutes. Ignore
            the meter if it gets in the way — ship the pack instead.
          </p>
        </div>
      )}
    </div>
  )
}
