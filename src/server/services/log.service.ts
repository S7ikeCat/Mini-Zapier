import { prisma } from "@/shared/lib/prisma";

export class LogService {
  static async getAll() {
    return prisma.executionLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        execution: {
          include: {
            workflow: true,
          },
        },
      },
      take: 100,
    });
  }
}