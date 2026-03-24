import { Context } from '../../context.js';
import { requirePermission } from '../../middleware/permissions.js';
import { SensorService } from '../../services/sensor.service.js';

export const sensorResolvers = {
  Query: {
    sensorReadings: async (
      _: unknown,
      args: { journeyId: number; pkFrom?: number; pkTo?: number; resolution?: number },
      ctx: Context
    ) => {
      const user = requirePermission(ctx.user, 'journeys.view');
      const service = new SensorService(ctx.prisma);
      return service.findByJourney(args.journeyId, user.organizationId, {
        pkFrom: args.pkFrom ?? undefined,
        pkTo: args.pkTo ?? undefined,
        resolution: args.resolution ?? undefined,
      });
    },
  },
};
