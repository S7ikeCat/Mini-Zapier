import Link from "next/link";
import { ArrowRight, Sparkles, Workflow, ShieldCheck, BarChart3 } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_right,rgba(168,85,247,0.16),transparent_30%)]" />
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-20">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Automation Platform • Mini-Zapier
          </div>

          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-tight md:text-7xl">
                Автоматизация процессов
                <span className="block bg-linear-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                  без хаоса и рутины
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">
                Создавай workflow с триггерами, действиями, логированием,
                ретраями и аналитикой в современном интерфейсе уровня SaaS.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
              <Link
  href="/dashboard"
  className="
    relative z-20 inline-flex items-center gap-2
    px-6 py-3 rounded-xl
    bg-white text-black font-medium
    shadow-md
    transition-colors duration-200 ease-out
    hover:bg-gray-300
    active:bg-gray-200
  "
>
  <span>Открыть платформу</span>
  <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
</Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                    <Workflow className="mb-3 h-6 w-6 text-cyan-300" />
                    <p className="text-sm text-white/60">Workflows</p>
                    <p className="mt-1 text-2xl font-semibold">24</p>
                  </div>
                  <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4">
                    <ShieldCheck className="mb-3 h-6 w-6 text-violet-300" />
                    <p className="text-sm text-white/60">Успешность</p>
                    <p className="mt-1 text-2xl font-semibold">98.4%</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <BarChart3 className="mb-3 h-6 w-6 text-emerald-300" />
                    <p className="text-sm text-white/60">Запусков</p>
                    <p className="mt-1 text-2xl font-semibold">12.8k</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-linear-to-br from-white/10 to-white/5 p-6 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Execution Preview</h2>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                    Running
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    "Webhook received",
                    "Transform payload",
                    "Send HTTP request",
                    "Create DB record",
                    "Notify via Telegram",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-sm">
                          {index + 1}
                        </div>
                        <span className="text-white/80">{item}</span>
                      </div>
                      <span className="text-sm text-emerald-300">Done</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}