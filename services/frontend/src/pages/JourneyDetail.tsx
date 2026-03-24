import { useQuery } from '@apollo/client/react';
import { useParams, Link } from 'react-router-dom';
import { GET_JOURNEY, GET_SENSOR_READINGS } from '../graphql/queries';

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

export function JourneyDetail() {
  const { id } = useParams<{ id: string }>();
  const journeyId = parseInt(id!, 10);

  const { data, loading, error } = useQuery(GET_JOURNEY, { variables: { id: journeyId } });
  const { data: sensorData, loading: sensorLoading } = useQuery(GET_SENSOR_READINGS, {
    variables: { journeyId },
    skip: !journeyId,
  });

  if (loading) return <div className="text-slate-500">Cargando trayecto...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;
  if (!data?.journey) return <div className="text-slate-500">Trayecto no encontrado</div>;

  const j = data.journey;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link to="/journeys" className="text-slate-500 hover:text-slate-700 text-sm">Trayectos</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-bold text-slate-900">{j.name}</h1>
      </div>

      {/* Info */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <InfoCard label="Sistema" value={`${j.system.name} (${j.system.code})`} />
        <InfoCard label="Estado" value={j.status} />
        <InfoCard label="Inicio" value={new Date(j.startedAt).toLocaleString('es-ES')} />
        <InfoCard label="Fin" value={j.endedAt ? new Date(j.endedAt).toLocaleString('es-ES') : 'En curso'} />
      </div>

      {/* Alertas del trayecto */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">
            Alertas ({j.alertCount.warning + j.alertCount.alert + j.alertCount.critical})
          </h2>
          <div className="flex gap-2 text-xs">
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">{j.alertCount.critical} critical</span>
            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{j.alertCount.alert} alert</span>
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{j.alertCount.warning} warning</span>
          </div>
        </div>
        {j.alerts.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Severidad</th>
                <th className="px-4 py-2 font-medium">Metrica</th>
                <th className="px-4 py-2 font-medium">PK</th>
                <th className="px-4 py-2 font-medium">Valor medido</th>
                <th className="px-4 py-2 font-medium">Umbral</th>
                <th className="px-4 py-2 font-medium">Desviacion</th>
              </tr>
            </thead>
            <tbody>
              {j.alerts.map((a: any) => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      a.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      a.severity === 'alert' ? 'bg-orange-100 text-orange-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{a.severity}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{metricLabels[a.metric] || a.metric}</td>
                  <td className="px-4 py-2 font-mono text-xs">{a.pkStart.toFixed(2)} - {a.pkEnd.toFixed(2)} km</td>
                  <td className="px-4 py-2 font-mono">{a.measuredValue.toFixed(2)}</td>
                  <td className="px-4 py-2 font-mono text-slate-500">{a.thresholdValue.toFixed(2)}</td>
                  <td className="px-4 py-2 font-mono text-red-600">+{a.deviation.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-slate-400 text-center text-sm">Sin alertas en este trayecto</p>
        )}
      </div>

      {/* Lecturas de sensores */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Datos de sensores</h2>
        </div>
        {sensorLoading ? (
          <p className="px-4 py-6 text-slate-400 text-center text-sm">Cargando lecturas...</p>
        ) : sensorData?.sensorReadings?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-3 py-2">PK (km)</th>
                  <th className="px-3 py-2">Vel.</th>
                  <th className="px-3 py-2">Niv.</th>
                  <th className="px-3 py-2">Alin.</th>
                  <th className="px-3 py-2">Alab.</th>
                  <th className="px-3 py-2">Ancho</th>
                  <th className="px-3 py-2">Ac.V</th>
                  <th className="px-3 py-2">Ac.L</th>
                  <th className="px-3 py-2">Lat</th>
                  <th className="px-3 py-2">Lon</th>
                </tr>
              </thead>
              <tbody>
                {sensorData.sensorReadings.slice(0, 50).map((r: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-1.5">{r.pk.toFixed(3)}</td>
                    <td className="px-3 py-1.5">{r.speed?.toFixed(1)}</td>
                    <td className="px-3 py-1.5">{r.leveling?.toFixed(2)}</td>
                    <td className="px-3 py-1.5">{r.alignment?.toFixed(2)}</td>
                    <td className="px-3 py-1.5">{r.twist?.toFixed(2)}</td>
                    <td className="px-3 py-1.5">{r.gauge?.toFixed(1)}</td>
                    <td className="px-3 py-1.5">{r.accelVertical?.toFixed(2)}</td>
                    <td className="px-3 py-1.5">{r.accelLateral?.toFixed(2)}</td>
                    <td className="px-3 py-1.5">{r.latitude?.toFixed(4)}</td>
                    <td className="px-3 py-1.5">{r.longitude?.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sensorData.sensorReadings.length > 50 && (
              <p className="px-4 py-2 text-xs text-slate-400 border-t">
                Mostrando 50 de {sensorData.sensorReadings.length} lecturas
              </p>
            )}
          </div>
        ) : (
          <p className="px-4 py-6 text-slate-400 text-center text-sm">Sin lecturas de sensores</p>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}
