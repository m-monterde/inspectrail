import { useMemo, useState, useCallback } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface SensorReading {
  pk: number;
  latitude: number | null;
  longitude: number | null;
  leveling?: number | null;
  alignment?: number | null;
  twist?: number | null;
  accelVertical?: number | null;
  accelLateral?: number | null;
  speed?: number | null;
}

interface Alert {
  pkStart: number;
  pkEnd: number;
  severity: string;
  latStart: number | null;
  lonStart: number | null;
  latEnd: number | null;
  lonEnd: number | null;
}

type ColorMetric = 'leveling' | 'alignment' | 'twist' | 'accelVertical' | 'accelLateral' | 'speed' | 'none';

interface JourneyMapProps {
  readings: SensorReading[];
  alerts?: Alert[];
  height?: number;
  colorBy?: ColorMetric;
}

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const ALL_METRICS: ColorMetric[] = ['leveling', 'alignment', 'twist', 'accelVertical', 'accelLateral'];

/**
 * Downsampling por nivel de zoom.
 * A zoom bajo no necesitamos 10.000 segmentos — con 500 se ve igual
 * porque los pixels no pueden representar tanta resolución.
 * A zoom alto mostramos todos para que el detalle sea máximo.
 */
function getDownsampleFactor(zoom: number): number {
  if (zoom >= 14) return 1;     // todos los puntos
  if (zoom >= 12) return 3;     // 1 de cada 3
  if (zoom >= 10) return 8;     // 1 de cada 8
  return 20;                     // 1 de cada 20
}

function downsample<T>(arr: T[], factor: number): T[] {
  if (factor <= 1) return arr;
  const result: T[] = [];
  for (let i = 0; i < arr.length; i += factor) {
    result.push(arr[i]);
  }
  // Siempre incluir el último punto para que la línea llegue al final
  if (result[result.length - 1] !== arr[arr.length - 1]) {
    result.push(arr[arr.length - 1]);
  }
  return result;
}

export function JourneyMap({ readings, alerts, height = 400, colorBy = 'none' }: JourneyMapProps) {
  const [zoom, setZoom] = useState(9);

  const validReadings = useMemo(
    () => readings.filter((r) => r.latitude != null && r.longitude != null),
    [readings]
  );

  const factor = getDownsampleFactor(zoom);
  const sampledReadings = useMemo(() => downsample(validReadings, factor), [validReadings, factor]);

  // Línea base del trayecto (siempre con todos los puntos — es un solo LineString, ligero)
  const routeGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: validReadings.map((r) => [r.longitude!, r.latitude!]),
      },
    }],
  }), [validReadings]);

  // Segmentos coloreados — usa sampledReadings (downsampled por zoom)
  const segmentsGeoJSON = useMemo(() => {
    if (sampledReadings.length < 2) return null;

    const features = [];
    for (let i = 0; i < sampledReadings.length - 1; i++) {
      const curr = sampledReadings[i];
      const next = sampledReadings[i + 1];

      const props: Record<string, number> = { pk: curr.pk };
      for (const m of ALL_METRICS) {
        props[m] = Math.abs((curr as any)[m] ?? 0);
      }

      features.push({
        type: 'Feature' as const,
        properties: props,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [curr.longitude!, curr.latitude!],
            [next.longitude!, next.latitude!],
          ],
        },
      });
    }

    return { type: 'FeatureCollection' as const, features };
  }, [sampledReadings]);

  // Segmentos de alertas
  const alertGeoJSON = useMemo(() => {
    if (!alerts || alerts.length === 0) return null;
    const features = alerts
      .filter((a) => a.latStart != null && a.lonStart != null && a.latEnd != null && a.lonEnd != null)
      .map((a) => ({
        type: 'Feature' as const,
        properties: { severity: a.severity },
        geometry: {
          type: 'LineString' as const,
          coordinates: [[a.lonStart!, a.latStart!], [a.lonEnd!, a.latEnd!]],
        },
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [alerts]);

  // Centro del mapa
  const initialViewState = useMemo(() => {
    if (validReadings.length === 0) {
      return { longitude: -2.5, latitude: 43.3, zoom: 9 };
    }
    const lats = validReadings.map((r) => r.latitude!);
    const lons = validReadings.map((r) => r.longitude!);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
    const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons));
    const zoom = span > 0.5 ? 9 : span > 0.1 ? 11 : 13;
    return { longitude: centerLon, latitude: centerLat, zoom };
  }, [validReadings]);

  // Expression de color por métrica seleccionada
  const colorExpression: any = colorBy !== 'none'
    ? [
        'interpolate', ['linear'], ['get', colorBy],
        0, '#22c55e',
        3, '#f59e0b',
        5, '#f97316',
        7, '#ef4444',
      ]
    : '#3b82f6';

  const handleZoom = useCallback((e: any) => {
    setZoom(Math.round(e.viewState.zoom));
  }, []);

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden">
      <Map
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        onZoom={handleZoom}
      >
        <NavigationControl position="top-right" />

        {/* Línea base azul — solo visible sin coloración */}
        {colorBy === 'none' && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                'line-color': '#3b82f6',
                'line-width': ['interpolate', ['linear'], ['zoom'], 7, 3, 10, 4, 14, 5],
                'line-opacity': 0.8,
              }}
            />
          </Source>
        )}

        {/* Segmentos coloreados por métrica (downsampled) */}
        {colorBy !== 'none' && segmentsGeoJSON && (
          <Source key={`colored-${colorBy}`} id="colored-segments" type="geojson" data={segmentsGeoJSON}>
            <Layer
              id="colored-line"
              type="line"
              paint={{
                'line-color': colorExpression,
                'line-width': ['interpolate', ['linear'], ['zoom'], 7, 5, 10, 6, 14, 10],
                'line-opacity': 1,
              }}
            />
          </Source>
        )}

        {/* Segmentos de alertas */}
        {alertGeoJSON && (
          <Source id="alerts" type="geojson" data={alertGeoJSON}>
            <Layer
              id="alert-lines"
              type="line"
              paint={{
                'line-color': [
                  'match', ['get', 'severity'],
                  'critical', '#ef4444', 'alert', '#f97316', 'warning', '#f59e0b', '#999',
                ],
                'line-width': ['interpolate', ['linear'], ['zoom'], 7, 4, 10, 6, 14, 9],
                'line-opacity': 0.9,
              }}
            />
          </Source>
        )}

        {/* Info overlay */}
        <div className="absolute bottom-2 left-2 bg-white/90 text-xs text-slate-600 px-2 py-1 rounded shadow">
          {sampledReadings.length.toLocaleString()} / {validReadings.length.toLocaleString()} puntos (zoom {zoom})
        </div>
      </Map>
    </div>
  );
}
