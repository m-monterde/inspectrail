import { Context } from '../../context.js';
import { requirePermission } from '../../middleware/permissions.js';
import { DashboardService } from '../../services/dashboard.service.js';

export const dashboardResolvers = {
  Query: {
    dashboardStats: async (_: unknown, __: unknown, ctx: Context) => {
      const user = requirePermission(ctx.user, 'dashboard.view');
      const service = new DashboardService(ctx.prisma);
      return service.getStats(user.organizationId);
    },
  },
};
