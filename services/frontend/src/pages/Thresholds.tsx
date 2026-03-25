import { useQuery } from '@apollo/client/react';
import { GET_THRESHOLDS } from '@/graphql/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { metricLabels } from '@/components/domain/MetricLabel';
import { PageHeader } from '@/components/domain/PageHeader';

const metricUnits: Record<string, string> = {
  accel_vertical: 'm/s²',
  accel_lateral: 'm/s²',
  accel_longitudinal: 'm/s²',
  leveling: 'mm',
  alignment: 'mm',
  twist: 'mm',
  gauge: 'mm',
  speed: 'km/h',
};

export function Thresholds() {
  const { data, loading, error } = useQuery<any>(GET_THRESHOLDS);

  if (loading) return (
    <div>
      <PageHeader title="Umbrales" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
  if (error) return <div className="text-destructive">Error: {error.message}</div>;

  return (
    <div>
      <PageHeader title="Umbrales" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metrica</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-center" colSpan={2}>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Warning</Badge>
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">Alert</Badge>
                </TableHead>
                <TableHead className="text-center" colSpan={2}>
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Critical</Badge>
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                <TableHead></TableHead>
                <TableHead className="text-xs text-muted-foreground">Min</TableHead>
                <TableHead className="text-xs text-muted-foreground">Max</TableHead>
                <TableHead className="text-xs text-muted-foreground">Min</TableHead>
                <TableHead className="text-xs text-muted-foreground">Max</TableHead>
                <TableHead className="text-xs text-muted-foreground">Min</TableHead>
                <TableHead className="text-xs text-muted-foreground">Max</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.thresholds.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{metricLabels[t.metric] || t.metric}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{metricUnits[t.metric]}</TableCell>
                  <TableCell className="font-mono text-amber-700">{t.warningMin}</TableCell>
                  <TableCell className="font-mono text-amber-700">{t.warningMax}</TableCell>
                  <TableCell className="font-mono text-orange-700">{t.alertMin}</TableCell>
                  <TableCell className="font-mono text-orange-700">{t.alertMax}</TableCell>
                  <TableCell className="font-mono text-red-700">{t.criticalMin}</TableCell>
                  <TableCell className="font-mono text-red-700">{t.criticalMax}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
