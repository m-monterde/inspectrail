import { PrismaClient, Prisma } from '@prisma/client';

interface AlertFilter {
  journeyId?: number;
  severity?: string;
  metric?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface Pagination {
  page?: number;
  pageSize?: number;
}

export class AlertService {
  constructor(private prisma: PrismaClient) {}

  async findMany(organizationId: number, filter?: AlertFilter, pagination?: Pagination) {
    const where: Prisma.AlertWhereInput = { organizationId };

    if (filter?.journeyId) where.journeyId = filter.journeyId;
    if (filter?.severity) where.severity = filter.severity as any;
    if (filter?.metric) where.metric = filter.metric as any;
    if (filter?.dateFrom || filter?.dateTo) {
      where.detectedAt = {};
      if (filter.dateFrom) where.detectedAt.gte = filter.dateFrom;
      if (filter.dateTo) where.detectedAt.lte = filter.dateTo;
    }

    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;

    const [items, totalCount] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        include: { journey: { include: { system: true } } },
        orderBy: { detectedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  async findById(id: number, organizationId: number) {
    return this.prisma.alert.findFirst({
      where: { id, organizationId },
      include: { journey: { include: { system: true } } },
    });
  }

  async countBySeverity(organizationId: number, journeyId?: number) {
    const where: Prisma.AlertWhereInput = { organizationId };
    if (journeyId) where.journeyId = journeyId;

    const counts = await this.prisma.alert.groupBy({
      by: ['severity'],
      where,
      _count: true,
    });

    return {
      warning: counts.find((c) => c.severity === 'warning')?._count ?? 0,
      alert: counts.find((c) => c.severity === 'alert')?._count ?? 0,
      critical: counts.find((c) => c.severity === 'critical')?._count ?? 0,
    };
  }
}
