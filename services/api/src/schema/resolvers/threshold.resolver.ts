import { Context } from '../../context.js';
import { requirePermission } from '../../middleware/permissions.js';

export const thresholdResolvers = {
  Query: {
    thresholds: async (_: unknown, __: unknown, ctx: Context) => {
      const user = requirePermission(ctx.user, 'thresholds.view');
      return ctx.prisma.threshold.findMany({
        where: { organizationId: user.organizationId, active: true },
        orderBy: { metric: 'asc' },
      });
    },
  },

  Mutation: {
    updateThreshold: async (_: unknown, args: { id: number; input: any }, ctx: Context) => {
      const user = requirePermission(ctx.user, 'thresholds.edit');

      // Verificar que el threshold pertenece a la organización
      const existing = await ctx.prisma.threshold.findFirst({
        where: { id: args.id, organizationId: user.organizationId },
      });

      if (!existing) {
        throw new Error('Umbral no encontrado');
      }

      return ctx.prisma.threshold.update({
        where: { id: args.id },
        data: args.input,
      });
    },
  },
};
