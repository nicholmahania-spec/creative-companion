// hooks/useMotion.js
// Custom hook for handling motion preferences and reduced motion

import { useState, useEffect } from 'react';
import { getReducedMotionConfig } from '../motion.config';

export const useMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial state
    if (typeof window !== 'undefined') {
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    // Create media query listener
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event) => setReducedPixelated(event.matches));

    // Add listener
    mediaQuery.addEventListener('change', handler);

    // Cleanup
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Conditional value helper
  const motionValue = (motionValue, staticValue) => {
    return reducedMotion ? staticValue : motionValue;
  };

  // Conditional transition helper
  const motionTransition = (transitionConfig) => {
    return reducedMotion ? {} : transitionConfig;
  };

  // Conditional transform helper
  const motionTransform = (transformValue) => {
    return reducedMotion ? 'none' : transformValue;
  };

  return {
    reducedMotion,
    motionValue,
    motionTransition,
    motionTransform
  };
};

export default useMotion;