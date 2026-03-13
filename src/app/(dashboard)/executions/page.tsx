import {
  Activity,
  AlarmClock,
  CheckCircle2,
  Clock3,
  PlayCircle,
  Search,
  XCircle,
} from "lucide-react";
import { ExecutionStatus, Prisma, TriggerType } from "@prisma/client";
import { ExecutionLogsCard } from "./_components/execution-logs-card";
import Link from "next/link";

import { prisma } from "@/shared/lib/prisma";

type ExecutionsPageProps = {
  searchParams?: Promise<{
    status?: string;
    trigger?: string;
    workflowId?: string;
    fromDate?: string;
    toDate?: string;
    page?: string;
  }>;
};

const executionStatusOptions = Object.values(ExecutionStatus);
const triggerTypeOptions = Object.values(TriggerType);

const executionInclude = Prisma.validator<Prisma.ExecutionInclude>()({
  workflow: {
    select: {
      id: true,
      name: true,
      status: true,
      isEnabled: true,
    },
  },
  steps: {
    orderBy: { createdAt: "asc" },
  },
  logs: {
    orderBy: { createdAt: "desc" },
    take: 3,
  },
});

type ExecutionListItem = Prisma.ExecutionGetPayload<{
  include: typeof executionInclude;
}>;

function getStatusStyles(status: string) {
  switch (status) {
    case "SUCCESS":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "FAILED":
      return "border-red-400/20 bg-red-400/10 text-red-300";
    case "RUNNING":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
    case "RETRYING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "PENDING":
      return "border-white/15 bg-white/10 text-white/70";
    case "PAUSED":
      return "border-violet-400/20 bg-violet-400/10 text-violet-300";
    case "CANCELED":
      return "border-slate-400/20 bg-slate-400/10 text-slate-300";
    default:
      return "border-white/15 bg-white/10 text-white/70";
  }
}

function getTriggerLabel(triggerType: string) {
  switch (triggerType) {
    case "WEBHOOK":
      return "Webhook";
    case "SCHEDULE":
      return "Schedule";
    case "EMAIL":
      return "Email";
    default:
      return triggerType;
  }
}

const DISPLAY_TIME_ZONE = "Europe/Moscow";

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return "—";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
}

function getExecutionDisplayDate(execution: {
  finishedAt: Date | null;
  startedAt: Date | null;
  createdAt: Date;
}) {
  return execution.finishedAt ?? execution.startedAt ?? execution.createdAt;
}

function parseDateParam(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function buildCreatedAtFilter(fromDate?: string, toDate?: string) {
  const from = parseDateParam(fromDate);
  const to = parseDateParam(toDate);

  if (!from && !to) {
    return undefined;
  }

  const createdAt: Prisma.DateTimeFilter = {};

  if (from) {
    createdAt.gte = from;
  }

  if (to) {
    const endOfDay = new Date(to);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    endOfDay.setUTCMilliseconds(endOfDay.getUTCMilliseconds() - 1);
    createdAt.lte = endOfDay;
  }

  return createdAt;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function getMetaError(meta: unknown) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return "";
  }

  const record = meta as Record<string, unknown>;
  const errorValue = record.error;

  return typeof errorValue === "string" ? errorValue.trim() : "";
}

function hasLogIssue(log: ExecutionListItem["logs"][number]) {
  const level = normalizeText(log.level).toUpperCase();
  const message =
    "message" in log && typeof log.message === "string"
      ? normalizeText(log.message)
      : "";
  const metaError = "meta" in log ? getMetaError(log.meta) : "";

  if (level === "ERROR" || level === "FAILED") {
    return true;
  }

  if (metaError !== "") {
    return true;
  }

  return /error|failed|exception|timeout/i.test(message);
}

function getExecutionErrorCount(execution: ExecutionListItem) {
  let count = 0;

  if (execution.status === "FAILED") {
    count += 1;
  }

  if (normalizeText(execution.errorMessage) !== "") {
    count += 1;
  }

  count += execution.steps.filter(
    (step) =>
      step.status === "FAILED" || normalizeText(step.errorMessage) !== "",
  ).length;

  count += execution.logs.filter((log) => hasLogIssue(log)).length;

  return count;
}

function isExecutionStatus(value: string | undefined): value is ExecutionStatus {
  return Boolean(
    value && executionStatusOptions.includes(value as ExecutionStatus),
  );
}

function isTriggerType(value: string | undefined): value is TriggerType {
  return Boolean(value && triggerTypeOptions.includes(value as TriggerType));
}

export default async function ExecutionsPage({
  searchParams,
}: ExecutionsPageProps) {
  const params = (await searchParams) ?? {};

  const selectedStatus = isExecutionStatus(params.status)
    ? params.status
    : undefined;

  const selectedTrigger = isTriggerType(params.trigger)
    ? params.trigger
    : undefined;

  const selectedWorkflowId =
    typeof params.workflowId === "string" && params.workflowId.trim() !== ""
      ? params.workflowId
      : undefined;

  const currentPage =
    typeof params.page === "string" && Number(params.page) > 0
      ? Number(params.page)
      : 1;

  const pageSize = 50;
  const skip = (currentPage - 1) * pageSize;

  const selectedFromDate =
    typeof params.fromDate === "string" && params.fromDate.trim() !== ""
      ? params.fromDate
      : undefined;

  const selectedToDate =
    typeof params.toDate === "string" && params.toDate.trim() !== ""
      ? params.toDate
      : undefined;

  const createdAtFilter = buildCreatedAtFilter(
    selectedFromDate,
    selectedToDate,
  );

  const baseWhere: Prisma.ExecutionWhereInput = {
    ...(selectedTrigger ? { triggerType: selectedTrigger } : {}),
    ...(selectedWorkflowId ? { workflowId: selectedWorkflowId } : {}),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
  };

  const where: Prisma.ExecutionWhereInput = {
    ...baseWhere,
    ...(selectedStatus ? { status: selectedStatus } : {}),
  };

  const [
    executions,
    workflows,
    totalCount,
    runningCount,
    successCount,
    failedCount,
  ] = await Promise.all([
    prisma.execution.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: executionInclude,
      take: pageSize,
      skip,
    }),
    prisma.workflow.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.execution.count({
      where,
    }),
    prisma.execution.count({
      where: {
        ...where,
        status: "RUNNING",
      },
    }),
    prisma.execution.count({
      where: {
        ...where,
        status: "SUCCESS",
      },
    }),
    prisma.execution.count({
      where: {
        ...where,
        status: "FAILED",
      },
    }),
  ]);

  const safeExecutions: ExecutionListItem[] = executions;

  const hasActiveFilters = Boolean(
    selectedStatus ||
      selectedTrigger ||
      selectedWorkflowId ||
      selectedFromDate ||
      selectedToDate,
  );

  return (
    <div className="space-y-6 notranslate" translate="no">
      <section className="rounded-[28px] border border-white/10 bg-linear-to-br from-cyan-500/10 via-white/5 to-violet-500/10 p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm text-cyan-300">Execution Monitoring</p>
            <h1 className="text-3xl font-semibold md:text-5xl">Executions</h1>
            <p className="mt-4 max-w-2xl text-white/60">
              Последние запуски workflow, статусы выполнения, шаги и свежие логи.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-white/50">Показано записей</p>
            <p className="mt-2 text-2xl font-semibold">{totalCount}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-cyan-300" />
          <h2 className="text-lg font-medium">Фильтры</h2>
        </div>

        <form className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr_1fr_1fr_auto]">
          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-sm text-white/50"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={selectedStatus ?? ""}
              className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="">Все статусы</option>
              {executionStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="trigger"
              className="mb-2 block text-sm text-white/50"
            >
              Trigger
            </label>
            <select
              id="trigger"
              name="trigger"
              defaultValue={selectedTrigger ?? ""}
              className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="">Все триггеры</option>
              {triggerTypeOptions.map((trigger) => (
                <option key={trigger} value={trigger}>
                  {getTriggerLabel(trigger)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="workflowId"
              className="mb-2 block text-sm text-white/50"
            >
              Workflow
            </label>
            <select
              id="workflowId"
              name="workflowId"
              defaultValue={selectedWorkflowId ?? ""}
              className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="">Все workflow</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/15"
            >
              Применить
            </button>

            {hasActiveFilters ? (
              <Link
                href="/executions"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 transition hover:bg-white/10"
              >
                Сбросить
              </Link>
            ) : null}
          </div>

         
        </form>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedStatus ? (
              <span
                className={`rounded-full border px-3 py-1 text-xs ${getStatusStyles(selectedStatus)}`}
              >
                Status: {selectedStatus}
              </span>
            ) : null}

            {selectedTrigger ? (
              <span className="rounded-full border border-white/10 bg-[#0b1728] px-3 py-1 text-xs text-white/70">
                Trigger: {getTriggerLabel(selectedTrigger)}
              </span>
            ) : null}

            {selectedWorkflowId ? (
              <span className="rounded-full border border-white/10 bg-[#0b1728] px-3 py-1 text-xs text-white/70">
                Workflow:{" "}
                {workflows.find((workflow) => workflow.id === selectedWorkflowId)
                  ?.name ?? "Unknown"}
              </span>
            ) : null}

            {selectedFromDate ? (
              <span className="rounded-full border border-white/10 bg-[#0b1728] px-3 py-1 text-xs text-white/70">
                С даты: {selectedFromDate}
              </span>
            ) : null}

            {selectedToDate ? (
              <span className="rounded-full border border-white/10 bg-[#0b1728] px-3 py-1 text-xs text-white/70">
                По дату: {selectedToDate}
              </span>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Activity className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-sm text-white/50">Всего executions</p>
          <h3 className="mt-2 text-3xl font-semibold">{totalCount}</h3>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <PlayCircle className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-sm text-white/50">Сейчас выполняются</p>
          <h3 className="mt-2 text-3xl font-semibold">{runningCount}</h3>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <CheckCircle2 className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-sm text-white/50">Успешные</p>
          <h3 className="mt-2 text-3xl font-semibold">{successCount}</h3>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <XCircle className="h-5 w-5 text-cyan-300" />
          </div>
          <p className="text-sm text-white/50">С ошибкой</p>
          <h3 className="mt-2 text-3xl font-semibold">{failedCount}</h3>
        </div>
      </section>

      <section className="space-y-4">
        {safeExecutions.map((execution) => {
          const successSteps = execution.steps.filter(
            (step) => step.status === "SUCCESS",
          ).length;
          const failedSteps = execution.steps.filter(
            (step) => step.status === "FAILED",
          ).length;
          const latestLog = execution.logs[0] ?? null;
          const errorCount = getExecutionErrorCount(execution);

          return (
            <Link
              key={execution.id}
              href={`/executions/${execution.id}`}
              className="block rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/20 hover:bg-white/7"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold">
                      {execution.workflow?.name ?? "Unknown workflow"}
                    </h2>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${getStatusStyles(execution.status)}`}
                    >
                      {execution.status}
                    </span>

                    <span className="rounded-full border border-white/10 bg-[#0b1728] px-3 py-1 text-xs text-white/65">
                      {getTriggerLabel(execution.triggerType)}
                    </span>

                    {errorCount > 0 ? (
                      <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-300">
                        Errors: {errorCount}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-sm text-white/50">
                  Created: {formatDate(getExecutionDisplayDate(execution))} · Workflow:{" "}
                    Workflow: {execution.workflow?.status ?? "UNKNOWN"} ·{" "}
                    {execution.workflow?.isEnabled ? "Enabled" : "Disabled"}
                  </p>

                  {execution.errorMessage ? (
                    <div className="mt-3 min-w-0 overflow-hidden rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                      <p className="max-w-full whitespace-pre-wrap wrap-break-word">
                        {execution.errorMessage}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
  <div className="mb-2 flex items-center gap-2 text-sm text-white/45">
    <Clock3 className="h-4 w-4 text-cyan-300" />
    Created
  </div>
  <p className="text-sm text-white/75">
    {formatDate(getExecutionDisplayDate(execution))}
  </p>
</div>

                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-sm text-white/45">
                      <AlarmClock className="h-4 w-4 text-cyan-300" />
                      Duration
                    </div>
                    <p className="text-sm text-white/75">
                      {formatDuration(execution.durationMs)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
                    <p className="text-sm text-white/45">Steps</p>
                    <p className="mt-2 text-sm text-white/75">
                      {successSteps}/{execution.steps.length} success
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
                    <p className="text-sm text-white/45">Retries</p>
                    <p className="mt-2 text-sm text-white/75">
                      {execution.retryCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">Steps</h3>
                    <span className="text-xs text-white/45">
                      Failed: {failedSteps} · Total: {execution.steps.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {execution.steps.length > 0 ? (
                      execution.steps.map((step) => (
                        <div
                          key={step.id}
                          className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-white/80">
                              {step.nodeName}
                            </p>
                            <p className="text-xs text-white/40">
                              {step.nodeType}
                            </p>
                          </div>

                          <div className="text-right">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${getStatusStyles(step.status)}`}
                            >
                              {step.status}
                            </span>
                            <p className="mt-1 text-xs text-white/40">
                              {formatDuration(step.durationMs)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-white/45">
                        Шаги пока не записаны
                      </div>
                    )}
                  </div>
                </div>

                <ExecutionLogsCard
                  logs={execution.logs.map((log) => ({
                    id: log.id,
                    level: String(log.level),
                    message:
                      "message" in log && typeof log.message === "string"
                        ? log.message
                        : "",
                    createdAt: log.createdAt.toISOString(),
                  }))}
                  latestMessage={
                    latestLog &&
                    "message" in latestLog &&
                    typeof latestLog.message === "string"
                      ? latestLog.message
                      : ""
                  }
                />
              </div>
            </Link>
          );
        })}

        {safeExecutions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-white/50">
            По текущим фильтрам executions не найдены
          </div>
        ) : null}
      </section>
    </div>
  );
}