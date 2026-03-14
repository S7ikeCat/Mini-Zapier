import { TriggerType, type WorkflowNode } from "@prisma/client";
import { CronExpressionParser } from "cron-parser";
import { prisma } from "@/shared/lib/prisma";
import { getWorkflowQueue } from "@/server/queues/workflow.queue";

type ScheduleNodeConfig = {
  cron?: unknown;
  timezone?: unknown;
};

function getScheduleConfig(node: WorkflowNode): {
  cron: string | null;
  timezone: string | null;
} {
  const raw =
    node.config && typeof node.config === "object"
      ? (node.config as ScheduleNodeConfig)
      : {};

  const cron =
    typeof raw.cron === "string" && raw.cron.trim().length > 0
      ? raw.cron.trim()
      : null;

  const timezone =
    typeof raw.timezone === "string" && raw.timezone.trim().length > 0
      ? raw.timezone.trim()
      : null;

  return { cron, timezone };
}

function getScheduledSlot(
  cron: string,
  timezone: string | null,
  now: Date,
  windowStart: Date
): Date | null {
  try {
    const interval = CronExpressionParser.parse(cron, {
      currentDate: now,
      ...(timezone ? { tz: timezone } : {}),
    });

    const previousRun = interval.prev().toDate();

    if (previousRun > windowStart && previousRun <= now) {
      return previousRun;
    }

    return null;
  } catch {
    return null;
  }
}

export class WorkflowSchedulerService {
  static async tick(options?: { lookbackMs?: number }): Promise<void> {
    const now = new Date();
    const lookbackMs = options?.lookbackMs ?? 60_000;
    const windowStart = new Date(now.getTime() - lookbackMs);

    const workflows = await prisma.workflow.findMany({
      where: {
        isEnabled: true,
        status: "ACTIVE",
      },
      include: {
        nodes: {
          where: {
            type: "SCHEDULE",
            isEnabled: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    const workflowQueue = getWorkflowQueue();

    for (const workflow of workflows) {
      for (const node of workflow.nodes) {
        const { cron, timezone } = getScheduleConfig(node);

        if (!cron) {
          continue;
        }

        const scheduledAt = getScheduledSlot(cron, timezone, now, windowStart);

        if (!scheduledAt) {
          continue;
        }

        const scheduledAtIso = scheduledAt.toISOString();
        const jobId = `schedule-${node.id}-${scheduledAtIso.replace(/[:.]/g, "-")}`;

        await workflowQueue.add(
          "workflow-run",
          {
            workflowId: workflow.id,
            triggerType: TriggerType.SCHEDULE,
            source: `schedule:${node.id}`,
            payload: {
              scheduledAt: scheduledAtIso,
              scheduleNodeId: node.id,
              cron,
              ...(timezone ? { timezone } : {}),
            },
          },
          {
            jobId,
          }
        );
      }
    }
  }
}