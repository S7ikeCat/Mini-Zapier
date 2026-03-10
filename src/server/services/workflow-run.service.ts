import { TriggerType } from "@prisma/client";
import { WorkflowEngineService } from "./workflow-engine.service";

export class WorkflowRunService {
  static async runWorkflow(workflowId: string) {
    return WorkflowEngineService.run({
      workflowId,
      triggerType: TriggerType.SCHEDULE,
      source: "editor/manual-run",
      payload: {
        source: "manual-run",
        workflowId,
      },
    });
  }
}