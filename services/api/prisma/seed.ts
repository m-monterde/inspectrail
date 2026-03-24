import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
      name: 'admin_org',
      description: 'Administrador de organización',
      isSystem: true,
      rolePermissions: { create: permissions.map(p => ({ permissionId: p.id })) },
    },
  });

  const operatorRole = await prisma.role.create({
    data: {
      name: 'operator',
      description: 'Operador',
      isSystem: true,
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
    data: {
      organizationId: org.id,
      email: 'admin@inspectrail.demo',
      name: 'Ana García',
      phone: '+34600000001',
      passwordHash,
    },
  });
  await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });

  const operator = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'operador@inspectrail.demo',
      name: 'Pedro Martínez',
      phone: '+34600000002',
      passwordHash,
    },
  });
  await prisma.userRole.create({ data: { userId: operator.id, roleId: operatorRole.id } });
  console.log(`  ✓ Users: admin@inspectrail.demo, operador@inspectrail.demo (pass: demo1234)`);

  // ── Sistemas de inspección ──
  const system1 = await prisma.inspectionSystem.create({
    data: {
      organizationId: org.id,
      name: 'Tren Inspector S-121',
      code: 'S121',
      sensorsConfig: {
        sensors: ['accelerometer_3axis', 'leveling', 'alignment', 'twist', 'gauge', 'gps'],
        samplingRate: '10cm',
      },
      apiKey: 'sys_s121_demo_key',
      apiSecretHash: await bcrypt.hash('sys_s121_demo_secret', 10),
      connectionStatus: 'connected',
      lastSeenAt: new Date(),
    },
  });

  const system2 = await prisma.inspectionSystem.create({
    data: {
      organizationId: org.id,
      name: 'Tren Inspector S-245',
      code: 'S245',
      sensorsConfig: {
        sensors: ['accelerometer_3axis', 'leveling', 'alignment', 'twist', 'gauge', 'gps'],
        samplingRate: '10cm',
      },
      apiKey: 'sys_s245_demo_key',
      apiSecretHash: await bcrypt.hash('sys_s245_demo_secret', 10),
      connectionStatus: 'disconnected',
      lastSeenAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
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
        organizationId: org.id,
        metric: t.metric,
        warningMin: t.wMin,
        warningMax: t.wMax,
        alertMin: t.aMin,
        alertMax: t.aMax,
        criticalMin: t.cMin,
        criticalMax: t.cMax,
      },
    });
  }
  console.log(`  ✓ Thresholds: ${thresholdsData.length} metrics configured`);

  // ── Trayectos ──
  // Trayecto 1: Donostia-Bilbao (completado, ayer)
  const journey1 = await prisma.journey.create({
    data: {
      organizationId: org.id,
      systemId: system1.id,
      name: 'S121 — Donostia-Bilbao 2026-03-23',
      startedAt: new Date('2026-03-23T08:00:00Z'),
      endedAt: new Date('2026-03-23T09:30:00Z'),
      status: 'completed',
      metadata: { route: 'Donostia-Bilbao', operator: 'Pedro Martínez', weather: 'cloudy' },
    },
  });

  // Trayecto 2: Bilbao-Donostia (completado, ayer vuelta)
  const journey2 = await prisma.journey.create({
    data: {
      organizationId: org.id,
      systemId: system1.id,
      name: 'S121 — Bilbao-Donostia 2026-03-23',
      startedAt: new Date('2026-03-23T11:00:00Z'),
      endedAt: new Date('2026-03-23T12:25:00Z'),
      status: 'completed',
      metadata: { route: 'Bilbao-Donostia', operator: 'Pedro Martínez', weather: 'rain' },
    },
  });

  // Trayecto 3: hoy, en curso
  const journey3 = await prisma.journey.create({
    data: {
      organizationId: org.id,
      systemId: system1.id,
      name: 'S121 — Donostia-Bilbao 2026-03-24',
      startedAt: new Date('2026-03-24T08:00:00Z'),
      status: 'in_progress',
      metadata: { route: 'Donostia-Bilbao', operator: 'Ana García', weather: 'sunny' },
    },
  });

  // Trayecto 4: S245 de la semana pasada
  const journey4 = await prisma.journey.create({
    data: {
      organizationId: org.id,
      systemId: system2.id,
      name: 'S245 — Vitoria-Pamplona 2026-03-20',
      startedAt: new Date('2026-03-20T09:00:00Z'),
      endedAt: new Date('2026-03-20T10:45:00Z'),
      status: 'completed',
      metadata: { route: 'Vitoria-Pamplona', operator: 'Ana García', weather: 'sunny' },
    },
  });
  console.log(`  ✓ Journeys: 4 (3 completed, 1 in_progress)`);

  // ── Generar lecturas de sensores (trayecto 1: ~5km demo) ──
  console.log('  ⏳ Generating sensor readings for journey 1 (5km, ~500 points)...');

  // Ruta simulada Donostia-Bilbao: puntos cada ~10m para la demo
  const startLat = 43.3183;
  const startLon = -1.9812;
  const endLat = 43.2630;
  const endLon = -2.9350;

  const numPoints = 500;
  const startTime = new Date('2026-03-23T08:00:00Z');

  const readings: string[] = [];
  const alerts: Array<{
    metric: string;
    severity: string;
    pkStart: number;
    pkEnd: number;
    latStart: number;
    lonStart: number;
    latEnd: number;
    lonEnd: number;
    measuredValue: number;
    thresholdValue: number;
    deviation: number;
    detectedAt: Date;
  }> = [];

  let inAnomaly: { [key: string]: { start: number; latStart: number; lonStart: number; peakValue: number; threshold: number } } = {};

  for (let i = 0; i < numPoints; i++) {
    const t = i / numPoints;
    const pk = t * 5.0; // 0 a 5 km
    const lat = startLat + (endLat - startLat) * t;
    const lon = startLon + (endLon - startLon) * t;
    const time = new Date(startTime.getTime() + i * 12000); // cada 12 segundos
    const speed = 60 + Math.random() * 20; // 60-80 km/h

    // Valores normales con ruido
    let leveling = (Math.random() - 0.5) * 4; // ±2mm normalmente
    let alignment = (Math.random() - 0.5) * 3;
    let twist = (Math.random() - 0.5) * 3;
    let accelV = (Math.random() - 0.5) * 4;
    let accelL = (Math.random() - 0.5) * 3;
    const accelLong = (Math.random() - 0.5) * 2;
    const gauge = 1435 + (Math.random() - 0.5) * 4;

    // Inyectar anomalías en zonas específicas
    // Zona 1: pk 1.2-1.5 → nivelación alta (alert)
    if (pk >= 1.2 && pk <= 1.5) {
      leveling = 5.5 + Math.random() * 1.5; // 5.5-7mm
    }
    // Zona 2: pk 2.8-2.9 → alineación crítica
    if (pk >= 2.8 && pk <= 2.9) {
      alignment = 6.5 + Math.random() * 1; // 6.5-7.5mm
    }
    // Zona 3: pk 3.5-3.55 → aceleración vertical pico
    if (pk >= 3.5 && pk <= 3.55) {
      accelV = 8.5 + Math.random() * 2; // 8.5-10.5
    }
    // Zona 4: pk 4.1-4.3 → alabeo warning
    if (pk >= 4.1 && pk <= 4.3) {
      twist = 3.0 + Math.random() * 1; // 3-4mm
    }

    // Detectar alertas por umbrales
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

      if (absVal > check.critical) {
        severity = 'critical';
        thresholdVal = check.critical;
      } else if (absVal > check.alert) {
        severity = 'alert';
        thresholdVal = check.alert;
      } else if (absVal > check.warn) {
        severity = 'warning';
        thresholdVal = check.warn;
      }

      const key = check.metric;
      if (severity) {
        if (!inAnomaly[key]) {
          inAnomaly[key] = { start: pk, latStart: lat, lonStart: lon, peakValue: absVal, threshold: thresholdVal };
        } else {
          if (absVal > inAnomaly[key].peakValue) {
            inAnomaly[key].peakValue = absVal;
            inAnomaly[key].threshold = thresholdVal;
          }
        }
      } else if (inAnomaly[key]) {
        // Anomalía terminó
        const a = inAnomaly[key];
        let sev = 'warning';
        if (a.peakValue > check.critical) sev = 'critical';
        else if (a.peakValue > check.alert) sev = 'alert';

        alerts.push({
          metric: key,
          severity: sev,
          pkStart: Math.round(a.start * 1000) / 1000,
          pkEnd: Math.round(pk * 1000) / 1000,
          latStart: a.latStart,
          lonStart: a.lonStart,
          latEnd: lat,
          lonEnd: lon,
          measuredValue: Math.round(a.peakValue * 100) / 100,
          thresholdValue: a.threshold,
          deviation: Math.round((a.peakValue - a.threshold) * 100) / 100,
          detectedAt: time,
        });
        delete inAnomaly[key];
      }
    }

    readings.push(
      `('${time.toISOString()}', ${journey1.id}, ${pk.toFixed(4)}, ${lat.toFixed(6)}, ${lon.toFixed(6)}, ${speed.toFixed(2)}, ${accelV.toFixed(4)}, ${accelL.toFixed(4)}, ${accelLong.toFixed(4)}, ${leveling.toFixed(4)}, ${alignment.toFixed(4)}, ${twist.toFixed(4)}, ${gauge.toFixed(2)})`
    );
  }

  // Close any remaining anomalies
  for (const [key, a] of Object.entries(inAnomaly)) {
    const check = { leveling: { w: 3, a: 5, c: 7 }, alignment: { w: 2, a: 4, c: 6 }, twist: { w: 2.5, a: 4.5, c: 6.5 }, accel_vertical: { w: 3, a: 5, c: 8 }, accel_lateral: { w: 2, a: 3.5, c: 5 } }[key]!;
    let sev = 'warning';
    if (a.peakValue > check.c) sev = 'critical';
    else if (a.peakValue > check.a) sev = 'alert';

    alerts.push({
      metric: key,
      severity: sev,
      pkStart: Math.round(a.start * 1000) / 1000,
      pkEnd: 5.0,
      latStart: a.latStart,
      lonStart: a.lonStart,
      latEnd: endLat,
      lonEnd: endLon,
      measuredValue: Math.round(a.peakValue * 100) / 100,
      thresholdValue: a.threshold,
      deviation: Math.round((a.peakValue - a.threshold) * 100) / 100,
      detectedAt: new Date('2026-03-23T09:30:00Z'),
    });
  }

  // Bulk insert sensor readings
  const batchSize = 100;
  for (let i = 0; i < readings.length; i += batchSize) {
    const batch = readings.slice(i, i + batchSize);
    await prisma.$executeRawUnsafe(`
      INSERT INTO sensor_readings (time, journey_id, pk, latitude, longitude, speed, accel_vertical, accel_lateral, accel_longitudinal, leveling, alignment, twist, gauge)
      VALUES ${batch.join(',\n')}
    `);
  }
  console.log(`  ✓ Sensor readings: ${readings.length} points inserted`);

  // Insert alerts
  for (const a of alerts) {
    await prisma.alert.create({
      data: {
        organizationId: org.id,
        journeyId: journey1.id,
        metric: a.metric as any,
        severity: a.severity as any,
        pkStart: a.pkStart,
        pkEnd: a.pkEnd,
        latStart: a.latStart,
        lonStart: a.lonStart,
        latEnd: a.latEnd,
        lonEnd: a.lonEnd,
        measuredValue: a.measuredValue,
        thresholdValue: a.thresholdValue,
        deviation: a.deviation,
        detectedAt: a.detectedAt,
      },
    });
  }
  console.log(`  ✓ Alerts: ${alerts.length} alerts generated from threshold analysis`);

  // Algunas alertas para los otros trayectos también
  await prisma.alert.createMany({
    data: [
      {
        organizationId: org.id, journeyId: journey2.id, metric: 'leveling', severity: 'warning',
        pkStart: 0.8, pkEnd: 0.95, measuredValue: 3.8, thresholdValue: 3.0, deviation: 0.8,
        detectedAt: new Date('2026-03-23T11:20:00Z'),
      },
      {
        organizationId: org.id, journeyId: journey2.id, metric: 'alignment', severity: 'alert',
        pkStart: 2.1, pkEnd: 2.25, measuredValue: 4.6, thresholdValue: 4.0, deviation: 0.6,
        detectedAt: new Date('2026-03-23T11:45:00Z'),
      },
      {
        organizationId: org.id, journeyId: journey4.id, metric: 'twist', severity: 'critical',
        pkStart: 5.2, pkEnd: 5.35, measuredValue: 7.1, thresholdValue: 6.5, deviation: 0.6,
        detectedAt: new Date('2026-03-20T09:40:00Z'),
      },
      {
        organizationId: org.id, journeyId: journey4.id, metric: 'accel_vertical', severity: 'warning',
        pkStart: 8.0, pkEnd: 8.1, measuredValue: 3.4, thresholdValue: 3.0, deviation: 0.4,
        detectedAt: new Date('2026-03-20T10:00:00Z'),
      },
    ],
  });
  console.log(`  ✓ Additional alerts for journeys 2 and 4`);

  console.log('\n✅ Seed completed!');
  console.log('\n  Login credentials:');
  console.log('    admin@inspectrail.demo / demo1234');
  console.log('    operador@inspectrail.demo / demo1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
