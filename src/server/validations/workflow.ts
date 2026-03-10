import { z } from "zod";

export const workflowStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
]);

const jsonValueSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

export const createWorkflowSchema = z.object({
  name: z.string().min(3, "Название должно быть не короче 3 символов"),
  description: z.string().optional().nullable(),
  status: workflowStatusSchema.optional().default("DRAFT"),
  isEnabled: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
  settings: jsonValueSchema.optional(),
  canvas: jsonValueSchema.optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional().nullable(),
  status: workflowStatusSchema.optional(),
  isEnabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  settings: jsonValueSchema.optional(),
  canvas: jsonValueSchema.optional(),
});