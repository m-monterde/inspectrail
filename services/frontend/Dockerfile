# ── Build stage ──
FROM node:22-slim AS build

WORKDIR /app

# Instalar dependencias
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código fuente
COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY src/ ./src/
COPY public/ ./public/

# Build estático (Vite genera /app/dist)
ARG VITE_API_URL=/graphql
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ── Production stage (Nginx sirve archivos estáticos) ──
FROM nginx:alpine

# Copiar build estático
COPY --from=build /app/dist /usr/share/nginx/html

# Configuración Nginx para SPA (redirige todo a index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
