export default function Badge({
  variant = 'secondary',
  children,
  className = '',
  ...props
}) {
  const baseCls = 'badge';
  const variantMap = {
    primary: 'badge-accent',
    secondary: 'badge-muted',
    accent: 'badge-accent',
    destructive: 'badge-destructive', // we need to define destructive badge
    outline: 'badge-outline',
  };
  // define destructive badge if not defined; fallback to muted
  const variantCls = variantMap[variant] || variantMap.secondary;

  return (
    <span className={`${baseCls} ${variantCls} ${className}`} {...props}>
      {children}
    </span>
  );
}