# Frontend — InspectRail Platform

## Tecnología
- **React 18+** con **TypeScript**
- **Vite** (bundler — SPA, sin SSR)
- **MapLibre GL JS** via react-map-gl (mapas WebGL)
- **Apache ECharts** via echarts-for-react (gráficas Canvas/WebGL)
- **Tailwind CSS + shadcn/ui** (UI y estilos)
- **Apollo Client** (GraphQL queries, mutations y subscriptions)
- **Zustand** (estado global UI)
- **React Hook Form + zod** (formularios y validación)
- **React Router v7** (routing)

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
│   │   ├── Dashboard.tsx
│   │   ├── Alerts.tsx
│   │   ├── AlertDetail.tsx
│   │   ├── Journeys.tsx
│   │   ├── JourneyDetail.tsx
│   │   ├── MapView.tsx
│   │   ├── Systems.tsx
│   │   ├── Settings.tsx
│   │   └── Login.tsx
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

## Vistas principales

1. **Dashboard** — KPIs (alertas activas por severidad, trayectos recientes, estado de dispositivos), gráfica de tendencias, alertas más recientes
2. **Alertas** — tabla filtrable/ordenable con paginación. Filtros por severidad, métrica, trayecto, rango de fechas
3. **Detalle de alerta** — mapa con el segmento afectado resaltado, gráfica del sensor en ese tramo con marcas de umbral, datos del trayecto
4. **Mapa** — vista geoespacial completa. Trayectos como líneas, alertas como segmentos coloreados por severidad (verde=normal, amarillo=warning, naranja=alert, rojo=critical)
5. **Trayectos** — listado de sesiones de medición con estado, dispositivo, fecha, número de alertas
6. **Detalle de trayecto** — mapa del recorrido, gráficas de todas las métricas, listado de alertas del trayecto
7. **Sistemas** — dispositivos registrados, estado de conexión, último contacto
8. **Configuración** — umbrales por métrica, gestión de usuarios (admin_org)
9. **Login** — autenticación JWT

## Mapas base según modo de despliegue

| Modo | Fuente de tiles | Coste |
|------|----------------|-------|
| SaaS (internet) | MapTiler (datos OpenStreetMap) | Gratis hasta 100K cargas/mes |
| On-premise (sin internet) | Protomaps (archivo PMTiles local) | Gratuito |

## Cómo ejecutar
```bash
docker compose up frontend
```
