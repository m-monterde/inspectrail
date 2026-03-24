import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useParams, Link } from 'react-router-dom';
import { GET_JOURNEY, GET_SENSOR_READINGS, GET_THRESHOLDS } from '../graphql/queries';
import { SensorChart } from '../components/charts/SensorChart';
import { JourneyMap } from '../components/maps/JourneyMap';

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

// Métricas a mostrar como gráficas (clave = campo en sensorReadings)
const chartMetrics = [
  'leveling',
  'alignment',
  'twist',
  'gauge',
  'accelVertical',
  'accelLateral',
  'speed',
];

// Mapeo campo readings → campo threshold
const readingKeyToThresholdMetric: Record<string, string> = {
  leveling: 'leveling',
  alignment: 'alignment',
  twist: 'twist',
  gauge: 'gauge',
  accelVertical: 'accel_vertical',
  accelLateral: 'accel_lateral',
  speed: 'speed',
};

export function JourneyDetail() {
  const { id } = useParams<{ id: string }>();
  const journeyId = parseInt(id!, 10);

  const { data, loading, error } = useQuery(GET_JOURNEY, { variables: { id: journeyId } });
  const { data: sensorData, loading: sensorLoading } = useQuery(GET_SENSOR_READINGS, {
    variables: { journeyId },
    skip: !journeyId,
  });
  const { data: thresholdData } = useQuery(GET_THRESHOLDS);
  const [mapColorBy, setMapColorBy] = useState<string>('none');

  if (loading) return <div className="text-slate-500">Cargando trayecto...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;
  if (!data?.journey) return <div className="text-slate-500">Trayecto no encontrado</div>;

  const j = data.journey;
  const readings = sensorData?.sensorReadings ?? [];
  const thresholds = thresholdData?.thresholds ?? [];

  const colorOptions = [
    { value: 'none', label: 'Sin colorear' },
    { value: 'leveling', label: 'Nivelacion' },
    { value: 'alignment', label: 'Alineacion' },
    { value: 'twist', label: 'Alabeo' },
    { value: 'accelVertical', label: 'Acel. Vertical' },
    { value: 'accelLateral', label: 'Acel. Lateral' },
    { value: 'speed', label: 'Velocidad' },
  ];

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

      {/* Mapa del trayecto */}
      <div className="mb-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              Mapa del trayecto
              {readings.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {readings.length.toLocaleString()} lecturas de sensores
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Colorear por:</span>
              <select
                value={mapColorBy}
                onChange={(e) => setMapColorBy(e.target.value)}
                disabled={sensorLoading}
                className="text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
              >
                {colorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          {mapColorBy !== 'none' && (
            <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center gap-4 text-xs text-slate-500">
              <span>Escala:</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#22c55e' }}></span> Normal</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#f59e0b' }}></span> Warning</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#f97316' }}></span> Alert</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#ef4444' }}></span> Critical</span>
            </div>
          )}
          {sensorLoading ? (
            <div style={{ height: 400 }} className="flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-2"></div>
                <p className="text-sm text-slate-400">Cargando datos del trayecto...</p>
              </div>
            </div>
          ) : readings.length > 0 ? (
            <JourneyMap readings={readings} alerts={j.alerts} height={400} colorBy={mapColorBy as any} />
          ) : (
            <div style={{ height: 400 }} className="flex items-center justify-center bg-slate-50">
              <p className="text-sm text-slate-400">Sin datos de sensores</p>
            </div>
          )}
        </div>
      </div>

      {/* Gráficas de sensores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {chartMetrics.map((metric) => {
          const thresholdMetric = readingKeyToThresholdMetric[metric];
          const threshold = thresholds.find((t: any) => t.metric === thresholdMetric);
          return (
            <div key={metric} className="bg-white rounded-lg border border-slate-200 shadow-sm p-2">
              {sensorLoading ? (
                <div style={{ height: 220 }} className="flex items-center justify-center">
                  <div className="inline-block w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin"></div>
                </div>
              ) : readings.length > 0 ? (
                <SensorChart
                  readings={readings}
                  metric={metric}
                  threshold={threshold}
                  alerts={j.alerts}
                  height={220}
                />
              ) : (
                <div style={{ height: 220 }} className="flex items-center justify-center text-sm text-slate-300">
                  Sin datos
                </div>
              )}
            </div>
          );
        })}
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
