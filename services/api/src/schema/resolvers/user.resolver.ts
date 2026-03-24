import { Context } from '../../context.js';
import { requireAuth, requirePermission } from '../../middleware/permissions.js';

export const userResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: Context) => {
      const user = requireAuth(ctx.user);
      const dbUser = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { userRoles: { include: { role: true } } },
      });
      return dbUser;
    },

    users: async (_: unknown, __: unknown, ctx: Context) => {
      const user = requirePermission(ctx.user, 'users.view');
      return ctx.prisma.user.findMany({
        where: { organizationId: user.organizationId },
        include: { userRoles: { include: { role: true } } },
        orderBy: { name: 'asc' },
      });
    },
  },

  User: {
    roles: (parent: any) => {
      return parent.userRoles?.map((ur: any) => ur.role.name) ?? [];
    },
  },
};
