import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GET_ALERTS } from '@/graphql/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/domain/SeverityBadge';
import { MetricLabel } from '@/components/domain/MetricLabel';
import { PageHeader } from '@/components/domain/PageHeader';

export function Alerts() {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>('');

  const filter: any = {};
  if (severityFilter) filter.severity = severityFilter;

  const navigate = useNavigate();

  const { data, loading, error } = useQuery<any>(GET_ALERTS, {
    variables: { filter, pagination: { page, pageSize: 20 } },
  });

  if (loading) return (
    <div>
      <PageHeader title="Alertas" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
  if (error) return <div className="text-destructive">Error: {error.message}</div>;

  const { items, pageInfo } = data.alerts;

  return (
    <div>
      <PageHeader
        title="Alertas"
        actions={
          <div className="flex gap-2">
            {['', 'warning', 'alert', 'critical'].map((sev) => (
              <Button
                key={sev}
                variant={severityFilter === sev ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSeverityFilter(sev); setPage(1); }}
              >
                {sev || 'Todas'}
              </Button>
            ))}
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severidad</TableHead>
                <TableHead>Metrica</TableHead>
                <TableHead>Trayecto</TableHead>
                <TableHead>PK</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Umbral</TableHead>
                <TableHead className="text-right">Desviacion</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a: any) => (
                <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/alerts/${a.id}`)}>
                  <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                  <TableCell><MetricLabel metric={a.metric} /></TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">{a.journey.system.code}</code>
                    {' '}{a.journey.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{a.pkStart.toFixed(2)} - {a.pkEnd.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{a.measuredValue.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{a.thresholdValue.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">+{a.deviation.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(a.detectedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-muted-foreground">{pageInfo.totalCount} alertas</span>
            {pageInfo.totalPages > 1 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <span className="px-3 py-1 text-sm">{page} / {pageInfo.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= pageInfo.totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
