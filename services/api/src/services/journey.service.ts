import { PrismaClient, Prisma } from '@prisma/client';

interface JourneyFilter {
  systemId?: number;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface Pagination {
  page?: number;
  pageSize?: number;
}

export class JourneyService {
  constructor(private prisma: PrismaClient) {}

  async findMany(organizationId: number, filter?: JourneyFilter, pagination?: Pagination) {
    const where: Prisma.JourneyWhereInput = { organizationId };

    if (filter?.systemId) where.systemId = filter.systemId;
    if (filter?.status) where.status = filter.status as any;
    if (filter?.dateFrom || filter?.dateTo) {
      where.startedAt = {};
      if (filter.dateFrom) where.startedAt.gte = filter.dateFrom;
      if (filter.dateTo) where.startedAt.lte = filter.dateTo;
    }

    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;

    const [items, totalCount] = await Promise.all([
      this.prisma.journey.findMany({
        where,
        include: { system: true },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.journey.count({ where }),
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
    return this.prisma.journey.findFirst({
      where: { id, organizationId },
      include: { system: true },
    });
  }
}
