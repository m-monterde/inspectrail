import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.ENVIRONMENT === 'development' ? ['warn', 'error'] : ['error'],
});
