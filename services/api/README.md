# API Backend — InspectRail Platform

## Tecnología
- **Node.js + TypeScript**
- **Apollo Server** (GraphQL)
- **Prisma** (ORM type-safe para PostgreSQL)
- **graphql-ws** (subscriptions para alertas en vivo)
- **JWT** (autenticación stateless)

## Decisiones clave
- Ver **ADR-005** (Node.js + GraphQL), **ADR-006** (LISTEN/NOTIFY), **ADR-007** (Prisma)
- GraphQL elegido por flexibilidad para dashboards con vistas variables
- Node.js alineado con el stack actual de InspectRail
- Separación: Python = procesamiento de datos, Node = servir web + real-time
- Prisma como ORM: estándar actual para TypeScript + PostgreSQL, type-safety de BD a código
- Prisma Migrate para versionado de esquema (migraciones automáticas + manuales para TimescaleDB)

## Estructura prevista
```
services/api/
├── src/
│   ├── schema/              # Definición del schema GraphQL
│   │   ├── typeDefs/        # Tipos por dominio
│   │   │   ├── organization.graphql
│   │   │   ├── user.graphql
│   │   │   ├── inspectionSystem.graphql
│   │   │   ├── journey.graphql
│   │   │   ├── threshold.graphql
│   │   │   ├── alert.graphql
│   │   │   └── sensorReading.graphql
│   │   └── resolvers/       # Resolvers por dominio
│   │       ├── organization.ts
│   │       ├── user.ts
│   │       ├── journey.ts
│   │       ├── alert.ts
│   │       └── sensorReading.ts
│   ├── middleware/
│   │   ├── auth.ts          # Verificación JWT + extracción de usuario/org
│   │   └── permissions.ts   # Comprobación de permisos RBAC
│   ├── services/            # Lógica de negocio
│   ├── config/              # Configuración por entorno
│   ├── prisma/
│   │   ├── schema.prisma    # Modelo Prisma (fuente de verdad del esquema)
│   │   └── migrations/      # Migraciones versionadas (auto + manuales TimescaleDB)
│   └── index.ts             # Entry point (Apollo Server)
├── tests/
├── codegen.yml              # GraphQL codegen (genera tipos para frontend)
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## Responsabilidades
- Exponer el modelo de datos al frontend vía GraphQL
- Autenticación de usuarios (JWT) y autorización (RBAC con permisos)
- Filtrado, paginación y ordenación de datos
- Consultas de datos de sensores con resolución/agregación configurable
- Subscriptions GraphQL para alertas en tiempo real
- Aislamiento de datos por organización (multitenencia)

## Schema GraphQL (borrador)

### Queries principales
```graphql
type Query {
  # Organización
  me: User!
  organization: Organization!

  # Dispositivos
  inspectionSystems(filter: SystemFilter): [InspectionSystem!]!
  inspectionSystem(id: ID!): InspectionSystem

  # Trayectos
  journeys(filter: JourneyFilter, pagination: Pagination): JourneyConnection!
  journey(id: ID!): Journey

  # Alertas
  alerts(filter: AlertFilter, pagination: Pagination): AlertConnection!
  alert(id: ID!): Alert

  # Datos de sensores (con resolución configurable)
  sensorReadings(journeyId: ID!, pkFrom: Float, pkTo: Float, resolution: Int): [SensorReading!]!

  # Dashboard
  dashboardStats: DashboardStats!

  # Umbrales
  thresholds: [Threshold!]!
}
```

### Mutations principales
```graphql
type Mutation {
  # Autenticación
  login(email: String!, password: String!): AuthPayload!

  # Usuarios (admin_org)
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!

  # Umbrales (manager+)
  updateThreshold(id: ID!, input: UpdateThresholdInput!): Threshold!

  # Sistemas de inspección
  createInspectionSystem(input: CreateSystemInput!): InspectionSystem!
  updateInspectionSystem(id: ID!, input: UpdateSystemInput!): InspectionSystem!
}
```

### Subscriptions (alertas en vivo)
```graphql
type Subscription {
  alertCreated(severity: Severity): Alert!
}
```

### Tipos clave
```graphql
type Journey {
  id: ID!
  system: InspectionSystem!
  name: String!
  startedAt: DateTime!
  endedAt: DateTime
  status: JourneyStatus!
  geometry: GeoJSON
  alerts: [Alert!]!
  alertCount: AlertCountBySeverity!
}

type Alert {
  id: ID!
  journey: Journey!
  metric: MetricType!
  severity: Severity!
  pkStart: Float!
  pkEnd: Float!
  coordsStart: GeoPoint
  coordsEnd: GeoPoint
  measuredValue: Float!
  thresholdValue: Float!
  deviation: Float!
  detectedAt: DateTime!
}

enum Severity { WARNING, ALERT, CRITICAL }
enum JourneyStatus { IN_PROGRESS, COMPLETED, FAILED }
enum MetricType {
  ACCEL_VERTICAL, ACCEL_LATERAL, ACCEL_LONGITUDINAL,
  LEVELING, ALIGNMENT, TWIST, GAUGE, SPEED
}
```

## Comunicación con servicio de análisis

El servicio de análisis (Python) notifica alertas nuevas mediante **PostgreSQL LISTEN/NOTIFY** (ADR-006). La API escucha el canal y emite las alertas como GraphQL Subscriptions:

```
Análisis (Python)                         API (Node.js)
     │                                         │
     │  INSERT alert + pg_notify('new_alert',  │  LISTEN new_alert
     │    '{"id":1,"severity":"critical"...}') │
     ├──────── PostgreSQL LISTEN/NOTIFY ──────►│
     │         (ya lo tenemos, sin Redis)      │  Emite Subscription
     │                                         ├──► Frontend (WebSocket)
```

No se necesita Redis ni infraestructura adicional. PostgreSQL LISTEN/NOTIFY ofrece latencia de milisegundos, suficiente para el volumen de alertas ferroviarias.

## Versionado de BD (Prisma Migrate)

```
prisma/migrations/
├── 20260324_init/
│   └── migration.sql              ← Generada por Prisma (tablas de dominio)
├── 20260324_timescale_setup/
│   └── migration.sql              ← Manual: CREATE EXTENSION, hypertables
├── 20260325_add_thresholds/
│   └── migration.sql              ← Generada por Prisma
└── 20260326_continuous_aggregates/
    └── migration.sql              ← Manual: CREATE MATERIALIZED VIEW
```

Comandos:
- `npx prisma migrate dev --name nombre` — genera y aplica migración en desarrollo
- `npx prisma migrate deploy` — aplica migraciones pendientes en despliegue

## Cómo ejecutar
```bash
docker compose up api
```
