import { Worker } from "bullmq";
import { redisConnection } from "@/server/lib/redis";
import { WorkflowEngineService } from "@/server/services/workflow-engine.service";
import type { WorkflowJobData } from "@/server/queues/workflow.queue";

console.log("Workflow worker booting", {
  pid: process.pid,
  startedAt: new Date().toISOString(),
});

export const workflowWorker = new Worker<WorkflowJobData, void, "workflow-run">(
  "workflow-execution",
  async (job) => {
    console.log("Workflow worker received job", {
      jobId: job.id,
      workflowId: job.data.workflowId,
      triggerType: job.data.triggerType,
      source: job.data.source,
    });

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

workflowWorker.on("ready", () => {
  console.log("Workflow worker ready", {
    pid: process.pid,
  });
});

workflowWorker.on("error", (error) => {
  console.error("Workflow worker error", error);
});

workflowWorker.on("failed", (job, error) => {
  console.error(`Workflow job failed: ${job?.id}`, error);
});