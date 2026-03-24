import { PrismaClient } from '@prisma/client';
import { AlertService } from './alert.service.js';

export class DashboardService {
  private alertService: AlertService;

  constructor(private prisma: PrismaClient) {
    this.alertService = new AlertService(prisma);
  }

  async getStats(organizationId: number) {
    const [
      totalSystems,
      connectedSystems,
      totalJourneys,
      activeJourneys,
      alertCounts,
      recentAlerts,
    ] = await Promise.all([
      this.prisma.inspectionSystem.count({
        where: { organizationId, active: true },
      }),
      this.prisma.inspectionSystem.count({
        where: { organizationId, active: true, connectionStatus: 'connected' },
      }),
      this.prisma.journey.count({ where: { organizationId } }),
      this.prisma.journey.count({
        where: { organizationId, status: 'in_progress' },
      }),
      this.alertService.countBySeverity(organizationId),
      this.prisma.alert.findMany({
        where: { organizationId },
        include: { journey: { include: { system: true } } },
        orderBy: { detectedAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalSystems,
      connectedSystems,
      totalJourneys,
      activeJourneys,
      alertCounts,
      recentAlerts,
    };
  }
}
