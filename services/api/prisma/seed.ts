import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ══════════════════════════════════════════════════════════════
// RUTAS REALES (waypoints de vías ferroviarias del País Vasco)
// ══════════════════════════════════════════════════════════════

// Donostia → Bilbao (EuskoTren / cercanías, ~100km por la costa)
const ROUTE_DONOSTIA_BILBAO: [number, number][] = [
  [43.3183, -1.9812],   // Donostia - Amara
  [43.3150, -1.9930],   // Donostia - salida
  [43.3070, -2.0150],   // Usurbil cercanías
  [43.2950, -2.0420],   // Orio
  [43.2850, -2.0780],   // Zarautz este
  [43.2840, -2.1000],   // Zarautz centro
  [43.2830, -2.1300],   // Zarautz oeste
  [43.2960, -2.1680],   // Getaria
  [43.3010, -2.2050],   // Zumaia este
  [43.2950, -2.2450],   // Zumaia
  [43.2870, -2.2800],   // Itziar
  [43.2720, -2.3100],   // Deba
  [43.2550, -2.3450],   // Mutriku
  [43.2450, -2.3800],   // Ondarroa
  [43.2400, -2.4100],   // Lekeitio cercanías
  [43.2480, -2.4400],   // Markina
  [43.2380, -2.4750],   // Bolibar
  [43.2450, -2.5100],   // Eibar este
  [43.2520, -2.5400],   // Eibar centro
  [43.2600, -2.5700],   // Ermua
  [43.2650, -2.6000],   // Mallabia
  [43.2700, -2.6350],   // Elorrio
  [43.2780, -2.6600],   // Durango este
  [43.2850, -2.6830],   // Durango
  [43.2900, -2.7100],   // Amorebieta este
  [43.2830, -2.7350],   // Amorebieta
  [43.2780, -2.7600],   // Lemoa
  [43.2720, -2.7900],   // Galdakao
  [43.2680, -2.8150],   // Basauri
  [43.2650, -2.8400],   // Etxebarri
  [43.2620, -2.8700],   // Bilbao - Atxuri
  [43.2600, -2.9230],   // Bilbao - Abando
];

// Bilbao → Donostia (la misma ruta invertida)
const ROUTE_BILBAO_DONOSTIA: [number, number][] = [...ROUTE_DONOSTIA_BILBAO].reverse();

// Vitoria → Pamplona (por la llanada alavesa y Navarra)
const ROUTE_VITORIA_PAMPLONA: [number, number][] = [
  [42.8490, -2.6727],   // Vitoria-Gasteiz estación
  [42.8400, -2.6500],   // Vitoria salida este
  [42.8350, -2.6200],   // Alegría-Dulantzi
  [42.8280, -2.5850],   // Salvatierra oeste
  [42.8200, -2.5500],   // Salvatierra
  [42.8100, -2.5100],   // San Millán
  [42.8050, -2.4700],   // Araia
  [42.7980, -2.4300],   // Zalduondo
  [42.7900, -2.3900],   // Túnel de San Adrián
  [42.7850, -2.3500],   // Zegama
  [42.7800, -2.3100],   // Idiazábal
  [42.7900, -2.2700],   // Beasain
  [42.7950, -2.2300],   // Alsasua
  [42.7850, -2.1900],   // Olazagutía
  [42.7800, -2.1400],   // Echarri-Aranaz
  [42.7750, -2.0900],   // Irurtzun
  [42.7800, -2.0400],   // Arakil
  [42.7900, -1.9900],   // Zizur
  [42.8050, -1.9500],   // Pamplona oeste
  [42.8120, -1.9200],   // Pamplona - San Jorge
  [42.8168, -1.6432],   // Pamplona estación
];

// Interpolar entre waypoints para generar N puntos suaves
function interpolateRoute(waypoints: [number, number][], numPoints: number): [number, number][] {
  const result: [number, number][] = [];

  // Calcular distancia total (aprox)
  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dlat = waypoints[i + 1][0] - waypoints[i][0];
    const dlon = waypoints[i + 1][1] - waypoints[i][1];
    const len = Math.sqrt(dlat * dlat + dlon * dlon);
    segLengths.push(len);
    totalLength += len;
  }

  for (let p = 0; p < numPoints; p++) {
    const t = p / (numPoints - 1);
    let targetDist = t * totalLength;
    let accumulated = 0;

    for (let i = 0; i < segLengths.length; i++) {
      if (accumulated + segLengths[i] >= targetDist || i === segLengths.length - 1) {
        const segT = segLengths[i] > 0 ? (targetDist - accumulated) / segLengths[i] : 0;
        const lat = waypoints[i][0] + (waypoints[i + 1][0] - waypoints[i][0]) * segT;
        const lon = waypoints[i][1] + (waypoints[i + 1][1] - waypoints[i][1]) * segT;
        result.push([lat, lon]);
        break;
      }
      accumulated += segLengths[i];
    }
  }

  return result;
}

// ══════════════════════════════════════════════════════════════
// GENERADOR DE LECTURAS CON ANOMALÍAS
// ══════════════════════════════════════════════════════════════

interface AnomalyZone {
  pkFrom: number;
  pkTo: number;
  metric: 'leveling' | 'alignment' | 'twist' | 'accelV' | 'accelL';
  intensity: number; // multiplicador sobre el umbral
}

interface GeneratedData {
  readings: string[];
  alerts: Array<{
    metric: string; severity: string; pkStart: number; pkEnd: number;
    latStart: number; lonStart: number; latEnd: number; lonEnd: number;
    measuredValue: number; thresholdValue: number; deviation: number; detectedAt: Date;
  }>;
}

function generateJourneyData(
  journeyId: number,
  route: [number, number][],
  numPoints: number,
  totalKm: number,
  startTime: Date,
  anomalyZones: AnomalyZone[]
): GeneratedData {
  const points = interpolateRoute(route, numPoints);
  const readings: string[] = [];
  const alerts: GeneratedData['alerts'] = [];
  let inAnomaly: { [key: string]: { start: number; latStart: number; lonStart: number; peakValue: number; threshold: number } } = {};

  for (let i = 0; i < numPoints; i++) {
    const t = i / numPoints;
    const pk = t * totalKm;
    const [lat, lon] = points[i];
    const time = new Date(startTime.getTime() + i * (90 * 60 * 1000 / numPoints)); // distribuir en 90min
    const speed = 55 + Math.random() * 30 + Math.sin(t * Math.PI * 4) * 10; // variación realista

    let leveling = (Math.random() - 0.5) * 4;
    let alignment = (Math.random() - 0.5) * 3;
    let twist = (Math.random() - 0.5) * 3;
    let accelV = (Math.random() - 0.5) * 4;
    let accelL = (Math.random() - 0.5) * 3;
    const accelLong = (Math.random() - 0.5) * 2;
    const gauge = 1435 + (Math.random() - 0.5) * 4;

    // Aplicar anomalías
    for (const zone of anomalyZones) {
      if (pk >= zone.pkFrom && pk <= zone.pkTo) {
        const progress = (pk - zone.pkFrom) / (zone.pkTo - zone.pkFrom);
        const envelope = Math.sin(progress * Math.PI); // campana suave
        const boost = zone.intensity * envelope;
        switch (zone.metric) {
          case 'leveling': leveling = boost + Math.random() * 0.5; break;
          case 'alignment': alignment = boost + Math.random() * 0.5; break;
          case 'twist': twist = boost + Math.random() * 0.5; break;
          case 'accelV': accelV = boost + Math.random() * 0.5; break;
          case 'accelL': accelL = boost + Math.random() * 0.5; break;
        }
      }
    }

    // Detectar alertas
    const checks = [
      { metric: 'leveling', value: leveling, warn: 3, alert: 5, critical: 7 },
      { metric: 'alignment', value: alignment, warn: 2, alert: 4, critical: 6 },
      { metric: 'twist', value: twist, warn: 2.5, alert: 4.5, critical: 6.5 },
      { metric: 'accel_vertical', value: accelV, warn: 3, alert: 5, critical: 8 },
      { metric: 'accel_lateral', value: accelL, warn: 2, alert: 3.5, critical: 5 },
    ];

    for (const check of checks) {
      const absVal = Math.abs(check.value);
      let severity: string | null = null;
      let thresholdVal = 0;

      if (absVal > check.critical) { severity = 'critical'; thresholdVal = check.critical; }
      else if (absVal > check.alert) { severity = 'alert'; thresholdVal = check.alert; }
      else if (absVal > check.warn) { severity = 'warning'; thresholdVal = check.warn; }

      const key = check.metric;
      if (severity) {
        if (!inAnomaly[key]) {
          inAnomaly[key] = { start: pk, latStart: lat, lonStart: lon, peakValue: absVal, threshold: thresholdVal };
        } else if (absVal > inAnomaly[key].peakValue) {
          inAnomaly[key].peakValue = absVal;
          inAnomaly[key].threshold = thresholdVal;
        }
      } else if (inAnomaly[key]) {
        const a = inAnomaly[key];
        let sev = 'warning';
        if (a.peakValue > check.critical) sev = 'critical';
        else if (a.peakValue > check.alert) sev = 'alert';
        alerts.push({
          metric: key, severity: sev,
          pkStart: Math.round(a.start * 1000) / 1000, pkEnd: Math.round(pk * 1000) / 1000,
          latStart: a.latStart, lonStart: a.lonStart, latEnd: lat, lonEnd: lon,
          measuredValue: Math.round(a.peakValue * 100) / 100, thresholdValue: a.threshold,
          deviation: Math.round((a.peakValue - a.threshold) * 100) / 100, detectedAt: time,
        });
        delete inAnomaly[key];
      }
    }

    readings.push(
      `('${time.toISOString()}', ${journeyId}, ${pk.toFixed(4)}, ${lat.toFixed(6)}, ${lon.toFixed(6)}, ${speed.toFixed(2)}, ${accelV.toFixed(4)}, ${accelL.toFixed(4)}, ${accelLong.toFixed(4)}, ${leveling.toFixed(4)}, ${alignment.toFixed(4)}, ${twist.toFixed(4)}, ${gauge.toFixed(2)})`
    );
  }

  // Cerrar anomalías abiertas
  const thresholdMap: Record<string, { w: number; a: number; c: number }> = {
    leveling: { w: 3, a: 5, c: 7 }, alignment: { w: 2, a: 4, c: 6 },
    twist: { w: 2.5, a: 4.5, c: 6.5 }, accel_vertical: { w: 3, a: 5, c: 8 },
    accel_lateral: { w: 2, a: 3.5, c: 5 },
  };
  for (const [key, a] of Object.entries(inAnomaly)) {
    const check = thresholdMap[key];
    let sev = 'warning';
    if (a.peakValue > check.c) sev = 'critical';
    else if (a.peakValue > check.a) sev = 'alert';
    const lastPoint = points[points.length - 1];
    alerts.push({
      metric: key, severity: sev,
      pkStart: Math.round(a.start * 1000) / 1000, pkEnd: totalKm,
      latStart: a.latStart, lonStart: a.lonStart, latEnd: lastPoint[0], lonEnd: lastPoint[1],
      measuredValue: Math.round(a.peakValue * 100) / 100, thresholdValue: a.threshold,
      deviation: Math.round((a.peakValue - a.threshold) * 100) / 100,
      detectedAt: new Date(startTime.getTime() + 90 * 60 * 1000),
    });
  }

  return { readings, alerts };
}

// ══════════════════════════════════════════════════════════════
// SEED PRINCIPAL
// ══════════════════════════════════════════════════════════════

async function main() {
  console.log('🌱 Seeding database...');

  // ── Organización ──
  const org = await prisma.organization.create({
    data: {
      name: 'InspectRail Demo',
      code: 'DEMO',
      deploymentMode: 'saas',
      config: { plan: 'professional', maxSystems: 10 },
    },
  });
  console.log(`  ✓ Organization: ${org.name}`);

  // ── Roles y permisos ──
  const permissions = await Promise.all([
    prisma.permission.create({ data: { code: 'dashboard.view', description: 'Ver dashboard' } }),
    prisma.permission.create({ data: { code: 'journeys.view', description: 'Ver trayectos' } }),
    prisma.permission.create({ data: { code: 'alerts.view', description: 'Ver alertas' } }),
    prisma.permission.create({ data: { code: 'thresholds.view', description: 'Ver umbrales' } }),
    prisma.permission.create({ data: { code: 'thresholds.edit', description: 'Editar umbrales' } }),
    prisma.permission.create({ data: { code: 'systems.view', description: 'Ver sistemas' } }),
    prisma.permission.create({ data: { code: 'systems.edit', description: 'Editar sistemas' } }),
    prisma.permission.create({ data: { code: 'users.view', description: 'Ver usuarios' } }),
    prisma.permission.create({ data: { code: 'users.manage', description: 'Gestionar usuarios' } }),
    prisma.permission.create({ data: { code: 'org.configure', description: 'Configurar organización' } }),
  ]);

  const adminRole = await prisma.role.create({
    data: {
      name: 'admin_org', description: 'Administrador de organización', isSystem: true,
      rolePermissions: { create: permissions.map(p => ({ permissionId: p.id })) },
    },
  });

  const operatorRole = await prisma.role.create({
    data: {
      name: 'operator', description: 'Operador', isSystem: true,
      rolePermissions: {
        create: permissions
          .filter(p => ['dashboard.view', 'journeys.view', 'alerts.view', 'thresholds.view', 'systems.view'].includes(p.code))
          .map(p => ({ permissionId: p.id })),
      },
    },
  });
  console.log(`  ✓ Roles: admin_org, operator`);

  // ── Usuarios ──
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const admin = await prisma.user.create({
    data: { organizationId: org.id, email: 'admin@inspectrail.demo', name: 'Mario Monterde', phone: '+34600000001', passwordHash },
  });
  await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });

  const operator = await prisma.user.create({
    data: { organizationId: org.id, email: 'operador@inspectrail.demo', name: 'Pedro Martínez', phone: '+34600000002', passwordHash },
  });
  await prisma.userRole.create({ data: { userId: operator.id, roleId: operatorRole.id } });
  console.log(`  ✓ Users: admin@inspectrail.demo, operador@inspectrail.demo (pass: demo1234)`);

  // ── Sistemas de inspección ──
  const system1 = await prisma.inspectionSystem.create({
    data: {
      organizationId: org.id, name: 'Tren Inspector S-121', code: 'S121',
      sensorsConfig: { sensors: ['accelerometer_3axis', 'leveling', 'alignment', 'twist', 'gauge', 'gps'], samplingRate: '10cm' },
      apiKey: 'sys_s121_demo_key', apiSecretHash: await bcrypt.hash('sys_s121_demo_secret', 10),
      connectionStatus: 'connected', lastSeenAt: new Date(),
    },
  });

  const system2 = await prisma.inspectionSystem.create({
    data: {
      organizationId: org.id, name: 'Tren Inspector S-245', code: 'S245',
      sensorsConfig: { sensors: ['accelerometer_3axis', 'leveling', 'alignment', 'twist', 'gauge', 'gps'], samplingRate: '10cm' },
      apiKey: 'sys_s245_demo_key', apiSecretHash: await bcrypt.hash('sys_s245_demo_secret', 10),
      connectionStatus: 'disconnected', lastSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`  ✓ Systems: S121 (connected), S245 (disconnected)`);

  // ── Umbrales ──
  const thresholdsData = [
    { metric: 'leveling' as const, wMin: -3, wMax: 3, aMin: -5, aMax: 5, cMin: -7, cMax: 7 },
    { metric: 'alignment' as const, wMin: -2, wMax: 2, aMin: -4, aMax: 4, cMin: -6, cMax: 6 },
    { metric: 'twist' as const, wMin: -2.5, wMax: 2.5, aMin: -4.5, aMax: 4.5, cMin: -6.5, cMax: 6.5 },
    { metric: 'gauge' as const, wMin: 1430, wMax: 1440, aMin: 1425, aMax: 1445, cMin: 1420, cMax: 1450 },
    { metric: 'accel_vertical' as const, wMin: -3, wMax: 3, aMin: -5, aMax: 5, cMin: -8, cMax: 8 },
    { metric: 'accel_lateral' as const, wMin: -2, wMax: 2, aMin: -3.5, aMax: 3.5, cMin: -5, cMax: 5 },
  ];

  for (const t of thresholdsData) {
    await prisma.threshold.create({
      data: {
        organizationId: org.id, metric: t.metric,
        warningMin: t.wMin, warningMax: t.wMax, alertMin: t.aMin, alertMax: t.aMax, criticalMin: t.cMin, criticalMax: t.cMax,
      },
    });
  }
  console.log(`  ✓ Thresholds: ${thresholdsData.length} metrics configured`);

  // ── Trayectos ──
  const journey1 = await prisma.journey.create({
    data: {
      organizationId: org.id, systemId: system1.id, name: 'S121 — Donostia → Bilbao 2026-03-23',
      startedAt: new Date('2026-03-23T08:00:00Z'), endedAt: new Date('2026-03-23T09:30:00Z'),
      status: 'completed', metadata: { route: 'Donostia-Bilbao', operator: 'Pedro Martínez', weather: 'cloudy' },
    },
  });

  const journey2 = await prisma.journey.create({
    data: {
      organizationId: org.id, systemId: system1.id, name: 'S121 — Bilbao → Donostia 2026-03-23',
      startedAt: new Date('2026-03-23T11:00:00Z'), endedAt: new Date('2026-03-23T12:25:00Z'),
      status: 'completed', metadata: { route: 'Bilbao-Donostia', operator: 'Pedro Martínez', weather: 'rain' },
    },
  });

  const journey3 = await prisma.journey.create({
    data: {
      organizationId: org.id, systemId: system1.id, name: 'S121 — Donostia → Bilbao 2026-03-24',
      startedAt: new Date('2026-03-24T08:00:00Z'),
      status: 'in_progress', metadata: { route: 'Donostia-Bilbao', operator: 'Ana García', weather: 'sunny' },
    },
  });

  const journey4 = await prisma.journey.create({
    data: {
      organizationId: org.id, systemId: system2.id, name: 'S245 — Vitoria → Pamplona 2026-03-20',
      startedAt: new Date('2026-03-20T09:00:00Z'), endedAt: new Date('2026-03-20T10:45:00Z'),
      status: 'completed', metadata: { route: 'Vitoria-Pamplona', operator: 'Ana García', weather: 'sunny' },
    },
  });
  console.log(`  ✓ Journeys: 4 (3 completed, 1 in_progress)`);

  // ── Generar lecturas para cada trayecto ──
  const journeyConfigs = [
    {
      journey: journey1, route: ROUTE_DONOSTIA_BILBAO, points: 10000, km: 100,
      startTime: new Date('2026-03-23T08:00:00Z'),
      anomalies: [
        { pkFrom: 15, pkTo: 22, metric: 'leveling' as const, intensity: 6 },
        { pkFrom: 45, pkTo: 50, metric: 'alignment' as const, intensity: 7 },
        { pkFrom: 65, pkTo: 68, metric: 'accelV' as const, intensity: 9 },
        { pkFrom: 82, pkTo: 88, metric: 'twist' as const, intensity: 3.5 },
      ],
    },
    {
      journey: journey2, route: ROUTE_BILBAO_DONOSTIA, points: 800, km: 100,
      startTime: new Date('2026-03-23T11:00:00Z'),
      anomalies: [
        { pkFrom: 10, pkTo: 14, metric: 'leveling' as const, intensity: 4 },
        { pkFrom: 55, pkTo: 60, metric: 'alignment' as const, intensity: 5 },
      ],
    },
    {
      journey: journey3, route: ROUTE_DONOSTIA_BILBAO, points: 400, km: 50, // en curso, mitad de ruta
      startTime: new Date('2026-03-24T08:00:00Z'),
      anomalies: [
        { pkFrom: 15, pkTo: 20, metric: 'leveling' as const, intensity: 5.5 },
        { pkFrom: 35, pkTo: 38, metric: 'accelL' as const, intensity: 4 },
      ],
    },
    {
      journey: journey4, route: ROUTE_VITORIA_PAMPLONA, points: 600, km: 90,
      startTime: new Date('2026-03-20T09:00:00Z'),
      anomalies: [
        { pkFrom: 30, pkTo: 35, metric: 'twist' as const, intensity: 7.5 },
        { pkFrom: 60, pkTo: 63, metric: 'accelV' as const, intensity: 4 },
        { pkFrom: 75, pkTo: 78, metric: 'alignment' as const, intensity: 3.5 },
      ],
    },
  ];

  let totalReadings = 0;
  let totalAlerts = 0;

  for (const config of journeyConfigs) {
    console.log(`  ⏳ Generating ${config.points} readings for ${config.journey.name}...`);

    const { readings, alerts } = generateJourneyData(
      config.journey.id, config.route, config.points, config.km, config.startTime, config.anomalies
    );

    // Bulk insert readings
    const batchSize = 100;
    for (let i = 0; i < readings.length; i += batchSize) {
      const batch = readings.slice(i, i + batchSize);
      await prisma.$executeRawUnsafe(`
        INSERT INTO sensor_readings (time, journey_id, pk, latitude, longitude, speed, accel_vertical, accel_lateral, accel_longitudinal, leveling, alignment, twist, gauge)
        VALUES ${batch.join(',\n')}
      `);
    }

    // Insert alerts
    for (const a of alerts) {
      await prisma.alert.create({
        data: {
          organizationId: org.id, journeyId: config.journey.id,
          metric: a.metric as any, severity: a.severity as any,
          pkStart: a.pkStart, pkEnd: a.pkEnd,
          latStart: a.latStart, lonStart: a.lonStart, latEnd: a.latEnd, lonEnd: a.lonEnd,
          measuredValue: a.measuredValue, thresholdValue: a.thresholdValue,
          deviation: a.deviation, detectedAt: a.detectedAt,
        },
      });
    }

    totalReadings += readings.length;
    totalAlerts += alerts.length;
    console.log(`  ✓ ${readings.length} readings, ${alerts.length} alerts`);
  }

  console.log(`\n✅ Seed completed!`);
  console.log(`  Total: ${totalReadings} sensor readings, ${totalAlerts} alerts across 4 journeys`);
  console.log(`\n  Login credentials:`);
  console.log(`    admin@inspectrail.demo / demo1234`);
  console.log(`    operador@inspectrail.demo / demo1234`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
