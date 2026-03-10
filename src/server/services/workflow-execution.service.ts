import { TriggerType } from "@prisma/client";
import { WorkflowEngineService } from "./workflow-engine.service";

export type ExecuteWorkflowInput = {
  workflowId: string;
  triggerType: TriggerType;
  source: string;
  payload?: Record<string, unknown>;
};

export class WorkflowExecutionService {
  static async execute(input: ExecuteWorkflowInput) {
    return WorkflowEngineService.run({
      workflowId: input.workflowId,
      triggerType: input.triggerType,
      source: input.source,
      payload: input.payload,
    });
  }
}