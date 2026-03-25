import { describe, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import bcrypt from 'bcryptjs';

// Mock de PrismaClient
function createMockPrisma(overrides: any = {}) {
  return {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      ...overrides.user,
    },
  } as any;
}

describe('AuthService', () => {
  it('login correcto devuelve token y usuario', async () => {
    const passwordHash = await bcrypt.hash('demo1234', 10);
    const mockUser = {
      id: 1,
      email: 'admin@test.com',
      name: 'Admin',
      passwordHash,
      active: true,
      organizationId: 1,
      organization: { active: true },
    };

    const prisma = createMockPrisma({
      user: {
        findUnique: vi.fn().mockResolvedValue(mockUser),
        update: vi.fn().mockResolvedValue(mockUser),
      },
    });

    const service = new AuthService(prisma);
    const result = await service.login('admin@test.com', 'demo1234');

    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('admin@test.com');
    expect(result.user.name).toBe('Admin');
  });

  it('login con email inexistente lanza error', async () => {
    const prisma = createMockPrisma({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    const service = new AuthService(prisma);
    await expect(service.login('noexiste@test.com', '1234')).rejects.toThrow('Credenciales inválidas');
  });

  it('login con contraseña incorrecta lanza error', async () => {
    const passwordHash = await bcrypt.hash('correcta', 10);
    const mockUser = {
      id: 1,
      email: 'admin@test.com',
      passwordHash,
      active: true,
      organizationId: 1,
      organization: { active: true },
    };

    const prisma = createMockPrisma({
      user: { findUnique: vi.fn().mockResolvedValue(mockUser) },
    });

    const service = new AuthService(prisma);
    await expect(service.login('admin@test.com', 'incorrecta')).rejects.toThrow('Credenciales inválidas');
  });

  it('login con usuario desactivado lanza error', async () => {
    const mockUser = {
      id: 1,
      email: 'admin@test.com',
      passwordHash: 'hash',
      active: false,
      organizationId: 1,
      organization: { active: true },
    };

    const prisma = createMockPrisma({
      user: { findUnique: vi.fn().mockResolvedValue(mockUser) },
    });

    const service = new AuthService(prisma);
    await expect(service.login('admin@test.com', '1234')).rejects.toThrow('Credenciales inválidas');
  });

  it('login con organización desactivada lanza error', async () => {
    const passwordHash = await bcrypt.hash('demo1234', 10);
    const mockUser = {
      id: 1,
      email: 'admin@test.com',
      passwordHash,
      active: true,
      organizationId: 1,
      organization: { active: false },
    };

    const prisma = createMockPrisma({
      user: { findUnique: vi.fn().mockResolvedValue(mockUser) },
    });

    const service = new AuthService(prisma);
    await expect(service.login('admin@test.com', 'demo1234')).rejects.toThrow('Organización desactivada');
  });
});
