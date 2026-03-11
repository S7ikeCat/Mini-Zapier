import { NextRequest } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { errorResponse, successResponse } from "@/server/lib/api-response";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const executions = await prisma.execution.findMany({
      where: {
        workflowId: id,
      },
      orderBy: [
        { startedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 10,
      include: {
        steps: {
          orderBy: { createdAt: "asc" },
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
      },
    });

    return successResponse(
      executions.map((execution) => ({
        executionId: execution.id,
        triggerType: execution.triggerType,
        status: execution.status,
        durationMs: execution.durationMs,
        updatedAt:
          execution.finishedAt?.toISOString() ??
          execution.startedAt?.toISOString() ??
          execution.createdAt.toISOString(),
        steps: execution.steps.map((step) => ({
          id: step.id,
          nodeName: step.nodeName,
          status: step.status,
          durationMs: step.durationMs,
        })),
        logs: execution.logs.map((log) => ({
          id: log.id,
          level: log.level,
          message: log.message,
        })),
      })),
      "Live executions fetched"
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown live execution fetch error";

    return errorResponse(errorMessage, 500, {
      code: "LIVE_EXECUTIONS_FETCH_FAILED",
      error: errorMessage,
    });
  }
}