import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { WorkflowService } from "@/server/services/workflow.service";
import { updateWorkflowSchema } from "@/server/validations/workflow";
import { errorResponse, successResponse } from "@/server/lib/api-response";
import { toPrismaJson } from "@/server/lib/prisma-json";

/**
 * @swagger
 * /api/workflows/{id}:
 *   get:
 *     summary: Получить workflow по ID
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
 *         description: Workflow найден
 *       404:
 *         description: Workflow не найден
 *   patch:
 *     summary: Обновить workflow
 *     tags:
 *       - Workflows
 *   delete:
 *     summary: Удалить workflow
 *     tags:
 *       - Workflows
 */
export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const workflow = await WorkflowService.getById(id);

    if (!workflow) {
      return errorResponse("Workflow not found", 404);
    }

    return successResponse(workflow, "Workflow fetched");
  } catch (error) {
    return errorResponse(
      "Failed to fetch workflow",
      500,
      error instanceof Error ? error.message : error
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const data = updateWorkflowSchema.parse(body);

    const updated = await WorkflowService.update(id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.settings !== undefined && { settings: toPrismaJson(data.settings) }),
      ...(data.canvas !== undefined && { canvas: toPrismaJson(data.canvas) }),
    });

    return successResponse(updated, "Workflow updated");
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Validation error", 400, error.flatten());
    }

    return errorResponse(
      "Failed to update workflow",
      500,
      error instanceof Error ? error.message : error
    );
  }
}

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await WorkflowService.delete(id);

    return successResponse({ id }, "Workflow deleted");
  } catch (error) {
    return errorResponse(
      "Failed to delete workflow",
      500,
      error instanceof Error ? error.message : error
    );
  }
}