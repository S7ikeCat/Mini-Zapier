import { prisma } from "@/shared/lib/prisma";

export class ExecutionService {
  static async getAll() {
    return prisma.execution.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        workflow: true,
        steps: {
          orderBy: { createdAt: "asc" },
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  }

  static async getByWorkflowId(workflowId: string) {
    return prisma.execution.findMany({
      where: { workflowId },
      orderBy: { createdAt: "desc" },
      include: {
        steps: true,
        logs: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
  }
}