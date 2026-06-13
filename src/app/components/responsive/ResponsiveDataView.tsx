import { ReactNode } from 'react';
import { cn } from '../ui/utils';

/** Desktop table (md+); mobile card stack (<md). */
export function ResponsiveDataView({
  desktop,
  mobile,
  className = '',
}: {
  desktop: ReactNode;
  mobile: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full min-w-0', className)}>
      <div className="hidden md:block min-w-0">{desktop}</div>
      <div className="md:hidden space-y-3 min-w-0">{mobile}</div>
    </div>
  );
}

export function MobileRecordCard({
  title,
  subtitle,
  badges,
  rows,
  actions,
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  rows?: { label: string; value: ReactNode }[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 space-y-3 min-w-0 shadow-sm',
        className
      )}
    >
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm break-words">{title}</div>
            {subtitle && (
              <div className="text-xs text-muted-foreground mt-0.5 break-words">{subtitle}</div>
            )}
          </div>
          {badges && <div className="flex flex-wrap gap-1 shrink-0">{badges}</div>}
        </div>
        {rows && rows.length > 0 && (
          <dl className="grid grid-cols-1 gap-2 text-xs">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-col gap-0.5 min-w-0 sm:flex-row sm:justify-between sm:gap-3">
                <dt className="text-muted-foreground shrink-0">{row.label}</dt>
                <dd className="font-medium break-words sm:text-right">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border [&_button]:min-h-11">
          {actions}
        </div>
      )}
    </div>
  );
}
