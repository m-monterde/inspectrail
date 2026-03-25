import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: 'default' | 'warning' | 'critical' | 'success';
}

const accentStyles: Record<string, string> = {
  default: 'border-l-slate-300',
  warning: 'border-l-amber-400',
  critical: 'border-l-red-500',
  success: 'border-l-green-500',
};

export function KpiCard({ label, value, sub, accent = 'default' }: KpiCardProps) {
  return (
    <Card className={cn('border-l-4', accentStyles[accent])}>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
