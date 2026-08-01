/**
 * Utilities for managing UI-only preferences stored in localStorage.
 * These preferences are kept client-side for instant availability and
 * to avoid latency/Supabase dependency for UI state.
 */
const UI_PREFS_KEY = 'cc-ui-prefs';

/**
 * The theme the device is asking for.
 *
 * The app hard-coded 'deep' in three places and never read
 * prefers-color-scheme anywhere, so it opened dark on a machine set to light
 * and stayed that way. Someone who has set their OS to light has already
 * stated a preference; opening against it is the app overruling a decision
 * the user made once for everything.
 *
 * 'warm' is this project's light theme, 'deep' its dark one.
 */
export function deviceTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'deep';
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'warm'
    : 'deep';
}

/**
 * Focus-mask intensity bounds, as percentages.
 *
 * The floor is a legibility floor, not a taste one. Masked fields are the
 * user's own answers, kept on screen as working-memory scaffolding while
 * they type the next one — index.css states the rule for this token:
 * de-emphasise, never make illegible. Below 65% the composite fails the
 * 4.5:1 contrast floor: at 40% masked text measures 3.59:1 on the dark
 * canvas and 2.48:1 on the light one; 60% still only reaches 4.44:1 in
 * light. 65% clears both (7.5:1 dark, 5.22:1 light).
 *
 * Exported so the slider, the stored default, and the value the app
 * actually applies all read from one place — they disagreed before, and a
 * control that displays a value it isn't applying is worse than no control.
 */
export const FOCUS_MASK_MIN_PCT = 65;
export const FOCUS_MASK_MAX_PCT = 80;
export const clampFocusMaskPct = (pct) =>
  Math.min(
    FOCUS_MASK_MAX_PCT,
    Math.max(FOCUS_MASK_MIN_PCT, Number(pct ?? FOCUS_MASK_MIN_PCT))
  );

/**
 * Default UI preferences object.
 * These values are used when no saved preferences exist.
 */
