import type { Workflow, WorkflowNode, WorkflowEdge } from "@prisma/client";

export type WorkflowWithGraph = Workflow & {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};