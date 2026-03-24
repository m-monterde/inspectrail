import { Context } from '../../context.js';
import { requireAuth } from '../../middleware/permissions.js';

export const organizationResolvers = {
  Query: {
    organization: async (_: unknown, __: unknown, ctx: Context) => {
      const user = requireAuth(ctx.user);
      return ctx.prisma.organization.findUniqueOrThrow({
        where: { id: user.organizationId },
      });
    },
  },
};
