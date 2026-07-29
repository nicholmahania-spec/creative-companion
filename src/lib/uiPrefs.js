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
const DEFAULTS = {
  onboarded: false,
  theme: 'deep', // or 'warm'
  // prefs sub-object mirrors the shape in useAppStore.js prefs
  prefs: {
    soundEnabled: true,
    reduceMotion: false,
    bodyDoubleSilent: false,
    forceBreaksEnabled: true,
    forceBreaksConsented: false,
    queueCollapsed: true,
    showHowItWorks: false,
    /** Optional quiet progress strip — off by default (Tech-Studio) */
    showProgress: false,
    /** ADHD: no timed Helper pings — open Helper for Coach */
    helperQuiet: true,
    /** Focus-mask intensity (%). Bounded by FOCUS_MASK_MIN/MAX_PCT above —
     *  was 25, which the app never actually applied. */
    focusMaskPct: FOCUS_MASK_MIN_PCT,
    /** Soft blur on masked peripherals (px); 0 = off */
    focusMaskBlur: 2,
    /** 'normal' (flat 1.5px border) or 'high' (2.5px + soft outer ring) */
    focusRingStrength: 'normal',
    /** Collapse the sidebar to zero-width while a field has focus */
    hideNavUntilBlur: false,
    /** Hide process tips / InfoReveal and instructional page-subs (Tech-Studio) */
    hideTips: true,
    /** Pack / PDF: hide Creative Companion footer watermark */
    hidePackWatermark: false,
    /** Brand book page setup — see lib/brandBookSetup.js for the options */
    bookPageSize: 'letter',
    bookEdgeSpace: 'standard',
    bookPrintShop: false,
    /** Toasts: quiet (default) hides micro successes; all shows pin/role/helper chatter.
     *  Errors and exports always show.
     */
    toastMode: 'quiet',
    /** Seconds non-error toasts queue before flushing together; 0 = instant (default) */
    toastBatchWindow: 0,
    /** Product UI locale for wordmark + path labels */
    locale: 'en',
  },
  // Note: sparkIndex, oppositeIndex, sparksTried, currentSpark are also UI‑related
  // but are handled separately in the store; we include them here for completeness.
  sparkIndex: 0,
  oppositeIndex: 0,
  sparksTried: 0,
  currentSpark: '',
};

/**
 * Load UI preferences from localStorage.
 * @returns {Object} The parsed preferences object, merged with defaults.
 */
export function loadUiPrefs() {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to ensure missing keys are filled
      return { ...DEFAULTS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse UI preferences from localStorage', e);
  }
  // Return a copy of defaults
  return { ...DEFAULTS };
}

/**
 * Save UI preferences to localStorage.
 * @param {Object} prefs - The preferences object to store.
 */
export function saveUiPrefs(prefs) {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save UI preferences to localStorage', e);
  }
}