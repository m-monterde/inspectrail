import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from './auth.js';

describe('JWT Auth', () => {
  const payload = { userId: 1, email: 'test@example.com', organizationId: 1 };

  it('signToken genera un token válido', () => {
    const token = signToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  it('verifyToken decodifica el payload correctamente', () => {
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(1);
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.organizationId).toBe(1);
  });

  it('verifyToken rechaza un token inválido', () => {
    expect(() => verifyToken('token.invalido.aqui')).toThrow();
  });

  it('verifyToken rechaza un token manipulado', () => {
    const token = signToken(payload);
    const parts = token.split('.');
    parts[1] = 'aaaa'; // manipular el payload
    expect(() => verifyToken(parts.join('.'))).toThrow();
  });
});
