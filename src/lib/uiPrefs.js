/**
 * Utilities for managing UI-only preferences stored in localStorage.
 * These preferences are kept client-side for instant availability and
 * to avoid latency/Supabase dependency for UI state.
 */
const UI_PREFS_KEY = 'cc-ui-prefs';

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
    /** Horizontal width of the focus mask (0-100) */
    focusMaskPct: 25,
    /** Soft blur on masked peripherals (px); 0 = off */
    focusMaskBlur: 2,
    /** Dim sidebar + header while a field has focus — peripheral masking */
    focusMode: false,
    /** 'normal' (flat 1.5px border) or 'high' (2.5px + soft outer ring) */
    focusRingStrength: 'normal',
    /** Collapse the sidebar to zero-width while a field has focus */
    hideNavUntilBlur: false,
    /** Hide process tips / InfoReveal and instructional page-subs (Tech-Studio) */
    hideTips: true,
    /** Pack / PDF: hide Creative Companion footer watermark */
    hidePackWatermark: false,
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