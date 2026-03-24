import { PrismaClient } from '@prisma/client';

export class SensorService {
  constructor(private prisma: PrismaClient) {}

  async findByJourney(
    journeyId: number,
    organizationId: number,
    options?: { pkFrom?: number; pkTo?: number; resolution?: number }
  ) {
    // Verificar que el journey pertenece a la organización
    const journey = await this.prisma.journey.findFirst({
      where: { id: journeyId, organizationId },
    });
    if (!journey) return [];

    // Construir query con filtros opcionales de PK
    const conditions: string[] = [`journey_id = ${journeyId}`];
    if (options?.pkFrom !== undefined) conditions.push(`pk >= ${options.pkFrom}`);
    if (options?.pkTo !== undefined) conditions.push(`pk <= ${options.pkTo}`);

    const whereClause = conditions.join(' AND ');

    // Si se pide resolución reducida, usar time_bucket de TimescaleDB
    if (options?.resolution && options.resolution > 0) {
      const readings = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          time_bucket('${options.resolution} seconds', time) AS time,
          AVG(pk) AS pk,
          AVG(latitude) AS latitude,
          AVG(longitude) AS longitude,
          AVG(speed) AS speed,
          AVG(accel_vertical) AS "accelVertical",
          AVG(accel_lateral) AS "accelLateral",
          AVG(accel_longitudinal) AS "accelLongitudinal",
          AVG(leveling) AS leveling,
          AVG(alignment) AS alignment,
          AVG(twist) AS twist,
          AVG(gauge) AS gauge,
          ${journeyId} AS "journeyId"
        FROM sensor_readings
        WHERE ${whereClause}
        GROUP BY 1
        ORDER BY 1
      `);
      return readings;
    }

    // Sin resolución: devolver todos los puntos
    const readings = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        time, journey_id AS "journeyId", pk,
        latitude, longitude, speed,
        accel_vertical AS "accelVertical",
        accel_lateral AS "accelLateral",
        accel_longitudinal AS "accelLongitudinal",
        leveling, alignment, twist, gauge
      FROM sensor_readings
      WHERE ${whereClause}
      ORDER BY pk ASC
    `);
    return readings;
  }
}
