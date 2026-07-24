import { cn } from '@/lib/utils'

export default function ButtonGroup({ children, className = '' }) {
  return (
    <div className={cn('inline-flex items-center space-x-2', className)}>
      {children}
    </div>
  );
}