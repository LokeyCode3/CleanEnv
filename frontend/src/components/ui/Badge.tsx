import { cn } from '@/lib/utils';
import { ReportStatus, Severity } from '@/types';
import { statusConfig, severityConfig } from '@/lib/utils';

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', config.bg, config.color, className)}>
      {config.label}
    </span>
  );
};

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const SeverityBadge = ({ severity, className }: SeverityBadgeProps) => {
  const config = severityConfig[severity];
  return (
    <span className={cn('inline-flex items-center gap-1.5 shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', config.bg, config.color, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
};
