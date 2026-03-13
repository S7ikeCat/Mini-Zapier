import { NextRequest } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { errorResponse, successResponse } from "@/server/lib/api-response";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        webhookEndpoints: true,
      },
    });

    if (!workflow) {
      return errorResponse("Workflow not found", 404);
    }

    return successResponse({
      workflowId: workflow.id,
      webhooks: workflow.webhookEndpoints.map((endpoint) => ({
        path: endpoint.path,
        isActive: endpoint.isActive,
        url: `${process.env.APP_WEBHOOK_BASE_URL}/api/hooks/${endpoint.path}`,
      })),
    });
  } catch (error) {
    return errorResponse(
      "Failed to fetch webhook info",
      500,
      error instanceof Error ? error.message : error
    );
  }
}