import { useQuery } from '@apollo/client/react';
import { GET_THRESHOLDS } from '../graphql/queries';

const metricLabels: Record<string, string> = {
  accel_vertical: 'Aceleracion Vertical',
  accel_lateral: 'Aceleracion Lateral',
  accel_longitudinal: 'Aceleracion Longitudinal',
  leveling: 'Nivelacion',
  alignment: 'Alineacion',
  twist: 'Alabeo',
  gauge: 'Ancho de via',
  speed: 'Velocidad',
};

const metricUnits: Record<string, string> = {
  accel_vertical: 'm/s2',
  accel_lateral: 'm/s2',
  accel_longitudinal: 'm/s2',
  leveling: 'mm',
  alignment: 'mm',
  twist: 'mm',
  gauge: 'mm',
  speed: 'km/h',
};

export function Thresholds() {
  const { data, loading, error } = useQuery(GET_THRESHOLDS);

  if (loading) return <div className="text-slate-500">Cargando umbrales...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Umbrales</h1>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-3 font-medium">Metrica</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium text-center" colSpan={2}>
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">Warning</span>
              </th>
              <th className="px-4 py-3 font-medium text-center" colSpan={2}>
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">Alert</span>
              </th>
              <th className="px-4 py-3 font-medium text-center" colSpan={2}>
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">Critical</span>
              </th>
            </tr>
            <tr className="border-b border-slate-100 text-xs text-slate-400">
              <th></th>
              <th></th>
              <th className="px-4 py-1">Min</th>
              <th className="px-4 py-1">Max</th>
              <th className="px-4 py-1">Min</th>
              <th className="px-4 py-1">Max</th>
              <th className="px-4 py-1">Min</th>
              <th className="px-4 py-1">Max</th>
            </tr>
          </thead>
          <tbody>
            {data.thresholds.map((t: any) => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-900">{metricLabels[t.metric] || t.metric}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">{metricUnits[t.metric]}</td>
                <td className="px-4 py-2 font-mono text-amber-700">{t.warningMin}</td>
                <td className="px-4 py-2 font-mono text-amber-700">{t.warningMax}</td>
                <td className="px-4 py-2 font-mono text-orange-700">{t.alertMin}</td>
                <td className="px-4 py-2 font-mono text-orange-700">{t.alertMax}</td>
                <td className="px-4 py-2 font-mono text-red-700">{t.criticalMin}</td>
                <td className="px-4 py-2 font-mono text-red-700">{t.criticalMax}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
