import { LogService } from "@/server/services/log.service";
import { errorResponse, successResponse } from "@/server/lib/api-response";

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Получить execution logs
 *     tags:
 *       - Logs
 *     responses:
 *       200:
 *         description: Список логов
 */
export async function GET() {
  try {
    const logs = await LogService.getAll();
    return successResponse(logs, "Logs fetched");
  } catch (error) {
    return errorResponse(
      "Failed to fetch logs",
      500,
      error instanceof Error ? error.message : error
    );
  }
}