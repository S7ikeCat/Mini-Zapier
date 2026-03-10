export type WorkflowStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
export type TriggerType = "WEBHOOK" | "SCHEDULE" | "EMAIL";
export type ActionType = "HTTP" | "EMAIL" | "TELEGRAM" | "DATABASE" | "TRANSFORM";
export type NodeKind = "TRIGGER" | "ACTION";
export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "RETRYING"
  | "PAUSED"
  | "CANCELED";

export type StepStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED"
  | "RETRYING";

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowCanvasNode {
  id: string;
  kind: NodeKind;
  type: string;
  name: string;
  description?: string | null;
  position: WorkflowNodePosition;
  config: Record<string, unknown>;
  retryLimit: number;
  retryDelayMs: number;
  timeoutMs?: number | null;
  isEnabled: boolean;
  sortOrder: number;
}

export interface WorkflowCanvasEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string | null;
}