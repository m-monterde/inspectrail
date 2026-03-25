import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  connected: 'bg-green-100 text-green-700 border-green-200',
  disconnected: 'bg-slate-100 text-slate-500 border-slate-200',
  error: 'bg-red-100 text-red-700 border-red-200',
};

const statusLabels: Record<string, string> = {
  in_progress: 'En curso',
  completed: 'Completado',
  failed: 'Fallido',
  connected: 'Conectado',
  disconnected: 'Desconectado',
  error: 'Error',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('text-xs', statusStyles[status])}>
      {statusLabels[status] || status}
    </Badge>
  );
}
