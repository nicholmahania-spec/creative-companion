/**
 * Empty-state illustration system — monoline, stone/growth palette.
 * Variants share geometry language with the product path mark.
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
            <rect
              x="18"
              y="14"
              width="84"
              height="44"
              rx="8"
              stroke="currentColor"
              strokeWidth="1.75"
              opacity="0.35"
            />
            <path
              d="M30 32h40M30 40h28"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              opacity="0.55"
            />
            <circle cx="86" cy="36" r="5" className="empty-illu-accent" opacity="0.85" />
          </>
        )}
        {variant === 'board' && (
          <>
            <rect x="16" y="16" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="1.75" opacity="0.4" />
            <rect x="48" y="16" width="28" height="28" rx="4" stroke="currentColor" strokeWidth="1.75" opacity="0.55" />
            <rect x="80" y="16" width="24" height="28" rx="4" stroke="currentColor" strokeWidth="1.75" opacity="0.35" />
            <path d="M22 52h76" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
            <circle cx="62" cy="30" r="4" className="empty-illu-accent" opacity="0.8" />
          </>
        )}
        {variant === 'pack' && (
          <>
            <rect x="28" y="10" width="64" height="52" rx="3" stroke="currentColor" strokeWidth="1.75" opacity="0.4" />
            <rect x="28" y="10" width="64" height="18" fill="currentColor" opacity="0.12" />
            <path d="M38 38h32M38 46h22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <rect x="38" y="16" width="10" height="6" rx="1" className="empty-illu-accent" opacity="0.9" />
            <rect x="50" y="16" width="10" height="6" rx="1" fill="currentColor" opacity="0.25" />
            <rect x="62" y="16" width="10" height="6" rx="1" fill="currentColor" opacity="0.15" />
          </>
        )}
        {variant === 'path' && (
          <>
            <circle cx="24" cy="36" r="8" stroke="currentColor" strokeWidth="1.75" opacity="0.35" />
            <circle cx="48" cy="36" r="8" stroke="currentColor" strokeWidth="1.75" opacity="0.45" />
            <circle cx="72" cy="36" r="8" className="empty-illu-accent-stroke" strokeWidth="1.75" opacity="0.9" fill="none" />
            <circle cx="96" cy="36" r="8" stroke="currentColor" strokeWidth="1.75" opacity="0.3" />
            <path d="M32 36h8M56 36h8M80 36h8" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <circle cx="72" cy="36" r="3" className="empty-illu-accent" />
          </>
        )}
        {variant === 'calendar' && (
          <>
            <rect x="28" y="14" width="64" height="48" rx="6" stroke="currentColor" strokeWidth="1.75" opacity="0.4" />
            <path d="M28 28h64" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <circle cx="44" cy="40" r="3" fill="currentColor" opacity="0.25" />
            <circle cx="60" cy="40" r="3" className="empty-illu-accent" opacity="0.9" />
            <circle cx="76" cy="40" r="3" fill="currentColor" opacity="0.25" />
            <circle cx="44" cy="52" r="3" fill="currentColor" opacity="0.2" />
            <circle cx="60" cy="52" r="3" fill="currentColor" opacity="0.2" />
          </>
        )}
      </svg>
    </div>
  )
}
