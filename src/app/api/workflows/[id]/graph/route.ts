import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { errorResponse, successResponse } from "@/server/lib/api-response";
import { saveWorkflowGraphSchema } from "@/server/validations/workflow-graph";
import { WorkflowGraphService } from "@/server/services/workflow-graph.service";

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
    const data = saveWorkflowGraphSchema.parse(body);

    const result = await WorkflowGraphService.saveGraph({
      workflowId: id,
      nodes: data.nodes,
      edges: data.edges,
      canvas: data.canvas,
    });

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