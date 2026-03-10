import { Worker } from "bullmq";
import { redisConnection } from "@/server/lib/redis";
import { WorkflowEngineService } from "@/server/services/workflow-engine.service";
import type { WorkflowJobData } from "@/server/queues/workflow.queue";

export const workflowWorker = new Worker<WorkflowJobData, void, "workflow-run">(
  "workflow-execution",
  async (job) => {
    const { workflowId, triggerType, source, payload } = job.data;

    await WorkflowEngineService.run({
      workflowId,
      triggerType,
      source,
      payload,
    });
  },
  {
    connection: redisConnection,
  }
);

workflowWorker.on("failed", (job, error) => {
  console.error(`Workflow job failed: ${job?.id}`, error);
});