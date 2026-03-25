# Servicio de Ingesta — InspectRail Platform

> **Estado: Diseñado, no implementado.** Este servicio forma parte de la arquitectura completa pero no se ha desarrollado en el prototipo actual.

## Tecnología
- **Python** (asyncio + uvicorn/FastAPI)
- Driver BD: asyncpg (driver async nativo para PostgreSQL)
- Comunicación con análisis: notificación batch por bloque

## Decisiones clave
- Ver **ADR-002** (servicio de análisis independiente) y **ADR-003** (Python para ambos servicios)

## Estructura prevista
```
services/ingesta/
├── src/
│   ├── main.py              # Entry point (uvicorn)
│   ├── receivers/           # Endpoints de recepción de datos
│   ├── writers/             # Escritura batch a TimescaleDB (sensor_readings)
│   ├── notifiers/           # Notificación al servicio de análisis
│   ├── auth/                # Autenticación de dispositivos (api_key/api_secret)
│   ├── config.py            # Configuración por entorno
│   └── models.py            # Modelos de datos compartidos
├── tests/
├── requirements.txt
├── Dockerfile
└── README.md
```

## Responsabilidades
- Autenticar dispositivos mediante `api_key`/`api_secret`
- Crear/actualizar trayectos (`journeys`): status in_progress → completed/failed
- Validar formato y completitud de las lecturas entrantes
- Escritura batch en la hypertable `sensor_readings`
- Actualizar `inspection_systems.last_seen_at` y `connection_status`
- Notificar al servicio de análisis cuando un nuevo bloque de datos está listo
- Construir la geometría del trayecto (PostGIS LineString) desde las lecturas

## Flujo de datos
```
Sistema de inspección (tren)
        │
        │  POST /ingest/auth  (api_key + api_secret)
        │  POST /ingest/journey/start
        │  POST /ingest/readings  (bloque de N lecturas)
        │  POST /ingest/journey/end
        │
        ▼
   [Autenticación] → inspection_systems
        │
        ▼
   [Validación]
        │
        ├──► Batch INSERT → sensor_readings (hypertable)
        ├──► UPDATE journey geometry + status
        └──► Notificación → Servicio de análisis (bloque listo)
```

## Cómo ejecutar
```bash
docker compose up ingesta
```
