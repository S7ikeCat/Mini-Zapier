import { Queue } from "bullmq";
import { TriggerType } from "@prisma/client";
import { redisConnection } from "@/server/lib/redis";

export type WorkflowJobData = {
  workflowId: string;
  triggerType: TriggerType;
  source: string;
  payload?: Record<string, unknown>;
};

export const workflowQueue = new Queue<WorkflowJobData>(
  "workflow-execution",
  {
    connection: redisConnection,
  }
);
