import { useQuery } from '@apollo/client/react';
import { GET_INSPECTION_SYSTEMS } from '@/graphql/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { PageHeader } from '@/components/domain/PageHeader';

export function Systems() {
  const { data, loading, error } = useQuery<any>(GET_INSPECTION_SYSTEMS);

  if (loading) return (
    <div>
      <PageHeader title="Sistemas de inspección" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  );
  if (error) return <div className="text-destructive">Error: {error.message}</div>;

  return (
    <div>
      <PageHeader title="Sistemas de inspección" />

      <div className="grid grid-cols-2 gap-4">
        {data.inspectionSystems.map((sys: any) => (
          <Card key={sys.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{sys.name}</h3>
                  <code className="text-xs text-muted-foreground">{sys.code}</code>
                </div>
                <StatusBadge status={sys.connectionStatus} />
              </div>
              {sys.lastSeenAt && (
                <p className="text-xs text-muted-foreground">
                  Último contacto: {new Date(sys.lastSeenAt).toLocaleString('es-ES')}
                </p>
              )}
              {sys.sensorsConfig?.sensors && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {sys.sensorsConfig.sensors.map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
