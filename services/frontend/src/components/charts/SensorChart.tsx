import ReactECharts from 'echarts-for-react';

interface SensorReading {
  pk: number;
  speed: number | null;
  leveling: number | null;
  alignment: number | null;
  twist: number | null;
  gauge: number | null;
  accelVertical: number | null;
  accelLateral: number | null;
  accelLongitudinal: number | null;
}

interface Threshold {
  metric: string;
  warningMin: number;
  warningMax: number;
  alertMin: number;
  alertMax: number;
  criticalMin: number;
  criticalMax: number;
}

interface Alert {
  metric: string;
  severity: string;
  pkStart: number;
  pkEnd: number;
}

interface SensorChartProps {
  readings: SensorReading[];
  metric: string;
  threshold?: Threshold;
  alerts?: Alert[];
  height?: number;
}

const metricLabels: Record<string, string> = {
  leveling: 'Nivelacion (mm)',
  alignment: 'Alineacion (mm)',
  twist: 'Alabeo (mm)',
  gauge: 'Ancho de via (mm)',
  accelVertical: 'Acel. Vertical (m/s²)',
  accelLateral: 'Acel. Lateral (m/s²)',
  accelLongitudinal: 'Acel. Longitudinal (m/s²)',
  speed: 'Velocidad (km/h)',
};

// Mapeo de nombre de campo en readings a nombre de métrica en thresholds
const metricToThresholdKey: Record<string, string> = {
  leveling: 'leveling',
  alignment: 'alignment',
  twist: 'twist',
  gauge: 'gauge',
  accelVertical: 'accel_vertical',
  accelLateral: 'accel_lateral',
  accelLongitudinal: 'accel_longitudinal',
  speed: 'speed',
};

const severityColors: Record<string, string> = {
  warning: 'rgba(245, 158, 11, 0.15)',
  alert: 'rgba(249, 115, 22, 0.15)',
  critical: 'rgba(239, 68, 68, 0.2)',
};

export function SensorChart({ readings, metric, threshold, alerts, height = 250 }: SensorChartProps) {
  const pks = readings.map((r) => r.pk.toFixed(3));
  const values = readings.map((r) => (r as any)[metric]);

  const markAreaData: any[] = [];
  if (alerts) {
    const thresholdKey = metricToThresholdKey[metric];
    alerts
      .filter((a) => a.metric === thresholdKey)
      .forEach((a) => {
        markAreaData.push([
          { xAxis: a.pkStart.toFixed(3), itemStyle: { color: severityColors[a.severity] } },
          { xAxis: a.pkEnd.toFixed(3) },
        ]);
      });
  }

  const markLines: any[] = [];
  if (threshold) {
    const thresholdKey = metricToThresholdKey[metric];
    if (threshold.metric === thresholdKey) {
      markLines.push(
        { yAxis: threshold.warningMax, lineStyle: { color: '#f59e0b', type: 'dashed', width: 1 }, label: { show: false } },
        { yAxis: threshold.warningMin, lineStyle: { color: '#f59e0b', type: 'dashed', width: 1 }, label: { show: false } },
        { yAxis: threshold.alertMax, lineStyle: { color: '#f97316', type: 'dashed', width: 1 }, label: { show: false } },
        { yAxis: threshold.alertMin, lineStyle: { color: '#f97316', type: 'dashed', width: 1 }, label: { show: false } },
        { yAxis: threshold.criticalMax, lineStyle: { color: '#ef4444', type: 'solid', width: 1.5 }, label: { show: false } },
        { yAxis: threshold.criticalMin, lineStyle: { color: '#ef4444', type: 'solid', width: 1.5 }, label: { show: false } },
      );
    }
  }

  const option = {
    title: {
      text: metricLabels[metric] || metric,
      textStyle: { fontSize: 13, fontWeight: 500, color: '#334155' },
      left: 8,
      top: 4,
    },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = params[0];
        return `PK ${p.name} km<br/>${p.value?.toFixed(3) ?? '—'}`;
      },
    },
    grid: { left: 50, right: 16, top: 36, bottom: 50 },
    dataZoom: [
      {
        type: 'inside',   // zoom con scroll / pinch en touchpad
        xAxisIndex: 0,
        filterMode: 'none',
      },
      {
        type: 'slider',   // barra de zoom debajo de la gráfica
        xAxisIndex: 0,
        height: 18,
        bottom: 4,
        filterMode: 'none',
        showDetail: false,
        borderColor: '#e2e8f0',
        fillerColor: 'rgba(59, 130, 246, 0.1)',
        handleStyle: { color: '#3b82f6' },
      },
    ],
    xAxis: {
      type: 'category' as const,
      data: pks,
      axisLabel: { fontSize: 10, interval: Math.floor(pks.length / 6) },
      name: 'PK (km)',
      nameLocation: 'end' as const,
      nameTextStyle: { fontSize: 10, color: '#94a3b8' },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      {
        type: 'line',
        data: values,
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#3b82f6' },
        areaStyle: { color: 'rgba(59, 130, 246, 0.05)' },
        markLine: markLines.length > 0 ? { silent: true, data: markLines } : undefined,
        markArea: markAreaData.length > 0 ? { silent: true, data: markAreaData } : undefined,
      },
    ],
    animation: false,
  };

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
