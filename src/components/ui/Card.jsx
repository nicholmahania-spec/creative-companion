import { cn } from '@/lib/utils'

export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-bg bg-background shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}