# InspectRail Platform — Contexto del proyecto

## Qué es
Plataforma centralizada de monitorización de infraestructura ferroviaria para InspectRail (Donostia).
Es un reto técnico para un proceso de selección de Ingeniero Full Stack. El objetivo es diseñar la arquitectura completa y desarrollar un prototipo funcional (demo).

## Estado actual
- **Fase de diseño**: COMPLETADA. 12 ADRs documentadas en `docs/decisiones_arquitectonicas.docx`
- **Fase de desarrollo**: EN CURSO. Base de datos completada, API pendiente
- **Repositorio**: github.com/m-monterde/inspectrail (privado, cuenta m-monterde)
- **VPS**: Hetzner 204.168.173.222, usuario `deploy`, acceso SSH por clave

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
- Seed con datos realistas: 1 org, 2 usuarios, 2 sistemas, 4 trayectos, 500 lecturas, 8 alertas
- Credenciales demo: admin@inspectrail.demo / demo1234, operador@inspectrail.demo / demo1234
- Prisma 6 (no 7, que cambió el modelo de configuración)

## Infraestructura configurada
- VPS Hetzner: Docker instalado, usuario deploy, firewall (22/80/443/8080), dir /opt/inspectrail
- GitHub: repo creado, secrets configurados (VPS_HOST, VPS_USER, VPS_SSH_KEY)
- GitHub Actions: ci.yml, build-and-push.yml, deploy.yml listos
- Node.js 22 necesario (nvm use 22)

## Siguiente paso
Desarrollar la API GraphQL (Apollo Server + Prisma). Después frontend, después ingesta/análisis simplificados.

## Convenciones del usuario
- Documentación siempre en castellano
- Nombres de tablas, campos y enums en inglés
- Ante cada decisión técnica, presentar opciones con pros/contras y dejar que el usuario elija
- No desarrollar sin aprobación del usuario en decisiones de estructura/librerías
- Justificar cada decisión en el docx de ADRs
