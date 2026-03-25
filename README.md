# InspectRail Platform

Plataforma centralizada de monitorización de infraestructura ferroviaria.

**Demo live:** https://inspectrail.duckdns.org
**Credenciales:** admin@inspectrail.demo / demo1234

## Estructura del proyecto

```
inspectrail/
├── docs/
│   ├── decisiones_arquitectonicas.docx   # 12 ADRs documentadas
│   └── documentacion_proyecto.docx       # Documentación técnica completa
├── services/
│   ├── database/                  # Base de datos (PostgreSQL + TimescaleDB + PostGIS)
│   ├── api/                       # API Backend (Node.js + TypeScript + GraphQL)
│   ├── frontend/                  # Aplicación web (React + Vite + MapLibre + ECharts)
│   ├── ingesta/                   # Servicio de ingesta (Python) — diseñado, no implementado
│   └── analisis/                  # Servicio de análisis (Python) — diseñado, no implementado
├── devops/
│   ├── docker/                    # Docker Compose (dev + prod)
│   └── scripts/                   # Scripts de deploy y setup
├── docker-compose.demo.yml        # Demo local con un solo comando
└── .github/workflows/             # CI/CD (GitHub Actions)
```

## Ejecutar en local

Hay dos formas de levantar el proyecto en local según lo que necesites:

### Opción A: Solo probar (solo Docker)

Para ver la plataforma funcionando sin instalar Node.js ni dependencias. Solo necesitas **Docker**.

```bash
git clone https://github.com/m-monterde/inspectrail.git
cd inspectrail

# 1. Levantar los 3 servicios (BD + API + Frontend)
docker compose -f docker-compose.demo.yml up -d

# 2. Esperar ~20 segundos a que la BD esté lista
docker ps   # inspectrail-db debe mostrar (healthy)

# 3. Crear las tablas y cargar datos de demo
docker compose -f docker-compose.demo.yml exec api npx prisma migrate deploy
docker compose -f docker-compose.demo.yml exec api npx tsx prisma/seed.ts
```

Abrir **http://localhost:8080** — Login: admin@inspectrail.demo / demo1234

```bash
# Para parar
docker compose -f docker-compose.demo.yml down

# Para borrar datos y empezar de cero
docker compose -f docker-compose.demo.yml down -v
```

### Opción B: Desarrollo (Node.js + Docker)

Para modificar código, con hot reload en API y frontend. Necesitas **Node.js 22** y **Docker**.

#### 1. Clonar

```bash
git clone https://github.com/m-monterde/inspectrail.git
cd inspectrail
```

#### 2. Base de datos (Docker)

```bash
docker compose -f devops/docker/docker-compose.yml up -d database

# Esperar a que esté healthy (~15 segundos)
docker ps
```

#### 3. API

```bash
cd services/api
npm install

# Crear .env
cat > .env << 'EOF'
DATABASE_URL="postgresql://inspectrail:inspectrail_dev@localhost:5432/inspectrail"
JWT_SECRET=dev_secret_change_in_production
ENVIRONMENT=development
EOF

# Migraciones, generar cliente y datos de demo
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts

# Arrancar con hot reload
npm run dev
```

API en http://localhost:3000

#### 4. Frontend

En otra terminal:

```bash
cd services/frontend
npm install
npm run dev
```

Frontend en http://localhost:8080 (con proxy automático a la API).

Login:
- **admin@inspectrail.demo** / demo1234 — todos los permisos
- **operador@inspectrail.demo** / demo1234 — solo lectura

## Datos de demo

El seed genera datos realistas de inspección ferroviaria:

| Dato | Cantidad |
|------|----------|
| Organizaciones | 1 (InspectRail Demo) |
| Usuarios | 2 (admin + operador) |
| Sistemas de inspección | 2 (S121 conectado, S245 desconectado) |
| Trayectos | 4 (rutas reales: Donostia-Bilbao, Vitoria-Pamplona) |
| Lecturas de sensores | 11.800 (10.000 en el trayecto principal) |
| Alertas | 31 (warning, alert, critical) |
| Umbrales | 6 métricas configuradas |

## Presentación técnica

Disponible en:
- **Local:** http://localhost:8080/slides/index.html
- **Producción:** https://inspectrail.duckdns.org/slides

Controles: flechas para navegar, F = pantalla completa, S = notas del presentador.

## Estado actual

| Componente | Estado | Tecnología |
|------------|--------|------------|
| Base de datos | Completado | PostgreSQL 16 + TimescaleDB + PostGIS |
| API Backend | Completado | Node.js + TypeScript + Apollo Server + Prisma |
| Frontend | Completado | React 19 + Vite + Tailwind + shadcn/ui + Apollo Client + ECharts + MapLibre GL |
| CI/CD | Completado | GitHub Actions + Docker + ghcr.io |
| Deploy | Completado | VPS Hetzner + Traefik + HTTPS (Let's Encrypt) |
| Ingesta | Diseñado | Python (asyncio + FastAPI) |
| Análisis | Diseñado | Python (NumPy, SciPy) |
| Observabilidad | Diseñado | Prometheus + Grafana + Loki |

## Decisiones arquitectónicas (12 ADRs)

| ADR | Decisión |
|-----|----------|
| ADR-001 | PostgreSQL + TimescaleDB con particionamiento tiempo + PK |
| ADR-002 | Servicio de análisis independiente (no integrado en la API) |
| ADR-003 | Python para ingesta y análisis (un solo lenguaje) |
| ADR-004 | Multitenencia, modelo de datos y nomenclatura en inglés |
| ADR-005 | API: Node.js + TypeScript + GraphQL (Apollo Server, Prisma) |
| ADR-006 | Comunicación análisis → API: PostgreSQL LISTEN/NOTIFY (sin Redis) |
| ADR-007 | ORM: Prisma + Prisma Migrate |
| ADR-008 | Frontend: React + Vite + MapLibre GL (WebGL) + ECharts + Tailwind |
| ADR-009 | DevOps: GitHub Actions + Docker Compose |
| ADR-010 | Demo: VPS Hetzner + DuckDNS |
| ADR-011 | Entornos: dev híbrido, tests con testcontainers, staging/prod |
| ADR-012 | Monorepo |

Detalle completo en `docs/decisiones_arquitectonicas.docx`.
