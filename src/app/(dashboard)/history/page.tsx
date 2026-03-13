import { prisma } from "@/shared/lib/prisma";

function getExecutionColor(status: string) {
  switch (status) {
    case "SUCCESS":
      return "text-emerald-300";
    case "FAILED":
      return "text-red-300";
    case "RUNNING":
      return "text-cyan-300";
    case "RETRYING":
      return "text-amber-300";
    default:
      return "text-white/70";
  }
}

export default async function HistoryPage() {
  const executions = await prisma.execution.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      workflow: true,
      steps: true,
      logs: {
        take: 3,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-cyan-300">Execution History</p>
        <h1 className="mt-2 text-3xl font-semibold">История запусков</h1>
      </section>

      <div className="space-y-4">
        {executions.map((execution) => (
          <div
            key={execution.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{execution.workflow.name}</h2>
                <p className="mt-1 text-sm text-white/50">
                  Trigger: {execution.triggerType} · Created:{" "}
                  {new Date(execution.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
                  Status:{" "}
                  <span className={getExecutionColor(execution.status)}>
                    {execution.status}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
                  Duration: {execution.durationMs ?? 0} ms
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3">
                  Retries: {execution.retryCount}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <h3 className="mb-3 font-medium">Steps</h3>
                <div className="space-y-2">
                  {execution.steps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
                    >
                      <span className="text-sm text-white/70">{step.nodeName}</span>
                      <span className={`text-sm ${getExecutionColor(step.status)}`}>
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                <h3 className="mb-3 font-medium">Recent logs</h3>
                <div className="space-y-2">
                  {execution.logs.map((log) => (
                    <div
                      key={log.id}
                      className="min-w-0 overflow-hidden rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70"
                    >
                      <p className="max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        [{log.level}] {log.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {executions.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center text-white/50">
            История запусков пока пуста
          </div>
        )}
      </div>
    </div>
  );
}