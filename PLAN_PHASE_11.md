# Phase 11: Performance Optimization & Monitoring

> **2026-07 update:** Focus Mode product and FocusShell previews are **removed**.
> Path views are already lazy-loaded; main CSS is shell-only (~151KB). Remaining
> items below are optional polish — not blocking the product spine (`docs/PRD.md`).

## Overview
Phase 11 focuses on improving application performance through optimization techniques and implementing performance monitoring to ensure the application remains fast and responsive.

## Goals
1. Optimize rendering performance for better user experience
2. ~~FocusShell preview lazy load~~ **obsolete**
3. Add performance monitoring and metrics collection
4. Optimize motion configurations for reduced motion preference
5. Bundle analysis and optimization
6. Improve initial load times

## Tasks

### 1. Lazy loading (status)
- [x] Path views lazy-loaded from App / AppMain
- [x] CSS split: shell + lazy-*.css per route
- [ ] Skeleton loaders for heavy views (Design / Board)
- [ ] Intersection observer for below-fold panels (optional)

### 2. Optimize Motion System
- [ ] Review motion configurations for potential over-animation
- [ ] Implement reduced motion preferences more comprehensively
- [ ] Add motion budgeting to prevent animation jank
- [ ] Optimize transform properties for GPU acceleration
- [ ] Audit all motion usage for unnecessary animations

### 3. Performance Monitoring Setup
- [ ] Integrate Performance Observer API for Core Web Vitals
- [ ] Add custom metrics for key interactions (focus mode transitions, preview toggles)
- [ ] Implement error boundaries with performance impact tracking
- [ ] Add performance budgets and alerts in development warnings in dev mode
- [ ] Create performance dashboard in DevTools

### 4. Bundle Analysis and Optimization
- [ ] Add bundle analyzer to development scripts
- [ ] Implement code splitting for route-based chunks
- [ ] Optimize imports and remove unused dependencies
- [ ] Add prefetching for critical routes
- [ ] Analyze and optimize image/assets loading

### 5. Rendering Optimizations
- [ ] Implement virtual scrolling for long lists (if any)
- [ ] Optimize re-renders with useCallback/useMemo
- [ ] Add React.memo where appropriate
- [ ] Implement requestIdleCallback for low-priority work
- [ ] Optimize CSS and reduce repaint triggers

### 6. Loading State Improvements
- [ ] Add skeleton screens for all major views
- [ ] Implement progressive loading for images
- [ ] Add transition states between loading and content
- [ ] Optimize placeholder content to reduce layout shift

## Success Metrics
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift Layout Shift < 0.1
- TTI (Time to Interactive) < 3.5s
- Bundle size reduction of 20%+
- 60fps animations on supported devices

## Implementation Plan

### Week 1: Foundation
1. Set up performance monitoring infrastructure
2. Add bundle analyzer to dev dependencies
3. Implement basic lazy loading for preview containers
4. Create performance utils/helper functions

### Week 2: Optimization
1. Optimize motion configurations and remove unnecessary animations
2. Implement code splitting for lazy-loaded routes
3. Add React.memo optimizations to high-frequency components
4. Optimize image loading and implement placeholder strategies

### Week 3: Monitoring & Refinement
1. Complete Performance Observer integration
2. Add custom metrics for key user interactions
3. Implement performance budgeting and alerts
4. Conduct performance audits and fix identified issues

## Files to Modify
- src/motion.config.js (optimization)
- src/components/focus/FocusShell.jsx (lazy loading)
- src/main.jsx (performance monitoring setup)
- src/App.jsx (route-based code splitting)
- vite.config.js (build optimization)
- src/lib/performance.js (new - performance utilities)
- src/components/*Preview.jsx (lazy loading wrappers)
- src/components/ (various - React.memo optimizations)

## Dependencies to Add
- rollup-plugin-visualizer (bundle analysis)
- web-vitals (performance metrics)
- @tanstack/react-virtual (if implementing virtual lists)

## Testing Strategy
- Lighthouse CI integration
- Manual performance testing on various devices
- Automated performance regression tests
- User flow timing measurements