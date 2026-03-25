import { describe, it, expect } from 'vitest';
import { requireAuth, requirePermission } from './permissions.js';
import type { AuthUser } from '../context.js';

describe('Permisos', () => {
  const admin: AuthUser = {
    id: 1,
    email: 'admin@test.com',
    organizationId: 1,
    permissions: ['dashboard.view', 'journeys.view', 'thresholds.edit', 'users.manage'],
  };

  const operator: AuthUser = {
    id: 2,
    email: 'operator@test.com',
    organizationId: 1,
    permissions: ['dashboard.view', 'journeys.view'],
  };

  describe('requireAuth', () => {
    it('devuelve el usuario si está autenticado', () => {
      const result = requireAuth(admin);
      expect(result).toBe(admin);
    });

    it('lanza error UNAUTHENTICATED si no hay usuario', () => {
      expect(() => requireAuth(null)).toThrow('No autenticado');
    });
  });

  describe('requirePermission', () => {
    it('admin puede editar umbrales', () => {
      const result = requirePermission(admin, 'thresholds.edit');
      expect(result).toBe(admin);
    });

    it('operator no puede editar umbrales', () => {
      expect(() => requirePermission(operator, 'thresholds.edit')).toThrow('thresholds.edit');
    });

    it('operator puede ver el dashboard', () => {
      const result = requirePermission(operator, 'dashboard.view');
      expect(result).toBe(operator);
    });

    it('lanza UNAUTHENTICATED si no hay usuario', () => {
      expect(() => requirePermission(null, 'dashboard.view')).toThrow('No autenticado');
    });

    it('admin puede gestionar usuarios, operator no', () => {
      expect(requirePermission(admin, 'users.manage')).toBe(admin);
      expect(() => requirePermission(operator, 'users.manage')).toThrow('users.manage');
    });
  });
});
