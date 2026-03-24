import bcrypt from 'bcryptjs';
import { GraphQLError } from 'graphql';
import { PrismaClient } from '@prisma/client';
import { signToken } from '../middleware/auth.js';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user || !user.active) {
      throw new GraphQLError('Credenciales inválidas', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    if (!user.organization.active) {
      throw new GraphQLError('Organización desactivada', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new GraphQLError('Credenciales inválidas', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    // Actualizar último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
    });

    return { token, user };
  }
}
