import { prisma } from "@/shared/lib/prisma";
import { toPrismaJson } from "@/server/lib/prisma-json";
import {
  ExecutionStatus,
  LogLevel,
  StepStatus,
  TriggerType,
  type WorkflowNode,
} from "@prisma/client";
import { createExecutionContext } from "@/server/lib/workflow-context";
import type { WorkflowExecutionContext } from "@/server/lib/workflow-context";
import { resolveObjectTemplates } from "@/server/lib/workflow-value";
import { sleep, withTimeout } from "@/server/lib/async-utils";
import { getErrorMessage } from "@/server/lib/error-utils";
import { WorkflowNotificationService } from "./workflow-notification.service";

type RunWorkflowInput = {
  workflowId: string;
  triggerType: TriggerType;
  source: string;
  payload?: Record<string, unknown>;
};

type RunNodeInput = {
  executionId: string;
  node: WorkflowNode;
  context: WorkflowExecutionContext;
};

function isSelfWebhookCall(
  url: string,
  source: string
): boolean {
  if (!source.startsWith("webhook:")) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const sourcePath = source.replace("webhook:", "").trim();
    const targetPath = parsedUrl.pathname.replace(/^\/api\/hooks\//, "").trim();

    const isLocalhost =
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1";

    return (
      isLocalhost &&
      parsedUrl.pathname.startsWith("/api/hooks/") &&
      targetPath.length > 0 &&
      targetPath === sourcePath
    );
  } catch {
    return false;
  }
}

export class WorkflowEngineService {
  static async run(input: RunWorkflowInput) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: input.workflowId },
      include: {
        nodes: {
          orderBy: { sortOrder: "asc" },
        },
        edges: true,
      },
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const executionContext = createExecutionContext({
      triggerType: input.triggerType === "WEBHOOK" ? "WEBHOOK" : "MANUAL",
      source: input.source,
      payload: input.payload,
    });

    const execution = await prisma.execution.create({
      data: {
        workflowId: workflow.id,
        status: ExecutionStatus.RUNNING,
        triggerType: input.triggerType,
        startedAt: new Date(),
        inputPayload: toPrismaJson(input.payload ?? {}),
        source: input.source,
      },
    });

    try {
      for (const node of workflow.nodes) {
        if (!node.isEnabled) {
          continue;
        }

        await this.runNode({
          executionId: execution.id,
          node,
          context: executionContext,
        });
      }

      const finishedAt = new Date();

      const updated = await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.SUCCESS,
          finishedAt,
          durationMs:
            finishedAt.getTime() -
            (execution.startedAt?.getTime() ?? finishedAt.getTime()),
          outputPayload: toPrismaJson(executionContext.variables),
        },
        include: {
          workflow: true,
          steps: {
            orderBy: { createdAt: "asc" },
          },
          logs: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });

      return updated;
    } catch (error) {
      const finishedAt = new Date();
      const errorMessage =
        error instanceof Error ? error.message : "Unknown workflow error";

      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          finishedAt,
          durationMs:
            finishedAt.getTime() -
            (execution.startedAt?.getTime() ?? finishedAt.getTime()),
          errorMessage,
        },
      });

      await prisma.executionLog.create({
        data: {
          executionId: execution.id,
          level: LogLevel.ERROR,
          message: errorMessage,
        },
      });

      await WorkflowNotificationService.notifyFailure({
        workflowId: workflow.id,
        workflowName: workflow.name,
        executionId: execution.id,
        errorMessage,
        source: input.source,
      });

      throw error;
    }
  }

  private static async runNode(input: RunNodeInput) {
    const { executionId, node, context } = input;

    const step = await prisma.executionStep.create({
      data: {
        executionId,
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        status: StepStatus.RUNNING,
        startedAt: new Date(),
        inputPayload: toPrismaJson({
          payload: context.payload,
          variables: context.variables,
        }),
      },
    });

    await prisma.executionLog.create({
      data: {
        executionId,
        stepId: step.id,
        level: LogLevel.INFO,
        message: `Started node: ${node.name}`,
        meta: toPrismaJson({
          retryLimit: node.retryLimit,
          retryDelayMs: node.retryDelayMs,
          timeoutMs: node.timeoutMs,
        }),
      },
    });

    const maxAttempts = Math.max(1, node.retryLimit + 1);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (attempt > 1) {
        await prisma.execution.update({
          where: { id: executionId },
          data: { status: ExecutionStatus.RUNNING },
        });

        await prisma.executionStep.update({
          where: { id: step.id },
          data: {
            status: StepStatus.RUNNING,
            errorMessage: null,
            finishedAt: null,
          },
        });
      }

      try {
        const output = await withTimeout(
          this.executeNode(node, context),
          node.timeoutMs,
          `Node "${node.name}" timed out after ${node.timeoutMs}ms`
        );

        const finishedAt = new Date();
        const retryCount = attempt - 1;

        await prisma.executionStep.update({
          where: { id: step.id },
          data: {
            status: StepStatus.SUCCESS,
            finishedAt,
            durationMs:
              finishedAt.getTime() -
              (step.startedAt?.getTime() ?? finishedAt.getTime()),
            outputPayload: toPrismaJson(output),
            retryCount,
            errorMessage: null,
          },
        });

        await prisma.executionLog.create({
          data: {
            executionId,
            stepId: step.id,
            level: LogLevel.INFO,
            message: `Completed node: ${node.name}`,
            meta: toPrismaJson({
              attempt,
              attemptsUsed: attempt,
              retryCount,
              output:
                output && typeof output === "object"
                  ? output
                  : { value: output },
            }),
          },
        });

        return;
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        const retryCount = attempt - 1;
        const canRetry = attempt < maxAttempts;

        if (canRetry) {
          await prisma.execution.update({
            where: { id: executionId },
            data: {
              status: ExecutionStatus.RETRYING,
              retryCount: {
                increment: 1,
              },
            },
          });

          await prisma.executionStep.update({
            where: { id: step.id },
            data: {
              status: StepStatus.RETRYING,
              retryCount: attempt,
              errorMessage,
            },
          });

          await prisma.executionLog.create({
            data: {
              executionId,
              stepId: step.id,
              level: LogLevel.WARN,
              message: `Retrying node: ${node.name}`,
              meta: toPrismaJson({
                attempt,
                nextAttempt: attempt + 1,
                maxAttempts,
                retryDelayMs: node.retryDelayMs,
                error: errorMessage,
              }),
            },
          });

          await sleep(node.retryDelayMs);
          continue;
        }

        const finishedAt = new Date();

        await prisma.executionStep.update({
          where: { id: step.id },
          data: {
            status: StepStatus.FAILED,
            finishedAt,
            durationMs:
              finishedAt.getTime() -
              (step.startedAt?.getTime() ?? finishedAt.getTime()),
            errorMessage,
            retryCount,
          },
        });

        await prisma.executionLog.create({
          data: {
            executionId,
            stepId: step.id,
            level: LogLevel.ERROR,
            message: `Node failed: ${node.name}`,
            meta: toPrismaJson({
              attempt,
              maxAttempts,
              error: errorMessage,
            }),
          },
        });

        throw error;
      }
    }
  }

  private static async executeNode(
    node: WorkflowNode,
    context: WorkflowExecutionContext
  ): Promise<unknown> {
    const rawConfig =
      node.config && typeof node.config === "object"
        ? (node.config as Record<string, unknown>)
        : {};

    const config = resolveObjectTemplates(rawConfig, context);

    switch (node.type) {
      case "WEBHOOK": {
        context.variables[node.id] = {
          accepted: true,
          payload: context.payload,
        };

        return context.variables[node.id];
      }

      case "TRANSFORM": {
        const mapping =
          config.mapping && typeof config.mapping === "object"
            ? (config.mapping as Record<string, unknown>)
            : {};

        context.variables[node.id] = mapping;
        return mapping;
      }

      case "HTTP": {
        const method = String(config.method ?? "GET").toUpperCase();
        const url = String(config.url ?? "");
      
        if (!url) {
          throw new Error(`HTTP node "${node.name}" is missing URL`);
        }
      
        if (isSelfWebhookCall(url, context.trigger.source)) {
          throw new Error(
            `HTTP node "${node.name}" attempted to call its own webhook endpoint: ${url}`
          );
        }

        const body = config.body;
        const headers =
          config.headers && typeof config.headers === "object"
            ? (config.headers as Record<string, string>)
            : {};

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
        });

        const text = await response.text();

        const output = {
          status: response.status,
          ok: response.ok,
          body: text,
        };

        if (!response.ok) {
          throw new Error(
            `HTTP node "${node.name}" failed with status ${response.status}`
          );
        }

        context.variables[node.id] = output;
        return output;
      }

      case "DATABASE": {
        const operation = String(config.operation ?? "log");

        const output = {
          operation,
          stored: true,
          at: new Date().toISOString(),
        };

        context.variables[node.id] = output;
        return output;
      }

      case "TELEGRAM": {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId =
          String(config.chatId ?? "") || process.env.TELEGRAM_DEFAULT_CHAT_ID;
        const text = String(config.text ?? "Workflow notification");

        if (!token || !chatId) {
          const mockOutput = {
            simulated: true,
            reason: "Telegram env vars are not configured",
            text,
          };

          context.variables[node.id] = mockOutput;
          return mockOutput;
        }

        const response = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: chatId,
              text,
            }),
          }
        );

        const json = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          throw new Error(`Telegram node "${node.name}" failed`);
        }

        context.variables[node.id] = json;
        return json;
      }

      case "EMAIL": {
        const output = {
          simulated: true,
          reason: "Email execution is not configured yet",
        };

        context.variables[node.id] = output;
        return output;
      }

      default: {
        const output = {
          skipped: true,
          reason: `Unknown node type: ${node.type}`,
        };

        context.variables[node.id] = output;
        return output;
      }
    }
  }
}