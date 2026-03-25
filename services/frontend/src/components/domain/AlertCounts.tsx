import { SeverityBadge } from './SeverityBadge';

interface AlertCountsProps {
  counts: { warning: number; alert: number; critical: number };
}

export function AlertCounts({ counts }: AlertCountsProps) {
  const total = counts.warning + counts.alert + counts.critical;
  if (total === 0) return <span className="text-muted-foreground text-xs">—</span>;

  return (
    <div className="flex gap-1">
      {counts.critical > 0 && <SeverityBadge severity="critical" />}
      {counts.alert > 0 && <SeverityBadge severity="alert" />}
      {counts.warning > 0 && <SeverityBadge severity="warning" />}
    </div>
  );
}
