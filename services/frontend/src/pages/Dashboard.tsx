import { useQuery } from '@apollo/client/react';
import ReactECharts from 'echarts-for-react';
import { GET_DASHBOARD_STATS } from '../graphql/queries';

const severityColors = {
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  alert: 'bg-orange-100 text-orange-800 border-orange-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
};

const severityLabels = {
  warning: 'Warning',
  alert: 'Alert',
  critical: 'Critical',
};

const metricLabels: Record<string, string> = {
  accel_vertical: 'Acel. Vertical',
  accel_lateral: 'Acel. Lateral',
  accel_longitudinal: 'Acel. Longitudinal',
  leveling: 'Nivelacion',
  alignment: 'Alineacion',
  twist: 'Alabeo',
  gauge: 'Ancho via',
  speed: 'Velocidad',
};

export function Dashboard() {
  const { data, loading, error } = useQuery(GET_DASHBOARD_STATS, {
    pollInterval: 30000,
  });

  if (loading) return <div className="text-slate-500">Cargando dashboard...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  const stats = data.dashboardStats;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Sistemas" value={stats.totalSystems} sub={`${stats.connectedSystems} conectados`} />
        <KpiCard label="Trayectos" value={stats.totalJourneys} sub={`${stats.activeJourneys} en curso`} />
        <KpiCard label="Alertas Warning" value={stats.alertCounts.warning} className="border-l-amber-400" />
        <KpiCard label="Alertas Critical" value={stats.alertCounts.critical} className="border-l-red-500" />
      </div>

      {/* Resumen alertas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(['warning', 'alert', 'critical'] as const).map((sev) => (
          <div
            key={sev}
            className={`rounded-lg border p-4 ${severityColors[sev]}`}
          >
            <p className="text-sm font-medium">{severityLabels[sev]}</p>
            <p className="text-3xl font-bold mt-1">
              {stats.alertCounts[sev]}
            </p>
          </div>
        ))}
      </div>

      {/* Gráfica de alertas por severidad y métrica */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <AlertsBySeverityChart alerts={stats.recentAlerts} />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <AlertsByMetricChart alerts={stats.recentAlerts} />
        </div>
      </div>

      {/* Alertas recientes */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Alertas recientes</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-500">
              <th className="px-4 py-2 font-medium">Severidad</th>
              <th className="px-4 py-2 font-medium">Metrica</th>
              <th className="px-4 py-2 font-medium">Trayecto</th>
              <th className="px-4 py-2 font-medium">PK</th>
              <th className="px-4 py-2 font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Umbral</th>
              <th className="px-4 py-2 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentAlerts.map((alert: any) => (
              <tr key={alert.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <SeverityBadge severity={alert.severity} />
                </td>
                <td className="px-4 py-2 text-slate-700">
                  {metricLabels[alert.metric] || alert.metric}
                </td>
                <td className="px-4 py-2 text-slate-700">
                  <span className="font-mono text-xs">{alert.journey.system.code}</span>
                  {' '}
                  {alert.journey.name}
                </td>
                <td className="px-4 py-2 font-mono text-xs">
                  {alert.pkStart.toFixed(2)} - {alert.pkEnd.toFixed(2)}
                </td>
                <td className="px-4 py-2 font-mono">{alert.measuredValue.toFixed(2)}</td>
                <td className="px-4 py-2 font-mono text-slate-500">{alert.thresholdValue.toFixed(2)}</td>
                <td className="px-4 py-2 text-slate-500">
                  {new Date(alert.detectedAt).toLocaleDateString('es-ES', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, className = '' }: { label: string; value: number; sub?: string; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm p-4 border-l-4 ${className || 'border-l-slate-300'}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
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
      type: 'pie',
      radius: ['40%', '70%'],
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
  const values = metrics.map(m => counts[m]);

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
    series: [{
      type: 'bar',
      data: values,
      itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
    }],
  };

  return <ReactECharts option={option} style={{ height: 200 }} notMerge />;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    warning: 'bg-amber-100 text-amber-700',
    alert: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[severity] || 'bg-slate-100'}`}>
      {severity}
    </span>
  );
}
