# ── Build stage ──
FROM node:22-slim AS build

WORKDIR /app

# Instalar dependencias
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código fuente y Prisma schema
COPY src/ ./src/
COPY prisma/ ./prisma/
COPY tsconfig.json ./

# Generar Prisma Client
RUN npx prisma generate

# ── Production stage ──
FROM node:22-slim

WORKDIR /app

# Copiar dependencias y código desde build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/src ./src
COPY --from=build /app/prisma ./prisma

# Exponer puerto
ENV API_PORT=3000
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/.well-known/apollo/server-health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Ejecutar con tsx (soporta ESM + TypeScript + .graphql imports sin compilar)
CMD ["npx", "tsx", "src/index.ts"]
