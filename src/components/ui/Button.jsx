export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  ...props
}) {
  // Base classes
  const baseCls = 'btn';
  const variantCls = variant === 'primary' ? 'btn-primary' : 'btn-outline';
  const sizeMap = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
    icon: 'btn-icon',
    soft: 'btn-sm', // treat soft as small
  };
  const sizeCls = sizeMap[size] || 'btn-md';

  return (
    <button
      type="button"
      className={`${baseCls} ${variantCls} ${sizeCls} ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}