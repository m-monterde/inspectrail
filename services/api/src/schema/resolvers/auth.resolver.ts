import { AuthService } from '../../services/auth.service.js';
import { Context } from '../../context.js';

export const authResolvers = {
  Mutation: {
    login: async (_: unknown, args: { email: string; password: string }, ctx: Context) => {
      const authService = new AuthService(ctx.prisma);
      return authService.login(args.email, args.password);
    },
  },
};
