import {
    Activity,
    Clock3,
    Database,
    Send,
    Webhook,
    Workflow,
  } from "lucide-react";
  
  const stats = [
    { title: "Всего workflows", value: "24", icon: Workflow },
    { title: "Активные executions", value: "08", icon: Activity },
    { title: "Webhook triggers", value: "156", icon: Webhook },
    { title: "Успешные отправки", value: "1,284", icon: Send },
  ];
  
  const workflows = [
    { name: "Lead Capture Pipeline", trigger: "Webhook", status: "Active", runs: 342 },
    { name: "Daily Email Summary", trigger: "Cron", status: "Paused", runs: 120 },
    { name: "Support Inbox Router", trigger: "Email", status: "Active", runs: 513 },
    { name: "CRM Sync Flow", trigger: "Webhook", status: "Error", runs: 87 },
  ];
  
  export default function DashboardPage() {
    return (
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-linear-to-br from-cyan-500/10 via-white/5 to-violet-500/10 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-sm text-cyan-300">Automation Command Center</p>
              <h1 className="text-3xl font-semibold md:text-5xl">
                Дашборд платформы автоматизации
              </h1>
              <p className="mt-4 max-w-2xl text-white/60">
                Управление workflow, наблюдение за выполнениями, логами, ошибками
                и общей производительностью системы в одном месте.
              </p>
            </div>
  
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/50">Success Rate</p>
                <p className="mt-2 text-2xl font-semibold">98.4%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-white/50">Avg. Duration</p>
                <p className="mt-2 text-2xl font-semibold">1.8s</p>
              </div>
            </div>
          </div>
        </section>
  
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <Icon className="h-5 w-5 text-cyan-300" />
                </div>
                <p className="text-sm text-white/50">{item.title}</p>
                <h3 className="mt-2 text-3xl font-semibold">{item.value}</h3>
              </div>
            );
          })}
        </section>
  
        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Последние workflows</h2>
              <span className="text-sm text-white/45">4 entries</span>
            </div>
  
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div
                  key={workflow.name}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0b1728] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{workflow.name}</p>
                    <p className="mt-1 text-sm text-white/45">
                      Trigger: {workflow.trigger}
                    </p>
                  </div>
  
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <p className="text-white/40">Runs</p>
                      <p>{workflow.runs}</p>
                    </div>
                    <div>
                      <p className="text-white/40">Status</p>
                      <p>{workflow.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
  
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Queue snapshot</h2>
              <div className="mt-5 space-y-4">
                {[
                  { label: "Pending jobs", value: "12", icon: Clock3 },
                  { label: "Stored logs", value: "8.2k", icon: Database },
                  { label: "Avg retry count", value: "1.2", icon: Activity },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0b1728] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                          <Icon className="h-4 w-4 text-violet-300" />
                        </div>
                        <span className="text-white/65">{item.label}</span>
                      </div>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
  
          </div>
        </section>
      </div>
    );
  }