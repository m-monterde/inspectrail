import { GraphQLError } from 'graphql';
import { AuthUser } from '../context.js';

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new GraphQLError('No autenticado', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return user;
}

export function requirePermission(user: AuthUser | null, permission: string): AuthUser {
  const authed = requireAuth(user);
  if (!authed.permissions.includes(permission)) {
    throw new GraphQLError(`Permiso requerido: ${permission}`, {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return authed;
}
