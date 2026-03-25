import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SeverityBadge } from './SeverityBadge';

describe('SeverityBadge', () => {
  it('renderiza el texto de la severidad', () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByText('critical')).toBeDefined();
  });

  it('aplica estilo rojo para critical', () => {
    const { container } = render(<SeverityBadge severity="critical" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain('text-red');
  });

  it('aplica estilo naranja para alert', () => {
    const { container } = render(<SeverityBadge severity="alert" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain('text-orange');
  });

  it('aplica estilo amarillo para warning', () => {
    const { container } = render(<SeverityBadge severity="warning" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain('text-amber');
  });
});
