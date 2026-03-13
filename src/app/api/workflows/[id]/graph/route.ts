import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { errorResponse, successResponse } from "@/server/lib/api-response";
import { saveWorkflowGraphSchema } from "@/server/validations/workflow-graph";
import { WorkflowGraphService } from "@/server/services/workflow-graph.service";
import { prisma } from "@/shared/lib/prisma";

type GraphNodeInput = {
  type: string;
  kind: "TRIGGER" | "ACTION";
  config: Record<string, unknown>;
  isEnabled: boolean;
};

function getWebhookPathsFromNodes(nodes: GraphNodeInput[]): string[] {
  const uniquePaths = new Set<string>();

  for (const node of nodes) {
    if (node.kind !== "TRIGGER" || node.type !== "WEBHOOK") {
      continue;
    }

    if (node.isEnabled !== true) {
      continue;
    }

    const rawPath =
      typeof node.config?.path === "string" ? node.config.path.trim() : "";

    if (!rawPath) {
      continue;
    }

    uniquePaths.add(rawPath);
  }

  return Array.from(uniquePaths);
}

/**
 * @swagger
 * /api/workflows/{id}/graph:
 *   put:
 *     summary: Сохранить graph workflow
 *     tags:
 *       - Workflows
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Graph сохранён
 */

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    console.log("!!GRAPH SAVE DEBUG!!", JSON.stringify(body, null, 2));
    const data = saveWorkflowGraphSchema.parse(body);

    const webhookPaths = getWebhookPathsFromNodes(
      data.nodes as GraphNodeInput[]
    );

    for (const path of webhookPaths) {
      const existingByPath = await prisma.webhookEndpoint.findUnique({
        where: { path },
      });

      if (existingByPath && existingByPath.workflowId !== id) {
        return errorResponse(
          `Webhook path "${path}" is already used by another workflow`,
          409
        );
      }
    }
    console.log("!!!!GRAPH SAVE DEBUG", JSON.stringify(body, null, 2));
    const result = await WorkflowGraphService.saveGraph({
      workflowId: id,
      nodes: data.nodes,
      edges: data.edges,
      canvas: data.canvas,
    });

    const existingEndpoints = await prisma.webhookEndpoint.findMany({
      where: {
        workflowId: id,
      },
    });

    const nextPathSet = new Set(webhookPaths);

    const endpointsToDelete = existingEndpoints
      .filter((endpoint) => !nextPathSet.has(endpoint.path))
      .map((endpoint) => endpoint.path);

    if (endpointsToDelete.length > 0) {
      await prisma.webhookEndpoint.deleteMany({
        where: {
          workflowId: id,
          path: {
            in: endpointsToDelete,
          },
        },
      });
    }

    for (const path of webhookPaths) {
      await prisma.webhookEndpoint.upsert({
        where: { path },
        update: {
          workflowId: id,
          isActive: true,
        },
        create: {
          workflowId: id,
          path,
          isActive: true,
        },
      });
    }

    return successResponse(result, "Workflow graph saved");
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Validation error", 400, error.flatten());
    }

    return errorResponse(
      "Failed to save workflow graph",
      500,
      error instanceof Error ? error.message : error
    );
    
  }
}