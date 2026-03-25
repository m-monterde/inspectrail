# Frontend — InspectRail Platform

## Tecnología
- **React 19** con **TypeScript**
- **Vite** (bundler — SPA, sin SSR)
- **MapLibre GL JS** via react-map-gl (mapas WebGL)
- **Apache ECharts** via echarts-for-react (gráficas Canvas/WebGL)
- **Tailwind CSS v4 + shadcn/ui** (UI y estilos)
- **Colores corporativos** de inspectrail.es: #0437f2 (azul), #cff348 (lima), #0a0202 (navy)
- **Lucide React** (iconos en sidebar y UI)
- **Apollo Client 4** (GraphQL queries y mutations)
- **Zustand** (estado global — auth store)
- **React Router v7** (routing)
- **Vitest** (13 tests)

## Decisiones clave
- Ver **ADR-008** en `docs/decisiones_arquitectonicas.docx`
- **WebGL imprescindible** para mapas y gráficas: los volúmenes de datos ferroviarios (cientos de miles de puntos por trayecto) hacen inutilizables las librerías basadas en SVG/DOM
- **SPA sin SSR**: dashboard interno con autenticación, no necesita SEO ni renderizado en servidor
- **MapLibre GL JS**: open-source, sin coste de licencia, compatible con tiles locales (Protomaps) para modo on-premise
- **Apache ECharts**: estándar en monitorización industrial, downsampling automático, zoom/pan nativo
- **Apollo Client**: ecosistema unificado con Apollo Server, subscriptions para alertas en tiempo real

## Estructura prevista
```
services/frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes shadcn/ui (botones, tablas, modals...)
│   │   ├── maps/            # Componentes de mapa (MapView, JourneyLayer, AlertLayer)
│   │   ├── charts/          # Componentes de gráficas (SensorChart, AlertTimeline)
│   │   └── layout/          # Layout general (Sidebar, Header, Content)
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Journeys.tsx
│   │   ├── JourneyDetail.tsx
│   │   ├── Alerts.tsx
│   │   ├── AlertDetail.tsx
│   │   ├── Systems.tsx
│   │   └── Thresholds.tsx
│   ├── hooks/               # Custom hooks (useAlerts, useJourneys, useMap...)
│   ├── graphql/
│   │   ├── queries/         # Queries GraphQL por dominio
│   │   ├── mutations/       # Mutations
│   │   ├── subscriptions/   # Subscriptions (alertas en vivo)
│   │   └── generated/       # Tipos generados por GraphQL codegen
│   ├── store/               # Zustand stores (filtros, preferencias UI)
│   ├── lib/
│   │   ├── apollo.ts        # Configuración Apollo Client
│   │   ├── map.ts           # Configuración MapLibre (estilos, tiles)
│   │   └── charts.ts        # Tema ECharts personalizado "inspectrail"
│   ├── types/               # Tipos TypeScript compartidos
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── tiles/               # Tiles PMTiles locales (modo on-premise)
├── index.html
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
├── package.json
├── Dockerfile
└── README.md
```

## Responsabilidades
- Dashboard de resumen con KPIs y alertas recientes
- Listado de alertas con filtros avanzados (severidad, métrica, trayecto, fecha)
- Vista detalle de alerta con datos de sensores y contexto geoespacial
- Visualización de trayectos y alertas sobre mapa (WebGL, segmentos coloreados)
- Gráficas de datos de sensores con zoom/pan y marcas de umbral
- Recepción de alertas en tiempo real vía GraphQL Subscriptions
- Gestión de umbrales, sistemas de inspección y usuarios (según rol)

## Vistas principales (8 páginas)

1. **Login** — autenticación JWT
2. **Dashboard** — KPIs (alertas activas por severidad, trayectos recientes, estado de dispositivos), alertas más recientes
3. **Journeys** — listado de sesiones de medición con estado, dispositivo, fecha, número de alertas
4. **JourneyDetail** — mapa del recorrido, gráficas de todas las métricas, listado de alertas del trayecto
5. **Alerts** — tabla filtrable/ordenable con paginación. Filtros por severidad, métrica, trayecto, rango de fechas
6. **AlertDetail** — mapa con el segmento afectado resaltado, gráfica del sensor en ese tramo con marcas de umbral, datos del trayecto
7. **Systems** — dispositivos registrados, estado de conexión, último contacto
8. **Thresholds** — umbrales por métrica (editable por admin_org)

## Rendimiento: downsampling por nivel de zoom

Un trayecto ferroviario puede tener decenas de miles de lecturas de sensores. Renderizar todas como segmentos GeoJSON coloreados a cualquier nivel de zoom sería ineficiente — a zoom bajo no hay suficientes píxeles para representar esa resolución.

**Solución implementada**: downsampling adaptativo en el frontend según el nivel de zoom del mapa.

| Zoom | Factor | Puntos renderizados (de 10.000) | Justificación |
|------|--------|--------------------------------|---------------|
| 7-9 | 1/20 | ~500 | Vista general: un pixel cubre cientos de metros |
| 10-11 | 1/8 | ~1.250 | Vista regional: empieza a distinguirse detalle |
| 12-13 | 1/3 | ~3.333 | Vista local: se necesita más resolución |
| 14+ | 1/1 | 10.000 | Vista de detalle: todos los puntos visibles |

**Cómo funciona:**
1. La **línea base** (trayecto completo) se renderiza siempre con todos los puntos como un solo `LineString` — es ligero porque MapLibre lo procesa como una sola geometría en GPU
2. Los **segmentos coloreados** (uno por cada par de puntos consecutivos) se renderizan con los puntos downsampled — esto es lo costoso porque cada segmento es una feature GeoJSON independiente
3. Al hacer zoom, el componente recalcula el factor y regenera solo los segmentos coloreados
4. Todas las métricas de sensores se precalculan en las propiedades de cada segmento — cambiar la métrica de coloración solo cambia una expression de MapLibre que se ejecuta en GPU, sin regenerar geometría

**Alternativas consideradas:**
- **Downsampling en el backend** (query con `time_bucket` de TimescaleDB): ya está implementado como parámetro `resolution` en la API. Es la solución correcta para volúmenes mayores (>100K puntos) donde no queremos transferir todos los datos al navegador
- **Clustering**: no aplicable porque los datos son lineales (una ruta), no puntos dispersos
- **Vector tiles dinámicos**: sobredimensionado para el volumen actual (<100K puntos)

**Resultado**: el trayecto demo de 10.000 lecturas se renderiza fluidamente a cualquier zoom, con el indicador `500 / 10.000 puntos (zoom 9)` visible en el mapa.

## Mapas base según modo de despliegue

| Modo | Fuente de tiles | Coste |
|------|----------------|-------|
| SaaS (internet) | OpenFreeMap (datos OpenStreetMap) | Gratuito, sin API key |
| On-premise (sin internet) | Protomaps (archivo PMTiles local) | Gratuito |

## Cómo ejecutar
```bash
docker compose up frontend
```
