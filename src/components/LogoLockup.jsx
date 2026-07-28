import PathMarkMotion from './PathMarkMotion'

/**
 * Product lockup — animated path mark + wordmark.
 */
export default function LogoLockup({
  title,
  compact = false,
  className = '',
  markOnly = false,
  reduceMotion = false,
}) {
  const wordmark = title || 'Creative Companion'

  return (
    <div
      className={`logo-lockup${compact ? ' is-compact' : ''}${
        markOnly ? ' is-mark-only' : ''
      } ${className}`.trim()}
    >
      <span className="logo-lockup-mark" aria-hidden="true">
        <PathMarkMotion size={compact ? 20 : 22} reduceMotion={reduceMotion} />
      </span>
      {!markOnly && (
        <span className="logo-lockup-wordmark" lang="en">
          {wordmark}
        </span>
      )}
    </div>
  )
}
