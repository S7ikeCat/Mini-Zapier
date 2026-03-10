import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/server/lib/api-response";
import { WorkflowRunService } from "@/server/services/workflow-run.service";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = await WorkflowRunService.runWorkflow(id);

    return successResponse(result, "Workflow executed successfully");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown workflow error";

    return errorResponse(errorMessage, 500, {
      code: "WORKFLOW_RUN_FAILED",
      error: errorMessage,
    });
  }
}