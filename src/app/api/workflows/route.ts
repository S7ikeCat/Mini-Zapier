import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { WorkflowService } from "@/server/services/workflow.service";
import { createWorkflowSchema } from "@/server/validations/workflow";
import { errorResponse, successResponse } from "@/server/lib/api-response";
import { toPrismaJson } from "@/server/lib/prisma-json";
import { revalidatePath } from "next/cache";

/**
 * @swagger
 * /api/workflows:
 *   get:
 *     summary: Получить список workflows
 *     tags:
 *       - Workflows
 *     responses:
 *       200:
 *         description: Список workflows
 *   post:
 *     summary: Создать workflow
 *     tags:
 *       - Workflows
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ACTIVE, PAUSED, ARCHIVED]
 *               isEnabled:
 *                 type: boolean
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Workflow создан
 */
export async function GET() {
  try {
    const workflows = await WorkflowService.getAll();
    return successResponse(workflows, "Workflows fetched");
  } catch (error) {
    return errorResponse(
      "Failed to fetch workflows",
      500,
      error instanceof Error ? error.message : error
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createWorkflowSchema.parse(body);

    const workflow = await WorkflowService.create({
      name: data.name,
      description: data.description,
      status: data.status,
      isEnabled: data.isEnabled,
      tags: data.tags,
      settings: toPrismaJson(data.settings),
      canvas: toPrismaJson(data.canvas),
    });

    revalidatePath("/workflows");
revalidatePath(`/workflows/${workflow.id}`);

    return successResponse(workflow, "Workflow created", 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Validation error", 400, error.flatten());
    }

    return errorResponse(
      "Failed to create workflow",
      500,
      error instanceof Error ? error.message : error
    );
  }
}