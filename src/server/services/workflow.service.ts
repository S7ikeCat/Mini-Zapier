import { prisma } from "@/shared/lib/prisma";
import type { Prisma } from "@prisma/client";

export class WorkflowService {
  static async getAll() {
    return prisma.workflow.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        nodes: true,
        edges: true,
        executions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        webhookEndpoints: true,
        scheduleTrigger: true,
        emailTrigger: true,
      },
    });
  }

  static async getById(id: string) {
    return prisma.workflow.findUnique({
      where: { id },
      include: {
        nodes: true,
        edges: true,
        executions: {
          orderBy: { createdAt: "desc" },
          include: {
            steps: true,
            logs: {
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        },
        webhookEndpoints: true,
        scheduleTrigger: true,
        emailTrigger: true,
      },
    });
  }

  static async create(data: Prisma.WorkflowCreateInput) {
    return prisma.workflow.create({
      data,
      include: {
        nodes: true,
        edges: true,
      },
    });
  }

  static async update(id: string, data: Prisma.WorkflowUpdateInput) {
    return prisma.workflow.update({
      where: { id },
      data,
      include: {
        nodes: true,
        edges: true,
        webhookEndpoints: true,
        scheduleTrigger: true,
        emailTrigger: true,
      },
    });
  }

  static async delete(id: string) {
    return prisma.workflow.delete({
      where: { id },
    });
  }
}