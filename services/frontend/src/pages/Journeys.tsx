import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GET_JOURNEYS } from '@/graphql/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { AlertCounts } from '@/components/domain/AlertCounts';
import { PageHeader } from '@/components/domain/PageHeader';

export function Journeys() {
  const [page, setPage] = useState(1);
  const { data, loading, error } = useQuery<any>(GET_JOURNEYS, {
    variables: { pagination: { page, pageSize: 20 } },
  });

  if (loading) return (
    <div>
      <PageHeader title="Trayectos" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
  if (error) return <div className="text-destructive">Error: {error.message}</div>;

  const { items, pageInfo } = data.journeys;

  return (
    <div>
      <PageHeader title="Trayectos" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Alertas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((j: any) => (
                <TableRow key={j.id}>
                  <TableCell>
                    <Link to={`/journeys/${j.id}`} className="font-medium hover:underline">
                      {j.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-0.5 rounded">{j.system.code}</code>
                  </TableCell>
                  <TableCell><StatusBadge status={j.status} /></TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(j.startedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {j.endedAt ? new Date(j.endedAt).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </TableCell>
                  <TableCell><AlertCounts counts={j.alertCount} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {pageInfo.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">{pageInfo.totalCount} trayectos</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <span className="px-3 py-1 text-sm">{page} / {pageInfo.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= pageInfo.totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
