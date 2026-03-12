import { prisma } from "@/shared/lib/prisma";
import { toPrismaJson } from "@/server/lib/prisma-json";
import {
  ExecutionStatus,
  LogLevel,
  StepStatus,
  TriggerType,
  type WorkflowEdge,
  type WorkflowNode,
} from "@prisma/client";

import nodemailer from "nodemailer";
import type { SentMessageInfo } from "nodemailer";
import { Client } from "pg";
import { createExecutionContext } from "@/server/lib/workflow-context";
import type { WorkflowExecutionContext } from "@/server/lib/workflow-context";
import {
  resolveObjectTemplates,
  resolveTemplate,
} from "@/server/lib/workflow-value";
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
function resolveStringValue(
  value: unknown,
  context: WorkflowExecutionContext,
  fallback = ""
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const resolved = resolveValue(value, context);

  return typeof resolved === "string" ? resolved : fallback;
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
      triggerType: this.resolveContextTriggerType(input),
      source: input.source,
      payload: input.payload,
    });

    const executionPlan = this.buildExecutionPlan({
      nodes: workflow.nodes,
      edges: workflow.edges,
      triggerType: input.triggerType,
      source: input.source,
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
      for (const node of executionPlan) {
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


  private static isManualSource(source: string): boolean {
    return source === "editor/manual-run";
  }

  private static resolveContextTriggerType(input: RunWorkflowInput): WorkflowExecutionContext["trigger"]["type"] {
    if (this.isManualSource(input.source)) {
      return "MANUAL";
    }

    switch (input.triggerType) {
      case TriggerType.WEBHOOK:
        return "WEBHOOK";
      case TriggerType.SCHEDULE:
        return "SCHEDULE";
      case TriggerType.EMAIL:
        return "EMAIL_TRIGGER";
      default:
        return "MANUAL";
    }
  }

  private static getTriggerNodeType(triggerType: TriggerType): string {
    switch (triggerType) {
      case TriggerType.WEBHOOK:
        return "WEBHOOK";
      case TriggerType.SCHEDULE:
        return "SCHEDULE";
      case TriggerType.EMAIL:
        return "EMAIL_TRIGGER";
      default:
        return "WEBHOOK";
    }
  }

  private static sortNodes(nodes: WorkflowNode[]): WorkflowNode[] {
    return [...nodes].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      if (a.positionY !== b.positionY) {
        return a.positionY - b.positionY;
      }

      if (a.positionX !== b.positionX) {
        return a.positionX - b.positionX;
      }

      return a.name.localeCompare(b.name);
    });
  }

  private static buildExecutionPlan(params: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    triggerType: TriggerType;
    source: string;
  }): WorkflowNode[] {
    const enabledNodes = params.nodes.filter((node) => node.isEnabled);
    if (enabledNodes.length === 0) {
      return [];
    }

    const enabledNodeIds = new Set(enabledNodes.map((node) => node.id));
    const enabledEdges = params.edges.filter(
      (edge) =>
        enabledNodeIds.has(edge.sourceNodeId) &&
        enabledNodeIds.has(edge.targetNodeId)
    );

    const nodeMap = new Map(enabledNodes.map((node) => [node.id, node]));
    const incomingMap = new Map<string, string[]>();
    const outgoingMap = new Map<string, string[]>();

    for (const node of enabledNodes) {
      incomingMap.set(node.id, []);
      outgoingMap.set(node.id, []);
    }

    for (const edge of enabledEdges) {
      incomingMap.get(edge.targetNodeId)?.push(edge.sourceNodeId);
      outgoingMap.get(edge.sourceNodeId)?.push(edge.targetNodeId);
    }

    const isManualRun = this.isManualSource(params.source);
    const triggerNodeType = this.getTriggerNodeType(params.triggerType);

    const triggerStartNodes = enabledNodes.filter((node) => {
      if (node.kind !== "TRIGGER") {
        return false;
      }

      if (isManualRun) {
        return true;
      }

      return node.type === triggerNodeType;
    });

    const rootNodes = enabledNodes.filter((node) => {
      const incoming = incomingMap.get(node.id) ?? [];
      return incoming.length === 0;
    });


    
    const startNodes = triggerStartNodes.length > 0 ? triggerStartNodes : rootNodes;
    const reachableNodeIds = new Set<string>();
    const queue: string[] = this.sortNodes(startNodes).map((node) => node.id);

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || reachableNodeIds.has(currentId)) {
        continue;
      }

      reachableNodeIds.add(currentId);

      for (const nextId of outgoingMap.get(currentId) ?? []) {
        if (!reachableNodeIds.has(nextId)) {
          queue.push(nextId);
        }
      }
    }

    const reachableNodes = enabledNodes.filter((node) => reachableNodeIds.has(node.id));
    if (reachableNodes.length === 0) {
      return [];
    }

    const reachableIncomingCount = new Map<string, number>();
    for (const node of reachableNodes) {
      const incoming = (incomingMap.get(node.id) ?? []).filter((sourceId) =>
        reachableNodeIds.has(sourceId)
      );
      reachableIncomingCount.set(node.id, incoming.length);
    }
    
    const ready: WorkflowNode[] = this.sortNodes(
      reachableNodes.filter((node) => (reachableIncomingCount.get(node.id) ?? 0) === 0)
    );

    const ordered: WorkflowNode[] = [];

    while (ready.length > 0) {
      const current = ready.shift();
      if (!current) {
        continue;
      }

      ordered.push(current);

      for (const nextId of outgoingMap.get(current.id) ?? []) {
        if (!reachableNodeIds.has(nextId)) {
          continue;
        }

        const nextCount = (reachableIncomingCount.get(nextId) ?? 0) - 1;
        reachableIncomingCount.set(nextId, nextCount);

        if (nextCount === 0) {
          const nextNode = nodeMap.get(nextId);
          if (nextNode) {
            ready.push(nextNode);
            ready.sort((a, b) => {
              if (a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
              }

              if (a.positionY !== b.positionY) {
                return a.positionY - b.positionY;
              }

              if (a.positionX !== b.positionX) {
                return a.positionX - b.positionX;
              }

              return a.name.localeCompare(b.name);
            });
          }
        }
      }
    }

    if (ordered.length !== reachableNodes.length) {
      throw new Error(
        "Workflow graph contains a cycle or invalid dependency chain"
      );
    }

    return ordered;
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
      
        const result: Record<string, unknown> = { ...mapping };
      
        context.variables[node.id] = result;
        context.payload = result;
      
        return result;
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
        const connectionString =
          typeof config.connectionString === "string" &&
          config.connectionString.trim().length > 0
            ? config.connectionString.trim()
            : null;
      
        const query =
          typeof config.query === "string" && config.query.trim().length > 0
            ? config.query.trim()
            : null;
      
        if (!connectionString || !query) {
          const output = {
            simulated: true,
            reason: "Database connection string or query is missing",
          };
      
          context.variables[node.id] = output;
          return output;
        }
      
        const client = new Client({
          connectionString,
        });
      
        await client.connect();
      
        try {
          const result = await client.query(query);
      
          const output = {
            rowCount: result.rowCount ?? 0,
            rows: result.rows,
            command: result.command,
          };
      
          context.variables[node.id] = output;
          return output;
        } finally {
          await client.end();
        }
      }

      case "TELEGRAM": {
        const configuredBotToken =
          typeof config.botToken === "string" && config.botToken.trim().length > 0
            ? config.botToken.trim()
            : null;
      
        const configuredChatId =
          typeof config.chatId === "string" && config.chatId.trim().length > 0
            ? config.chatId.trim()
            : null;
      
        const rawText =
          typeof config.text === "string" ? config.text : "Workflow notification";
      
        const text = resolveStringValue(rawText, context, rawText).trim();
      
        const botToken =
          configuredBotToken ?? process.env.TELEGRAM_BOT_TOKEN ?? null;
      
        const chatId =
          configuredChatId ?? process.env.TELEGRAM_DEFAULT_CHAT_ID ?? null;
      
        console.log("TELEGRAM DEBUG", {
          botTokenExists: Boolean(botToken),
          chatId,
          rawText,
          text,
          config,
        });
      
        if (!botToken || !chatId) {
          const output = {
            simulated: true,
            reason: "Telegram bot token or chat id is not configured",
          };
      
          context.variables[node.id] = output;
          return output;
        }
      
        if (!text) {
          const output = {
            simulated: true,
            reason: "Telegram message text is empty",
          };
      
          context.variables[node.id] = output;
          return output;
        }
      
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
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
      
        const result = (await response.json()) as Record<string, unknown>;
      
        if (!response.ok || result.ok !== true) {
          throw new Error(
            typeof result.description === "string"
              ? result.description
              : "Telegram API request failed"
          );
        }
      
        console.log("TELEGRAM DEBUG SOURCE", {
          text,
          payload: context.payload,
          config,
        });
      
        context.variables[node.id] = result;
        return result;
      }

      case "EMAIL": {
        const smtpHost =
          typeof config.smtpHost === "string" && config.smtpHost.trim().length > 0
            ? config.smtpHost.trim()
            : null;
      
        const smtpUser =
          typeof config.smtpUser === "string" && config.smtpUser.trim().length > 0
            ? config.smtpUser.trim()
            : null;
      
        const smtpPass =
          typeof config.smtpPass === "string" && config.smtpPass.trim().length > 0
            ? config.smtpPass.trim()
            : null;
      
        const to =
          typeof config.to === "string" && config.to.trim().length > 0
            ? config.to.trim()
            : null;
      
        const subject =
          typeof config.subject === "string" && config.subject.trim().length > 0
            ? config.subject.trim()
            : "Workflow notification";
      
        const text =
          typeof config.text === "string" && config.text.trim().length > 0
            ? config.text
            : "Workflow notification";
      
        const smtpPort =
          typeof config.smtpPort === "string" && config.smtpPort.trim().length > 0
            ? Number(config.smtpPort.trim())
            : 587;
      
        if (!smtpHost || !smtpUser || !smtpPass || !to || Number.isNaN(smtpPort)) {
          const output = {
            simulated: true,
            reason: "Email SMTP config is incomplete",
          };
      
          context.variables[node.id] = output;
          return output;
        }
      
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: false,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
      
        const result = await transporter.sendMail({
          from: smtpUser,
          to,
          subject,
          text,
        });
      
        const output = {
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
          response: result.response,
        };
      
        context.variables[node.id] = output;
        return output;
      }

      case "EMAIL_TRIGGER": {
        console.log("EMAIL TRIGGER PAYLOAD:", context.payload);
      
        const payload = context.payload as Record<string, unknown>;
      
        const from =
          typeof payload.from === "string" ? payload.from : "";
      
        const subject =
          typeof payload.subject === "string" ? payload.subject : "";
      
        return {
          accepted: true,
          from,
          subject,
          payload
        };
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

function resolveValue(text: string, context: WorkflowExecutionContext) {
  return resolveTemplate(text, context);
}
