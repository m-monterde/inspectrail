import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { GET_ALERTS } from '../graphql/queries';

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

export function Alerts() {
  const [page, setPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>('');

  const filter: any = {};
  if (severityFilter) filter.severity = severityFilter;

  const { data, loading, error } = useQuery(GET_ALERTS, {
    variables: { filter, pagination: { page, pageSize: 20 } },
  });

  if (loading) return <div className="text-slate-500">Cargando alertas...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  const { items, pageInfo } = data.alerts;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Alertas</h1>
        <div className="flex gap-2">
          {['', 'warning', 'alert', 'critical'].map((sev) => (
            <button
              key={sev}
              onClick={() => { setSeverityFilter(sev); setPage(1); }}
              className={`px-3 py-1 text-sm rounded border transition-colors ${
                severityFilter === sev
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {sev || 'Todas'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-3 font-medium">Severidad</th>
              <th className="px-4 py-3 font-medium">Metrica</th>
              <th className="px-4 py-3 font-medium">Trayecto</th>
              <th className="px-4 py-3 font-medium">PK</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Umbral</th>
              <th className="px-4 py-3 font-medium">Desviacion</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a: any) => (
              <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    a.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    a.severity === 'alert' ? 'bg-orange-100 text-orange-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{a.severity}</span>
                </td>
                <td className="px-4 py-2 text-slate-700">{metricLabels[a.metric] || a.metric}</td>
                <td className="px-4 py-2 text-slate-700">
                  <span className="font-mono text-xs">{a.journey.system.code}</span> {a.journey.name}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{a.pkStart.toFixed(2)} - {a.pkEnd.toFixed(2)}</td>
                <td className="px-4 py-2 font-mono">{a.measuredValue.toFixed(2)}</td>
                <td className="px-4 py-2 font-mono text-slate-500">{a.thresholdValue.toFixed(2)}</td>
                <td className="px-4 py-2 font-mono text-red-600">+{a.deviation.toFixed(2)}</td>
                <td className="px-4 py-2 text-slate-500">
                  {new Date(a.detectedAt).toLocaleString('es-ES', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <span className="text-sm text-slate-500">{pageInfo.totalCount} alertas</span>
          {pageInfo.totalPages > 1 && (
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">Anterior</button>
              <span className="px-3 py-1 text-sm">{page} / {pageInfo.totalPages}</span>
              <button disabled={page >= pageInfo.totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">Siguiente</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
