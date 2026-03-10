import { ExecutionService } from "@/server/services/execution.service";
import { errorResponse, successResponse } from "@/server/lib/api-response";

/**
 * @swagger
 * /api/executions:
 *   get:
 *     summary: Получить список executions
 *     tags:
 *       - Executions
 *     responses:
 *       200:
 *         description: Список executions
 */
export async function GET() {
  try {
    const executions = await ExecutionService.getAll();
    return successResponse(executions, "Executions fetched");
  } catch (error) {
    return errorResponse(
      "Failed to fetch executions",
      500,
      error instanceof Error ? error.message : error
    );
  }
}