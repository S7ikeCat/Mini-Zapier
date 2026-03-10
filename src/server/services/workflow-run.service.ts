import { TriggerType } from "@prisma/client";
import { WorkflowExecutionService } from "./workflow-execution.service";

export class WorkflowRunService {
  static async runWorkflow(workflowId: string) {
    return WorkflowExecutionService.execute({
      workflowId,
      triggerType: TriggerType.WEBHOOK,
      source: "editor/manual-run",
      payload: {
        source: "manual-run",
        workflowId,
      },
    });
  }
}