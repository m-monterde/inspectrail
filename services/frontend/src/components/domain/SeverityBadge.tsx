import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const severityStyles: Record<string, string> = {
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  alert: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge variant="outline" className={cn('text-xs', severityStyles[severity])}>
      {severity}
    </Badge>
  );
}
