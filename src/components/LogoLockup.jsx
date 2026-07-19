/**
 * Product lockup — SVG path mark + wordmark.
 * Mark uses currentColor so light/dark chrome stays correct.
 */
export default function LogoLockup({
  title = 'Creative Companion',
  compact = false,
  className = '',
  markOnly = false,
}) {
  const base = import.meta.env.BASE_URL || '/'
  return (
    <div
      className={`logo-lockup${compact ? ' is-compact' : ''}${
        markOnly ? ' is-mark-only' : ''
      } ${className}`.trim()}
    >
      <span className="logo-lockup-mark" aria-hidden="true">
        <img src={`${base}mark.svg`} alt="" width={22} height={22} />
      </span>
      {!markOnly && (
        <span className="logo-lockup-wordmark">{title}</span>
      )}
    </div>
  )
}
