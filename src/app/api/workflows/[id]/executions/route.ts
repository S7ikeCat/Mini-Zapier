import { ExecutionService } from "@/server/services/execution.service";
import { errorResponse, successResponse } from "@/server/lib/api-response";

type Params = {
  params: {
    id: string;
  };
};

/**
 * @swagger
 * /api/workflows/{id}/executions:
 *   get:
 *     summary: Получить executions конкретного workflow
 *     tags:
 *       - Executions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список executions
 */
export async function GET(_: Request, { params }: Params) {
  try {
    const executions = await ExecutionService.getByWorkflowId(params.id);

    return successResponse(executions, "Workflow executions fetched");
  } catch (error) {
    return errorResponse(
      "Failed to fetch workflow executions",
      500,
      error instanceof Error ? error.message : error
    );
  }
}