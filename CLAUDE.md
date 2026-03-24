# InspectRail Platform — Contexto del proyecto

## Qué es
Plataforma centralizada de monitorización de infraestructura ferroviaria para InspectRail (Donostia).
Es un reto técnico para un proceso de selección de Ingeniero Full Stack. El objetivo es diseñar la arquitectura completa y desarrollar un prototipo funcional (demo).

## Estado actual
- **Fase de diseño**: COMPLETADA. 12 ADRs documentadas en `docs/decisiones_arquitectonicas.docx`
- **Fase de desarrollo**: BD + API + Frontend + Deploy COMPLETADOS
- **Repositorio**: github.com/m-monterde/inspectrail (privado, cuenta m-monterde)
- **Demo live**: https://inspectrail.duckdns.org
- **VPS**: Hetzner 204.168.173.222, usuario `deploy`, acceso SSH por clave
- **Versión actual**: v0.1.0

## Arquitectura (5 servicios)
```
Tren (sensores) → Ingesta (Python) → BD (PG+TimescaleDB) → Análisis (Python) → API (Node+GraphQL) → Frontend (React)
                                                                    ↓
                                                        pg_notify('new_alert')
                                                                    ↓
                                                        API LISTEN → GraphQL Subscription → Frontend
```

## Stack tecnológico decidido
| Capa | Tecnología | ADR |
|------|-----------|-----|
| BD | PostgreSQL 16 + TimescaleDB + PostGIS | ADR-001, ADR-004 |
| Ingesta | Python (asyncio + FastAPI) | ADR-002, ADR-003 |
| Análisis | Python (NumPy, SciPy) | ADR-002, ADR-003 |
| Comunicación análisis→API | PostgreSQL LISTEN/NOTIFY (sin Redis) | ADR-006 |
| API | Node.js + TypeScript + Apollo Server + Prisma 6 | ADR-005, ADR-007 |
| Frontend | React + Vite + MapLibre GL (WebGL) + ECharts + Tailwind/shadcn + Apollo Client | ADR-008 |
| CI/CD | GitHub Actions + Docker Compose + ghcr.io | ADR-009 |
| Observabilidad | Prometheus + Grafana + Loki | ADR-009 |
| Demo | VPS Hetzner + GitHub Codespaces backup | ADR-010 |
| Entornos | Dev híbrido, tests con testcontainers, staging mismo VPS | ADR-011 |
| Código | Monorepo | ADR-012 |

## Modelo de datos (nombres en inglés, documentación en castellano)
### Tablas relacionales
- `organizations` — multitenencia (saas / on_premise)
- `users`, `roles`, `permissions`, `role_permissions`, `user_roles` — RBAC con scope
- `inspection_systems` — trenes con sensores (api_key/api_secret para auth)
- `journeys` — trayectos dinámicos (no rutas predefinidas, la ruta emerge de las lecturas)
- `thresholds` — umbrales por org + métrica (warning/alert/critical)
- `alerts` — anomalías como segmentos (pk_start–pk_end), con LISTEN/NOTIFY trigger

### Hypertable (TimescaleDB)
- `sensor_readings` — particionada por tiempo, compresión activa
- Métricas: accel_vertical, accel_lateral, accel_longitudinal, leveling, alignment, twist, gauge, speed

### Futuro (diseñado, sin implementar)
- `groups`, `group_journeys`, `group_systems` — agrupaciones dentro de org
- `alert_subscriptions` — notificaciones SMS/email

## Base de datos — Estado completado
- Schema Prisma en `services/api/prisma/schema.prisma`
- Migración init + migración TimescaleDB (hypertable + compresión + trigger notify)
- Seed con rutas reales vascas: 1 org, 2 usuarios, 2 sistemas, 4 trayectos, 11.800 lecturas, 31 alertas
- Trayecto principal Donostia→Bilbao: 10.000 puntos (32 waypoints de la vía real)
- Credenciales demo: admin@inspectrail.demo / demo1234, operador@inspectrail.demo / demo1234
- Prisma 6 (no 7, que cambió el modelo de configuración)

## Infraestructura configurada
- VPS Hetzner: 204.168.173.222, Docker 29.3.0, usuario deploy, firewall (22/80/443), dir /opt/inspectrail
- Dominio: inspectrail.duckdns.org (DuckDNS, gratuito)
- HTTPS: Let's Encrypt automático vía Traefik v2.11
- GitHub: repo creado, secrets configurados (VPS_HOST, VPS_USER, VPS_SSH_KEY)
- GitHub Actions: ci.yml, build-and-push.yml (api+frontend → ghcr.io), deploy.yml
- Imágenes Docker públicas en ghcr.io/m-monterde/inspectrail-{api,frontend}
- Node.js 22 necesario (nvm use 22)
- **Demo live**: https://inspectrail.duckdns.org

## API GraphQL — Arquitectura (decidido 2026-03-24)
Patrón **schema-first con capa de servicios** (Resolvers → Services → Prisma):
- **Schema `.graphql`** = contrato del API (equivale a DTOs en REST)
- **Resolvers** = delegan a services (equivale a controllers)
- **Services** = lógica de negocio + acceso a datos vía Prisma
- **Middleware** = auth JWT + permisos RBAC
- No se usan DTOs explícitos (los input/type de GraphQL ya lo son)
- No se usa capa Repository (Prisma ya es el data access layer type-safe)
- Descartado NestJS por over-engineering para el alcance del proyecto
- Descartado resolvers→Prisma directo por mezclar lógica con resolución

```
services/api/src/
├── schema/typeDefs/*.graphql    ← contrato GraphQL
├── schema/resolvers/*.ts        ← delegan a services
├── services/*.service.ts        ← lógica de negocio
├── middleware/{auth,permissions} ← JWT + RBAC
├── lib/prisma.ts                ← singleton PrismaClient
├── context.ts                   ← tipo Context
└── index.ts                     ← entry point Apollo Server
```

Dependencias: @apollo/server, graphql, @graphql-tools/schema, @graphql-tools/load-files, @graphql-tools/merge, graphql-scalars, jsonwebtoken, graphql-ws, ws

## API GraphQL — Estado completado
- Todas las queries y mutations implementadas y verificadas con curl
- Login, dashboard, journeys, alerts, sensorReadings, thresholds, inspectionSystems
- Auth JWT + RBAC con permisos granulares + multitenencia por organizationId
- Dockerfile multi-stage (node:22-slim, ejecuta con tsx)
- Pendiente: subscriptions (alertas en vivo), mutations secundarias (createUser, etc.), tests

## Frontend — Estado completado
- React 19 + Vite + TypeScript + Tailwind CSS v4 + Apollo Client 4
- Páginas: Login, Dashboard, Journeys, JourneyDetail, Alerts, Systems, Thresholds
- Gráficas de sensores con Apache ECharts (zoom/pan, líneas de umbral)
- Mapas con MapLibre GL JS (rutas coloreadas por métrica, downsampling por zoom)
- Dockerfile multi-stage (Vite build + Nginx Alpine)
- Nginx como servidor con proxy /graphql → API
- Apollo Client 4: hooks en `@apollo/client/react`, config en `@apollo/client/core`, gql en `graphql-tag`

## Deploy — Estado completado
- Demo live: https://inspectrail.duckdns.org (v0.1.0)
- 4 contenedores: database (TimescaleDB), api (Node.js), frontend (Nginx), proxy (Traefik v2.11)
- CI: push a main → lint + typecheck (API + frontend)
- Build & Push: push tag `v*` → build imágenes → push a ghcr.io con tags semver + latest + sha
- Deploy: automático tras build exitoso vía SSH + docker compose pull/up
- Traefik v2.11 como proxy inverso con HTTPS automático (Let's Encrypt)
- Traefik v3.x descartado por incompatibilidad con Docker API version negotiation en Docker 29.x
- Dominio: inspectrail.duckdns.org (DuckDNS, gratuito)
- Imágenes públicas en ghcr.io/m-monterde/inspectrail-{api,frontend}
- ESLint: `no-explicit-any` desactivado hasta implementar graphql-codegen

## CI/CD — Flujo de despliegue
```
push a main  →  CI (lint + typecheck)
push tag v*  →  Build & Push (docker build → ghcr.io)  →  Deploy (SSH → docker compose up)
```
Para desplegar: `git tag -a v0.2.0 -m "descripción" && git push origin v0.2.0`

## Siguiente paso
Diseño visual del frontend y presentación técnica.

## Convenciones del usuario
- Documentación siempre en castellano
- Nombres de tablas, campos y enums en inglés
- Ante cada decisión técnica, presentar opciones con pros/contras y dejar que el usuario elija
- No desarrollar sin aprobación del usuario en decisiones de estructura/librerías
- Justificar cada decisión en el docx de ADRs
