import { TriggerType } from "@prisma/client";
import { getWorkflowQueue } from "@/server/queues/workflow.queue";

export class WorkflowRunService {
  static async runWorkflow(workflowId: string) {
    const workflowQueue = getWorkflowQueue();

    const job = await workflowQueue.add("workflow-run", {
      workflowId,
      triggerType: TriggerType.WEBHOOK,
      source: "editor/manual-run",
      payload: {
        source: "manual-run",
        workflowId,
      },
    });

    return {
      queued: true,
      jobId: job.id ?? null,
      workflowId,
    };
  }
}