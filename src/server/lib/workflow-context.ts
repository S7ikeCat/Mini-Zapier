export type WorkflowExecutionContext = {
    trigger: {
      type: "WEBHOOK" | "SCHEDULE" | "EMAIL" | "MANUAL";
      source: string;
    };
    payload: Record<string, unknown>;
    variables: Record<string, unknown>;
  };
  
  export function createExecutionContext(input: {
    triggerType: WorkflowExecutionContext["trigger"]["type"];
    source: string;
    payload?: Record<string, unknown>;
  }): WorkflowExecutionContext {
    return {
      trigger: {
        type: input.triggerType,
        source: input.source,
      },
      payload: input.payload ?? {},
      variables: {},
    };
  }