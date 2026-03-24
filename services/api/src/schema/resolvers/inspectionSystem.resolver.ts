import { Context } from '../../context.js';
import { requirePermission } from '../../middleware/permissions.js';

export const inspectionSystemResolvers = {
  Query: {
    inspectionSystems: async (_: unknown, args: { status?: string }, ctx: Context) => {
      const user = requirePermission(ctx.user, 'systems.view');
      const where: any = { organizationId: user.organizationId, active: true };
      if (args.status) where.connectionStatus = args.status;

      return ctx.prisma.inspectionSystem.findMany({
        where,
        orderBy: { name: 'asc' },
      });
    },

    inspectionSystem: async (_: unknown, args: { id: number }, ctx: Context) => {
      const user = requirePermission(ctx.user, 'systems.view');
      return ctx.prisma.inspectionSystem.findFirst({
        where: { id: args.id, organizationId: user.organizationId },
      });
    },
  },
};
