import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('traduce in_progress a "En curso"', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('En curso')).toBeDefined();
  });

  it('traduce completed a "Completado"', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Completado')).toBeDefined();
  });

  it('traduce connected a "Conectado"', () => {
    render(<StatusBadge status="connected" />);
    expect(screen.getByText('Conectado')).toBeDefined();
  });

  it('muestra el valor raw si no tiene traducción', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeDefined();
  });

  it('aplica estilo verde para completed', () => {
    const { container } = render(<StatusBadge status="completed" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain('text-green');
  });
});
