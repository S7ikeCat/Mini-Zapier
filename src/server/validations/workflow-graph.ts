import { z } from "zod";

export const workflowGraphNodeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.string().min(1),
  kind: z.enum(["TRIGGER", "ACTION"]),
  positionX: z.number(),
  positionY: z.number(),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  description: z.string().nullable().optional(),
  retryLimit: z.number().int().min(0).optional().default(0),
  retryDelayMs: z.number().int().min(0).optional().default(0),
  timeoutMs: z.number().int().min(0).nullable().optional(),
  isEnabled: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const workflowGraphEdgeSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  label: z.string().nullable().optional(),
});

export const saveWorkflowGraphSchema = z.object({
  nodes: z.array(workflowGraphNodeSchema),
  edges: z.array(workflowGraphEdgeSchema),
  canvas: z.record(z.string(), z.unknown()).optional().default({}),
});