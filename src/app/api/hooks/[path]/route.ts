import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { getWorkflowQueue } from "@/server/queues/workflow.queue";
import { TriggerType } from "@prisma/client";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string }> }
) {
  try {
    const { path } = await context.params;

    console.log("Webhook hit", {
      path,
      userAgent: request.headers.get("user-agent"),
    });

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

    const workflowQueue = getWorkflowQueue();

    const job = await workflowQueue.add("workflow-run", {
      workflowId: endpoint.workflowId,
      triggerType: TriggerType.WEBHOOK,
      source: `webhook:${path}`,
      payload: body,
    });

    return NextResponse.json({
      success: true,
      message: "Webhook execution queued",
      data: {
        jobId: job.id,
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