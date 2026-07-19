/**
 * Empty-state illustration — path-mark language, no floating orbs.
 * Geometry echoes the product mark (rising steps / sheet / pin).
 */
const TITLES = {
  desk: 'One step',
  board: 'Refs',
  pack: 'Leave-behind',
  path: 'Path',
  calendar: 'Time',
}

export default function EmptyIllustration({
  variant = 'desk',
  className = '',
  label,
}) {
  const aria = label || TITLES[variant] || 'Empty'
  return (
    <div
      className={`empty-illu empty-illu-${variant} ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label ? aria : undefined}
    >
      <svg
        className="empty-illu-svg"
        viewBox="0 0 120 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {variant === 'desk' && (
          <>
            {/* Step card with left rail — mirrors work hero, not a floating orb */}
            <rect
              x="18"
              y="12"
              width="84"
              height="48"
              rx="6"
              stroke="currentColor"
              strokeWidth="1.75"
              opacity="0.38"
            />
            <path
              d="M18 18v36"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="square"
              opacity="0.72"
            />
            <path
              d="M32 28h48M32 38h36M32 48h28"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              opacity="0.45"
            />
          </>
        )}
        {variant === 'board' && (
          <>
            {/* Three ref frames; middle starred for pack — no accent blob */}
            <rect
              x="14"
              y="14"
              width="28"
              height="32"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.75"
              opacity="0.38"
            />
            <rect
              x="46"
              y="14"
              width="28"
              height="32"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.75"
              opacity="0.55"
            />
            <rect
              x="78"
              y="14"
              width="28"
              height="32"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.75"
              opacity="0.32"
            />
            <path
              d="M54 24l3.2 6.4 7 .9-5.2 4.8 1.4 6.9L54 39.5 47.6 43l1.4-6.9-5.2-4.8 7-.9L54 24z"
              className="empty-illu-accent"
              opacity="0.9"
            />
            <path
              d="M22 56h76"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.22"
            />
          </>
        )}
        {variant === 'pack' && (
          <>
            {/* Direction sheet + swatch strip */}
            <rect
              x="28"
              y="8"
              width="64"
              height="56"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.75"
              opacity="0.4"
            />
            <rect
              x="28"
              y="8"
              width="64"
              height="16"
              fill="currentColor"
              opacity="0.1"
            />
            <path
              d="M38 36h40M38 44h28"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.45"
            />
            <rect x="38" y="14" width="12" height="6" fill="currentColor" opacity="0.55" />
            <rect x="52" y="14" width="12" height="6" className="empty-illu-accent" opacity="0.95" />
            <rect x="66" y="14" width="12" height="6" fill="currentColor" opacity="0.22" />
          </>
        )}
        {variant === 'path' && (
          <>
            {/* Rising steps — same language as path mark, not equal orbs */}
            <path
              d="M16 50h22M16 38h34M16 26h46"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.4"
            />
            <rect
              x="18"
              y="12"
              width="84"
              height="48"
              rx="6"
              stroke="currentColor"
              strokeWidth="1.75"
              opacity="0.28"
            />
            <path
              d="M78 50h18M78 38h18M78 26h18"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              className="empty-illu-accent-stroke"
              opacity="0.95"
            />
          </>
        )}
        {variant === 'calendar' && (
          <>
            <rect
              x="26"
              y="12"
              width="68"
              height="48"
              rx="5"
              stroke="currentColor"
              strokeWidth="1.75"
              opacity="0.4"
            />
            <path
              d="M26 26h68"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.28"
            />
            {/* Day cells as squares — not floating dots */}
            <rect x="36" y="34" width="10" height="8" rx="1" fill="currentColor" opacity="0.18" />
            <rect x="50" y="34" width="10" height="8" rx="1" className="empty-illu-accent" opacity="0.9" />
            <rect x="64" y="34" width="10" height="8" rx="1" fill="currentColor" opacity="0.18" />
            <rect x="78" y="34" width="10" height="8" rx="1" fill="currentColor" opacity="0.12" />
            <rect x="36" y="46" width="10" height="8" rx="1" fill="currentColor" opacity="0.12" />
            <rect x="50" y="46" width="10" height="8" rx="1" fill="currentColor" opacity="0.12" />
          </>
        )}
      </svg>
    </div>
  )
}
