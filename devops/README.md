# DevOps — InspectRail Platform

## Tecnología
- **Docker + Docker Compose** (contenedores y orquestación)
- **GitHub Actions** (CI/CD)
- **GitHub Container Registry — ghcr.io** (registry de imágenes)
- **Traefik** (proxy inverso modo SaaS) / **Nginx** (modo on-premise)
- **Prometheus + Grafana + Loki** (observabilidad)

## Decisiones clave
- Ver **ADR-009** (DevOps stack), **ADR-010** (demo), **ADR-011** (entornos)
- GitHub Actions sobre Drone CI: cero infraestructura de CI, estándar de la industria, integrado en el repo
- Docker Compose sobre Komodo/Kubernetes: suficiente para 5 servicios, perfecto para on-premise
- Proxy dual: Traefik (HTTPS auto, service discovery) para SaaS, Nginx (sin internet) para on-premise

## Estructura prevista
```
devops/
├── docker/
│   ├── docker-compose.yml           # Todos los servicios (desarrollo)
│   ├── docker-compose.prod.yml      # Override producción SaaS
│   ├── docker-compose.onprem.yml    # Override on-premise (caja negra)
│   └── .env.example                 # Variables de entorno
├── ci/
│   └── .github/
│       └── workflows/
│           ├── ci.yml               # Lint + Test (en cada push/PR)
│           ├── build.yml            # Build + Push imágenes (merge a main)
│           ├── deploy-staging.yml   # Deploy automático a staging
│           └── deploy-prod.yml      # Deploy manual a producción
├── proxy/
│   ├── traefik/                     # Config Traefik (SaaS)
│   │   ├── traefik.yml
│   │   └── dynamic/
│   └── nginx/                       # Config Nginx (on-premise)
│       └── nginx.conf
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml           # Targets: API, ingesta, análisis, BD
│   ├── grafana/
│   │   ├── provisioning/            # Datasources y dashboards auto-provisioned
│   │   └── dashboards/              # Dashboards JSON preconstruidos
│   └── loki/
│       └── loki-config.yml
├── scripts/
│   ├── deploy.sh                    # Script de despliegue (SSH + docker compose)
│   ├── seed.sh                      # Carga de datos de demo
│   ├── backup.sh                    # Backup de BD
│   └── package-onprem.sh            # Empaqueta imágenes para on-premise (docker save)
└── README.md
```

## Servicios Docker

| Servicio | Imagen | Puerto | Descripción |
|----------|--------|--------|-------------|
| `database` | timescale/timescaledb-ha:pg16 | 5432 | PostgreSQL + TimescaleDB + PostGIS |
| `ingesta` | ghcr.io/inspectrail/ingesta | 8001 | Servicio de ingesta (Python) |
| `analisis` | ghcr.io/inspectrail/analisis | 8002 | Servicio de análisis (Python) |
| `api` | ghcr.io/inspectrail/api | 3000 | API GraphQL (Node.js) |
| `frontend` | ghcr.io/inspectrail/frontend | 8080 | App web (archivos estáticos + Nginx) |
| `traefik` | traefik:v3 | 80/443 | Proxy inverso (solo SaaS) |
| `prometheus` | prom/prometheus | 9090 | Métricas |
| `grafana` | grafana/grafana | 3001 | Dashboards y alertas |
| `loki` | grafana/loki | 3100 | Logs centralizados |

## Pipelines CI/CD

### CI — En cada push y PR
```
Lint  →  Test  →  Type check
 │         │          │
 ├ ESLint  ├ Jest     ├ tsc (TypeScript)
 ├ Ruff    ├ Pytest   └ mypy (Python)
 └ SQL     └ Vitest
```

### Build + Deploy — En merge a main
```
Build Docker  →  Push ghcr.io  →  Deploy staging (auto)
                                         │
                                   Deploy prod (manual + aprobación)
```

### Flujo de despliegue
```bash
# Staging (automático)
ssh staging "cd /app && docker compose pull && docker compose up -d"

# Producción (requiere aprobación en GitHub)
ssh prod "cd /app && docker compose pull && docker compose up -d"

# Rollback inmediato
ssh prod "cd /app && docker compose up -d --no-deps api"  # con imagen anterior
```

## Modos de despliegue

### SaaS (internet)
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
- VPS (Hetzner/DigitalOcean, ~20€/mes)
- Traefik como proxy con HTTPS automático (Let's Encrypt)
- Imágenes desde ghcr.io
- GitHub Actions despliega vía SSH

### On-premise (caja negra en tren)
```bash
docker compose -f docker-compose.yml -f docker-compose.onprem.yml up -d
```
- Hardware embarcado con Docker preinstalado
- Nginx como proxy (sin internet)
- Tiles de mapa locales (PMTiles)
- Actualización: `docker load < inspectrail-images.tar` cuando hay conexión o vía USB

## Observabilidad

| Qué monitorizamos | Herramienta | Ejemplo |
|--------------------|-------------|---------|
| Salud de servicios | Prometheus + Grafana | ¿La API responde? ¿Ingesta procesa datos? |
| Uso de recursos | Prometheus + Grafana | CPU, memoria, disco por servicio |
| Rendimiento de BD | pg_stat_statements + Grafana | Queries lentas, conexiones activas |
| Logs de todos los servicios | Loki + Grafana | Buscar errores, trazar flujos |
| Alertas de infra | Grafana Alerting | Notifica si un servicio se cae o disco > 90% |

## Entornos (ADR-011)

| Entorno | Dónde | BD | Servicios | Deploy |
|---------|-------|-----|-----------|--------|
| **local (dev)** | Máquina del desarrollador | Docker | Nativos con hot reload | Manual |
| **test** | GitHub Actions runner | Testcontainers (desechable) | En CI | Automático en push/PR |
| **staging** | VPS (puerto 8080) | Docker (BD staging) | Docker Compose | Auto en merge a main |
| **production** | VPS (puertos 80/443) | Docker (BD producción) | Docker Compose | Manual con aprobación |

### Desarrollo local (híbrido)
```bash
# 1. Levantar BD en Docker
docker compose -f devops/docker/docker-compose.yml up database

# 2. Aplicar migraciones
cd services/api && npx prisma migrate dev

# 3. Cargar datos de demo
cd services/database && ./seed.sh

# 4. Trabajar en el servicio que toque (hot reload nativo)
cd services/api && npm run dev                                    # API
cd services/frontend && npm run dev                               # Frontend (Vite HMR)
cd services/ingesta && python -m uvicorn src.main:app --reload    # Ingesta
cd services/analisis && python src/main.py                        # Análisis
```

### Tests
```bash
# Unit tests (rápidos, sin BD)
cd services/api && npm test
cd services/ingesta && pytest tests/unit
cd services/analisis && pytest tests/unit
cd services/frontend && npm run test

# Integration tests (con BD real via testcontainers)
cd services/api && npm run test:integration
cd services/ingesta && pytest tests/integration
cd services/analisis && pytest tests/integration
```

### Configuración por entorno
```
devops/docker/
├── .env.example          ← Referencia. VA al repo.
├── .env                  ← Local. NO va al repo (.gitignore).
└── (en VPS)
    ├── .env.staging      ← NO va al repo.
    └── .env.production   ← NO va al repo.
```

**Regla: los .env con secretos NUNCA van al repositorio.**
