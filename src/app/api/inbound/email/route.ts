import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { getWorkflowQueue } from "@/server/queues/workflow.queue";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const workflowId =
      typeof body.workflowId === "string" ? body.workflowId : null;

    if (!workflowId) {
      return NextResponse.json(
        {
          success: false,
          message: "workflowId is required",
        },
        { status: 400 }
      );
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        nodes: true,
      },
    });

    if (!workflow || !workflow.isEnabled) {
      return NextResponse.json(
        {
          success: false,
          message: "Workflow not found or inactive",
        },
        { status: 404 }
      );
    }

    const emailTriggerNode = workflow.nodes.find(
      (node) => node.kind === "TRIGGER" && node.type === "EMAIL_TRIGGER"
    );

    if (!emailTriggerNode || !emailTriggerNode.isEnabled) {
      return NextResponse.json(
        {
          success: false,
          message: "Email trigger node not found or inactive",
        },
        { status: 404 }
      );
    }

    const workflowQueue = getWorkflowQueue();

    const job = await workflowQueue.add("workflow-run", {
      workflowId: workflow.id,
      triggerType: "EMAIL",
      source: "email:inbound",
      payload: {
        from: typeof body.from === "string" ? body.from : "",
        to: typeof body.to === "string" ? body.to : "",
        subject: typeof body.subject === "string" ? body.subject : "",
        text: typeof body.text === "string" ? body.text : "",
        html: typeof body.html === "string" ? body.html : "",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email execution queued",
      data: {
        jobId: job.id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to execute inbound email",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}