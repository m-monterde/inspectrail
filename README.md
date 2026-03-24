# InspectRail Platform

Plataforma centralizada de monitorización de infraestructura ferroviaria.

## Estructura del proyecto

```
proyecto/
├── docs/                          # Documentación
│   ├── decisiones_arquitectonicas.docx   # Registro de decisiones (ADR)
│   └── documentacion_proyecto.docx       # Documentación técnica del proyecto
├── services/
│   ├── database/                  # Base de datos (PostgreSQL + TimescaleDB + PostGIS)
│   ├── ingesta/                   # Servicio de ingesta de datos de sensores (Python)
│   ├── analisis/                  # Servicio de análisis y alertas (Python)
│   ├── api/                       # API Backend (Node.js + TypeScript + GraphQL)
│   └── frontend/                  # Aplicación web (React + Vite + MapLibre + ECharts)
├── devops/                        # CI/CD, Docker, monitorización
└── retotecnico.pdf                # Enunciado del reto
```

## Estado actual

| Componente | Estado |
|------------|--------|
| Base de datos | Modelo de datos definido (ADR-001, ADR-004) |
| Ingesta | Tecnología definida: Python (ADR-002, ADR-003) |
| Análisis | Tecnología definida: Python (ADR-002, ADR-003) |
| API Backend | Node.js + TypeScript + GraphQL (ADR-005) |
| Frontend | React + Vite + MapLibre + ECharts (ADR-008) |
| DevOps | GitHub Actions + Docker Compose + Prometheus/Grafana (ADR-009) |

## Decisiones arquitectónicas

| ADR | Decisión |
|-----|----------|
| ADR-001 | PostgreSQL + TimescaleDB con particionamiento tiempo + PK |
| ADR-002 | Servicio de análisis independiente (no integrado en la API) |
| ADR-003 | Python para ingesta y análisis (un solo lenguaje, cohesión de equipo) |
| ADR-004 | Multitenencia, modelo de datos definitivo y nomenclatura en inglés |
| ADR-005 | API Backend: Node.js + TypeScript + GraphQL (Apollo Server, Prisma) |
| ADR-006 | Comunicación análisis → API: PostgreSQL LISTEN/NOTIFY (sin Redis) |
| ADR-007 | ORM y versionado de BD: Prisma + Prisma Migrate |
| ADR-008 | Frontend: React + Vite + MapLibre GL (WebGL) + ECharts + Tailwind/shadcn |
| ADR-009 | DevOps: GitHub Actions + Docker Compose + Prometheus/Grafana/Loki |
| ADR-010 | Demo: VPS Hetzner (principal) + GitHub Codespaces (backup) |
| ADR-011 | Entornos: dev híbrido, tests con testcontainers, staging en mismo VPS |

## Cómo ejecutar

```bash
# Levantar todos los servicios
docker compose -f devops/docker/docker-compose.yml up

# Solo base de datos
docker compose -f devops/docker/docker-compose.yml up database
```
