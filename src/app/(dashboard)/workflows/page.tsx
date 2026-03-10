import { prisma } from "@/shared/lib/prisma";
import { BadgeCheck, CirclePause, FileCode2, Play, Plus } from "lucide-react";

function getStatusStyles(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-400/10 text-emerald-300 border-emerald-400/20";
    case "PAUSED":
      return "bg-amber-400/10 text-amber-300 border-amber-400/20";
    case "DRAFT":
      return "bg-white/10 text-white/70 border-white/15";
    case "ARCHIVED":
      return "bg-slate-400/10 text-slate-300 border-slate-400/20";
    default:
      return "bg-white/10 text-white/70 border-white/15";
  }
}

export default async function WorkflowsPage() {
  const workflows = await prisma.workflow.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      nodes: true,
      executions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-linear-to-br from-cyan-500/10 via-white/5 to-violet-500/10 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-cyan-300">Workflow Management</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Все workflows</h1>
          <p className="mt-3 max-w-2xl text-white/60">
            Управление автоматизациями, узлами, триггерами и историей запусков.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-medium text-slate-900">
          <Plus className="h-4 w-4" />
          New workflow
        </button>
      </section>

      <section className="grid gap-4">
        {workflows.map((workflow) => {
          const lastExecution = workflow.executions[0];

          return (
            <div
              key={workflow.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold">{workflow.name}</h2>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${getStatusStyles(workflow.status)}`}
                    >
                      {workflow.status}
                    </span>
                  </div>

                  <p className="max-w-2xl text-white/55">
                    {workflow.description || "Описание пока не добавлено"}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {workflow.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-[#0b1728] px-3 py-1 text-xs text-white/65"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                    <p className="text-sm text-white/40">Nodes</p>
                    <p className="mt-2 text-xl font-semibold">{workflow.nodes.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                    <p className="text-sm text-white/40">Enabled</p>
                    <p className="mt-2 text-xl font-semibold">
                      {workflow.isEnabled ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                    <p className="text-sm text-white/40">Version</p>
                    <p className="mt-2 text-xl font-semibold">v{workflow.version}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FileCode2 className="h-4 w-4 text-cyan-300" />
                    <p className="text-sm font-medium">Last execution</p>
                  </div>
                  <p className="text-sm text-white/55">
                    {lastExecution ? lastExecution.status : "Нет запусков"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-300" />
                    <p className="text-sm font-medium">Created at</p>
                  </div>
                  <p className="text-sm text-white/55">
                    {new Date(workflow.createdAt).toLocaleString("ru-RU")}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    {workflow.isEnabled ? (
                      <Play className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <CirclePause className="h-4 w-4 text-amber-300" />
                    )}
                    <p className="text-sm font-medium">Mode</p>
                  </div>
                  <p className="text-sm text-white/55">
                    {workflow.isEnabled ? "Production active" : "Inactive"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {workflows.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-white/50">
            Workflows пока нет
          </div>
        )}
      </section>
    </div>
  );
}