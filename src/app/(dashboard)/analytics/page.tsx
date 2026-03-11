import {
  Activity,
  CheckCircle2,
  Clock3,
  PlayCircle,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { prisma } from "@/shared/lib/prisma";

const DISPLAY_TIME_ZONE = "Europe/Moscow";

function formatDuration(durationMs: number | null) {
  if (durationMs === null || Number.isNaN(durationMs)) {
    return "—";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: DISPLAY_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function getMoscowDayBounds(daysAgo: number) {
  const now = new Date();

  const moscowNow = new Date(
    now.toLocaleString("en-US", { timeZone: DISPLAY_TIME_ZONE }),
  );

  const target = new Date(moscowNow);
  target.setDate(target.getDate() - daysAgo);

  const year = target.getFullYear();
  const month = target.getMonth();
  const day = target.getDate();

  const startUtc = new Date(Date.UTC(year, month, day, -3, 0, 0, 0));
  const endUtc = new Date(Date.UTC(year, month, day, 20, 59, 59, 999));

  return {
    label: formatDayLabel(target),
    start: startUtc,
    end: endUtc,
  };
}

export default async function AnalyticsPage() {
  const todayBounds = getMoscowDayBounds(0);
  const dailyBounds = Array.from({ length: 7 }, (_, index) =>
    getMoscowDayBounds(6 - index),
  );

  const [
    totalWorkflows,
    activeWorkflows,
    totalExecutions,
    successExecutions,
    failedExecutions,
    runningExecutions,
    todayExecutions,
    avgDurationResult,
    failingWorkflowGroups,
    dailyExecutionCounts,
  ] = await Promise.all([
    prisma.workflow.count(),
    prisma.workflow.count({
      where: {
        status: "ACTIVE",
        isEnabled: true,
      },
    }),
    prisma.execution.count(),
    prisma.execution.count({
      where: {
        status: "SUCCESS",
      },
    }),
    prisma.execution.count({
      where: {
        status: "FAILED",
      },
    }),
    prisma.execution.count({
      where: {
        status: "RUNNING",
      },
    }),
    prisma.execution.count({
      where: {
        createdAt: {
          gte: todayBounds.start,
          lte: todayBounds.end,
        },
      },
    }),
    prisma.execution.aggregate({
      _avg: {
        durationMs: true,
      },
    }),
    prisma.execution.groupBy({
      by: ["workflowId"],
      where: {
        status: "FAILED",
      },
      _count: {
        workflowId: true,
      },
      orderBy: {
        _count: {
          workflowId: "desc",
        },
      },
      take: 5,
    }),
    Promise.all(
      dailyBounds.map((day) =>
        prisma.execution.count({
          where: {
            createdAt: {
              gte: day.start,
              lte: day.end,
            },
          },
        }),
      ),
    ),
  ]);

  const failingWorkflowIds = failingWorkflowGroups.map((item) => item.workflowId);

  const failingWorkflows =
    failingWorkflowIds.length > 0
      ? await prisma.workflow.findMany({
          where: {
            id: {
              in: failingWorkflowIds,
            },
          },
          select: {
            id: true,
            name: true,
            status: true,
            isEnabled: true,
          },
        })
      : [];

  const workflowMap = new Map(
    failingWorkflows.map((workflow) => [workflow.id, workflow]),
  );

  const topFailingWorkflows = failingWorkflowGroups.map((item) => ({
    workflowId: item.workflowId,
    failedCount: item._count.workflowId,
    workflow: workflowMap.get(item.workflowId) ?? null,
  }));

  const dailyStats = dailyBounds.map((day, index) => ({
    label: day.label,
    count: dailyExecutionCounts[index] ?? 0,
  }));

  const maxDailyCount = Math.max(...dailyStats.map((item) => item.count), 1);

  const successRate =
    totalExecutions > 0
      ? Math.round((successExecutions / totalExecutions) * 100)
      : 0;

  const failureRate =
    totalExecutions > 0
      ? Math.round((failedExecutions / totalExecutions) * 100)
      : 0;

  const avgDuration = avgDurationResult._avg.durationMs ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-linear-to-br from-cyan-500/10 via-white/5 to-violet-500/10 p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm text-cyan-300">Workflow Statistics</p>
            <h1 className="text-3xl font-semibold md:text-5xl">Analytics</h1>
            <p className="mt-4 max-w-2xl text-white/60">
              Базовая статистика по workflows и executions: активность, успешность,
              ошибки и динамика запусков за последние 7 дней.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-white/50">Executions today</p>
            <p className="mt-2 text-2xl font-semibold">{todayExecutions}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Activity className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-sm text-white/50">Всего workflows</p>
          <h3 className="mt-2 text-3xl font-semibold">{totalWorkflows}</h3>
          <p className="mt-2 text-sm text-white/45">Active: {activeWorkflows}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <PlayCircle className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-sm text-white/50">Всего executions</p>
          <h3 className="mt-2 text-3xl font-semibold">{totalExecutions}</h3>
          <p className="mt-2 text-sm text-white/45">Сегодня: {todayExecutions}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <CheckCircle2 className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-sm text-white/50">Success rate</p>
          <h3 className="mt-2 text-3xl font-semibold">{successRate}%</h3>
          <p className="mt-2 text-sm text-white/45">SUCCESS: {successExecutions}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <XCircle className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-sm text-white/50">Failure rate</p>
          <h3 className="mt-2 text-3xl font-semibold">{failureRate}%</h3>
          <p className="mt-2 text-sm text-white/45">FAILED: {failedExecutions}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Clock3 className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-sm text-white/50">Средняя длительность</p>
          <h3 className="mt-2 text-3xl font-semibold">{formatDuration(avgDuration)}</h3>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <TrendingUp className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-sm text-white/50">Сейчас выполняются</p>
          <h3 className="mt-2 text-3xl font-semibold">{runningExecutions}</h3>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Activity className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-sm text-white/50">Активные workflows</p>
          <h3 className="mt-2 text-3xl font-semibold">{activeWorkflows}</h3>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Executions за 7 дней</h2>
              <p className="mt-1 text-sm text-white/45">
                От новых дней к старым в московском времени
              </p>
            </div>
          </div>

          <div className="grid h-[280px] grid-cols-7 items-end gap-3">
            {dailyStats.map((item) => {
              const heightPercent = Math.max(
                8,
                Math.round((item.count / maxDailyCount) * 100),
              );

              return (
                <div key={item.label} className="flex h-full flex-col justify-end">
                  <div className="mb-2 text-center text-xs text-white/40">
                    {item.count}
                  </div>

                  <div className="flex flex-1 items-end">
                    <div
                      className="w-full rounded-t-2xl border border-cyan-400/20 bg-cyan-400/15"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  <div className="mt-3 text-center text-xs text-white/50">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Top failing workflows</h2>
            <p className="mt-1 text-sm text-white/45">
              Workflows с наибольшим числом failed executions
            </p>
          </div>

          <div className="space-y-3">
            {topFailingWorkflows.length > 0 ? (
              topFailingWorkflows.map((item) => (
                <div
                  key={item.workflowId}
                  className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/85">
                        {item.workflow?.name ?? "Unknown workflow"}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {item.workflow?.status ?? "UNKNOWN"} ·{" "}
                        {item.workflow?.isEnabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>

                    <div className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-300">
                      Failed: {item.failedCount}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">
                Failed workflows пока не найдены
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}