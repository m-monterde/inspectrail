import { useQuery } from '@apollo/client/react';
import ReactECharts from 'echarts-for-react';
import { GET_DASHBOARD_STATS } from '@/graphql/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SeverityBadge } from '@/components/domain/SeverityBadge';
import { MetricLabel } from '@/components/domain/MetricLabel';
import { KpiCard } from '@/components/domain/KpiCard';
import { PageHeader } from '@/components/domain/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

export function Dashboard() {
  const { data, loading, error } = useQuery<any>(GET_DASHBOARD_STATS, {
    pollInterval: 30000,
  });

  if (loading) return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
  if (error) return <div className="text-destructive">Error: {error.message}</div>;

  const stats = data.dashboardStats;

  return (
    <div>
      <PageHeader title="Dashboard" />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Sistemas" value={stats.totalSystems} sub={`${stats.connectedSystems} conectados`} />
        <KpiCard label="Trayectos" value={stats.totalJourneys} sub={`${stats.activeJourneys} en curso`} />
        <KpiCard label="Alertas Warning" value={stats.alertCounts.warning} accent="warning" />
        <KpiCard label="Alertas Critical" value={stats.alertCounts.critical} accent="critical" />
      </div>

      {/* Severity summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-amber-400 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-800">Warning</p>
            <p className="text-3xl font-bold text-amber-900 mt-1">{stats.alertCounts.warning}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-400 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-orange-800">Alert</p>
            <p className="text-3xl font-bold text-orange-900 mt-1">{stats.alertCounts.alert}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-800">Critical</p>
            <p className="text-3xl font-bold text-red-900 mt-1">{stats.alertCounts.critical}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <AlertsBySeverityChart alerts={stats.recentAlerts} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <AlertsByMetricChart alerts={stats.recentAlerts} />
          </CardContent>
        </Card>
      </div>

      {/* Recent alerts */}
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
                    <code className="text-xs text-muted-foreground">{alert.journey.system.code}</code>
                    {' '}{alert.journey.name}
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

function AlertsBySeverityChart({ alerts }: { alerts: any[] }) {
  const counts: Record<string, number> = { warning: 0, alert: 0, critical: 0 };
  alerts.forEach((a: any) => { counts[a.severity] = (counts[a.severity] || 0) + 1; });

  const option = {
    title: { text: 'Alertas por severidad', textStyle: { fontSize: 13, fontWeight: 500, color: '#334155' } },
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
  return <ReactECharts option={option} style={{ height: 200 }} notMerge />;
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
    title: { text: 'Alertas por metrica', textStyle: { fontSize: 13, fontWeight: 500, color: '#334155' } },
    tooltip: { trigger: 'axis' as const },
    grid: { left: 50, right: 16, top: 36, bottom: 28 },
    xAxis: { type: 'category' as const, data: metrics.map(m => labels[m] || m), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value' as const, axisLabel: { fontSize: 10 }, minInterval: 1 },
    series: [{ type: 'bar', data: metrics.map(m => counts[m]), itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } }],
  };
  return <ReactECharts option={option} style={{ height: 200 }} notMerge />;
}
