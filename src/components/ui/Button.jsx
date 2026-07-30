/** Maps to live desk CSS classes in index.css (no Tailwind / no btn-outline). */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  className = '',
  onClick,
  ...props
}) {
  const baseCls = 'btn'
  let variantCls = 'btn-secondary'
  if (variant === 'primary') variantCls = 'btn-primary'
  else if (variant === 'ghost') variantCls = 'btn-ghost'
  else if (variant === 'outline' || variant === 'secondary')
    variantCls = 'btn-secondary'

  const sizeCls = size === 'sm' || size === 'soft' ? 'btn-sm' : ''

  return (
    <button
      type="button"
      className={`${baseCls} ${variantCls} ${sizeCls} ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}