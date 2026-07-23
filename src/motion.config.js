// motion.config.js
// Motion configuration for consistent animations across the application
// Based on the Tactile Minimalist blueprint principles

export const motionConfig = {
  // Duration presets (in seconds)
  duration: {
    ultraFast: 0.08,
    veryFast: 0.1,
    fast: 0.12,
    normal: 0.16,
    slow: 0.2,
    verySlow: 0.24,
    ultraSlow: 0.3
  },

  // Easing functions
  easing: {
    // Default easing for most interactions
    default: [0.25, 0.1, 0.25, 1.0],

    // For entrances and noticeable changes
    easeOut: [0.33, 1, 0.68, 1],

    // For exits and subtracting elements
    easeIn: [0.42, 0, 0.58, 1],

    // For subtle, natural movements
    soft: [0.4, 0, 0.2, 1],

    // For bouncy, energetic effects
    bounce: [0.68, -0.55, 0.265, 1.55],

    // For sharp, precise movements
    sharp: [0.33, 0, 0.67, 1]
  },

  // Transition presets
  transition: {
    // For subtle state changes (hover, focus, etc.)
    subtle: {
      duration: 0.12,
      ease: "default"
    },

    // For standard interactive elements
    standard: {
      duration: 0.16,
      ease: "default"
    },

    // For noticeable state changes
    pronounced: {
      duration: 0.2,
      ease: "easeOut"
    },

    // For layout changes and entrance/exit animations
    layout: {
      duration: 0.24,
      ease: "easeOut"
    },

    // For shared element transitions (hero animations)
    shared: {
      duration: 0.3,
      ease: [0.33, 1, 0.68, 1]
    },

    // For fade transitions
    fade: {
      duration: 0.16,
      ease: "default"
    },

    // For scale/zoom effects
    scale: {
      duration: 0.12,
      ease: "soft"
    }
  },

  // Scale transforms
  scale: {
    hover: 1.04,
    press: 0.96,
    focus: 1.02
  },

  // Opacity values
  opacity: {
    visible: 1,
    hidden: 0,
    hovered: 0.9,
    pressed: 0.8,
    disabled: 0.5,
    focus: 0.95
  },

  // Blur values for depth
  blur: {
    none: "0px",
    subtle: "2px",
    medium: "4px",
    strong: "8px"
  }
};

// Helper function to respect reduced motion preferences
export const getReducedMotionConfig = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
};

// Conditional motion helper
export const motionEnabled = (config) => {
  if (getReducedMotionConfig()) {
    // Return static values or disabled transitions
    if (typeof config === 'object' && config !== null) {
      const staticConfig = {};
      for (const [key, value] of Object.entries(config)) {
        // Skip animation properties for reduced motion
        if (!['transition', 'duration', 'ease'].includes(key)) {
          staticConfig[key] = value;
        }
      }
      return staticConfig;
    }
    return {};
  }
  return config;
};

export default motionConfig;