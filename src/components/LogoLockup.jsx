import PathMarkMotion from './PathMarkMotion'
import { t, normalizeLocale } from '../lib/i18n'

/**
 * Product lockup — animated path mark + localized wordmark.
 */
export default function LogoLockup({
  locale = 'en',
  title,
  compact = false,
  className = '',
  markOnly = false,
  reduceMotion = false,
}) {
  const loc = normalizeLocale(locale)
  const wordmark = title || t(loc, 'productName')

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
        <span className="logo-lockup-wordmark" lang={loc}>
          {wordmark}
        </span>
      )}
    </div>
  )
}
