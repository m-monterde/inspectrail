import { PrismaClient } from '@prisma/client';

export interface AuthUser {
  id: number;
  email: string;
  organizationId: number;
  permissions: string[];
}

export interface Context {
  prisma: PrismaClient;
  user: AuthUser | null;
}
