import { NextRequest, NextResponse } from "next/server";
import { TriggerType } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { WorkflowEngineService } from "@/server/services/workflow-engine.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string }> }
) {
  try {
    const { path } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { path },
      include: {
        workflow: true,
      },
    });

    if (!endpoint || !endpoint.isActive || !endpoint.workflow.isEnabled) {
      return NextResponse.json(
        {
          success: false,
          message: "Webhook endpoint not found or inactive",
        },
        { status: 404 }
      );
    }

    const result = await WorkflowEngineService.run({
      workflowId: endpoint.workflowId,
      triggerType: TriggerType.WEBHOOK,
      source: `webhook:${path}`,
      payload: body,
    });

    return NextResponse.json({
      success: true,
      message: "Webhook executed successfully",
      data: {
        executionId: result.id,
        status: result.status,
        durationMs: result.durationMs,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to execute webhook",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}