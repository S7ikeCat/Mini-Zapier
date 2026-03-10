import type { WorkflowExecutionContext } from "./workflow-context";

function getByPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const parts = path.split(".");
  let current: unknown = source;

  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function resolveTemplate(
  value: unknown,
  context: WorkflowExecutionContext
): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const fullMatch = value.match(/^\{\{\s*([^}]+)\s*\}\}$/);
  if (!fullMatch) {
    return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, rawPath) => {
      const path = String(rawPath).trim();
      const resolved = resolvePath(path, context);
      return resolved == null ? "" : String(resolved);
    });
  }

  return resolvePath(fullMatch[1].trim(), context);
}

export function resolveObjectTemplates<T>(
  input: T,
  context: WorkflowExecutionContext
): T {
  if (Array.isArray(input)) {
    return input.map((item) => resolveObjectTemplates(item, context)) as T;
  }

  if (input && typeof input === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[key] = resolveObjectTemplates(value, context);
    }

    return result as T;
  }

  return resolveTemplate(input, context) as T;
}

function resolvePath(path: string, context: WorkflowExecutionContext): unknown {
  if (path.startsWith("payload.")) {
    return getByPath(context.payload, path.replace(/^payload\./, ""));
  }

  if (path === "payload") {
    return context.payload;
  }

  if (path.startsWith("variables.")) {
    return getByPath(context.variables, path.replace(/^variables\./, ""));
  }

  if (path === "variables") {
    return context.variables;
  }

  return undefined;
}