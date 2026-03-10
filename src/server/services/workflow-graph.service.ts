import { prisma } from "@/shared/lib/prisma";
import { Prisma } from "@prisma/client";

type SaveWorkflowGraphInput = {
  workflowId: string;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    kind: "TRIGGER" | "ACTION";
    positionX: number;
    positionY: number;
    config?: Record<string, unknown>;
    description?: string | null;
    retryLimit?: number;
    retryDelayMs?: number;
    timeoutMs?: number | null;
    isEnabled?: boolean;
    sortOrder?: number;
  }>;
  edges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    label?: string | null;
  }>;
  canvas?: Record<string, unknown>;
};

export class WorkflowGraphService {
  static async saveGraph(input: SaveWorkflowGraphInput) {
    return prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.findUnique({
        where: { id: input.workflowId },
        select: { id: true },
      });

      if (!workflow) {
        throw new Error("Workflow not found");
      }

      await tx.workflowNode.deleteMany({
        where: { workflowId: input.workflowId },
      });

      await tx.workflowEdge.deleteMany({
        where: { workflowId: input.workflowId },
      });

      if (input.nodes.length > 0) {
        await tx.workflowNode.createMany({
          data: input.nodes.map((node, index) => ({
            id: node.id,
            workflowId: input.workflowId,
            name: node.name,
            type: node.type,
            kind: node.kind,
            description: node.description ?? null,
            positionX: node.positionX,
            positionY: node.positionY,
            config: (node.config ?? {}) as Prisma.InputJsonValue,
            retryLimit: node.retryLimit ?? 0,
            retryDelayMs: node.retryDelayMs ?? 0,
            timeoutMs: node.timeoutMs ?? null,
            isEnabled: node.isEnabled ?? true,
            sortOrder: node.sortOrder ?? index,
          })),
        });
      }

      if (input.edges.length > 0) {
        await tx.workflowEdge.createMany({
          data: input.edges.map((edge) => ({
            id: edge.id,
            workflowId: input.workflowId,
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            label: edge.label ?? null,
          })),
        });
      }

      await tx.workflow.update({
        where: { id: input.workflowId },
        data: {
          canvas: (input.canvas ?? {}) as Prisma.InputJsonValue,
        },
      });

      return tx.workflow.findUnique({
        where: { id: input.workflowId },
        include: {
          nodes: true,
          edges: true,
        },
      });
    });
  }
}