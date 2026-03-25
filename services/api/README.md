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

## Autenticación y autorización

### Autenticación — JWT stateless

El usuario se autentica con `login(email, password)` y recibe un token JWT firmado con HS256. Cada petición posterior incluye el token en la cabecera `Authorization: Bearer <token>`. El servidor verifica el token, extrae `userId`, `email` y `organizationId`, y los inyecta en el contexto de GraphQL.

No se almacena estado de sesión en el servidor. El token expira en 24h.

**Alternativas descartadas:**
- Sesiones en servidor (requiere store compartido tipo Redis entre instancias)
- OAuth2/OpenID Connect (sobredimensionado para una plataforma interna sin SSO)

### Autorización — RBAC (Role-Based Access Control)

RBAC es un modelo de autorización estándar en aplicaciones empresariales donde los permisos no se asignan directamente a usuarios, sino a **roles**, y los roles se asignan a usuarios. Esto permite gestionar el acceso de forma escalable.

**Flujo:**
```
Usuario → tiene → Roles → tienen → Permisos
   │                │                   │
   Ana García       admin_org           thresholds.edit, users.manage, ...
   Pedro Martínez   operator            journeys.view, alerts.view, ...
```

**Modelo de datos (5 tablas):**
```
users ──1:N──► user_roles ──N:1──► roles ──1:N──► role_permissions ──N:1──► permissions
```

**Roles del sistema:**

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| admin_org | Administrador de la organización | Todos (10 permisos) |
| operator | Operador de campo | Solo lectura: dashboard, journeys, alerts, thresholds, systems (5 permisos) |

**Permisos implementados:**

| Permiso | Descripción | Quién lo tiene |
|---------|-------------|----------------|
| dashboard.view | Ver dashboard | admin_org, operator |
| journeys.view | Ver trayectos y lecturas de sensores | admin_org, operator |
| alerts.view | Ver alertas | admin_org, operator |
| thresholds.view | Ver umbrales | admin_org, operator |
| thresholds.edit | Modificar umbrales | admin_org |
| systems.view | Ver sistemas de inspección | admin_org, operator |
| systems.edit | Editar sistemas de inspección | admin_org |
| users.view | Ver lista de usuarios | admin_org |
| users.manage | Crear/editar/desactivar usuarios | admin_org |
| org.configure | Configurar organización | admin_org |

**Uso en el código (resolvers):**
```typescript
// Solo requiere estar autenticado (cualquier rol)
const user = requireAuth(ctx.user);

// Requiere permiso específico — lanza FORBIDDEN si no lo tiene
const user = requirePermission(ctx.user, 'thresholds.edit');
```

**Justificación de RBAC frente a alternativas:**

| Alternativa | Por qué no |
|-------------|-----------|
| Comprobar rol directamente (`if role === 'admin'`) | Rígido: añadir un rol `manager` obliga a tocar cada `if` del código |
| ACL (Access Control Lists) | Más granular pero más complejo de gestionar; innecesario para el número de operaciones de esta plataforma |
| ABAC (Attribute-Based Access Control) | Basado en atributos dinámicos (hora, ubicación...); sobredimensionado aquí |

RBAC es el punto de equilibrio: lo suficientemente flexible para crear nuevos roles sin tocar código (solo se asignan permisos en BD), y lo suficientemente simple para que no añada complejidad innecesaria.

**Multitenencia:** además de RBAC, todas las queries filtran automáticamente por `organizationId` del usuario autenticado. Un usuario de la organización A nunca puede ver datos de la organización B, independientemente de su rol.

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

## Credenciales de demo

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Mario Monterde (Admin) | admin@inspectrail.demo | demo1234 | admin_org |
| Operador | operador@inspectrail.demo | demo1234 | operator |

## Tests

16 tests con **Vitest** cubriendo servicios y resolvers:

```bash
npm test           # ejecutar tests
npm run test:watch # modo watch
```

## Cómo ejecutar
```bash
docker compose up api
```
