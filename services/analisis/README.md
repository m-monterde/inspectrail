# Servicio de Análisis — InspectRail Platform

> **Estado: Diseñado, no implementado.** Este servicio forma parte de la arquitectura completa pero no se ha desarrollado en el prototipo actual.

## Tecnología
- **Python** (NumPy, SciPy, Pandas)
- Evaluación de umbrales con operaciones vectorizadas
- Salida: alertas a BD + WebSocket al frontend

## Decisiones clave
- Ver **ADR-002** (servicio de análisis independiente) y **ADR-003** (Python para ambos servicios)

## Estructura prevista
```
services/analisis/
├── src/
│   ├── main.py              # Entry point / worker principal
│   ├── evaluators/
│   │   ├── thresholds.py    # Evaluación de umbrales (actual)
│   │   ├── trends.py        # Detección de tendencias entre trayectos (futuro)
│   │   └── correlation.py   # Correlación entre métricas (futuro)
│   ├── alerting/
│   │   ├── generator.py     # Crear y persistir alertas
│   │   └── notifier.py      # Emitir alertas por WebSocket
│   ├── config.py
│   └── models.py
├── tests/
├── requirements.txt
├── Dockerfile
└── README.md
```

## Responsabilidades
- Recibir notificaciones de bloques de datos listos (desde ingesta)
- Cargar lecturas del bloque desde `sensor_readings`
- Cargar `thresholds` aplicables a la organización
- Evaluar valores contra umbrales (operaciones vectorizadas con NumPy)
- Identificar segmentos anómalos contiguos (`pk_start`–`pk_end`)
- Persistir alertas en la tabla `alerts` con severidad, valor medido y desviación
- Emitir alertas en tiempo real por WebSocket al frontend

## Flujo de análisis
```
Notificación de ingesta (bloque listo)
        │
        ▼
   [Cargar lecturas del bloque]
        │
        ▼
   [Cargar umbrales de la organización]
        │
        ▼
   [Evaluación vectorizada — NumPy]
   np.abs(values) > threshold
        │
        ▼
   [Agrupar segmentos anómalos contiguos]
   (pk_start, pk_end, severity, peak_value)
        │
        ├──► INSERT alerts → BD
        └──► WebSocket → Frontend (alerta en vivo)
```

## Cómo ejecutar
```bash
docker compose up analisis
```
