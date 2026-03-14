import { Queue } from "bullmq";
import { TriggerType } from "@prisma/client";
import { getRedisConnection } from "@/server/lib/redis";

export type WorkflowJobData = {
  workflowId: string;
  triggerType: TriggerType;
  source: string;
  payload?: Record<string, unknown>;
};

let workflowQueueInstance: Queue<WorkflowJobData> | null = null;

export function getWorkflowQueue(): Queue<WorkflowJobData> {
  if (workflowQueueInstance) {
    return workflowQueueInstance;
  }

  workflowQueueInstance = new Queue<WorkflowJobData>("workflow-execution", {
    connection: getRedisConnection(),
  });

  return workflowQueueInstance;
}