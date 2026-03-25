import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useParams } from 'react-router-dom';
import { GET_JOURNEY, GET_SENSOR_READINGS, GET_THRESHOLDS } from '@/graphql/queries';
import { SensorChart } from '@/components/charts/SensorChart';
import { JourneyMap } from '@/components/maps/JourneyMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/domain/SeverityBadge';
import { MetricLabel } from '@/components/domain/MetricLabel';
import { KpiCard } from '@/components/domain/KpiCard';
import { PageHeader } from '@/components/domain/PageHeader';

const chartMetrics = ['leveling', 'alignment', 'twist', 'gauge', 'accelVertical', 'accelLateral', 'speed'];
const readingKeyToThresholdMetric: Record<string, string> = {
  leveling: 'leveling', alignment: 'alignment', twist: 'twist', gauge: 'gauge',
  accelVertical: 'accel_vertical', accelLateral: 'accel_lateral', speed: 'speed',
};
const colorOptions = [
  { value: 'none', label: 'Sin colorear' },
  { value: 'leveling', label: 'Nivelacion' },
  { value: 'alignment', label: 'Alineacion' },
  { value: 'twist', label: 'Alabeo' },
  { value: 'accelVertical', label: 'Acel. Vertical' },
  { value: 'accelLateral', label: 'Acel. Lateral' },
];

export function JourneyDetail() {
  const { id } = useParams<{ id: string }>();
  const journeyId = parseInt(id!, 10);

  const { data, loading, error } = useQuery<any>(GET_JOURNEY, { variables: { id: journeyId } });
  const { data: sensorData, loading: sensorLoading } = useQuery<any>(GET_SENSOR_READINGS, {
    variables: { journeyId },
    skip: !journeyId,
  });
  const { data: thresholdData } = useQuery<any>(GET_THRESHOLDS);
  const [mapColorBy, setMapColorBy] = useState<string>('none');

  if (loading) return (
    <div>
      <PageHeader title="Cargando..." breadcrumbs={[{ label: 'Trayectos', to: '/journeys' }]} />
      <div className="grid grid-cols-4 gap-4 mb-6">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      <Skeleton className="h-96 rounded-lg mb-6" />
      <div className="grid grid-cols-2 gap-4 mb-6">{[1,2,3,4].map(i => <Skeleton key={i} className="h-56 rounded-lg" />)}</div>
    </div>
  );
  if (error) return <div className="text-destructive">Error: {error.message}</div>;
  if (!data?.journey) return <div className="text-muted-foreground">Trayecto no encontrado</div>;

  const j = data.journey;
  const readings = sensorData?.sensorReadings ?? [];
  const thresholds = thresholdData?.thresholds ?? [];

  return (
    <div>
      <PageHeader title={j.name} breadcrumbs={[{ label: 'Trayectos', to: '/journeys' }]} />

      {/* Info */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Sistema" value={`${j.system.code}`} sub={j.system.name} />
        <KpiCard label="Estado" value={j.status} />
        <KpiCard label="Inicio" value={new Date(j.startedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} />
        <KpiCard label="Fin" value={j.endedAt ? new Date(j.endedAt).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'En curso'} />
      </div>

      {/* Mapa */}
      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">
            Mapa del trayecto
            {readings.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {readings.length.toLocaleString()} lecturas
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Colorear por:</span>
            <select
              value={mapColorBy}
              onChange={(e) => setMapColorBy(e.target.value)}
              disabled={sensorLoading}
              className="text-xs border border-input rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {colorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        {mapColorBy !== 'none' && (
          <div className="px-4 py-1.5 bg-muted border-b flex items-center gap-4 text-xs text-muted-foreground">
            <span>Escala:</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#22c55e' }}></span> Normal</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#f59e0b' }}></span> Warning</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#f97316' }}></span> Alert</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#ef4444' }}></span> Critical</span>
          </div>
        )}
        <CardContent className="p-0">
          {sensorLoading ? (
            <div style={{ height: 400 }} className="flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <div className="inline-block w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mb-2"></div>
                <p className="text-sm text-muted-foreground">Cargando datos...</p>
              </div>
            </div>
          ) : readings.length > 0 ? (
            <JourneyMap readings={readings} alerts={j.alerts} height={400} colorBy={mapColorBy as any} />
          ) : (
            <div style={{ height: 400 }} className="flex items-center justify-center bg-muted/50">
              <p className="text-sm text-muted-foreground">Sin datos de sensores</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráficas */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {chartMetrics.map((metric) => {
          const thresholdMetric = readingKeyToThresholdMetric[metric];
          const threshold = thresholds.find((t: any) => t.metric === thresholdMetric);
          return (
            <Card key={metric}>
              <CardContent className="p-2">
                {sensorLoading ? (
                  <Skeleton className="h-[220px] rounded" />
                ) : readings.length > 0 ? (
                  <SensorChart readings={readings} metric={metric} threshold={threshold} alerts={j.alerts} height={220} />
                ) : (
                  <div style={{ height: 220 }} className="flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alertas */}
      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Alertas ({j.alertCount.warning + j.alertCount.alert + j.alertCount.critical})</CardTitle>
          <div className="flex gap-2">
            <SeverityBadge severity="critical" /><span className="text-xs text-muted-foreground">{j.alertCount.critical}</span>
            <SeverityBadge severity="alert" /><span className="text-xs text-muted-foreground">{j.alertCount.alert}</span>
            <SeverityBadge severity="warning" /><span className="text-xs text-muted-foreground">{j.alertCount.warning}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {j.alerts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Metrica</TableHead>
                  <TableHead>PK</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Umbral</TableHead>
                  <TableHead className="text-right">Desviacion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {j.alerts.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                    <TableCell><MetricLabel metric={a.metric} /></TableCell>
                    <TableCell className="font-mono text-xs">{a.pkStart.toFixed(2)} - {a.pkEnd.toFixed(2)} km</TableCell>
                    <TableCell className="text-right font-mono">{a.measuredValue.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{a.thresholdValue.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">+{a.deviation.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-4 py-6 text-muted-foreground text-center text-sm">Sin alertas en este trayecto</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
