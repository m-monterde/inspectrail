import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { GET_DASHBOARD_STATS } from '@/graphql/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SeverityBadge } from '@/components/domain/SeverityBadge';
import { MetricLabel } from '@/components/domain/MetricLabel';
import { PageHeader } from '@/components/domain/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

export function Dashboard() {
  const { data, loading, error } = useQuery<any>(GET_DASHBOARD_STATS, {
    pollInterval: 30000,
  });

  if (loading) return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Skeleton className="h-52 rounded-lg" />
        <Skeleton className="h-52 rounded-lg" />
        <Skeleton className="h-52 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
  if (error) return <div className="text-destructive">Error: {error.message}</div>;

  const stats = data.dashboardStats;
  const totalAlerts = stats.alertCounts.warning + stats.alertCounts.alert + stats.alertCounts.critical;

  return (
    <div>
      <PageHeader title="Dashboard" />

      {/* Top row: KPIs + charts */}
      <div className="grid grid-cols-3 gap-4 mb-6">

        {/* KPIs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Sistemas</span>
              <span className="font-bold">{stats.totalSystems} <span className="text-xs font-normal text-muted-foreground">({stats.connectedSystems} conectados)</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Trayectos</span>
              <span className="font-bold">{stats.totalJourneys} <span className="text-xs font-normal text-muted-foreground">({stats.activeJourneys} en curso)</span></span>
            </div>
            <div className="border-t pt-3 mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total alertas</span>
                <span className="font-bold">{totalAlerts}</span>
              </div>
              <div className="flex items-center justify-between">
                <SeverityBadge severity="critical" />
                <span className="font-bold text-red-700">{stats.alertCounts.critical}</span>
              </div>
              <div className="flex items-center justify-between">
                <SeverityBadge severity="alert" />
                <span className="font-bold text-orange-700">{stats.alertCounts.alert}</span>
              </div>
              <div className="flex items-center justify-between">
                <SeverityBadge severity="warning" />
                <span className="font-bold text-amber-700">{stats.alertCounts.warning}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donut chart */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground font-medium">Alertas por severidad</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <AlertsBySeverityChart counts={stats.alertCounts} />
          </CardContent>
        </Card>

        {/* Bar chart */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground font-medium">Alertas por metrica</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <AlertsByMetricChart alerts={stats.recentAlerts} />
          </CardContent>
        </Card>
      </div>

      {/* Recent alerts table */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas recientes</CardTitle>
        </CardHeader>
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
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentAlerts.map((alert: any) => (
                <TableRow key={alert.id}>
                  <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
                  <TableCell><MetricLabel metric={alert.metric} /></TableCell>
                  <TableCell>
                    <Link to={`/journeys/${alert.journey.id}`} className="hover:underline">
                      <code className="text-xs text-muted-foreground">{alert.journey.system.code}</code>
                      {' '}{alert.journey.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{alert.pkStart.toFixed(2)} - {alert.pkEnd.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{alert.measuredValue.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{alert.thresholdValue.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(alert.detectedAt).toLocaleDateString('es-ES', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertsBySeverityChart({ counts }: { counts: { warning: number; alert: number; critical: number } }) {
  const option = {
    tooltip: { trigger: 'item' as const },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: [
        { value: counts.warning, name: 'Warning', itemStyle: { color: '#f59e0b' } },
        { value: counts.alert, name: 'Alert', itemStyle: { color: '#f97316' } },
        { value: counts.critical, name: 'Critical', itemStyle: { color: '#ef4444' } },
      ].filter(d => d.value > 0),
      label: { fontSize: 11 },
    }],
  };
  return <ReactECharts option={option} style={{ height: 220 }} notMerge />;
}

function AlertsByMetricChart({ alerts }: { alerts: any[] }) {
  const counts: Record<string, number> = {};
  alerts.forEach((a: any) => { counts[a.metric] = (counts[a.metric] || 0) + 1; });
  const metrics = Object.keys(counts);
  const labels: Record<string, string> = {
    accel_vertical: 'Ac.Vert', accel_lateral: 'Ac.Lat', leveling: 'Nivel',
    alignment: 'Alin.', twist: 'Alabeo', gauge: 'Ancho', speed: 'Vel.',
  };

  const option = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 50, right: 16, top: 36, bottom: 28 },
    xAxis: { type: 'category' as const, data: metrics.map(m => labels[m] || m), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value' as const, axisLabel: { fontSize: 10 }, minInterval: 1 },
    series: [{ type: 'bar', data: metrics.map(m => counts[m]), itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } }],
  };
  return <ReactECharts option={option} style={{ height: 220 }} notMerge />;
}
