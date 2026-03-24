import { useQuery } from '@apollo/client/react';
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
