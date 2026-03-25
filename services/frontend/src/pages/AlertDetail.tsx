import { useQuery } from '@apollo/client/react';
import { useParams } from 'react-router-dom';
import { GET_ALERT, GET_SENSOR_READINGS, GET_THRESHOLDS } from '@/graphql/queries';
import { SensorChart } from '@/components/charts/SensorChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/domain/SeverityBadge';
import { MetricLabel, metricLabels } from '@/components/domain/MetricLabel';
import { PageHeader } from '@/components/domain/PageHeader';

// Mapeo metric → campo en sensorReadings
const metricToReadingKey: Record<string, string> = {
  leveling: 'leveling',
  alignment: 'alignment',
  twist: 'twist',
  gauge: 'gauge',
  accel_vertical: 'accelVertical',
  accel_lateral: 'accelLateral',
  accel_longitudinal: 'accelLongitudinal',
  speed: 'speed',
};

// Mapeo inverso para threshold lookup
const readingKeyToThresholdMetric: Record<string, string> = {
  leveling: 'leveling', alignment: 'alignment', twist: 'twist', gauge: 'gauge',
  accelVertical: 'accel_vertical', accelLateral: 'accel_lateral', speed: 'speed',
};

export function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const alertId = parseInt(id!, 10);

  const { data, loading, error } = useQuery<any>(GET_ALERT, { variables: { id: alertId } });
  const { data: thresholdData } = useQuery<any>(GET_THRESHOLDS);

  // Cargar lecturas del tramo ±2km alrededor de la alerta
  const alert = data?.alert;
  const pkMargin = 2;
  const pkFrom = alert ? Math.max(0, alert.pkStart - pkMargin) : 0;
  const pkTo = alert ? alert.pkEnd + pkMargin : 0;

  const { data: sensorData, loading: sensorLoading } = useQuery<any>(GET_SENSOR_READINGS, {
    variables: {
      journeyId: alert?.journey?.id,
      pkFrom,
      pkTo,
    },
    skip: !alert?.journey?.id,
  });

  // Ruta completa para el mapa
  const { data: fullRouteData } = useQuery<any>(GET_SENSOR_READINGS, {
    variables: {
      journeyId: alert?.journey?.id,
    },
    skip: !alert?.journey?.id,
  });

  if (loading) return (
    <div>
      <PageHeader title="Cargando..." breadcrumbs={[{ label: 'Alertas', to: '/alerts' }]} />
      <div className="grid grid-cols-2 gap-4 mb-6"><Skeleton className="h-20 rounded-lg" /><Skeleton className="h-20 rounded-lg" /></div>
      <Skeleton className="h-80 rounded-lg mb-6" />
      <Skeleton className="h-56 rounded-lg" />
    </div>
  );
  if (error) return <div className="text-destructive">Error: {error.message}</div>;
  if (!alert) return <div className="text-muted-foreground">Alerta no encontrada</div>;

  const readings = sensorData?.sensorReadings ?? [];
  const fullRoute = fullRouteData?.sensorReadings ?? [];
  const thresholds = thresholdData?.thresholds ?? [];
  const readingKey = metricToReadingKey[alert.metric] || alert.metric;
  const thresholdMetric = readingKeyToThresholdMetric[readingKey];
  const threshold = thresholds.find((t: any) => t.metric === thresholdMetric);

  return (
    <div>
      <PageHeader
        title={`Alerta ${metricLabels[alert.metric] || alert.metric}`}
        breadcrumbs={[
          { label: 'Alertas', to: '/alerts' },
        ]}
      />

      {/* Info de la alerta */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Severidad</p>
            <SeverityBadge severity={alert.severity} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Metrica</p>
            <p className="font-medium"><MetricLabel metric={alert.metric} /></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Valor medido / Umbral</p>
            <p><span className="font-bold text-destructive">{alert.measuredValue.toFixed(2)}</span> <span className="text-muted-foreground">/ {alert.thresholdValue.toFixed(2)}</span></p>
            <p className="text-xs text-destructive">+{alert.deviation.toFixed(2)} desviación</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Posición</p>
            <p className="font-mono text-sm">PK {alert.pkStart.toFixed(2)} — {alert.pkEnd.toFixed(2)} km</p>
            {alert.latStart && (
              <p className="font-mono text-xs text-muted-foreground mt-1">
                {alert.latStart.toFixed(5)}, {alert.lonStart.toFixed(5)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info trayecto */}
      <div className="flex items-center gap-6 mb-6 text-sm">
        <div><span className="text-muted-foreground">Trayecto:</span> <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{alert.journey.system.code}</code> {alert.journey.name}</div>
        <div><span className="text-muted-foreground">Detectada:</span> {new Date(alert.detectedAt).toLocaleString('es-ES')}</div>
      </div>

      {/* Mapa: ruta completa + segmento de alerta */}
      <Card className="mb-6 gap-0 py-0">
        <CardHeader className="py-3">
          <CardTitle className="text-base">
            Ubicación de la alerta
            {alert.latStart && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                GPS: {alert.latStart.toFixed(5)}, {alert.lonStart.toFixed(5)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fullRoute.length > 0 ? (
            <AlertMap
              route={fullRoute}
              alert={alert}
              height={350}
            />
          ) : (
            <div style={{ height: 350 }} className="flex items-center justify-center bg-muted/50">
              <p className="text-sm text-muted-foreground">Cargando mapa...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfica del sensor en el tramo de la alerta */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">
            {metricLabels[alert.metric] || alert.metric} — tramo PK {pkFrom.toFixed(1)} a {pkTo.toFixed(1)} km
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sensorLoading ? (
            <Skeleton className="h-[250px] rounded" />
          ) : readings.length > 0 ? (
            <SensorChart
              readings={readings}
              metric={readingKey}
              threshold={threshold}
              alerts={[alert]}
              height={250}
            />
          ) : (
            <div style={{ height: 250 }} className="flex items-center justify-center text-sm text-muted-foreground">
              Sin datos de sensores en este tramo
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Mapa específico para alertas: ruta completa + segmento resaltado + zoom centrado en la alerta
import Map, { Source, Layer, NavigationControl, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMemo } from 'react';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function AlertMap({ route, alert, height }: { route: any[]; alert: any; height: number }) {
  const validRoute = useMemo(
    () => route.filter((r: any) => r.latitude != null && r.longitude != null),
    [route]
  );

  const routeGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: validRoute.map((r: any) => [r.longitude, r.latitude]),
      },
    }],
  }), [validRoute]);

  const alertGeoJSON = useMemo(() => {
    if (!alert.latStart || !alert.lonStart || !alert.latEnd || !alert.lonEnd) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        properties: { severity: alert.severity },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [alert.lonStart, alert.latStart],
            [alert.lonEnd, alert.latEnd],
          ],
        },
      }],
    };
  }, [alert]);

  const severityColor = alert.severity === 'critical' ? '#ef4444' : alert.severity === 'alert' ? '#f97316' : '#f59e0b';

  // Centrar en la alerta
  const centerLat = alert.latStart && alert.latEnd ? (alert.latStart + alert.latEnd) / 2 : 43.3;
  const centerLon = alert.lonStart && alert.lonEnd ? (alert.lonStart + alert.lonEnd) / 2 : -2.0;

  return (
    <div style={{ height }} className="rounded-b-xl overflow-hidden">
      <Map
        initialViewState={{ longitude: centerLon, latitude: centerLat, zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
      >
        <NavigationControl position="top-right" />

        {/* Ruta completa en azul tenue */}
        <Source id="route" type="geojson" data={routeGeoJSON}>
          <Layer
            id="route-line"
            type="line"
            paint={{ 'line-color': '#3b82f6', 'line-width': 2, 'line-opacity': 0.3 }}
          />
        </Source>

        {/* Segmento de la alerta */}
        {alertGeoJSON && (
          <Source id="alert-segment" type="geojson" data={alertGeoJSON}>
            <Layer
              id="alert-line"
              type="line"
              paint={{ 'line-color': severityColor, 'line-width': 6, 'line-opacity': 0.9 }}
            />
          </Source>
        )}

        {/* Marcador en el inicio de la alerta */}
        {alert.latStart && alert.lonStart && (
          <Marker longitude={alert.lonStart} latitude={alert.latStart} anchor="center">
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: severityColor, border: '2px solid white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </Marker>
        )}
      </Map>
    </div>
  );
}
