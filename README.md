# InspectRail Platform

Plataforma centralizada de monitorización de infraestructura ferroviaria.

**Demo live:** https://inspectrail.duckdns.org
**Credenciales:** admin@inspectrail.demo / demo1234

## Estructura del proyecto

```
proyecto/
├── docs/
│   ├── decisiones_arquitectonicas.docx   # 12 ADRs documentadas
│   ├── documentacion_proyecto.docx       # Documentación técnica completa
│   └── notas_presentacion.md             # Guion de la presentación
├── services/
│   ├── database/                  # Base de datos (PostgreSQL + TimescaleDB + PostGIS)
│   ├── api/                       # API Backend (Node.js + TypeScript + GraphQL)
│   ├── frontend/                  # Aplicación web (React + Vite + MapLibre + ECharts)
│   ├── ingesta/                   # Servicio de ingesta (Python) — diseñado, no implementado
│   └── analisis/                  # Servicio de análisis (Python) — diseñado, no implementado
├── devops/
│   ├── docker/                    # Docker Compose (dev + prod)
│   └── scripts/                   # Scripts de deploy y setup
└── .github/workflows/             # CI/CD (GitHub Actions)
```

## Demo rápida (solo Docker)

Si solo quieres probar la plataforma sin instalar Node.js:

```bash
git clone https://github.com/m-monterde/inspectrail.git
cd inspectrail

# Levantar todo
docker compose -f docker-compose.demo.yml up -d

# Esperar ~20s a que la BD esté healthy, luego:
docker compose -f docker-compose.demo.yml exec api npx prisma migrate deploy
docker compose -f docker-compose.demo.yml exec api npx tsx prisma/seed.ts
```

Abrir http://localhost:8080 — Login: **admin@inspectrail.demo** / **demo1234**

Para parar: `docker compose -f docker-compose.demo.yml down`

---

## Desarrollo local

### Requisitos

- **Node.js 22** (recomendado via nvm)
- **Docker** (para TimescaleDB)

### Levantar en local

### 1. Clonar y entrar

```bash
git clone https://github.com/m-monterde/inspectrail.git
cd inspectrail
```

### 2. Levantar la base de datos

```bash
docker compose -f devops/docker/docker-compose.yml up -d database
```

Esperar a que esté healthy (~15 segundos):
```bash
docker ps  # debe mostrar (healthy) en inspectrail-db
```

### 3. Configurar la API

```bash
cd services/api
npm install

# Crear .env
cat > .env << 'EOF'
DATABASE_URL="postgresql://inspectrail:inspectrail_dev@localhost:5432/inspectrail"
JWT_SECRET=dev_secret_change_in_production
ENVIRONMENT=development
EOF

# Ejecutar migraciones y seed
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/seed.ts
```

El seed crea:
- 1 organización, 2 usuarios, 2 sistemas de inspección
- 4 trayectos con rutas reales vascas (Donostia-Bilbao, Vitoria-Pamplona)
- 11.800 lecturas de sensores (10.000 en el trayecto principal)
- 31 alertas generadas por análisis de umbrales

### 4. Arrancar la API

```bash
npm run dev
```

La API estará en http://localhost:3000. Puedes probarla:
```bash
curl -s -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { login(email: \"admin@inspectrail.demo\", password: \"demo1234\") { token } }"}'
```

### 5. Arrancar el frontend

En otra terminal:
```bash
cd services/frontend
npm install
npm run dev
```

Abrir http://localhost:8080 en el navegador. Login con:
- **admin@inspectrail.demo** / demo1234 (todos los permisos)
- **operador@inspectrail.demo** / demo1234 (solo lectura)

## Presentación técnica

Disponible en http://localhost:8080/slides/index.html (local) o https://inspectrail.duckdns.org/slides (producción).

Navegar con flechas. F = pantalla completa. S = notas del presentador.

## Estado actual

| Componente | Estado | Tecnología |
|------------|--------|------------|
| Base de datos | Completado | PostgreSQL 16 + TimescaleDB + PostGIS |
| API Backend | Completado | Node.js + TypeScript + Apollo Server + Prisma |
| Frontend | Completado | React 19 + Vite + Tailwind + ECharts + MapLibre GL |
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
