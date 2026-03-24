import { Context } from '../../context.js';
import { requirePermission } from '../../middleware/permissions.js';
import { AlertService } from '../../services/alert.service.js';

export const alertResolvers = {
  Query: {
    alerts: async (_: unknown, args: { filter?: any; pagination?: any }, ctx: Context) => {
      const user = requirePermission(ctx.user, 'alerts.view');
      const service = new AlertService(ctx.prisma);
      const result = await service.findMany(user.organizationId, args.filter, args.pagination);

      return {
        items: result.items,
        pageInfo: {
          page: result.page,
          pageSize: result.pageSize,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
        },
      };
    },

    alert: async (_: unknown, args: { id: number }, ctx: Context) => {
      const user = requirePermission(ctx.user, 'alerts.view');
      const service = new AlertService(ctx.prisma);
      return service.findById(args.id, user.organizationId);
    },
  },
};
