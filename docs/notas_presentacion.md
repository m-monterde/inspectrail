# InspectRail — Notas para la presentación

Estas notas acompañan a cada slide de la presentación en `/slides`.
Usa las slides como apoyo visual y estas notas como guion de lo que explicar.

---

## Slide 1 — Portada

Presentarte brevemente. "Voy a presentar InspectRail, una plataforma de monitorización de infraestructura ferroviaria que he diseñado y desarrollado como reto técnico."

---

## Slide 2 — El problema

"InspectRail opera trenes que recorren vías con sensores. Estos sensores capturan datos con resolución centimétrica — cada 10cm se toma una lectura de 7 métricas simultáneas. Un trayecto de 50km genera medio millón de puntos."

"Las métricas que se capturan son: **nivelación** (diferencia de altura entre raíles), **alineación** (desviación lateral del raíl), **alabeo** o twist (variación de nivelación entre puntos — la más crítica para descarrilamientos), **ancho de vía** (distancia entre raíles, estándar 1.435mm), **aceleraciones** vertical y lateral (vibración del tren), y **velocidad**."

"El reto técnico es almacenar estos volúmenes, analizarlos para detectar anomalías, y visualizarlos de forma que un ingeniero de mantenimiento pueda tomar decisiones."

---

## Slide 3 — Alcance del prototipo

"He priorizado demostrar la viabilidad técnica end-to-end: desde la base de datos hasta la visualización en web con datos reales. La demo tiene 11.800 lecturas de sensores distribuidas en 4 trayectos con rutas reales vascas."

"Los servicios de ingesta, análisis y observabilidad están diseñados y documentados (con ADRs) pero no implementados — el prototipo demuestra la arquitectura sin necesitar todos los servicios corriendo."

---

## Slide 4 — Arquitectura

"La arquitectura tiene 5 servicios. La decisión clave es separar el análisis de la API (ADR-002). ¿Por qué? Porque el análisis evoluciona hacia ML — si está dentro de la API, cada cambio en el modelo de análisis afecta a la API. Con servicios separados, puedo escalar el análisis independientemente y usar Python con NumPy sin afectar al Node.js que sirve el frontend."

"Uso monorepo (ADR-012) porque para un equipo pequeño la simplicidad es más valiosa que la separación. Cada servicio tiene su Dockerfile y tests, así que la migración a multi-repo es posible si el equipo crece."

---

## Slide 5 — Base de datos: TimescaleDB

"Esta fue la primera decisión arquitectónica. Las opciones eran: PostgreSQL solo (sin optimización para time-series), TimescaleDB (extensión de PostgreSQL), o un motor separado como InfluxDB."

"El problema de InfluxDB es que necesitas dos bases de datos — una relacional para usuarios, roles, umbrales, y otra para sensores. No puedes hacer JOINs entre ellas, necesitas sincronizar datos, y duplicas infraestructura."

"TimescaleDB es PostgreSQL con superpoderes: hypertables que particionan automáticamente por tiempo, compresión del 95%, y continuous aggregates que pre-calculan resúmenes. Todo con el mismo driver, mismas queries SQL, un solo contenedor Docker."

---

## Slide 6 — Modelo de datos

"El modelo implementa RBAC con 5 tablas — users, roles, permissions, role_permissions, user_roles. 10 permisos granulares. La ventaja frente a comprobar roles directamente (if role === 'admin') es que crear un nuevo rol es solo configuración en BD, sin tocar código."

"Los trayectos (journeys) son dinámicos — no son rutas predefinidas. Cada vez que un tren sale, crea un nuevo journey y la ruta emerge de las lecturas GPS. Las alertas son segmentos (pk_start a pk_end), no puntos, porque una anomalía tiene extensión."

---

## Slide 7 — Python para ingesta y análisis

"Se evaluó usar Go para la ingesta (máximo rendimiento) y Python para el análisis. Pero usar dos lenguajes duplica la toolchain, los perfiles del equipo, y los costes de contratación."

"Python con asyncio y uvicorn ofrece rendimiento suficiente para el volumen ferroviario (decenas de sistemas, no miles). Y si en el futuro la ingesta necesita más rendimiento, solo se migra ese servicio a Go — es reversible y acotado."

---

## Slide 8 — GraphQL vs REST

"GraphQL no es mejor que REST en general — depende del caso. Aquí lo elijo porque el frontend tiene vistas muy diferentes: un dashboard con KPIs, un listado con filtros, un detalle de trayecto con datos relacionados, un mapa... Cada vista necesita datos distintos."

"Con REST necesitaría múltiples endpoints o endpoints que devuelven datos que la vista no necesita (over-fetching). Con GraphQL el frontend pide exactamente lo que necesita en cada momento."

"Además, GraphQL Subscriptions permiten alertas en tiempo real por el mismo canal, sin montar un WebSocket separado."

---

## Slide 9 — Arquitectura de la API

"Dentro de la API, la decisión era cómo organizar el código. Hay tres opciones típicas: NestJS (framework completo con decoradores, DTOs, módulos), resolvers que llaman a Prisma directamente, o una capa intermedia de servicios."

"NestJS es over-engineering para este alcance — añade mucha ceremony sin beneficio real. Resolvers directos a Prisma mezclan la lógica de resolución GraphQL con la lógica de negocio. El punto medio es schema-first con servicios: los .graphql definen el contrato (equivalen a DTOs), los resolvers delegan a services, y los services contienen la lógica."

"Prisma se elige sobre TypeORM (configuración compleja, decoradores), Drizzle (inmaduro) y Knex (sin type-safety). Prisma da type-safety de la BD al código TypeScript."

---

## Slide 10 — Seguridad

"Cuatro capas. JWT stateless — no se almacena estado de sesión. El token lleva userId, email y organizationId. Expira en 24h. Descartamos sesiones en servidor porque requieren Redis compartido entre instancias."

"RBAC con permisos granulares — el admin_org tiene los 10 permisos, el operator tiene 5 (solo lectura). Cada resolver verifica: requirePermission(ctx.user, 'thresholds.edit')."

"Multitenencia: todas las queries filtran automáticamente por organizationId. Un usuario de la Org A nunca ve datos de la Org B."

"HTTPS automático con Let's Encrypt. La BD y la API solo escuchan en la red interna de Docker, no están expuestas a internet."

---

## Slide 11 — ¿Por qué WebGL?

"Esta es una de las decisiones más importantes del frontend. Un trayecto de 50km con resolución de 10cm son 500.000 puntos que hay que pintar en un mapa y en gráficas."

"Con renderizado SVG/DOM (como hace Leaflet o Recharts), cada punto se convierte en un elemento HTML individual. El navegador tiene que crear cada elemento en memoria, calcular su posición en el layout, y repintar TODOS cuando haces zoom o pan. Con 10.000 elementos ya va lento. Con 100.000 se congela."

"Con WebGL (MapLibre, ECharts), todos los puntos se envían a la GPU como una textura y se pintan en paralelo. La GPU está diseñada para esto — es la misma tecnología que los videojuegos. Un millón de puntos a 60fps."

"Para una aplicación de monitorización ferroviaria, WebGL no es una optimización — es un requisito. Sin WebGL la aplicación sería inutilizable con datos reales."

---

## Slide 12 — Mapas: Leaflet vs MapLibre

"Leaflet es la librería de mapas más conocida pero usa SVG. No sirve para datos densos."

"MapLibre GL JS es un fork open-source de Mapbox GL v1. Rendimiento idéntico a Mapbox pero sin coste de licencia (BSD). Y lo más importante para nosotros: soporta PMTiles, que son archivos de tiles locales que puedes meter en un disco duro. Esto es imprescindible para el modo on-premise — el tren no tiene internet."

"Mapbox GL v2 cambió a licencia propietaria y es de pago. Descartado."

---

## Slide 13 — Gráficas: SVG vs Canvas

"El mismo principio. Recharts usa SVG — cada punto es un elemento. Con 10.000 puntos no funciona. Chart.js usa Canvas (mejor) pero no tiene downsampling automático ni zoom nativo."

"Apache ECharts usa Canvas con opción WebGL. Downsampling automático: si tienes 100.000 puntos y la gráfica tiene 800px de ancho, ECharts solo pinta 800 puntos representativos. Zoom y pan nativos con la rueda del ratón. Y tiene markLine para pintar las líneas de umbral directamente."

---

## Slide 14 — Técnicas de rendimiento

"Dos técnicas implementadas. Primera: downsampling por nivel de zoom en el mapa. A zoom bajo (vista general del trayecto) no hay píxeles para representar 10.000 puntos, así que muestro 500. Al hacer zoom voy mostrando más hasta llegar a todos. Esto se hace en el frontend sin llamar al backend."

"Segunda: coloración por métrica. Cuando cambias de 'colorear por nivelación' a 'colorear por alineación', no se recalcula nada. Todos los valores de todas las métricas están pre-calculados en las propiedades del GeoJSON. Cambiar la métrica solo cambia una expression de MapLibre que se ejecuta en la GPU. Es instantáneo."

"Para volúmenes aún mayores (>100K puntos), la API tiene un parámetro 'resolution' que usa time_bucket de TimescaleDB para hacer el downsampling en la base de datos."

---

## Slide 15 — LISTEN/NOTIFY

"Para alertas en tiempo real, la solución obvia sería Redis Pub/Sub o un message broker como RabbitMQ. Pero ambos añaden infraestructura."

"PostgreSQL tiene LISTEN/NOTIFY — un sistema de mensajería integrado. El servicio de análisis hace INSERT de la alerta y pg_notify en la misma transacción. La API escucha ese canal y emite la alerta como GraphQL Subscription al frontend. Latencia de milisegundos, cero infraestructura adicional."

"Limitación: si nadie está escuchando, el mensaje se pierde. Pero eso no importa porque la alerta queda guardada en la BD. LISTEN/NOTIFY solo es para la notificación en vivo."

---

## Slide 16 — DevOps

"GitHub Actions porque es zero-infra — no necesito montar un servidor de CI. Se evaluó Drone CI (self-hosted) pero añade complejidad innecesaria."

"Docker Compose porque para 5 servicios es perfecto. Kubernetes sería overkill y además complica el modo on-premise."

"El flujo es: push a main ejecuta CI (lint + typecheck). Para desplegar, creo un tag semver (git tag v0.1.0) y automáticamente se construyen las imágenes Docker, se suben a GitHub Container Registry, y se despliegan en el VPS."

---

## Slide 17 — Traefik vs Nginx

"Traefik descubre servicios automáticamente leyendo labels de Docker. Añadir un servicio nuevo es poner un label en el docker-compose — Traefik lo detecta y lo enruta sin reiniciar nada. HTTPS con Let's Encrypt está integrado."

"Nginx es mejor para on-premise donde no hay internet (no necesitas Let's Encrypt) y la configuración es estática."

"Por eso usamos los dos: Traefik para SaaS y Nginx para on-premise. En el prototipo desplegamos con Traefik."

---

## Slide 18 — Deploy

"El flujo de una petición: el navegador pide https://inspectrail.duckdns.org → Traefik termina TLS → enruta al frontend (Nginx) → Nginx sirve los archivos estáticos de React → las llamadas a /graphql las proxea Nginx al contenedor de la API → la API consulta TimescaleDB."

"Cuatro contenedores en un VPS de Hetzner. Dominio gratuito de DuckDNS. HTTPS gratuito de Let's Encrypt."

---

## Slide 19 — Evolución

"El sistema está diseñado para crecer en cuatro ejes."

"Datos: TimescaleDB comprime al 95%, los continuous aggregates evitan escaneos, y el downsampling en API y frontend maneja millones de puntos."

"ML: el servicio de análisis está en Python. Pasar de umbrales estáticos a modelos predictivos es el paso natural. scikit-learn, TensorFlow — el ecosistema está ahí."

"On-premise: Docker save empaqueta las imágenes en un tar. PMTiles sirve los mapas sin internet. Nginx reemplaza a Traefik. Todo funciona offline."

"Observabilidad: Prometheus + Grafana + Loki. Está diseñado y documentado. Implementarlo es añadir un docker-compose.monitoring.yml — no toca los servicios existentes."

---

## Slide 20 — Demo

Abrir https://inspectrail.duckdns.org en el navegador. Hacer login con admin@inspectrail.demo / demo1234.

Mostrar:
1. Dashboard — KPIs, gráficas de alertas por severidad y métrica
2. Trayectos — listado, entrar en Donostia→Bilbao (10.000 puntos)
3. Mapa — mostrar la ruta, cambiar "Colorear por" entre métricas (instantáneo)
4. Hacer zoom en el mapa — mostrar el contador de puntos cambiando
5. Gráficas — hacer zoom con el slider, mostrar las líneas de umbral
6. Alertas — filtrar por severidad
7. Umbrales — tabla de configuración por métrica

---

## Slide 21 — Cierre

"El código está en GitHub, la demo está online, y hay 12 ADRs documentadas con todas las alternativas evaluadas. ¿Preguntas?"
