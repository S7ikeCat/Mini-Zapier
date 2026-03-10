export type ExecutionStepDto = {
    id: string;
    nodeName: string;
    status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "RETRYING";
    durationMs: number | null;
  };
  
  export type ExecutionLogDto = {
    id: string;
    level: "INFO" | "WARN" | "ERROR" | "DEBUG";
    message: string;
  };
  
  export type WorkflowExecutionResult = {
    status: "RUNNING" | "SUCCESS" | "FAILED" | "RETRYING";
    durationMs: number | null;
    steps: ExecutionStepDto[];
    logs: ExecutionLogDto[];
  };