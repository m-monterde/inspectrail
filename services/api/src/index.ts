import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './lib/prisma.js';
import { resolvers } from './schema/resolvers/index.js';
import { getUserFromToken } from './middleware/auth.js';
import { Context } from './context.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cargar todos los .graphql del directorio typeDefs
const typeDefsArray = loadFilesSync(path.join(__dirname, 'schema/typeDefs'), {
  extensions: ['graphql'],
});

// Schema base con Query y Mutation raíz (necesario para los extend type)
const baseTypeDefs = `
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
`;

const typeDefs = mergeTypeDefs([baseTypeDefs, ...typeDefsArray]);
const mergedResolvers = mergeResolvers(resolvers);

const schema = makeExecutableSchema({ typeDefs, resolvers: mergedResolvers });

const server = new ApolloServer<Context>({ schema });

const PORT = parseInt(process.env.API_PORT || '3000', 10);

const { url } = await startStandaloneServer(server, {
  listen: { port: PORT },
  context: async ({ req }): Promise<Context> => {
    const token = req.headers.authorization;
    const user = await getUserFromToken(token);
    return { prisma, user };
  },
});

console.log(`🚀 API GraphQL lista en ${url}`);
