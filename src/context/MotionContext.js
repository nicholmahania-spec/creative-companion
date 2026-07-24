// context/MotionContext.js
// React context for managing motion preferences across the application

import React, { createContext, useContext, useState, useEffect } from 'react';

const MotionContext = createContext();

export const MotionProvider = ({ children }) => {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e) => setReducedMotion(e.matches);

    // Add listener
    mediaQuery.addEventListener('change', handleChange);

    // Set initial HTML attribute for CSS targeting
    document.documentElement.setAttribute('data-motion-reduced', reducedMotion);

    // Cleanup
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [reducedMotion]);

  // Update the attribute when state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.setAttribute('data-motion-reduced', reducedMotion);
  }, [reducedMotion]);

  const toggleReducedMotion = () => {
    setReducedMotion(!reducedMotion);
    document.documentElement.setAttribute('data-motion-reduced', !reducedMotion);
  };

  return (
    <MotionContext.Provider value={{ reducedMotion, toggleReducedMotion }}>
      {children}
    </MotionContext.Provider>
  );
};

export const useMotion = () => {
  const context = useContext(MotionContext);
  if (!context) {
    throw new Error('useMotion must be used within a MotionProvider');
  }
  return context;
};

export default MotionContext;