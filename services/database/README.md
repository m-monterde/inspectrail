# Base de Datos — InspectRail Platform

## Tecnología
- **PostgreSQL 16** + **TimescaleDB** (extensión) + **PostGIS** (extensión)
- Particionamiento: basado en tiempo (hypertables)

## Decisiones clave
- Ver **ADR-001** (arquitectura de BD), **ADR-004** (modelo de datos y multitenencia)

## Estructura prevista
```
services/database/
├── migrations/          # Migraciones del esquema (secuenciales)
├── seeds/               # Datos de ejemplo para desarrollo/demo
├── scripts/             # Scripts de mantenimiento (compresión, aggregates)
├── Dockerfile           # Imagen PG + TimescaleDB + PostGIS
├── init.sql             # Inicialización de extensiones
└── README.md
```

## Modelo de datos

### Tenencia y autenticación

| Tabla | Descripción |
|-------|-------------|
| `organizations` | Organizaciones cliente. `deployment_mode`: saas / on_premise |
| `users` | Usuarios de la plataforma (email, phone, password_hash) |
| `roles` | Roles del sistema: admin_org, manager, operator, viewer |
| `permissions` | Permisos granulares (ej: `journeys.view`, `alerts.view`, `thresholds.edit`) |
| `role_permissions` | N:M rol ↔ permiso |
| `user_roles` | Asignación de rol a usuario con alcance opcional (`scope_type`/`scope_id` para futuras agrupaciones) |

### Dispositivos y trayectos

| Tabla | Descripción |
|-------|-------------|
| `inspection_systems` | Trenes/dispositivos con sensores. Autenticación por `api_key`/`api_secret_hash`. Registra `connection_status` y `last_seen_at` |
| `journeys` | Sesiones de medición dinámicas. `started_at`/`ended_at`, `status` (in_progress/completed/failed), `geometry` (PostGIS LineString construido desde las lecturas) |

### Umbrales y alertas

| Tabla | Descripción |
|-------|-------------|
| `thresholds` | Por organización + métrica. Tres niveles de severidad: `warning_min/max`, `alert_min/max`, `critical_min/max` |
| `alerts` | Anomalías detectadas como segmentos: `pk_start`–`pk_end`, `coords_start`–`coords_end`, `measured_value`, `threshold_value`, `deviation`, `severity` |

### Hypertables (TimescaleDB)

| Tabla | Descripción |
|-------|-------------|
| `sensor_readings` | Lecturas de alta densidad. Columnas: `time`, `journey_id`, `pk`, `latitude`, `longitude`, `speed`, `accel_vertical`, `accel_lateral`, `accel_longitudinal`, `leveling`, `alignment`, `twist`, `gauge` |
| `agg_readings_summary` | Continuous aggregate: avg/max/min por métrica, reading_count, alert_count por severidad |

### Enums

| Enum | Valores |
|------|---------|
| `deployment_mode` | saas, on_premise |
| `connection_status` | connected, disconnected, error |
| `journey_status` | in_progress, completed, failed |
| `metric_type` | accel_vertical, accel_lateral, accel_longitudinal, leveling, alignment, twist, gauge, speed |
| `severity` | warning, alert, critical |

### Futuro (diseñado, sin implementar)

| Tabla | Descripción |
|-------|-------------|
| `groups` | Agrupación de trayectos/sistemas dentro de una org (campañas, zonas) |
| `group_journeys` | N:M grupo ↔ trayecto |
| `group_systems` | N:M grupo ↔ sistema |
| `alert_subscriptions` | Preferencias de notificación de usuario (canal, severidad mínima, alcance) |

## Cómo ejecutar
```bash
docker compose up database
```
