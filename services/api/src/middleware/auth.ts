import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AuthUser } from '../context.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';
const JWT_EXPIRES_IN = '24h';

export interface JwtPayload {
  userId: number;
  email: string;
  organizationId: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function getUserFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;

  // Soportar "Bearer <token>" y token directo
  const raw = token.startsWith('Bearer ') ? token.slice(7) : token;

  try {
    const payload = verifyToken(raw);

    // Obtener permisos del usuario
    const userRoles = await prisma.userRole.findMany({
      where: { userId: payload.userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissions = [
      ...new Set(
        userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code)
        )
      ),
    ];

    return {
      id: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      permissions,
    };
  } catch {
    return null;
  }
}
