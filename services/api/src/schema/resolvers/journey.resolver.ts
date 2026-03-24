import { Context } from '../../context.js';
import { requirePermission } from '../../middleware/permissions.js';
import { JourneyService } from '../../services/journey.service.js';
import { AlertService } from '../../services/alert.service.js';

export const journeyResolvers = {
  Query: {
    journeys: async (_: unknown, args: { filter?: any; pagination?: any }, ctx: Context) => {
      const user = requirePermission(ctx.user, 'journeys.view');
      const service = new JourneyService(ctx.prisma);
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

    journey: async (_: unknown, args: { id: number }, ctx: Context) => {
      const user = requirePermission(ctx.user, 'journeys.view');
      const service = new JourneyService(ctx.prisma);
      return service.findById(args.id, user.organizationId);
    },
  },

  Journey: {
    alerts: async (parent: any, _: unknown, ctx: Context) => {
      return ctx.prisma.alert.findMany({
        where: { journeyId: parent.id },
        orderBy: { detectedAt: 'desc' },
      });
    },

    alertCount: async (parent: any, _: unknown, ctx: Context) => {
      const alertService = new AlertService(ctx.prisma);
      return alertService.countBySeverity(parent.organizationId, parent.id);
    },
  },
};
