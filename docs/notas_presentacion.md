# InspectRail — Notas para la presentación

Guion por slide. Las slides están en `/slides/index.html`.

---

## Slide 1 — Portada

Presentarte. "Voy a presentar InspectRail, una plataforma de monitorización de infraestructura ferroviaria que he diseñado y desarrollado como reto técnico."

---

## Slide 2 — El problema

"InspectRail opera trenes que recorren vías con sensores. Capturan datos con resolución centimétrica — cada 10cm se toma una lectura de 7 métricas simultáneas. Un trayecto de 50km genera medio millón de puntos."

Las métricas:
- **Nivelación**: diferencia de altura entre los dos raíles (mm)
- **Alineación**: desviación lateral del raíl respecto a su posición teórica (mm)
- **Alabeo (twist)**: variación de nivelación entre dos puntos consecutivos — la más crítica para descarrilamientos (mm)
- **Ancho de vía (gauge)**: distancia entre raíles, estándar 1.435mm
- **Aceleración vertical/lateral**: vibración del tren (m/s²)
- **Velocidad**: del vehículo de inspección

---

## Slide 3 — Índice de ADRs

"He documentado cada decisión técnica como un ADR — Architecture Decision Record. Son 12 decisiones, cada una con las opciones evaluadas y la justificación. Voy a recorrerlas en orden."

ADR = documento corto: contexto del problema → opciones evaluadas → decisión tomada → justificación → consecuencias.

---

## Slide 4 — ADR-001: Base de datos

"La primera decisión fue cómo almacenar datos. Tenemos dos necesidades diferentes: datos relacionales (usuarios, roles, umbrales) y datos de sensores (millones de lecturas time-series con coordenadas GPS)."

"Las opciones eran PostgreSQL solo (sin optimización para time-series), TimescaleDB (extensión de PG), o un motor separado como InfluxDB."

"InfluxDB es bueno para time-series pero no tiene datos relacionales — necesitaríamos dos bases de datos, sin poder hacer JOINs entre sensores y dominio."

"TimescaleDB es PostgreSQL con superpoderes: hypertables que particionan automáticamente por tiempo, compresión del 95%, y continuous aggregates. Todo con el mismo driver, un solo contenedor Docker."

---

## Slide 5 — ADR-004: Modelo de datos

"El modelo implementa multitenencia — una sola instancia sirve a múltiples organizaciones con datos aislados. Un usuario de una organización nunca ve datos de otra."

"RBAC con 5 tablas y 10 permisos granulares. Crear un nuevo rol es configuración en BD, sin tocar código."

"Los trayectos son dinámicos — no son rutas predefinidas. Cada vez que un tren sale, crea un journey y la ruta emerge de las lecturas GPS."

"Las alertas son segmentos (pk_start a pk_end), no puntos, porque una anomalía tiene extensión a lo largo de la vía."

Si preguntan por detalle: abrir /slides/schema.html con el esquema completo.

---

## Slide 6 — ADR-002: Análisis independiente

"¿Dónde evaluar umbrales? Si meto el análisis dentro de la API, mezclo responsabilidades. Si la API se cae, el análisis se cae. Si quiero escalar el análisis (más CPU), escalo también la API innecesariamente."

"Con un servicio independiente, cada uno escala por separado. Y lo más importante: el análisis puede evolucionar hacia ML (modelos predictivos) sin tocar la API ni el frontend."

---

## Slide 7 — ADR-003: Python

"Una vez decidido que son servicios independientes, ¿un lenguaje o dos? Go para ingesta (máximo I/O) y Python para análisis, o Python para ambos."

"Python con asyncio ofrece rendimiento suficiente para el volumen ferroviario. Usar un solo lenguaje reduce la toolchain, los perfiles del equipo, y permite compartir código entre servicios."

"Si en el futuro la ingesta necesita más rendimiento, solo se migra ese servicio a Go — reversible y acotado."

---

## Slide 8 — ADR-005: GraphQL vs REST

"GraphQL no es mejor que REST en general — depende del caso. Aquí el frontend tiene vistas muy diferentes: un dashboard con KPIs, un listado con filtros variables, un detalle de trayecto con datos anidados, un mapa..."

"Con REST necesitaría múltiples endpoints o endpoints que devuelven campos que la vista no usa (over-fetching). Con GraphQL el frontend pide exactamente lo que necesita."

"Además, GraphQL Subscriptions permiten alertas en tiempo real por el mismo canal. Y es lo que usa InspectRail actualmente."

---

## Slide 9 — ADR-005 + ADR-007: Arquitectura API

"Dentro de la API, tres opciones: NestJS (framework completo con decoradores, módulos, DTOs), resolvers que llaman a Prisma directamente, o una capa de servicios."

"NestJS es over-engineering — mucha ceremony sin beneficio real para este alcance. Resolvers→Prisma directo mezcla lógica con resolución."

"El punto medio: los archivos .graphql definen el contrato (como DTOs), los resolvers delegan a services, y los services contienen la lógica de negocio."

"Prisma como ORM: type-safety de la BD al código TypeScript. Elegido sobre TypeORM (configuración compleja con decoradores), Drizzle (inmaduro en 2026), y Knex (query builder sin type-safety)."

---

## Slide 10 — ADR-006: LISTEN/NOTIFY

"Para alertas en tiempo real, la solución obvia sería Redis Pub/Sub o RabbitMQ. Pero ambos añaden infraestructura que hay que mantener."

"PostgreSQL tiene LISTEN/NOTIFY integrado — latencia de milisegundos, cero infra extra. El análisis inserta la alerta y hace pg_notify en la misma transacción. La API escucha y emite la alerta como GraphQL Subscription."

"Si nadie escucha, el mensaje se pierde — pero la alerta queda en la BD. LISTEN/NOTIFY es solo para la notificación en vivo."

---

## Slide 11 — ADR-008: Por qué WebGL

"Esta es una de las decisiones más importantes del frontend. Con SVG/DOM, cada punto es un elemento HTML — con 10.000 ya va lento, con 100.000 se congela."

"Con WebGL, todos los puntos se envían a la GPU y se renderizan en paralelo. Es la misma tecnología de los videojuegos. Un millón de puntos a 60fps."

"Para monitorización ferroviaria, WebGL no es una optimización — es un requisito. Sin WebGL la app sería inutilizable con datos reales."

---

## Slide 12 — ADR-008: Leaflet vs MapLibre

"Leaflet es SVG — no sirve para datos densos. MapLibre GL JS es WebGL, open-source (BSD), gratuito, y soporta PMTiles — archivos de tiles locales para el modo on-premise (sin internet en el tren)."

"Mapbox GL v2 tiene el mismo rendimiento pero es de pago y propietaria desde v2."

---

## Slide 13 — ADR-008: Gráficas

"Mismo principio. Recharts usa SVG — 10K puntos máximo. Chart.js usa Canvas pero sin downsampling ni zoom nativo."

"Apache ECharts: Canvas con opción WebGL, downsampling automático (si hay 100K puntos y 800px de ancho, solo pinta 800 puntos representativos), zoom y pan nativos con la rueda del ratón, y markLine para pintar líneas de umbral."

---

## Slide 14 — ADR-008: Rendimiento frontend

"Dos técnicas implementadas."

"Downsampling por zoom: a zoom bajo muestro 500 de 10.000 puntos porque no hay píxeles para más. Al hacer zoom voy mostrando más. Se hace en el frontend sin llamar al backend."

"Coloración por métrica: todos los valores están precalculados en el GeoJSON. Cambiar de nivelación a alineación solo cambia una expression de MapLibre que se ejecuta en la GPU — instantáneo, sin regenerar geometría."

"Para volúmenes aún mayores: la API tiene un parámetro 'resolution' que delega el downsampling a TimescaleDB (time_bucket)."

---

## Slide 15 — ADR-009: DevOps

"GitHub Actions porque es zero-infra. Se evaluó Drone CI (self-hosted) pero añade complejidad."

"Docker Compose porque para 5 servicios es perfecto. Kubernetes sería overkill y complica el on-premise."

"Flujo: push a main → CI. Push tag v0.1.0 → build imágenes → push a ghcr.io → deploy al VPS."

"Monorepo (ADR-012) porque un equipo pequeño no necesita la complejidad de múltiples repos."

---

## Slide 16 — ADR-010 + ADR-011: Deploy

"Traefik como proxy inverso: descubre servicios automáticamente leyendo labels de Docker. HTTPS con Let's Encrypt integrado. Nginx es mejor para on-premise (sin internet, config estática)."

"VPS Hetzner + DuckDNS (dominio gratuito) + Let's Encrypt (HTTPS gratuito). Cuatro contenedores."

---

## Slide 17 — Seguridad

"JWT stateless — no se almacena estado de sesión. RBAC con 10 permisos granulares. Multitenencia: filtrado automático por organizationId. HTTPS con Let's Encrypt. Secrets fuera del repo."

---

## Slide 18 — Evolución

"Cuatro ejes: datos (compresión, aggregates, downsampling), ML (Python preparado, de umbrales a modelos), on-premise (Docker save, tiles locales), observabilidad (Prometheus+Grafana a un docker-compose de distancia)."

---

## Slide 19 — Demo

Abrir https://inspectrail.duckdns.org. Login con admin@inspectrail.demo / demo1234.

1. Dashboard — KPIs, gráficas por severidad y métrica
2. Trayectos — entrar en Donostia→Bilbao (10.000 puntos)
3. Mapa — cambiar "Colorear por" entre métricas (instantáneo)
4. Hacer zoom — mostrar el contador de puntos cambiando
5. Gráficas — zoom con slider, líneas de umbral
6. Alertas — filtrar por severidad
7. Umbrales — tabla de configuración

---

## Slide 20 — Cierre

"El código está en GitHub, la demo está online, y hay 12 ADRs con todas las alternativas evaluadas. ¿Preguntas?"
