import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlarmClock,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ListTree,
  ScrollText,
  XCircle,
} from "lucide-react";

import { prisma } from "@/shared/lib/prisma";

type ExecutionDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

function safeJson(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Unable to serialize payload";
  }
}

export default async function ExecutionDetailsPage({
  params,
}: ExecutionDetailsPageProps) {
  const { id } = await params;

  const execution = await prisma.execution.findUnique({
    where: { id },
    include: {
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
      },
    },
  });

  if (!execution) {
    notFound();
  }

  const successSteps = execution.steps.filter(
    (step) => step.status === "SUCCESS",
  ).length;
  const failedSteps = execution.steps.filter(
    (step) => step.status === "FAILED",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
  <Link
    href="/executions"
    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
  >
    <ArrowLeft className="h-4 w-4" />
    Назад к executions
  </Link>

  {execution.workflow ? (
    <>
      <Link
        href={`/workflows/${execution.workflow.id}`}
        className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/15"
      >
        Открыть workflow
      </Link>

      <Link
        href={`/executions?workflowId=${execution.workflow.id}`}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
      >
        Все executions workflow
      </Link>
    </>
  ) : null}
</div>

      <section className="rounded-[28px] border border-white/10 bg-linear-to-br from-cyan-500/10 via-white/5 to-violet-500/10 p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm text-cyan-300">Execution Details</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-5xl">
              {execution.workflow?.name ?? "Unknown workflow"}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs ${getStatusStyles(execution.status)}`}
              >
                {execution.status}
              </span>

              <span className="rounded-full border border-white/10 bg-[#0b1728] px-3 py-1 text-xs text-white/65">
                {getTriggerLabel(execution.triggerType)}
              </span>

              <span className="rounded-full border border-white/10 bg-[#0b1728] px-3 py-1 text-xs text-white/65">
                ID: {execution.id}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/55">
  <span>
    Workflow: {execution.workflow?.status ?? "UNKNOWN"}
  </span>
  <span>·</span>
  <span>{execution.workflow?.isEnabled ? "Enabled" : "Disabled"}</span>
  {execution.workflow?.id ? (
    <>
      <span>·</span>
      <span className="text-white/40">Workflow ID: {execution.workflow.id}</span>
    </>
  ) : null}
</div>

            {execution.errorMessage ? (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {execution.errorMessage}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-sm text-white/45">
                <Clock3 className="h-4 w-4 text-cyan-300" />
                Started
              </div>
              <p className="text-sm text-white/75">
                {formatDate(execution.startedAt ?? execution.createdAt)}
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
              <div className="mb-2 flex items-center gap-2 text-sm text-white/45">
                <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                Success steps
              </div>
              <p className="text-sm text-white/75">{successSteps}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-sm text-white/45">
                <XCircle className="h-4 w-4 text-cyan-300" />
                Failed steps
              </div>
              <p className="text-sm text-white/75">{failedSteps}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
  <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
    <p className="text-sm text-white/45">Execution ID</p>
    <p className="mt-2 break-all text-sm text-white/75">{execution.id}</p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
    <p className="text-sm text-white/45">Trigger source</p>
    <p className="mt-2 text-sm text-white/75">{execution.source ?? "—"}</p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
    <p className="text-sm text-white/45">Created at</p>
    <p className="mt-2 text-sm text-white/75">{formatDate(execution.createdAt)}</p>
  </div>

  <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
    <p className="text-sm text-white/45">Finished at</p>
    <p className="mt-2 text-sm text-white/75">{formatDate(execution.finishedAt)}</p>
  </div>
</section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
          <div className="mb-3 flex items-center gap-2">
            <ListTree className="h-4 w-4 text-cyan-300" />
            <h2 className="font-medium">Steps</h2>
          </div>

          <div className="space-y-2">
            {execution.steps.length > 0 ? (
              execution.steps.map((step) => (
                <div
                  key={step.id}
                  className="rounded-xl border border-white/10 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-white/85">{step.nodeName}</p>
                      <p className="text-xs text-white/40">{step.nodeType}</p>
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

                  {step.errorMessage ? (
                    <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                      {step.errorMessage}
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs text-white/40">Input</p>
                      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                        {safeJson(step.inputPayload)}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-white/40">Output</p>
                      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                        {safeJson(step.outputPayload)}
                      </pre>
                    </div>
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

        <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
          <div className="mb-3 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-cyan-300" />
            <h2 className="font-medium">Logs</h2>
          </div>

          <div className="space-y-2">
            {execution.logs.length > 0 ? (
              execution.logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-white/10 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-cyan-300">[{log.level}]</span>
                    <span className="text-xs text-white/35">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-white/75">{log.message}</p>

                  {log.meta ? (
                    <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                      {safeJson(log.meta)}
                    </pre>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-white/45">
                Логи пока не записаны
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
          <p className="mb-2 text-sm text-white/45">Execution input payload</p>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
            {safeJson(execution.inputPayload)}
          </pre>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
          <p className="mb-2 text-sm text-white/45">Execution output payload</p>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
            {safeJson(execution.outputPayload)}
          </pre>
        </div>
      </section>
    </div>
  );
}