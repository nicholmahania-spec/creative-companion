import { cn } from '@/lib/utils'

export default function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-white placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[var(--dopamine)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}