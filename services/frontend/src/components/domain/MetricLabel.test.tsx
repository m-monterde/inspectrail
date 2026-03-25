import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricLabel, metricLabels } from './MetricLabel';

describe('MetricLabel', () => {
  it('traduce leveling a "Nivelación"', () => {
    render(<MetricLabel metric="leveling" />);
    expect(screen.getByText('Nivelación')).toBeDefined();
  });

  it('traduce accel_vertical a "Acel. Vertical"', () => {
    render(<MetricLabel metric="accel_vertical" />);
    expect(screen.getByText('Acel. Vertical')).toBeDefined();
  });

  it('muestra el valor raw si no tiene traducción', () => {
    render(<MetricLabel metric="metric_desconocida" />);
    expect(screen.getByText('metric_desconocida')).toBeDefined();
  });

  it('metricLabels contiene las 8 métricas', () => {
    const keys = Object.keys(metricLabels);
    expect(keys).toContain('leveling');
    expect(keys).toContain('alignment');
    expect(keys).toContain('twist');
    expect(keys).toContain('gauge');
    expect(keys).toContain('accel_vertical');
    expect(keys).toContain('accel_lateral');
    expect(keys).toContain('accel_longitudinal');
    expect(keys).toContain('speed');
    expect(keys).toHaveLength(8);
  });
});
