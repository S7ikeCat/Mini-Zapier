import { prisma } from "@/shared/lib/prisma";
import { Prisma, type WorkflowNode } from "@prisma/client";

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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isActiveTriggerNode(node: WorkflowNode): boolean {
  if (node.kind !== "TRIGGER" || node.isEnabled !== true) {
    return false;
  }

  const config = asRecord(node.config);

  switch (node.type) {
    case "WEBHOOK":
      return getString(config.path).length > 0;

    case "SCHEDULE":
      return getString(config.cron).length > 0;

    case "EMAIL":
      return true;

    default:
      return false;
  }
}

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

      const savedNodes = await tx.workflowNode.findMany({
        where: { workflowId: input.workflowId },
      });

      const hasActiveTrigger = savedNodes.some(isActiveTriggerNode);

      await tx.workflow.update({
        where: { id: input.workflowId },
        data: {
          canvas: (input.canvas ?? {}) as Prisma.InputJsonValue,
          isEnabled: hasActiveTrigger,
          status: hasActiveTrigger ? "ACTIVE" : "DRAFT",
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