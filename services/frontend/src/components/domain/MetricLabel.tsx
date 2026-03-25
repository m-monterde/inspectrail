const metricLabels: Record<string, string> = {
  accel_vertical: 'Acel. Vertical',
  accel_lateral: 'Acel. Lateral',
  accel_longitudinal: 'Acel. Longitudinal',
  leveling: 'Nivelación',
  alignment: 'Alineación',
  twist: 'Alabeo',
  gauge: 'Ancho vía',
  speed: 'Velocidad',
};

export function MetricLabel({ metric }: { metric: string }) {
  return <>{metricLabels[metric] || metric}</>;
}

export { metricLabels };
